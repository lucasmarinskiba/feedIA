/**
 * Emergent Behavior — orquestador autónomo de cascadas neuronales.
 *
 * Define condition→action rules que disparan combinaciones de skills
 * sin Anthropic calls (rápido, deterministic, sin costo).
 *
 * Cada rule:
 *   - condición sobre estado neural (métricas + contexto)
 *   - cascada de actions (skills a invocar en secuencia)
 *   - priority + cooldown
 *
 * Permite comportamientos emergentes complejos desde reglas simples.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const EMERGENT_DIR = path.resolve('data/neural/emergent-behavior');

export interface BehaviorRule {
  id: string;
  name: string;
  priority: number; // 0-100
  condition: BehaviorCondition;
  cascade: BehaviorAction[];
  cooldownMs: number;
  enabled: boolean;
  description: string;
}

export interface BehaviorCondition {
  type: 'metric-threshold' | 'metric-trend' | 'time-window' | 'event-pattern' | 'compound';
  metric?: string;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold?: number;
  trendDirection?: 'up' | 'down' | 'flat';
  trendStrength?: number;
  timeWindowSec?: number;
  events?: string[];
  subConditions?: BehaviorCondition[];
  combinator?: 'and' | 'or';
}

export interface BehaviorAction {
  step: number;
  type: 'invoke-skill' | 'set-flag' | 'emit-event' | 'wait' | 'notify' | 'log';
  target?: string;
  params?: Record<string, unknown>;
  delayMs?: number;
}

export interface BehaviorState {
  brandId: string;
  lastFiredAt: Record<string, string>; // ruleId → ISO timestamp
  firedCount: Record<string, number>;
  totalFirings: number;
  lastEvaluatedAt: string;
}

const DEFAULT_RULES: BehaviorRule[] = [
  {
    id: 'engagement-collapse-rescue',
    name: 'Engagement collapse rescue',
    priority: 95,
    enabled: true,
    description: 'Engagement cayó >40% en 24h — dispara cascada de rescate',
    cooldownMs: 6 * 60 * 60 * 1000,
    condition: {
      type: 'compound',
      combinator: 'and',
      subConditions: [
        { type: 'metric-threshold', metric: 'engagement_rate', operator: 'lt', threshold: 0.02 },
        { type: 'metric-trend', metric: 'engagement_rate', trendDirection: 'down', trendStrength: 0.4 },
      ],
    },
    cascade: [
      { step: 1, type: 'invoke-skill', target: 'feedIA-buyer-persona', params: { refresh: true } },
      { step: 2, type: 'invoke-skill', target: 'feedIA-quick-reel', params: { goal: 'engagement', urgency: 'high' } },
      { step: 3, type: 'invoke-skill', target: 'feedIA-broadcast-channels', params: { type: 'poll' } },
      {
        step: 4,
        type: 'notify',
        target: 'owner',
        params: { severity: 'high', message: 'Rescate de engagement disparado' },
      },
    ],
  },
  {
    id: 'viral-momentum-amplify',
    name: 'Viral momentum amplify',
    priority: 90,
    enabled: true,
    description: 'Post velocity >2x baseline — amplificar window',
    cooldownMs: 2 * 60 * 60 * 1000,
    condition: {
      type: 'metric-trend',
      metric: 'reach_velocity',
      trendDirection: 'up',
      trendStrength: 2.0,
    },
    cascade: [
      { step: 1, type: 'invoke-skill', target: 'feedIA-quick-story', params: { goal: 'amplify-viral' } },
      { step: 2, type: 'invoke-skill', target: 'feedIA-broadcast-channels', params: { type: 'cross-promo' } },
      { step: 3, type: 'set-flag', target: 'boost-ads-eligible', params: { value: true, ttlHours: 24 } },
      { step: 4, type: 'log', params: { event: 'viral-amplify-triggered' } },
    ],
  },
  {
    id: 'silence-breaker',
    name: 'Silence breaker',
    priority: 70,
    enabled: true,
    description: '>48h sin publicar — fuerza publicación auto',
    cooldownMs: 24 * 60 * 60 * 1000,
    condition: {
      type: 'time-window',
      timeWindowSec: 48 * 60 * 60,
    },
    cascade: [
      {
        step: 1,
        type: 'invoke-skill',
        target: 'feedIA-quick-carousel',
        params: { prompt: 'evergreen educativo', publish: true },
      },
      {
        step: 2,
        type: 'notify',
        target: 'owner',
        params: { severity: 'info', message: 'Publicación automática para mantener cadencia' },
      },
    ],
  },
  {
    id: 'crisis-comms-trigger',
    name: 'Crisis comms trigger',
    priority: 100,
    enabled: true,
    description: 'Sentiment hostil >15% — activa crisis protocol',
    cooldownMs: 4 * 60 * 60 * 1000,
    condition: {
      type: 'metric-threshold',
      metric: 'hostile_comment_ratio',
      operator: 'gt',
      threshold: 0.15,
    },
    cascade: [
      { step: 1, type: 'invoke-skill', target: 'feedIA-crisis', params: { severity: 'high' } },
      { step: 2, type: 'set-flag', target: 'pause-auto-publish', params: { value: true } },
      {
        step: 3,
        type: 'notify',
        target: 'owner',
        params: { severity: 'critical', message: 'CRISIS — protocolo activado' },
      },
    ],
  },
  {
    id: 'trend-window-rider',
    name: 'Trend window rider',
    priority: 85,
    enabled: true,
    description: 'Trend con velocity >0.7 + applicability >0.7 — montar inmediato',
    cooldownMs: 12 * 60 * 60 * 1000,
    condition: {
      type: 'event-pattern',
      events: ['trend-opportunity-detected'],
    },
    cascade: [
      { step: 1, type: 'invoke-skill', target: 'feedIA-quick-reel', params: { style: 'trending', urgency: 'high' } },
      { step: 2, type: 'invoke-skill', target: 'feedIA-quick-story', params: { type: 'teaser' } },
    ],
  },
  {
    id: 'competitor-counter',
    name: 'Competitor counter-move',
    priority: 75,
    enabled: true,
    description: 'Competidor lanzó viral — counter-content',
    cooldownMs: 6 * 60 * 60 * 1000,
    condition: {
      type: 'event-pattern',
      events: ['competitor-viral-detected'],
    },
    cascade: [
      { step: 1, type: 'invoke-skill', target: 'feedIA-competitor-profiling', params: { deep: true } },
      { step: 2, type: 'invoke-skill', target: 'feedIA-quick-reel', params: { goal: 'differentiation' } },
    ],
  },
];

interface RuntimeContext {
  brandId: string;
  metrics: Record<string, number>;
  trends: Record<string, { direction: 'up' | 'down' | 'flat'; strength: number }>;
  events: string[];
  hoursSinceLastPost: number;
}

const evaluateCondition = (cond: BehaviorCondition, ctx: RuntimeContext): boolean => {
  switch (cond.type) {
    case 'metric-threshold': {
      const value = ctx.metrics[cond.metric ?? ''];
      if (value === undefined || cond.threshold === undefined) return false;
      switch (cond.operator) {
        case 'gt':
          return value > cond.threshold;
        case 'lt':
          return value < cond.threshold;
        case 'eq':
          return value === cond.threshold;
        case 'gte':
          return value >= cond.threshold;
        case 'lte':
          return value <= cond.threshold;
        default:
          return false;
      }
    }
    case 'metric-trend': {
      const trend = ctx.trends[cond.metric ?? ''];
      if (!trend) return false;
      if (cond.trendDirection && trend.direction !== cond.trendDirection) return false;
      if (cond.trendStrength !== undefined && trend.strength < cond.trendStrength) return false;
      return true;
    }
    case 'time-window':
      return cond.timeWindowSec !== undefined && ctx.hoursSinceLastPost * 3600 >= cond.timeWindowSec;
    case 'event-pattern':
      return (cond.events ?? []).every((e) => ctx.events.includes(e));
    case 'compound': {
      const subs = cond.subConditions ?? [];
      if (cond.combinator === 'or') return subs.some((s) => evaluateCondition(s, ctx));
      return subs.every((s) => evaluateCondition(s, ctx));
    }
    default:
      return false;
  }
};

const statePath = (brandId: string): string => path.join(EMERGENT_DIR, `${brandId}-state.json`);

const loadState = async (brandId: string): Promise<BehaviorState> => {
  try {
    return JSON.parse(await fs.readFile(statePath(brandId), 'utf-8')) as BehaviorState;
  } catch {
    return { brandId, lastFiredAt: {}, firedCount: {}, totalFirings: 0, lastEvaluatedAt: new Date().toISOString() };
  }
};

const saveState = async (state: BehaviorState): Promise<void> => {
  await fs.mkdir(EMERGENT_DIR, { recursive: true });
  await fs.writeFile(statePath(state.brandId), JSON.stringify(state, null, 2), 'utf-8');
};

const inCooldown = (state: BehaviorState, rule: BehaviorRule): boolean => {
  const last = state.lastFiredAt[rule.id];
  if (!last) return false;
  return Date.now() - new Date(last).getTime() < rule.cooldownMs;
};

export interface FiredCascade {
  ruleId: string;
  ruleName: string;
  firedAt: string;
  actions: BehaviorAction[];
  priority: number;
}

export const evaluateAndFire = async (
  brandId: string,
  ctx: Omit<RuntimeContext, 'brandId'>,
  customRules: BehaviorRule[] = [],
): Promise<FiredCascade[]> => {
  const state = await loadState(brandId);
  const rules = [...DEFAULT_RULES, ...customRules].filter((r) => r.enabled).sort((a, b) => b.priority - a.priority);
  const runtimeCtx: RuntimeContext = { brandId, ...ctx };
  const fired: FiredCascade[] = [];

  for (const rule of rules) {
    if (inCooldown(state, rule)) continue;
    if (!evaluateCondition(rule.condition, runtimeCtx)) continue;

    fired.push({
      ruleId: rule.id,
      ruleName: rule.name,
      firedAt: new Date().toISOString(),
      actions: rule.cascade,
      priority: rule.priority,
    });
    state.lastFiredAt[rule.id] = new Date().toISOString();
    state.firedCount[rule.id] = (state.firedCount[rule.id] ?? 0) + 1;
    state.totalFirings++;
  }

  state.lastEvaluatedAt = new Date().toISOString();
  await saveState(state);

  if (fired.length > 0) {
    log.info('[emergentBehavior] fired', { brandId, count: fired.length, rules: fired.map((f) => f.ruleId) });
  }
  return fired;
};

export const getBehaviorState = (brandId: string): Promise<BehaviorState> => loadState(brandId);

export const getDefaultRules = (): BehaviorRule[] => [...DEFAULT_RULES];

export const upsertCustomRule = async (brandId: string, rule: BehaviorRule): Promise<void> => {
  const file = path.join(EMERGENT_DIR, `${brandId}-rules.json`);
  let rules: BehaviorRule[] = [];
  try {
    rules = JSON.parse(await fs.readFile(file, 'utf-8')) as BehaviorRule[];
  } catch {
    /* noop */
  }
  const idx = rules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) rules[idx] = rule;
  else rules.push(rule);
  await fs.mkdir(EMERGENT_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(rules, null, 2), 'utf-8');
  log.info('[emergentBehavior] rule upserted', { brandId, ruleId: rule.id });
};

export const getCustomRules = async (brandId: string): Promise<BehaviorRule[]> => {
  try {
    return JSON.parse(await fs.readFile(path.join(EMERGENT_DIR, `${brandId}-rules.json`), 'utf-8')) as BehaviorRule[];
  } catch {
    return [];
  }
};
