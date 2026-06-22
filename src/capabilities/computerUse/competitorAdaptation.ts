// @ts-nocheck
/**
 * Competitor Adaptation Engine — Análisis de competidores e inspiración estratégica.
 *
 * Analiza perfiles de competidores, extrae estrategias ganadoras e identifica
 * gaps de contenido que la marca puede aprovechar. Genera ideas de contenido
 * basadas en oportunidades reales del nicho.
 *
 * Persiste análisis en data/runtime/competitors/{brandId}-latest.json.
 * Usa claude-opus-4-7 + adaptive thinking + streaming.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const COMPETITORS_DIR = path.resolve('data/runtime/competitors');

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface CompetitorProfile {
  id: string;
  handle: string;
  name: string;
  niche: string;
  estimatedFollowers: number;
  /** Engagement rate estimado (%) */
  estimatedEngagementRate: number;
  /** Frecuencia de publicación */
  postingFrequency: 'diaria' | '3-5-semana' | '1-2-semana' | 'esporadica';
  /** Tipos de contenido que predominan */
  contentMix: {
    reels: number;
    carruseles: number;
    historias: number;
    posts: number;
  };
  /** Temáticas principales que cubren */
  mainTopics: string[];
  /** Fortalezas observadas */
  strengths: string[];
  /** Debilidades / gaps de contenido */
  weaknesses: string[];
  /** Hashtags que usan frecuentemente */
  commonHashtags: string[];
  /** Tipo de CTA predominante */
  ctaStyle: string;
  /** Tono de comunicación */
  communicationTone: string;
  /** Qué hace que su contenido funcione */
  winningFormula: string;
  addedAt: string;
}

export interface CompetitorInsight {
  type:
    | 'gap-de-contenido'
    | 'formato-no-explotado'
    | 'angulo-unico'
    | 'audiencia-no-atendida'
    | 'frecuencia-oportunidad'
    | 'estilo-diferenciador';
  title: string;
  description: string;
  /** Competidores relacionados con este insight */
  relatedCompetitors: string[];
  /** Nivel de oportunidad */
  opportunity: 'alta' | 'media' | 'baja';
  /** Acción concreta recomendada */
  actionableRecommendation: string;
}

export interface ContentIdeaFromGap {
  insightId: string;
  title: string;
  description: string;
  format: 'reel' | 'carrusel' | 'historia' | 'post-estatico' | 'live';
  hook: string;
  structure: string[];
  caption: string;
  hashtags: string[];
  differentiationAngle: string;
  estimatedImpact: 'alto' | 'medio' | 'bajo';
  priority: number;
  generatedAt: string;
}

export interface CompetitorAnalysisReport {
  brandId: string;
  generatedAt: string;
  competitors: CompetitorProfile[];
  insights: CompetitorInsight[];
  /** Resumen de la posición competitiva de la marca */
  competitivePosition: string;
  /** Las 3 oportunidades más importantes */
  topOpportunities: CompetitorInsight[];
  /** Recomendaciones estratégicas globales */
  strategicRecommendations: string[];
  nextRefreshAt: string;
}

// ── Helpers internos ───────────────────────────────────────────────────────────

const ensureCompetitorsDir = async (): Promise<void> => {
  await fs.mkdir(COMPETITORS_DIR, { recursive: true });
};

const analysisPath = (brandId: string): string => path.join(COMPETITORS_DIR, `${brandId}-latest.json`);

