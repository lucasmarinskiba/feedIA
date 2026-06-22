/**
 * Content Scoring Matrix — 7-dimension scoring system with Go/No-Go gate
 *
 * Dimensions: hook strength, retention architecture, algorithm alignment,
 * audience resonance, conversion potential, production quality, timing optimization.
 * Weighted score 0-100. Go = ≥72, Conditional = 55-71, No-Go = <55.
 */

import type { NicheCategory } from './nicheAnalyzer.js';
import { hookEnforcer } from './hookEnforcer.js';
import { retentionAnalyzer } from './retentionAnalyzer.js';

// ── Types ────────────────────────────────────────────────────────────────────

export type ScoringDimension =
  | 'hook-strength'
  | 'retention-architecture'
  | 'algorithm-alignment'
  | 'audience-resonance'
  | 'conversion-potential'
  | 'production-quality'
  | 'timing-optimization';

export type ContentDecision = 'GO' | 'CONDITIONAL' | 'NO-GO';

export interface DimensionScore {
  dimension: ScoringDimension;
  score: number; // 0-10
  weight: number; // 0-1 (all weights sum to 1)
  weightedScore: number; // score × weight × 10 → contribution to 0-100 total
  benchmarkComparison: string;
  criticalIssues: string[];
  improvements: string[];
  confidence: number; // 0-1
}

export interface ContentScoringInput {
  niche: NicheCategory;
  platform: 'instagram' | 'tiktok';
  contentFormat: 'reel' | 'carousel' | 'static' | 'story' | 'live';
  hook: string;
  hookScore?: number; // Pre-computed from hookEnforcer (0-10)
  scriptLengthSeconds?: number;
  hasSubtitles?: boolean;
  patternInterruptCount?: number;
  hasCTA?: boolean;
  ctaType?: 'comment-keyword' | 'link-in-bio' | 'dm-keyword' | 'save' | 'share';
  manychatKeyword?: string;
  trendAlignmentScore?: number; // 0-10 from viralityPredictor
  postingHour?: number; // 0-23
  postingDayOfWeek?: number; // 0=Sun, 6=Sat
  hasOriginalAudio?: boolean;
  hasBroll?: boolean;
  hasColorGrade?: boolean;
  resolutionHD?: boolean;
  audienceResonanceScore?: number; // 0-10 from viralityPredictor
  hashtags?: string[];
  contentPillar?: 'education' | 'entertainment' | 'inspiration' | 'promotion' | 'connection';
}

export interface ContentScoreResult {
  totalScore: number; // 0-100
  decision: ContentDecision;
  dimensions: DimensionScore[];
  topBlocker: string | null;
  quickWins: string[]; // Improvements with highest ROI
  estimatedEngagementRange: { low: number; high: number }; // % range
  estimatedReachMultiplier: number;
  postingRecommendation: string;
  compositeLabel: string; // e.g. "Viral Potential" / "Needs Work"
}

// ── Weights (sum = 1.0) ───────────────────────────────────────────────────────

const DIMENSION_WEIGHTS: Record<ScoringDimension, number> = {
  'hook-strength': 0.28, // Biggest retention lever
  'retention-architecture': 0.2, // Watch time drives algorithm
  'algorithm-alignment': 0.18, // Platform distribution signal
  'audience-resonance': 0.14, // Psychological fit
  'conversion-potential': 0.1, // Business outcome
  'production-quality': 0.06, // Table stakes (threshold not differentiator)
  'timing-optimization': 0.04, // Last-mile multiplier
};

// ── Benchmarks ────────────────────────────────────────────────────────────────

const PLATFORM_BENCHMARKS = {
  instagram: { avgEngagement: 3.5, topEngagement: 8.0, avgReach: 1.2, topReach: 3.5 },
  tiktok: { avgEngagement: 5.0, topEngagement: 12.0, avgReach: 2.0, topReach: 8.0 },
};

const BEST_POSTING_WINDOWS: Record<'instagram' | 'tiktok', { hours: number[]; days: number[] }> = {
  instagram: { hours: [7, 8, 11, 12, 17, 18, 19], days: [1, 2, 3, 4] }, // Mon-Thu, morning/lunch/evening
  tiktok: { hours: [6, 7, 9, 12, 19, 20, 21], days: [2, 3, 4, 5] }, // Tue-Fri
};

