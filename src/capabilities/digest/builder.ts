import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import { sendAlert } from '../../integrations/notifications.js';
import { listAllContexts } from '../bot/index.js';
import { listarBacklog } from '../curator/index.js';
import { listarPorEstado } from '../ugc/index.js';
import { listarExperimentos } from '../experiments/index.js';
import { listarEnrollments } from '../nurture/index.js';
import { getCrisisState } from '../crisis/index.js';
import { getBudgetStatus } from '../../agent/budget.js';
import { listMissions } from '../../agent/swarm/index.js';
import { getTraceStats } from '../reasoningTrace/index.js';
import { queryLedger } from '../research/index.js';
import { listCarouselJobs } from '../content/index.js';
import type { BrandProfile } from '../../config/types.js';

export interface DailyDigestData {
  fecha: string;
  conversaciones: { totales: number; escaladas: number; nuevas24h: number };
  curatorBacklog: { nuevos: number; aprobados: number };
  ugc: { pendientes: number; aprobadosHoy: number };
  experimentos: { corriendo: number; completados: number };
  nurture: { activos: number; completados: number };
  crisis: { pausado: boolean; alertasEnviadas: number };
  /** Inteligencia del sistema autónomo (determinista, sin LLM). */
  intel: {
    presupuesto: { gastadoUsd: number; topeUsd: number; usadoPct: number; breaker: 'open' | 'closed' };
    misiones: { total: number; ok: number; parciales: number; fallidas: number };
    trazas: { total: number; conOutcome: number; tasaExito: number };
    carruseles: { total: number; publicados: number; retenidos: number };
    riesgos: string[];
  };
}

export interface DailyDigest {
  data: DailyDigestData;
  resumenEjecutivo: string;
  cosasQueRequierenAtencion: string[];
  cosasQuePuedenEsperar: string[];
  notasIA: string;
}

const computeIntelligence = (brandId: string): DailyDigestData['intel'] => {
  const b = getBudgetStatus();
  const missions = listMissions(brandId);
  const traces = getTraceStats(brandId);
  const carousels = listCarouselJobs(brandId);
  const ledgerRisks = queryLedger({ topic: 'risk', limit: 3 })
    .concat(queryLedger({ topic: 'policy-change', limit: 2 }))
    .filter((e) => e.needsVerification || e.confidence !== 'baja')
    .map((e) => `${e.topic}: ${e.insight}`);
  const riesgos: string[] = [...ledgerRisks];
  if (b.breaker === 'open') riesgos.unshift('Presupuesto LLM agotado: el sistema opera en modo determinista.');
  return {
    presupuesto: { gastadoUsd: b.spentUsd, topeUsd: b.capUsd, usadoPct: b.usedPct, breaker: b.breaker },
    misiones: {
      total: missions.length,
      ok: missions.filter((m) => m.status === 'completed').length,
      parciales: missions.filter((m) => m.status === 'partial').length,
      fallidas: missions.filter((m) => m.status === 'failed').length,
    },
    trazas: {
      total: traces.totalTraces,
      conOutcome: traces.withOutcomes,
      tasaExito: Number((traces.successRate * 100).toFixed(0)),
    },
    carruseles: {
      total: carousels.length,
      publicados: carousels.filter((c) => c.status === 'published').length,
      retenidos: carousels.filter((c) => c.status === 'held').length,
    },
    riesgos: riesgos.slice(0, 5),
  };
};

const computeData = (brandId: string): DailyDigestData => {
  const since24h = Date.now() - 86400_000;
  const ctxs = listAllContexts();
  const backlog = listarBacklog();
  const ugcPendientes = listarPorEstado('solicitado').length;
  const ugcAprobadosHoy = listarPorEstado('aprobado').filter((u) => {
    if (!u.permisoRespuestaEn) return false;
    return new Date(u.permisoRespuestaEn).getTime() > since24h;
  }).length;
  const expCorriendo = listarExperimentos('corriendo').length;
  const expCompletadosHoy = listarExperimentos('completado').filter((e) => {
    if (!e.completadoEn) return false;
    return new Date(e.completadoEn).getTime() > since24h;
  }).length;
  const enrActivos = listarEnrollments('activo').length;
  const enrCompletados = listarEnrollments('completado').length;
  const crisis = getCrisisState();

  return {
    fecha: new Date().toISOString().split('T')[0]!,
    conversaciones: {
      totales: ctxs.length,
      escaladas: ctxs.filter((c) => c.escaladoAHumano).length,
      nuevas24h: ctxs.filter((c) => new Date(c.primerContacto).getTime() > since24h).length,
    },
    curatorBacklog: {
      nuevos: backlog.filter((b) => b.status === 'nuevo').length,
      aprobados: backlog.filter((b) => b.status === 'aprobado').length,
    },
    ugc: { pendientes: ugcPendientes, aprobadosHoy: ugcAprobadosHoy },
    experimentos: { corriendo: expCorriendo, completados: expCompletadosHoy },
    nurture: { activos: enrActivos, completados: enrCompletados },
    crisis: { pausado: crisis.publicacionesPausadas, alertasEnviadas: crisis.alertasEnviadas },
    intel: computeIntelligence(brandId),
  };
};

