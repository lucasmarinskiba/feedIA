// @ts-nocheck
/**
 * Autonomy Core — Cerebro Central Unificado.
 *
 * Orquesta todos los módulos neurales:
 *   Input Layer  → neuralKnowledgeBase (estado del mundo)
 *   Hidden L1    → feedbackLoop        (evaluación y corrección)
 *   Hidden L2    → reinforcementEngine (Q-learning, política)
 *   Hidden L3    → mlopsOrchestrator   (retrain/deploy/rollback)
 *   Safety Gate  → safetyController    (circuit breakers, contingencias)
 *   Output Layer → decisión autónoma   (acción + justificación)
 *
 * Simulación de red neuronal:
 *   - Pesos/sesgos ajustables por módulo (NeuralWeights)
 *   - Funciones de activación: ReLU, sigmoid, softmax
 *   - Retropropagación simplificada: ajuste de pesos por error de recompensa
 *   - Ciclo autónomo completo cada N ms (configurable)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

// ── Imports de módulos neurales ───────────────────────────────────────────────
import { buildNeuralInputState, type NeuralInputState } from './neuralKnowledgeBase.js';
import {
  runFeedbackCycle,
  computeHealthScore,
  needsHumanReview,
  getFeedbackHistory,
  type PerformanceEvaluation,
} from './feedbackLoop.js';
import {
  runRLEpisode,
  selectAction,
  refinePolicyWithClaude,
  getCurrentPolicy,
  getEpisodeHistory,
  type RLAction,
  type RLState,
} from './reinforcementEngine.js';
import {
  ingestNeuralState,
  ingestEvaluation,
  shouldRetrain,
  runRetrainingJob,
  deployPolicy,
  getDataPipelineStats,
} from './mlopsOrchestrator.js';
import {
  checkActionSafety,
  detectContingencyTriggers,
  recordSuccess,
  recordFailure,
  generateSafetyReport,
  type SafetyCheck,
} from './safetyController.js';
import {
  buildIntegrationPlan,
  executeIntegrationPlan,
  type IntegrationPlan,
  type SkillExecutionResult,
} from './skillIntegrator.js';

// ── Constantes ────────────────────────────────────────────────────────────────

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const CORE_DIR = path.resolve('data/neural/core');

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Métricas crudas mínimas para iniciar un ciclo. */
export interface RawMetricsInput {
  followers: number;
  weeklyFollowerDelta: number;
  avgEngagementRate: number;
  avgReachPerPost: number;
  postsPerWeek: number;
  brandCoherenceScore: number;
  lastPublishHour: number;
}

/** Pesos sinápticos por capa oculta. Valores en [0, 1]. */
export interface NeuralWeights {
  feedbackWeight: number;
  reinforcementWeight: number;
  safetyWeight: number;
  healthWeight: number;
  outputBias: number;
  learningRate: number;
}

export interface ActivationLayer {
  name: string;
  inputs: number[];
  outputs: number[];
  activationFn: 'relu' | 'sigmoid' | 'softmax' | 'linear';
}

export interface NeuralForwardPass {
  inputLayer: ActivationLayer;
  hiddenLayer1: ActivationLayer;
  hiddenLayer2: ActivationLayer;
  hiddenLayer3: ActivationLayer;
  outputLayer: ActivationLayer;
  rawScore: number;
  selectedAction: RLAction;
  confidence: number;
}

export interface BackpropResult {
  weightsBefore: NeuralWeights;
  weightsAfter: NeuralWeights;
  rewardSignal: number;
  error: number;
  updated: boolean;
}

export interface AutonomousDecision {
  action: RLAction;
  confidence: number;
  justification: string;
  forwardPass: NeuralForwardPass;
  safetyCheck: SafetyCheck;
  approved: boolean;
  blockedReason?: string;
}

export interface AutonomousCycleResult {
  brandId: string;
  cycleId: string;
  timestamp: string;
  inputState: NeuralInputState;
  evaluation: PerformanceEvaluation;
  decision: AutonomousDecision;
  backprop: BackpropResult;
  retraining: { triggered: boolean; deployed: boolean };
  contingencies: string[];
  humanReviewRequired: boolean;
  nextCycleMs: number;
  integrationPlan?: IntegrationPlan;
  skillResults?: SkillExecutionResult[];
}

