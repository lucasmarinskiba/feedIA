/**
 * Sales Funnel Predictor — Multi-stage conversion model with Monte Carlo simulation
 *
 * Science: Beta-distribution sampling for conversion rate uncertainty,
 * Monte Carlo with 1000 iterations for P10/P50/P90 revenue scenarios,
 * Customer LTV with exponential churn decay, CAC/ROAS/payback period.
 */

import type { NicheCategory, MonetizationModel } from './nicheAnalyzer.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FunnelStageRate {
  stageName: string;
  meanRate: number; // Expected conversion rate (0-1)
  stdDev: number; // Standard deviation (uncertainty)
  minRate: number;
  maxRate: number;
  benchmarkSource: string;
}

export interface FunnelConfig {
  niche: NicheCategory;
  monetizationModel: MonetizationModel;
  avgOrderValue: number; // USD
  monthlyReach: number; // Total accounts reached/month
  contentPiecesPerMonth: number;
  avgOrdersPerCustomer: number; // Repeat purchases per year
  customerLifetimeMonths: number;
  manychatEnabled: boolean;
  stageRates: FunnelStageRate[];
}

export interface FunnelStageResult {
  stageName: string;
  inputVolume: number;
  outputVolume: number;
  conversionRate: number;
  bottleneck: boolean; // True if this is the biggest drop-off
}

export interface MonteCarloScenario {
  p10Revenue: number; // Pessimistic (10th percentile)
  p50Revenue: number; // Expected (median)
  p90Revenue: number; // Optimistic (90th percentile)
  meanRevenue: number;
  stdDevRevenue: number;
  confidenceInterval95: { low: number; high: number };
  iterations: number;
}

export interface CustomerLTV {
  ltv3Months: number;
  ltv6Months: number;
  ltv12Months: number;
  avgOrderValue: number;
  purchaseFrequency: number; // Purchases per year
  churnRateMonthly: number; // Monthly churn probability
  paybackPeriodMonths: number; // Months to recover CAC
  ltvToCacRatio: number; // LTV:CAC ratio (healthy = >3)
}

export interface FunnelSimulation {
  config: FunnelConfig;
  stageResults: FunnelStageResult[];
  monthlyProjection: MonteCarloScenario;
  annualProjection: MonteCarloScenario;
  customerLTV: CustomerLTV;
  cac: number; // Customer Acquisition Cost (USD)
  roas: number; // Return on Ad Spend
  bottleneckStage: string;
  bottleneckFix: string;
  sensitivityAnalysis: SensitivityResult[];
  revenueLevers: RevenueLever[];
}

