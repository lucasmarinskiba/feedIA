/**
 * Motor de OKR — objetivos con porqué, resultados clave medibles, validación de calidad,
 * progreso con check-ins y un resumen legible para los agentes de IA.
 *
 * Sin Anthropic call directo. Persistencia JSON por marca.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const OKR_DIR = path.resolve('data/executive/okr');
const DIA = 86_400_000;
const SEMANA = 7 * DIA;

export type OKRPeriod = 'month' | 'quarter' | 'year';
export type OKRStatus = 'on-track' | 'at-risk' | 'behind' | 'ahead' | 'completed' | 'abandoned';
export type KRMetricType = 'count' | 'percent' | 'currency' | 'ratio' | 'time-minutes';
export type KRDireccion = 'increase' | 'decrease';
export type OKRCategoria = 'growth' | 'engagement' | 'revenue' | 'brand' | 'efficiency' | 'community';

export type KRSource =
  | 'manual'
  | 'seguidores-instagram'
  | 'seguidores-tiktok'
  | 'piezas-creadas'
  | 'carruseles-publicados'
  | 'comentarios-revisados';

export interface CheckIn {
  fecha: string;
  valor: number;
  nota: string;
}

export interface KeyResult {
  id: string;
  description: string;
  fuente: KRSource;
  metricType: KRMetricType;
  unidad: string;
  direccion: KRDireccion;
  baseline: number;
  target: number;
  current: number;
  progressPct: number;
  status: OKRStatus;
  lastUpdated: string;
  weeklyProgress: Array<{ week: string; value: number }>;
  checkIns: CheckIn[];
  trend: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  projectedFinal: number;
  projectedHitsTarget: boolean;
}

export interface Calidad {
  puntaje: number;
  bloqueantes: string[];
  observaciones: string[];
}

export interface Objective {
  id: string;
  brandId: string;
  period: OKRPeriod;
  periodStart: string;
  periodEnd: string;
  title: string;
  porque: string;
  category: OKRCategoria;
  keyResults: KeyResult[];
  overallProgressPct: number;
  status: OKRStatus;
  createdAt: string;
  updatedAt: string;
  lastReview?: string;
  weeksRemaining: number;
  recommendations: string[];
  calidad: Calidad;
}

export interface EntradaKR {
  id?: string;
  description: string;
  fuente?: KRSource;
  metricType: KRMetricType;
  unidad?: string;
  direccion?: KRDireccion;
  baseline?: number | null;
  target: number | null;
}

export interface EntradaObjetivo {
  title: string;
  porque: string;
  category: OKRCategoria;
  period: OKRPeriod;
  keyResults: EntradaKR[];
}

export interface ValorFuenteReal {
  valor: number;
  absoluto: boolean;
}

export class OKRValidationError extends Error {
  readonly calidad: Calidad;
  constructor(calidad: Calidad) {
    super(calidad.bloqueantes[0] ?? 'OKR inválido');
    this.name = 'OKRValidationError';
    this.calidad = calidad;
  }
}

const duracionPeriodo = (period: OKRPeriod): number =>
  period === 'month' ? 30 * DIA : period === 'quarter' ? 90 * DIA : 365 * DIA;

const okrPath = (brandId: string): string => path.join(OKR_DIR, `${brandId}-okrs.json`);

const loadObjectives = async (brandId: string): Promise<Objective[]> => {
  try {
    return JSON.parse(await fs.readFile(okrPath(brandId), 'utf-8')) as Objective[];
  } catch {
    return [];
  }
};

const saveObjectives = async (brandId: string, objectives: Objective[]): Promise<void> => {
  await fs.mkdir(OKR_DIR, { recursive: true });
  await fs.writeFile(okrPath(brandId), JSON.stringify(objectives, null, 2), 'utf-8');
};

const VERBO_TAREA_OBJETIVO =
  /^(publicar|subir|hacer|crear|enviar|escribir|grabar|responder|postear|editar|diseñar|producir|generar)\b/i;
const VERBO_TAREA_RESULTADO = /\b(publicar|subir|hacer|crear|enviar|escribir|grabar|postear|generar)\b/i;

/**
 * Revisa que el OKR sea un marco de trabajo útil: objetivo con sentido, porqué explícito,
 * resultados medibles con meta distinta del punto de partida y dirección coherente.
 * Los bloqueantes impiden guardar; las observaciones son consejos.
 */
