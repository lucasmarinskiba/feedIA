/**
 * Content Strategy Engine — de CMO autónomo.
 *
 * Genera briefs estratégicos priorizados a partir de performance, tendencias,
 * competidores y metas de marca.
 */

import type { BrandProfile, ContentFormat } from '../../config/types.js';
import { log } from '../../agent/logger.js';
import { randomUUID } from 'node:crypto';
import { gatherCompetitorSignals, type CompetitorSignals } from './inputs/competitorSignals.js';
import { gatherGoalSignals, type GoalSignals } from './inputs/goalSignals.js';
import { gatherPerformanceSignals, type PerformanceSignals } from './inputs/performanceSignals.js';
import { gatherTrendSignals, type TrendSignals } from './inputs/trendSignals.js';
import { scoreOpportunity, type OpportunityScore } from './opportunityScorer.js';
import type { ContentPillar, ContentPlan, StrategicBrief } from './output/strategicBrief.js';

export interface StrategyEngineOptions {
  windowDays?: number;
  briefsPerWindow?: number;
  dryRun?: boolean;
  competitorHandles?: string[];
}

interface TopicCandidate {
  topic: string;
  angle: string;
  format: ContentFormat;
  platforms: Array<'instagram' | 'tiktok'>;
  pillar: ContentPillar;
}

const CONTENT_FORMATS: ContentFormat[] = ['reel', 'carrusel', 'post-imagen', 'historia', 'reel-faceless'];

const PILLAR_ANGLES: Record<ContentPillar, string[]> = {
  authority: ['mito vs verdad', 'framework propio', 'caso de estudio', 'lección de un error'],
  education: ['paso a paso', 'checklist', 'errores comunes', 'glosario rápido'],
  entertainment: ['detrás de cámaras', 'meme de nicho', 'storytime profesional', 'trend adaptado'],
  community: ['pregunta a la audiencia', 'celebración de logros', 'encuesta', 'respuesta a DM'],
  conversion: ['demo del producto', 'comparativa', 'testimonio', 'oferta por tiempo limitado'],
  awareness: ['dato impactante', 'visualidad de marca', 'historia de origen', 'problema que resolvemos'],
};

const selectPlatform = (format: ContentFormat): Array<'instagram' | 'tiktok'> => {
  if (format === 'reel' || format === 'reel-faceless') return ['instagram', 'tiktok'];
  if (format === 'historia') return ['instagram'];
  return ['instagram'];
};

const generateCandidates = (brand: BrandProfile, goalSignals: GoalSignals): TopicCandidate[] => {
  const candidates: TopicCandidate[] = [];
  const pains = brand.audience.pains.slice(0, 3);
  const desires = brand.audience.desires.slice(0, 3);
  const niche = brand.niche;
  const pillars = (Object.keys(goalSignals.pillarWeights) as ContentPillar[]).filter((p) => (goalSignals.pillarWeights[p] ?? 0) >= 20);

  for (const pillar of pillars) {
    const angles = PILLAR_ANGLES[pillar];
    if (!angles) continue;
    for (const angle of angles) {
      const pain = pains[Math.floor(Math.random() * pains.length)] ?? 'dolor principal';
      const desire = desires[Math.floor(Math.random() * desires.length)] ?? 'deseo principal';

      const topic =
        pillar === 'authority'
          ? `${niche}: ${angle}`
          : pillar === 'education'
            ? `Cómo ${pain.replace('no saben', 'empezar a')} (${angle})`
            : pillar === 'entertainment'
              ? `${angle} sobre ${niche}`
              : pillar === 'community'
                ? `${angle}: ¿${pain}?`
                : pillar === 'conversion'
                  ? `${angle} para ${desire}`
                  : `${angle} de ${niche}`;

      const preferredFormats = goalSignals.preferredFormats.filter((f) => CONTENT_FORMATS.includes(f as ContentFormat));
      const formats = preferredFormats.length > 0 ? preferredFormats : ['carrusel', 'reel'];
      for (const format of formats) {
        candidates.push({
          topic,
          angle,
          format: format as ContentFormat,
          platforms: selectPlatform(format as ContentFormat),
          pillar,
        });
      }
    }
  }
  return candidates;
};

