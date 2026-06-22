/**
 * Executive OKR Tracker — OKRs autónomos con progreso medido + alertas.
 *
 * Genera OKRs trimestrales/mensuales por brand, trackea key results,
 * predice si llegará al goal, sugiere ajustes si va atrasado.
 *
 * Sin Anthropic call directo.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const OKR_DIR = path.resolve('data/executive/okr');

export type OKRPeriod = 'month' | 'quarter' | 'year';
export type OKRStatus = 'on-track' | 'at-risk' | 'behind' | 'ahead' | 'completed' | 'abandoned';
export type KRMetricType = 'count' | 'percent' | 'currency' | 'ratio' | 'time-minutes';

export interface KeyResult {
  id: string;
  description: string;
  metricType: KRMetricType;
  baseline: number;
  target: number;
  current: number;
  progressPct: number;
  status: OKRStatus;
  lastUpdated: string;
  weeklyProgress: Array<{ week: string; value: number }>;
  trend: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  projectedFinal: number;
  projectedHitsTarget: boolean;
}

export interface Objective {
  id: string;
  brandId: string;
  period: OKRPeriod;
  periodStart: string;
  periodEnd: string;
  title: string;
  description: string;
  category: 'growth' | 'engagement' | 'revenue' | 'brand' | 'efficiency' | 'community';
  keyResults: KeyResult[];
  overallProgressPct: number;
  status: OKRStatus;
  createdAt: string;
  lastReview?: string;
  weeksRemaining: number;
  recommendations: string[];
}

const okrPath = (brandId: string): string => path.join(OKR_DIR, `${brandId}-okrs.json`);

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(OKR_DIR, { recursive: true });
};

const loadObjectives = async (brandId: string): Promise<Objective[]> => {
  try {
    return JSON.parse(await fs.readFile(okrPath(brandId), 'utf-8')) as Objective[];
  } catch {
    return [];
  }
};

const saveObjectives = async (brandId: string, objectives: Objective[]): Promise<void> => {
  await ensureDir();
  await fs.writeFile(okrPath(brandId), JSON.stringify(objectives, null, 2), 'utf-8');
};

const computeKRProgress = (kr: Pick<KeyResult, 'baseline' | 'target' | 'current'>): number => {
  const range = kr.target - kr.baseline;
  if (range === 0) return kr.current >= kr.target ? 100 : 0;
  const pct = ((kr.current - kr.baseline) / range) * 100;
  return Math.max(0, Math.min(100, pct));
};

const computeTrend = (weeklyProgress: KeyResult['weeklyProgress']): KeyResult['trend'] => {
  if (weeklyProgress.length < 3) return 'steady';
  const recent = weeklyProgress.slice(-3);
  const deltas: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    deltas.push(recent[i]!.value - recent[i - 1]!.value);
  }
  if (deltas.every((d) => d === 0)) return 'stalled';
  const avgDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const lastDelta = deltas[deltas.length - 1]!;
  if (lastDelta > avgDelta * 1.3) return 'accelerating';
  if (lastDelta < avgDelta * 0.7 && avgDelta > 0) return 'decelerating';
  return 'steady';
};

const projectKRFinal = (
  kr: Pick<KeyResult, 'baseline' | 'current' | 'weeklyProgress'>,
  weeksRemaining: number,
): number => {
  if (kr.weeklyProgress.length === 0) return kr.current;
  const recent = kr.weeklyProgress.slice(-4);
  if (recent.length < 2) return kr.current;
  const totalDelta = recent[recent.length - 1]!.value - recent[0]!.value;
  const weeklyRate = totalDelta / (recent.length - 1);
  return kr.current + weeklyRate * weeksRemaining;
};

const determineKRStatus = (
  progressPct: number,
  weeksElapsed: number,
  weeksTotal: number,
  projectedHitsTarget: boolean,
): OKRStatus => {
  if (progressPct >= 100) return 'completed';
  const expectedPct = weeksTotal > 0 ? (weeksElapsed / weeksTotal) * 100 : 0;
  if (projectedHitsTarget && progressPct >= expectedPct * 1.1) return 'ahead';
  if (projectedHitsTarget && progressPct >= expectedPct * 0.85) return 'on-track';
  if (progressPct >= expectedPct * 0.6) return 'at-risk';
  return 'behind';
};

const generateRecommendations = (objective: Objective): string[] => {
  const recs: string[] = [];
  const behindKRs = objective.keyResults.filter((kr) => kr.status === 'behind' || kr.status === 'at-risk');

  for (const kr of behindKRs) {
    if (kr.trend === 'stalled') {
      recs.push(`KR "${kr.description}" estancado — cambiar táctica o re-priorizar`);
    } else if (kr.trend === 'decelerating') {
      recs.push(`KR "${kr.description}" frenando — invertir más recursos o A/B test nuevo enfoque`);
    } else if (!kr.projectedHitsTarget) {
      const gap = kr.target - kr.projectedFinal;
      recs.push(
        `KR "${kr.description}" cierra ~${kr.projectedFinal.toFixed(0)} vs target ${kr.target} (gap ${gap.toFixed(0)})`,
      );
    }
  }

  const acceleratingKRs = objective.keyResults.filter((kr) => kr.trend === 'accelerating');
  if (acceleratingKRs.length > 0) {
    recs.push(
      `Duplicar inversión en lo que está acelerando: ${acceleratingKRs.map((k) => k.description.slice(0, 40)).join(', ')}`,
    );
  }

  if (objective.weeksRemaining < 2 && objective.overallProgressPct < 80) {
    recs.push(
      `Sprint final: ${objective.weeksRemaining} semana(s) y ${(100 - objective.overallProgressPct).toFixed(0)}% pendiente — todos los recursos a este OKR`,
    );
  }
  return recs;
};

export const createObjective = async (params: {
  brandId: string;
  period: OKRPeriod;
  title: string;
  description: string;
  category: Objective['category'];
  keyResults: Array<{ description: string; metricType: KRMetricType; baseline: number; target: number }>;
}): Promise<Objective> => {
  const now = new Date();
  const periodMs =
    params.period === 'month' ? 30 * 86_400_000 : params.period === 'quarter' ? 90 * 86_400_000 : 365 * 86_400_000;
  const periodEnd = new Date(now.getTime() + periodMs);

  const objectives = await loadObjectives(params.brandId);
  const objective: Objective = {
    id: `okr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId: params.brandId,
    period: params.period,
    periodStart: now.toISOString(),
    periodEnd: periodEnd.toISOString(),
    title: params.title,
    description: params.description,
    category: params.category,
    keyResults: params.keyResults.map((kr) => ({
      id: `kr-${Math.random().toString(36).slice(2, 8)}`,
      description: kr.description,
      metricType: kr.metricType,
      baseline: kr.baseline,
      target: kr.target,
      current: kr.baseline,
      progressPct: 0,
      status: 'on-track',
      lastUpdated: now.toISOString(),
      weeklyProgress: [{ week: now.toISOString().slice(0, 10), value: kr.baseline }],
      trend: 'steady',
      projectedFinal: kr.baseline,
      projectedHitsTarget: false,
    })),
    overallProgressPct: 0,
    status: 'on-track',
    createdAt: now.toISOString(),
    weeksRemaining: Math.ceil(periodMs / (7 * 86_400_000)),
    recommendations: [],
  };
  objectives.push(objective);
  await saveObjectives(params.brandId, objectives);
  log.info('[executiveOKR] objective created', { brandId: params.brandId, id: objective.id, title: objective.title });
  return objective;
};

export const updateKRProgress = async (
  brandId: string,
  objectiveId: string,
  krId: string,
  newValue: number,
): Promise<Objective | null> => {
  const objectives = await loadObjectives(brandId);
  const objective = objectives.find((o) => o.id === objectiveId);
  if (!objective) return null;
  const kr = objective.keyResults.find((k) => k.id === krId);
  if (!kr) return null;

  kr.current = newValue;
  kr.lastUpdated = new Date().toISOString();
  const weekKey = new Date().toISOString().slice(0, 10);
  const existingWeek = kr.weeklyProgress.find((w) => w.week === weekKey);
  if (existingWeek) existingWeek.value = newValue;
  else kr.weeklyProgress.push({ week: weekKey, value: newValue });
  kr.weeklyProgress = kr.weeklyProgress.slice(-26);

  kr.progressPct = computeKRProgress(kr);
  kr.trend = computeTrend(kr.weeklyProgress);

  const totalMs = new Date(objective.periodEnd).getTime() - new Date(objective.periodStart).getTime();
  const elapsedMs = Date.now() - new Date(objective.periodStart).getTime();
  const weeksTotal = totalMs / (7 * 86_400_000);
  const weeksElapsed = elapsedMs / (7 * 86_400_000);
  objective.weeksRemaining = Math.max(0, Math.ceil(weeksTotal - weeksElapsed));
  kr.projectedFinal = projectKRFinal(kr, objective.weeksRemaining);
  kr.projectedHitsTarget = kr.projectedFinal >= kr.target;
  kr.status = determineKRStatus(kr.progressPct, weeksElapsed, weeksTotal, kr.projectedHitsTarget);

  objective.overallProgressPct =
    objective.keyResults.reduce((s, k) => s + k.progressPct, 0) / objective.keyResults.length;
  const krStatuses = objective.keyResults.map((k) => k.status);
  if (krStatuses.every((s) => s === 'completed')) objective.status = 'completed';
  else if (krStatuses.some((s) => s === 'behind')) objective.status = 'behind';
  else if (krStatuses.some((s) => s === 'at-risk')) objective.status = 'at-risk';
  else if (krStatuses.every((s) => s === 'ahead')) objective.status = 'ahead';
  else objective.status = 'on-track';
  objective.lastReview = new Date().toISOString();
  objective.recommendations = generateRecommendations(objective);

  await saveObjectives(brandId, objectives);
  return objective;
};

export const listActiveObjectives = async (brandId: string): Promise<Objective[]> => {
  const objectives = await loadObjectives(brandId);
  const now = Date.now();
  return objectives.filter(
    (o) => new Date(o.periodEnd).getTime() >= now && o.status !== 'abandoned' && o.status !== 'completed',
  );
};

export const getOKRSummary = async (
  brandId: string,
): Promise<{
  totalActive: number;
  onTrack: number;
  atRisk: number;
  behind: number;
  ahead: number;
  overallScore: number;
  topConcern?: { objectiveTitle: string; krDescription: string; gap: number };
}> => {
  const active = await listActiveObjectives(brandId);
  const summary = {
    totalActive: active.length,
    onTrack: 0,
    atRisk: 0,
    behind: 0,
    ahead: 0,
    overallScore: 0,
    topConcern: undefined as { objectiveTitle: string; krDescription: string; gap: number } | undefined,
  };

  let worstGap = 0;
  for (const obj of active) {
    if (obj.status === 'on-track') summary.onTrack++;
    else if (obj.status === 'at-risk') summary.atRisk++;
    else if (obj.status === 'behind') summary.behind++;
    else if (obj.status === 'ahead') summary.ahead++;
    summary.overallScore += obj.overallProgressPct;

    for (const kr of obj.keyResults) {
      if (kr.status === 'behind') {
        const gap = ((kr.target - kr.projectedFinal) / kr.target) * 100;
        if (gap > worstGap) {
          worstGap = gap;
          summary.topConcern = { objectiveTitle: obj.title, krDescription: kr.description, gap };
        }
      }
    }
  }
  summary.overallScore = active.length > 0 ? summary.overallScore / active.length : 0;
  return summary;
};
