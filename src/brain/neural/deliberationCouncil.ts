/**
 * Deliberation Council — voto multi-expert local (sin Anthropic).
 *
 * 7 expertos especializados con fitness functions distintas.
 * Cada uno score N opciones, voto ponderado, consensus + dissent report.
 *
 * Rápido + deterministic + sin tokens cost.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const COUNCIL_DIR = path.resolve('data/neural/deliberation');

export type ExpertRole = 'growth' | 'engagement' | 'monetization' | 'brand' | 'risk' | 'novelty' | 'efficiency';

export interface DecisionOption {
  id: string;
  label: string;
  attributes: {
    expectedReach?: number;
    expectedEngagementRate?: number;
    expectedConversionRate?: number;
    brandFit?: number; // 0-1
    riskScore?: number; // 0-1
    noveltyScore?: number; // 0-1
    costUsd?: number;
    timeInvestmentMin?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ExpertVote {
  expert: ExpertRole;
  optionId: string;
  score: number; // 0-1
  reasoning: string;
}

export interface CouncilDecision {
  decisionId: string;
  brandId: string;
  question: string;
  options: DecisionOption[];
  votes: ExpertVote[];
  weightedScores: Array<{ optionId: string; weightedScore: number }>;
  consensus: DecisionOption;
  consensusConfidence: number;
  dissent: ExpertVote[]; // votos contra el consensus
  rationale: string;
  decidedAt: string;
}

const EXPERT_WEIGHTS: Record<ExpertRole, number> = {
  growth: 1.0,
  engagement: 1.0,
  monetization: 0.9,
  brand: 0.85,
  risk: 0.7,
  novelty: 0.6,
  efficiency: 0.8,
};

const scoreByGrowth = (opt: DecisionOption): { score: number; reasoning: string } => {
  const reach = opt.attributes.expectedReach ?? 0;
  const normalized = Math.min(1, reach / 100000);
  return { score: normalized, reasoning: `Reach esperado ${reach}` };
};

const scoreByEngagement = (opt: DecisionOption): { score: number; reasoning: string } => {
  const er = opt.attributes.expectedEngagementRate ?? 0;
  const normalized = Math.min(1, er * 20);
  return { score: normalized, reasoning: `Engagement esperado ${(er * 100).toFixed(1)}%` };
};

const scoreByMonetization = (opt: DecisionOption): { score: number; reasoning: string } => {
  const cr = opt.attributes.expectedConversionRate ?? 0;
  const reach = opt.attributes.expectedReach ?? 0;
  const projectedRevenue = cr * reach * 10;
  const cost = opt.attributes.costUsd ?? 1;
  const roi = projectedRevenue / Math.max(0.1, cost);
  const score = Math.min(1, roi / 5);
  return { score, reasoning: `ROI proyectado ${roi.toFixed(1)}x` };
};

const scoreByBrand = (opt: DecisionOption): { score: number; reasoning: string } => {
  const fit = opt.attributes.brandFit ?? 0.5;
  return { score: fit, reasoning: `Brand fit ${(fit * 100).toFixed(0)}%` };
};

const scoreByRisk = (opt: DecisionOption): { score: number; reasoning: string } => {
  const risk = opt.attributes.riskScore ?? 0.5;
  const inverted = 1 - risk;
  return { score: inverted, reasoning: `Riesgo ${(risk * 100).toFixed(0)}% → score inverso` };
};

const scoreByNovelty = (opt: DecisionOption): { score: number; reasoning: string } => {
  const nov = opt.attributes.noveltyScore ?? 0.5;
  return { score: nov, reasoning: `Novedad ${(nov * 100).toFixed(0)}%` };
};

const scoreByEfficiency = (opt: DecisionOption): { score: number; reasoning: string } => {
  const time = opt.attributes.timeInvestmentMin ?? 30;
  const cost = opt.attributes.costUsd ?? 0.1;
  const inverted = 1 / Math.max(0.1, time / 60 + cost);
  const score = Math.min(1, inverted / 2);
  return { score, reasoning: `Tiempo ${time}min + costo $${cost.toFixed(2)}` };
};

const EXPERT_FNS: Record<ExpertRole, (opt: DecisionOption) => { score: number; reasoning: string }> = {
  growth: scoreByGrowth,
  engagement: scoreByEngagement,
  monetization: scoreByMonetization,
  brand: scoreByBrand,
  risk: scoreByRisk,
  novelty: scoreByNovelty,
  efficiency: scoreByEfficiency,
};

export const deliberate = async (
  brandId: string,
  question: string,
  options: DecisionOption[],
  customWeights: Partial<Record<ExpertRole, number>> = {},
): Promise<CouncilDecision> => {
  if (options.length === 0) throw new Error('[deliberationCouncil] No options provided');
  const weights = { ...EXPERT_WEIGHTS, ...customWeights };
  const votes: ExpertVote[] = [];

  for (const expert of Object.keys(EXPERT_FNS) as ExpertRole[]) {
    const fn = EXPERT_FNS[expert];
    for (const opt of options) {
      const { score, reasoning } = fn(opt);
      votes.push({ expert, optionId: opt.id, score, reasoning });
    }
  }

  const tallies = new Map<string, number>();
  for (const v of votes) {
    const weight = weights[v.expert];
    tallies.set(v.optionId, (tallies.get(v.optionId) ?? 0) + v.score * weight);
  }
  const weightedScores = options.map((o) => ({ optionId: o.id, weightedScore: tallies.get(o.id) ?? 0 }));
  weightedScores.sort((a, b) => b.weightedScore - a.weightedScore);

  const winnerId = weightedScores[0]!.optionId;
  const winner = options.find((o) => o.id === winnerId)!;
  const totalScore = weightedScores.reduce((s, w) => s + w.weightedScore, 0);
  const consensusConfidence = totalScore > 0 ? weightedScores[0]!.weightedScore / totalScore : 0;
  const dissent = votes.filter((v) => v.optionId !== winnerId && v.score > 0.7);

  const decision: CouncilDecision = {
    decisionId: `dlb-${Date.now()}`,
    brandId,
    question,
    options,
    votes,
    weightedScores,
    consensus: winner,
    consensusConfidence,
    dissent,
    rationale: `${winner.label} con peso total ${weightedScores[0]!.weightedScore.toFixed(2)} (confidence ${(consensusConfidence * 100).toFixed(0)}%). ${dissent.length} expertos disienten fuertemente.`,
    decidedAt: new Date().toISOString(),
  };

  await fs.mkdir(COUNCIL_DIR, { recursive: true });
  await fs.writeFile(
    path.join(COUNCIL_DIR, `${brandId}-${decision.decisionId}.json`),
    JSON.stringify(decision, null, 2),
    'utf-8',
  );
  log.info('[deliberationCouncil] decision', {
    brandId,
    winner: winner.id,
    confidence: consensusConfidence.toFixed(2),
    dissent: dissent.length,
  });
  return decision;
};

export const getCouncilHistory = async (brandId: string, limit = 20): Promise<CouncilDecision[]> => {
  try {
    const files = await fs.readdir(COUNCIL_DIR);
    const brandFiles = files.filter((f) => f.startsWith(brandId)).slice(-limit);
    const decisions: CouncilDecision[] = [];
    for (const f of brandFiles) {
      decisions.push(JSON.parse(await fs.readFile(path.join(COUNCIL_DIR, f), 'utf-8')) as CouncilDecision);
    }
    return decisions.sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  } catch {
    return [];
  }
};

export const setExpertWeights = (newWeights: Partial<Record<ExpertRole, number>>): void => {
  for (const [role, weight] of Object.entries(newWeights)) {
    if (weight !== undefined) EXPERT_WEIGHTS[role as ExpertRole] = weight;
  }
};

export const getExpertWeights = (): Record<ExpertRole, number> => ({ ...EXPERT_WEIGHTS });