export interface CoreConfig {
  cycleIntervalMs: number;
  enableMLOps: boolean;
  enableBackprop: boolean;
  humanReviewEnabled: boolean;
  enableSkillIntegration: boolean; // dispatch skills al final del ciclo
  skillDryRun: boolean; // plan pero no ejecutar
  maxSkillCostUsd: number; // cap por ciclo
}

// ── Funciones de activación ───────────────────────────────────────────────────

const relu = (x: number): number => Math.max(0, x);

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

const softmax = (xs: number[]): number[] => {
  const max = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
};

const applyActivation = (inputs: number[], fn: ActivationLayer['activationFn']): number[] => {
  switch (fn) {
    case 'relu':
      return inputs.map(relu);
    case 'sigmoid':
      return inputs.map(sigmoid);
    case 'softmax':
      return softmax(inputs);
    case 'linear':
      return [...inputs];
  }
};

// ── Helpers: RLState aproximado desde NeuralInputState ───────────────────────

const approximateRLState = (state: NeuralInputState): RLState => {
  const eng = state.accountMetrics.engagementRate;
  const growth = state.accountMetrics.followerGrowthRate;
  const freq = state.accountMetrics.contentFrequencyScore;
  const coherence = state.accountMetrics.brandCoherenceScore;
  const hour = new Date().getHours();

  return {
    engagementBucket: eng < 0.25 ? 'low' : eng < 0.5 ? 'medium' : eng < 0.75 ? 'high' : 'viral',
    growthBucket: growth < 0.2 ? 'declining' : growth < 0.5 ? 'stable' : growth < 0.8 ? 'growing' : 'viral',
    frequencyBucket: freq < 0.35 ? 'under' : freq < 0.75 ? 'optimal' : 'over',
    dayOfWeek: new Date().getDay(),
    hourBucket: hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 15 ? 'midday' : hour < 19 ? 'afternoon' : 'evening',
    contentMixBias: 'mixed',
    brandCoherenceBucket: coherence < 0.4 ? 'low' : coherence < 0.7 ? 'medium' : 'high',
  };
};

// ── Pesos neurales ────────────────────────────────────────────────────────────

const WEIGHTS_PATH = (brandId: string): string => path.join(CORE_DIR, `${brandId}-weights.json`);

const CYCLES_PATH = (brandId: string): string => path.join(CORE_DIR, `${brandId}-cycles.json`);

const ensureCoreDir = async (): Promise<void> => {
  await fs.mkdir(CORE_DIR, { recursive: true });
};

const DEFAULT_WEIGHTS: NeuralWeights = {
  feedbackWeight: 0.35,
  reinforcementWeight: 0.3,
  safetyWeight: 0.2,
  healthWeight: 0.15,
  outputBias: 0.05,
  learningRate: 0.01,
};

const loadWeights = async (brandId: string): Promise<NeuralWeights> => {
  try {
    return JSON.parse(await fs.readFile(WEIGHTS_PATH(brandId), 'utf-8')) as NeuralWeights;
  } catch {
    return { ...DEFAULT_WEIGHTS };
  }
};

const saveWeights = async (brandId: string, weights: NeuralWeights): Promise<void> => {
  await ensureCoreDir();
  await fs.writeFile(WEIGHTS_PATH(brandId), JSON.stringify(weights, null, 2), 'utf-8');
};

const loadCycles = async (brandId: string): Promise<AutonomousCycleResult[]> => {
  try {
    return JSON.parse(await fs.readFile(CYCLES_PATH(brandId), 'utf-8')) as AutonomousCycleResult[];
  } catch {
    return [];
  }
};

const saveCycles = async (brandId: string, cycles: AutonomousCycleResult[]): Promise<void> => {
  await ensureCoreDir();
  await fs.writeFile(CYCLES_PATH(brandId), JSON.stringify(cycles.slice(-100), null, 2), 'utf-8');
};

// ── Forward pass ──────────────────────────────────────────────────────────────

