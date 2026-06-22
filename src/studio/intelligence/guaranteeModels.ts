/**
 * Enhanced Guarantee Models — Expanded tiers, SLA enforcement, money-back triggers,
 * risk-adjusted pricing, performance bond structure, Bayesian risk scoring.
 *
 * Money-back: auto partial refund if <50% KPIs at month end, full refund if <25%.
 * Risk score adjusts guarantee price via actuarial-style multiplier.
 */

import type { NicheCategory, MonetizationModel } from './nicheAnalyzer.js';
import type { GuaranteeTier, KPIMetric, GuaranteeKPI } from './growthGuaranteeEngine.js';

// ── Extended Tier System ───────────────────────────────────────────────────────

export type ExtendedGuaranteeTier =
  | 'nano' // New: micro-accounts <1K followers
  | 'starter' // 500 followers/3% eng
  | 'growth' // 2K followers/5% eng
  | 'scale' // 5K followers/7% eng
  | 'authority' // 10K followers/10% eng
  | 'viral' // New: 25K followers/12% eng
  | 'elite'; // New: 50K followers/15% eng + revenue guarantee

export interface TierDefinition {
  tier: ExtendedGuaranteeTier;
  displayName: string;
  description: string;
  kpis: GuaranteeKPI[];
  baseMonthlyPrice: number; // USD agency price
  performanceBond: number; // USD held in escrow as guarantee collateral
  moneyBackThreshold: {
    partial: number; // % of KPIs met → 50% refund
    full: number; // % of KPIs met → 100% refund
  };
  sla: SLATerm[];
  eligibilityCriteria: string[];
}

export interface SLATerm {
  metric: string;
  requirement: string;
  measurementWindow: string;
  penalty: string;
}

export interface RiskFactor {
  factor: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-1
  mitigationRequired: boolean;
  mitigation: string;
}

export interface RiskAssessment {
  clientId: string;
  niche: NicheCategory;
  platform: 'instagram' | 'tiktok' | 'both';
  tier: ExtendedGuaranteeTier;
  riskFactors: RiskFactor[];
  overallRiskScore: number; // 0-1
  riskCategory: 'green' | 'yellow' | 'red' | 'reject';
  priceMultiplier: number; // Applied to base tier price
  adjustedMonthlyPrice: number;
  recommendedTier: ExtendedGuaranteeTier;
  approvalStatus: 'approved' | 'approved-with-conditions' | 'declined';
  conditions: string[];
}

export interface MoneyBackClaim {
  claimId: string;
  contractId: string;
  clientId: string;
  claimDate: Date;
  tier: ExtendedGuaranteeTier;
  kpiAchievementPct: number; // % of all KPIs met
  refundType: 'none' | 'partial' | 'full';
  refundAmount: number;
  refundReason: string;
  evidenceRequired: string[];
  processingDays: number;
  status: 'pending' | 'processing' | 'approved' | 'paid' | 'disputed';
}

export interface PerformanceBond {
  bondId: string;
  contractId: string;
  bondAmount: number;
  escrowProvider: string;
  releaseCondition: string; // Condition to release bond back to agency
  forfeitCondition: string; // Condition to release bond to client
  status: 'held' | 'released' | 'partially-forfeited' | 'forfeited';
}

export interface GuaranteeContract {
  contractId: string;
  clientId: string;
  niche: NicheCategory;
  tier: ExtendedGuaranteeTier;
  platform: 'instagram' | 'tiktok' | 'both';
  startDate: Date;
  endDate: Date;
  monthlyPrice: number;
  performanceBond: PerformanceBond;
  slaTerms: SLATerm[];
  kpis: GuaranteeKPI[];
  riskAssessment: RiskAssessment;
  moneyBackPolicy: TierDefinition['moneyBackThreshold'];
  status: 'draft' | 'active' | 'completed' | 'breached' | 'claimed' | 'disputed';
}

// ── Extended Tier Definitions ─────────────────────────────────────────────────

