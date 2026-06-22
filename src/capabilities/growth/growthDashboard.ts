/**
 * Growth Dashboard de FeedIA — la capa que hace VISIBLE el crecimiento.
 *
 * Mientras growthEngine es el cerebro (KPIs, recomendaciones), este módulo es la cara:
 * series de tiempo para gráficos, comparaciones semana vs semana, milestones próximos,
 * predicciones, leaderboards de posts, y narrativa visual del avance.
 */

import {
  exportGrowthState,
  getCurrentProgress,
  getRecentDailyMetrics,
  getMilestones,
  getWeeklyVelocity,
  getGrowthHealth,
} from './growthEngine.js';
import { getTopPerformers, getRecentPosts, getAccountSummary, extractPatterns } from '../analytics/performanceDB.js';
import { getBestPostingTime } from '../analytics/audienceTiming.js';
import { getBoostStats } from './postBoost.js';
import { getTrackerStatus, getRecentViralPosts } from '../trends/viralTracker.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DashboardKPI {
  label: string;
  value: string;
  delta: string; // ej: "+12.4%"
  deltaDirection: 'up' | 'down' | 'flat';
  context: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ChartSeries {
  label: string;
  unit: string;
  data: TimeSeriesPoint[];
}

export interface NextMilestone {
  type: 'followers' | 'engagement_rate' | 'streak';
  target: number | string;
  current: number;
  remaining: number;
  estimatedDate: string | null;
  daysAway: number | null;
  description: string;
}

export interface PostLeaderboard {
  rank: number;
  postId: string;
  format: ContentFormat;
  publishedAt: string;
  hook: string;
  reach: number;
  saves: number;
  engagementRate: number;
  isTopPerformer: boolean;
}