export interface SensitivityResult {
  variable: string;
  baseValue: number;
  plusTenPctRevenue: number;
  minusTenPctRevenue: number;
  elasticity: number; // % revenue change per % variable change
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface RevenueLever {
  lever: string;
  currentImpact: number; // Current monthly revenue contribution
  potentialImpact: number; // If optimised
  effort: 'low' | 'medium' | 'high';
  timeToImpact: string;
  recommendation: string;
}

export interface RevenueProjection30_60_90 {
  day30: { conservative: number; realistic: number; optimistic: number };
  day60: { conservative: number; realistic: number; optimistic: number };
  day90: { conservative: number; realistic: number; optimistic: number };
  breakEvenDay: number;
  roi90Days: number;
}

// ── Niche-calibrated funnel benchmarks ───────────────────────────────────────

const NICHE_FUNNEL_RATES: Partial<Record<NicheCategory, Omit<FunnelStageRate, 'stageName'>[]>> = {
  coaching: [
    { meanRate: 0.055, stdDev: 0.012, minRate: 0.02, maxRate: 0.12, benchmarkSource: 'Coaching niche avg 2024' },
    { meanRate: 0.12, stdDev: 0.025, minRate: 0.05, maxRate: 0.25, benchmarkSource: 'Coaching niche avg 2024' },
    { meanRate: 0.04, stdDev: 0.01, minRate: 0.01, maxRate: 0.09, benchmarkSource: 'Coaching niche avg 2024' },
    { meanRate: 0.35, stdDev: 0.08, minRate: 0.15, maxRate: 0.55, benchmarkSource: 'Coaching DM conversion' },
    { meanRate: 0.22, stdDev: 0.06, minRate: 0.08, maxRate: 0.4, benchmarkSource: 'Coaching close rate' },
  ],
  'fitness-coaching': [
    { meanRate: 0.062, stdDev: 0.014, minRate: 0.02, maxRate: 0.14, benchmarkSource: 'Fitness coaching avg 2024' },
    { meanRate: 0.13, stdDev: 0.028, minRate: 0.06, maxRate: 0.26, benchmarkSource: 'Fitness coaching avg 2024' },
    { meanRate: 0.035, stdDev: 0.009, minRate: 0.01, maxRate: 0.08, benchmarkSource: 'Fitness coaching avg 2024' },
    { meanRate: 0.3, stdDev: 0.07, minRate: 0.12, maxRate: 0.5, benchmarkSource: 'Fitness DM conversion' },
    { meanRate: 0.18, stdDev: 0.055, minRate: 0.06, maxRate: 0.35, benchmarkSource: 'Fitness close rate' },
  ],
  ecommerce: [
    { meanRate: 0.042, stdDev: 0.01, minRate: 0.015, maxRate: 0.09, benchmarkSource: 'E-commerce IG avg 2024' },
    { meanRate: 0.08, stdDev: 0.02, minRate: 0.03, maxRate: 0.18, benchmarkSource: 'E-commerce IG avg 2024' },
    { meanRate: 0.065, stdDev: 0.018, minRate: 0.02, maxRate: 0.15, benchmarkSource: 'E-commerce link click' },
    { meanRate: 0.025, stdDev: 0.008, minRate: 0.008, maxRate: 0.06, benchmarkSource: 'E-commerce cart conversion' },
    { meanRate: 0.7, stdDev: 0.1, minRate: 0.45, maxRate: 0.9, benchmarkSource: 'E-commerce checkout rate' },
  ],
  finance: [
    { meanRate: 0.048, stdDev: 0.011, minRate: 0.018, maxRate: 0.1, benchmarkSource: 'Finance IG avg 2024' },
    { meanRate: 0.1, stdDev: 0.022, minRate: 0.04, maxRate: 0.2, benchmarkSource: 'Finance IG avg 2024' },
    { meanRate: 0.03, stdDev: 0.008, minRate: 0.008, maxRate: 0.07, benchmarkSource: 'Finance lead rate' },
    { meanRate: 0.4, stdDev: 0.09, minRate: 0.18, maxRate: 0.62, benchmarkSource: 'Finance DM qualify' },
    { meanRate: 0.25, stdDev: 0.065, minRate: 0.1, maxRate: 0.42, benchmarkSource: 'Finance close rate' },
  ],
  'b2b-services': [
    { meanRate: 0.035, stdDev: 0.009, minRate: 0.012, maxRate: 0.08, benchmarkSource: 'B2B IG avg 2024' },
    { meanRate: 0.09, stdDev: 0.02, minRate: 0.03, maxRate: 0.18, benchmarkSource: 'B2B IG avg 2024' },
    { meanRate: 0.025, stdDev: 0.007, minRate: 0.006, maxRate: 0.06, benchmarkSource: 'B2B lead rate' },
    { meanRate: 0.45, stdDev: 0.1, minRate: 0.22, maxRate: 0.68, benchmarkSource: 'B2B DM qualify' },
    { meanRate: 0.28, stdDev: 0.07, minRate: 0.12, maxRate: 0.48, benchmarkSource: 'B2B close rate' },
  ],
};

const DEFAULT_FUNNEL_RATES: Omit<FunnelStageRate, 'stageName'>[] = [
  { meanRate: 0.05, stdDev: 0.012, minRate: 0.02, maxRate: 0.11, benchmarkSource: 'General avg' },
  { meanRate: 0.1, stdDev: 0.022, minRate: 0.04, maxRate: 0.2, benchmarkSource: 'General avg' },
  { meanRate: 0.03, stdDev: 0.008, minRate: 0.008, maxRate: 0.07, benchmarkSource: 'General avg' },
  { meanRate: 0.32, stdDev: 0.075, minRate: 0.12, maxRate: 0.52, benchmarkSource: 'General DM' },
  { meanRate: 0.2, stdDev: 0.055, minRate: 0.07, maxRate: 0.38, benchmarkSource: 'General close' },
];

const STAGE_NAMES = [
  'Alcance → Visita perfil',
  'Visita → Nuevo seguidor',
  'Seguidor → Lead/DM',
  'Lead → Calificado',
  'Calificado → Venta',
];
const STAGE_FIXES = [
  'Mejorar hook y CTA → más visitas de perfil',
  'Optimizar bio + highlights → mayor conversión a seguidor',
  'ManyChat trigger + lead magnet → más DMs calificados',
  'Guión DM de calificación → filtrar leads rápido',
  'Oferta irresistible + urgencia → cerrar venta',
];

const AVG_ORDER_VALUE_BY_NICHE: Partial<Record<NicheCategory, number>> = {
  coaching: 600,
  'fitness-coaching': 350,
  ecommerce: 85,
  finance: 800,
  'b2b-services': 2500,
  education: 150,
  beauty: 60,
  'personal-brand': 400,
};

// ── Statistics ────────────────────────────────────────────────────────────────

// Box-Muller transform — Gaussian(0, 1) from uniform random
const gaussianRand = (): number => {
  const u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(Math.max(u, 1e-10))) * Math.cos(2 * Math.PI * v);
};

