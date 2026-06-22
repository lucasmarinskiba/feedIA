// @ts-nocheck
/**
 * Trending Engine — Motor de inteligencia de contenido trending para Instagram.
 *
 * Detecta tendencias relevantes para el nicho de la marca, las puntúa por
 * relevancia y genera adaptaciones concretas de contenido. Persiste los
 * reportes en data/runtime/trends/{brandId}-latest.json para consulta
 * sin coste adicional de Claude.
 *
 * Usa claude-opus-4-7 + adaptive thinking + streaming.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const TRENDS_DIR = path.resolve('data/runtime/trends');

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface TrendingTopic {
  id: string;
  name: string;
  description: string;
  /** Plataformas donde es tendencia: instagram, tiktok, twitter, youtube, etc. */
  platforms: string[];
  /** Nivel de popularidad actual */
  momentum: 'rising' | 'peak' | 'declining';
  /** Categorías temáticas que cubre */
  categories: string[];
  /** Hashtags asociados a esta tendencia */
  hashtags: string[];
  /** Formatos de contenido que mejor funcionan para esta tendencia */
  bestFormats: ('reel' | 'carrusel' | 'historia' | 'post-estatico' | 'live')[];
  /** Score de relevancia 0–100 calculado para la marca */
  relevanceScore: number;
  /** Por qué es relevante para la marca */
  relevanceReason: string;
  /** Ventana de tiempo en que conviene publicar */
  timeWindow: 'inmediato' | '1-3-dias' | 'esta-semana' | 'este-mes';
  /** Ideas de contenido concretas adaptadas a la tendencia */
  contentIdeas: string[];
  detectedAt: string;
}

export interface TrendAdaptation {
  trendId: string;
  trendName: string;
  brandId: string;
  /** Idea de contenido específica generada */
  contentIdea: string;
  /** Formato recomendado */
  format: 'reel' | 'carrusel' | 'historia' | 'post-estatico' | 'live';
  /** Hook de apertura sugerido */
  hook: string;
  /** Estructura de contenido (pasos/slides/escenas) */
  structure: string[];
  /** Caption adaptado */
  caption: string;
  /** Hashtags específicos para esta adaptación */
  hashtags: string[];
  /** Ángulo de la marca: cómo la marca aprovecha la tendencia de forma auténtica */
  brandAngle: string;
  /** Nivel de urgencia para publicar */
  urgency: 'urgente' | 'esta-semana' | 'cuando-convenga';
  /** Estimación del potencial de alcance */
  reachPotential: 'bajo' | 'medio' | 'alto' | 'viral';
  generatedAt: string;
}

export interface TrendingReport {
  brandId: string;
  generatedAt: string;
  /** Contexto de nicho que se usó para filtrar */
  nicheContext: string;
  trends: TrendingTopic[];
  /** Las 3 tendencias más urgentes/relevantes */
  topPicks: TrendingTopic[];
  /** Resumen ejecutivo */
  summary: string;
  /** Próxima fecha recomendada de actualización */
  nextRefreshAt: string;
}

export interface TrendingCalendarEntry {
  date: string;
  trend: TrendingTopic;
  adaptation: TrendAdaptation;
  /** Hora óptima de publicación */
  publishTime: string;
  /** Prioridad en el calendario */
  priority: 'alta' | 'media' | 'baja';
}

// ── Helpers internos ───────────────────────────────────────────────────────────

const ensureTrendsDir = async (): Promise<void> => {
  await fs.mkdir(TRENDS_DIR, { recursive: true });
};

const reportPath = (brandId: string): string => path.join(TRENDS_DIR, `${brandId}-latest.json`);

const buildNicheContext = (brand: BrandProfile): string => {
  const parts: string[] = [
    `Marca: ${brand.name}`,
    `Sector: ${brand.industryCategory ?? brand.accountCategory ?? 'general'}`,
    `Personalidad: ${brand.voice.personality.join(', ')}`,
    `Audiencia: ${brand.audience.ageRange} años, intereses: ${brand.audience.interests.join(', ')}`,
  ];
  if (brand.contentPillars?.length) {
    parts.push(`Pilares de contenido: ${brand.contentPillars.map((p) => p.name).join(', ')}`);
  }
  return parts.join('\n');
};

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

// ── Funciones públicas ─────────────────────────────────────────────────────────

/**
 * Detecta tendencias actuales relevantes para el nicho de la marca.
 * Usa conocimiento del modelo + contexto de la marca para simular
 * detección de trends reales (sin acceso directo a APIs de redes).
 */
