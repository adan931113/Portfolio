/**
 * sincronizarComplementos.ts
 * ------------------------------------------------------------------------
 * Resuelve la sincronización de los arrays de complementos
 * (`contrato_complementos` / `nomina_complementos`) UNA VEZ que la propuesta
 * padre (`contratos` / `nominas`) ya se ha aplicado y existe su `id` real.
 *
 * Por qué hace falta este paso aparte: `cambios_pendientes_ia` guarda un
 * único payload por fila, pero un contrato o una nómina tienen una relación
 * 1-a-muchos con sus complementos, que viven en su propia tabla y necesitan
 * la clave foránea del padre — una clave que, antes de aprobar la
 * propuesta, todavía no existe. La solución: el payload_propuesto del
 * padre incluye una clave auxiliar "__complementos" (no es una columna real
 * de `contratos`/`nominas`); esta función la extrae, la retira del payload
 * antes del INSERT/UPDATE principal, y siembra las filas hijas justo
 * después, ya con el id del padre.
 *
 * Se usa exclusivamente desde /api/cambios-ia/[id]/confirmar, con el
 * cliente admin (service role): a esas alturas ya se ha verificado que la
 * propuesta pertenece al usuario autenticado, así que no hace falta volver
 * a comprobar RLS aquí.
 * ------------------------------------------------------------------------
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TablaDestino } from "./types";

export interface ComplementoContratoPropuesto {
  tipo: "salarial" | "no_salarial";
  concepto: string;
  importe_mensual: number;
}

export interface ComplementoNominaPropuesto {
  concepto: string;
  importe: number;
}

/** Tablas que tienen complementos hijos y cómo se llama la FK hacia el padre. */
const CONFIG_COMPLEMENTOS: Partial<Record<TablaDestino, { tablaHija: string; columnaFk: string }>> = {
  contratos: { tablaHija: "contrato_complementos", columnaFk: "contrato_id" },
  nominas: { tablaHija: "nomina_complementos", columnaFk: "nomina_id" },
};

/**
 * Extrae "__complementos" del payload propuesto (si existe) y devuelve por
 * separado el payload "limpio" (listo para el INSERT/UPDATE de la tabla
 * principal) y el array de complementos a sincronizar después.
 */
export function separarComplementosDelPayload(
  tablaDestino: TablaDestino,
  payloadPropuesto: Record<string, unknown>,
): { payloadLimpio: Record<string, unknown>; complementos: unknown[] | null } {
  if (!CONFIG_COMPLEMENTOS[tablaDestino]) {
    return { payloadLimpio: payloadPropuesto, complementos: null };
  }

  const { __complementos, ...resto } = payloadPropuesto as Record<string, unknown> & {
    __complementos?: unknown[];
  };

  return {
    payloadLimpio: resto,
    complementos: Array.isArray(__complementos) ? __complementos : null,
  };
}

/**
 * Sustituye por completo los complementos del padre indicado: borra los que
 * hubiera (no-op en un INSERT nuevo; relevante si en el futuro se admite
 * re-sincronizar tras un UPDATE) e inserta los nuevos. Operación idempotente:
 * aplicar la misma propuesta dos veces deja el mismo resultado.
 */
export async function sincronizarComplementosHijos(
  admin: SupabaseClient,
  tablaDestino: TablaDestino,
  idPadre: string,
  complementos: unknown[] | null,
): Promise<void> {
  const config = CONFIG_COMPLEMENTOS[tablaDestino];
  if (!config || !complementos) return;

  const { tablaHija, columnaFk } = config;

  const { error: errorBorrado } = await admin.from(tablaHija).delete().eq(columnaFk, idPadre);
  if (errorBorrado) {
    throw new Error(`No se pudieron limpiar los complementos existentes de ${tablaHija}: ${errorBorrado.message}`);
  }

  if (complementos.length === 0) return;

  const filas = complementos.map((c) => ({ ...(c as Record<string, unknown>), [columnaFk]: idPadre }));

  const { error: errorInsercion } = await admin.from(tablaHija).insert(filas);
  if (errorInsercion) {
    throw new Error(`No se pudieron guardar los complementos en ${tablaHija}: ${errorInsercion.message}`);
  }
}