const STANDARD_SLA: SLATerm[] = [
  {
    metric: 'Respuesta a revisiones',
    requirement: '≤24h días hábiles',
    measurementWindow: 'Por entregable',
    penalty: '10% descuento mes si >48h en >2 ocasiones',
  },
  {
    metric: 'Publicaciones semanales',
    requirement: 'Mínimo 5 posts/semana',
    measurementWindow: 'Semanal',
    penalty: 'Ciclo de corrección activado automáticamente',
  },
  {
    metric: 'Reporte de KPIs',
    requirement: 'Cada 7 días',
    measurementWindow: 'Mensual',
    penalty: 'Día gratis de servicio por reporte tardío',
  },
  {
    metric: 'Reunión de estrategia',
    requirement: '1 call mensual de revisión',
    measurementWindow: 'Mensual',
    penalty: 'Sesión adicional sin costo si se cancela sin aviso 24h',
  },
];

const PREMIUM_SLA: SLATerm[] = [
  ...STANDARD_SLA,
  {
    metric: 'Crisis de reputación',
    requirement: 'Respuesta plan acción ≤4h',
    measurementWindow: 'Por evento',
    penalty: '1 semana servicio gratuito si demora >12h',
  },
  {
    metric: 'A/B testing',
    requirement: 'Mínimo 2 variantes por semana',
    measurementWindow: 'Semanal',
    penalty: 'Crédito equivalente al costo de producción del test',
  },
];