const extractJson = <T>(text: string): T | null => {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  try {
    return JSON.parse(raw!.trim()) as T;
  } catch {
    const obj = raw!.match(/\{[\s\S]*\}/);
    if (obj) {
      try {
        return JSON.parse(obj[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
};

const buildBrandContext = (brand: BrandProfile): string => {
  const parts = [
    `Marca: ${brand.name}`,
    `Industria: ${brand.industryCategory ?? brand.accountCategory ?? 'general'}`,
    `Personalidad de voz: ${brand.voice.personality.join(', ')}`,
    `Valores: ${brand.values?.join(', ') ?? 'calidad, autenticidad'}`,
    `Audiencia objetivo: ${brand.audience.ageRange} años, ${brand.audience.interests.join(', ')}`,
  ];
  if (brand.contentPillars?.length) {
    parts.push(`Pilares: ${brand.contentPillars.map((p) => `${p.name} (${p.weight}%)`).join(', ')}`);
  }
  return parts.join('\n');
};

// ── Funciones públicas ─────────────────────────────────────────────────────────

/**
 * Analiza competidores del nicho y genera un reporte completo con insights.
 * Si se pasan handles, los usa como referencia; si no, Claude infiere
 * competidores típicos del sector.
 */
export const analyzeCompetitors = async (
  brand: BrandProfile,
  competitorHandles: string[] = [],
): Promise<CompetitorAnalysisReport> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const brandCtx = buildBrandContext(brand);

  log.info('[competitorAdaptation] analyzeCompetitors start', {
    brand: brand.name,
    handles: competitorHandles.length,
  });

  const handlesSection = competitorHandles.length
    ? `\nCompetidores específicos a analizar: ${competitorHandles.join(', ')}`
    : '\nAnaliza competidores típicos del sector (puedes usar handles genéricos representativos).';

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 5000,
    thinking: { type: 'adaptive' },
    system: `Eres un analista experto en estrategia de contenido para Instagram.
Analizas la competencia de forma profunda para identificar oportunidades reales
de diferenciación y gaps de contenido que una marca puede aprovechar.
Basas tu análisis en patrones conocidos del nicho, no en datos en tiempo real.
Devuelve ÚNICAMENTE JSON válido. Sin texto adicional.`,
    messages: [
      {
        role: 'user',
        content: `Analiza la competencia en el nicho de esta marca y devuelve el análisis completo.

## Contexto de la marca cliente
${brandCtx}
${handlesSection}

## Formato JSON de respuesta
{
  "competitors": [
    {
      "id": "comp-001",
      "handle": "@handle_competidor",
      "name": "Nombre del competidor",
      "niche": "Sub-nicho específico",
      "estimatedFollowers": 50000,
      "estimatedEngagementRate": 3.5,
      "postingFrequency": "3-5-semana",
      "contentMix": { "reels": 50, "carruseles": 30, "historias": 15, "posts": 5 },
      "mainTopics": ["tema1", "tema2"],
      "strengths": ["Fortaleza 1", "Fortaleza 2"],
      "weaknesses": ["Debilidad 1", "Debilidad 2"],
      "commonHashtags": ["#hashtag1", "#hashtag2"],
      "ctaStyle": "Descripción del CTA predominante",
      "communicationTone": "Tono de comunicación",
      "winningFormula": "Qué hace que su contenido funcione",
      "addedAt": "${new Date().toISOString()}"
    }
  ],
  "insights": [
    {
      "type": "gap-de-contenido|formato-no-explotado|angulo-unico|audiencia-no-atendida|frecuencia-oportunidad|estilo-diferenciador",
      "title": "Título del insight",
      "description": "Descripción detallada de la oportunidad",
      "relatedCompetitors": ["@comp1"],
      "opportunity": "alta|media|baja",
      "actionableRecommendation": "Qué debe hacer la marca concretamente"
    }
  ],
  "competitivePosition": "Resumen de cómo se posiciona la marca vs competencia",
  "strategicRecommendations": [
    "Recomendación estratégica 1",
    "Recomendación estratégica 2"
  ]
}

Incluye 4-6 competidores y 5-8 insights. Prioriza insights de tipo "alta" oportunidad.
Sé específico y accionable — evita generalidades vagas.`,
      },
    ],
  });

  const response = await stream.finalMessage();
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const parsed = extractJson<{
    competitors: CompetitorProfile[];
    insights: CompetitorInsight[];
    competitivePosition: string;
    strategicRecommendations: string[];
  }>(text);

  if (!parsed?.competitors) {
    throw new Error('[competitorAdaptation] No se pudo parsear respuesta');
  }

  const topOpportunities = parsed.insights.filter((i) => i.opportunity === 'alta').slice(0, 3);

  const nextRefreshAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const report: CompetitorAnalysisReport = {
    brandId,
    generatedAt: new Date().toISOString(),
    competitors: parsed.competitors,
    insights: parsed.insights,
    competitivePosition: parsed.competitivePosition,
    topOpportunities,
    strategicRecommendations: parsed.strategicRecommendations,
    nextRefreshAt,
  };

  await ensureCompetitorsDir();
  await fs.writeFile(analysisPath(brandId), JSON.stringify(report, null, 2), 'utf-8');
  log.info('[competitorAdaptation] done', {
    competitors: parsed.competitors.length,
    insights: parsed.insights.length,
  });

  return report;
};

/**
 * Extrae estrategias ganadoras de los competidores del reporte,
 * filtradas y adaptadas al contexto de la marca.
 */
export const extractWinningStrategies = async (
  report: CompetitorAnalysisReport,
  brand: BrandProfile,
): Promise<string[]> => {
  log.info('[competitorAdaptation] extractWinningStrategies', { brand: brand.name });

  const competitorSummary = report.competitors
    .map((c) => `${c.handle}: ${c.winningFormula} | Fortalezas: ${c.strengths.slice(0, 2).join(', ')}`)
    .join('\n');

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    system: `Eres un estratega de contenido. Extraes estrategias ganadoras de competidores
y las adaptas al estilo de una marca específica. Sé conciso y accionable.
Devuelve ÚNICAMENTE un array JSON de strings. Sin texto adicional.`,
    messages: [
      {
        role: 'user',
        content: `Extrae 5-7 estrategias ganadoras adaptadas para esta marca.

## Competidores analizados
${competitorSummary}

## Marca
${buildBrandContext(brand)}

Devuelve: ["Estrategia 1 adaptada", "Estrategia 2 adaptada", ...]
Cada estrategia debe ser específica, accionable y respetar el estilo de la marca.`,
      },
    ],
  });

  const response = await stream.finalMessage();
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : text)!.trim();

  try {
    return JSON.parse(raw) as string[];
  } catch {
    // Fallback: extraer array inline
    const arr = raw.match(/\[[\s\S]*\]/);
    if (arr) {
      try {
        return JSON.parse(arr[0]) as string[];
      } catch {
        return [];
      }
    }
    return [];
  }
};

