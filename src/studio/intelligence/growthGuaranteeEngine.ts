import type { NicheCategory } from './nicheAnalyzer.js';
import { trendIdeationEngine } from './trendIdeationEngine.js';
import { hookEnforcer } from './hookEnforcer.js';
import { retentionAnalyzer, type RetentionDiagnosis, type RetentionDataPoint } from './retentionAnalyzer.js';
import type { BrandProfile } from '../../config/types.js';

export type GuaranteeTier = 'starter' | 'growth' | 'scale' | 'authority';

export type KPIMetric =
  | 'followers-gained'
  | 'engagement-rate'
  | 'dms-received'
  | 'leads-generated'
  | 'sales-closed'
  | 'reach-per-post';

export interface GuaranteeKPI {
  metric: KPIMetric;
  targetMonthly: number;
  unit: string;
  trackingMethod: string;
}

export interface KPIProgress {
  kpi: GuaranteeKPI;
  currentValue: number;
  percentToTarget: number;
  trend: 'on-track' | 'at-risk' | 'off-track';
  daysRemaining: number;
  projectedEndValue: number;
}

export interface ContentGate {
  passed: boolean;
  hookScore: number;
  hookPassed: boolean;
  retentionPredicted3s: number;
  retentionPredictedCompletion: number;
  retentionPassesGate: boolean;
  blockers: string[];
  recommendations: string[];
  improvedHook?: string;
}

export interface CorrectionCycle {
  triggeredAt: Date;
  reason: string;
  diagnosisApplied: RetentionDiagnosis;
  actionsApplied: string[];
  resolved: boolean;
  resultAfter?: KPIProgress[];
}

export interface WeeklyCheckpoint {
  weekNumber: number;
  date: Date;
  postsPublished: number;
  avgEngagementRate: number;
  followersGained: number;
  hookPassRate: number;
  topPerformingPost?: string;
  worstPerformingPost?: string;
  correctionCycleTriggered: boolean;
}

export interface GrowthGuarantee {
  contractId: string;
  brandId: string;
  niche: NicheCategory;
  platform: 'instagram' | 'tiktok' | 'both';
  tier: GuaranteeTier;
  kpis: GuaranteeKPI[];
  startDate: Date;
  endDate: Date;
  status: 'active' | 'on-track' | 'at-risk' | 'breached' | 'achieved';
  currentProgress: KPIProgress[];
  correctionCycles: CorrectionCycle[];
  weeklyCheckpoints: WeeklyCheckpoint[];
}

