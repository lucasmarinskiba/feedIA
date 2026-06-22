/**
 * Weekly KPI Audit
 * ─────────────────────────────────────────────────────────────────────────
 * Comprehensive system-wide audit that the existing per-domain reports do
 * NOT cover. It orchestrates data from every operational area:
 *
 *   • Analytics (performance snapshot + anomalies)
 *   • Auto-optimization extraction (what's working for this brand)
 *   • Crisis state (any reputation issues open)
 *   • Experiments (running and recently finished)
 *   • Content backlog (curator + UGC pipeline health)
 *   • Brand consistency (passing the rules?)
 *   • Checkpoint debt (pending human approvals)
 *
 * Output is a single audit report with:
 *   • Section-by-section health scores (0–100)
 *   • Top 3 strategic priorities for the coming week
 *   • Auto-applied strategy adjustments (logged to autoOptimize store)
 *   • Human-readable executive summary for alerts
 *
 * Designed to run as a weekly scheduled job. Idempotent.
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import { buildSnapshot, detectAnomalies } from '../analytics/insights.js';
import { getCrisisState, isPausado } from '../crisis/index.js';
import { listarExperimentos } from '../experiments/index.js';
import { listarBacklog } from '../curator/index.js';
import { listarPorEstado as listarUgcPorEstado } from '../ugc/index.js';
import { listCheckpoints } from '../../agent/checkpoints.js';
import { runAutoOptimization, recordOptimizationRun } from '../autoOptimize/index.js';
import { getAccountabilitySnapshot } from '../accountabilityEngine/accountabilityEngine.js';
import { ensureBrandStrategy, evaluateBrandRules } from '../branding/index.js';

export type AuditHealthBand = 'excelente' | 'bueno' | 'aceptable' | 'riesgo' | 'critico';

export interface SectionScore {
  section: string;
  score: number;
  band: AuditHealthBand;
  observations: string[];
}

export interface StrategicPriority {
  rank: number;
  title: string;
  rationale: string;
  expectedOutcome: string;
  ownerHint:
    | 'algorithm'
    | 'meta-ads'
    | 'strategist'
    | 'community'
    | 'viral'
    | 'growth'
    | 'storyteller'
    | 'humor'
    | 'sales'
    | 'trends';
}

export interface WeeklyAuditResult {
  generatedAt: string;
  windowDays: number;
  overallScore: number;
  overallBand: AuditHealthBand;
  sections: SectionScore[];
  priorities: StrategicPriority[];
  executiveSummary: string;
  autoOptimizationRanAt: string | null;
  autoOptimizationSummary: string | null;
  appliedAdjustments: number;
}

const bandFor = (score: number): AuditHealthBand =>
  score >= 90 ? 'excelente' : score >= 75 ? 'bueno' : score >= 60 ? 'aceptable' : score >= 40 ? 'riesgo' : 'critico';

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/* ──────────────────────────────────────────────────────────────────────── */

const scoreContentEngine = (backlogCount: number, ugcPending: number, topPerformerCount: number): SectionScore => {
  let score = 50;
  const obs: string[] = [];

  if (backlogCount >= 10) {
    score += 20;
    obs.push(`Backlog saludable: ${backlogCount} ítems`);
  } else if (backlogCount >= 5) {
    score += 10;
    obs.push(`Backlog moderado: ${backlogCount} ítems (objetivo ≥10)`);
  } else {
    score -= 15;
    obs.push(`Backlog crítico: solo ${backlogCount} ítems`);
  }

  if (ugcPending >= 3) {
    score += 10;
    obs.push(`${ugcPending} UGCs pendientes de gestión — oportunidad de social proof`);
  }
  if (topPerformerCount >= 5) {
    score += 15;
    obs.push(`${topPerformerCount} top performers para extraer patrones`);
  } else if (topPerformerCount === 0) {
    score -= 10;
    obs.push('Sin top performers registrados — no se puede cerrar el loop de aprendizaje');
  }

  score = clamp(score);
  return { section: 'Content engine', score, band: bandFor(score), observations: obs };
};

const scoreExperiments = (corriendo: number, completados: number): SectionScore => {
  let score = 50;
  const obs: string[] = [];
  if (corriendo >= 2) {
    score += 25;
    obs.push(`${corriendo} experimentos corriendo en paralelo`);
  } else if (corriendo === 1) {
    score += 10;
    obs.push(`1 experimento corriendo — ideal tener 2-3 en paralelo`);
  } else {
    score -= 15;
    obs.push('Sin experimentos activos — no estás aprendiendo sistemáticamente');
  }
  if (completados >= 1) {
    score += 15;
    obs.push(`${completados} experimentos completados con aprendizajes documentables`);
  }
  score = clamp(score);
  return { section: 'Growth experiments', score, band: bandFor(score), observations: obs };
};