const runForwardPass = (
  inputState: NeuralInputState,
  evaluation: PerformanceEvaluation,
  rlState: RLState,
  safetyCheck: SafetyCheck,
  weights: NeuralWeights,
): NeuralForwardPass => {
  // INPUT LAYER — señales crudas normalizadas [0,1]
  const rawInputs: number[] = [
    inputState.accountMetrics.engagementRate,
    inputState.accountMetrics.followerGrowthRate,
    inputState.accountMetrics.reachRate,
    inputState.accountMetrics.brandCoherenceScore,
    inputState.accountMetrics.contentFrequencyScore,
    inputState.audienceSignals.activeHoursScore,
    inputState.audienceSignals.demographicAlignmentScore,
    inputState.contextSignals.trendAlignment,
  ];
  const inputLayer: ActivationLayer = {
    name: 'input',
    inputs: rawInputs,
    outputs: applyActivation(rawInputs, 'linear'),
    activationFn: 'linear',
  };

  // HIDDEN LAYER 1 — feedbackLoop signals (ReLU)
  const fbScore = evaluation.overallScore / 100;
  const healthScore = computeHealthScore(evaluation) / 100;
  const bottleneckPenalty = Math.max(0, 1 - evaluation.bottlenecks.length * 0.1);
  const h1Inputs: number[] = [
    fbScore * weights.feedbackWeight,
    healthScore * weights.healthWeight,
    bottleneckPenalty,
    evaluation.urgentIssues.length === 0 ? 1 : 0.3,
  ];
  const hiddenLayer1: ActivationLayer = {
    name: 'feedback',
    inputs: h1Inputs,
    outputs: applyActivation(h1Inputs, 'relu'),
    activationFn: 'relu',
  };

  // HIDDEN LAYER 2 — reinforcement signals (sigmoid)
  const engBucket =
    rlState.engagementBucket === 'viral'
      ? 1
      : rlState.engagementBucket === 'high'
        ? 0.75
        : rlState.engagementBucket === 'medium'
          ? 0.5
          : 0.25;
  const growthBucket =
    rlState.growthBucket === 'viral'
      ? 1
      : rlState.growthBucket === 'growing'
        ? 0.75
        : rlState.growthBucket === 'stable'
          ? 0.5
          : 0.25;
  const h2Inputs: number[] = [
    engBucket * weights.reinforcementWeight,
    growthBucket * weights.reinforcementWeight,
    inputState.contextSignals.competitorGap,
    inputState.contextSignals.platformAlgorithmScore,
  ];
  const hiddenLayer2: ActivationLayer = {
    name: 'reinforcement',
    inputs: h2Inputs,
    outputs: applyActivation(h2Inputs, 'sigmoid'),
    activationFn: 'sigmoid',
  };

  // HIDDEN LAYER 3 — safety signals (sigmoid)
  const safeScore = safetyCheck.passed ? 1 : 0;
  const riskFactor =
    safetyCheck.riskLevel === 'safe'
      ? 1
      : safetyCheck.riskLevel === 'low'
        ? 0.9
        : safetyCheck.riskLevel === 'medium'
          ? 0.6
          : 0.2;
  const h3Inputs: number[] = [
    safeScore * weights.safetyWeight,
    riskFactor,
    safetyCheck.requiresHumanApproval ? 0.3 : 1,
    safetyCheck.reasons.length === 0 ? 1 : Math.max(0.2, 1 - safetyCheck.reasons.length * 0.2),
  ];
  const hiddenLayer3: ActivationLayer = {
    name: 'safety',
    inputs: h3Inputs,
    outputs: applyActivation(h3Inputs, 'sigmoid'),
    activationFn: 'sigmoid',
  };

  // OUTPUT LAYER — decisión final (softmax sobre acciones candidatas)
  const h1Mean = hiddenLayer1.outputs.reduce((a, b) => a + b, 0) / hiddenLayer1.outputs.length;
  const h2Mean = hiddenLayer2.outputs.reduce((a, b) => a + b, 0) / hiddenLayer2.outputs.length;
  const h3Mean = hiddenLayer3.outputs.reduce((a, b) => a + b, 0) / hiddenLayer3.outputs.length;

  const rawScore = Math.min(1, h1Mean + h2Mean + h3Mean * 0.5 + weights.outputBias);

  // Candidatos de acción basados en cuellos de botella
  const actionCandidates: RLAction[] = [];
  if (evaluation.bottlenecks.includes('engagement_rate'))
    actionCandidates.push('post-carousel-educational', 'post-reel-trending');
  if (evaluation.bottlenecks.includes('content_frequency')) actionCandidates.push('increase-frequency');
  if (evaluation.bottlenecks.includes('hashtag_effectiveness')) actionCandidates.push('rotate-hashtags');
  if (evaluation.bottlenecks.includes('posting_time_score')) actionCandidates.push('post-story-poll');
  if (evaluation.bottlenecks.includes('brand_coherence')) actionCandidates.push('post-static-quote');
  if (actionCandidates.length === 0) actionCandidates.push('post-carousel-educational');

  const outputScores = actionCandidates.map(() => rawScore + (Math.random() * 0.1 - 0.05));
  const outputProbs = softmax(outputScores);
  const bestIdx = outputProbs.indexOf(Math.max(...outputProbs));
  const selectedAction = actionCandidates[bestIdx] ?? 'post-carousel-educational';
  const confidence = outputProbs[bestIdx] ?? 0;

  const outputLayer: ActivationLayer = {
    name: 'output',
    inputs: outputScores,
    outputs: outputProbs,
    activationFn: 'softmax',
  };

  return {
    inputLayer,
    hiddenLayer1,
    hiddenLayer2,
    hiddenLayer3,
    outputLayer,
    rawScore,
    selectedAction,
    confidence,
  };
};

