// @ts-nocheck
/**
 * Goal-Driven Planner — autonomía estratégica de largo horizonte.
 *
 * Cerebro auto-genera goals + breakdown en sub-goals + plan de N semanas
 * para alcanzarlos. Sin pedir input humano.
 *
 * Combina:
 *   - North Star metric tracking
 *   - OKR auto-generation (objectives + key results)
 *   - Hierarchical task decomposition
 *   - Constraint reasoning (budget, time, plan limits)
 *   - Re-planning cuando deriva
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const PLANNER_DIR = path.resolve('data/neural/planner');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type GoalHorizon = 'quarter' | 'month' | 'sprint-2w' | 'week' | 'day';

export type GoalStatus = 'planned' | 'active' | 'at-risk' | 'achieved' | 'missed' | 'paused' | 'pivoted';

export interface KeyResult {
  id: string;
  metric: string;
  baseline: number;
  target: number;
  current: number;
  unit: string;
  progressPercent: number;
  trend: 'on-track' | 'ahead' | 'behind' | 'flat' | 'declining';
}

export interface Goal {
  id: string;
  parentGoalId?: string;
  horizon: GoalHorizon;
  title: string;
  description: string;
  status: GoalStatus;
  keyResults: KeyResult[];
  startDate: string;
  endDate: string;
  ownerActions: PlannedAction[];
  successProbability: number; // 0-1 estimación del cerebro
  blockers: string[];
  dependencies: string[]; // otros goal IDs
  northStarMetric: string;
}

export interface PlannedAction {
  id: string;
  parentGoalId: string;
  title: string;
  type: 'content' | 'experiment' | 'outreach' | 'analysis' | 'optimization' | 'ads';
  skillToInvoke?: string; // feedIA-quick-carousel, etc
  scheduledFor: string;
  estimatedDurationMs: number;
  estimatedCostUsd: number;
  prerequisites: string[];
  expectedImpact: { metric: string; deltaPercent: number };
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
}

export interface AutonomousPlan {
  brandId: string;
  generatedAt: string;
  northStarMetric: string;
  northStarCurrent: number;
  northStarTarget: number;
  horizonDays: number;
  goals: Goal[];
  totalActions: number;
  estimatedTotalCostUsd: number;
  successProbabilityOverall: number;
  riskFactors: string[];
  contingencyPlans: string[];
}

// ── Auto-generación de plan ──────────────────────────────────────────────────

export const generateAutonomousPlan = async (
  brand: BrandProfile,
  options: {
    horizon?: GoalHorizon;
    northStarMetric?: string;
    targetGrowthPercent?: number;
    budget?: number;
  } = {},
): Promise<AutonomousPlan> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const horizon = options.horizon ?? 'month';
  const horizonDaysMap: Record<GoalHorizon, number> = { quarter: 90, month: 30, 'sprint-2w': 14, week: 7, day: 1 };
  const horizonDays = horizonDaysMap[horizon];

  log.info('[goalDrivenPlanner] generating plan', { brandId, horizon, horizonDays });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: `Estratega autónomo senior. Generás planes hierárquicos basados en goals → key results → actions.
Pensás como CEO + CMO + producto manager combinados. Sos pragmático: priorizás high-leverage, descartás vanity.`,
    messages: [
      {
        role: 'user',
        content: `Generá plan autónomo para ${brand.name}:

Industria: ${brand.industryCategory ?? 'general'}
Horizonte: ${horizon} (${horizonDays} días)
${options.northStarMetric ? `North Star: ${options.northStarMetric}` : 'Detectá north star apropiado'}
${options.targetGrowthPercent ? `Target growth: ${options.targetGrowthPercent}%` : 'Target growth: deduce ambicioso pero realista'}
${options.budget ? `Budget: $${options.budget}` : ''}

Construí jerarquía:
1. NORTH STAR metric (1 sola, la que importa)
2. 2-4 GOALS principales (objetivos para alcanzar north star)
3. Cada goal tiene 2-4 KEY RESULTS (mediblas con baseline + target)
4. Cada goal tiene 3-6 ACTIONS concretas (con skill mappeado)

JSON:
{
  "northStarMetric": "metric name",
  "northStarCurrent": número,
  "northStarTarget": número,
  "successProbabilityOverall": 0-1,
  "riskFactors": ["riesgo 1"],
  "contingencyPlans": ["plan B si falla X"],
  "goals": [{
    "title": "objetivo claro",
    "description": "por qué importa",
    "horizon": "month|sprint-2w|...",
    "northStarMetric": "...",
    "successProbability": 0-1,
    "keyResults": [{
      "metric": "engagement_rate",
      "baseline": 0.03,
      "target": 0.05,
      "current": 0.03,
      "unit": "ratio",
      "progressPercent": 0,
      "trend": "on-track"
    }],
    "ownerActions": [{
      "title": "acción concreta",
      "type": "content|experiment|outreach|analysis|optimization|ads",
      "skillToInvoke": "feedIA-quick-carousel|feedIA-meta-ads|feedIA-buyer-persona|...",
      "scheduledFor": "YYYY-MM-DD",
      "estimatedDurationMs": número,
      "estimatedCostUsd": número,
      "prerequisites": [],
      "expectedImpact": { "metric": "...", "deltaPercent": 5 },
      "priority": "critical|high|medium|low"
    }]
  }]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[goalDrivenPlanner] No plan');

  const generated = JSON.parse(jsonMatch[0]) as Partial<AutonomousPlan>;
  const goals = (generated.goals ?? []).map((g, gi) => {
    const goalId = `goal-${Date.now()}-${gi}`;
    const krs: KeyResult[] = (g.keyResults ?? []).map((kr, ki) => ({
      id: `kr-${goalId}-${ki}`,
      metric: kr.metric ?? '',
      baseline: kr.baseline ?? 0,
      target: kr.target ?? 0,
      current: kr.current ?? kr.baseline ?? 0,
      unit: kr.unit ?? '',
      progressPercent: 0,
      trend: kr.trend ?? 'flat',
    }));
    const actions: PlannedAction[] = (g.ownerActions ?? []).map((a, ai) => ({
      id: `action-${goalId}-${ai}`,
      parentGoalId: goalId,
      title: a.title ?? '',
      type: a.type ?? 'content',
      skillToInvoke: a.skillToInvoke,
      scheduledFor: a.scheduledFor ?? new Date().toISOString().split('T')[0]!,
      estimatedDurationMs: a.estimatedDurationMs ?? 60_000,
      estimatedCostUsd: a.estimatedCostUsd ?? 0.1,
      prerequisites: a.prerequisites ?? [],
      expectedImpact: a.expectedImpact ?? { metric: '', deltaPercent: 0 },
      priority: a.priority ?? 'medium',
      status: 'pending',
    }));
    return {
      id: goalId,
      horizon: g.horizon ?? horizon,
      title: g.title ?? '',
      description: g.description ?? '',
      status: 'active' as GoalStatus,
      keyResults: krs,
      startDate: new Date().toISOString().split('T')[0]!,
      endDate: new Date(Date.now() + horizonDays * 86400000).toISOString().split('T')[0]!,
      ownerActions: actions,
      successProbability: g.successProbability ?? 0.6,
      blockers: g.blockers ?? [],
      dependencies: g.dependencies ?? [],
      northStarMetric: g.northStarMetric ?? generated.northStarMetric ?? '',
    };
  });

  const totalActions = goals.reduce((s, g) => s + g.ownerActions.length, 0);
  const estimatedTotalCostUsd = goals.reduce(
    (s, g) => s + g.ownerActions.reduce((sa, a) => sa + a.estimatedCostUsd, 0),
    0,
  );

  const plan: AutonomousPlan = {
    brandId,
    generatedAt: new Date().toISOString(),
    northStarMetric: generated.northStarMetric ?? 'engagement_rate',
    northStarCurrent: generated.northStarCurrent ?? 0,
    northStarTarget: generated.northStarTarget ?? 0,
    horizonDays,
    goals,
    totalActions,
    estimatedTotalCostUsd,
    successProbabilityOverall: generated.successProbabilityOverall ?? 0.6,
    riskFactors: generated.riskFactors ?? [],
    contingencyPlans: generated.contingencyPlans ?? [],
  };

  await fs.mkdir(PLANNER_DIR, { recursive: true });
  await fs.writeFile(path.join(PLANNER_DIR, `${brandId}-plan.json`), JSON.stringify(plan, null, 2), 'utf-8');
  log.info('[goalDrivenPlanner] plan saved', { brandId, goals: goals.length, actions: totalActions });
  return plan;
};

/** Actualiza progress de KRs y re-evalúa status. */
export const updatePlanProgress = async (
  brandId: string,
  metricUpdates: Record<string, number>,
): Promise<AutonomousPlan | null> => {
  const file = path.join(PLANNER_DIR, `${brandId}-plan.json`);
  let plan: AutonomousPlan;
  try {
    plan = JSON.parse(await fs.readFile(file, 'utf-8')) as AutonomousPlan;
  } catch {
    return null;
  }

  for (const goal of plan.goals) {
    let goalProgress = 0;
    for (const kr of goal.keyResults) {
      const newValue = metricUpdates[kr.metric];
      if (newValue !== undefined) {
        kr.current = newValue;
        kr.progressPercent = ((newValue - kr.baseline) / Math.max(0.001, kr.target - kr.baseline)) * 100;
        kr.trend =
          kr.progressPercent >= 95
            ? 'ahead'
            : kr.progressPercent >= 50
              ? 'on-track'
              : kr.progressPercent >= 10
                ? 'flat'
                : 'behind';
      }
      goalProgress += Math.max(0, Math.min(100, kr.progressPercent));
    }
    goalProgress /= Math.max(1, goal.keyResults.length);
    if (goalProgress >= 100) goal.status = 'achieved';
    else if (goalProgress < 0) goal.status = 'missed';
    else if (goal.keyResults.some((kr) => kr.trend === 'behind' || kr.trend === 'declining')) goal.status = 'at-risk';
  }

  await fs.writeFile(file, JSON.stringify(plan, null, 2), 'utf-8');
  return plan;
};

/** Re-plan si > 30% goals at-risk. */
export const shouldReplan = (plan: AutonomousPlan): boolean => {
  const atRisk = plan.goals.filter((g) => g.status === 'at-risk' || g.status === 'missed').length;
  return atRisk / plan.goals.length > 0.3;
};

export const getActivePlan = async (brandId: string): Promise<AutonomousPlan | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(PLANNER_DIR, `${brandId}-plan.json`), 'utf-8')) as AutonomousPlan;
  } catch {
    return null;
  }
};

/** Próximas N actions a ejecutar ordenadas por priority + scheduledFor. */
export const getNextActions = async (brandId: string, limit = 10): Promise<PlannedAction[]> => {
  const plan = await getActivePlan(brandId);
  if (!plan) return [];
  const allPending: PlannedAction[] = [];
  for (const g of plan.goals) for (const a of g.ownerActions) if (a.status === 'pending') allPending.push(a);
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return allPending
    .sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.scheduledFor.localeCompare(b.scheduledFor),
    )
    .slice(0, limit);
};