export const planNextContent = async (
  brand: BrandProfile,
  opts: StrategyEngineOptions = {},
): Promise<ContentPlan> => {
  const { windowDays = 7, briefsPerWindow = 5, dryRun = true, competitorHandles } = opts;
  log.info(`[ContentStrategyEngine] Planificando ${briefsPerWindow} briefs para ${brand.name}`);

  const [performance, trends, competitors] = await Promise.all([
    gatherPerformanceSignals(),
    gatherTrendSignals(brand.name, dryRun),
    gatherCompetitorSignals(competitorHandles ?? brand.competitors ?? [], dryRun),
  ]);
  const goalSignals = gatherGoalSignals(brand);

  const candidates = generateCandidates(brand, goalSignals);
  const scored = candidates.map((candidate) => {
    const score = scoreOpportunity(
      {
        ...candidate,
        goalSignals,
        performance,
        trends,
        competitors,
      },
      brand,
    );
    return { candidate, score };
  });

  const selected = scored
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, briefsPerWindow * 2) // margen para deduplicar
    .reduce<{ candidate: TopicCandidate; score: OpportunityScore }[]>((acc, curr) => {
      const exists = acc.some((a) => a.candidate.topic === curr.candidate.topic && a.candidate.angle === curr.candidate.angle);
      if (!exists) acc.push(curr);
      return acc;
    }, [])
    .slice(0, briefsPerWindow);

  const briefs: StrategicBrief[] = selected.map(({ candidate, score }, index) => ({
    id: randomUUID(),
    topic: candidate.topic,
    angle: candidate.angle,
    format: candidate.format,
    platforms: candidate.platforms,
    pillar: candidate.pillar,
    why: score.why,
    estimatedEngagement: score.estimatedEngagement,
    confidence: score.confidence,
    urgency: score.dimensions.urgency,
    cta: deriveCta(candidate.pillar, brand.goals.primary),
    hashtags: deriveHashtags(brand, candidate.topic, competitors.topHashtags),
    bestHour: bestHourForFormat(candidate.format),
    bestDay: bestDayForIndex(index),
  }));

  return {
    brandName: brand.name,
    generatedAt: new Date().toISOString(),
    windowDays,
    briefs,
    insights: buildInsights(performance, trends, competitors, goalSignals),
  };
};

const deriveCta = (pillar: ContentPillar, goal: BrandProfile['goals']['primary']): string => {
  if (goal === 'leads' || goal === 'ventas') {
    if (pillar === 'conversion') return 'Reservá tu diagnóstico gratuito';
    if (pillar === 'authority') return 'Descargá el framework';
    return 'Dejanos tu mayor duda en los comentarios';
  }
  if (pillar === 'community') return 'Respondé con tu experiencia';
  if (pillar === 'entertainment') return 'Etiquetá a alguien que necesite ver esto';
  return 'Guardá este post para aplicarlo';
};

const deriveHashtags = (brand: BrandProfile, topic: string, competitorHashtags: string[]): string[] => {
  const core = brand.hashtagPools?.core?.slice(0, 3) ?? [];
  const amplio = brand.hashtagPools?.amplio?.slice(0, 2) ?? [];
  const topicRoot = topic
    .split(':')[0]
    ?.toLowerCase()
    .replace(/[^\wáéíóúüñ\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .join('') ?? 'marca';
  const nicheTag = `#${topicRoot}`;
  const relevantComp = competitorHashtags.slice(0, 1);
  return [...new Set([...core, nicheTag, ...amplio, ...relevantComp])].slice(0, 5);
};

const bestHourForFormat = (format: ContentFormat): string => {
  const map: Record<ContentFormat, string> = {
    reel: '09:30',
    'reel-faceless': '09:30',
    carrusel: '11:00',
    'post-imagen': '14:00',
    historia: '18:00',
    live: '20:00',
  };
  return map[format] ?? '10:00';
};

const bestDayForIndex = (index: number): string => {
  const days = ['lunes', 'miércoles', 'viernes', 'martes', 'jueves'];
  return days[index % days.length] ?? 'miércoles';
};

const buildInsights = (
  performance: PerformanceSignals,
  trends: TrendSignals,
  competitors: CompetitorSignals,
  goals: GoalSignals,
): string[] => {
  const insights: string[] = [];
  if (performance.benchmarksAvailable) {
    insights.push(`Formato ganador histórico: ${performance.bestFormats[0]?.format ?? 'N/A'}`);
  } else {
    insights.push('No hay suficientes datos de performance; se usan señales de marca y competencia.');
  }
  if (trends.trendingTopics.length > 0) {
    insights.push(`Tendencia más relevante: ${trends.trendingTopics[0]?.topic ?? 'N/A'}`);
  }
  if (competitors.dataAvailable) {
    insights.push(`Engagement promedio de competidores: ${competitors.avgEngagementRate}%`);
  }
  insights.push(`Meta principal: ${goals.primary} → pilares prioritarios: ${Object.entries(goals.pillarWeights).filter(([, w]) => w >= 25).map(([p]) => p).join(', ')}`);
  return insights;
};
