// @ts-nocheck
/**
 * Post Performance Analyzer — scraper via Computer Use que extrae métricas de IG.
 *
 * Analiza:
 *   1. Posts propios → qué publicaciones del user funcionaron mejor
 *   2. Competencia → qué hacen sus competidores top
 *   3. Top brands del nicho → benchmark mundial
 *
 * Métricas que captura por post:
 *   - Likes
 *   - Comentarios (count + sentiment positivo)
 *   - Saves
 *   - Shares
 *   - Reach
 *   - Engagement rate
 *   - Format (post/carrusel/reel/story)
 *   - Caption (para análisis NLP)
 *   - Hashtags
 *   - Posting time
 *
 * Output: WinningPattern[] que alimenta el cerebro neural.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { runBrainAwareCu } from '../../capabilities/computerUse/brainAwareCu.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const PERF_DIR = path.resolve('data/neural/post-performance');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PostMetrics {
  postId: string;
  url: string;
  handle: string; // @cuenta
  format: 'post' | 'carousel' | 'reel' | 'story-permanent';
  publishedAt: string;
  caption: string;
  hashtags: string[];
  metrics: {
    likes: number;
    comments: number;
    positiveComments: number;
    negativeComments: number;
    saves: number;
    shares: number;
    reach?: number;
    impressions?: number;
    videoViews?: number;
    engagementRate: number;
  };
  visualAnalysis?: {
    dominantColors: string[];
    composition: string;
    hasText: boolean;
    style: string;
  };
}

export interface WinningPattern {
  id: string;
  brandId: string;
  patternType: 'format' | 'topic' | 'hook' | 'time' | 'hashtag' | 'visual' | 'caption-structure';
  description: string;
  evidence: string[]; // post URLs que respaldan el patrón
  confidence: number; // 0-1
  avgEngagement: number;
  applicableTo: string[]; // formatos donde aplica
  recommendedAction: string;
}

export interface NicheBenchmark {
  niche: string;
  topBrands: string[]; // @handles
  generatedAt: string;
  benchmarkMetrics: {
    avgEngagementRate: number;
    topEngagementRate: number;
    avgPostsPerWeek: number;
    bestFormats: string[];
    bestPostingTimes: number[];
    topHashtags: string[];
    commonHooks: string[];
  };
  winningPatterns: WinningPattern[];
}

export type AnalysisScope = 'own' | 'competitor' | 'niche-top';

export interface AnalysisRequest {
  brand: BrandProfile;
  scope: AnalysisScope;
  handles?: string[]; // si scope = competitor o niche-top
  maxPostsPerHandle?: number; // default 12 (4 últimas semanas)
  includeComments?: boolean;
  includeReels?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensurePerfDir = async (): Promise<void> => {
  await fs.mkdir(PERF_DIR, { recursive: true });
};

const perfPath = (brandId: string, scope: string): string => path.join(PERF_DIR, `${brandId}-${scope}.json`);

const patternsPath = (brandId: string): string => path.join(PERF_DIR, `${brandId}-patterns.json`);

// ── Computer Use scraper ─────────────────────────────────────────────────────

/**
 * Usa CU brain-aware para scrapear métricas de N posts de N cuentas.
 * Genera instrucción detallada que el agente CU ejecuta paso a paso.
 */