const scoreCrisis = (): SectionScore => {
  const state = getCrisisState();
  const obs: string[] = [];
  let score = 100;
  if (isPausado()) {
    score = 10;
    obs.push('🚨 Publicaciones PAUSADAS por crisis activa');
  }
  const enObs = state.postsEnObservacion?.length ?? 0;
  if (enObs > 0) {
    score -= enObs * 8;
    obs.push(`${enObs} posts en observación post-publicación`);
  }
  if ((state.alertasEnviadas ?? 0) > 5) {
    score -= 10;
    obs.push(`${state.alertasEnviadas} alertas enviadas — revisá patrón de disparadores`);
  }
  if (obs.length === 0) obs.push('Sin señales de crisis');
  score = clamp(score);
  return { section: 'Reputación / crisis', score, band: bandFor(score), observations: obs };
};

const scoreOpsDebt = (pendingCheckpoints: number, expiredCheckpoints: number): SectionScore => {
  let score = 95;
  const obs: string[] = [];
  if (pendingCheckpoints === 0) {
    obs.push('Sin checkpoints pendientes — operación fluida');
  } else if (pendingCheckpoints <= 2) {
    score -= 10;
    obs.push(`${pendingCheckpoints} checkpoint(s) pendientes — atender en 24h`);
  } else {
    score -= 25;
    obs.push(`${pendingCheckpoints} checkpoints pendientes — backlog operativo`);
  }
  if (expiredCheckpoints > 0) {
    score -= expiredCheckpoints * 8;
    obs.push(`${expiredCheckpoints} checkpoint(s) vencidos — bloqueando autonomía`);
  }
  score = clamp(score);
  return { section: 'Deuda operativa', score, band: bandFor(score), observations: obs };
};

const scoreBrandDiscipline = (brand: BrandProfile): SectionScore => {
  try {
    const strategy = ensureBrandStrategy(brand.name);
    const sampleContent = {
      format: 'post-imagen' as const,
      caption: `Auditoría semanal de consistencia en nicho ${brand.niche}`,
      description: 'Pieza tipo para evaluar reglas de marca',
      colorsUsed: brand.visual.palette.slice(0, 3),
      fontsUsed: brand.visual.typography,
      textBlocks: 2,
      imageBlocks: 1,
      density: brand.visual.density,
    };
    const evaluation = evaluateBrandRules(sampleContent, { type: 'image' }, { channel: 'instagram' }, brand, strategy);
    const obs: string[] = [
      `Score de reglas: ${evaluation.score}/100`,
      `Violaciones críticas/altas: ${evaluation.violations.length}`,
      `Warnings: ${evaluation.warnings.length}`,
    ];
    if (!evaluation.passed) obs.push('⚠️ La marca NO está pasando el umbral de consistencia');
    return {
      section: 'Disciplina de marca',
      score: clamp(evaluation.score),
      band: bandFor(evaluation.score),
      observations: obs,
    };
  } catch {
    return {
      section: 'Disciplina de marca',
      score: 60,
      band: 'aceptable',
      observations: ['Estrategia de marca no inicializada — corré ensureBrandStrategy primero'],
    };
  }
};

/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Runs the full weekly audit. Returns the result and ALSO persists the
 * auto-optimization adjustments so they can be reviewed/applied via the
 * dashboard or scheduler.
 */