// Sample from Beta(α, β) via normal approximation (valid when α, β > 2)
const sampleBeta = (alpha: number, beta: number): number => {
  const mu = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const sigma = Math.sqrt(variance);
  const sample = mu + sigma * gaussianRand();
  return Math.max(0.001, Math.min(0.999, sample));
};

// Convert mean/stdDev to Beta(α, β) parameters
const meanStdToBetaParams = (mean: number, std: number): { alpha: number; beta: number } => {
  const variance = std * std;
  const common = (mean * (1 - mean)) / variance - 1;
  return { alpha: Math.max(2, mean * common), beta: Math.max(2, (1 - mean) * common) };
};

// Monte Carlo simulation — 1000 iterations
const runMonteCarlo = (
  stages: FunnelStageRate[],
  monthlyReach: number,
  avgOrderValue: number,
  iterations = 1000,
): MonteCarloScenario => {
  const revenues: number[] = [];

  for (let i = 0; i < iterations; i++) {
    let volume = monthlyReach;
    for (const stage of stages) {
      const { alpha, beta } = meanStdToBetaParams(stage.meanRate, stage.stdDev);
      const sampledRate = sampleBeta(alpha, beta);
      volume *= sampledRate;
    }
    revenues.push(Math.round(volume * avgOrderValue));
  }

  revenues.sort((a, b) => a - b);

  const p10 = revenues[Math.floor(iterations * 0.1)] ?? 0;
  const p50 = revenues[Math.floor(iterations * 0.5)] ?? 0;
  const p90 = revenues[Math.floor(iterations * 0.9)] ?? 0;
  const mean = revenues.reduce((s, v) => s + v, 0) / iterations;
  const variance = revenues.reduce((s, v) => s + (v - mean) ** 2, 0) / iterations;
  const stdDev = Math.sqrt(variance);

  return {
    p10Revenue: Math.round(p10),
    p50Revenue: Math.round(p50),
    p90Revenue: Math.round(p90),
    meanRevenue: Math.round(mean),
    stdDevRevenue: Math.round(stdDev),
    confidenceInterval95: { low: Math.round(mean - 1.96 * stdDev), high: Math.round(mean + 1.96 * stdDev) },
    iterations,
  };
};

