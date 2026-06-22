/**
 * Executive Command Center — orquestador que une digest + decisiones + OKR + autopilot status
 * en un único bundle ejecutivo listo para frontend.
 *
 * Sin Anthropic call directo.
 */

import { log } from '../../agent/logger.js';
import {
  getLatestDigest,
  generateDigest,
  computeMetricSummary,
  type ExecutiveDigest,
  type DigestHighlight,
} from './executiveDigest.js';
import { listPending, getDecisionStats, expireOldDecisions, type ExecutiveDecision } from './executiveDecisionQueue.js';
import { getOKRSummary, listActiveObjectives, type Objective } from './executiveOKR.js';

export interface CommandCenterBundle {
  brandId: string;
  timestamp: string;
  digest: ExecutiveDigest;
  pendingDecisions: ExecutiveDecision[];
  criticalDecisions: ExecutiveDecision[];
  okrSummary: Awaited<ReturnType<typeof getOKRSummary>>;
  activeObjectives: Objective[];
  decisionStats: Awaited<ReturnType<typeof getDecisionStats>>;
  systemPulse: {
    brainModulesOnline: number;
    autopilotEnabled: boolean;
    last24hActions: number;
    backlogSize: number;
    healthScore: number;
  };
  quickActions: Array<{
    id: string;
    label: string;
    description: string;
    route?: string;
    skill?: string;
    emoji: string;
  }>;
  topInsights: Array<{ icon: string; text: string; weight: number }>;
}

const QUICK_ACTIONS: CommandCenterBundle['quickActions'] = [
  {
    id: 'qa-1',
    label: 'Revisar propuestas',
    description: 'Decisiones esperando tu aprobación',
    emoji: '💡',
    route: 'imperio',
  },
  {
    id: 'qa-2',
    label: 'Generar contenido',
    description: 'Carrusel / Reel / Story con un prompt',
    emoji: '✨',
    route: 'studio-carousel',
  },
  { id: 'qa-3', label: 'Auditar cuenta', description: 'Diagnóstico completo + plan 30d', emoji: '🔍', route: 'audit' },
  {
    id: 'qa-4',
    label: 'Boost reel ganador',
    description: 'Promocionar el mejor de la semana',
    emoji: '🚀',
    skill: 'feedIA-meta-ads',
  },
  { id: 'qa-5', label: 'Replanificar OKR', description: 'Ajustar metas trimestrales', emoji: '🎯', route: 'imperio' },
  {
    id: 'qa-6',
    label: 'Activar Autopilot',
    description: 'Que el sistema decida + ejecute solo',
    emoji: '🤖',
    route: 'autopilot',
  },
];

const computeSystemPulse = (
  decisions: ExecutiveDecision[],
  objectives: Objective[],
): CommandCenterBundle['systemPulse'] => {
  const last24hCutoff = Date.now() - 86_400_000;
  const recentDecisions = decisions.filter((d) => new Date(d.createdAt).getTime() >= last24hCutoff);
  const last24hActions = recentDecisions.filter((d) => d.status === 'approved' || d.status === 'auto-executed').length;
  const backlogSize = decisions.filter((d) => d.status === 'pending').length;
  const onTrackCount = objectives.filter((o) => o.status === 'on-track' || o.status === 'ahead').length;
  const healthScore =
    objectives.length > 0 ? Math.round((onTrackCount / objectives.length) * 100 - Math.min(20, backlogSize * 2)) : 75;
  return {
    brainModulesOnline: 35,
    autopilotEnabled: true,
    last24hActions,
    backlogSize,
    healthScore: Math.max(0, Math.min(100, healthScore)),
  };
};