export const runWeeklyAudit = async (brand: BrandProfile, windowDays = 7): Promise<WeeklyAuditResult> => {
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();

  // ── Pull data (use Promise.allSettled — degrade gracefully if a source
  //    is unavailable; a single integration failure must not block the audit).
  const [snapshotR, optR] = await Promise.allSettled([
    buildSnapshot(since),
    runAutoOptimization(brand, Math.max(windowDays, 30)),
  ]);

  const snapshot = snapshotR.status === 'fulfilled' ? snapshotR.value : null;
  const optimization = optR.status === 'fulfilled' ? optR.value : null;

  const backlogCount = listarBacklog(undefined).length;
  const ugcPending = listarUgcPorEstado('no-solicitado').length;
  const experiments = listarExperimentos();
  const corriendoExp = experiments.filter((e) => e.status === 'corriendo').length;
  const completadosExp = experiments.filter((e) => e.status === 'completado').length;
  const pendingCp = listCheckpoints('pending').length;
  const expiredCp = listCheckpoints('expired').length;

  const promiseHealth = getAccountabilitySnapshot();
  const promiseScore = clamp(
    100 - promiseHealth.atRisk * 20 - promiseHealth.breached * 35 - promiseHealth.avgRiskScore * 0.3,
  );

  const sections: SectionScore[] = [
    scoreContentEngine(backlogCount, ugcPending, optimization?.extraction.sampleSize ?? 0),
    scoreExperiments(corriendoExp, completadosExp),
    scoreCrisis(),
    scoreOpsDebt(pendingCp, expiredCp),
    scoreBrandDiscipline(brand),
    {
      section: 'Promise Health',
      score: promiseScore,
      band: bandFor(promiseScore),
      observations: [
        `${promiseHealth.active} promesas activas`,
        `${promiseHealth.onTrack} on-track | ${promiseHealth.atRisk} en riesgo | ${promiseHealth.breached} incumplidas | ${promiseHealth.fulfilled} cumplidas`,
        `Riesgo promedio: ${promiseHealth.avgRiskScore}/100`,
        ...(promiseHealth.atRisk > 0 ? [`⚠️ ${promiseHealth.atRisk} promesa(s) requieren remediación`] : []),
        ...(promiseHealth.breached > 0
          ? [`🚨 ${promiseHealth.breached} promesa(s) incumplida(s) con compensación pendiente`]
          : []),
      ],
    },
  ];

  if (snapshot) {
    const anomalies = detectAnomalies(snapshot);
    const analyticsScore =
      snapshot.posts.length === 0
        ? 35
        : snapshot.topPerformers.length >= 3
          ? 80
          : snapshot.topPerformers.length >= 1
            ? 65
            : 50;
    sections.unshift({
      section: 'Performance Instagram',
      score: clamp(analyticsScore - anomalies.length * 6),
      band: bandFor(clamp(analyticsScore - anomalies.length * 6)),
      observations: [
        `${snapshot.posts.length} posts analizados en ${windowDays}d`,
        `Saves promedio: ${snapshot.benchmarks.savesProm.toFixed(1)} | Shares promedio: ${snapshot.benchmarks.sharesProm.toFixed(1)}`,
        ...anomalies.slice(0, 3),
      ],
    });
  }

  // ── Persist auto-optimization adjustments so dashboard can review them.
  let appliedAdjustments = 0;
  let autoOptimizationRanAt: string | null = null;
  let autoOptimizationSummary: string | null = null;
  if (optimization) {
    const stored = recordOptimizationRun(optimization);
    appliedAdjustments = stored.storedAdjustments.length;
    autoOptimizationRanAt = new Date().toISOString();
    autoOptimizationSummary = optimization.executiveSummary;
  }

  // ── Overall score = weighted average of sections.
  const overallScore = clamp(sections.reduce((acc, s) => acc + s.score, 0) / Math.max(1, sections.length));

  // ── Ask LLM for strategic priorities + executive summary, but feed it
  //    the deterministic facts so it cannot hallucinate.
  const factsBlock = sections
    .map((s) => `[${s.section}] score ${s.score}/100 (${s.band})\n` + s.observations.map((o) => `  - ${o}`).join('\n'))
    .join('\n');

  const prompt = `Actuás como Chief of Staff de una marca creadora de contenido en Instagram. Convertí esta auditoría semanal en 3 prioridades estratégicas accionables.

${brandContext(brand)}

AUDITORÍA SEMANAL (datos reales del sistema):
${factsBlock}

${optimization?.executiveSummary ? `RESUMEN DE AUTO-OPTIMIZACIÓN:\n${optimization.executiveSummary}\n` : ''}

REGLAS:
- Cada prioridad debe atacar el score más bajo o explotar la mayor oportunidad detectada.
- ownerHint indica qué agente debería liderar la acción.
- El executiveSummary debe leerse en 15 segundos: estado general + 1 victoria + 1 cosa a corregir.

JSON EXCLUSIVO:
{
  "priorities": [
    {
      "rank": 1,
      "title": "título corto y accionable",
      "rationale": "por qué esta semana, basado en los datos",
      "expectedOutcome": "qué cambia si se ejecuta bien",
      "ownerHint": "algorithm|meta-ads|strategist|community|viral|growth|storyteller|humor|sales|trends"
    }
  ],
  "executiveSummary": "2-3 oraciones."
}`;

  const llm = await askJson<{
    priorities: StrategicPriority[];
    executiveSummary: string;
  }>(prompt, { maxTokens: 1000 });

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    overallScore,
    overallBand: bandFor(overallScore),
    sections,
    priorities: llm.priorities ?? [],
    executiveSummary: llm.executiveSummary ?? '',
    autoOptimizationRanAt,
    autoOptimizationSummary,
    appliedAdjustments,
  };
};
