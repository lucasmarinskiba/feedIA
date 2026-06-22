// @ts-nocheck
/**
 * Reinforcement Engine — Aprendizaje por Refuerzo para FeedIA.
 *
 * Función de recompensa multi-objetivo, exploración autónoma epsilon-greedy,
 * Q-learning simplificado y optimización de políticas de publicación.
 * El agente aprende qué acciones maximizan el engagement/alcance/conversión
 * a través de la experiencia acumulada.
 *
 * Arquitectura: HIDDEN LAYER de aprendizaje autónomo.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import type { PerformanceEvaluation } from './feedbackLoop.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const RL_DIR = path.resolve('data/neural/rl');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type RLAction =
  | 'post-carousel-educational'
  | 'post-carousel-entertainment'
  | 'post-reel-trending'
  | 'post-reel-tutorial'
  | 'post-story-poll'
  | 'post-story-behind-scenes'
  | 'post-static-quote'
  | 'post-static-product'
  | 'engage-reply-comments'
  | 'engage-dm-followup'
  | 'update-bio-cta'
  | 'rotate-hashtags'
  | 'run-ab-test-caption'
  | 'boost-post-ads'
  | 'collab-proposal'
  | 'pause-publishing'
  | 'increase-frequency'
  | 'decrease-frequency';

export interface RLState {
  /** Estado discretizado del sistema (representación compacta) */
  engagementBucket: 'low' | 'medium' | 'high' | 'viral';
  growthBucket: 'declining' | 'stable' | 'growing' | 'viral';
  frequencyBucket: 'under' | 'optimal' | 'over';
  dayOfWeek: number; // 0–6
  hourBucket: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  contentMixBias: 'video' | 'carousel' | 'static' | 'mixed';
  brandCoherenceBucket: 'low' | 'medium' | 'high';
}

export interface RewardSignal {
  /** Componentes individuales de recompensa (-1 a 1) */
  engagementReward: number;
  reachReward: number;
  conversionReward: number;
  brandCoherenceReward: number;
  safetyReward: number; // penaliza acciones riesgosas
  noveltyReward: number; // bonus por exploración
  /** Recompensa total ponderada */
  total: number;
  /** Descomposición para logging */
  breakdown: Record<string, number>;
}

export interface QEntry {
  state: string; // hash del RLState
  action: RLAction;
  qValue: number;
  visits: number;
  lastUpdated: string;
}

export interface RLPolicy {
  brandId: string;
  version: number;
  epsilon: number; // exploración (0=greedy, 1=random) — decrece con tiempo
  learningRate: number; // alpha
  discountFactor: number; // gamma
  qTable: QEntry[];
  totalEpisodes: number;
  totalReward: number;
  bestAction: RLAction;
  bestActionQValue: number;
  updatedAt: string;
}

export interface RLEpisode {
  id: string;
  brandId: string;
  state: RLState;
  actionTaken: RLAction;
  reward: RewardSignal;
  nextState: RLState | null;
  explorationMode: boolean;
  timestamp: string;
}

// ── Reward weights ─────────────────────────────────────────────────────────────