const GUARANTEE_TIERS: Record<GuaranteeTier, GuaranteeKPI[]> = {
  starter: [
    {
      metric: 'followers-gained',
      targetMonthly: 500,
      unit: 'seguidores',
      trackingMethod: 'Instagram Insights → Nuevos seguidores',
    },
    { metric: 'engagement-rate', targetMonthly: 3, unit: '%', trackingMethod: 'Likes+Comments+Saves / Alcance' },
    {
      metric: 'reach-per-post',
      targetMonthly: 1000,
      unit: 'cuentas únicas',
      trackingMethod: 'Instagram Insights → Alcance',
    },
  ],
  growth: [
    {
      metric: 'followers-gained',
      targetMonthly: 2000,
      unit: 'seguidores',
      trackingMethod: 'Instagram Insights → Nuevos seguidores',
    },
    { metric: 'engagement-rate', targetMonthly: 5, unit: '%', trackingMethod: 'Likes+Comments+Saves / Alcance' },
    {
      metric: 'dms-received',
      targetMonthly: 10,
      unit: 'DMs de prospectos',
      trackingMethod: 'DMs con intención de compra',
    },
    {
      metric: 'reach-per-post',
      targetMonthly: 5000,
      unit: 'cuentas únicas',
      trackingMethod: 'Instagram Insights → Alcance',
    },
  ],
  scale: [
    {
      metric: 'followers-gained',
      targetMonthly: 5000,
      unit: 'seguidores',
      trackingMethod: 'Instagram Insights → Nuevos seguidores',
    },
    { metric: 'engagement-rate', targetMonthly: 7, unit: '%', trackingMethod: 'Likes+Comments+Saves / Alcance' },
    {
      metric: 'dms-received',
      targetMonthly: 50,
      unit: 'DMs de prospectos',
      trackingMethod: 'DMs con intención de compra',
    },
    {
      metric: 'leads-generated',
      targetMonthly: 20,
      unit: 'leads calificados',
      trackingMethod: 'ManyChat leads + form submissions',
    },
    {
      metric: 'reach-per-post',
      targetMonthly: 20000,
      unit: 'cuentas únicas',
      trackingMethod: 'Instagram Insights → Alcance',
    },
  ],
  authority: [
    {
      metric: 'followers-gained',
      targetMonthly: 10000,
      unit: 'seguidores',
      trackingMethod: 'Instagram Insights → Nuevos seguidores',
    },
    { metric: 'engagement-rate', targetMonthly: 10, unit: '%', trackingMethod: 'Likes+Comments+Saves / Alcance' },
    {
      metric: 'dms-received',
      targetMonthly: 200,
      unit: 'DMs de prospectos',
      trackingMethod: 'DMs con intención de compra',
    },
    {
      metric: 'leads-generated',
      targetMonthly: 100,
      unit: 'leads calificados',
      trackingMethod: 'ManyChat leads + form submissions',
    },
    { metric: 'sales-closed', targetMonthly: 20, unit: 'ventas', trackingMethod: 'CRM cerradas + pagos recibidos' },
    {
      metric: 'reach-per-post',
      targetMonthly: 50000,
      unit: 'cuentas únicas',
      trackingMethod: 'Instagram Insights → Alcance',
    },
  ],
};

const buildProgress = (
  kpis: GuaranteeKPI[],
  current: Partial<Record<KPIMetric, number>>,
  startDate: Date,
  endDate: Date,
): KPIProgress[] => {
  const now = Date.now();
  const totalMs = endDate.getTime() - startDate.getTime();
  const elapsedMs = now - startDate.getTime();
  const elapsedDays = elapsedMs / 86400000;
  const totalDays = totalMs / 86400000;
  const daysRemaining = Math.max(0, totalDays - elapsedDays);
  const ratio = Math.min(1, elapsedMs / totalMs);

  return kpis.map((kpi) => {
    const val = current[kpi.metric] ?? 0;
    const expected = kpi.targetMonthly * ratio;
    const trend: KPIProgress['trend'] = val >= expected ? 'on-track' : val >= expected * 0.7 ? 'at-risk' : 'off-track';
    const dailyRate = elapsedDays > 0 ? val / elapsedDays : 0;

    return {
      kpi,
      currentValue: val,
      percentToTarget: Math.round((val / kpi.targetMonthly) * 100),
      trend,
      daysRemaining: Math.round(daysRemaining),
      projectedEndValue: Math.round(val + dailyRate * daysRemaining),
    };
  });
};

class GrowthGuaranteeEngine {
  private readonly guarantees: Map<string, GrowthGuarantee> = new Map();