const FORMAT_ALGORITHM_FIT: Record<'instagram' | 'tiktok', Record<string, number>> = {
  instagram: { reel: 9.5, carousel: 8.0, story: 5.0, static: 4.0, live: 7.0 },
  tiktok: { reel: 9.8, story: 4.0, carousel: 5.5, static: 3.0, live: 8.5 },
};

const CTA_CONVERSION_SCORES: Record<string, number> = {
  'comment-keyword': 9.5, // Highest algo boost + ManyChat trigger
  'dm-keyword': 9.0,
  save: 8.0,
  share: 7.5,
  'link-in-bio': 6.0,
};

const CONTENT_PILLAR_RESONANCE: Record<string, number> = {
  education: 8.5,
  entertainment: 9.0,
  inspiration: 8.0,
  connection: 8.5,
  promotion: 5.5, // Pure promo content underperforms
};

const PRODUCTION_BASELINE: Record<'instagram' | 'tiktok', number> = {
  instagram: 7.0,
  tiktok: 6.0, // TikTok rewards authenticity more than polish
};

// ── Dimension Scorers ─────────────────────────────────────────────────────────

const scoreHookStrength = (
  input: ContentScoringInput,
): Omit<DimensionScore, 'dimension' | 'weight' | 'weightedScore'> => {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = input.hookScore ?? 5;

  if (input.hook.length < 15) {
    score = Math.min(score, 4);
    issues.push('Hook demasiado corto (<15 chars)');
    improvements.push('Expandir hook con especificidad o número concreto');
  }

  if (score < 7) {
    issues.push(`Hook score ${score}/10 < umbral 7.0`);
    const validated = hookEnforcer.validateAndEnforce(input.hook, input.niche);
    if (validated.improvedHook) improvements.push(`Hook mejorado: "${validated.improvedHook}"`);
    if (validated.alternativeHooks[0]) improvements.push(`Alternativa: "${validated.alternativeHooks[0]}"`);
  }

  const benchmarkComparison =
    score >= 8.5
      ? 'Top 10% hooks del nicho'
      : score >= 7
        ? 'Por encima del promedio (7.0 umbral viral)'
        : score >= 5
          ? 'Promedio — no pasa el gate'
          : 'Por debajo del promedio — alto riesgo de abandono en 3s';

  return {
    score,
    benchmarkComparison,
    criticalIssues: issues,
    improvements,
    confidence: input.hookScore !== undefined ? 0.95 : 0.7,
  };
};

const scoreRetentionArchitecture = (
  input: ContentScoringInput,
): Omit<DimensionScore, 'dimension' | 'weight' | 'weightedScore'> => {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 7.0;

  // Subtitles: +18% retention on average
  if (input.hasSubtitles === false) {
    score -= 1.5;
    issues.push('Sin subtítulos dinámicos');
    improvements.push('Añadir subtítulos — +18% retención media');
  }

  // Pattern interrupts
  const pi = input.patternInterruptCount ?? 0;
  if (pi >= 3) score += 1.5;
  else if (pi >= 2) score += 0.8;
  else if (pi === 1) score += 0.2;
  else {
    score -= 1.0;
    issues.push('Sin pattern interrupts');
    improvements.push('Añadir ≥2 zooms, cortes B-roll o texto on-screen cada 5-7s');
  }

  // Duration sweet spot
  const dur = input.scriptLengthSeconds ?? 30;
  const optimalDur = input.platform === 'tiktok' ? [15, 45] : [15, 60];
  if (dur < optimalDur[0]!) {
    score -= 0.5;
    issues.push(`Muy corto (${dur}s) — algoritmo prefiere ≥${optimalDur[0]}s`);
  } else if (dur > optimalDur[1]!) {
    score -= 1.0;
    issues.push(`Muy largo (${dur}s) — completado cae >20% sobre ${optimalDur[1]}s`);
    improvements.push(`Recortar a ≤${optimalDur[1]}s`);
  }

  // Predict retention
  if (input.hookScore !== undefined) {
    const pred = retentionAnalyzer.predictRetentionBeforePosting(
      input.hookScore,
      input.scriptLengthSeconds ?? 30,
      input.hasSubtitles ?? false,
      pi,
      input.platform,
    );
    if (pred.predictedCompletionRate < 30) {
      score = Math.min(score, 5.0);
      issues.push(`Completado predicho: ${pred.predictedCompletionRate}% < 30% benchmark`);
    }
  }

  score = Math.max(0, Math.min(10, score));

  const benchmarkComparison =
    score >= 8
      ? 'Arquitectura de retención sólida — completado predicho >40%'
      : score >= 6
        ? 'Retención aceptable — completado ~30%'
        : 'Retención en riesgo — alta probabilidad de drop-off temprano';

  return { score, benchmarkComparison, criticalIssues: issues, improvements, confidence: 0.8 };
};