export const evaluarOKR = (e: EntradaObjetivo): Calidad => {
  const bloqueantes: string[] = [];
  const observaciones: string[] = [];
  const titulo = (e.title ?? '').trim();
  const porque = (e.porque ?? '').trim();

  if (titulo.length < 8) bloqueantes.push('El objetivo es muy corto: escribí qué querés lograr (mínimo 8 caracteres).');
  if (VERBO_TAREA_OBJETIVO.test(titulo)) {
    observaciones.push(
      'El objetivo arranca como una tarea. Un objetivo describe el resultado que buscás, no la acción (ej.: "Ser la cuenta de referencia..." en vez de "Publicar...").',
    );
  }
  if (porque.length < 20) {
    bloqueantes.push('Explicá el porqué: qué cambia si lográs este objetivo (mínimo 20 caracteres).');
  }
  if (e.keyResults.length === 0) bloqueantes.push('Agregá al menos un resultado clave.');
  if (e.keyResults.length > 5) bloqueantes.push('Máximo 5 resultados clave: más que eso dispersa el foco.');
  if (e.keyResults.length > 4)
    observaciones.push('Con más de 4 resultados clave cuesta concentrarse. Entre 2 y 4 es lo ideal.');

  e.keyResults.forEach((kr, i) => {
    const etiqueta = `Resultado ${i + 1}`;
    const desc = (kr.description ?? '').trim();
    if (desc.length < 6) bloqueantes.push(`${etiqueta}: describí el resultado (mínimo 6 caracteres).`);
    if (VERBO_TAREA_RESULTADO.test(desc)) {
      observaciones.push(`${etiqueta}: suena a tarea ("${desc}"). Mejor el resultado que esa tarea produce.`);
    }
    if (kr.target === null || !Number.isFinite(kr.target)) {
      bloqueantes.push(`${etiqueta}: falta la meta (un número).`);
      return;
    }
    const direccion = kr.direccion ?? 'increase';
    const meta = kr.target;
    if (kr.baseline !== null && kr.baseline !== undefined && Number.isFinite(kr.baseline)) {
      const base = kr.baseline;
      if (meta === base) {
        bloqueantes.push(`${etiqueta}: la meta no puede ser igual al valor inicial.`);
      } else if (direccion === 'increase' && meta < base) {
        bloqueantes.push(`${etiqueta}: si el resultado es aumentar, la meta tiene que ser mayor al valor inicial.`);
      } else if (direccion === 'decrease' && meta > base) {
        bloqueantes.push(`${etiqueta}: si el resultado es reducir, la meta tiene que ser menor al valor inicial.`);
      } else if (direccion === 'increase' && base > 0) {
        const factor = meta / base;
        if (factor < 1.1)
          observaciones.push(
            `${etiqueta}: la meta casi no pide crecimiento. Un OKR ambicioso suele apuntar a +30% o más.`,
          );
        if (factor > 20)
          observaciones.push(
            `${etiqueta}: la meta es 20 veces el punto de partida. Revisá si es realista para este período.`,
          );
      }
    }
  });

  const puntaje = Math.max(0, Math.min(100, 100 - bloqueantes.length * 25 - observaciones.length * 8));
  return { puntaje, bloqueantes, observaciones };
};

const brechaKR = (kr: Pick<KeyResult, 'direccion' | 'target' | 'projectedFinal'>): number => {
  const denominador = Math.abs(kr.target) || 1;
  return kr.direccion === 'decrease'
    ? ((kr.projectedFinal - kr.target) / denominador) * 100
    : ((kr.target - kr.projectedFinal) / denominador) * 100;
};

const computeKRProgress = (kr: Pick<KeyResult, 'baseline' | 'target' | 'current'>): number => {
  const range = kr.target - kr.baseline;
  if (range === 0) return kr.current === kr.target ? 100 : 0;
  const pct = ((kr.current - kr.baseline) / range) * 100;
  return Math.max(0, Math.min(100, pct));
};

