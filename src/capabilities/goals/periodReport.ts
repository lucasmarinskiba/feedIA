/**
 * Period Report de FeedIA — informe ejecutivo de cierre de período.
 *
 * Al final de cada semana/mes/trimestre/año, el sistema genera un informe completo
 * con números, gráficos (datos para chart), explicación narrativa y recomendaciones
 * para el próximo período.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { listGoals, getGoalsSnapshot, checkGoalsHealth, periodBoundaries } from './goalManager.js';
import { getBurndownForGoal, exportBoardState, AGENT_SPECIALTIES, type AgentId } from './taskBoard.js';
import { listEvents } from './calendarBoard.js';
import { getRecentPosts, getAccountSummary, extractPatterns } from '../analytics/performanceDB.js';
import { getRecentDailyMetrics, getMilestones } from '../growth/growthEngine.js';
import { getBoostStats } from '../growth/postBoost.js';
import type { BrandProfile } from '../../config/types.js';
import type { Goal, GoalHorizon } from './goalManager.js';
import { listPromises } from '../promiseRegistry/promiseRegistry.js';
import { getPromiseProjections } from '../promiseRegistry/promiseTracker.js';

const REPORTS_PATH = join(process.cwd(), 'data', 'goals', 'reports.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ReportKPI {
  label: string;
  target?: number;
  actual: number;
  unit: string;
  achievementPct: number; // 0-100
  status: 'superado' | 'cumplido' | 'casi' | 'incumplido';
  delta: { vsPrev: number; vsPrevPct: number };
}

export interface ReportChartSeries {
  label: string;
  unit: string;
  data: Array<{ date: string; value: number }>;
}

export interface ReportNarrative {
  headline: string;
  executiveSummary: string;
  winsParagraph: string;
  missesParagraph: string;
  learnings: string[];
  nextPeriodFocus: string[];
}

export interface PeriodReport {
  id: string;
  horizon: GoalHorizon;
  period: { startsAt: string; endsAt: string; label: string };
  generatedAt: string;
  brand: { name: string; niche: string };
  // KPIs principales
  kpis: ReportKPI[];
  // Logros de metas
  goalsAchievement: {
    total: number;
    completed: number;
    failed: number;
    onTrack: number;
    completionRate: number; // % de metas completadas
    detailed: Array<{
      goalId: string;
      title: string;
      category: Goal['category'];
      target: number;
      actual: number;
      achievementPct: number;
      status: 'completed' | 'failed' | 'partial';
    }>;
  };
  // Charts (datos listos para visualizar)
  charts: {
    followers: ReportChartSeries;
    reach: ReportChartSeries;
    engagement: ReportChartSeries;
    postingFrequency: ReportChartSeries;
  };
  // Top performers
  topPosts: Array<{
    id: string;
    format: string;
    publishedAt: string;
    hook: string;
    reach: number;
    saves: number;
    engagementRate: number;
  }>;
  // Operación del equipo
  teamPerformance: Array<{
    agent: AgentId;
    name: string;
    tasksAssigned: number;
    tasksCompleted: number;
    completionRate: number;
    blockedCount: number;
  }>;
  // Eventos del período
  events: {
    total: number;
    byType: Record<string, number>;
    majorEvents: Array<{ title: string; date: string; type: string }>;
  };
  // Hitos celebrados
  milestones: ReturnType<typeof getMilestones>;
  // Promesas del período
  promises: {
    active: number;
    onTrack: number;
    atRisk: number;
    breached: number;
    fulfilled: number;
    items: Array<{
      id: string;
      title: string;
      status: string;
      progress: number;
      target: number;
      unit: string;
      deadline: string;
      projection: number;
    }>;
  };
  // Análisis narrativo
  narrative: ReportNarrative;
}

interface ReportsStore {
  version: number;
  reports: PeriodReport[];
  lastUpdated: string;
}

const DEFAULT_STORE: ReportsStore = { version: 1, reports: [], lastUpdated: new Date().toISOString() };

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'goals');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadReports = (): ReportsStore => {
  try {
    ensureDir();
    if (!existsSync(REPORTS_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(REPORTS_PATH, 'utf8')) as ReportsStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveReports = (store: ReportsStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(REPORTS_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const horizonLabel = (horizon: GoalHorizon, period: { startsAt: string; endsAt: string }): string => {
  const start = new Date(period.startsAt);
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  switch (horizon) {
    case 'weekly':
      return `Semana del ${start.getDate()} de ${months[start.getMonth()]}`;
    case 'monthly':
      return `${months[start.getMonth()]} ${start.getFullYear()}`;
    case 'quarterly':
      return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
    case 'annual':
      return `Año ${start.getFullYear()}`;
  }
};

const computeKPIs = (
  period: { startsAt: string; endsAt: string },
  previousPeriod: { startsAt: string; endsAt: string } | null,
): ReportKPI[] => {
  const periodPosts = getRecentPosts(365).filter(
    (p) => p.publishedAt >= period.startsAt && p.publishedAt <= period.endsAt,
  );
  const periodMetrics = getRecentDailyMetrics(365).filter(
    (d) => d.date >= period.startsAt.split('T')[0]! && d.date <= period.endsAt.split('T')[0]!,
  );

  const followersDelta = periodMetrics.reduce((s, d) => s + d.followersDelta, 0);
  const totalReach = periodPosts.reduce((s, p) => s + p.metrics.reach, 0);
  const totalSaves = periodPosts.reduce((s, p) => s + p.metrics.saves, 0);
  const avgEng =
    periodPosts.length > 0 ? periodPosts.reduce((s, p) => s + p.metrics.engagementRate, 0) / periodPosts.length : 0;

  // Datos del período anterior para comparar
  let prevFollowers = 0;
  let prevReach = 0;
  let prevEng = 0;
  if (previousPeriod) {
    const prevPosts = getRecentPosts(365).filter(
      (p) => p.publishedAt >= previousPeriod.startsAt && p.publishedAt <= previousPeriod.endsAt,
    );
    const prevMetrics = getRecentDailyMetrics(365).filter(
      (d) => d.date >= previousPeriod.startsAt.split('T')[0]! && d.date <= previousPeriod.endsAt.split('T')[0]!,
    );
    prevFollowers = prevMetrics.reduce((s, d) => s + d.followersDelta, 0);
    prevReach = prevPosts.reduce((s, p) => s + p.metrics.reach, 0);
    prevEng = prevPosts.length > 0 ? prevPosts.reduce((s, p) => s + p.metrics.engagementRate, 0) / prevPosts.length : 0;
  }

  const calcDelta = (cur: number, prev: number): { vsPrev: number; vsPrevPct: number } => ({
    vsPrev: cur - prev,
    vsPrevPct: prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : 0,
  });

  const statusFor = (actual: number, target?: number): ReportKPI['status'] => {
    if (target === undefined) return 'cumplido';
    const pct = (actual / target) * 100;
    if (pct >= 110) return 'superado';
    if (pct >= 90) return 'cumplido';
    if (pct >= 60) return 'casi';
    return 'incumplido';
  };

  return [
    {
      label: 'Crecimiento de seguidores',
      actual: followersDelta,
      unit: 'seguidores',
      achievementPct: 100,
      status: statusFor(followersDelta),
      delta: calcDelta(followersDelta, prevFollowers),
    },
    {
      label: 'Alcance total',
      actual: totalReach,
      unit: 'personas',
      achievementPct: 100,
      status: statusFor(totalReach),
      delta: calcDelta(totalReach, prevReach),
    },
    {
      label: 'Engagement rate promedio',
      actual: Number(avgEng.toFixed(2)),
      unit: '%',
      achievementPct: 100,
      status: statusFor(avgEng),
      delta: calcDelta(avgEng, prevEng),
    },
    {
      label: 'Posts publicados',
      actual: periodPosts.length,
      unit: 'posts',
      achievementPct: 100,
      status: 'cumplido',
      delta: { vsPrev: 0, vsPrevPct: 0 },
    },
    {
      label: 'Saves totales',
      actual: totalSaves,
      unit: 'saves',
      achievementPct: 100,
      status: 'cumplido',
      delta: { vsPrev: 0, vsPrevPct: 0 },
    },
  ];
};

const computeGoalsAchievement = (
  horizon: GoalHorizon,
  period: { startsAt: string; endsAt: string },
): PeriodReport['goalsAchievement'] => {
  const goalsInPeriod = listGoals({ horizon }).filter(
    (g) => g.startsAt >= period.startsAt && g.endsAt <= period.endsAt,
  );
  const detailed = goalsInPeriod.map((g) => ({
    goalId: g.id,
    title: g.title,
    category: g.category,
    target: g.target.value,
    actual: Math.round(g.target.value * (g.progress / 100)),
    achievementPct: g.progress,
    status: (g.progress >= 100 ? 'completed' : g.progress >= 60 ? 'partial' : 'failed') as
      | 'completed'
      | 'failed'
      | 'partial',
  }));

  const completed = detailed.filter((g) => g.status === 'completed').length;
  const failed = detailed.filter((g) => g.status === 'failed').length;
  const onTrack = detailed.filter((g) => g.status === 'partial').length;

  return {
    total: goalsInPeriod.length,
    completed,
    failed,
    onTrack,
    completionRate: goalsInPeriod.length > 0 ? (completed / goalsInPeriod.length) * 100 : 0,
    detailed,
  };
};

const computeCharts = (period: { startsAt: string; endsAt: string }): PeriodReport['charts'] => {
  const periodMetrics = getRecentDailyMetrics(365).filter(
    (d) => d.date >= period.startsAt.split('T')[0]! && d.date <= period.endsAt.split('T')[0]!,
  );
  const periodPosts = getRecentPosts(365).filter(
    (p) => p.publishedAt >= period.startsAt && p.publishedAt <= period.endsAt,
  );

  // Followers timeline
  const followers: ReportChartSeries = {
    label: 'Seguidores totales',
    unit: 'seguidores',
    data: periodMetrics.map((d) => ({ date: d.date, value: d.followers })),
  };

  // Reach (suma diaria de alcance de posts)
  const reachByDate = new Map<string, number>();
  for (const p of periodPosts) {
    const date = p.publishedAt.split('T')[0]!;
    reachByDate.set(date, (reachByDate.get(date) ?? 0) + p.metrics.reach);
  }
  const reach: ReportChartSeries = {
    label: 'Alcance diario',
    unit: 'personas',
    data: [...reachByDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value })),
  };

  // Engagement rate diario promedio
  const engByDate = new Map<string, { total: number; count: number }>();
  for (const p of periodPosts) {
    const date = p.publishedAt.split('T')[0]!;
    const cur = engByDate.get(date) ?? { total: 0, count: 0 };
    engByDate.set(date, { total: cur.total + p.metrics.engagementRate, count: cur.count + 1 });
  }
  const engagement: ReportChartSeries = {
    label: 'Engagement rate diario',
    unit: '%',
    data: [...engByDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({
        date,
        value: Number((d.total / d.count).toFixed(2)),
      })),
  };

  // Posting frequency (posts por día)
  const postsByDate = new Map<string, number>();
  for (const p of periodPosts) {
    const date = p.publishedAt.split('T')[0]!;
    postsByDate.set(date, (postsByDate.get(date) ?? 0) + 1);
  }
  const postingFrequency: ReportChartSeries = {
    label: 'Frecuencia de publicación',
    unit: 'posts',
    data: [...postsByDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value })),
  };

  return { followers, reach, engagement, postingFrequency };
};

const computeTeamPerformance = (period: { startsAt: string; endsAt: string }): PeriodReport['teamPerformance'] => {
  const board = exportBoardState();
  const agents = Object.keys(AGENT_SPECIALTIES) as AgentId[];
  return agents
    .map((agent) => {
      const myTasks = board.tasks.filter(
        (t) => t.assignedTo === agent && t.createdAt >= period.startsAt && t.createdAt <= period.endsAt,
      );
      const completed = myTasks.filter((t) => t.status === 'done').length;
      const blocked = myTasks.filter((t) => t.status === 'blocked').length;
      return {
        agent,
        name: AGENT_SPECIALTIES[agent].name,
        tasksAssigned: myTasks.length,
        tasksCompleted: completed,
        completionRate: myTasks.length > 0 ? (completed / myTasks.length) * 100 : 0,
        blockedCount: blocked,
      };
    })
    .sort((a, b) => b.tasksAssigned - a.tasksAssigned);
};

// ── Narrativa por IA ──────────────────────────────────────────────────────────

const buildNarrative = async (
  brand: BrandProfile,
  horizon: GoalHorizon,
  kpis: ReportKPI[],
  goalsAchievement: PeriodReport['goalsAchievement'],
  topPosts: PeriodReport['topPosts'],
): Promise<ReportNarrative> => {
  const summary = `
KPIs principales:
${kpis.map((k) => `- ${k.label}: ${k.actual} ${k.unit} (delta ${k.delta.vsPrevPct >= 0 ? '+' : ''}${k.delta.vsPrevPct.toFixed(1)}% vs período anterior)`).join('\n')}

Metas:
- Total: ${goalsAchievement.total}
- Completadas: ${goalsAchievement.completed}
- Parciales: ${goalsAchievement.onTrack}
- Fallidas: ${goalsAchievement.failed}
- Tasa de cumplimiento: ${goalsAchievement.completionRate.toFixed(1)}%

Top posts del período:
${topPosts
  .slice(0, 3)
  .map((p) => `- "${p.hook}" (${p.format}, ${p.reach.toLocaleString('es-AR')} alcance, ${p.saves} saves)`)
  .join('\n')}

Patrones detectados:
${JSON.stringify(extractPatterns().topTopics.slice(0, 3))}
`;

  const prompt = `Generá la narrativa del reporte ${horizon} para @${brand.name} (${brand.niche}).

DATOS DEL PERÍODO:
${summary}

Tono: directo, motivador pero honesto. Sin floritura corporativa.

JSON:
{
  "headline": "1 línea que capture lo más importante",
  "executiveSummary": "1 párrafo de 4-6 líneas con el resumen del período",
  "winsParagraph": "1 párrafo destacando lo que SÍ funcionó",
  "missesParagraph": "1 párrafo siendo honesto con lo que NO funcionó",
  "learnings": ["3-5 aprendizajes accionables"],
  "nextPeriodFocus": ["3-4 prioridades para el próximo período"]
}`;

  return routerAskJson<ReportNarrative>(prompt, {
    taskType: 'analysis',
    maxTokens: 2500,
    systemPrompt:
      'Sos un analista de marketing senior. Tus reportes son específicos, honestos y orientados a la acción.',
  });
};

// ── Generación de reporte ─────────────────────────────────────────────────────

export const generatePeriodReport = async (
  brand: BrandProfile,
  horizon: GoalHorizon,
  reference: Date = new Date(),
): Promise<PeriodReport> => {
  log.info(`[PeriodReport] Generando reporte ${horizon} para @${brand.name}...`);
  const t0 = Date.now();

  const period = periodBoundaries(horizon, reference);
  const previousReference = new Date(new Date(period.startsAt).getTime() - 86400000);
  const previousPeriod = periodBoundaries(horizon, previousReference);

  const kpis = computeKPIs(period, previousPeriod);
  const goalsAchievement = computeGoalsAchievement(horizon, period);
  const charts = computeCharts(period);
  const teamPerformance = computeTeamPerformance(period);

  // Top posts del período
  const periodPosts = getRecentPosts(365).filter(
    (p) => p.publishedAt >= period.startsAt && p.publishedAt <= period.endsAt,
  );
  const topPosts = periodPosts
    .sort((a, b) => b.actualScore - a.actualScore)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      format: p.format,
      publishedAt: p.publishedAt,
      hook: p.hookText,
      reach: p.metrics.reach,
      saves: p.metrics.saves,
      engagementRate: p.metrics.engagementRate,
    }));

  // Eventos
  const evts = listEvents({ from: period.startsAt.split('T')[0], to: period.endsAt.split('T')[0] });
  const byType: Record<string, number> = {};
  evts.forEach((e) => {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  });

  // Promesas del período
  const promisesInPeriod = listPromises().filter((p) => p.createdAt >= period.startsAt && p.createdAt <= period.endsAt);
  const promiseItems = promisesInPeriod.map((p) => {
    const proj = getPromiseProjections(p);
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      progress: p.progress,
      target: p.metric.target,
      unit: p.metric.unit,
      deadline: p.deadline,
      projection: proj.projectedProgress,
    };
  });

  const narrative = await buildNarrative(brand, horizon, kpis, goalsAchievement, topPosts);

  const report: PeriodReport = {
    id: `report-${horizon}-${period.startsAt.split('T')[0]}-${Date.now()}`,
    horizon,
    period: { ...period, label: horizonLabel(horizon, period) },
    generatedAt: new Date().toISOString(),
    brand: { name: brand.name, niche: brand.niche },
    kpis,
    goalsAchievement,
    charts,
    topPosts,
    teamPerformance,
    events: {
      total: evts.length,
      byType,
      majorEvents: evts
        .filter((e) => e.type === 'launch' || e.type === 'campaign' || e.type === 'milestone')
        .map((e) => ({ title: e.title, date: e.startsAt.split('T')[0]!, type: e.type })),
    },
    milestones: getMilestones(20).filter((m) => m.achievedAt >= period.startsAt && m.achievedAt <= period.endsAt),
    promises: {
      active: promisesInPeriod.filter((p) => ['pending', 'active', 'on-track', 'at-risk'].includes(p.status)).length,
      onTrack: promisesInPeriod.filter((p) => p.status === 'on-track').length,
      atRisk: promisesInPeriod.filter((p) => p.status === 'at-risk').length,
      breached: promisesInPeriod.filter((p) => p.status === 'breached').length,
      fulfilled: promisesInPeriod.filter((p) => p.status === 'fulfilled').length,
      items: promiseItems,
    },
    narrative,
  };

  // Persistir
  const store = loadReports();
  store.reports.push(report);
  if (store.reports.length > 100) store.reports = store.reports.slice(-100);
  saveReports(store);

  log.info(`[PeriodReport] Reporte ${horizon} generado en ${Math.round((Date.now() - t0) / 1000)}s`);
  return report;
};

// ── Envío y formato textual del reporte ──────────────────────────────────────

export const reportToText = (report: PeriodReport): string => {
  const lines: string[] = [];
  lines.push(`# 📊 Reporte ${report.period.label} · @${report.brand.name}`);
  lines.push('');
  lines.push(`**${report.narrative.headline}**`);
  lines.push('');
  lines.push(report.narrative.executiveSummary);
  lines.push('');
  lines.push('## KPIs');
  for (const k of report.kpis) {
    const emoji = k.status === 'superado' ? '🚀' : k.status === 'cumplido' ? '✅' : k.status === 'casi' ? '🟡' : '❌';
    const delta =
      k.delta.vsPrevPct !== 0 ? ` (${k.delta.vsPrevPct >= 0 ? '+' : ''}${k.delta.vsPrevPct.toFixed(1)}% vs prev)` : '';
    lines.push(`${emoji} ${k.label}: **${k.actual.toLocaleString('es-AR')} ${k.unit}**${delta}`);
  }
  lines.push('');
  lines.push('## Metas');
  lines.push(
    `- Total: ${report.goalsAchievement.total} | Completadas: ${report.goalsAchievement.completed} | Fallidas: ${report.goalsAchievement.failed}`,
  );
  lines.push(`- Tasa de cumplimiento: ${report.goalsAchievement.completionRate.toFixed(1)}%`);
  for (const g of report.goalsAchievement.detailed) {
    const emoji = g.status === 'completed' ? '✅' : g.status === 'failed' ? '❌' : '🟡';
    lines.push(`  ${emoji} ${g.title}: ${g.actual}/${g.target} (${g.achievementPct.toFixed(0)}%)`);
  }
  lines.push('');
  lines.push('## Wins de la operación');
  lines.push(report.narrative.winsParagraph);
  lines.push('');
  lines.push('## Aprendizajes y áreas de mejora');
  lines.push(report.narrative.missesParagraph);
  for (const l of report.narrative.learnings) lines.push(`• ${l}`);
  lines.push('');
  lines.push('## Top posts del período');
  for (const p of report.topPosts.slice(0, 3)) {
    lines.push(
      `• "${p.hook}" (${p.format}) — ${p.reach.toLocaleString('es-AR')} alcance / ${p.saves} saves / ${p.engagementRate.toFixed(2)}% engagement`,
    );
  }
  lines.push('');
  lines.push('## Foco para el próximo período');
  for (const f of report.narrative.nextPeriodFocus) lines.push(`→ ${f}`);
  lines.push('');
  lines.push(`_Reporte generado el ${new Date(report.generatedAt).toLocaleDateString('es-AR')}_`);
  return lines.join('\n');
};

export const sendReportAlert = async (brand: BrandProfile, report: PeriodReport): Promise<void> => {
  await sendAlert({
    severity: 'reporte',
    title: `Reporte ${report.period.label} · @${brand.name}`,
    body: reportToText(report).slice(0, 3000),
    metadata: {
      reportId: report.id,
      horizon: report.horizon,
      completionRate: report.goalsAchievement.completionRate,
    },
  }).catch((err) => log.warn(`[PeriodReport] No se pudo enviar alerta: ${(err as Error).message}`));
};

// ── Listado / consulta de reportes anteriores ────────────────────────────────

export const listReports = (horizon?: GoalHorizon, limit = 20): PeriodReport[] => {
  const reports = loadReports().reports;
  const filtered = horizon ? reports.filter((r) => r.horizon === horizon) : reports;
  return filtered.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)).slice(0, limit);
};

export const getReport = (reportId: string): PeriodReport | null =>
  loadReports().reports.find((r) => r.id === reportId) ?? null;

// ── Health check del sistema (snapshot completo) ─────────────────────────────

export const getSystemSnapshot = (): {
  goals: ReturnType<typeof getGoalsSnapshot>;
  goalsHealth: ReturnType<typeof checkGoalsHealth>;
  accountSummary: ReturnType<typeof getAccountSummary>;
  boost: ReturnType<typeof getBoostStats>;
  reportsCount: number;
} => ({
  goals: getGoalsSnapshot(),
  goalsHealth: checkGoalsHealth(),
  accountSummary: getAccountSummary(),
  boost: getBoostStats(),
  reportsCount: loadReports().reports.length,
});

// ── Goals burndown snapshot (helper para reportes técnicos) ─────────────────

export const getGoalsBurndownSnapshot = (
  horizon: GoalHorizon,
): Array<{
  goalId: string;
  title: string;
  burndown: ReturnType<typeof getBurndownForGoal>;
}> => {
  const goals = listGoals({ horizon, status: 'active' });
  return goals.map((g) => ({
    goalId: g.id,
    title: g.title,
    burndown: getBurndownForGoal(g.id),
  }));
};