const scoreAlgorithmAlignment = (
  input: ContentScoringInput,
): Omit<DimensionScore, 'dimension' | 'weight' | 'weightedScore'> => {
  const issues: string[] = [];
  const improvements: string[] = [];

  const formatScore = FORMAT_ALGORITHM_FIT[input.platform][input.contentFormat] ?? 5.0;
  let score = formatScore;

  // Trend alignment
  const trendScore = input.trendAlignmentScore ?? 5;
  score = score * 0.6 + trendScore * 0.4;

  // Original audio boosts TikTok, less Instagram
  if (input.hasOriginalAudio === false && input.platform === 'tiktok') {
    score -= 0.8;
    improvements.push('Usar audio trending de TikTok — +15% distribución');
  }

  // Hashtags
  const tagCount = input.hashtags?.length ?? 0;
  const optimalTags = input.platform === 'instagram' ? 5 : 3;
  if (tagCount === 0) {
    score -= 0.5;
    improvements.push(`Añadir ${optimalTags} hashtags de nicho`);
  } else if (tagCount > 10) {
    score -= 0.3;
    issues.push(`${tagCount} hashtags — spam signal para algoritmo`);
    improvements.push('Reducir a 3-5 hashtags relevantes');
  }

  score = Math.max(0, Math.min(10, score));

  const benchmarkComparison =
    score >= 8.5
      ? 'Máximo alineamiento algoritmo — alta distribución orgánica esperada'
      : score >= 7
        ? 'Buen alineamiento — alcance normal a alto'
        : score >= 5
          ? 'Alineamiento medio — alcance limitado'
          : 'Bajo alineamiento — riesgo de supresión algorítmica';

  return { score, benchmarkComparison, criticalIssues: issues, improvements, confidence: 0.75 };
};

const scoreAudienceResonance = (
  input: ContentScoringInput,
): Omit<DimensionScore, 'dimension' | 'weight' | 'weightedScore'> => {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = input.audienceResonanceScore ?? 6.5;

  const pillarScore = CONTENT_PILLAR_RESONANCE[input.contentPillar ?? 'education'] ?? 7.0;
  score = score * 0.6 + pillarScore * 0.4;

  if (input.contentPillar === 'promotion') {
    issues.push('Contenido 100% promocional — audience resonance bajo');
    improvements.push('Mezclar valor educativo/entertainment con CTA de venta (80/20)');
  }

  score = Math.max(0, Math.min(10, score));

  const benchmarkComparison =
    score >= 8
      ? 'Alta resonancia psicológica con audiencia objetivo'
      : score >= 6
        ? 'Resonancia moderada — contenido conecta pero no impacta profundo'
        : 'Baja resonancia — contenido no alinea con pain points del nicho';

  return {
    score,
    benchmarkComparison,
    criticalIssues: issues,
    improvements,
    confidence: input.audienceResonanceScore !== undefined ? 0.85 : 0.6,
  };
};

const scoreConversionPotential = (
  input: ContentScoringInput,
): Omit<DimensionScore, 'dimension' | 'weight' | 'weightedScore'> => {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 5.0;

  if (!input.hasCTA) {
    score = 3.0;
    issues.push('Sin CTA — cero conversión potencial');
    improvements.push('Añadir CTA: "Comenta [KEYWORD] para recibir [X]"');
  } else {
    const ctaScore = CTA_CONVERSION_SCORES[input.ctaType ?? 'link-in-bio'] ?? 6.0;
    score = ctaScore;
    if (input.manychatKeyword) {
      score += 0.5; // Automation boost
    }
  }

  if (input.ctaType === 'comment-keyword' && !input.manychatKeyword) {
    improvements.push('Configurar ManyChat con el keyword para automatizar respuesta');
  }

  score = Math.max(0, Math.min(10, score));

  const benchmarkComparison =
    score >= 9
      ? 'CTA de alta conversión + automatización — funnel activo'
      : score >= 7
        ? 'Buena CTA — conversión esperada por encima del promedio'
        : score >= 5
          ? 'CTA presente pero subóptima'
          : 'Sin CTA efectiva — traffic desperdiciado';

  return { score, benchmarkComparison, criticalIssues: issues, improvements, confidence: 0.9 };
};