export const detectTrends = async (brand: BrandProfile): Promise<TrendingReport> => {
  const nicheContext = buildNicheContext(brand);
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  log.info('[trendingEngine] detectTrends start', { brand: brand.name });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: `Eres un experto analista de tendencias de contenido para Instagram y redes sociales.
Tu tarea es identificar tendencias actuales relevantes para una marca específica,
basándote en tu conocimiento del mercado digital, formatos virales y comportamiento
de audiencias en Instagram.

Devuelve ÚNICAMENTE JSON válido con la estructura especificada. Sin texto adicional.`,
    messages: [
      {
        role: 'user',
        content: `Analiza las tendencias actuales de contenido para esta marca y devuelve un array de 8-10 tendencias relevantes.

## Contexto de la marca
${nicheContext}

## Formato de respuesta (JSON estricto)
{
  "trends": [
    {
      "id": "trend-001",
      "name": "Nombre de la tendencia",
      "description": "Descripción de qué es y por qué está trending",
      "platforms": ["instagram", "tiktok"],
      "momentum": "rising|peak|declining",
      "categories": ["educacion", "humor", "lifestyle"],
      "hashtags": ["#trend1", "#trend2"],
      "bestFormats": ["reel", "carrusel"],
      "relevanceScore": 85,
      "relevanceReason": "Por qué es relevante para esta marca específicamente",
      "timeWindow": "inmediato|1-3-dias|esta-semana|este-mes",
      "contentIdeas": ["Idea concreta 1", "Idea concreta 2"],
      "detectedAt": "${new Date().toISOString()}"
    }
  ],
  "summary": "Resumen ejecutivo de las oportunidades de tendencia para esta marca",
  "nicheContext": "${nicheContext.replace(/"/g, "'")}"
}

Prioriza tendencias que:
1. Sean genuinamente adaptables al nicho de la marca
2. Tengan momentum "rising" o "peak"
3. Funcionen bien en Instagram específicamente
4. La audiencia objetivo realmente consume

Ordena por relevanceScore descendente.`,
      },
    ],
  });

  const response = await stream.finalMessage();
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const parsed = extractJson<{ trends: TrendingTopic[]; summary: string; nicheContext: string }>(text);

  if (!parsed?.trends) {
    throw new Error('[trendingEngine] No se pudo parsear la respuesta de Claude');
  }

  // Ordenar por relevanceScore
  const sorted = parsed.trends.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topPicks = sorted.slice(0, 3);

  // Calcular nextRefreshAt (48h)
  const nextRefreshAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const report: TrendingReport = {
    brandId,
    generatedAt: new Date().toISOString(),
    nicheContext,
    trends: sorted,
    topPicks,
    summary: parsed.summary,
    nextRefreshAt,
  };

  // Persistir
  await ensureTrendsDir();
  await fs.writeFile(reportPath(brandId), JSON.stringify(report, null, 2), 'utf-8');
  log.info('[trendingEngine] detectTrends done', { count: sorted.length, brandId });

  return report;
};

/**
 * Adapta una tendencia concreta al estilo y voz de la marca,
 * generando una idea de contenido accionable.
 */
export const adaptTrendToContent = async (trend: TrendingTopic, brand: BrandProfile): Promise<TrendAdaptation> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[trendingEngine] adaptTrendToContent', { trend: trend.name, brand: brand.name });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: `Eres un estratega de contenido especializado en adaptar tendencias virales
al estilo único de cada marca para Instagram. Generas ideas concretas y accionables.
Devuelve ÚNICAMENTE JSON válido. Sin texto adicional.`,
    messages: [
      {
        role: 'user',
        content: `Adapta esta tendencia al estilo de la marca y genera una pieza de contenido específica.

## Tendencia
Nombre: ${trend.name}
Descripción: ${trend.description}
Formatos que funcionan: ${trend.bestFormats.join(', ')}
Hashtags: ${trend.hashtags.join(' ')}
Ideas base: ${trend.contentIdeas.join(' | ')}

## Marca
Nombre: ${brand.name}
Industria: ${brand.industryCategory ?? brand.accountCategory ?? 'general'}
Personalidad: ${brand.voice.personality.join(', ')}
Tono: ${brand.voice.tone}
Valores: ${brand.values?.join(', ') ?? 'autenticidad, calidad'}
Audiencia: ${brand.audience.ageRange} años, ${brand.audience.interests.join(', ')}
${brand.contentPillars?.length ? `Pilares: ${brand.contentPillars.map((p) => p.name).join(', ')}` : ''}

