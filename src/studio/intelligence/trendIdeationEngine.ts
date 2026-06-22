import { trendIntelligenceAgent } from './trendIntelligenceAgent.js';
import { competitorSpyAgent } from './competitorSpyAgent.js';
import type { NicheCategory } from './nicheAnalyzer.js';
import type { BrandProfile } from '../../config/types.js';

export type ContentStructure =
  | 'hook-story-cta'
  | 'problem-agitate-solve'
  | 'before-after-bridge'
  | 'listicle-countdown'
  | 'controversy-opinion'
  | 'challenge-trend'
  | 'duet-reaction'
  | 'transformation-reveal'
  | 'tutorial-steps'
  | 'myth-vs-reality';

export type ConversionAngle =
  | 'pain-point-urgency'
  | 'aspiration-identity'
  | 'social-proof-fomo'
  | 'authority-trust'
  | 'curiosity-gap'
  | 'price-anchor'
  | 'transformation-proof';

export interface ViralStructurePattern {
  structure: ContentStructure;
  hookFormula: string;
  bodyRhythm: string;
  ctaStyle: string;
  averageRetentionRate: number;
  viralProbabilityScore: number;
  bestPlatform: 'instagram' | 'tiktok' | 'both';
  bestNiches: NicheCategory[];
  exampleHook: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  hook: string;
  structure: ContentStructure;
  conversionAngle: ConversionAngle;
  scriptOutline: string[];
  cta: string;
  manychatTrigger: string;
  trendingKeywords: string[];
  estimatedEngagementRate: number;
  estimatedReachMultiplier: number;
  productionComplexity: 'low' | 'medium' | 'high';
  priorityScore: number;
  rationale: string;
}

export interface ThemeWeek {
  weekNumber: 1 | 2 | 3 | 4;
  theme: string;
  contentPillar: string;
  ideas: ContentIdea[];
  conversionGoal: string;
}

export interface MonthlyIdeationPlan {
  month: string;
  niche: NicheCategory;
  platform: 'instagram' | 'tiktok' | 'both';
  ideas: ContentIdea[];
  topIdeas: ContentIdea[];
  themeWeeks: ThemeWeek[];
  viralStructuresDetected: ViralStructurePattern[];
  trendingAudio: string[];
  trendingHashtags: string[];
  competitorGaps: string[];
  generatedAt: Date;
}