// LTV with exponential churn decay: LTV = AOV × (1 / churnRate) × purchaseFreq
const computeLTV = (avgOrderValue: number, ordersPerYear: number, lifetimeMonths: number, cac: number): CustomerLTV => {
  const churnRateMonthly = 1 / lifetimeMonths;
  const purchaseFrequency = ordersPerYear;
  const ltv12 = Math.round((avgOrderValue * purchaseFrequency * Math.min(12, lifetimeMonths)) / 12);
  const ltv6 = Math.round(ltv12 * (6 / 12));
  const ltv3 = Math.round(ltv12 * (3 / 12));
  const paybackPeriod = cac > 0 ? Math.ceil(cac / (ltv12 / 12)) : 0;
  const ltvToCacRatio = cac > 0 ? parseFloat((ltv12 / cac).toFixed(2)) : 0;

  return {
    ltv3Months: ltv3,
    ltv6Months: ltv6,
    ltv12Months: ltv12,
    avgOrderValue,
    purchaseFrequency,
    churnRateMonthly: parseFloat(churnRateMonthly.toFixed(3)),
    paybackPeriodMonths: paybackPeriod,
    ltvToCacRatio,
  };
};

// Sensitivity analysis — vary each stage ±10%, measure revenue impact
const computeSensitivity = (
  stages: FunnelStageRate[],
  baseRevenue: number,
  monthlyReach: number,
  avgOrderValue: number,
): SensitivityResult[] => {
  return stages.map((stage, i) => {
    const modStages = [...stages];

    const upStage = { ...stage, meanRate: Math.min(0.99, stage.meanRate * 1.1) };
    modStages[i] = upStage;
    const upVol = modStages.reduce((v, s) => v * s.meanRate, monthlyReach);
    const upRevenue = upVol * avgOrderValue;

    const downStage = { ...stage, meanRate: stage.meanRate * 0.9 };
    modStages[i] = downStage;
    const downVol = modStages.reduce((v, s) => v * s.meanRate, monthlyReach);
    const downRevenue = downVol * avgOrderValue;

    const elasticity = baseRevenue > 0 ? parseFloat(((upRevenue - baseRevenue) / baseRevenue / 0.1).toFixed(2)) : 0;

    const priority: SensitivityResult['priority'] =
      Math.abs(elasticity) >= 0.8
        ? 'critical'
        : Math.abs(elasticity) >= 0.5
          ? 'high'
          : Math.abs(elasticity) >= 0.3
            ? 'medium'
            : 'low';

    return {
      variable: stage.stageName,
      baseValue: parseFloat((stage.meanRate * 100).toFixed(1)),
      plusTenPctRevenue: Math.round(upRevenue),
      minusTenPctRevenue: Math.round(downRevenue),
      elasticity,
      priority,
    };
  });
};

// ── Engine ────────────────────────────────────────────────────────────────────

class SalesFunnelPredictor {
  buildConfig = (
    niche: NicheCategory,
    monetizationModel: MonetizationModel,
    monthlyReach: number,
    contentPiecesPerMonth = 20,
    manychatEnabled = true,
    customAvgOrderValue?: number,
  ): FunnelConfig => {
    const baseRates = NICHE_FUNNEL_RATES[niche] ?? DEFAULT_FUNNEL_RATES;
    const aov = customAvgOrderValue ?? AVG_ORDER_VALUE_BY_NICHE[niche] ?? 200;

    // ManyChat boosts lead rate by ~40%
    const manychatMultiplier = manychatEnabled ? 1.4 : 1.0;

    const stageRates: FunnelStageRate[] = STAGE_NAMES.map((name, i) => ({
      stageName: name,
      ...(baseRates[i] ?? DEFAULT_FUNNEL_RATES[i]!),
      meanRate: (baseRates[i]?.meanRate ?? DEFAULT_FUNNEL_RATES[i]!.meanRate) * (i === 2 ? manychatMultiplier : 1),
    }));

    return {
      niche,
      monetizationModel,
      avgOrderValue: aov,
      monthlyReach,
      contentPiecesPerMonth,
      avgOrdersPerCustomer:
        monetizationModel === 'physical-products' ? 2.5 : monetizationModel === 'digital-products' ? 1.8 : 1.2,
      customerLifetimeMonths: monetizationModel === 'services-b2c' ? 6 : monetizationModel === 'services-b2b' ? 18 : 12,
      manychatEnabled,
      stageRates,
    };
  };

