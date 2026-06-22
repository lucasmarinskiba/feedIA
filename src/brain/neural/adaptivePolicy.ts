/**
 * Adaptive Policy — RL meta-learning local (sin Anthropic).
 *
 * Mantiene Q-table por (state, action) y actualiza con Bellman:
 *   Q(s,a) ← Q(s,a) + α·(reward + γ·max(Q(s',a')) - Q(s,a))
 *
 * State discretizado:
 *   - engagement_bucket (low | mid | high)
 *   - growth_bucket
 *   - day_of_week
 *   - hour_window (early | day | evening | night)
 *
 * Actions:
 *   - 18 acciones predefinidas (post-carousel, post-reel, etc)
 *
 * Epsilon-greedy con decay. Persiste a disco.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const POLICY_DIR = path.resolve('data/neural/adaptive-policy');

export type EngagementBucket = 'low' | 'mid' | 'high';
export type GrowthBucket = 'declining' | 'stable' | 'growing' | 'viral';
export type HourWindow = 'early' | 'day' | 'evening' | 'night';

export type RLActionId =
  | 'post-carousel-edu'
  | 'post-carousel-entertain'
  | 'post-carousel-sales'
  | 'post-reel-tutorial'
  | 'post-reel-trending'
  | 'post-reel-transformation'
  | 'post-story-poll'
  | 'post-story-quiz'
  | 'post-story-bts'
  | 'engage-reply-comments'
  | 'engage-dm-followup'
  | 'collab-outreach'
  | 'boost-ads-low'
  | 'boost-ads-mid'
  | 'boost-ads-high'
  | 'rotate-hashtags'
  | 'update-bio'
  | 'pause-publishing';

export interface DiscreteState {
  engagementBucket: EngagementBucket;
  growthBucket: GrowthBucket;
  dayOfWeek: number; // 0-6
  hourWindow: HourWindow;
}

export interface QEntry {
  stateKey: string;
  action: RLActionId;
  qValue: number;
  visits: number;
  lastUpdated: string;
}

export interface PolicyState {
  brandId: string;
  qTable: QEntry[];
  epsilon: number;
  learningRate: number;
  discountFactor: number;
  totalEpisodes: number;
  totalReward: number;
  episodes: PolicyEpisode[]; // últimos 200
  bestAction: { stateKey: string; action: RLActionId; qValue: number } | null;
}

export interface PolicyEpisode {
  episode: number;
  state: DiscreteState;
  action: RLActionId;
  reward: number;
  explored: boolean;
  qBefore: number;
  qAfter: number;
  timestamp: string;
}

const DEFAULT_EPSILON = 0.2;
const DEFAULT_LEARNING_RATE = 0.15;
const DEFAULT_DISCOUNT = 0.9;
const EPSILON_DECAY = 0.995;
const EPSILON_MIN = 0.05;

const ALL_ACTIONS: RLActionId[] = [
  'post-carousel-edu',
  'post-carousel-entertain',
  'post-carousel-sales',
  'post-reel-tutorial',
  'post-reel-trending',
  'post-reel-transformation',
  'post-story-poll',
  'post-story-quiz',
  'post-story-bts',
  'engage-reply-comments',
  'engage-dm-followup',
  'collab-outreach',
  'boost-ads-low',
  'boost-ads-mid',
  'boost-ads-high',
  'rotate-hashtags',
  'update-bio',
  'pause-publishing',
];

const stateKey = (s: DiscreteState): string => `${s.engagementBucket}|${s.growthBucket}|${s.dayOfWeek}|${s.hourWindow}`;

const discretize = (metrics: { engagement: number; growth: number }, now = new Date()): DiscreteState => {
  const e = metrics.engagement;
  const g = metrics.growth;
  const hour = now.getHours();
  return {
    engagementBucket: e < 0.02 ? 'low' : e < 0.05 ? 'mid' : 'high',
    growthBucket: g < -0.01 ? 'declining' : g < 0.01 ? 'stable' : g < 0.05 ? 'growing' : 'viral',
    dayOfWeek: now.getDay(),
    hourWindow: hour < 6 ? 'night' : hour < 12 ? 'early' : hour < 18 ? 'day' : 'evening',
  };
};

const policyPath = (brandId: string): string => path.join(POLICY_DIR, `${brandId}-policy.json`);

const loadPolicy = async (brandId: string): Promise<PolicyState> => {
  try {
    return JSON.parse(await fs.readFile(policyPath(brandId), 'utf-8')) as PolicyState;
  } catch {
    return {
      brandId,
      qTable: [],
      epsilon: DEFAULT_EPSILON,
      learningRate: DEFAULT_LEARNING_RATE,
      discountFactor: DEFAULT_DISCOUNT,
      totalEpisodes: 0,
      totalReward: 0,
      episodes: [],
      bestAction: null,
    };
  }
};

const savePolicy = async (state: PolicyState): Promise<void> => {
  await fs.mkdir(POLICY_DIR, { recursive: true });
  state.episodes = state.episodes.slice(-200);
  await fs.writeFile(policyPath(state.brandId), JSON.stringify(state, null, 2), 'utf-8');
};

const getQ = (state: PolicyState, sKey: string, action: RLActionId): number => {
  const entry = state.qTable.find((q) => q.stateKey === sKey && q.action === action);
  return entry?.qValue ?? 0;
};

const setQ = (state: PolicyState, sKey: string, action: RLActionId, value: number): void => {
  const entry = state.qTable.find((q) => q.stateKey === sKey && q.action === action);
  if (entry) {
    entry.qValue = value;
    entry.visits++;
    entry.lastUpdated = new Date().toISOString();
  } else {
    state.qTable.push({ stateKey: sKey, action, qValue: value, visits: 1, lastUpdated: new Date().toISOString() });
  }
};

const maxQForState = (state: PolicyState, sKey: string): number => {
  let max = 0;
  for (const a of ALL_ACTIONS) {
    const q = getQ(state, sKey, a);
    if (q > max) max = q;
  }
  return max;
};

export const selectAction = async (
  brandId: string,
  metrics: { engagement: number; growth: number },
): Promise<{ action: RLActionId; explored: boolean; state: DiscreteState; qValue: number }> => {
  const state = await loadPolicy(brandId);
  const discreteState = discretize(metrics);
  const sKey = stateKey(discreteState);

  if (Math.random() < state.epsilon) {
    const action = ALL_ACTIONS[Math.floor(Math.random() * ALL_ACTIONS.length)]!;
    return { action, explored: true, state: discreteState, qValue: getQ(state, sKey, action) };
  }

  let best: { action: RLActionId; q: number } | null = null;
  for (const a of ALL_ACTIONS) {
    const q = getQ(state, sKey, a);
    if (!best || q > best.q) best = { action: a, q };
  }
  return {
    action: best?.action ?? ALL_ACTIONS[0]!,
    explored: false,
    state: discreteState,
    qValue: best?.q ?? 0,
  };
};

export const recordOutcome = async (
  brandId: string,
  state: DiscreteState,
  action: RLActionId,
  reward: number,
  nextMetrics?: { engagement: number; growth: number },
): Promise<PolicyEpisode> => {
  const policy = await loadPolicy(brandId);
  const sKey = stateKey(state);
  const qBefore = getQ(policy, sKey, action);

  const nextSKey = nextMetrics ? stateKey(discretize(nextMetrics)) : sKey;
  const maxNextQ = maxQForState(policy, nextSKey);
  const tdTarget = reward + policy.discountFactor * maxNextQ;
  const qAfter = qBefore + policy.learningRate * (tdTarget - qBefore);
  setQ(policy, sKey, action, qAfter);

  policy.epsilon = Math.max(EPSILON_MIN, policy.epsilon * EPSILON_DECAY);
  policy.totalEpisodes++;
  policy.totalReward += reward;

  const episode: PolicyEpisode = {
    episode: policy.totalEpisodes,
    state,
    action,
    reward,
    explored: Math.random() < policy.epsilon,
    qBefore,
    qAfter,
    timestamp: new Date().toISOString(),
  };
  policy.episodes.push(episode);

  let best: PolicyState['bestAction'] = null;
  for (const q of policy.qTable) {
    if (!best || q.qValue > best.qValue) best = { stateKey: q.stateKey, action: q.action, qValue: q.qValue };
  }
  policy.bestAction = best;

  await savePolicy(policy);
  log.info('[adaptivePolicy] updated', { brandId, action, qBefore: qBefore.toFixed(3), qAfter: qAfter.toFixed(3) });
  return episode;
};

export const getPolicyStats = async (
  brandId: string,
): Promise<{
  totalEpisodes: number;
  totalReward: number;
  avgRewardLast50: number;
  epsilon: number;
  qTableSize: number;
  uniqueStates: number;
  bestAction: PolicyState['bestAction'];
  topQEntries: Array<Pick<QEntry, 'stateKey' | 'action' | 'qValue' | 'visits'>>;
}> => {
  const policy = await loadPolicy(brandId);
  const last50 = policy.episodes.slice(-50);
  const avgRecent = last50.length > 0 ? last50.reduce((s, e) => s + e.reward, 0) / last50.length : 0;
  const uniqueStates = new Set(policy.qTable.map((q) => q.stateKey)).size;
  const topQ = [...policy.qTable].sort((a, b) => b.qValue - a.qValue).slice(0, 10);

  return {
    totalEpisodes: policy.totalEpisodes,
    totalReward: policy.totalReward,
    avgRewardLast50: avgRecent,
    epsilon: policy.epsilon,
    qTableSize: policy.qTable.length,
    uniqueStates,
    bestAction: policy.bestAction,
    topQEntries: topQ.map(({ stateKey: s, action, qValue, visits }) => ({ stateKey: s, action, qValue, visits })),
  };
};

export const resetPolicy = async (brandId: string): Promise<void> => {
  const empty: PolicyState = {
    brandId,
    qTable: [],
    epsilon: DEFAULT_EPSILON,
    learningRate: DEFAULT_LEARNING_RATE,
    discountFactor: DEFAULT_DISCOUNT,
    totalEpisodes: 0,
    totalReward: 0,
    episodes: [],
    bestAction: null,
  };
  await savePolicy(empty);
  log.info('[adaptivePolicy] reset', { brandId });
};

export const recommendBestForCurrentState = async (
  brandId: string,
  metrics: { engagement: number; growth: number },
): Promise<{
  recommended: RLActionId;
  confidence: number;
  alternatives: Array<{ action: RLActionId; qValue: number }>;
}> => {
  const policy = await loadPolicy(brandId);
  const sKey = stateKey(discretize(metrics));
  const ranked = ALL_ACTIONS.map((a) => ({ action: a, qValue: getQ(policy, sKey, a) })).sort(
    (a, b) => b.qValue - a.qValue,
  );
  const top = ranked[0]!;
  const second = ranked[1]?.qValue ?? 0;
  const confidence = top.qValue > 0 ? Math.min(1, (top.qValue - second) / Math.max(0.01, Math.abs(top.qValue))) : 0;
  return { recommended: top.action, confidence, alternatives: ranked.slice(1, 5) };
};
