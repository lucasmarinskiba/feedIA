/**
 * Motor de crecimiento de FeedIA.
 * Centraliza objetivos, mide progreso real, adapta la estrategia y celebra los wins.
 * Este módulo es el "cerebro" que coordina todas las tácticas para crecer la cuenta.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { getAccountSummary, getRecentPosts, extractPatterns } from '../analytics/performanceDB.js';
import type { BrandProfile } from '../../config/types.js';

const GROWTH_PATH = join(process.cwd(), 'data', 'analytics', 'growth.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface GrowthGoal {
  targetFollowers: number;
  targetEngagementRate: number; // %, p.ej. 5.0
  targetReachPerPost: number;
  deadline: string; // ISO
  primaryFocus: 'awareness' | 'engagement' | 'leads' | 'ventas' | 'autoridad';
  createdAt: string;
}

export interface DailyMetricSnapshot {
  date: string; // YYYY-MM-DD
  followers: number;
  followersDelta: number; // vs día anterior
  reach24h: number;
  engagement24h: number;
  postsPublished: number;
  storiesPublished: number;
  topPost?: { id: string; reach: number; engagement: number };
}

export interface GrowthMilestone {
  id: string;
  achievedAt: string;
  type: 'followers' | 'engagement_rate' | 'top_post' | 'streak' | 'reach';
  value: number | string;
  description: string;
}

export interface GrowthState {
  goal: GrowthGoal | null;
  dailyMetrics: DailyMetricSnapshot[]; // Últimos 90 días
  milestones: GrowthMilestone[];
  weeklyVelocity: number; // seguidores/día promedio últimas 4 semanas
  bestStreak: { days: number; from: string; to: string } | null;
  lastUpdated: string;
}

export interface GrowthProgress {
  goal: GrowthGoal | null;
  current: { followers: number; engagementRate: number; reachPerPost: number };
  gap: { followers: number; engagementRate: number; reachPerPost: number };
  daysRemaining: number;
  velocity: { current: number; needed: number }; // seguidores/día
  onTrack: boolean;
  projectedAchievementDate: string | null;
  confidence: 'alta' | 'media' | 'baja';
}

// ── Persistencia ──────────────────────────────────────────────────────────────

const DEFAULT_STATE: GrowthState = {
  goal: null,
  dailyMetrics: [],
  milestones: [],
  weeklyVelocity: 0,
  bestStreak: null,
  lastUpdated: new Date().toISOString(),
};

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'analytics');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadState = (): GrowthState => {
  try {
    ensureDir();
    if (!existsSync(GROWTH_PATH)) return structuredClone(DEFAULT_STATE);
    return JSON.parse(readFileSync(GROWTH_PATH, 'utf8')) as GrowthState;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
};

const saveState = (state: GrowthState): void => {
  ensureDir();
  state.lastUpdated = new Date().toISOString();
  writeFileSync(GROWTH_PATH, JSON.stringify(state, null, 2), 'utf8');
};

// ── Goals ─────────────────────────────────────────────────────────────────────

export const setGrowthGoal = (goal: Omit<GrowthGoal, 'createdAt'>): GrowthGoal => {
  const state = loadState();
  const fullGoal: GrowthGoal = { ...goal, createdAt: new Date().toISOString() };
  state.goal = fullGoal;
  saveState(state);
  log.info(`[GrowthEngine] Meta seteada: ${goal.targetFollowers} seguidores para ${goal.deadline}`);
  return fullGoal;
};

export const clearGrowthGoal = (): void => {
  const state = loadState();
  state.goal = null;
  saveState(state);
};

// ── Daily metrics tracking ────────────────────────────────────────────────────

export const recordDailySnapshot = (snapshot: Omit<DailyMetricSnapshot, 'followersDelta'>): DailyMetricSnapshot => {
  const state = loadState();
  const yesterday = state.dailyMetrics[state.dailyMetrics.length - 1];
  const followersDelta = yesterday ? snapshot.followers - yesterday.followers : 0;

  const fullSnapshot: DailyMetricSnapshot = { ...snapshot, followersDelta };
  state.dailyMetrics.push(fullSnapshot);

  // Mantener últimos 90 días
  if (state.dailyMetrics.length > 90) {
    state.dailyMetrics = state.dailyMetrics.slice(-90);
  }

  // Actualizar velocity (últimas 4 semanas = 28 días)
  const last28 = state.dailyMetrics.slice(-28);
  if (last28.length >= 7) {
    const totalGrowth = last28[last28.length - 1]!.followers - last28[0]!.followers;
    state.weeklyVelocity = totalGrowth / last28.length;
  }

  // Detectar streak de crecimiento positivo
  let currentStreak = 0;
  for (let i = state.dailyMetrics.length - 1; i >= 0; i--) {
    if ((state.dailyMetrics[i]?.followersDelta ?? 0) > 0) currentStreak++;
    else break;
  }
  if (currentStreak >= 3 && (!state.bestStreak || currentStreak > state.bestStreak.days)) {
    const from = state.dailyMetrics[state.dailyMetrics.length - currentStreak]!.date;
    const to = state.dailyMetrics[state.dailyMetrics.length - 1]!.date;
    state.bestStreak = { days: currentStreak, from, to };
  }

  saveState(state);
  return fullSnapshot;
};

// ── Progress calculation ──────────────────────────────────────────────────────

export const getCurrentProgress = (): GrowthProgress => {
  const state = loadState();
  const accSummary = getAccountSummary();
  const last = state.dailyMetrics[state.dailyMetrics.length - 1];

  if (!state.goal) {
    return {
      goal: null,
      current: { followers: last?.followers ?? 0, engagementRate: accSummary.avgEngagementRate, reachPerPost: 0 },
      gap: { followers: 0, engagementRate: 0, reachPerPost: 0 },
      daysRemaining: 0,
      velocity: { current: state.weeklyVelocity, needed: 0 },
      onTrack: true,
      projectedAchievementDate: null,
      confidence: 'media',
    };
  }

  const currentFollowers = last?.followers ?? 0;
  const recentPosts = getRecentPosts(30);
  const avgReach =
    recentPosts.length > 0 ? recentPosts.reduce((s, p) => s + p.metrics.reach, 0) / recentPosts.length : 0;

  const followersGap = state.goal.targetFollowers - currentFollowers;
  const deadlineDate = new Date(state.goal.deadline);
  const daysRemaining = Math.max(1, Math.ceil((deadlineDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const neededVelocity = followersGap / daysRemaining;
  const onTrack = state.weeklyVelocity >= neededVelocity * 0.85;

  let projectedDate: string | null = null;
  if (state.weeklyVelocity > 0 && followersGap > 0) {
    const projDays = Math.ceil(followersGap / state.weeklyVelocity);
    projectedDate = new Date(Date.now() + projDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
  }

  const confidence: 'alta' | 'media' | 'baja' =
    state.dailyMetrics.length >= 14 && Math.abs(state.weeklyVelocity) >= 1
      ? 'alta'
      : state.dailyMetrics.length >= 7
        ? 'media'
        : 'baja';

  return {
    goal: state.goal,
    current: { followers: currentFollowers, engagementRate: accSummary.avgEngagementRate, reachPerPost: avgReach },
    gap: {
      followers: followersGap,
      engagementRate: state.goal.targetEngagementRate - accSummary.avgEngagementRate,
      reachPerPost: state.goal.targetReachPerPost - avgReach,
    },
    daysRemaining,
    velocity: { current: state.weeklyVelocity, needed: neededVelocity },
    onTrack,
    projectedAchievementDate: projectedDate,
    confidence,
  };
};

// ── Milestones & celebrations ────────────────────────────────────────────────

const FOLLOWER_MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

export const detectAndCelebrateMilestones = async (brand: BrandProfile): Promise<GrowthMilestone[]> => {
  const state = loadState();
  const last = state.dailyMetrics[state.dailyMetrics.length - 1];
  if (!last) return [];

  const previousMilestoneIds = new Set(state.milestones.map((m) => m.id));
  const newMilestones: GrowthMilestone[] = [];

  // Hitos de seguidores
  for (const ms of FOLLOWER_MILESTONES) {
    if (last.followers >= ms) {
      const id = `followers-${ms}`;
      if (!previousMilestoneIds.has(id)) {
        const milestone: GrowthMilestone = {
          id,
          achievedAt: new Date().toISOString(),
          type: 'followers',
          value: ms,
          description: `🎉 ${ms.toLocaleString('es-AR')} seguidores alcanzados`,
        };
        newMilestones.push(milestone);
        state.milestones.push(milestone);
      }
    }
  }

  // Hito de mejor streak (≥ 7 días)
  if (state.bestStreak && state.bestStreak.days >= 7) {
    const id = `streak-${state.bestStreak.days}`;
    if (!previousMilestoneIds.has(id)) {
      const milestone: GrowthMilestone = {
        id,
        achievedAt: new Date().toISOString(),
        type: 'streak',
        value: state.bestStreak.days,
        description: `🔥 ${state.bestStreak.days} días seguidos de crecimiento positivo`,
      };
      newMilestones.push(milestone);
      state.milestones.push(milestone);
    }
  }

  // Hito de engagement rate (≥ 5% sostenido)
  const accSummary = getAccountSummary();
  if (accSummary.avgEngagementRate >= 5 && accSummary.totalPosts >= 10) {
    const id = `eng-rate-5pct`;
    if (!previousMilestoneIds.has(id)) {
      const milestone: GrowthMilestone = {
        id,
        achievedAt: new Date().toISOString(),
        type: 'engagement_rate',
        value: accSummary.avgEngagementRate.toFixed(2),
        description: `📈 Engagement rate sostenido por encima de 5% (${accSummary.avgEngagementRate.toFixed(2)}%)`,
      };
      newMilestones.push(milestone);
      state.milestones.push(milestone);
    }
  }

  if (newMilestones.length > 0) {
    saveState(state);
    // Enviar alertas
    for (const ms of newMilestones) {
      await sendAlert({
        severity: 'info',
        title: `${brand.name}: nuevo hito alcanzado`,
        body: ms.description,
        metadata: { milestone: ms },
      }).catch((err) => log.warn(`[GrowthEngine] No se pudo enviar alerta: ${(err as Error).message}`));
    }
  }

  return newMilestones;
};

// ── Daily growth loop ─────────────────────────────────────────────────────────

export interface GrowthAction {
  action: string;
  why: string;
  expectedImpact: string;
  priority: 'critical' | 'high' | 'normal';
  toolToInvoke?: string;
}

export const recommendNextActions = async (brand: BrandProfile): Promise<GrowthAction[]> => {
  const progress = getCurrentProgress();
  const patterns = extractPatterns();
  const recent = getRecentPosts(7);

  const context = `
ESTADO ACTUAL:
- Seguidores: ${progress.current.followers.toLocaleString('es-AR')}
- Engagement rate: ${progress.current.engagementRate.toFixed(2)}%
- Alcance promedio por post: ${Math.round(progress.current.reachPerPost).toLocaleString('es-AR')}
- Velocidad de crecimiento: ${progress.velocity.current.toFixed(1)} seguidores/día
- ${progress.onTrack ? '✅ En camino a la meta' : '⚠️ Por debajo del ritmo necesario'}

META:
- ${progress.goal ? `${progress.goal.targetFollowers.toLocaleString('es-AR')} seguidores para ${progress.goal.deadline.split('T')[0]}` : 'Sin meta seteada'}
- Faltan: ${progress.gap.followers.toLocaleString('es-AR')} seguidores en ${progress.daysRemaining} días
- Necesita crecer ${progress.velocity.needed.toFixed(1)} seguidores/día (actual: ${progress.velocity.current.toFixed(1)})

ÚLTIMOS 7 DÍAS:
- Posts publicados: ${recent.length}
- Mejores formatos: ${patterns.bestFormats
    .slice(0, 3)
    .map((f) => `${f.format} (${f.avgEngagement.toFixed(2)}%)`)
    .join(', ')}
- Temas top: ${
    patterns.topTopics
      .slice(0, 3)
      .map((t) => t.topic)
      .join(', ') || '(sin datos)'
  }

MARCA: ${brand.name} | Nicho: ${brand.niche} | Objetivo principal: ${brand.goals.primary}
`;

  const prompt = `Sos un growth manager senior de Instagram. Con este contexto, recomendá las 5 acciones MÁS IMPACTANTES para las próximas 24-48 horas.
${context}

Cada acción debe ser:
- ESPECÍFICA (no "publicar más", sí "publicar 1 reel con formato A+B+C")
- ACCIONABLE hoy mismo
- Con impacto medible

JSON:
{
  "actions": [
    {
      "action": "qué hacer concretamente",
      "why": "por qué esto va a mover la aguja (referencia datos del contexto)",
      "expectedImpact": "ej: +15-30 seguidores en 48h",
      "priority": "critical | high | normal",
      "toolToInvoke": "nombre del tool de FeedIA que la ejecuta (opcional)"
    }
  ]
}`;

  const result = await routerAskJson<{ actions: GrowthAction[] }>(prompt, {
    taskType: 'strategy',
    maxTokens: 2500,
    systemPrompt:
      'Sos el growth manager #1 del mundo en Instagram. Tus recomendaciones son específicas, medibles y ya han crecido cuentas de 0 a 100k.',
  });

  return result.actions;
};

// ── Insights narrativos ──────────────────────────────────────────────────────

export const getGrowthNarrative = async (
  brand: BrandProfile,
): Promise<{
  headline: string;
  body: string;
  highlights: string[];
}> => {
  const state = loadState();
  const progress = getCurrentProgress();
  const last7 = state.dailyMetrics.slice(-7);
  const prev7 = state.dailyMetrics.slice(-14, -7);

  const thisWeekDelta = last7.reduce((s, d) => s + d.followersDelta, 0);
  const prevWeekDelta = prev7.reduce((s, d) => s + d.followersDelta, 0);
  const weekOverWeek = prevWeekDelta !== 0 ? ((thisWeekDelta - prevWeekDelta) / Math.abs(prevWeekDelta)) * 100 : 0;

  const recentMilestones = state.milestones.slice(-3);

  const prompt = `Generá un resumen ejecutivo de crecimiento para el dueño de @${brand.name}, motivador y basado en datos.

DATOS:
- Seguidores actuales: ${progress.current.followers.toLocaleString('es-AR')}
- Esta semana: ${thisWeekDelta >= 0 ? '+' : ''}${thisWeekDelta} seguidores (vs anterior: ${weekOverWeek >= 0 ? '+' : ''}${weekOverWeek.toFixed(1)}%)
- Engagement rate: ${progress.current.engagementRate.toFixed(2)}%
- Velocidad: ${progress.velocity.current.toFixed(1)} seguidores/día
- ${progress.onTrack ? 'En camino a la meta' : 'Por debajo del ritmo necesario'}
- Mejor streak histórico: ${state.bestStreak ? `${state.bestStreak.days} días seguidos` : 'aún sin streak ≥3 días'}
- Hitos recientes: ${recentMilestones.map((m) => m.description).join(' | ') || '(ninguno)'}
- Proyección: ${progress.projectedAchievementDate ? `alcanzarías la meta el ${progress.projectedAchievementDate}` : 'sin meta clara'}

JSON:
{
  "headline": "1 línea celebrando lo más importante o señalando el foco urgente",
  "body": "3-4 líneas con análisis honesto y motivador. Hablale al dueño, no a un comité.",
  "highlights": ["3-5 bullets con datos concretos y wins/áreas a mejorar"]
}`;

  return routerAskJson<{ headline: string; body: string; highlights: string[] }>(prompt, {
    taskType: 'analysis',
    maxTokens: 1500,
  });
};

// ── Health check ──────────────────────────────────────────────────────────────

export const getGrowthHealth = (): {
  status: 'excelente' | 'buena' | 'estancada' | 'crítica';
  score: number; // 0-100
  signals: string[];
} => {
  const state = loadState();
  const progress = getCurrentProgress();
  const last7 = state.dailyMetrics.slice(-7);
  const signals: string[] = [];
  let score = 50;

  if (progress.velocity.current >= 5) {
    score += 20;
    signals.push('Velocidad de crecimiento saludable (≥5/día)');
  } else if (progress.velocity.current >= 1) {
    score += 10;
    signals.push('Crecimiento positivo moderado');
  } else if (progress.velocity.current < 0) {
    score -= 25;
    signals.push('⚠️ Pérdida neta de seguidores en últimas semanas');
  }

  if (progress.current.engagementRate >= 5) {
    score += 15;
    signals.push(`Engagement rate excelente (${progress.current.engagementRate.toFixed(2)}%)`);
  } else if (progress.current.engagementRate >= 3) {
    score += 8;
    signals.push('Engagement rate dentro de promedio');
  } else if (progress.current.engagementRate < 1.5) {
    score -= 15;
    signals.push('⚠️ Engagement rate bajo (<1.5%)');
  }

  if (progress.onTrack && progress.goal) {
    score += 10;
    signals.push('✅ En camino a la meta');
  } else if (progress.goal) {
    score -= 5;
    signals.push('Ritmo insuficiente para la meta seteada');
  }

  if (state.bestStreak && state.bestStreak.days >= 7) {
    score += 5;
    signals.push(`Streak histórico de ${state.bestStreak.days} días`);
  }

  const recentNegDays = last7.filter((d) => d.followersDelta < 0).length;
  if (recentNegDays >= 4) {
    score -= 10;
    signals.push(`⚠️ ${recentNegDays} de los últimos 7 días con pérdida de seguidores`);
  }

  score = Math.max(0, Math.min(100, score));
  const status: 'excelente' | 'buena' | 'estancada' | 'crítica' =
    score >= 80 ? 'excelente' : score >= 60 ? 'buena' : score >= 40 ? 'estancada' : 'crítica';

  return { status, score, signals };
};

// ── Getters utilitarios ──────────────────────────────────────────────────────

export const getRecentDailyMetrics = (days = 30): DailyMetricSnapshot[] => loadState().dailyMetrics.slice(-days);

export const getMilestones = (limit = 10): GrowthMilestone[] => loadState().milestones.slice(-limit).reverse();

export const getWeeklyVelocity = (): number => loadState().weeklyVelocity;

export const exportGrowthState = (): GrowthState => loadState();