/**
 * Genera ideas de contenido concretas a partir de los gaps identificados.
 */
export const generateContentFromGaps = async (
  report: CompetitorAnalysisReport,
  brand: BrandProfile,
  maxIdeas = 5,
): Promise<ContentIdeaFromGap[]> => {
  log.info('[competitorAdaptation] generateContentFromGaps', { brand: brand.name, maxIdeas });

  const topInsights = report.insights.filter((i) => i.opportunity !== 'baja').slice(0, maxIdeas);

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: `Eres un creativo de contenido para Instagram. Generas ideas concretas y listas
para producir basadas en gaps competitivos reales. Cada idea debe ser diferenciada
y aprovechar la voz única de la marca.
Devuelve ÚNICAMENTE JSON válido. Sin texto adicional.`,
    messages: [
      {
        role: 'user',
        content: `Genera ${topInsights.length} ideas de contenido basadas en estos gaps de mercado.

## Gaps identificados
${topInsights
  .map(
    (ins, i) =>
      `${i + 1}. [${ins.type}] ${ins.title}: ${ins.description}
   Recomendación: ${ins.actionableRecommendation}`,
  )
  .join('\n\n')}

## Marca
${buildBrandContext(brand)}

## Formato JSON de respuesta
[
  {
    "insightId": "insight-index-0",
    "title": "Título de la idea de contenido",
    "description": "Descripción detallada",
    "format": "reel|carrusel|historia|post-estatico|live",
    "hook": "Hook de apertura",
    "structure": ["Parte 1", "Parte 2", "Parte 3"],
    "caption": "Caption completo con emojis",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "differentiationAngle": "Por qué esto es diferente a lo que hace la competencia",
    "estimatedImpact": "alto|medio|bajo",
    "priority": 1,
    "generatedAt": "${new Date().toISOString()}"
  }
]`,
      },
    ],
  });

  const response = await stream.finalMessage();
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const ideas = extractJson<ContentIdeaFromGap[]>(text);

  if (!Array.isArray(ideas)) {
    log.warn('[competitorAdaptation] No se pudo parsear ideas');
    return [];
  }

  return ideas.sort((a, b) => a.priority - b.priority);
};