const scoreProductionQuality = (
  input: ContentScoringInput,
): Omit<DimensionScore, 'dimension' | 'weight' | 'weightedScore'> => {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = PRODUCTION_BASELINE[input.platform];

  if (input.hasBroll) score += 0.8;
  else improvements.push('Añadir B-roll contextual → producción más dinámica');

  if (input.hasColorGrade) score += 0.7;
  else improvements.push('Aplicar color grade (CapCut: filtro "Viral Warm" o "Clean Bright")');

  if (input.resolutionHD === false) {
    score -= 2.0;
    issues.push('Video no en HD — calidad percibida baja');
    improvements.push('Exportar en 1080p mínimo, vertical 9:16');
  }

  score = Math.max(0, Math.min(10, score));

  const benchmarkComparison =
    score >= 8.5
      ? 'Producción professional — diferenciador de marca'
      : score >= 6.5
        ? 'Producción aceptable para el nicho'
        : 'Producción por debajo del estándar — credibilidad impactada';

  return { score, benchmarkComparison, criticalIssues: issues, improvements, confidence: 0.85 };
};

const scoreTimingOptimization = (
  input: ContentScoringInput,
): Omit<DimensionScore, 'dimension' | 'weight' | 'weightedScore'> => {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 5.0;

  if (input.postingHour !== undefined && input.postingDayOfWeek !== undefined) {
    const window = BEST_POSTING_WINDOWS[input.platform];
    const hourOk = window.hours.includes(input.postingHour);
    const dayOk = window.days.includes(input.postingDayOfWeek);

    if (hourOk && dayOk) score = 9.5;
    else if (hourOk || dayOk) score = 7.0;
    else {
      score = 4.0;
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      issues.push(`Horario subóptimo: ${dayNames[input.postingDayOfWeek]} ${input.postingHour}:00`);
      const bestHour = window.hours[Math.floor(window.hours.length / 2)] ?? 18;
      const bestDay = window.days[1] ?? 3;
      improvements.push(
        `Publicar ${dayNames[bestDay]} ${bestHour}:00 → +${input.platform === 'instagram' ? '20' : '30'}% alcance inicial`,
      );
    }
  } else {
    improvements.push('Definir horario de publicación para optimizar alcance inicial');
  }

  const benchmarkComparison =
    score >= 9
      ? 'Ventana óptima — primera hora de distribución máxima'
      : score >= 7
        ? 'Ventana buena — distribución por encima del promedio'
        : score >= 5
          ? 'Horario no optimizado — pérdida de alcance inicial ~20%'
          : 'Horario subóptimo — pérdida de alcance inicial estimada ~35%';

  return {
    score,
    benchmarkComparison,
    criticalIssues: issues,
    improvements,
    confidence: input.postingHour !== undefined ? 0.9 : 0.5,
  };
};

// ── Main scorer ───────────────────────────────────────────────────────────────

const DIMENSION_SCORERS: Record<
  ScoringDimension,
  (input: ContentScoringInput) => Omit<DimensionScore, 'dimension' | 'weight' | 'weightedScore'>
> = {
  'hook-strength': scoreHookStrength,
  'retention-architecture': scoreRetentionArchitecture,
  'algorithm-alignment': scoreAlgorithmAlignment,
  'audience-resonance': scoreAudienceResonance,
  'conversion-potential': scoreConversionPotential,
  'production-quality': scoreProductionQuality,
  'timing-optimization': scoreTimingOptimization,
};

