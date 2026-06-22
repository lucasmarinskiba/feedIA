// @ts-nocheck
/**
 * Simulation Engine — Monte Carlo de outcomes antes de ejecutar.
 *
 * Antes de tomar acción costosa (publicar, ads, outreach), simulá
 * 100-1000 trayectorias futuras con randomness controlada.
 *
 * Output: distribution de outcomes + best/worst/expected case + risk-adjusted recommendation.
 */

import { log } from '../../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SimulationParameters {
  trials: number; // 100-1000
  horizonDays: number;
  randomSeed?: number;
}

export interface ActionScenario {
  actionId: string;
  description: string;
  baseExpectedOutcome: {
    // mean estimates
    reach: number;
    engagement: number;
    conversions: number;
  };
  uncertaintyFactors: {
    contentQualityVariance: number; // 0-1 (cuán incierto el output)
    audienceMoodVariance: number;
    algorithmVariance: number;
    competitiveResponseProb: number;
    externalEventProb: number; // black swan
  };
  costUsd: number;
}

export interface SimulationResult {
  scenarioId: string;
  trialsRun: number;
  outcomes: {
    reach: { min: number; max: number; mean: number; median: number; p10: number; p90: number; stddev: number };
    engagement: { min: number; max: number; mean: number; median: number; p10: number; p90: number; stddev: number };
    conversions: { min: number; max: number; mean: number; median: number; p10: number; p90: number; stddev: number };
    roi: { min: number; max: number; mean: number; median: number };
  };
  successProbability: number; // % de trials donde outcome > expected
  blackSwanProbability: number; // % de trials con outcome catastrófico
  riskAdjustedRecommendation: 'ship' | 'ship-with-caveats' | 'modify' | 'skip';
  reasoning: string;
}

// ── Distribution helpers ─────────────────────────────────────────────────────

const gaussian = (mean: number, stddev: number, rng: () => number): number => {
  // Box-Muller
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stddev * z;
};

const seededRng = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const percentile = (sorted: number[], p: number): number => {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
};

const mean = (arr: number[]): number => arr.reduce((s, v) => s + v, 0) / arr.length;
const stddev = (arr: number[]): number => {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
};

// ── Single trial ────────────────────────────────────────────────────────────

const runSingleTrial = (
  scenario: ActionScenario,
  rng: () => number,
): { reach: number; engagement: number; conversions: number; isBlackSwan: boolean } => {
  const u = scenario.uncertaintyFactors;
  const base = scenario.baseExpectedOutcome;

  // Reach con variance acumulada
  const reachVariance = (u.contentQualityVariance + u.algorithmVariance + u.audienceMoodVariance) / 3;
  const reachFactor = Math.max(0.01, gaussian(1, reachVariance, rng));
  let reach = base.reach * reachFactor;

  // Engagement depende de reach + audience mood
  const engRate = gaussian(0.04, 0.04 * u.audienceMoodVariance, rng);
  let engagement = Math.max(0, reach * Math.max(0.001, engRate));

  // Conversions depende de engagement + content quality
  const convRate = gaussian(0.03, 0.03 * u.contentQualityVariance, rng);
  let conversions = Math.max(0, engagement * Math.max(0.001, convRate));

  // Competitive response — reduce reach 20-40%
  if (rng() < u.competitiveResponseProb) {
    const reduction = 0.2 + rng() * 0.2;
    reach *= 1 - reduction;
    engagement *= 1 - reduction;
    conversions *= 1 - reduction;
  }

  // Black swan event — outcome catastrófico
  let isBlackSwan = false;
  if (rng() < u.externalEventProb) {
    isBlackSwan = true;
    reach *= 0.1 + rng() * 0.3;
    engagement *= 0.1;
    conversions = 0;
  }

  return { reach, engagement, conversions, isBlackSwan };
};

// ── Monte Carlo ──────────────────────────────────────────────────────────────