/**
 * Carga el último reporte de análisis desde disco (sin llamar a Claude).
 */
export const getLatestAnalysis = async (brandId: string): Promise<CompetitorAnalysisReport | null> => {
  try {
    const raw = await fs.readFile(analysisPath(brandId), 'utf-8');
    return JSON.parse(raw) as CompetitorAnalysisReport;
  } catch {
    return null;
  }
};

/**
 * Compara las métricas de la marca con los competidores del reporte
 * y devuelve un resumen de posición relativa.
 */
export const compareToCompetitors = (
  brand: BrandProfile,
  report: CompetitorAnalysisReport,
  brandMetrics: {
    followers: number;
    engagementRate: number;
    postingFrequency: 'diaria' | '3-5-semana' | '1-2-semana' | 'esporadica';
  },
): {
  followersPercentile: number;
  engagementPercentile: number;
  positionSummary: string;
  areasToImprove: string[];
} => {
  const competitors = report.competitors;

  if (!competitors.length) {
    return {
      followersPercentile: 50,
      engagementPercentile: 50,
      positionSummary: 'Sin datos de competidores para comparar.',
      areasToImprove: [],
    };
  }

  // Percentil de seguidores
  const followersSorted = competitors.map((c) => c.estimatedFollowers).sort((a, b) => a - b);
  const followersBelow = followersSorted.filter((f) => f < brandMetrics.followers).length;
  const followersPercentile = Math.round((followersBelow / competitors.length) * 100);

  // Percentil de engagement
  const engageSorted = competitors.map((c) => c.estimatedEngagementRate).sort((a, b) => a - b);
  const engageBelow = engageSorted.filter((e) => e < brandMetrics.engagementRate).length;
  const engagementPercentile = Math.round((engageBelow / competitors.length) * 100);

  // Resumen
  const avgFollowers = Math.round(followersSorted.reduce((s, f) => s + f, 0) / followersSorted.length);
  const avgEngage = (engageSorted.reduce((s, e) => s + e, 0) / engageSorted.length).toFixed(2);

  const areasToImprove: string[] = [];
  if (followersPercentile < 40) areasToImprove.push('Crecimiento de seguidores');
  if (engagementPercentile < 40) areasToImprove.push('Tasa de engagement');

  const freqOrder = ['esporadica', '1-2-semana', '3-5-semana', 'diaria'];
  const avgFreq = '3-5-semana';
  if (freqOrder.indexOf(brandMetrics.postingFrequency) < freqOrder.indexOf(avgFreq)) {
    areasToImprove.push('Frecuencia de publicación');
  }

  const positionSummary =
    `${brand.name} está en el percentil ${followersPercentile} en seguidores ` +
    `(promedio del sector: ${avgFollowers.toLocaleString()}) y en el percentil ` +
    `${engagementPercentile} en engagement (promedio: ${avgEngage}%).`;

  return { followersPercentile, engagementPercentile, positionSummary, areasToImprove };
};