const VIRAL_STRUCTURES: ViralStructurePattern[] = [
  {
    structure: 'problem-agitate-solve',
    hookFormula: '[Dolor que el audience siente ahora]: [Por qué es peor de lo que creen]',
    bodyRhythm: 'Problema (3s) → Agitación (5s) → Solución tease (3s) → Prueba (5s) → CTA (2s)',
    ctaStyle: 'Comenta [KEYWORD] para el recurso gratuito',
    averageRetentionRate: 78,
    viralProbabilityScore: 85,
    bestPlatform: 'both',
    bestNiches: ['coaching', 'fitness-coaching', 'finance', 'education', 'personal-brand'],
    exampleHook: 'Por qué tu contenido no convierte (y no es el diseño)',
  },
  {
    structure: 'before-after-bridge',
    hookFormula: 'Yo antes [struggle relatable] → Ahora [resultado aspiracional] → Aquí el puente',
    bodyRhythm: 'Before (4s) → Punto de quiebre (3s) → After (4s) → Método (5s) → CTA (2s)',
    ctaStyle: 'Sigue para ver cómo lo hice',
    averageRetentionRate: 82,
    viralProbabilityScore: 80,
    bestPlatform: 'instagram',
    bestNiches: ['fitness-coaching', 'personal-brand', 'coaching', 'beauty'],
    exampleHook: 'Hace 6 meses tenía 200 seguidores. Hoy tengo 50K. Te cuento qué cambié.',
  },
  {
    structure: 'controversy-opinion',
    hookFormula: 'Opinión impopular: [Cosa que todos hacen] está mal y aquí está la prueba',
    bodyRhythm: 'Controversia (2s) → Evidencia 1 (4s) → Evidencia 2 (4s) → Plot twist (3s) → CTA (2s)',
    ctaStyle: '¿Estás de acuerdo? Comenta abajo',
    averageRetentionRate: 88,
    viralProbabilityScore: 92,
    bestPlatform: 'tiktok',
    bestNiches: ['coaching', 'finance', 'fitness-coaching', 'education', 'b2b-services'],
    exampleHook: 'Las agencias de marketing te están mintiendo sobre el crecimiento orgánico',
  },
  {
    structure: 'listicle-countdown',
    hookFormula: '[N] cosas que [audience] hace que destruyen su [resultado deseado]',
    bodyRhythm: '1 punto cada 3-4s, pattern interrupt entre puntos, loop al final',
    ctaStyle: 'Guarda esto para no olvidarlo',
    averageRetentionRate: 75,
    viralProbabilityScore: 72,
    bestPlatform: 'both',
    bestNiches: ['education', 'fitness-coaching', 'finance', 'coaching', 'tech'],
    exampleHook: '5 errores que matan tu engagement (el #3 lo hacen el 90% de creadores)',
  },
  {
    structure: 'transformation-reveal',
    hookFormula: 'Watch this [estado inicial] become [estado final] in [timeframe]',
    bodyRhythm: 'Before reveal (3s) → Proceso fast-cut (8s) → After reveal (3s) → CTA (2s)',
    ctaStyle: 'Comenta [KEYWORD] si quieres el mismo resultado',
    averageRetentionRate: 85,
    viralProbabilityScore: 88,
    bestPlatform: 'tiktok',
    bestNiches: ['fitness-products', 'beauty', 'fitness-coaching', 'ecommerce'],
    exampleHook: 'De perfil muerto a 10K en 30 días — proceso completo',
  },
  {
    structure: 'myth-vs-reality',
    hookFormula: 'Lo que crees sobre [tema] vs. lo que realmente funciona',
    bodyRhythm: 'Mito 1 (4s) → Realidad 1 (3s) → Mito 2 (4s) → Realidad 2 (3s) → CTA (2s)',
    ctaStyle: 'Guarda para tener la versión correcta',
    averageRetentionRate: 80,
    viralProbabilityScore: 78,
    bestPlatform: 'instagram',
    bestNiches: ['fitness-coaching', 'finance', 'coaching', 'education'],
    exampleHook: 'Mito vs Realidad: el hashtag más viral NO es el que crees',
  },
  {
    structure: 'challenge-trend',
    hookFormula: '[Trending sound/format] + [Giro de nicho]',
    bodyRhythm: 'Hook 0-2s sigue el trend → Pivot de nicho (3s) → Valor (10s) → CTA (2s)',
    ctaStyle: 'Únete — comenta tu resultado',
    averageRetentionRate: 70,
    viralProbabilityScore: 95,
    bestPlatform: 'tiktok',
    bestNiches: ['fitness-lifestyle', 'entertainment', 'food', 'beauty', 'travel'],
    exampleHook: '[Usa el trending sound] + "Así se ve mi routine de creación de contenido"',
  },
  {
    structure: 'tutorial-steps',
    hookFormula: 'Cómo [lograr resultado específico] en [timeframe] — paso a paso',
    bodyRhythm: 'Resultado primero (3s) → Paso 1 (3s) → Paso 2 (3s) → Paso 3 (3s) → CTA (2s)',
    ctaStyle: 'Sigue los pasos y cuéntame tu resultado',
    averageRetentionRate: 72,
    viralProbabilityScore: 68,
    bestPlatform: 'instagram',
    bestNiches: ['education', 'tech', 'coaching', 'beauty', 'food'],
    exampleHook: 'Cómo crear 30 días de contenido en 3 horas — paso a paso',
  },
];

const NICHE_CONVERSION_ANGLES: Partial<Record<NicheCategory, ConversionAngle[]>> = {
  coaching: ['pain-point-urgency', 'transformation-proof', 'authority-trust'],
  'fitness-coaching': ['transformation-proof', 'aspiration-identity', 'social-proof-fomo'],
  ecommerce: ['social-proof-fomo', 'price-anchor', 'transformation-proof'],
  'b2b-services': ['authority-trust', 'pain-point-urgency', 'price-anchor'],
  finance: ['pain-point-urgency', 'authority-trust', 'social-proof-fomo'],
  education: ['curiosity-gap', 'aspiration-identity', 'authority-trust'],
  'personal-brand': ['aspiration-identity', 'social-proof-fomo', 'curiosity-gap'],
  beauty: ['transformation-proof', 'social-proof-fomo', 'aspiration-identity'],
};