const REWARD_WEIGHTS = {
  engagement: 0.35,
  reach: 0.2,
  conversion: 0.15,
  brandCoherence: 0.15,
  safety: 0.1,
  novelty: 0.05,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureRLDir = async (): Promise<void> => {
  await fs.mkdir(RL_DIR, { recursive: true });
};

const policyPath = (brandId: string): string => path.join(RL_DIR, `${brandId}-policy.json`);

const episodesPath = (brandId: string): string => path.join(RL_DIR, `${brandId}-episodes.json`);

const stateHash = (state: RLState): string =>
  `${state.engagementBucket}|${state.growthBucket}|${state.frequencyBucket}|${state.dayOfWeek}|${state.hourBucket}|${state.contentMixBias}|${state.brandCoherenceBucket}`;

const discretizeState = (evaluation: PerformanceEvaluation): RLState => {
  const eng = evaluation.metrics.find((m) => m.metric === 'engagement_rate')?.normalizedValue ?? 0.5;
  const growth = evaluation.metrics.find((m) => m.metric === 'follower_growth')?.normalizedValue ?? 0.5;
  const freq = evaluation.metrics.find((m) => m.metric === 'content_frequency')?.normalizedValue ?? 0.5;
  const coherence = evaluation.metrics.find((m) => m.metric === 'brand_coherence')?.normalizedValue ?? 0.5;

  const now = new Date();
  const hour = now.getHours();

  return {
    engagementBucket: eng < 0.25 ? 'low' : eng < 0.5 ? 'medium' : eng < 0.75 ? 'high' : 'viral',
    growthBucket: growth < 0.2 ? 'declining' : growth < 0.5 ? 'stable' : growth < 0.8 ? 'growing' : 'viral',
    frequencyBucket: freq < 0.35 ? 'under' : freq < 0.75 ? 'optimal' : 'over',
    dayOfWeek: now.getDay(),
    hourBucket: hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 15 ? 'midday' : hour < 19 ? 'afternoon' : 'evening',
    contentMixBias: 'mixed', // se ajusta con historial
    brandCoherenceBucket: coherence < 0.4 ? 'low' : coherence < 0.7 ? 'medium' : 'high',
  };
};

// ── Función de recompensa ─────────────────────────────────────────────────────

export const computeReward = (
  before: PerformanceEvaluation,
  after: PerformanceEvaluation,
  action: RLAction,
): RewardSignal => {
  const getMetric = (eval_: PerformanceEvaluation, name: string): number =>
    eval_.metrics.find((m) => m.metric === name)?.normalizedValue ?? 0.5;

  // Delta normalizado por métrica (-1 a 1)
  const engDelta = getMetric(after, 'engagement_rate') - getMetric(before, 'engagement_rate');
  const reachDelta = getMetric(after, 'reach_rate') - getMetric(before, 'reach_rate');
  const convDelta = getMetric(after, 'conversion_rate') - getMetric(before, 'conversion_rate');
  const brandDelta = getMetric(after, 'brand_coherence') - getMetric(before, 'brand_coherence');

  // Safety penalty: acciones riesgosas reciben penalización
  const riskyActions: RLAction[] = ['boost-post-ads', 'pause-publishing', 'decrease-frequency'];
  const safetyReward = riskyActions.includes(action) ? (after.overallScore > before.overallScore ? 0.2 : -0.3) : 0.1;

  // Novelty bonus: exploración de acciones poco frecuentes
  const noveltyReward = 0.05; // pequeño bonus constante por explorar

  const clamp = (v: number): number => Math.max(-1, Math.min(1, v * 3));

  const engagementReward = clamp(engDelta);
  const reachReward = clamp(reachDelta);
  const conversionReward = clamp(convDelta);
  const brandCoherenceReward = clamp(brandDelta);

  const total =
    engagementReward * REWARD_WEIGHTS.engagement +
    reachReward * REWARD_WEIGHTS.reach +
    conversionReward * REWARD_WEIGHTS.conversion +
    brandCoherenceReward * REWARD_WEIGHTS.brandCoherence +
    safetyReward * REWARD_WEIGHTS.safety +
    noveltyReward * REWARD_WEIGHTS.novelty;

  return {
    engagementReward,
    reachReward,
    conversionReward,
    brandCoherenceReward,
    safetyReward,
    noveltyReward,
    total: Math.max(-1, Math.min(1, total)),
    breakdown: { engDelta, reachDelta, convDelta, brandDelta },
  };
};

// ── Q-Learning ────────────────────────────────────────────────────────────────

const loadPolicy = async (brandId: string): Promise<RLPolicy> => {
  try {
    return JSON.parse(await fs.readFile(policyPath(brandId), 'utf-8')) as RLPolicy;
  } catch {
    // Política inicial con exploración alta
    return {
      brandId,
      version: 1,
      epsilon: 0.9,
      learningRate: 0.1,
      discountFactor: 0.85,
      qTable: [],
      totalEpisodes: 0,
      totalReward: 0,
      bestAction: 'post-carousel-educational',
      bestActionQValue: 0,
      updatedAt: new Date().toISOString(),
    };
  }
};

const savePolicy = async (policy: RLPolicy): Promise<void> => {
  await ensureRLDir();
  await fs.writeFile(policyPath(policy.brandId), JSON.stringify(policy, null, 2), 'utf-8');
};

const getQValue = (policy: RLPolicy, stateHash_: string, action: RLAction): number =>
  policy.qTable.find((e) => e.state === stateHash_ && e.action === action)?.qValue ?? 0;

const updateQValue = (policy: RLPolicy, stateHash_: string, action: RLAction, newQ: number): void => {
  const existing = policy.qTable.find((e) => e.state === stateHash_ && e.action === action);
  if (existing) {
    existing.qValue = newQ;
    existing.visits++;
    existing.lastUpdated = new Date().toISOString();
  } else {
    policy.qTable.push({
      state: stateHash_,
      action,
      qValue: newQ,
      visits: 1,
      lastUpdated: new Date().toISOString(),
    });
  }
};

const ALL_ACTIONS: RLAction[] = [
  'post-carousel-educational',
  'post-carousel-entertainment',
  'post-reel-trending',
  'post-reel-tutorial',
  'post-story-poll',
  'post-story-behind-scenes',
  'post-static-quote',
  'post-static-product',
  'engage-reply-comments',
  'engage-dm-followup',
  'rotate-hashtags',
  'run-ab-test-caption',
  'increase-frequency',
  'decrease-frequency',
  'update-bio-cta',
  'collab-proposal',
];

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Selecciona la próxima acción según política epsilon-greedy.
 * - Con probabilidad epsilon: exploración aleatoria
 * - Con probabilidad 1-epsilon: explotación del mejor Q conocido
 */
export const selectAction = async (
  brandId: string,
  state: RLState,
): Promise<{ action: RLAction; explorationMode: boolean }> => {
  const policy = await loadPolicy(brandId);
  const hash = stateHash(state);

  const explore = Math.random() < policy.epsilon;
  if (explore) {
    const action = ALL_ACTIONS[Math.floor(Math.random() * ALL_ACTIONS.length)]!;
    log.info('[RL] exploración', { action, epsilon: policy.epsilon });
    return { action, explorationMode: true };
  }

  // Greedy: máximo Q conocido
  const qValues = ALL_ACTIONS.map((a) => ({ action: a, q: getQValue(policy, hash, a) }));
  const best = qValues.sort((a, b) => b.q - a.q)[0]!;
  log.info('[RL] explotación', { action: best.action, q: best.q });
  return { action: best.action, explorationMode: false };
};

/**
 * Actualiza la política Q-table con la experiencia del episodio.
 * Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]
 */
export const updatePolicy = async (
  brandId: string,
  state: RLState,
  action: RLAction,
  reward: RewardSignal,
  nextState: RLState | null,
): Promise<RLPolicy> => {
  const policy = await loadPolicy(brandId);
  const hash = stateHash(state);
  const nextHash = nextState ? stateHash(nextState) : null;

  const currentQ = getQValue(policy, hash, action);

  // Max Q del siguiente estado
  const maxNextQ = nextHash ? Math.max(...ALL_ACTIONS.map((a) => getQValue(policy, nextHash, a))) : 0;

  // Bellman update
  const newQ = currentQ + policy.learningRate * (reward.total + policy.discountFactor * maxNextQ - currentQ);

  updateQValue(policy, hash, action, newQ);

  policy.totalEpisodes++;
  policy.totalReward += reward.total;

  // Epsilon decay: reducir exploración con experiencia (mínimo 0.1)
  policy.epsilon = Math.max(0.1, policy.epsilon * 0.995);

  // Mejor acción global conocida
  const allQs = policy.qTable.sort((a, b) => b.qValue - a.qValue);
  if (allQs[0]) {
    policy.bestAction = allQs[0].action;
    policy.bestActionQValue = allQs[0].qValue;
  }

  policy.version++;
  policy.updatedAt = new Date().toISOString();

  await savePolicy(policy);
  log.info('[RL] policy updated', {
    brandId,
    action,
    reward: reward.total.toFixed(3),
    newQ: newQ.toFixed(3),
    epsilon: policy.epsilon.toFixed(3),
  });

  return policy;
};

/** Corre un episodio completo de RL usando Claude para resolver ambigüedades. */
export const runRLEpisode = async (
  brand: BrandProfile,
  evaluation: PerformanceEvaluation,
  previousEvaluation: PerformanceEvaluation | null,
): Promise<RLEpisode> => {
  const brandId = evaluation.brandId;
  const state = discretizeState(evaluation);
  const { action, explorationMode } = await selectAction(brandId, state);

  let reward: RewardSignal;
  if (previousEvaluation) {
    reward = computeReward(previousEvaluation, evaluation, action);
  } else {
    // Primer episodio: recompensa basada en score absoluto
    const baseScore = (evaluation.overallScore / 100) * 2 - 1;
    reward = {
      engagementReward: baseScore,
      reachReward: baseScore * 0.8,
      conversionReward: baseScore * 0.6,
      brandCoherenceReward: baseScore,
      safetyReward: 0.1,
      noveltyReward: 0.05,
      total: baseScore * 0.7,
      breakdown: {},
    };
  }

  await updatePolicy(brandId, state, action, reward, state);

  const episode: RLEpisode = {
    id: `ep-${Date.now()}`,
    brandId,
    state,
    actionTaken: action,
    reward,
    nextState: state,
    explorationMode,
    timestamp: new Date().toISOString(),
  };

  // Persistir episodio
  await ensureRLDir();
  const epFile = episodesPath(brandId);
  let episodes: RLEpisode[] = [];
  try {
    episodes = JSON.parse(await fs.readFile(epFile, 'utf-8')) as RLEpisode[];
  } catch {
    /* noop */
  }
  episodes.push(episode);
  await fs.writeFile(epFile, JSON.stringify(episodes.slice(-200), null, 2), 'utf-8');

  return episode;
};

/** Usa Claude para refinar la política cuando hay datos ambiguos. */
export const refinePolicyWithClaude = async (brand: BrandProfile, recentEpisodes: RLEpisode[]): Promise<string[]> => {
  if (recentEpisodes.length < 5) return ['Insuficientes episodios para refinamiento'];

  const avgReward = recentEpisodes.reduce((s, e) => s + e.reward.total, 0) / recentEpisodes.length;
  const topActions = recentEpisodes
    .sort((a, b) => b.reward.total - a.reward.total)
    .slice(0, 3)
    .map((e) => `${e.actionTaken} (recompensa: ${e.reward.total.toFixed(2)})`);

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 800,
    thinking: { type: 'adaptive' },
    system: `Analista de estrategia Instagram con expertise en RL aplicado a redes sociales.
Interpretas datos de experiencia de un agente IA y sugerís ajustes de política.
Devuelve lista de recomendaciones concretas como array JSON de strings.`,
    messages: [
      {
        role: 'user',
        content: `Marca: ${brand.name} | Industria: ${brand.industryCategory ?? 'general'}
Episodios recientes: ${recentEpisodes.length}
Recompensa promedio: ${avgReward.toFixed(3)}
Top acciones: ${topActions.join(', ')}
Acciones con recompensa negativa: ${recentEpisodes
          .filter((e) => e.reward.total < 0)
          .map((e) => e.actionTaken)
          .join(', ')}

Sugiere 3–5 ajustes específicos de política para mejorar la estrategia.
Devuelve: ["Ajuste 1", "Ajuste 2", ...]`,
      },
    ],
  });

  const response = await stream.finalMessage();
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [`Recompensa promedio actual: ${avgReward.toFixed(3)}`];

  try {
    return JSON.parse(match[0]) as string[];
  } catch {
    return [`Error parsing recommendations. Avg reward: ${avgReward.toFixed(3)}`];
  }
};

/** Retorna la política actual sin modificarla. */
export const getCurrentPolicy = async (brandId: string): Promise<RLPolicy> => loadPolicy(brandId);

/** Retorna el historial de episodios. */
export const getEpisodeHistory = async (brandId: string, limit = 20): Promise<RLEpisode[]> => {
  try {
    const episodes = JSON.parse(await fs.readFile(episodesPath(brandId), 'utf-8')) as RLEpisode[];
    return episodes.slice(-limit);
  } catch {
    return [];
  }
};
