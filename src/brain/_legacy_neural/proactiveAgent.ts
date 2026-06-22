// @ts-nocheck
/**
 * Proactive Agent — iniciativa autónoma.
 *
 * Observa estado del sistema cada N segundos y dispara acciones sin esperar input.
 * Distinto a autonomyCore: este NO espera ser invocado, vigila + actúa.
 *
 * Triggers proactivos:
 *   - Métrica cae > X% → genera Reel reactivo
 *   - Trend nuevo emergente + alta applicability → produce contenido aprovechando
 *   - Sentiment shift negativo → activate crisis comms
 *   - Quota mes <50% pero a la mitad del mes → boost cadencia
 *   - Cuenta sin posts 48h → genera + publica auto
 *   - Comentario hostile detected → escalation
 *   - Competidor lanza viral → análisis + counter-content
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const PROACTIVE_DIR = path.resolve('data/neural/proactive');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ProactiveTriggerType =
  | 'metric-drop'
  | 'trend-opportunity'
  | 'sentiment-shift'
  | 'cadence-laggin'
  | 'no-recent-posts'
  | 'hostile-comment'
  | 'competitor-viral'
  | 'goal-at-risk'
  | 'experiment-significant'
  | 'cultural-event-imminent'
  | 'algorithm-shift';

export interface ProactiveTrigger {
  id: string;
  type: ProactiveTriggerType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectedAt: string;
  details: Record<string, unknown>;
  recommendedActions: ProactiveAction[];
  autoExecutable: boolean;
  cooldownHours: number; // tiempo antes que pueda re-dispararse
}

export interface ProactiveAction {
  actionType: string;
  skillToInvoke?: string;
  params: Record<string, unknown>;
  reasoning: string;
  expectedOutcome: string;
  requiresApproval: boolean;
}

export interface ProactiveAgentState {
  brandId: string;
  enabled: boolean;
  lastObservationAt: string;
  triggersFired: ProactiveTrigger[];
  cooldowns: Record<string, string>; // triggerType → lastFiredAt
  config: ProactiveConfig;
}

export interface ProactiveConfig {
  observationIntervalSec: number;
  metricDropThreshold: number; // 0-1
  sentimentNegativeThreshold: number;
  hostileCommentThreshold: number;
  noRecentPostsHours: number;
  cadenceLagThreshold: number;
  autoExecuteSeverity: 'critical' | 'high' | 'medium'; // mínima severity para auto-execute
}

const DEFAULT_CONFIG: ProactiveConfig = {
  observationIntervalSec: 300, // cada 5 min
  metricDropThreshold: 0.2,
  sentimentNegativeThreshold: 0.3,
  hostileCommentThreshold: 0.1,
  noRecentPostsHours: 48,
  cadenceLagThreshold: 0.5,
  autoExecuteSeverity: 'critical',
};

// ── Observer ─────────────────────────────────────────────────────────────────

export const observeAndDecide = async (
  brand: BrandProfile,
  context: {
    currentMetrics: Record<string, number>;
    previousMetrics: Record<string, number>;
    hoursSinceLastPost: number;
    monthlyQuotaUsed: number;
    monthDay: number;
    sentimentScore?: number;
    hostileCommentRatio?: number;
    emergingTrends?: Array<{ name: string; velocity: number; applicability: number }>;
    competitorViralPosts?: Array<{ handle: string; postId: string; reach: number }>;
    goalsAtRisk?: number;
    experimentsAwaitingDecision?: number;
  },
  config: Partial<ProactiveConfig> = {},
): Promise<ProactiveTrigger[]> => {
  const cfg: ProactiveConfig = { ...DEFAULT_CONFIG, ...config };
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const state = await loadState(brandId);

  if (!state.enabled) return [];

  const triggers: ProactiveTrigger[] = [];

  // 1. Metric drop
  for (const [metric, current] of Object.entries(context.currentMetrics)) {
    const previous = context.previousMetrics[metric];
    if (previous === undefined || previous === 0) continue;
    const dropRatio = (previous - current) / previous;
    if (dropRatio > cfg.metricDropThreshold && !inCooldown(state, 'metric-drop')) {
      triggers.push({
        id: `trig-${Date.now()}-metric`,
        type: 'metric-drop',
        severity: dropRatio > 0.5 ? 'critical' : dropRatio > 0.3 ? 'high' : 'medium',
        detectedAt: new Date().toISOString(),
        details: { metric, previous, current, dropRatio },
        recommendedActions: [
          {
            actionType: 'generate-reactive-content',
            skillToInvoke: 'feedIA-quick-reel',
            params: { goal: 'engagement', urgency: 'high', prompt: `Reactivá engagement post-drop de ${metric}` },
            reasoning: `${metric} cayó ${(dropRatio * 100).toFixed(0)}% — necesita boost rápido`,
            expectedOutcome: 'Recuperar 50% del drop en 7 días',
            requiresApproval: dropRatio < 0.4,
          },
        ],
        autoExecutable: dropRatio > 0.4,
        cooldownHours: 12,
      });
    }
  }

  // 2. Trend opportunity
  for (const t of context.emergingTrends ?? []) {
    if (t.velocity > 0.7 && t.applicability > 0.6 && !inCooldown(state, 'trend-opportunity', t.name)) {
      triggers.push({
        id: `trig-${Date.now()}-trend`,
        type: 'trend-opportunity',
        severity: 'high',
        detectedAt: new Date().toISOString(),
        details: { trendName: t.name, velocity: t.velocity, applicability: t.applicability },
        recommendedActions: [
          {
            actionType: 'create-trend-content',
            skillToInvoke: 'feedIA-quick-carousel',
            params: { prompt: `Carrusel sobre tendencia emergente: ${t.name}`, goal: 'viralizar' },
            reasoning: `Trend ${t.name} velocity ${(t.velocity * 100).toFixed(0)}%, applicability ${(t.applicability * 100).toFixed(0)}% — montar AHORA`,
            expectedOutcome: 'Riding trend pre-saturación',
            requiresApproval: false,
          },
        ],
        autoExecutable: true,
        cooldownHours: 48,
      });
    }
  }

  // 3. Sentiment shift
  if (
    context.sentimentScore !== undefined &&
    context.sentimentScore < -cfg.sentimentNegativeThreshold &&
    !inCooldown(state, 'sentiment-shift')
  ) {
    triggers.push({
      id: `trig-${Date.now()}-sent`,
      type: 'sentiment-shift',
      severity: context.sentimentScore < -0.6 ? 'critical' : 'high',
      detectedAt: new Date().toISOString(),
      details: { score: context.sentimentScore },
      recommendedActions: [
        {
          actionType: 'crisis-comms',
          skillToInvoke: 'feedIA-crisis',
          params: { triggerReason: 'sentiment-shift-detected', score: context.sentimentScore },
          reasoning: `Sentiment ${context.sentimentScore.toFixed(2)} — escalar a crisis manager`,
          expectedOutcome: 'Plan de respuesta institucional',
          requiresApproval: true,
        },
      ],
      autoExecutable: false,
      cooldownHours: 6,
    });
  }

  // 4. No recent posts
  if (context.hoursSinceLastPost > cfg.noRecentPostsHours && !inCooldown(state, 'no-recent-posts')) {
    triggers.push({
      id: `trig-${Date.now()}-cadence`,
      type: 'no-recent-posts',
      severity: context.hoursSinceLastPost > 96 ? 'high' : 'medium',
      detectedAt: new Date().toISOString(),
      details: { hoursSince: context.hoursSinceLastPost },
      recommendedActions: [
        {
          actionType: 'auto-publish',
          skillToInvoke: 'feedIA-quick-carousel',
          params: { prompt: 'Mantenimiento de cadencia: contenido educativo evergreen', publish: true },
          reasoning: `${context.hoursSinceLastPost}h sin posts — algoritmo penaliza inactividad`,
          expectedOutcome: 'Mantener consistency signal',
          requiresApproval: false,
        },
      ],
      autoExecutable: true,
      cooldownHours: 24,
    });
  }

  // 5. Cadence laggin (mes %)
  const expectedQuotaUsedByDay = (context.monthDay / 30) * 100;
  if (
    context.monthlyQuotaUsed < expectedQuotaUsedByDay * cfg.cadenceLagThreshold &&
    !inCooldown(state, 'cadence-laggin')
  ) {
    triggers.push({
      id: `trig-${Date.now()}-lag`,
      type: 'cadence-laggin',
      severity: 'medium',
      detectedAt: new Date().toISOString(),
      details: { monthlyQuotaUsed: context.monthlyQuotaUsed, expectedByDay: expectedQuotaUsedByDay },
      recommendedActions: [
        {
          actionType: 'boost-cadence',
          params: { multiplier: 1.5 },
          reasoning: `Quota usada ${context.monthlyQuotaUsed.toFixed(0)}% vs esperado ${expectedQuotaUsedByDay.toFixed(0)}%`,
          expectedOutcome: 'Catch-up de cadencia mensual',
          requiresApproval: false,
        },
      ],
      autoExecutable: true,
      cooldownHours: 72,
    });
  }

  // 6. Hostile comments
  if ((context.hostileCommentRatio ?? 0) > cfg.hostileCommentThreshold && !inCooldown(state, 'hostile-comment')) {
    triggers.push({
      id: `trig-${Date.now()}-hostile`,
      type: 'hostile-comment',
      severity: 'high',
      detectedAt: new Date().toISOString(),
      details: { ratio: context.hostileCommentRatio },
      recommendedActions: [
        {
          actionType: 'moderate-comments',
          skillToInvoke: 'feedIA-community',
          params: { mode: 'aggressive-moderation' },
          reasoning: `${((context.hostileCommentRatio ?? 0) * 100).toFixed(0)}% comments hostiles`,
          expectedOutcome: 'Limpiar wave de hostilidad',
          requiresApproval: false,
        },
      ],
      autoExecutable: true,
      cooldownHours: 4,
    });
  }

  // 7. Competitor viral
  for (const c of context.competitorViralPosts ?? []) {
    if (c.reach > 100_000 && !inCooldown(state, 'competitor-viral', c.handle)) {
      triggers.push({
        id: `trig-${Date.now()}-comp`,
        type: 'competitor-viral',
        severity: 'medium',
        detectedAt: new Date().toISOString(),
        details: c,
        recommendedActions: [
          {
            actionType: 'counter-content',
            skillToInvoke: 'feedIA-quick-reel',
            params: { prompt: `Counter-content vs viral de ${c.handle}` },
            reasoning: `Competidor ${c.handle} viralizó (${c.reach} reach) — capitalizar momentum del tema`,
            expectedOutcome: 'Free-ride en attention del nicho',
            requiresApproval: false,
          },
        ],
        autoExecutable: false,
        cooldownHours: 24,
      });
    }
  }

  // 8. Goals at risk
  if ((context.goalsAtRisk ?? 0) > 0 && !inCooldown(state, 'goal-at-risk')) {
    triggers.push({
      id: `trig-${Date.now()}-goal`,
      type: 'goal-at-risk',
      severity: 'high',
      detectedAt: new Date().toISOString(),
      details: { count: context.goalsAtRisk },
      recommendedActions: [
        {
          actionType: 'replan-goals',
          reasoning: `${context.goalsAtRisk} goals at-risk — triggering goalDrivenPlanner replan`,
          expectedOutcome: 'Nuevo plan con tactical adjustments',
          requiresApproval: true,
          params: {},
        },
      ],
      autoExecutable: false,
      cooldownHours: 48,
    });
  }

  // Update state
  state.lastObservationAt = new Date().toISOString();
  state.triggersFired.push(...triggers);
  state.triggersFired = state.triggersFired.slice(-100);
  for (const t of triggers) state.cooldowns[t.type] = new Date().toISOString();
  await saveState(state);

  log.info('[proactiveAgent] observed', { brandId, newTriggers: triggers.length });
  return triggers;
};

const inCooldown = (state: ProactiveAgentState, type: string, subKey?: string): boolean => {
  const key = subKey ? `${type}:${subKey}` : type;
  const lastFired = state.cooldowns[key];
  if (!lastFired) return false;
  // Use default 4h cooldown for unknown
  const last = new Date(lastFired).getTime();
  return Date.now() - last < 4 * 60 * 60 * 1000;
};

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(PROACTIVE_DIR, { recursive: true });
};

const loadState = async (brandId: string): Promise<ProactiveAgentState> => {
  try {
    return JSON.parse(await fs.readFile(path.join(PROACTIVE_DIR, `${brandId}.json`), 'utf-8')) as ProactiveAgentState;
  } catch {
    return { brandId, enabled: true, lastObservationAt: '', triggersFired: [], cooldowns: {}, config: DEFAULT_CONFIG };
  }
};

const saveState = async (state: ProactiveAgentState): Promise<void> => {
  await ensureDir();
  await fs.writeFile(path.join(PROACTIVE_DIR, `${state.brandId}.json`), JSON.stringify(state, null, 2), 'utf-8');
};

export const setProactiveEnabled = async (brandId: string, enabled: boolean): Promise<void> => {
  const state = await loadState(brandId);
  state.enabled = enabled;
  await saveState(state);
};

export const getProactiveState = (brandId: string): Promise<ProactiveAgentState> => loadState(brandId);

/** Executive summary de últimos triggers. */
export const getRecentTriggers = async (brandId: string, limit = 20): Promise<ProactiveTrigger[]> => {
  const state = await loadState(brandId);
  return state.triggersFired.slice(-limit);
};
