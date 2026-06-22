import type { ABVariant, ABTestResult } from './types.js';

/**
 * Statistical engine for A/B testing.
 * Uses z-test for proportions to determine statistical significance.
 */
export const calculateTestResult = (variants: ABVariant[], confidenceLevel: number = 0.95): ABTestResult => {
  if (variants.length < 2) {
    return {
      testId: '',
      winner: null,
      confidence: 0,
      isSignificant: false,
      variantResults: [],
    };
  }

  // Calculate engagement rates
  const results = variants.map((v) => {
    const engagementRate = v.impressions > 0 ? v.engagements / v.impressions : 0;
    const conversionRate = v.impressions > 0 ? v.conversions / v.impressions : 0;
    return {
      variantId: v.id,
      name: v.name,
      engagementRate,
      conversionRate,
      lift: 0,
    };
  });

  if (results.length < 2) {
    return {
      testId: '',
      winner: null,
      confidence: 0,
      isSignificant: false,
      variantResults: results,
    };
  }

  // Find best variant by engagement rate
  const best = results.reduce((max, r) => (r.engagementRate > max.engagementRate ? r : max));
  const control = results[0]!;

  // Calculate lift
  for (const r of results) {
    if (control.engagementRate > 0) {
      r.lift = ((r.engagementRate - control.engagementRate) / control.engagementRate) * 100;
    }
  }

  // Z-test for proportions between best and control
  const bestVariant = variants.find((v) => v.id === best.variantId)!;
  const controlVariant = variants[0]!;

  const p1 = bestVariant.engagements / bestVariant.impressions;
  const p2 = controlVariant.engagements / controlVariant.impressions;
  const n1 = bestVariant.impressions;
  const n2 = controlVariant.impressions;

  const p = (bestVariant.engagements + controlVariant.engagements) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  const z = se > 0 ? (p1 - p2) / se : 0;

  // Two-tailed critical z-values
  const zCritical = confidenceLevel >= 0.99 ? 2.576 : confidenceLevel >= 0.95 ? 1.96 : 1.645;
  const isSignificant = Math.abs(z) > zCritical && n1 >= 100 && n2 >= 100;

  // Confidence using normal CDF approximation
  const confidence = Math.min(0.9999, 1 - 2 * (1 - normalCDF(Math.abs(z))));

  return {
    testId: '',
    winner: isSignificant && best ? best.variantId : null,
    confidence: Math.round(confidence * 1000) / 1000,
    isSignificant,
    variantResults: results,
  } as ABTestResult;
};

function normalCDF(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * y);
}

/**
 * Determines if a test has collected enough data to be evaluated.
 */
export const hasMinimumSampleSize = (variants: ABVariant[], minPerVariant: number = 100): boolean =>
  variants.every((v) => v.impressions >= minPerVariant);

/**
 * Splits audience into variants deterministically.
 */
export const assignVariant = (userId: string, variantIds: string[]): string => {
  // Simple hash-based assignment for deterministic split
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % variantIds.length;
  return variantIds[index]!;
};