  simulate = (config: FunnelConfig): FunnelSimulation => {
    // Run stage-by-stage with mean rates for deterministic baseline
    let volume = config.monthlyReach;
    const stageResults: FunnelStageResult[] = config.stageRates.map((stage, i) => {
      const output = Math.round(volume * stage.meanRate);
      const result: FunnelStageResult = {
        stageName: stage.stageName,
        inputVolume: Math.round(volume),
        outputVolume: output,
        conversionRate: stage.meanRate,
        bottleneck: false,
      };
      volume = output;
      return result;
    });

    // Mark bottleneck = stage with highest absolute volume drop relative to input
    const bottleneckIdx =
      stageResults.map((s, i) => ({ i, dropRatio: 1 - s.conversionRate })).sort((a, b) => b.dropRatio - a.dropRatio)[0]
        ?.i ?? 0;
    stageResults[bottleneckIdx]!.bottleneck = true;

    const baselineMonthlyRevenue = stageResults[stageResults.length - 1]!.outputVolume * config.avgOrderValue;
    const monthlySim = runMonteCarlo(config.stageRates, config.monthlyReach, config.avgOrderValue);
    const annualSim: MonteCarloScenario = {
      ...monthlySim,
      p10Revenue: monthlySim.p10Revenue * 12,
      p50Revenue: monthlySim.p50Revenue * 12,
      p90Revenue: monthlySim.p90Revenue * 12,
      meanRevenue: monthlySim.meanRevenue * 12,
      stdDevRevenue: monthlySim.stdDevRevenue * Math.sqrt(12),
      confidenceInterval95: {
        low: monthlySim.confidenceInterval95.low * 12,
        high: monthlySim.confidenceInterval95.high * 12,
      },
    };

    // CAC = total content investment / new customers per month
    const estimatedContentCostMonthly = config.contentPiecesPerMonth * 150; // $150 avg per piece
    const newCustomers = stageResults[stageResults.length - 1]!.outputVolume;
    const cac = newCustomers > 0 ? Math.round(estimatedContentCostMonthly / newCustomers) : 9999;

    const ltv = computeLTV(config.avgOrderValue, config.avgOrdersPerCustomer, config.customerLifetimeMonths, cac);
    const roas = cac > 0 ? parseFloat((ltv.ltv12Months / cac).toFixed(2)) : 0;

    const sensitivity = computeSensitivity(
      config.stageRates,
      baselineMonthlyRevenue,
      config.monthlyReach,
      config.avgOrderValue,
    );

    const revenueLevers: RevenueLever[] = [
      {
        lever: 'ManyChat automation (lead capture)',
        currentImpact: config.manychatEnabled ? Math.round(baselineMonthlyRevenue * 0.35) : 0,
        potentialImpact: Math.round(baselineMonthlyRevenue * 0.35),
        effort: 'low',
        timeToImpact: '1-3 días',
        recommendation: config.manychatEnabled
          ? 'Activo — optimizar keyword triggers'
          : 'ACTIVAR — incremento estimado 35% en leads',
      },
      {
        lever: 'A/B test hooks (mejora hookScore)',
        currentImpact: 0,
        potentialImpact: Math.round(baselineMonthlyRevenue * 0.28),
        effort: 'low',
        timeToImpact: '1-2 semanas',
        recommendation: 'Probar 2 hooks distintos por video — meta: hookScore ≥8',
      },
      {
        lever: 'Optimizar bio + CTA de perfil',
        currentImpact: 0,
        potentialImpact: Math.round(baselineMonthlyRevenue * 0.2),
        effort: 'low',
        timeToImpact: '1 día',
        recommendation: 'Bio con keywords de nicho + CTA clara al link → +20% conversión de visita a follow',
      },
      {
        lever: 'Incrementar frecuencia de posting',
        currentImpact: Math.round(baselineMonthlyRevenue * (config.contentPiecesPerMonth / 30)),
        potentialImpact: Math.round(baselineMonthlyRevenue * 1.5),
        effort: 'medium',
        timeToImpact: '2-4 semanas',
        recommendation: `De ${config.contentPiecesPerMonth} a ${Math.min(30, config.contentPiecesPerMonth + 10)} posts/mes → +50% alcance compuesto`,
      },
    ];

    return {
      config,
      stageResults,
      monthlyProjection: monthlySim,
      annualProjection: annualSim,
      customerLTV: ltv,
      cac,
      roas,
      bottleneckStage: stageResults[bottleneckIdx]!.stageName,
      bottleneckFix: STAGE_FIXES[bottleneckIdx] ?? 'Optimizar conversión',
      sensitivityAnalysis: sensitivity.sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity)),
      revenueLevers,
    };
  };

  project30_60_90 = (
    config: FunnelConfig,
    monthlySim: MonteCarloScenario,
    estimatedContentCost: number,
  ): RevenueProjection30_60_90 => {
    // Growth compounds as audience grows: assume +15% reach per month from follower growth
    const compoundFactor = 1.15;

    const m1 = {
      conservative: monthlySim.p10Revenue,
      realistic: monthlySim.p50Revenue,
      optimistic: monthlySim.p90Revenue,
    };
    const m2 = {
      conservative: Math.round(m1.conservative * compoundFactor),
      realistic: Math.round(m1.realistic * compoundFactor),
      optimistic: Math.round(m1.optimistic * compoundFactor),
    };
    const m3 = {
      conservative: Math.round(m2.conservative * compoundFactor),
      realistic: Math.round(m2.realistic * compoundFactor),
      optimistic: Math.round(m2.optimistic * compoundFactor),
    };

    const cumulative90Realistic = m1.realistic + m2.realistic + m3.realistic;
    const totalCost90 = estimatedContentCost * 3;
    const roi90 =
      totalCost90 > 0 ? parseFloat((((cumulative90Realistic - totalCost90) / totalCost90) * 100).toFixed(1)) : 0;

    let breakEvenDay = 90;
    const dailyRevenue = m1.realistic / 30;
    if (dailyRevenue > 0) {
      breakEvenDay = Math.min(90, Math.ceil(estimatedContentCost / dailyRevenue));
    }

    return { day30: m1, day60: m2, day90: m3, breakEvenDay, roi90Days: roi90 };
  };

  formatReport = (sim: FunnelSimulation): string => {
    const { stageResults, monthlyProjection, customerLTV, cac, roas, bottleneckStage, bottleneckFix } = sim;

    const funnelViz = stageResults
      .map((s) => {
        const bar = '█'.repeat(Math.round(s.conversionRate * 30)).padEnd(30, '░');
        const tag = s.bottleneck ? ' ⚠️ CUELLO DE BOTELLA' : '';
        return `  ${s.stageName.padEnd(32)} [${bar}] ${(s.conversionRate * 100).toFixed(1)}% → ${s.outputVolume.toLocaleString()}${tag}`;
      })
      .join('\n');

    return `
# Simulación de Embudo de Ventas (Monte Carlo, n=1000)

## Funnel
${funnelViz}

## Proyección Mensual (Escenarios)
  Pesimista  (P10): $${monthlyProjection.p10Revenue.toLocaleString()}
  Esperado   (P50): $${monthlyProjection.p50Revenue.toLocaleString()}
  Optimista  (P90): $${monthlyProjection.p90Revenue.toLocaleString()}
  IC 95%: [$${monthlyProjection.confidenceInterval95.low.toLocaleString()} — $${monthlyProjection.confidenceInterval95.high.toLocaleString()}]

## Economía del Cliente
  LTV 12 meses:   $${customerLTV.ltv12Months.toLocaleString()}
  CAC estimado:   $${cac.toLocaleString()}
  LTV:CAC ratio:  ${customerLTV.ltvToCacRatio}x ${customerLTV.ltvToCacRatio >= 3 ? '✅' : '⚠️'}
  ROAS:           ${roas}x
  Payback period: ${customerLTV.paybackPeriodMonths} meses

## Cuello de Botella Principal
  Etapa:  ${bottleneckStage}
  Fix:    ${bottleneckFix}
`.trim();
  };
}

export const salesFunnelPredictor = new SalesFunnelPredictor();