export const simulateScenario = (
  scenario: ActionScenario,
  params: SimulationParameters = { trials: 500, horizonDays: 7 },
): SimulationResult => {
  const rng = seededRng(params.randomSeed ?? Date.now());

  const reaches: number[] = [];
  const engagements: number[] = [];
  const conversions: number[] = [];
  let blackSwanCount = 0;

  for (let i = 0; i < params.trials; i++) {
    const trial = runSingleTrial(scenario, rng);
    reaches.push(trial.reach);
    engagements.push(trial.engagement);
    conversions.push(trial.conversions);
    if (trial.isBlackSwan) blackSwanCount++;
  }

  reaches.sort((a, b) => a - b);
  engagements.sort((a, b) => a - b);
  conversions.sort((a, b) => a - b);

  // ROI: revenue per conversion = $10 (estimate)
  const revenuePerConversion = 10;
  const rois = conversions.map((c) => (c * revenuePerConversion - scenario.costUsd) / Math.max(0.01, scenario.costUsd));
  rois.sort((a, b) => a - b);

  // Success: outcome > expected base
  const successCount = reaches.filter((r) => r >= scenario.baseExpectedOutcome.reach).length;
  const successProbability = successCount / params.trials;
  const blackSwanProbability = blackSwanCount / params.trials;

  // Recommendation
  let recommendation: SimulationResult['riskAdjustedRecommendation'];
  let reasoning: string;
  if (blackSwanProbability > 0.15) {
    recommendation = 'skip';
    reasoning = `Black swan prob ${(blackSwanProbability * 100).toFixed(0)}% > 15% — riesgo inaceptable`;
  } else if (successProbability > 0.6 && mean(rois) > 1) {
    recommendation = 'ship';
    reasoning = `${(successProbability * 100).toFixed(0)}% chance success, ROI esperado ${mean(rois).toFixed(1)}x`;
  } else if (successProbability > 0.4) {
    recommendation = 'ship-with-caveats';
    reasoning = `Moderate confidence (${(successProbability * 100).toFixed(0)}%) — shipá pero monitoreá close`;
  } else if (mean(rois) < 0) {
    recommendation = 'skip';
    reasoning = `ROI esperado negativo (${mean(rois).toFixed(2)}x)`;
  } else {
    recommendation = 'modify';
    reasoning = `Low success prob (${(successProbability * 100).toFixed(0)}%) — modificá scenario antes de ship`;
  }

  return {
    scenarioId: scenario.actionId,
    trialsRun: params.trials,
    outcomes: {
      reach: {
        min: reaches[0] ?? 0,
        max: reaches[reaches.length - 1] ?? 0,
        mean: mean(reaches),
        median: percentile(reaches, 0.5),
        p10: percentile(reaches, 0.1),
        p90: percentile(reaches, 0.9),
        stddev: stddev(reaches),
      },
      engagement: {
        min: engagements[0] ?? 0,
        max: engagements[engagements.length - 1] ?? 0,
        mean: mean(engagements),
        median: percentile(engagements, 0.5),
        p10: percentile(engagements, 0.1),
        p90: percentile(engagements, 0.9),
        stddev: stddev(engagements),
      },
      conversions: {
        min: conversions[0] ?? 0,
        max: conversions[conversions.length - 1] ?? 0,
        mean: mean(conversions),
        median: percentile(conversions, 0.5),
        p10: percentile(conversions, 0.1),
        p90: percentile(conversions, 0.9),
        stddev: stddev(conversions),
      },
      roi: {
        min: rois[0] ?? 0,
        max: rois[rois.length - 1] ?? 0,
        mean: mean(rois),
        median: percentile(rois, 0.5),
      },
    },
    successProbability,
    blackSwanProbability,
    riskAdjustedRecommendation: recommendation,
    reasoning,
  };
};

/** Compara N scenarios en paralelo y rankea. */
export const compareScenarios = (
  scenarios: ActionScenario[],
  params: SimulationParameters = { trials: 500, horizonDays: 7 },
): Array<{ scenario: ActionScenario; result: SimulationResult; rank: number }> => {
  log.info('[simulationEngine] comparing scenarios', { count: scenarios.length, trials: params.trials });
  const results = scenarios.map((s) => ({ scenario: s, result: simulateScenario(s, params) }));
  // Rank por mean ROI ajustado por black swan risk
  results.sort((a, b) => {
    const scoreA = a.result.outcomes.roi.mean * (1 - a.result.blackSwanProbability);
    const scoreB = b.result.outcomes.roi.mean * (1 - b.result.blackSwanProbability);
    return scoreB - scoreA;
  });
  return results.map((r, idx) => ({ ...r, rank: idx + 1 }));
};