const computeTrend = (weeklyProgress: KeyResult['weeklyProgress'], direccion: KRDireccion): KeyResult['trend'] => {
  if (weeklyProgress.length < 3) return 'steady';
  const signo = direccion === 'decrease' ? -1 : 1;
  const recent = weeklyProgress.slice(-3).map((w) => w.value * signo);
  const deltas: number[] = [];
  for (let i = 1; i < recent.length; i++) deltas.push(recent[i]! - recent[i - 1]!);
  if (deltas.every((d) => d === 0)) return 'stalled';
  const avgDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const lastDelta = deltas[deltas.length - 1]!;
  if (lastDelta > avgDelta * 1.3) return 'accelerating';
  if (lastDelta < avgDelta * 0.7 && avgDelta > 0) return 'decelerating';
  return 'steady';
};

const projectKRFinal = (kr: Pick<KeyResult, 'current' | 'weeklyProgress'>, weeksRemaining: number): number => {
  if (kr.weeklyProgress.length < 2) return kr.current;
  const recent = kr.weeklyProgress.slice(-4);
  const totalDelta = recent[recent.length - 1]!.value - recent[0]!.value;
  const weeklyRate = totalDelta / (recent.length - 1);
  return kr.current + weeklyRate * weeksRemaining;
};

const determineKRStatus = (
  progressPct: number,
  weeksElapsed: number,
  weeksTotal: number,
  projectedHitsTarget: boolean,
): OKRStatus => {
  if (progressPct >= 100) return 'completed';
  const expectedPct = weeksTotal > 0 ? (weeksElapsed / weeksTotal) * 100 : 0;
  if (projectedHitsTarget && progressPct >= expectedPct * 1.1) return 'ahead';
  if (projectedHitsTarget && progressPct >= expectedPct * 0.85) return 'on-track';
  if (progressPct >= expectedPct * 0.6) return 'at-risk';
  return 'behind';
};

const tiempoObjetivo = (objective: Objective): { weeksTotal: number; weeksElapsed: number } => {
  const weeksTotal = (Date.parse(objective.periodEnd) - Date.parse(objective.periodStart)) / SEMANA;
  const weeksElapsed = (Date.now() - Date.parse(objective.periodStart)) / SEMANA;
  return { weeksTotal, weeksElapsed };
};

const recalcularKR = (objective: Objective, kr: KeyResult): void => {
  const { weeksTotal, weeksElapsed } = tiempoObjetivo(objective);
  objective.weeksRemaining = Math.max(0, Math.ceil(weeksTotal - weeksElapsed));
  kr.progressPct = computeKRProgress(kr);
  kr.trend = computeTrend(kr.weeklyProgress, kr.direccion);
  kr.projectedFinal = projectKRFinal(kr, objective.weeksRemaining);
  kr.projectedHitsTarget =
    kr.direccion === 'decrease' ? kr.projectedFinal <= kr.target : kr.projectedFinal >= kr.target;
  kr.status =
    weeksElapsed < 1 && kr.progressPct < 100
      ? 'on-track'
      : determineKRStatus(kr.progressPct, weeksElapsed, weeksTotal, kr.projectedHitsTarget);
};

const generateRecommendations = (objective: Objective): string[] => {
  const recs: string[] = [];
  for (const kr of objective.keyResults.filter((k) => k.status === 'behind' || k.status === 'at-risk')) {
    if (kr.trend === 'stalled') {
      recs.push(`"${kr.description}" está estancado: cambiá la táctica o reprioriza.`);
    } else if (kr.trend === 'decelerating') {
      recs.push(`"${kr.description}" se está frenando: sumá recursos o probá un enfoque nuevo.`);
    } else if (!kr.projectedHitsTarget) {
      recs.push(
        `"${kr.description}" cierra en ~${kr.projectedFinal.toFixed(0)} ${kr.unidad} y la meta es ${kr.target} (brecha ${brechaKR(kr).toFixed(0)}%).`,
      );
    }
  }
  const acelerando = objective.keyResults.filter((k) => k.trend === 'accelerating');
  if (acelerando.length > 0) {
    recs.push(`Duplicá lo que está funcionando: ${acelerando.map((k) => k.description.slice(0, 40)).join(', ')}.`);
  }
  if (objective.weeksRemaining < 2 && objective.overallProgressPct < 80) {
    recs.push(
      `Sprint final: queda ${objective.weeksRemaining} semana(s) y ${(100 - objective.overallProgressPct).toFixed(0)}% pendiente. Todo el foco a este objetivo.`,
    );
  }
  return recs;
};

