/**
 * POST /api/ia/proponer-guardado
 * ------------------------------------------------------------------------
 * Convierte los datos YA EXTRAÍDOS (contrato y nómina, obtenidos antes en
 * /api/ia/auditar) en una o dos propuestas dentro de `cambios_pendientes_ia`.
 * No escribe en `contratos` ni en `nominas`: eso solo ocurre si el usuario
 * aprueba cada propuesta desde el ModalConfirmacionIA, que llama a
 * /api/cambios-ia/[id]/confirmar.
 * ------------------------------------------------------------------------
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import type { DatosContratoExtraidos, DatosNominaExtraidos } from "@/lib/ia/auditoria-nomina-contrato";

interface CuerpoPeticion {
  contrato: DatosContratoExtraidos;
  nomina: DatosNominaExtraidos;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  let body: CuerpoPeticion;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ mensaje: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  if (!body?.contrato || !body?.nomina) {
    return NextResponse.json({ mensaje: "Faltan los datos del contrato o de la nómina." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Mapeamos los campos extraídos a las columnas reales de cada tabla.
  //
  // El campo "__complementos" es una clave AUXILIAR, no una columna de
  // `contratos` ni de `nominas`: viaja dentro de payload_propuesto para que
  // la ruta /api/cambios-ia/[id]/confirmar pueda crear las filas hijas en
  // `contrato_complementos` / `nomina_complementos` justo después de
  // insertar el padre (ver lib/governance/sincronizarComplementos.ts). Esa
  // misma ruta la retira del payload antes de escribir en la tabla
  // principal, así que nunca llega a intentar un INSERT con una columna
  // que no existe.
  const payloadContrato = {
    tipo_contrato: body.contrato.tipoContrato,
    estado: "activo",
    fecha_inicio: body.contrato.fechaInicio,
    fecha_fin_prevista: body.contrato.fechaFinPrevista,
    duracion_periodo_prueba_dias: body.contrato.duracionPeriodoPruebaDias,
    grupo_cotizacion: body.contrato.grupoCotizacion,
    convenio_colectivo_aplicable: body.contrato.convenioColectivoAplicable,
    jornada: body.contrato.jornada,
    porcentaje_jornada_parcial: body.contrato.porcentajeJornadaParcial,
    salario_base_bruto_mensual: body.contrato.salarioBaseBrutoMensual,
    numero_pagas_extra: body.contrato.numeroPagasExtra,
    numero_prorrogas_pactadas: body.contrato.numeroProrrogasPactadas,
    clausulas_especificas: body.contrato.clausulasEspecificas ?? [],
    extraido_por_ia: true,
    campos_baja_confianza: body.contrato.camposConBajaConfianza ?? [],
    __complementos: [
      ...(body.contrato.complementosSalariales ?? []).map((c) => ({
        tipo: "salarial" as const,
        concepto: c.concepto,
        importe_mensual: c.importeMensual,
      })),
      ...(body.contrato.complementosNoSalariales ?? []).map((c) => ({
        tipo: "no_salarial" as const,
        concepto: c.concepto,
        importe_mensual: c.importeMensual,
      })),
    ],
  };

  const payloadNomina = {
    periodo_desde: body.nomina.periodoLiquidacion.desde,
    periodo_hasta: body.nomina.periodoLiquidacion.hasta,
    fecha_pago: body.nomina.fechaPago,
    grupo_cotizacion: body.nomina.grupoCotizacion,
    categoria_profesional: body.nomina.categoriaProfesional,
    salario_base: body.nomina.devengos.salarioBase,
    horas_extra_cantidad: body.nomina.devengos.horasExtraCantidad,
    horas_extra_importe: body.nomina.devengos.horasExtraImporte,
    paga_extra_prorrateada: body.nomina.devengos.pagaExtraProrrateada,
    salario_en_especie: body.nomina.devengos.salarioEnEspecie,
    total_devengado: body.nomina.devengos.totalDevengado,
    base_cotizacion_contingencias_comunes: body.nomina.deducciones.baseCotizacionContingenciasComunes,
    porcentaje_irpf: body.nomina.deducciones.porcentajeIRPFAplicado,
    importe_retencion_irpf: body.nomina.deducciones.importeRetencionIRPF,
    aportacion_trabajador_ss: body.nomina.deducciones.aportacionTrabajadorSS,
    total_deducido: body.nomina.deducciones.totalDeducido,
    liquido_a_percibir: body.nomina.liquidoAPercibir,
    extraido_por_ia: true,
    campos_baja_confianza: body.nomina.camposConBajaConfianza ?? [],
    __complementos: (body.nomina.devengos.complementos ?? []).map((c) => ({
      concepto: c.concepto,
      importe: c.importe,
    })),
  };

  const { data: propuestas, error } = await admin
    .from("cambios_pendientes_ia")
    .insert([
      {
        user_id: user.id,
        tabla_destino: "contratos",
        operacion: "insert",
        payload_anterior: null,
        payload_propuesto: payloadContrato,
        justificacion:
          "Estos son los datos que he leído en el contrato que has subido. Revísalos: si algo no coincide con el documento original, recházalo y corrígelo manualmente.",
      },
      {
        user_id: user.id,
        tabla_destino: "nominas",
        operacion: "insert",
        payload_anterior: null,
        payload_propuesto: payloadNomina,
        justificacion:
          "Estos son los datos que he leído en la nómina que has subido. Revísalos antes de guardarlos.",
      },
    ])
    .select("id, tabla_destino");

  if (error || !propuestas) {
    return NextResponse.json({ mensaje: "No se ha podido crear la propuesta de guardado." }, { status: 500 });
  }

  const cambioContratoId = propuestas.find((p) => p.tabla_destino === "contratos")?.id;
  const cambioNominaId = propuestas.find((p) => p.tabla_destino === "nominas")?.id;

  return NextResponse.json({ cambioContratoId, cambioNominaId });
}