export const scrapeAccountMetrics = async (
  brand: BrandProfile,
  handle: string,
  maxPosts = 12,
): Promise<PostMetrics[]> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[postPerformance] scraping', { handle, maxPosts });

  const instruction = `Abrir perfil de Instagram @${handle.replace('@', '')}.
Hacer scroll y abrir los últimos ${maxPosts} posts.
Para cada post extraer:
- URL del post
- Formato (post/carrusel/reel)
- Caption completo
- Hashtags
- Cantidad de likes
- Cantidad de comentarios
- Si aparece, cantidad de saves y shares
- Video views (si es reel)

Devolver los datos estructurados al final. Trabajá rápido, no leas comentarios uno por uno, solo extrae count.`;

  const cuResult = await runBrainAwareCu(brand, {
    instruction,
    baseUrl: `https://www.instagram.com/${handle.replace('@', '')}/`,
    sessionId: `scrape-${brandId}-${handle}-${Date.now()}`,
    tags: ['scrape', 'metrics', handle],
    notifyUser: false,
    abortOnSafetyFail: true,
  });

  if (!cuResult.ran || cuResult.outcome === 'failure') {
    log.warn('[postPerformance] CU scrape failed', { handle, outcome: cuResult.outcome });
    return [];
  }

  // Parse outputs del CU para extraer PostMetrics
  // CU emite events con notas y screenshots — necesitamos análisis post-hoc con Claude
  const lastTextEvent = [...cuResult.events]
    .reverse()
    .find((e) => e.kind === 'act' && 'narrate' in e && e.narrate.length > 100);

  if (!lastTextEvent) return [];

  // Claude parsea los events textuales en estructura
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Parseá estos events de Computer Use sobre Instagram @${handle} y extraé PostMetrics estructurado:

Events relevantes (últimos 30):
${cuResult.events
  .slice(-30)
  .map((e) => JSON.stringify(e).slice(0, 300))
  .join('\n')}

Devolvé JSON: { "posts": [{ "postId", "url", "format", "publishedAt", "caption", "hashtags", "metrics": { "likes", "comments", ... } }] }
Si algún campo no se pudo extraer, ponelo en 0 o "". Estimá si no hay valor exacto.`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as { posts: Partial<PostMetrics>[] };
  return parsed.posts.map((p, i) => ({
    postId: p.postId ?? `post-${Date.now()}-${i}`,
    url: p.url ?? '',
    handle: handle.replace('@', ''),
    format: p.format ?? 'post',
    publishedAt: p.publishedAt ?? new Date().toISOString(),
    caption: p.caption ?? '',
    hashtags: p.hashtags ?? [],
    metrics: p.metrics ?? {
      likes: 0,
      comments: 0,
      positiveComments: 0,
      negativeComments: 0,
      saves: 0,
      shares: 0,
      engagementRate: 0,
    },
    visualAnalysis: p.visualAnalysis,
  }));
};

// ── Sentiment analysis de comentarios ────────────────────────────────────────

export const analyzeCommentSentiment = async (
  postUrl: string,
  comments: string[],
): Promise<{ positive: number; negative: number; neutral: number }> => {
  if (comments.length === 0) return { positive: 0, negative: 0, neutral: 0 };

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 500,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Clasificá estos ${comments.length} comentarios IG por sentiment:

${comments
  .slice(0, 50)
  .map((c, i) => `${i + 1}. ${c.slice(0, 200)}`)
  .join('\n')}

JSON: { "positive": N, "negative": N, "neutral": N }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  void postUrl;
  return jsonMatch
    ? (JSON.parse(jsonMatch[0]) as { positive: number; negative: number; neutral: number })
    : { positive: 0, negative: 0, neutral: 0 };
};

// ── Extracción de winning patterns ────────────────────────────────────────────

/**
 * Toma posts con métricas → identifica patrones que se repiten en los top performers.
 */
export const extractWinningPatterns = async (brand: BrandProfile, posts: PostMetrics[]): Promise<WinningPattern[]> => {
  if (posts.length < 5) return [];
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  // Top 20% por engagement
  const sorted = [...posts].sort((a, b) => b.metrics.engagementRate - a.metrics.engagementRate);
  const topTier = sorted.slice(0, Math.max(3, Math.floor(sorted.length * 0.2)));

  log.info('[postPerformance] extracting patterns', { posts: posts.length, topTier: topTier.length });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2500,
    thinking: { type: 'adaptive' },
    system: `Analista de performance de Instagram. Identificás patrones que se repiten en los posts top y los reportás como reglas accionables.`,
    messages: [
      {
        role: 'user',
        content: `De estos ${posts.length} posts analizados, los siguientes ${topTier.length} están en el top 20% por engagement.

