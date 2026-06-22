/**
 * Executive Digest — sintetiza estado completo del negocio en 1 página ejecutiva diaria.
 *
 * Agrega: métricas (alcance, engagement, conversiones), decisiones pendientes,
 * anomalías, oportunidades, riesgos, próximas acciones.
 *
 * Sin Anthropic call directo. Smart synth via templates + reglas.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const DIGEST_DIR = path.resolve('data/executive/digests');

export type DigestPeriod = 'daily' | 'weekly' | 'monthly';
export type HealthLevel = 'thriving' | 'healthy' | 'steady' | 'concerning' | 'critical';

export interface MetricSummary {
  name: string;
  current: number;
  previous: number;
  changePct: number;
  trend: 'up' | 'down' | 'flat';
  emoji: string;
  isGood: boolean;
}

export interface DigestHighlight {
  type: 'win' | 'concern' | 'opportunity' | 'risk';
  emoji: string;
  text: string;
  impact: 'high' | 'medium' | 'low';
  actionable?: { label: string; route?: string; skill?: string };
}

export interface ExecutiveDigest {
  id: string;
  brandId: string;
  period: DigestPeriod;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  health: HealthLevel;
  headline: string;
  oneLineStatus: string;
  metrics: MetricSummary[];
  highlights: DigestHighlight[];
  topWin: string;
  topConcern?: string;
  pendingDecisionsCount: number;
  criticalDecisionsCount: number;
  nextBestActions: Array<{ priority: number; action: string; reason: string; estimatedImpact: string }>;
  brainModulesActiveCount: number;
  autoActionsLast24h: number;
  hoursSavedThisPeriod: number;
  estimatedRevenueImpactUsd: number;
  narrative: string;
}

const digestPath = (brandId: string, id: string): string => path.join(DIGEST_DIR, `${brandId}-${id}.json`);

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(DIGEST_DIR, { recursive: true });
};

const determineHealth = (metrics: MetricSummary[]): HealthLevel => {
  const goodCount = metrics.filter((m) => m.isGood && m.trend === 'up').length;
  const ratio = metrics.length > 0 ? goodCount / metrics.length : 0.5;
  if (ratio > 0.75) return 'thriving';
  if (ratio > 0.55) return 'healthy';
  if (ratio > 0.4) return 'steady';
  if (ratio > 0.25) return 'concerning';
  return 'critical';
};

const buildHeadline = (health: HealthLevel, topMetric?: MetricSummary): string => {
  const headlines: Record<HealthLevel, string[]> = {
    thriving: ['Tu marca está volando 🚀', 'Semana récord — momentum sostenido', 'Crecimiento compuesto activado'],
    healthy: ['Marcha firme — todo bajo control', 'Resultados consistentes', 'Sistema operando óptimo'],
    steady: [
      'Estable — buscando próximo catalyst',
      'Plateau saludable, listo para experimentar',
      'Foundations sólidas',
    ],
    concerning: [
      'Atención: hay señales que mirar',
      'Algo se está desviando — revisemos',
      'Momentum bajó, hora de ajustar',
    ],
    critical: [
      'Acción requerida: múltiples flags activos',
      'Alerta: revisar inmediatamente',
      'Crítico: intervención necesaria',
    ],
  };
  const list = headlines[health];
  const base = list[Math.floor(Math.random() * list.length)]!;
  if (topMetric && Math.abs(topMetric.changePct) > 15) {
    return `${base} · ${topMetric.name} ${topMetric.changePct > 0 ? '+' : ''}${topMetric.changePct.toFixed(0)}%`;
  }
  return base;
};

const buildNarrative = (
  digest: Pick<
    ExecutiveDigest,
    'health' | 'metrics' | 'topWin' | 'topConcern' | 'pendingDecisionsCount' | 'autoActionsLast24h'
  >,
): string => {
  const parts: string[] = [];
  const healthDescriptor: Record<HealthLevel, string> = {
    thriving: 'Tu negocio está en excelente forma.',
    healthy: 'Las cosas marchan bien.',
    steady: 'Operación estable.',
    concerning: 'Hay señales que requieren atención.',
    critical: 'Estado crítico: varios indicadores en rojo.',
  };
  parts.push(healthDescriptor[digest.health]);
  if (digest.topWin) parts.push(`Lo mejor: ${digest.topWin}.`);
  if (digest.topConcern) parts.push(`Lo que vigilar: ${digest.topConcern}.`);
  if (digest.autoActionsLast24h > 0)
    parts.push(`El sistema ejecutó ${digest.autoActionsLast24h} acciones autónomas en las últimas 24h.`);
  if (digest.pendingDecisionsCount > 0)
    parts.push(
      `Tenés ${digest.pendingDecisionsCount} decisión${digest.pendingDecisionsCount === 1 ? '' : 'es'} esperando tu mirada.`,
    );
  return parts.join(' ');
};

export const computeMetricSummary = (
  name: string,
  current: number,
  previous: number,
  opts: { higherIsBetter?: boolean; emoji?: string } = {},
): MetricSummary => {
  const higherIsBetter = opts.higherIsBetter ?? true;
  const changePct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const trend: 'up' | 'down' | 'flat' = Math.abs(changePct) < 2 ? 'flat' : changePct > 0 ? 'up' : 'down';
  const isGood = higherIsBetter ? trend !== 'down' : trend !== 'up';
  return { name, current, previous, changePct, trend, emoji: opts.emoji ?? '📊', isGood };
};

export const generateDigest = async (params: {
  brandId: string;
  period?: DigestPeriod;
  metrics: MetricSummary[];
  highlights?: DigestHighlight[];
  pendingDecisionsCount?: number;
  criticalDecisionsCount?: number;
  autoActionsLast24h?: number;
  brainModulesActiveCount?: number;
  nextBestActions?: ExecutiveDigest['nextBestActions'];
  hoursSavedThisPeriod?: number;
  estimatedRevenueImpactUsd?: number;
}): Promise<ExecutiveDigest> => {
  const period = params.period ?? 'daily';
  const now = new Date();
  const periodMs = period === 'daily' ? 86_400_000 : period === 'weekly' ? 7 * 86_400_000 : 30 * 86_400_000;
  const periodStart = new Date(now.getTime() - periodMs).toISOString();

  const health = determineHealth(params.metrics);
  const topMetric = [...params.metrics].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];

  const wins = (params.highlights ?? [])
    .filter((h) => h.type === 'win')
    .sort((a, _b) => (a.impact === 'high' ? -1 : 1));
  const concerns = (params.highlights ?? [])
    .filter((h) => h.type === 'concern' || h.type === 'risk')
    .sort((a, _b) => (a.impact === 'high' ? -1 : 1));

  const digest: ExecutiveDigest = {
    id: `dig-${period}-${Date.now()}`,
    brandId: params.brandId,
    period,
    periodStart,
    periodEnd: now.toISOString(),
    generatedAt: now.toISOString(),
    health,
    headline: buildHeadline(health, topMetric),
    oneLineStatus: topMetric
      ? `${topMetric.emoji} ${topMetric.name}: ${topMetric.changePct > 0 ? '+' : ''}${topMetric.changePct.toFixed(1)}% vs período anterior`
      : 'Sin datos suficientes',
    metrics: params.metrics,
    highlights: params.highlights ?? [],
    topWin: wins[0]?.text ?? 'Aún sin highlight destacado este período',
    topConcern: concerns[0]?.text,
    pendingDecisionsCount: params.pendingDecisionsCount ?? 0,
    criticalDecisionsCount: params.criticalDecisionsCount ?? 0,
    nextBestActions: params.nextBestActions ?? [],
    brainModulesActiveCount: params.brainModulesActiveCount ?? 35,
    autoActionsLast24h: params.autoActionsLast24h ?? 0,
    hoursSavedThisPeriod: params.hoursSavedThisPeriod ?? 0,
    estimatedRevenueImpactUsd: params.estimatedRevenueImpactUsd ?? 0,
    narrative: '',
  };
  digest.narrative = buildNarrative(digest);

  await ensureDir();
  await fs.writeFile(digestPath(params.brandId, digest.id), JSON.stringify(digest, null, 2), 'utf-8');
  log.info('[executiveDigest] generated', { brandId: params.brandId, period, health });
  return digest;
};

export const getLatestDigest = async (
  brandId: string,
  period: DigestPeriod = 'daily',
): Promise<ExecutiveDigest | null> => {
  try {
    await ensureDir();
    const files = await fs.readdir(DIGEST_DIR);
    const matching = files.filter((f) => f.startsWith(`${brandId}-dig-${period}-`));
    if (matching.length === 0) return null;
    const sorted = matching.sort().reverse();
    return JSON.parse(await fs.readFile(path.join(DIGEST_DIR, sorted[0]!), 'utf-8')) as ExecutiveDigest;
  } catch {
    return null;
  }
};

export const listDigests = async (brandId: string, limit = 30): Promise<ExecutiveDigest[]> => {
  try {
    await ensureDir();
    const files = await fs.readdir(DIGEST_DIR);
    const matching = files
      .filter((f) => f.startsWith(`${brandId}-dig-`))
      .sort()
      .reverse()
      .slice(0, limit);
    const digests: ExecutiveDigest[] = [];
    for (const f of matching) {
      try {
        digests.push(JSON.parse(await fs.readFile(path.join(DIGEST_DIR, f), 'utf-8')) as ExecutiveDigest);
      } catch {
        /* skip */
      }
    }
    return digests;
  } catch {
    return [];
  }
};