  createGuarantee = (
    brandId: string,
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok' | 'both',
    tier: GuaranteeTier,
    durationMonths = 1,
  ): GrowthGuarantee => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationMonths * 30 * 86400000);
    const kpis = GUARANTEE_TIERS[tier];

    const g: GrowthGuarantee = {
      contractId: `gg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      brandId,
      niche,
      platform,
      tier,
      kpis,
      startDate,
      endDate,
      status: 'active',
      currentProgress: kpis.map((kpi) => ({
        kpi,
        currentValue: 0,
        percentToTarget: 0,
        trend: 'on-track',
        daysRemaining: durationMonths * 30,
        projectedEndValue: 0,
      })),
      correctionCycles: [],
      weeklyCheckpoints: [],
    };

    this.guarantees.set(g.contractId, g);
    return g;
  };

  gateContent = (
    hook: string,
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok',
    scriptDurationSeconds: number,
    hasSubtitles: boolean,
    patternInterrupts: number,
  ): ContentGate => {
    const hs = hookEnforcer.validateAndEnforce(hook, niche);
    const pred = retentionAnalyzer.predictRetentionBeforePosting(
      hs.score,
      scriptDurationSeconds,
      hasSubtitles,
      patternInterrupts,
      platform,
    );

    const blockers: string[] = [];
    const recommendations: string[] = [];

    if (!hs.passed) {
      blockers.push(`Hook bloqueado (${hs.score}/10 < 7.0): ${hs.blockReason ?? 'Hook débil'}`);
      recommendations.push(`Hook mejorado: "${hs.improvedHook}"`);
      hs.alternativeHooks.slice(0, 2).forEach((h) => recommendations.push(`Alternativa: "${h}"`));
    }

    if (!pred.passesGate) {
      blockers.push(
        `Retención predicha insuficiente — ${pred.predicted3sRetention}% hook (mín ~75%), ${pred.predictedCompletionRate}% completado (mín ~30%)`,
      );
      if (!hasSubtitles) recommendations.push('Añadir subtítulos dinámicos (+18% retención)');
      if (patternInterrupts < 2) recommendations.push('Añadir ≥2 pattern interrupts (zoom, texto, corte)');
      if (scriptDurationSeconds > 60) recommendations.push('Recortar a ≤60s para +10% completado');
    }

    return {
      passed: blockers.length === 0,
      hookScore: hs.score,
      hookPassed: hs.passed,
      retentionPredicted3s: pred.predicted3sRetention,
      retentionPredictedCompletion: pred.predictedCompletionRate,
      retentionPassesGate: pred.passesGate,
      blockers,
      recommendations,
      improvedHook: hs.passed ? undefined : hs.improvedHook,
    };
  };

  updateProgress = (contractId: string, currentValues: Partial<Record<KPIMetric, number>>): GrowthGuarantee => {
    const g = this.guarantees.get(contractId);
    if (!g) throw new Error(`Guarantee ${contractId} not found`);

    g.currentProgress = buildProgress(g.kpis, currentValues, g.startDate, g.endDate);

    const offTrack = g.currentProgress.filter((p) => p.trend === 'off-track');
    const atRisk = g.currentProgress.filter((p) => p.trend === 'at-risk');
    const allDone = g.currentProgress.every((p) => p.percentToTarget >= 100);

    g.status = allDone ? 'achieved' : offTrack.length > 0 ? 'at-risk' : atRisk.length > 1 ? 'at-risk' : 'on-track';

    return g;
  };

  runCorrectionCycle = async (
    contractId: string,
    worstPostHook: string,
    retentionData: RetentionDataPoint[],
    videoDurationSeconds: number,
    platform: 'instagram' | 'tiktok',
    niche: NicheCategory,
    brand: BrandProfile,
  ): Promise<CorrectionCycle> => {
    const g = this.guarantees.get(contractId);
    if (!g) throw new Error(`Guarantee ${contractId} not found`);

    const diagnosis = retentionAnalyzer.analyzeRetentionCurve(
      contractId,
      platform,
      niche,
      retentionData,
      videoDurationSeconds,
      worstPostHook,
    );

    const actionsApplied: string[] = [];
    if (diagnosis.recovery) {
      actionsApplied.push(`Acción primaria: ${diagnosis.recovery.primaryAction}`);
      actionsApplied.push(...diagnosis.recovery.editInstructions);
      if (diagnosis.recovery.newHookSuggestions[0]) {
        actionsApplied.push(`Nuevo hook: "${diagnosis.recovery.newHookSuggestions[0]}"`);
      }
    }

    const singlePlatform: 'instagram' | 'tiktok' = platform;
    const newPlan = await trendIdeationEngine.generateMonthlyPlan(niche, singlePlatform, '', brand).catch(() => null);
    if (newPlan?.topIdeas[0]) {
      actionsApplied.push(`Nuevo contenido prioritario: "${newPlan.topIdeas[0].hook}"`);
    }

    const offTrackMetrics = g.currentProgress
      .filter((p) => p.trend !== 'on-track')
      .map((p) => p.kpi.metric)
      .join(', ');

    const cycle: CorrectionCycle = {
      triggeredAt: new Date(),
      reason: `${diagnosis.overallScore} retention — ${offTrackMetrics || 'revisión preventiva'}`,
      diagnosisApplied: diagnosis,
      actionsApplied,
      resolved: false,
    };

    g.correctionCycles.push(cycle);
    return cycle;
  };

  generateWeeklyReport = (contractId: string): string => {
    const g = this.guarantees.get(contractId);
    if (!g) return 'Garantía no encontrada';

    const elapsed = Math.round((Date.now() - g.startDate.getTime()) / 86400000);
    const total = Math.round((g.endDate.getTime() - g.startDate.getTime()) / 86400000);

    const statusEmoji =
      g.status === 'achieved' ? '✅' : g.status === 'on-track' ? '🟢' : g.status === 'at-risk' ? '🟡' : '🔴';

    const kpiLines = g.currentProgress
      .map((p) => {
        const bar = '█'.repeat(Math.min(10, Math.round(p.percentToTarget / 10))).padEnd(10, '░');
        const emoji = p.trend === 'on-track' ? '✅' : p.trend === 'at-risk' ? '⚠️' : '❌';
        return `${emoji} **${p.kpi.metric}**: ${p.currentValue}/${p.kpi.targetMonthly} ${p.kpi.unit} [${bar}] ${p.percentToTarget}%`;
      })
      .join('\n');

    const cycleLines =
      g.correctionCycles.length === 0
        ? 'Sin ciclos de corrección activados ✅'
        : g.correctionCycles
            .map(
              (c) => `- ${c.triggeredAt.toDateString()}: ${c.reason} → ${c.actionsApplied[0] ?? 'acciones aplicadas'}`,
            )
            .join('\n');

    const projLines = g.currentProgress
      .map(
        (p) =>
          `- **${p.kpi.metric}**: proyectado ${p.projectedEndValue} vs objetivo ${p.kpi.targetMonthly} ${p.kpi.unit}`,
      )
      .join('\n');

    return `# Reporte Semanal — Garantía ${g.tier.toUpperCase()}
**ID:** ${g.contractId} | **Día:** ${elapsed}/${total}
**Estado:** ${statusEmoji} ${g.status.toUpperCase()}

## KPIs vs Objetivos
${kpiLines}

## Ciclos de Corrección
${cycleLines}

## Proyección Final
${projLines}
`.trim();
  };

  getGuarantee = (contractId: string): GrowthGuarantee | undefined => this.guarantees.get(contractId);

  getTierKPIs = (tier: GuaranteeTier): GuaranteeKPI[] => GUARANTEE_TIERS[tier];

  listTiers = (): Record<GuaranteeTier, { kpis: GuaranteeKPI[]; description: string }> => ({
    starter: { kpis: GUARANTEE_TIERS.starter, description: '+500 seguidores/mes, 3% engagement, 1K alcance/post' },
    growth: { kpis: GUARANTEE_TIERS.growth, description: '+2K seguidores/mes, 5% engagement, 10 DMs/mes' },
    scale: { kpis: GUARANTEE_TIERS.scale, description: '+5K seguidores/mes, 7% engagement, 50 DMs, 20 leads/mes' },
    authority: {
      kpis: GUARANTEE_TIERS.authority,
      description: '+10K seguidores/mes, 10% engagement, 200 DMs, 20 ventas/mes',
    },
  });
}

export const growthGuaranteeEngine = new GrowthGuaranteeEngine();
