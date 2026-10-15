/**
 * calculos.ts — Funciones puras del Módulo 7 (Finanzas) y Módulo 8 (Deudas).
 * Sin llamadas a red ni a Supabase: fáciles de testear y de reutilizar
 * tanto en el cliente como, si hiciera falta, en una ruta de servidor.
 */

export type CategoriaGasto =
  | "vivienda"
  | "comida_restaurantes"
  | "ocio"
  | "compras"
  | "suscripciones"
  | "transporte"
  | "salud"
  | "otros";

export const ETIQUETAS_CATEGORIA_GASTO: Record<CategoriaGasto, string> = {
  vivienda: "Vivienda",
  comida_restaurantes: "Comida y restaurantes",
  ocio: "Ocio",
  compras: "Compras",
  suscripciones: "Suscripciones",
  transporte: "Transporte",
  salud: "Salud",
  otros: "Otros",
};

export interface Gasto {
  id: string;
  categoria: CategoriaGasto;
  concepto: string;
  importe: number;
  fecha: string; // ISO
}

export interface ResumenCategoria {
  categoria: CategoriaGasto;
  etiqueta: string;
  total: number;
  porcentajeDelTotal: number;
}

/** Agrupa una lista de gastos por categoría y calcula el peso de cada una sobre el total. */
export function agruparGastosPorCategoria(gastos: Gasto[]): ResumenCategoria[] {
  const totales = new Map<CategoriaGasto, number>();
  let totalGeneral = 0;

  for (const g of gastos) {
    totales.set(g.categoria, (totales.get(g.categoria) ?? 0) + g.importe);
    totalGeneral += g.importe;
  }

  return Array.from(totales.entries())
    .map(([categoria, total]) => ({
      categoria,
      etiqueta: ETIQUETAS_CATEGORIA_GASTO[categoria],
      total: round2(total),
      porcentajeDelTotal: totalGeneral > 0 ? round2((total / totalGeneral) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface DeudaResumen {
  id: string;
  entidad: string;
  tipo: string;
  importeTotal: number;
  importePendiente: number;
  cuotaMensual: number;
}

export interface DeudaConProgreso extends DeudaResumen {
  importePagado: number;
  porcentajePagado: number;
}

export function calcularProgresoDeuda(deuda: DeudaResumen): DeudaConProgreso {
  const importePagado = Math.max(0, round2(deuda.importeTotal - deuda.importePendiente));
  const porcentajePagado = deuda.importeTotal > 0 ? round2((importePagado / deuda.importeTotal) * 100) : 0;
  return { ...deuda, importePagado, porcentajePagado };
}

/**
 * Ingreso Disponible Real = Total Neto Ingresado en el mes (nóminas) menos
 * la suma de las cuotas mensuales de todas las deudas activas (con saldo
 * pendiente > 0). No resta los gastos variables: esos se muestran aparte
 * para que el usuario vea cuánto de ese disponible ya se ha consumido.
 */
export function calcularIngresoDisponibleReal(totalNetoMes: number, deudas: DeudaResumen[]): {
  totalCuotasMensuales: number;
  ingresoDisponibleReal: number;
} {
  const totalCuotasMensuales = round2(
    deudas.filter((d) => d.importePendiente > 0).reduce((acc, d) => acc + d.cuotaMensual, 0),
  );
  return {
    totalCuotasMensuales,
    ingresoDisponibleReal: round2(totalNetoMes - totalCuotasMensuales),
  };
}

export interface ParametrosProyeccionAhorro {
  importeActual: number;
  aportacionMensual: number;
  /** Tasa de rentabilidad anual estimada, en tanto por uno (0.03 = 3%). 0 = simple hucha sin rentabilidad. */
  tasaAnualEstimada: number;
  meses: number;
}

export interface PuntoProyeccionAhorro {
  mes: number;
  importeAcumulado: number;
}

/**
 * Simulación BÁSICA de ahorro/inversión con aportaciones mensuales y
 * capitalización compuesta mensualizada. Es una proyección orientativa
 * (no considera comisiones, fiscalidad ni volatilidad real de mercado) y
 * así debe mostrarse siempre junto al resultado.
 */
export function proyectarAhorro(params: ParametrosProyeccionAhorro): PuntoProyeccionAhorro[] {
  const tasaMensual = params.tasaAnualEstimada / 12;
  const puntos: PuntoProyeccionAhorro[] = [];
  let acumulado = params.importeActual;

  for (let mes = 1; mes <= params.meses; mes++) {
    acumulado = acumulado * (1 + tasaMensual) + params.aportacionMensual;
    puntos.push({ mes, importeAcumulado: round2(acumulado) });
  }

  return puntos;
}

/** Nº de meses estimado para alcanzar un objetivo de ahorro, dada una aportación mensual fija. */
export function mesesHastaObjetivo(
  importeActual: number,
  importeObjetivo: number,
  aportacionMensual: number,
  tasaAnualEstimada = 0,
): number | null {
  if (importeActual >= importeObjetivo) return 0;
  if (aportacionMensual <= 0 && tasaAnualEstimada <= 0) return null; // nunca se alcanza

  const tasaMensual = tasaAnualEstimada / 12;
  let acumulado = importeActual;
  let mes = 0;
  const LIMITE_MESES = 1200; // 100 años, salvaguarda contra bucles infinitos

  while (acumulado < importeObjetivo && mes < LIMITE_MESES) {
    acumulado = acumulado * (1 + tasaMensual) + aportacionMensual;
    mes++;
  }

  return acumulado >= importeObjetivo ? mes : null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