TOP PERFORMERS:
${topTier.map((p) => `- Format: ${p.format} | Likes: ${p.metrics.likes} | Comments: ${p.metrics.comments} | Saves: ${p.metrics.saves} | Engagement: ${(p.metrics.engagementRate * 100).toFixed(1)}% | Caption preview: "${p.caption.slice(0, 150)}" | Hashtags: ${p.hashtags.slice(0, 5).join(' ')}`).join('\n')}

RESTO (${sorted.length - topTier.length} posts):
Engagement promedio: ${((sorted.slice(topTier.length).reduce((s, p) => s + p.metrics.engagementRate, 0) / Math.max(1, sorted.length - topTier.length)) * 100).toFixed(1)}%

Identificá 5-10 winning patterns concretos que distinguen los top performers.
Para cada uno: type, description, evidence (URLs), confidence, avgEngagement, applicableTo, recommendedAction.

JSON: { "patterns": [{ "patternType": "format|topic|hook|time|hashtag|visual|caption-structure", "description": "regla concreta", "evidence": [], "confidence": 0-1, "avgEngagement": 0-1, "applicableTo": [], "recommendedAction": "qué hacer" }] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as { patterns: Omit<WinningPattern, 'id' | 'brandId'>[] };
  const patterns: WinningPattern[] = result.patterns.map((p, i) => ({
    id: `pattern-${Date.now()}-${i}`,
    brandId,
    ...p,
  }));

  // Persistir
  await ensurePerfDir();
  let existing: WinningPattern[] = [];
  try {
    existing = JSON.parse(await fs.readFile(patternsPath(brandId), 'utf-8')) as WinningPattern[];
  } catch {
    /* noop */
  }
  await fs.writeFile(patternsPath(brandId), JSON.stringify([...existing, ...patterns].slice(-200), null, 2), 'utf-8');

  return patterns;
};

// ── Análisis end-to-end ──────────────────────────────────────────────────────

export const runFullAnalysis = async (
  req: AnalysisRequest,
): Promise<{
  postsAnalyzed: number;
  patternsFound: number;
  patterns: WinningPattern[];
}> => {
  const brandId = req.brand.id ?? req.brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[postPerformance] full analysis', { scope: req.scope, brandId });

  let allPosts: PostMetrics[] = [];

  if (req.scope === 'own') {
    // Scrapear propios
    const ownHandle = (req.brand as unknown as { handle?: string }).handle ?? req.brand.name;
    allPosts = await scrapeAccountMetrics(req.brand, ownHandle, req.maxPostsPerHandle ?? 12);
  } else if (req.scope === 'competitor' || req.scope === 'niche-top') {
    // Scrapear cada handle
    const handles = req.handles ?? req.brand.competitors ?? [];
    for (const handle of handles.slice(0, 5)) {
      const posts = await scrapeAccountMetrics(req.brand, handle, req.maxPostsPerHandle ?? 8);
      allPosts.push(...posts);
    }
  }

  // Persistir posts crudos
  await ensurePerfDir();
  await fs.writeFile(perfPath(brandId, req.scope), JSON.stringify(allPosts, null, 2), 'utf-8');

  // Extraer patrones
  const patterns = await extractWinningPatterns(req.brand, allPosts);

  return { postsAnalyzed: allPosts.length, patternsFound: patterns.length, patterns };
};

export const getWinningPatterns = async (brandId: string): Promise<WinningPattern[]> => {
  try {
    return JSON.parse(await fs.readFile(patternsPath(brandId), 'utf-8')) as WinningPattern[];
  } catch {
    return [];
  }
};

/** Top patterns por confidence + engagement. */
export const getTopPatterns = async (brandId: string, limit = 10): Promise<WinningPattern[]> => {
  const all = await getWinningPatterns(brandId);
  return all.sort((a, b) => b.confidence * b.avgEngagement - a.confidence * a.avgEngagement).slice(0, limit);
};