## Formato JSON de respuesta
{
  "trendId": "${trend.id}",
  "trendName": "${trend.name}",
  "brandId": "${brandId}",
  "contentIdea": "Idea de contenido específica y original para esta marca",
  "format": "reel|carrusel|historia|post-estatico|live",
  "hook": "Hook de apertura poderoso (primeras palabras/segundos)",
  "structure": ["Paso/slide 1", "Paso/slide 2", "Paso/slide 3"],
  "caption": "Caption completo con emojis y CTA",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "brandAngle": "Cómo la marca se apropia de la tendencia de forma auténtica",
  "urgency": "urgente|esta-semana|cuando-convenga",
  "reachPotential": "bajo|medio|alto|viral",
  "generatedAt": "${new Date().toISOString()}"
}`,
      },
    ],
  });

  const response = await stream.finalMessage();
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const adaptation = extractJson<TrendAdaptation>(text);

  if (!adaptation) {
    throw new Error('[trendingEngine] No se pudo parsear adaptación');
  }

  log.info('[trendingEngine] adaptTrendToContent done', { trend: trend.name });
  return adaptation;
};

/**
 * Carga el último reporte de tendencias desde disco (sin llamar a Claude).
 * Devuelve null si no existe.
 */
export const getLatestTrendingReport = async (brandId: string): Promise<TrendingReport | null> => {
  try {
    const raw = await fs.readFile(reportPath(brandId), 'utf-8');
    return JSON.parse(raw) as TrendingReport;
  } catch {
    return null;
  }
};

/**
 * Puntúa la relevancia de una tendencia para una marca (0–100).
 * Evaluación determinista basada en solapamiento de categorías, audiencia y pilares.
 */
export const scoreTrendRelevance = (trend: TrendingTopic, brand: BrandProfile): number => {
  let score = 0;

  // Momentum
  const momentumBonus = { rising: 30, peak: 25, declining: 5 };
  score += momentumBonus[trend.momentum] ?? 0;

  // Solapamiento de categorías con pilares de contenido
  if (brand.contentPillars?.length) {
    const pillarNames = brand.contentPillars.map((p) => p.name.toLowerCase());
    const overlap = trend.categories.filter((c) => pillarNames.some((p) => p.includes(c) || c.includes(p))).length;
    score += Math.min(overlap * 10, 30);
  } else {
    // Sin pilares configurados, bonus moderado
    score += 15;
  }

  // Plataforma Instagram presente
  if (trend.platforms.includes('instagram')) score += 15;

  // Formatos compatibles
  const hasReel = trend.bestFormats.includes('reel');
  const hasCarrusel = trend.bestFormats.includes('carrusel');
  if (hasReel || hasCarrusel) score += 10;

  // Ventana de tiempo (urgente = más valor)
  const timeBonus = { inmediato: 15, '1-3-dias': 10, 'esta-semana': 5, 'este-mes': 2 };
  score += timeBonus[trend.timeWindow] ?? 0;

  return Math.min(score, 100);
};

/**
 * Construye un calendario de contenido basado en tendencias del reporte,
 * distribuyendo las adaptaciones en los próximos N días.
 */
export const buildTrendingContentCalendar = async (
  report: TrendingReport,
  brand: BrandProfile,
  days = 7,
): Promise<TrendingCalendarEntry[]> => {
  log.info('[trendingEngine] buildTrendingContentCalendar', { days, brand: brand.name });

  const calendar: TrendingCalendarEntry[] = [];

  // Tomar las top tendencias (máx. days tendencias)
  const selectedTrends = report.trends.filter((t) => t.momentum !== 'declining').slice(0, days);

  // Horarios óptimos de publicación para Instagram
  const primeTimes = ['09:00', '12:00', '18:00', '20:00'];

  for (let i = 0; i < selectedTrends.length; i++) {
    const trend = selectedTrends[i]!;
    const daysOffset =
      trend.timeWindow === 'inmediato'
        ? 0
        : trend.timeWindow === '1-3-dias'
          ? 1 + (i % 3)
          : trend.timeWindow === 'esta-semana'
            ? 3 + (i % 4)
            : 5 + (i % 2);

    const date = new Date();
    date.setDate(date.getDate() + Math.min(daysOffset, days - 1));
    const dateStr = date.toISOString().split('T')[0]!;

    const adaptation = await adaptTrendToContent(trend, brand);
    const publishTime = primeTimes[i % primeTimes.length]!;

    const priority: 'alta' | 'media' | 'baja' =
      trend.relevanceScore >= 80 ? 'alta' : trend.relevanceScore >= 60 ? 'media' : 'baja';

    calendar.push({ date: dateStr, trend, adaptation, publishTime, priority });
  }

  // Ordenar por fecha
  calendar.sort((a, b) => a.date.localeCompare(b.date));

  log.info('[trendingEngine] calendar built', { entries: calendar.length });
  return calendar;
};