export const EXTENDED_TIERS: Record<ExtendedGuaranteeTier, TierDefinition> = {
  nano: {
    tier: 'nano',
    displayName: 'Nano Boost',
    description: 'Para cuentas nuevas o dormidas. Construye base sólida antes de monetizar.',
    kpis: [
      {
        metric: 'followers-gained',
        targetMonthly: 200,
        unit: 'seguidores',
        trackingMethod: 'Instagram Insights → Nuevos seguidores',
      },
      { metric: 'engagement-rate', targetMonthly: 4, unit: '%', trackingMethod: 'Likes+Comments+Saves / Alcance' },
      {
        metric: 'reach-per-post',
        targetMonthly: 500,
        unit: 'cuentas únicas',
        trackingMethod: 'Instagram Insights → Alcance',
      },
    ],
    baseMonthlyPrice: 500,
    performanceBond: 500,
    moneyBackThreshold: { partial: 0.4, full: 0.2 },
    sla: STANDARD_SLA,
    eligibilityCriteria: ['Cuenta <1000 seguidores', 'Nicho definido', 'Mínimo 3 meses en red social'],
  },
  starter: {
    tier: 'starter',
    displayName: 'Starter Growth',
    description: '+500 seguidores/mes garantizados. Fundación para monetización.',
    kpis: [
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
    baseMonthlyPrice: 1200,
    performanceBond: 1200,
    moneyBackThreshold: { partial: 0.5, full: 0.25 },
    sla: STANDARD_SLA,
    eligibilityCriteria: ['Cuenta 500-5K seguidores', 'Nicho con demanda verificada'],
  },
  growth: {
    tier: 'growth',
    displayName: 'Growth Engine',
    description: '+2K seguidores/mes + DMs de prospectos. Primera monetización activa.',
    kpis: [
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
    baseMonthlyPrice: 2500,
    performanceBond: 2500,
    moneyBackThreshold: { partial: 0.5, full: 0.25 },
    sla: STANDARD_SLA,
    eligibilityCriteria: ['Cuenta 1K-10K seguidores', 'Oferta de venta definida', 'ManyChat operativo'],
  },
  scale: {
    tier: 'scale',
    displayName: 'Scale Machine',
    description: '+5K seguidores/mes + 20 leads calificados. Revenue pipeline activo.',
    kpis: [
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
    baseMonthlyPrice: 5000,
    performanceBond: 5000,
    moneyBackThreshold: { partial: 0.5, full: 0.25 },
    sla: PREMIUM_SLA,
    eligibilityCriteria: [
      'Cuenta 5K-50K seguidores',
      'CRM activo',
      'Budget producción ≥$500/mes',
      'Oferta validada con ventas previas',
    ],
  },
  authority: {
    tier: 'authority',
    displayName: 'Authority Builder',
    description: '+10K seguidores/mes + 20 ventas cerradas. Autoridad de mercado.',
    kpis: [
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
    baseMonthlyPrice: 10000,
    performanceBond: 10000,
    moneyBackThreshold: { partial: 0.5, full: 0.25 },
    sla: PREMIUM_SLA,
    eligibilityCriteria: [
      'Cuenta 20K+ seguidores',
      'Ticket promedio ≥$500',
      'Equipo de ventas disponible',
      'Budget producción ≥$2000/mes',
    ],
  },
  viral: {
    tier: 'viral',
    displayName: 'Viral Dominator',
    description: '+25K seguidores/mes + 12% engagement + viralidad garantizada en nicho.',
    kpis: [
      {
        metric: 'followers-gained',
        targetMonthly: 25000,
        unit: 'seguidores',
        trackingMethod: 'Instagram Insights → Nuevos seguidores',
      },
      { metric: 'engagement-rate', targetMonthly: 12, unit: '%', trackingMethod: 'Likes+Comments+Saves / Alcance' },
      {
        metric: 'dms-received',
        targetMonthly: 500,
        unit: 'DMs de prospectos',
        trackingMethod: 'DMs con intención de compra',
      },
      {
        metric: 'leads-generated',
        targetMonthly: 250,
        unit: 'leads calificados',
        trackingMethod: 'ManyChat leads + form submissions',
      },
      { metric: 'sales-closed', targetMonthly: 50, unit: 'ventas', trackingMethod: 'CRM cerradas + pagos recibidos' },
      {
        metric: 'reach-per-post',
        targetMonthly: 100000,
        unit: 'cuentas únicas',
        trackingMethod: 'Instagram Insights → Alcance',
      },
    ],
    baseMonthlyPrice: 20000,
    performanceBond: 20000,
    moneyBackThreshold: { partial: 0.55, full: 0.3 },
    sla: PREMIUM_SLA,
    eligibilityCriteria: [
      'Cuenta 50K+ seguidores',
      'Historial de contenido viral',
      'Budget producción ≥$5000/mes',
      'Equipo completo: copywriter + videógrafo + editor',
      'CRM avanzado operativo',
    ],
  },
  elite: {
    tier: 'elite',
    displayName: 'Elite Revenue Partner',
    description: '+50K seguidores/mes + 15% engagement + garantía de ingresos mínimos $X.',
    kpis: [
      {
        metric: 'followers-gained',
        targetMonthly: 50000,
        unit: 'seguidores',
        trackingMethod: 'Instagram Insights → Nuevos seguidores',
      },
      { metric: 'engagement-rate', targetMonthly: 15, unit: '%', trackingMethod: 'Likes+Comments+Saves / Alcance' },
      {
        metric: 'dms-received',
        targetMonthly: 1000,
        unit: 'DMs de prospectos',
        trackingMethod: 'DMs con intención de compra',
      },
      {
        metric: 'leads-generated',
        targetMonthly: 500,
        unit: 'leads calificados',
        trackingMethod: 'ManyChat leads + form submissions',
      },
      { metric: 'sales-closed', targetMonthly: 100, unit: 'ventas', trackingMethod: 'CRM cerradas + pagos recibidos' },
      {
        metric: 'reach-per-post',
        targetMonthly: 250000,
        unit: 'cuentas únicas',
        trackingMethod: 'Instagram Insights → Alcance',
      },
    ],
    baseMonthlyPrice: 40000,
    performanceBond: 40000,
    moneyBackThreshold: { partial: 0.6, full: 0.35 },
    sla: [
      ...PREMIUM_SLA,
      {
        metric: 'Garantía de ingresos',
        requirement: 'Revenue mínimo acordado o reembolso proporcional',
        measurementWindow: 'Mensual',
        penalty: 'Reembolso proporcional a la brecha de revenue',
      },
    ],
    eligibilityCriteria: [
      'Cuenta 100K+ seguidores',
      'Revenue histórico verificable ≥$20K/mes social',
      'Acuerdo previo de revenue share o retainer elite',
      'Due diligence completado',
      'Contrato mínimo 3 meses',
    ],
  },
};

// ── Risk Scoring (Bayesian-style) ─────────────────────────────────────────────

const NICHE_BASE_RISK: Partial<Record<NicheCategory, number>> = {
  coaching: 0.25,
  'fitness-coaching': 0.22,
  ecommerce: 0.3,
  finance: 0.4, // High-trust niche — harder to grow organically fast
  'b2b-services': 0.45,
  education: 0.2,
  beauty: 0.18,
  entertainment: 0.15,
  'personal-brand': 0.22,
};

const PLATFORM_RISK_MODIFIER: Record<'instagram' | 'tiktok' | 'both', number> = {
  tiktok: -0.05, // Easier organic reach
  instagram: +0.05,
  both: +0.02,
};

export const assessRisk = (
  clientId: string,
  niche: NicheCategory,
  platform: 'instagram' | 'tiktok' | 'both',
  tier: ExtendedGuaranteeTier,
  currentFollowers: number,
  monthsActive: number,
  hasManyChatEnabled: boolean,
  monetizationModel: MonetizationModel,
  budgetForContent: number, // USD/month
): RiskAssessment => {
  const tierDef = EXTENDED_TIERS[tier];
  const riskFactors: RiskFactor[] = [];

  // Factor 1: Account age / momentum
  if (monthsActive < 3) {
    riskFactors.push({
      factor: 'Cuenta nueva (<3 meses)',
      riskLevel: 'high',
      riskScore: 0.35,
      mitigationRequired: true,
      mitigation: 'Recomendar tier Nano primero por 2 meses',
    });
  } else if (monthsActive < 12) {
    riskFactors.push({
      factor: 'Cuenta joven (3-12 meses)',
      riskLevel: 'medium',
      riskScore: 0.15,
      mitigationRequired: false,
      mitigation: 'Monitoreo semanal intensivo primer mes',
    });
  }

  // Factor 2: Follower base vs tier requirement
  const minFollowersForTier: Record<ExtendedGuaranteeTier, number> = {
    nano: 0,
    starter: 200,
    growth: 500,
    scale: 2000,
    authority: 5000,
    viral: 20000,
    elite: 50000,
  };
  const minReq = minFollowersForTier[tier];
  if (currentFollowers < minReq * 0.5) {
    riskFactors.push({
      factor: `Seguidores actuales (${currentFollowers}) muy por debajo del mínimo recomendado (${minReq})`,
      riskLevel: 'critical',
      riskScore: 0.5,
      mitigationRequired: true,
      mitigation: `Downgrade a tier anterior y revisar en 2 meses`,
    });
  } else if (currentFollowers < minReq) {
    riskFactors.push({
      factor: `Seguidores actuales (${currentFollowers}) por debajo del recomendado (${minReq})`,
      riskLevel: 'medium',
      riskScore: 0.2,
      mitigationRequired: false,
      mitigation: 'Plan de aceleración primeras 2 semanas',
    });
  }

  // Factor 3: Content budget
  const minBudget: Record<ExtendedGuaranteeTier, number> = {
    nano: 200,
    starter: 300,
    growth: 500,
    scale: 800,
    authority: 2000,
    viral: 5000,
    elite: 10000,
  };
  if (budgetForContent < minBudget[tier]) {
    riskFactors.push({
      factor: `Budget producción $${budgetForContent}/mes < mínimo $${minBudget[tier]}`,
      riskLevel: 'high',
      riskScore: 0.3,
      mitigationRequired: true,
      mitigation: `Aumentar budget a $${minBudget[tier]}/mes o bajar tier`,
    });
  }

  // Factor 4: ManyChat
  if (!hasManyChatEnabled && (tier === 'scale' || tier === 'authority' || tier === 'viral' || tier === 'elite')) {
    riskFactors.push({
      factor: 'ManyChat no configurado',
      riskLevel: 'high',
      riskScore: 0.25,
      mitigationRequired: true,
      mitigation: 'Configurar ManyChat antes de inicio — requisito para garantía de leads/ventas',
    });
  }

  // Factor 5: Niche-specific risk
  const nicheRisk = NICHE_BASE_RISK[niche] ?? 0.3;
  if (nicheRisk > 0.35) {
    riskFactors.push({
      factor: `Nicho ${niche} — crecimiento orgánico lento históricamente`,
      riskLevel: 'medium',
      riskScore: nicheRisk,
      mitigationRequired: false,
      mitigation: 'Estrategia de contenido educativo + autoridad en lugar de entretenimiento puro',
    });
  }

  // Factor 6: Revenue-focused tier without sales infrastructure
  if ((tier === 'authority' || tier === 'elite') && monetizationModel === 'digital-products') {
    riskFactors.push({
      factor: 'Tier de ventas sin infraestructura CRM',
      riskLevel: 'medium',
      riskScore: 0.18,
      mitigationRequired: false,
      mitigation: 'Implementar CRM mínimo (Notion/Airtable) para tracking de ventas',
    });
  }

  // Aggregate risk score
  const platformMod = PLATFORM_RISK_MODIFIER[platform];
  const baseRisk = nicheRisk + platformMod;
  const factorsRisk = riskFactors.reduce((sum, f) => sum + f.riskScore * 0.3, 0);
  const overallRiskScore = Math.min(1, baseRisk + factorsRisk);

  const riskCategory: RiskAssessment['riskCategory'] =
    overallRiskScore < 0.25 ? 'green' : overallRiskScore < 0.45 ? 'yellow' : overallRiskScore < 0.65 ? 'red' : 'reject';

  // Price multiplier (actuarial: higher risk = higher price)
  const priceMultiplier =
    riskCategory === 'green' ? 1.0 : riskCategory === 'yellow' ? 1.15 : riskCategory === 'red' ? 1.35 : 1.6;

  const adjustedPrice = Math.round(tierDef.baseMonthlyPrice * priceMultiplier);

  // Recommend lower tier if critical risk factors exist
  const hasCritical = riskFactors.some((f) => f.riskLevel === 'critical');
  const tierOrder: ExtendedGuaranteeTier[] = ['nano', 'starter', 'growth', 'scale', 'authority', 'viral', 'elite'];
  const tierIdx = tierOrder.indexOf(tier);
  const recommendedTier: ExtendedGuaranteeTier = hasCritical && tierIdx > 0 ? tierOrder[tierIdx - 1]! : tier;

  const approvalStatus: RiskAssessment['approvalStatus'] =
    riskCategory === 'reject' ? 'declined' : riskCategory === 'red' ? 'approved-with-conditions' : 'approved';

  const conditions = riskFactors.filter((f) => f.mitigationRequired).map((f) => f.mitigation);

  return {
    clientId,
    niche,
    platform,
    tier,
    riskFactors,
    overallRiskScore: parseFloat(overallRiskScore.toFixed(3)),
    riskCategory,
    priceMultiplier,
    adjustedMonthlyPrice: adjustedPrice,
    recommendedTier,
    approvalStatus,
    conditions,
  };
};

// ── Money-back claim processor ────────────────────────────────────────────────

export const processMoneyBackClaim = (
  contractId: string,
  clientId: string,
  tier: ExtendedGuaranteeTier,
  monthlyPrice: number,
  kpiResults: Array<{ metric: KPIMetric; achieved: number; target: number }>,
): MoneyBackClaim => {
  const tierDef = EXTENDED_TIERS[tier];
  const metCount = kpiResults.filter((k) => k.achieved >= k.target).length;
  const kpiAchievementPct = kpiResults.length > 0 ? metCount / kpiResults.length : 0;

  let refundType: MoneyBackClaim['refundType'] = 'none';
  let refundAmount = 0;

  if (kpiAchievementPct < tierDef.moneyBackThreshold.full) {
    refundType = 'full';
    refundAmount = monthlyPrice;
  } else if (kpiAchievementPct < tierDef.moneyBackThreshold.partial) {
    refundType = 'partial';
    refundAmount = Math.round(monthlyPrice * 0.5);
  }

  const failedKpis = kpiResults.filter((k) => k.achieved < k.target);
  const refundReason =
    refundType === 'none'
      ? `KPIs cumplidos: ${Math.round(kpiAchievementPct * 100)}% (≥${Math.round(tierDef.moneyBackThreshold.partial * 100)}% mínimo)`
      : `Solo ${Math.round(kpiAchievementPct * 100)}% de KPIs alcanzados. Fallaron: ${failedKpis.map((k) => k.metric).join(', ')}`;

  return {
    claimId: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    contractId,
    clientId,
    claimDate: new Date(),
    tier,
    kpiAchievementPct: parseFloat((kpiAchievementPct * 100).toFixed(1)),
    refundType,
    refundAmount,
    refundReason,
    evidenceRequired: [
      'Capturas de Instagram Insights de todo el mes',
      'Export de datos de ManyChat (si aplica)',
      'Reporte de ventas del CRM (si aplica)',
      'Screenshots de todos los posts publicados',
    ],
    processingDays: refundType === 'full' ? 7 : 5,
    status: refundType === 'none' ? 'approved' : 'pending',
  };
};

// ── Performance bond ──────────────────────────────────────────────────────────

export const createPerformanceBond = (contractId: string, tier: ExtendedGuaranteeTier): PerformanceBond => ({
  bondId: `bond_${contractId}_${Date.now()}`,
  contractId,
  bondAmount: EXTENDED_TIERS[tier].performanceBond,
  escrowProvider: 'Stripe Escrow / Cuenta separada',
  releaseCondition: 'Todos los KPIs del tier alcanzados al final del período de garantía',
  forfeitCondition: `KPIs por debajo del ${Math.round(EXTENDED_TIERS[tier].moneyBackThreshold.full * 100)}% → reembolso total al cliente`,
  status: 'held',
});

// ── Contract factory ──────────────────────────────────────────────────────────

export const createGuaranteeContract = (
  clientId: string,
  niche: NicheCategory,
  tier: ExtendedGuaranteeTier,
  platform: 'instagram' | 'tiktok' | 'both',
  riskAssessment: RiskAssessment,
  durationMonths = 1,
): GuaranteeContract => {
  const tierDef = EXTENDED_TIERS[tier];
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationMonths * 30 * 86400000);
  const contractId = `contract_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    contractId,
    clientId,
    niche,
    tier,
    platform,
    startDate,
    endDate,
    monthlyPrice: riskAssessment.adjustedMonthlyPrice,
    performanceBond: createPerformanceBond(contractId, tier),
    slaTerms: tierDef.sla,
    kpis: tierDef.kpis,
    riskAssessment,
    moneyBackPolicy: tierDef.moneyBackThreshold,
    status: riskAssessment.approvalStatus === 'declined' ? 'draft' : 'active',
  };
};

// ── Report ────────────────────────────────────────────────────────────────────

export const formatRiskReport = (assessment: RiskAssessment): string => {
  const statusEmoji =
    assessment.riskCategory === 'green'
      ? '✅'
      : assessment.riskCategory === 'yellow'
        ? '⚠️'
        : assessment.riskCategory === 'red'
          ? '🔴'
          : '⛔';
  const riskPct = Math.round(assessment.overallRiskScore * 100);

  const factorLines = assessment.riskFactors
    .map((f) => {
      const emoji =
        f.riskLevel === 'critical' ? '⛔' : f.riskLevel === 'high' ? '🔴' : f.riskLevel === 'medium' ? '⚠️' : '🟡';
      return `  ${emoji} ${f.factor}\n     Mitigación: ${f.mitigation}`;
    })
    .join('\n');

  const conditionLines =
    assessment.conditions.length > 0 ? assessment.conditions.map((c) => `  • ${c}`).join('\n') : '  Ninguna';

  return `
# Risk Assessment — Garantía ${assessment.tier.toUpperCase()}

${statusEmoji} **Riesgo: ${riskPct}% (${assessment.riskCategory.toUpperCase()})**
**Aprobación:** ${assessment.approvalStatus}
**Precio ajustado:** $${assessment.adjustedMonthlyPrice.toLocaleString()}/mes (${assessment.priceMultiplier}x base)
**Tier recomendado:** ${assessment.recommendedTier}

## Factores de Riesgo
${factorLines || '  Sin factores de riesgo significativos ✅'}

## Condiciones para Activación
${conditionLines}
`.trim();
};

export const listAllTiers = (): TierDefinition[] => Object.values(EXTENDED_TIERS);

export const getTierDefinition = (tier: ExtendedGuaranteeTier): TierDefinition => EXTENDED_TIERS[tier];