// ── Retropropagación simplificada ─────────────────────────────────────────────

const runBackprop = async (
  brandId: string,
  weights: NeuralWeights,
  rewardSignal: number,
  forwardPass: NeuralForwardPass,
): Promise<BackpropResult> => {
  const error = (forwardPass.rawScore - rewardSignal) ** 2;
  const grad = 2 * (forwardPass.rawScore - rewardSignal);
  const lr = weights.learningRate;

  const updated: NeuralWeights = {
    ...weights,
    feedbackWeight: Math.max(0.05, Math.min(0.9, weights.feedbackWeight - lr * grad * 0.35)),
    reinforcementWeight: Math.max(0.05, Math.min(0.9, weights.reinforcementWeight - lr * grad * 0.3)),
    safetyWeight: Math.max(0.05, Math.min(0.9, weights.safetyWeight - lr * grad * 0.2)),
    healthWeight: Math.max(0.05, Math.min(0.9, weights.healthWeight - lr * grad * 0.15)),
    outputBias: Math.max(-0.2, Math.min(0.2, weights.outputBias - lr * grad * 0.05)),
  };

  // Renormalizar pesos para que sumen 1
  const total = updated.feedbackWeight + updated.reinforcementWeight + updated.safetyWeight + updated.healthWeight;
  updated.feedbackWeight /= total;
  updated.reinforcementWeight /= total;
  updated.safetyWeight /= total;
  updated.healthWeight /= total;

  await saveWeights(brandId, updated);

  return { weightsBefore: weights, weightsAfter: updated, rewardSignal, error, updated: true };
};

// ── Justificación con Claude ──────────────────────────────────────────────────

const generateJustification = async (
  brand: BrandProfile,
  action: RLAction,
  confidence: number,
  evaluation: PerformanceEvaluation,
  inputState: NeuralInputState,
): Promise<string> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 300,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Eres el cerebro central de FeedIA. Justifica BREVEMENTE (2-3 oraciones) por qué se eligió la acción "${action}" para la marca "${brand.name}".

Contexto:
- Score global: ${evaluation.overallScore}/100
- Cuellos de botella: ${evaluation.bottlenecks.join(', ') || 'ninguno'}
- Engagement: ${(inputState.accountMetrics.engagementRate * 100).toFixed(1)}%
- Confianza de la red: ${(confidence * 100).toFixed(1)}%