const MONTHLY_THEMES: Partial<Record<NicheCategory, [string, string, string, string]>> = {
  coaching: [
    'Mentalidad y productividad',
    'Crecimiento y escalamiento',
    'Autoridad y posicionamiento',
    'Conversión y ventas',
  ],
  'fitness-coaching': ['Transformación física', 'Nutrición y método', 'Rutinas y técnica', 'Motivación y consistencia'],
  ecommerce: ['Producto estrella', 'Testimonios y social proof', 'Comparativas y valor', 'Descuentos y urgencia'],
  'b2b-services': ['Pain points del cliente', 'Caso de estudio', 'Proceso y metodología', 'ROI y resultados'],
  finance: ['Mitos financieros', 'Herramientas y apps', 'Casos de éxito', 'Estrategias prácticas'],
  education: ['Conceptos clave', 'Errores comunes', 'Métodos y frameworks', 'Aplicación práctica'],
  'personal-brand': ['Historia personal', 'Behind the scenes', 'Opiniones controvertidas', 'Resultados y logros'],
  beauty: ['Tutorial de producto', 'Antes/después', 'Trending looks', 'Skincare routine'],
};

const DEFAULT_THEMES: [string, string, string, string] = [
  'Autoridad en nicho',
  'Social proof',
  'Educación',
  'Conversión',
];

const getConversionAngles = (niche: NicheCategory): ConversionAngle[] =>
  NICHE_CONVERSION_ANGLES[niche] ?? ['pain-point-urgency', 'aspiration-identity', 'authority-trust'];

const getBestStructures = (niche: NicheCategory): ViralStructurePattern[] =>
  VIRAL_STRUCTURES.filter((s) => s.bestNiches.includes(niche) || s.bestPlatform === 'both')
    .sort((a, b) => b.viralProbabilityScore - a.viralProbabilityScore)
    .slice(0, 5);