const extractTopInsights = (
  digest: ExecutiveDigest,
  okrSummary: Awaited<ReturnType<typeof getOKRSummary>>,
  decisions: ExecutiveDecision[],
): CommandCenterBundle['topInsights'] => {
  const insights: CommandCenterBundle['topInsights'] = [];

  if (digest.health === 'thriving') {
    insights.push({ icon: '🚀', text: 'Negocio en estado óptimo — momento de escalar inversión', weight: 9 });
  } else if (digest.health === 'critical') {
    insights.push({ icon: '🚨', text: 'Estado crítico — múltiples indicadores en rojo', weight: 10 });
  }

  if (okrSummary.behind > 0) {
    insights.push({
      icon: '📉',
      text: `${okrSummary.behind} OKR${okrSummary.behind === 1 ? '' : 's'} atrasado${okrSummary.behind === 1 ? '' : 's'} — replan necesario`,
      weight: 8,
    });
  }

  if (okrSummary.topConcern) {
    insights.push({
      icon: '⚠️',
      text: `${okrSummary.topConcern.objectiveTitle}: ${okrSummary.topConcern.krDescription} (gap ${okrSummary.topConcern.gap.toFixed(0)}%)`,
      weight: 7,
    });
  }

  const critDecisions = decisions.filter((d) => d.urgency === 'critical' && d.status === 'pending').length;
  if (critDecisions > 0) {
    insights.push({
      icon: '🔴',
      text: `${critDecisions} decisión${critDecisions === 1 ? '' : 'es'} crítica${critDecisions === 1 ? '' : 's'} esperando`,
      weight: 10,
    });
  }

  const topMetricUp = digest.metrics.find((m) => m.trend === 'up' && m.changePct > 20);
  if (topMetricUp) {
    insights.push({
      icon: '📈',
      text: `${topMetricUp.name} +${topMetricUp.changePct.toFixed(0)}% — replicar lo que está funcionando`,
      weight: 6,
    });
  }

  const topMetricDown = digest.metrics.find((m) => m.trend === 'down' && Math.abs(m.changePct) > 15);
  if (topMetricDown) {
    insights.push({
      icon: '📉',
      text: `${topMetricDown.name} ${topMetricDown.changePct.toFixed(0)}% — investigar causa`,
      weight: 7,
    });
  }

  return insights.sort((a, b) => b.weight - a.weight).slice(0, 6);
};

export const buildCommandCenterBundle = async (
  brandId: string,
  metricsInput?: Array<{ name: string; current: number; previous: number; higherIsBetter?: boolean; emoji?: string }>,
): Promise<CommandCenterBundle> => {
  await expireOldDecisions(brandId);

  let digest = await getLatestDigest(brandId, 'daily');
  const digestStale = !digest || Date.now() - new Date(digest.generatedAt).getTime() > 12 * 3_600_000;

  if (digestStale) {
    const defaultMetrics = (
      metricsInput ?? [
        { name: 'Alcance', current: 0, previous: 0, emoji: '👁️' },
        { name: 'Engagement', current: 0, previous: 0, emoji: '💜' },
        { name: 'Seguidores', current: 0, previous: 0, emoji: '👥' },
        { name: 'Conversiones', current: 0, previous: 0, emoji: '💰' },
      ]
    ).map((m) =>
      computeMetricSummary(m.name, m.current, m.previous, { higherIsBetter: m.higherIsBetter, emoji: m.emoji }),
    );

    const pendingDecisions = await listPending(brandId);
    const criticalDecisions = pendingDecisions.filter((d) => d.urgency === 'critical');

    const highlights: DigestHighlight[] = [];
    if (criticalDecisions.length > 0) {
      highlights.push({
        type: 'risk',
        emoji: '🚨',
        text: `${criticalDecisions.length} decisión${criticalDecisions.length === 1 ? '' : 'es'} crítica${criticalDecisions.length === 1 ? '' : 's'} pendiente${criticalDecisions.length === 1 ? '' : 's'}`,
        impact: 'high',
        actionable: { label: 'Revisar', route: 'imperio' },
      });
    }
    const upMetrics = defaultMetrics.filter((m) => m.trend === 'up' && m.changePct > 10);
    for (const m of upMetrics.slice(0, 2)) {
      highlights.push({ type: 'win', emoji: '🚀', text: `${m.name} subió ${m.changePct.toFixed(0)}%`, impact: 'high' });
    }

    digest = await generateDigest({
      brandId,
      period: 'daily',
      metrics: defaultMetrics,
      highlights,
      pendingDecisionsCount: pendingDecisions.length,
      criticalDecisionsCount: criticalDecisions.length,
      autoActionsLast24h: 0,
    });
  }

  if (!digest) {
    throw new Error('executiveCommandCenter: digest could not be loaded or generated');
  }

  const pendingDecisions = await listPending(brandId);
  const criticalDecisions = pendingDecisions.filter((d) => d.urgency === 'critical');
  const okrSummary = await getOKRSummary(brandId);
  const activeObjectives = await listActiveObjectives(brandId);
  const decisionStats = await getDecisionStats(brandId);

  const bundle: CommandCenterBundle = {
    brandId,
    timestamp: new Date().toISOString(),
    digest,
    pendingDecisions: pendingDecisions.slice(0, 20),
    criticalDecisions,
    okrSummary,
    activeObjectives,
    decisionStats,
    systemPulse: computeSystemPulse(pendingDecisions, activeObjectives),
    quickActions: QUICK_ACTIONS,
    topInsights: extractTopInsights(digest, okrSummary, pendingDecisions),
  };

  log.info('[executiveCommandCenter] bundle built', {
    brandId,
    pending: pendingDecisions.length,
    okrs: activeObjectives.length,
  });
  return bundle;
};