Responde SOLO la justificación, sin intro ni cierre.`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  return textBlock?.text ?? `Acción ${action} seleccionada con ${(confidence * 100).toFixed(0)}% de confianza.`;
};

// ── API Pública ───────────────────────────────────────────────────────────────

/**
 * Ciclo autónomo completo:
 * Input → Feedback → RL → Safety → Forward Pass → Decision → Backprop → MLOps
 */
export const runAutonomousCycle = async (
  brand: BrandProfile,
  rawMetrics: RawMetricsInput,
  config: Partial<CoreConfig> = {},
): Promise<AutonomousCycleResult> => {
  const cfg: CoreConfig = {
    cycleIntervalMs: 4 * 60 * 60 * 1000,
    enableMLOps: true,
    enableBackprop: true,
    humanReviewEnabled: true,
    enableSkillIntegration: true,
    skillDryRun: false,
    maxSkillCostUsd: 2.0,
    ...config,
  };

  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const cycleId = `cycle-${Date.now()}`;
  log.info('[autonomyCore] cycle start', { brandId, cycleId });

  // ── 1. INPUT LAYER: construir estado neural ───────────────────────────────
  const inputState = buildNeuralInputState(brand, rawMetrics);

  // ── 2. HIDDEN LAYER 1: evaluación de feedback ─────────────────────────────
  const evaluation = await runFeedbackCycle(brand, inputState);
  const healthScore = computeHealthScore(evaluation);

  // Ciclo RL anterior para comparar
  const feedbackHistory = await getFeedbackHistory(brandId, 2);
  const previousEvaluation =
    feedbackHistory.length >= 2 ? (feedbackHistory[feedbackHistory.length - 2]?.evaluation ?? null) : null;

  // ── 3. HIDDEN LAYER 2: seleccionar acción candidata (RL) ──────────────────
  const rlState = approximateRLState(inputState);
  const { action: candidateAction } = await selectAction(brandId, rlState);

  // ── 4. SAFETY GATE: verificar acción candidata ────────────────────────────
  const safetyCheck = await checkActionSafety(brandId, candidateAction);

  const contingencyPlans = detectContingencyTriggers({
    reachDrop7d: inputState.accountMetrics.reachRate < 0.1 ? 0.8 : 0,
    engagementDrop7d: inputState.accountMetrics.engagementRate < 0.02 ? 0.6 : 0,
    negativeCommentRate: 0,
    rateLimitHit: !safetyCheck.passed && safetyCheck.reasons.some((r) => r.includes('Rate limit')),
    policyWarning: evaluation.overallScore < 30,
  });

  // ── 5. CARGAR PESOS y FORWARD PASS ───────────────────────────────────────
  const weights = await loadWeights(brandId);
  const forwardPass = runForwardPass(inputState, evaluation, rlState, safetyCheck, weights);

  // ── 6. DECISIÓN FINAL ─────────────────────────────────────────────────────
  const finalAction: RLAction = safetyCheck.passed ? forwardPass.selectedAction : 'pause-publishing';
  const justification = await generateJustification(brand, finalAction, forwardPass.confidence, evaluation, inputState);

  const decision: AutonomousDecision = {
    action: finalAction,
    confidence: forwardPass.confidence,
    justification,
    forwardPass,
    safetyCheck,
    approved: safetyCheck.passed,
    blockedReason: safetyCheck.passed ? undefined : safetyCheck.reasons[0],
  };

  // ── 7. RL: ejecutar episodio con recompensa real ──────────────────────────
  const rewardSignal = Math.min(
    1,
    Math.max(
      0,
      inputState.accountMetrics.engagementRate * 0.35 +
        inputState.accountMetrics.reachRate * 0.2 +
        inputState.accountMetrics.conversionRate * 0.15 +
        inputState.accountMetrics.brandCoherenceScore * 0.15 +
        (safetyCheck.passed ? 0.1 : 0) +
        (evaluation.bottlenecks.length === 0 ? 0.05 : 0),
    ),
  );

  await runRLEpisode(brand, evaluation, previousEvaluation);

  // Registrar en circuit breakers
  if (safetyCheck.passed) {
    await recordSuccess(brandId, 'content-publishing');
  } else {
    await recordFailure(brandId, 'content-publishing');
  }

  // ── 8. RETROPROPAGACIÓN ───────────────────────────────────────────────────
  const backprop = cfg.enableBackprop
    ? await runBackprop(brandId, weights, rewardSignal, forwardPass)
    : { weightsBefore: weights, weightsAfter: weights, rewardSignal, error: 0, updated: false };

  // ── 9. MLOps: ingestar datos + retrain si aplica ──────────────────────────
  let retraining: AutonomousCycleResult['retraining'] = { triggered: false, deployed: false };
  if (cfg.enableMLOps) {
    await ingestNeuralState(brandId, inputState);
    await ingestEvaluation(brandId, evaluation);

    const episodes = await getEpisodeHistory(brandId, 50);
    const policy = await getCurrentPolicy(brandId);
    const retrainCheck = await shouldRetrain(brandId, episodes, policy);

    if (retrainCheck.should) {
      log.info('[autonomyCore] MLOps retraining triggered', { brandId, reason: retrainCheck.reason });
      const retrainJob = await runRetrainingJob(brandId, 'scheduled', episodes, policy);
      if (retrainJob.status === 'completed') {
        const deployment = await deployPolicy(brandId, retrainJob, policy, 'auto');
        retraining = { triggered: true, deployed: deployment !== null };
      } else {
        retraining = { triggered: true, deployed: false };
      }
    }
  }

  // ── 10. Refinar política con Claude si health bajo ────────────────────────
  if (healthScore < 50 && evaluation.cycleNumber % 5 === 0) {
    const episodes = await getEpisodeHistory(brandId, 20);
    if (episodes.length >= 5) {
      log.info('[autonomyCore] refining RL policy with Claude', { brandId, healthScore });
      await refinePolicyWithClaude(brand, episodes);
    }
  }

  // ── 11. Evaluar si requiere revisión humana ───────────────────────────────
  const humanReviewRequired =
    cfg.humanReviewEnabled && (needsHumanReview(evaluation) || contingencyPlans.length > 0 || !safetyCheck.passed);

  // ── 12. SKILL INTEGRATION: invocar skills basadas en plan ──────────────────
  let integrationPlan: IntegrationPlan | undefined;
  let skillResults: SkillExecutionResult[] | undefined;
  if (cfg.enableSkillIntegration && !humanReviewRequired) {
    integrationPlan = buildIntegrationPlan(brand, inputState, evaluation, finalAction, cycleId);
    log.info('[autonomyCore] integration plan built', {
      brandId,
      skills: integrationPlan.selectedSkills.length,
      estCost: integrationPlan.totalEstimatedCost,
    });
    skillResults = await executeIntegrationPlan(integrationPlan, brand, {
      maxConcurrent: 3,
      maxTotalCost: cfg.maxSkillCostUsd,
      dryRun: cfg.skillDryRun,
    });
  }

  const result: AutonomousCycleResult = {
    brandId,
    cycleId,
    timestamp: new Date().toISOString(),
    inputState,
    evaluation,
    decision,
    backprop,
    retraining,
    contingencies: contingencyPlans.map((c) => c.id),
    humanReviewRequired,
    nextCycleMs: cfg.cycleIntervalMs,
    integrationPlan,
    skillResults,
  };

  const cycles = await loadCycles(brandId);
  await saveCycles(brandId, [...cycles, result]);

  log.info('[autonomyCore] cycle done', {
    brandId,
    cycleId,
    action: finalAction,
    score: evaluation.overallScore,
    reward: rewardSignal.toFixed(3),
    humanReviewRequired,
  });

  return result;
};

/** Último ciclo ejecutado sin correr uno nuevo. */
export const getLastCycle = async (brandId: string): Promise<AutonomousCycleResult | null> => {
  const cycles = await loadCycles(brandId);
  return cycles[cycles.length - 1] ?? null;
};

/** Historial de ciclos (máx. `limit`). */
export const getCycleHistory = async (brandId: string, limit = 20): Promise<AutonomousCycleResult[]> => {
  const cycles = await loadCycles(brandId);
  return cycles.slice(-limit);
};

/** Pesos actuales de la red. */
export const getCurrentWeights = async (brandId: string): Promise<NeuralWeights> => loadWeights(brandId);

/** Resetea pesos a valores por defecto. */
export const resetWeights = async (brandId: string): Promise<void> => {
  await saveWeights(brandId, { ...DEFAULT_WEIGHTS });
  log.info('[autonomyCore] weights reset to default', { brandId });
};

/** Estado completo del cerebro autónomo. */
export const getBrainStatus = async (
  brandId: string,
): Promise<{
  lastCycleAt: string | null;
  cyclesTotal: number;
  avgReward: number;
  weights: NeuralWeights;
  safetyReport: Awaited<ReturnType<typeof generateSafetyReport>>;
  pipelineStats: Awaited<ReturnType<typeof getDataPipelineStats>>;
}> => {
  const [cycles, weights, safetyReport, pipelineStats] = await Promise.all([
    loadCycles(brandId),
    loadWeights(brandId),
    generateSafetyReport(brandId),
    getDataPipelineStats(brandId),
  ]);

  const recentCycles = cycles.slice(-10);
  const avgReward =
    recentCycles.length > 0
      ? recentCycles.reduce((sum, c) => sum + c.backprop.rewardSignal, 0) / recentCycles.length
      : 0;

  return {
    lastCycleAt: cycles[cycles.length - 1]?.timestamp ?? null,
    cyclesTotal: cycles.length,
    avgReward,
    weights,
    safetyReport,
    pipelineStats,
  };
};