const recalcularObjetivo = (objective: Objective): void => {
  objective.overallProgressPct = objective.keyResults.length
    ? objective.keyResults.reduce((s, k) => s + k.progressPct, 0) / objective.keyResults.length
    : 0;
  const estados = objective.keyResults.map((k) => k.status);
  if (estados.length > 0 && estados.every((s) => s === 'completed')) objective.status = 'completed';
  else if (estados.some((s) => s === 'behind')) objective.status = 'behind';
  else if (estados.some((s) => s === 'at-risk')) objective.status = 'at-risk';
  else if (estados.length > 0 && estados.every((s) => s === 'ahead')) objective.status = 'ahead';
  else objective.status = 'on-track';
  objective.recommendations = generateRecommendations(objective);
};

const crearKR = (kr: EntradaKR & { baseline: number }, ahora: string): KeyResult => ({
  id: `kr-${Math.random().toString(36).slice(2, 8)}`,
  description: kr.description.trim(),
  fuente: kr.fuente ?? 'manual',
  metricType: kr.metricType,
  unidad: (kr.unidad ?? '').trim(),
  direccion: kr.direccion ?? 'increase',
  baseline: kr.baseline,
  target: kr.target as number,
  current: kr.baseline,
  progressPct: 0,
  status: 'on-track',
  lastUpdated: ahora,
  weeklyProgress: [{ week: ahora.slice(0, 10), value: kr.baseline }],
  checkIns: [],
  trend: 'steady',
  projectedFinal: kr.baseline,
  projectedHitsTarget: false,
});