const makeId = (): string => `idea_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

class TrendIdeationEngine {
  generateMonthlyPlan = async (
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok' | 'both',
    _brandHandle: string,
    brand: BrandProfile,
  ): Promise<MonthlyIdeationPlan> => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const singlePlatform: 'instagram' | 'tiktok' = platform === 'both' ? 'instagram' : platform;

    const [trendResult, competitorResult] = await Promise.allSettled([
      trendIntelligenceAgent.getTrends(niche, platform, brand),
      competitorSpyAgent.analyzeCompetitors([], niche, singlePlatform, brand),
    ]);

    const trends = trendResult.status === 'fulfilled' ? trendResult.value : null;
    const competitors = competitorResult.status === 'fulfilled' ? competitorResult.value : null;

    const bestStructures = getBestStructures(niche);
    const conversionAngles = getConversionAngles(niche);
    const themes = MONTHLY_THEMES[niche] ?? DEFAULT_THEMES;

    const ideas: ContentIdea[] = [];

    for (let week = 1; week <= 4; week++) {
      const theme = themes[week - 1]!;
      const weekStructures = bestStructures.slice(0, 3);

      for (let i = 0; i < 7; i++) {
        const structure = weekStructures[i % weekStructures.length]!;
        const angle = conversionAngles[i % conversionAngles.length]!;
        const trendKws = trends?.emergingTopics?.slice(0, 3) ?? [niche.replace('-', ' ')];
        const gap = competitors?.contentGaps?.[i % Math.max(1, competitors.contentGaps.length)] ?? theme;

        ideas.push({
          id: makeId(),
          title: `${theme} — idea ${week}.${i + 1}`,
          hook: structure.exampleHook,
          structure: structure.structure,
          conversionAngle: angle,
          scriptOutline: [
            `HOOK (0-3s): ${structure.hookFormula}`,
            `CUERPO: ${structure.bodyRhythm}`,
            `CTA: ${structure.ctaStyle}`,
          ],
          cta: structure.ctaStyle,
          manychatTrigger: (theme.split(' ')[0] ?? 'INFO').toUpperCase(),
          trendingKeywords: [...trendKws, gap],
          estimatedEngagementRate: parseFloat((3 + (structure.averageRetentionRate / 100) * 4).toFixed(1)),
          estimatedReachMultiplier: parseFloat((structure.viralProbabilityScore / 50).toFixed(1)),
          productionComplexity: i % 3 === 0 ? 'low' : i % 3 === 1 ? 'medium' : 'high',
          priorityScore: Math.round(
            structure.viralProbabilityScore * 0.5 +
              structure.averageRetentionRate * 0.3 +
              (angle === 'pain-point-urgency' ? 20 : angle === 'transformation-proof' ? 18 : 10),
          ),
          rationale: `Retención ~${structure.averageRetentionRate}% + ${angle} + brecha: "${gap}"`,
        });
      }
    }

    // 2 bonus trend-reactive ideas
    const trendHook = trends?.viralHooks?.[0] ?? 'Lo que nadie te dice sobre';
    ideas.push(
      {
        id: makeId(),
        title: 'Trend Reactivo — Sonido viral de la semana',
        hook: `${trendHook} ${niche.replace('-', ' ')}`,
        structure: 'challenge-trend',
        conversionAngle: 'social-proof-fomo',
        scriptOutline: ['Usa trending audio', 'Niche pivot en 2-3s', 'Valor + CTA'],
        cta: 'Sigue para más contenido como este',
        manychatTrigger: 'TREND',
        trendingKeywords: trends?.emergingTopics?.slice(0, 5) ?? [niche],
        estimatedEngagementRate: 6.5,
        estimatedReachMultiplier: 4.2,
        productionComplexity: 'low',
        priorityScore: 95,
        rationale: 'Trend-reactive → FYP/Explore boost inmediato',
      },
      {
        id: makeId(),
        title: 'Gap Competidor — Ángulo sin explotar',
        hook: competitors?.differentiationAngles?.[0] ?? `Por qué tu ${niche.replace('-', ' ')} content no convierte`,
        structure: 'controversy-opinion',
        conversionAngle: 'authority-trust',
        scriptOutline: ['Controversia del nicho', 'Prueba con datos', 'Tu ángulo diferenciador', 'CTA'],
        cta: 'Comenta tu opinión abajo',
        manychatTrigger: 'VERDAD',
        trendingKeywords: competitors?.contentGaps?.slice(0, 3) ?? [],
        estimatedEngagementRate: 7.2,
        estimatedReachMultiplier: 3.8,
        productionComplexity: 'low',
        priorityScore: 93,
        rationale: 'Diferenciación vs competencia + engagement orgánico alto',
      },
    );

    const sorted = [...ideas].sort((a, b) => b.priorityScore - a.priorityScore);

    const themeWeeks: ThemeWeek[] = ([1, 2, 3, 4] as const).map((week) => ({
      weekNumber: week,
      theme: themes[week - 1]!,
      contentPillar: week === 1 ? 'Educación' : week === 2 ? 'Inspiración' : week === 3 ? 'Conversión' : 'Conexión',
      ideas: ideas.slice((week - 1) * 7, week * 7),
      conversionGoal: week === 3 ? 'Ventas directas' : week === 4 ? 'DMs y leads' : 'Autoridad y reach',
    }));

    return {
      month,
      niche,
      platform,
      ideas: sorted,
      topIdeas: sorted.slice(0, 8),
      themeWeeks,
      viralStructuresDetected: bestStructures,
      trendingAudio: trends?.viralAudio?.slice(0, 5).map((a) => a.name) ?? [],
      trendingHashtags: trends?.trendingHashtags?.slice(0, 10).map((h) => h.tag) ?? [],
      competitorGaps: competitors?.contentGaps ?? [],
      generatedAt: new Date(),
    };
  };

  cloneViralStructure = (referenceHook: string, referenceConcept: string, niche: NicheCategory): ContentIdea => {
    const best = VIRAL_STRUCTURES.find((s) => s.bestNiches.includes(niche)) ?? VIRAL_STRUCTURES[0]!;

    return {
      id: makeId(),
      title: `Clonado: ${referenceConcept}`,
      hook: best.hookFormula.replace('[Dolor que el audience siente ahora]', referenceConcept),
      structure: best.structure,
      conversionAngle: getConversionAngles(niche)[0]!,
      scriptOutline: [`HOOK: ${best.hookFormula}`, `RITMO: ${best.bodyRhythm}`, `CTA: ${best.ctaStyle}`],
      cta: best.ctaStyle,
      manychatTrigger: (referenceConcept.split(' ')[0] ?? 'INFO').toUpperCase(),
      trendingKeywords: [niche.replace('-', ' '), referenceHook.split(' ').slice(0, 3).join(' ')],
      estimatedEngagementRate: parseFloat((best.averageRetentionRate / 15).toFixed(1)),
      estimatedReachMultiplier: parseFloat((best.viralProbabilityScore / 50).toFixed(1)),
      productionComplexity: 'low',
      priorityScore: best.viralProbabilityScore,
      rationale: `Estructura clonada — ${best.structure} → ${best.averageRetentionRate}% retención promedio`,
    };
  };

  scoreIdeaPool = (ideas: ContentIdea[]): ContentIdea[] =>
    ideas
      .map((idea) => ({
        ...idea,
        priorityScore: Math.min(
          100,
          Math.round(
            idea.estimatedReachMultiplier * 20 +
              idea.estimatedEngagementRate * 10 +
              (idea.productionComplexity === 'low' ? 15 : idea.productionComplexity === 'medium' ? 8 : 0) +
              (idea.conversionAngle === 'pain-point-urgency'
                ? 15
                : idea.conversionAngle === 'transformation-proof'
                  ? 12
                  : 5),
          ),
        ),
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);
}

export const trendIdeationEngine = new TrendIdeationEngine();