/** Digest determinista (sin LLM) — siempre disponible, aunque el budget esté agotado. */
const digestDeterminista = (data: DailyDigestData): DailyDigest => ({
  data,
  resumenEjecutivo: `Sistema operando. Misiones ${data.intel.misiones.ok}✓/${data.intel.misiones.fallidas}✗, presupuesto ${data.intel.presupuesto.usadoPct}% usado, ${data.conversaciones.escaladas} conversaciones escaladas.`,
  cosasQueRequierenAtencion: [
    ...(data.crisis.pausado ? ['Publicaciones PAUSADAS por crisis.'] : []),
    ...data.intel.riesgos,
    ...(data.conversaciones.escaladas > 0
      ? [`${data.conversaciones.escaladas} conversaciones escaladas a humano.`]
      : []),
  ].slice(0, 6),
  cosasQuePuedenEsperar: [
    `${data.intel.misiones.total} misiones autónomas en historial`,
    `${data.intel.carruseles.publicados} carruseles publicados`,
    `${data.experimentos.corriendo} experimentos corriendo`,
  ],
  notasIA: 'Digest determinista (sin LLM).',
});

/** Snapshot determinista e instantáneo (sin LLM) para paneles en vivo. */
export const digestSnapshot = (brand: BrandProfile): DailyDigest => digestDeterminista(computeData(brand.name));

export const construirDigest = async (brand: BrandProfile): Promise<DailyDigest> => {
  const data = computeData(brand.name);
  const prompt = `Actuá como editor del digest diario para el dueño de la marca. Filtrá ruido. Decí solo lo que importa hoy.

${brandContext(brand)}

DATOS CRUDOS DEL DÍA:
${JSON.stringify(data, null, 2)}

Reglas:
- Resumen ejecutivo: 2-3 oraciones máximo.
- "cosasQueRequierenAtencion": acciones que él DEBE tomar hoy (no listas largas, prioridad alta real).
- "cosasQuePuedenEsperar": ítems que están corriendo solos y no requieren intervención (para que tenga la sensación de control).
- Si crisis.pausado=true → mencionarlo en el resumen primero.

JSON:
{
  "data": ${JSON.stringify(data)},
  "resumenEjecutivo": "...",
  "cosasQueRequierenAtencion": ["..."],
  "cosasQuePuedenEsperar": ["..."],
  "notasIA": "qué tendencia detectás día a día (solo si tenés contexto histórico, sino vacío)"
}`;
  return askJson<DailyDigest>(prompt, { maxTokens: 2500, fast: true });
};

export const enviarDigest = async (brand: BrandProfile): Promise<DailyDigest> => {
  // Resiliente: si el LLM no está disponible (presupuesto agotado, error),
  // igual mandamos el digest determinista con la inteligencia del sistema.
  let digest: DailyDigest;
  try {
    digest = await construirDigest(brand);
  } catch {
    digest = digestDeterminista(computeData(brand.name));
  }
  const i = digest.data.intel;
  const body = [
    `*${brand.name}* — digest ${digest.data.fecha}`,
    '',
    digest.resumenEjecutivo,
    '',
    `*Hoy requieren tu atención:*`,
    ...(digest.cosasQueRequierenAtencion.length
      ? digest.cosasQueRequierenAtencion.map((x) => `• ${x}`)
      : ['• nada en particular ✓']),
    '',
    `*Sistema autónomo:* presupuesto ${i.presupuesto.usadoPct}% ($${i.presupuesto.gastadoUsd}/$${i.presupuesto.topeUsd}, breaker ${i.presupuesto.breaker}) · misiones ${i.misiones.ok}✓/${i.misiones.parciales}~/${i.misiones.fallidas}✗ · carruseles ${i.carruseles.publicados} pub/${i.carruseles.retenidos} ret · trazas éxito ${i.trazas.tasaExito}%`,
    '',
    `*Corriendo solo:* ${digest.cosasQuePuedenEsperar.length} ítems`,
  ].join('\n');

  const severity = digest.data.crisis.pausado ? 'crisis' : 'reporte';
  await sendAlert({
    severity,
    title: `Digest diario IG (${brand.name})`,
    body,
    metadata: digest.data as unknown as Record<string, unknown>,
  });
  return digest;
};