export const createObjective = async (params: EntradaObjetivo & { brandId: string }): Promise<Objective> => {
  const calidad = evaluarOKR(params);
  if (calidad.bloqueantes.length > 0) throw new OKRValidationError(calidad);

  const now = new Date();
  const ahora = now.toISOString();
  const objective: Objective = {
    id: `okr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId: params.brandId,
    period: params.period,
    periodStart: ahora,
    periodEnd: new Date(now.getTime() + duracionPeriodo(params.period)).toISOString(),
    title: params.title.trim(),
    porque: params.porque.trim(),
    category: params.category,
    keyResults: params.keyResults.map((kr) => crearKR({ ...kr, baseline: kr.baseline ?? 0 }, ahora)),
    overallProgressPct: 0,
    status: 'on-track',
    createdAt: ahora,
    updatedAt: ahora,
    weeksRemaining: Math.ceil(duracionPeriodo(params.period) / SEMANA),
    recommendations: [],
    calidad,
  };
  for (const kr of objective.keyResults) recalcularKR(objective, kr);
  recalcularObjetivo(objective);

  const objectives = await loadObjectives(params.brandId);
  objectives.push(objective);
  await saveObjectives(params.brandId, objectives);
  log.info('[executiveOKR] objective created', { brandId: params.brandId, id: objective.id, puntaje: calidad.puntaje });
  return objective;
};

/** Edita un OKR conservando el progreso de los resultados que siguen existiendo (por id). */
export const editarObjetivo = async (
  brandId: string,
  objectiveId: string,
  entrada: EntradaObjetivo,
): Promise<Objective | null> => {
  const calidad = evaluarOKR(entrada);
  if (calidad.bloqueantes.length > 0) throw new OKRValidationError(calidad);

  const objectives = await loadObjectives(brandId);
  const objective = objectives.find((o) => o.id === objectiveId);
  if (!objective) return null;

  const ahora = new Date().toISOString();
  const previos = new Map(objective.keyResults.map((k) => [k.id, k]));
  objective.title = entrada.title.trim();
  objective.porque = entrada.porque.trim();
  objective.category = entrada.category;
  if (objective.period !== entrada.period) {
    objective.period = entrada.period;
    objective.periodEnd = new Date(Date.parse(objective.periodStart) + duracionPeriodo(entrada.period)).toISOString();
  }
  objective.keyResults = entrada.keyResults.map((kr) => {
    const previo = kr.id ? previos.get(kr.id) : undefined;
    if (previo) {
      previo.description = kr.description.trim();
      previo.fuente = kr.fuente ?? previo.fuente;
      previo.metricType = kr.metricType;
      previo.unidad = (kr.unidad ?? '').trim();
      previo.direccion = kr.direccion ?? previo.direccion;
      previo.target = kr.target as number;
      if (kr.baseline !== null && kr.baseline !== undefined) previo.baseline = kr.baseline;
      return previo;
    }
    return crearKR({ ...kr, baseline: kr.baseline ?? 0 }, ahora);
  });
  objective.calidad = calidad;
  objective.updatedAt = ahora;
  for (const kr of objective.keyResults) recalcularKR(objective, kr);
  recalcularObjetivo(objective);

  await saveObjectives(brandId, objectives);
  return objective;
};

const aplicarValor = (
  objective: Objective,
  kr: KeyResult,
  newValue: number,
  checkIn: { nota: string } | null,
): void => {
  const ahora = new Date().toISOString();
  kr.current = newValue;
  kr.lastUpdated = ahora;
  const semana = ahora.slice(0, 10);
  const existente = kr.weeklyProgress.find((w) => w.week === semana);
  if (existente) existente.value = newValue;
  else kr.weeklyProgress.push({ week: semana, value: newValue });
  kr.weeklyProgress = kr.weeklyProgress.slice(-26);
  if (checkIn) {
    kr.checkIns.push({ fecha: ahora, valor: newValue, nota: checkIn.nota });
    kr.checkIns = kr.checkIns.slice(-52);
  }
  recalcularKR(objective, kr);
  recalcularObjetivo(objective);
  objective.lastReview = ahora;
  objective.updatedAt = ahora;
};

export const updateKRProgress = async (
  brandId: string,
  objectiveId: string,
  krId: string,
  newValue: number,
  nota = '',
): Promise<Objective | null> => {
  const objectives = await loadObjectives(brandId);
  const objective = objectives.find((o) => o.id === objectiveId);
  if (!objective) return null;
  const kr = objective.keyResults.find((k) => k.id === krId);
  if (!kr) return null;
  aplicarValor(objective, kr, newValue, { nota: nota.trim() });
  await saveObjectives(brandId, objectives);
  return objective;
};

/**
 * Actualiza los KR con fuente real. `absoluto` = el valor ya es el total (seguidores);
 * si no, es lo producido desde el inicio del período y se suma al baseline.
 * Si la fuente no tiene dato, el KR queda como estaba: no se inventa progreso.
 */
export const sincronizarFuentesReales = async (
  brandId: string,
  leerFuente: (fuente: KRSource, desdeIso: string) => Promise<ValorFuenteReal | null>,
): Promise<number> => {
  const objectives = await loadObjectives(brandId);
  let actualizados = 0;
  for (const objective of objectives) {
    if (objective.status === 'abandoned' || objective.status === 'completed') continue;
    if (Date.parse(objective.periodEnd) < Date.now()) continue;
    for (const kr of objective.keyResults) {
      if (kr.fuente === 'manual') continue;
      const lectura = await leerFuente(kr.fuente, objective.periodStart);
      if (!lectura) continue;
      const valorNuevo = lectura.absoluto ? lectura.valor : kr.baseline + lectura.valor;
      if (valorNuevo === kr.current) continue;
      aplicarValor(objective, kr, valorNuevo, { nota: 'Dato real sincronizado' });
      actualizados++;
    }
  }
  if (actualizados > 0) await saveObjectives(brandId, objectives);
  return actualizados;
};

export const archivarObjetivo = async (brandId: string, objectiveId: string): Promise<Objective | null> => {
  const objectives = await loadObjectives(brandId);
  const objective = objectives.find((o) => o.id === objectiveId);
  if (!objective) return null;
  objective.status = 'abandoned';
  objective.updatedAt = new Date().toISOString();
  await saveObjectives(brandId, objectives);
  return objective;
};

export const listActiveObjectives = async (brandId: string): Promise<Objective[]> => {
  const objectives = await loadObjectives(brandId);
  const now = Date.now();
  const activos = objectives.filter(
    (o) => Date.parse(o.periodEnd) >= now && o.status !== 'abandoned' && o.status !== 'completed',
  );
  for (const o of activos) {
    for (const kr of o.keyResults) recalcularKR(o, kr);
    recalcularObjetivo(o);
  }
  return activos;
};

export const getOKRSummary = async (
  brandId: string,
): Promise<{
  totalActive: number;
  onTrack: number;
  atRisk: number;
  behind: number;
  ahead: number;
  overallScore: number;
  topConcern?: { objectiveTitle: string; krDescription: string; gap: number };
}> => {
  const active = await listActiveObjectives(brandId);
  const summary = {
    totalActive: active.length,
    onTrack: 0,
    atRisk: 0,
    behind: 0,
    ahead: 0,
    overallScore: 0,
    topConcern: undefined as { objectiveTitle: string; krDescription: string; gap: number } | undefined,
  };

  let peorBrecha = 0;
  for (const obj of active) {
    if (obj.status === 'on-track') summary.onTrack++;
    else if (obj.status === 'at-risk') summary.atRisk++;
    else if (obj.status === 'behind') summary.behind++;
    else if (obj.status === 'ahead') summary.ahead++;
    summary.overallScore += obj.overallProgressPct;

    for (const kr of obj.keyResults) {
      if (kr.status === 'behind') {
        const brecha = brechaKR(kr);
        if (brecha > peorBrecha) {
          peorBrecha = brecha;
          summary.topConcern = { objectiveTitle: obj.title, krDescription: kr.description, gap: brecha };
        }
      }
    }
  }
  summary.overallScore = active.length > 0 ? summary.overallScore / active.length : 0;
  return summary;
};

const fmt = (n: number): string => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });

/**
 * Resumen en texto y en estructura para que los agentes de IA trabajen con el porqué,
 * las metas y el avance reales de cada OKR activo.
 */
export const contextoOKRParaIA = async (
  brandId: string,
): Promise<{ texto: string; objetivos: Array<Record<string, unknown>> }> => {
  const activos = await listActiveObjectives(brandId);
  if (activos.length === 0) return { texto: 'Sin OKR activos para esta marca.', objetivos: [] };

  const lineas: string[] = [];
  for (const o of activos) {
    const dias = Math.max(0, Math.ceil((Date.parse(o.periodEnd) - Date.now()) / DIA));
    lineas.push(`OBJETIVO: ${o.title}`);
    lineas.push(`POR QUÉ: ${o.porque}`);
    lineas.push(
      `CATEGORÍA: ${o.category} · PERÍODO: ${o.period} · quedan ${dias} días · ESTADO: ${o.status} · AVANCE: ${fmt(o.overallProgressPct)}%`,
    );
    for (const kr of o.keyResults) {
      const verbo = kr.direccion === 'decrease' ? 'reducir' : 'aumentar';
      lineas.push(
        `  - RESULTADO (${verbo}): ${kr.description} · ${fmt(kr.current)} de meta ${fmt(kr.target)} ${kr.unidad} · ${kr.status} · cierra en ~${fmt(kr.projectedFinal)} (${kr.projectedHitsTarget ? 'llega' : 'no llega'}) · fuente: ${kr.fuente}`,
      );
      const ultima = kr.checkIns[kr.checkIns.length - 1];
      if (ultima?.nota) lineas.push(`    última nota: "${ultima.nota}"`);
    }
    for (const rec of o.recommendations) lineas.push(`  * ${rec}`);
    lineas.push('');
  }

  return {
    texto: lineas.join('\n').trim(),
    objetivos: activos.map((o) => ({
      id: o.id,
      objetivo: o.title,
      porque: o.porque,
      categoria: o.category,
      periodo: o.period,
      estado: o.status,
      avancePct: Math.round(o.overallProgressPct),
      resultados: o.keyResults.map((k) => ({
        resultado: k.description,
        actual: k.current,
        meta: k.target,
        unidad: k.unidad,
        direccion: k.direccion,
        estado: k.status,
        proyeccion: k.projectedFinal,
        llega: k.projectedHitsTarget,
        fuente: k.fuente,
      })),
      recomendaciones: o.recommendations,
    })),
  };
};