export interface GrowthDashboard {
  generatedAt: string;
  // Top de la pantalla: KPIs principales
  kpis: DashboardKPI[];
  // Series para gráficos
  charts: {
    followersOverTime: ChartSeries;
    followersDeltaDaily: ChartSeries;
    reachOverTime: ChartSeries;
    engagementRateOverTime: ChartSeries;
  };
  // Próximos hitos a celebrar
  nextMilestones: NextMilestone[];
  // Hitos ya alcanzados
  recentAchievements: ReturnType<typeof getMilestones>;
  // Leaderboard de posts
  topPosts: PostLeaderboard[];
  // Mejores horarios actuales
  bestPostingTimes: ReturnType<typeof getBestPostingTime>;
  // Estado del sistema de boost
  boostStats: ReturnType<typeof getBoostStats>;
  // Estado del viral tracker
  viralTracker: ReturnType<typeof getTrackerStatus> & { recentNicheViral: ReturnType<typeof getRecentViralPosts> };
  // Salud general
  health: ReturnType<typeof getGrowthHealth>;
  // Predicciones de cumplimiento de meta
  prediction: {
    onTrack: boolean;
    projectedAchievementDate: string | null;
    confidence: string;
    needed: { perDay: number; perWeek: number };
    current: { perDay: number; perWeek: number };
    daysAhead: number | null; // positivo: adelantado; negativo: atrasado
  };
  // Comparación semana vs semana
  weekOverWeek: {
    followersThisWeek: number;
    followersLastWeek: number;
    deltaPct: number;
    reachThisWeek: number;
    reachLastWeek: number;
    reachDeltaPct: number;
    postsThisWeek: number;
    postsLastWeek: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('es-AR');
};

const formatPct = (n: number, decimals = 1): string => `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;

const FOLLOWER_TIERS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

// ── KPIs ──────────────────────────────────────────────────────────────────────

const buildKPIs = (): DashboardKPI[] => {
  const progress = getCurrentProgress();
  const last30 = getRecentDailyMetrics(30);
  const last7 = last30.slice(-7);
  const prev7 = last30.slice(-14, -7);

  const followersDelta7 = last7.reduce((s, d) => s + d.followersDelta, 0);
  const followersDeltaPrev = prev7.reduce((s, d) => s + d.followersDelta, 0);
  const followersGrowthPct =
    followersDeltaPrev !== 0 ? ((followersDelta7 - followersDeltaPrev) / Math.abs(followersDeltaPrev)) * 100 : 0;

  const reachThis = last7.reduce((s, d) => s + d.reach24h, 0);
  const reachPrev = prev7.reduce((s, d) => s + d.reach24h, 0);
  const reachDeltaPct = reachPrev > 0 ? ((reachThis - reachPrev) / reachPrev) * 100 : 0;

  const acc = getAccountSummary();
  const recentPosts = getRecentPosts(30);

  return [
    {
      label: 'Seguidores',
      value: formatNumber(progress.current.followers),
      delta: followersDelta7 >= 0 ? `+${followersDelta7}` : `${followersDelta7}`,
      deltaDirection: followersDelta7 > 0 ? 'up' : followersDelta7 < 0 ? 'down' : 'flat',
      context: `${followersDelta7 >= 0 ? '+' : ''}${followersDelta7} esta semana (${formatPct(followersGrowthPct)} vs anterior)`,
    },
    {
      label: 'Engagement rate',
      value: `${progress.current.engagementRate.toFixed(2)}%`,
      delta: acc.trend === 'mejorando' ? '↑' : acc.trend === 'bajando' ? '↓' : '→',
      deltaDirection: acc.trend === 'mejorando' ? 'up' : acc.trend === 'bajando' ? 'down' : 'flat',
      context: `Tendencia ${acc.trend} en últimos posts`,
    },
    {
      label: 'Alcance semanal',
      value: formatNumber(reachThis),
      delta: formatPct(reachDeltaPct),
      deltaDirection: reachDeltaPct > 0 ? 'up' : reachDeltaPct < 0 ? 'down' : 'flat',
      context: `${formatNumber(reachThis)} personas únicas en 7 días`,
    },
    {
      label: 'Velocidad',
      value: `${progress.velocity.current.toFixed(1)}/día`,
      delta: progress.onTrack ? '✓ En camino' : 'Por debajo',
      deltaDirection: progress.onTrack ? 'up' : 'down',
      context: progress.goal
        ? `Meta: ${progress.velocity.needed.toFixed(1)}/día para ${progress.goal.deadline.split('T')[0]}`
        : 'Sin meta seteada',
    },
    {
      label: 'Posts/semana',
      value: String(recentPosts.filter((p) => new Date(p.publishedAt).getTime() >= Date.now() - 7 * 86400000).length),
      delta: '',
      deltaDirection: 'flat',
      context: 'Frecuencia de publicación',
    },
  ];
};

// ── Charts ────────────────────────────────────────────────────────────────────

const buildCharts = (): GrowthDashboard['charts'] => {
  const last90 = getRecentDailyMetrics(90);
  const recentPosts = getRecentPosts(90);

  // Followers over time
  const followersOverTime: ChartSeries = {
    label: 'Seguidores totales',
    unit: 'seguidores',
    data: last90.map((d) => ({ date: d.date, value: d.followers })),
  };

  // Daily delta
  const followersDeltaDaily: ChartSeries = {
    label: 'Cambio diario de seguidores',
    unit: 'seguidores/día',
    data: last90.map((d) => ({ date: d.date, value: d.followersDelta })),
  };

  // Reach over time (suma diaria del alcance de posts)
  const reachByDate = new Map<string, number>();
  for (const p of recentPosts) {
    const date = p.publishedAt.split('T')[0]!;
    reachByDate.set(date, (reachByDate.get(date) ?? 0) + p.metrics.reach);
  }
  const reachOverTime: ChartSeries = {
    label: 'Alcance por día',
    unit: 'personas',
    data: [...reachByDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value })),
  };

  // Engagement rate over time (promedio diario)
  const engByDate = new Map<string, { total: number; count: number }>();
  for (const p of recentPosts) {
    const date = p.publishedAt.split('T')[0]!;
    const cur = engByDate.get(date) ?? { total: 0, count: 0 };
    engByDate.set(date, { total: cur.total + p.metrics.engagementRate, count: cur.count + 1 });
  }
  const engagementRateOverTime: ChartSeries = {
    label: 'Engagement rate promedio diario',
    unit: '%',
    data: [...engByDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({ date, value: Number((d.total / d.count).toFixed(2)) })),
  };

  return { followersOverTime, followersDeltaDaily, reachOverTime, engagementRateOverTime };
};

// ── Próximos hitos ────────────────────────────────────────────────────────────

const buildNextMilestones = (): NextMilestone[] => {
  const progress = getCurrentProgress();
  const velocity = getWeeklyVelocity();
  const milestones: NextMilestone[] = [];

  const nextFollowerTier = FOLLOWER_TIERS.find((t) => t > progress.current.followers);
  if (nextFollowerTier) {
    const remaining = nextFollowerTier - progress.current.followers;
    const daysAway = velocity > 0 ? Math.ceil(remaining / velocity) : null;
    milestones.push({
      type: 'followers',
      target: nextFollowerTier,
      current: progress.current.followers,
      remaining,
      estimatedDate: daysAway !== null ? new Date(Date.now() + daysAway * 86400000).toISOString().split('T')[0]! : null,
      daysAway,
      description: `Faltan ${remaining.toLocaleString('es-AR')} seguidores para ${formatNumber(nextFollowerTier)}`,
    });
  }

  if (progress.current.engagementRate < 5 && progress.current.engagementRate > 0) {
    const remaining = 5 - progress.current.engagementRate;
    milestones.push({
      type: 'engagement_rate',
      target: '5%',
      current: progress.current.engagementRate,
      remaining: Number(remaining.toFixed(2)),
      estimatedDate: null,
      daysAway: null,
      description: `Faltan ${remaining.toFixed(2)} puntos para llegar a 5% de engagement rate (excelente)`,
    });
  }

  const state = exportGrowthState();
  const currentStreak = state.bestStreak?.days ?? 0;
  const nextStreakTarget = currentStreak < 7 ? 7 : currentStreak < 14 ? 14 : currentStreak < 30 ? 30 : null;
  if (nextStreakTarget) {
    milestones.push({
      type: 'streak',
      target: `${nextStreakTarget} días seguidos`,
      current: currentStreak,
      remaining: nextStreakTarget - currentStreak,
      estimatedDate: null,
      daysAway: nextStreakTarget - currentStreak,
      description: `Llevás ${currentStreak} días seguidos de crecimiento. Faltan ${nextStreakTarget - currentStreak} para ${nextStreakTarget}`,
    });
  }

  return milestones;
};

// ── Leaderboard ───────────────────────────────────────────────────────────────

const buildTopPosts = (limit: number): PostLeaderboard[] => {
  const top = getTopPerformers(undefined, limit);
  return top.map((p, i) => ({
    rank: i + 1,
    postId: p.id,
    format: p.format,
    publishedAt: p.publishedAt,
    hook: p.hookText,
    reach: p.metrics.reach,
    saves: p.metrics.saves,
    engagementRate: p.metrics.engagementRate,
    isTopPerformer: p.isTopPerformer,
  }));
};

// ── Week over week ────────────────────────────────────────────────────────────

const buildWeekOverWeek = (): GrowthDashboard['weekOverWeek'] => {
  const last14 = getRecentDailyMetrics(14);
  const last7 = last14.slice(-7);
  const prev7 = last14.slice(0, 7);

  const followersThisWeek = last7.reduce((s, d) => s + d.followersDelta, 0);
  const followersLastWeek = prev7.reduce((s, d) => s + d.followersDelta, 0);
  const deltaPct =
    followersLastWeek !== 0 ? ((followersThisWeek - followersLastWeek) / Math.abs(followersLastWeek)) * 100 : 0;

  const reachThisWeek = last7.reduce((s, d) => s + d.reach24h, 0);
  const reachLastWeek = prev7.reduce((s, d) => s + d.reach24h, 0);
  const reachDeltaPct = reachLastWeek > 0 ? ((reachThisWeek - reachLastWeek) / reachLastWeek) * 100 : 0;

  const postsThisWeek = last7.reduce((s, d) => s + d.postsPublished, 0);
  const postsLastWeek = prev7.reduce((s, d) => s + d.postsPublished, 0);

  return {
    followersThisWeek,
    followersLastWeek,
    deltaPct,
    reachThisWeek,
    reachLastWeek,
    reachDeltaPct,
    postsThisWeek,
    postsLastWeek,
  };
};

// ── Predicción detallada ──────────────────────────────────────────────────────

const buildPrediction = (): GrowthDashboard['prediction'] => {
  const progress = getCurrentProgress();
  if (!progress.goal) {
    return {
      onTrack: true,
      projectedAchievementDate: null,
      confidence: 'sin meta',
      needed: { perDay: 0, perWeek: 0 },
      current: { perDay: progress.velocity.current, perWeek: progress.velocity.current * 7 },
      daysAhead: null,
    };
  }

  const neededPerDay = progress.velocity.needed;
  const currentPerDay = progress.velocity.current;

  let daysAhead: number | null = null;
  if (progress.projectedAchievementDate) {
    const projected = new Date(progress.projectedAchievementDate).getTime();
    const deadline = new Date(progress.goal.deadline).getTime();
    daysAhead = Math.round((deadline - projected) / 86400000);
  }

  return {
    onTrack: progress.onTrack,
    projectedAchievementDate: progress.projectedAchievementDate,
    confidence: progress.confidence,
    needed: { perDay: Number(neededPerDay.toFixed(1)), perWeek: Number((neededPerDay * 7).toFixed(0)) },
    current: { perDay: Number(currentPerDay.toFixed(1)), perWeek: Number((currentPerDay * 7).toFixed(0)) },
    daysAhead,
  };
};

// ── Dashboard completo ───────────────────────────────────────────────────────

export const buildDashboard = (_brand?: BrandProfile): GrowthDashboard => ({
  generatedAt: new Date().toISOString(),
  kpis: buildKPIs(),
  charts: buildCharts(),
  nextMilestones: buildNextMilestones(),
  recentAchievements: getMilestones(8),
  topPosts: buildTopPosts(10),
  bestPostingTimes: getBestPostingTime(),
  boostStats: getBoostStats(),
  viralTracker: { ...getTrackerStatus(), recentNicheViral: getRecentViralPosts(7) },
  health: getGrowthHealth(),
  prediction: buildPrediction(),
  weekOverWeek: buildWeekOverWeek(),
});

// ── Snapshot textual (para alertas, Talía, voice) ────────────────────────────

export const buildTextSummary = (brand: BrandProfile): string => {
  const d = buildDashboard(brand);
  const lines: string[] = [];

  lines.push(`📊 *${brand.name}* — snapshot de crecimiento`);
  lines.push('');
  lines.push(`*Estado*: ${d.health.status.toUpperCase()} (${d.health.score}/100)`);
  lines.push('');
  lines.push('*KPIs*');
  for (const kpi of d.kpis) {
    lines.push(`• ${kpi.label}: ${kpi.value} ${kpi.delta ? `(${kpi.delta})` : ''} — ${kpi.context}`);
  }
  lines.push('');
  lines.push(
    `*Esta semana vs anterior*: ${d.weekOverWeek.followersThisWeek >= 0 ? '+' : ''}${d.weekOverWeek.followersThisWeek} seguidores (${formatPct(d.weekOverWeek.deltaPct)})`,
  );
  if (d.prediction.projectedAchievementDate) {
    lines.push(
      `*Proyección de meta*: ${d.prediction.projectedAchievementDate} ${d.prediction.daysAhead !== null ? (d.prediction.daysAhead >= 0 ? `(${d.prediction.daysAhead} días adelantado)` : `(${Math.abs(d.prediction.daysAhead)} días atrasado)`) : ''}`,
    );
  }
  if (d.nextMilestones[0]) {
    lines.push(`*Próximo hito*: ${d.nextMilestones[0].description}`);
  }
  lines.push('');
  lines.push(
    `*Top post*: "${d.topPosts[0]?.hook ?? '(sin datos)'}" — ${formatNumber(d.topPosts[0]?.reach ?? 0)} alcance`,
  );

  return lines.join('\n');
};

// ── Insights complementarios ─────────────────────────────────────────────────

export const getQuickInsights = (): {
  topInsight: string;
  warnings: string[];
  opportunities: string[];
} => {
  const dashboard = buildDashboard();
  const patterns = extractPatterns();
  const warnings: string[] = [];
  const opportunities: string[] = [];

  if (!dashboard.prediction.onTrack && dashboard.prediction.daysAhead !== null) {
    warnings.push(`Estás ${Math.abs(dashboard.prediction.daysAhead)} días atrasado respecto a tu meta`);
  }
  if (dashboard.weekOverWeek.deltaPct < -15) {
    warnings.push(`Crecimiento bajó ${formatPct(dashboard.weekOverWeek.deltaPct)} esta semana`);
  }
  if (dashboard.health.score < 50) {
    warnings.push(`Salud de la cuenta en zona crítica (${dashboard.health.score}/100)`);
  }

  if (patterns.bestFormats[0]) {
    opportunities.push(
      `Tu formato ganador es "${patterns.bestFormats[0].format}" (${patterns.bestFormats[0].avgEngagement.toFixed(2)}% engagement) — duplicá su frecuencia`,
    );
  }
  if (patterns.topTopics[0]) {
    opportunities.push(
      `El tema "${patterns.topTopics[0].topic}" rinde ${patterns.topTopics[0].avgScore.toFixed(0)}/100 promedio — generá más contenido del mismo tema`,
    );
  }
  if (dashboard.viralTracker.recentNicheViral.length >= 2) {
    opportunities.push(
      `${dashboard.viralTracker.recentNicheViral.length} oportunidades virales detectadas en tu nicho últimos 7 días`,
    );
  }

  const topInsight =
    dashboard.health.status === 'excelente'
      ? `${dashboard.kpis[0]?.value ?? ''} seguidores y creciendo ${dashboard.prediction.current.perDay}/día. Mantené la racha.`
      : dashboard.health.status === 'buena'
        ? `Cuenta saludable. ${opportunities[0] ?? 'Seguí ejecutando el plan'}.`
        : dashboard.health.status === 'estancada'
          ? `Crecimiento estancado. ${warnings[0] ?? 'Hay que cambiar la estrategia de contenido'}.`
          : `Estado crítico. Foco urgente en ${opportunities[0] ?? 'recuperar engagement'}.`;

  return { topInsight, warnings, opportunities };
};
