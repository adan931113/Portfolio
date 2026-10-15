/**
 * POST /api/cambios-ia/[id]/confirmar
 * ------------------------------------------------------------------------
 * Única ruta del sistema autorizada a convertir una propuesta de la IA
 * (`cambios_pendientes_ia`, estado 'pendiente') en una escritura real sobre
 * la tabla destino (contratos, nominas, deudas, gastos, metas_ahorro,
 * registros_tiempo). Se invoca SOLO desde ModalConfirmacionIA, tras pulsar
 * "Aprobar y guardar".
 *
 * Garantías de este endpoint (Módulo 9):
 *  1) Requiere sesión autenticada.
 *  2) Verifica que la propuesta pertenece al usuario autenticado.
 *  3) Verifica que sigue en estado 'pendiente' y no ha caducado.
 *  4) Aplica el cambio dentro de un único "efecto" controlado (no ejecuta
 *     SQL arbitrario: solo insert/update/delete tipados sobre una lista
 *     cerrada de tablas permitidas).
 *  5) Marca la propuesta como 'aplicado' únicamente si la escritura tuvo
 *     éxito, dejando rastro de auditoría completo.
 * ------------------------------------------------------------------------
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import type { TablaDestino } from "@/lib/governance/types";
import { separarComplementosDelPayload, sincronizarComplementosHijos } from "@/lib/governance/sincronizarComplementos";

// Lista cerrada de tablas que este endpoint tiene permiso de tocar.
// Cualquier tabla fuera de esta lista se rechaza explícitamente.
const TABLAS_PERMITIDAS: readonly TablaDestino[] = [
  "contratos",
  "nominas",
  "registros_tiempo",
  "deudas",
  "gastos",
  "metas_ahorro",
] as const;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  // 1) Identificar al usuario autenticado a partir de su sesión (cookies).
  const supabaseUsuario = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabaseUsuario.auth.getUser();

  if (!user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  // 2) Cargar la propuesta y verificar propiedad + estado.
  const { data: cambio, error: errorCarga } = await admin
    .from("cambios_pendientes_ia")
    .select("*")
    .eq("id", params.id)
    .single();

  if (errorCarga || !cambio) {
    return NextResponse.json({ mensaje: "Propuesta no encontrada." }, { status: 404 });
  }

  if (cambio.user_id !== user.id) {
    // No revelamos más detalle: para el solicitante, es como si no existiera.
    return NextResponse.json({ mensaje: "Propuesta no encontrada." }, { status: 404 });
  }

  if (cambio.estado !== "pendiente") {
    return NextResponse.json({ mensaje: `Esta propuesta ya no está pendiente (estado: ${cambio.estado}).` }, { status: 409 });
  }

  if (new Date(cambio.expira_en) < new Date()) {
    await admin.from("cambios_pendientes_ia").update({ estado: "expirado" }).eq("id", cambio.id);
    return NextResponse.json({ mensaje: "La propuesta ha caducado." }, { status: 409 });
  }

  if (!TABLAS_PERMITIDAS.includes(cambio.tabla_destino as TablaDestino)) {
    return NextResponse.json({ mensaje: "Tabla destino no permitida." }, { status: 400 });
  }

  // 3) Separar los complementos (si los hay) del resto del payload: viajan
  //    bajo la clave auxiliar "__complementos", que no es una columna real
  //    de `contratos`/`nominas` y debe retirarse antes de escribir en ellas.
  const tabla = cambio.tabla_destino as TablaDestino;
  const { payloadLimpio, complementos } = separarComplementosDelPayload(
    tabla,
    cambio.payload_propuesto as Record<string, unknown>,
  );

  // Aplicar el cambio real, siempre forzando user_id = user.id en el payload
  // (defensa en profundidad: aunque el payload propuesto por la IA llevara
  // otro user_id, nunca se escribe en nombre de otra persona).
  const payload = { ...payloadLimpio, user_id: user.id };

  try {
    let idPadreParaComplementos: string | null = cambio.registro_id;

    if (cambio.operacion === "insert") {
      const { data: insertado, error } = await admin.from(tabla).insert(payload).select("id").single();
      if (error) throw error;
      idPadreParaComplementos = insertado.id as string;
    } else if (cambio.operacion === "update") {
      if (!cambio.registro_id) throw new Error("Falta registro_id para una operación de actualización.");
      const { error } = await admin
        .from(tabla)
        .update(payload)
        .eq("id", cambio.registro_id)
        .eq("user_id", user.id); // doble verificación de propiedad a nivel de fila
      if (error) throw error;
    } else if (cambio.operacion === "delete") {
      if (!cambio.registro_id) throw new Error("Falta registro_id para una operación de borrado.");
      const { error } = await admin
        .from(tabla)
        .delete()
        .eq("id", cambio.registro_id)
        .eq("user_id", user.id);
      if (error) throw error;
      idPadreParaComplementos = null; // nada que sincronizar tras un borrado
    }

    // 3.1) Sincronizar las filas hijas (contrato_complementos / nomina_complementos)
    //      ahora que ya existe el id real del padre. Solo aplica a insert/update.
    if (idPadreParaComplementos && cambio.operacion !== "delete") {
      await sincronizarComplementosHijos(admin, tabla, idPadreParaComplementos, complementos);
    }
  } catch (err) {
    return NextResponse.json(
      { mensaje: err instanceof Error ? err.message : "Error al aplicar el cambio." },
      { status: 500 },
    );
  }

  // 4) Marcar la propuesta como aplicada (auditoría completa, inmutable desde el cliente).
  await admin
    .from("cambios_pendientes_ia")
    .update({ estado: "aplicado", aprobado_en: new Date().toISOString(), aplicado_en: new Date().toISOString() })
    .eq("id", cambio.id);

  return NextResponse.json({ ok: true });
}