export const scoreContent = (input: ContentScoringInput): ContentScoreResult => {
  const orderedDimensions: ScoringDimension[] = [
    'hook-strength',
    'retention-architecture',
    'algorithm-alignment',
    'audience-resonance',
    'conversion-potential',
    'production-quality',
    'timing-optimization',
  ];

  const dimensions: DimensionScore[] = orderedDimensions.map((dim) => {
    const weight = DIMENSION_WEIGHTS[dim];
    const raw = DIMENSION_SCORERS[dim](input);
    return {
      dimension: dim,
      weight,
      weightedScore: parseFloat((raw.score * weight * 10).toFixed(1)),
      ...raw,
    };
  });

  const totalScore = parseFloat(dimensions.reduce((sum, d) => sum + d.weightedScore, 0).toFixed(1));

  const decision: ContentDecision = totalScore >= 72 ? 'GO' : totalScore >= 55 ? 'CONDITIONAL' : 'NO-GO';

  // Top blocker = critical issue from highest-weight dimension with an issue
  const topBlockerDim = dimensions.filter((d) => d.criticalIssues.length > 0).sort((a, b) => b.weight - a.weight)[0];
  const topBlocker = topBlockerDim?.criticalIssues[0] ?? null;

  // Quick wins = improvements sorted by (dimension weight × ease)
  // Hook and retention improvements have highest ROI
  const quickWins = dimensions
    .flatMap((d) => d.improvements.map((imp) => ({ imp, weight: d.weight })))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map((x) => x.imp);

  const bench = PLATFORM_BENCHMARKS[input.platform];
  const reachMultiplier =
    totalScore >= 80
      ? bench.topReach
      : totalScore >= 65
        ? (bench.avgReach + bench.topReach) / 2
        : totalScore >= 50
          ? bench.avgReach
          : bench.avgReach * 0.6;

  const engagementLow = totalScore >= 80 ? bench.avgEngagement : bench.avgEngagement * 0.5;
  const engagementHigh =
    totalScore >= 80 ? bench.topEngagement : totalScore >= 65 ? bench.avgEngagement * 1.5 : bench.avgEngagement;

  const compositeLabel =
    totalScore >= 85
      ? 'Potencial Viral'
      : totalScore >= 72
        ? 'Listo para Publicar'
        : totalScore >= 60
          ? 'Necesita Ajustes Menores'
          : totalScore >= 45
            ? 'Revisión Necesaria'
            : 'Reformular Concepto';

  const bestHour =
    BEST_POSTING_WINDOWS[input.platform].hours[Math.floor(BEST_POSTING_WINDOWS[input.platform].hours.length / 2)] ?? 18;
  const postingRecommendation =
    decision === 'NO-GO'
      ? `No publicar. Resolver primero: ${topBlocker ?? 'issues críticos'}`
      : decision === 'CONDITIONAL'
        ? `Publicar solo tras aplicar quick wins. Horario sugerido: ${bestHour}:00`
        : `Publicar. Horario óptimo: ${bestHour}:00 ${input.platform === 'instagram' ? 'Lun-Jue' : 'Mar-Vie'}`;

  return {
    totalScore,
    decision,
    dimensions,
    topBlocker,
    quickWins,
    estimatedEngagementRange: {
      low: parseFloat(engagementLow.toFixed(1)),
      high: parseFloat(engagementHigh.toFixed(1)),
    },
    estimatedReachMultiplier: parseFloat(reachMultiplier.toFixed(1)),
    postingRecommendation,
    compositeLabel,
  };
};

export const formatContentScore = (result: ContentScoreResult): string => {
  const decisionEmoji = result.decision === 'GO' ? '✅' : result.decision === 'CONDITIONAL' ? '⚠️' : '❌';
  const dimLines = result.dimensions
    .map((d) => {
      const bar = '█'.repeat(Math.round(d.score)).padEnd(10, '░');
      const issues = d.criticalIssues.length > 0 ? ` ⚠️ ${d.criticalIssues[0]}` : '';
      return `  ${d.dimension.padEnd(26)} [${bar}] ${d.score.toFixed(1)}/10  (peso ${(d.weight * 100).toFixed(0)}%)${issues}`;
    })
    .join('\n');

  return `
# Content Scoring Matrix — ${result.compositeLabel}

${decisionEmoji} **DECISIÓN: ${result.decision}** — Score: ${result.totalScore}/100

## Dimensiones
${dimLines}

## Estimaciones
  Engagement esperado: ${result.estimatedEngagementRange.low}% — ${result.estimatedEngagementRange.high}%
  Multiplicador de alcance: ${result.estimatedReachMultiplier}x promedio

## ${result.topBlocker ? '⛔ Blocker Principal' : ''}
${result.topBlocker ? `  ${result.topBlocker}` : ''}

## Quick Wins (orden por impacto)
${result.quickWins.map((w, i) => `  ${i + 1}. ${w}`).join('\n')}

## Recomendación
  ${result.postingRecommendation}
`.trim();
};
