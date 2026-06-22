// @ts-nocheck
/**
 * Hashtag Scientist — Investigación profunda de hashtags con stratificación.
 *
 * Reemplaza al especialista SEO/hashtag de Instagram:
 *   - Pirámide de hashtags (mega/macro/medio/micro/nicho)
 *   - Análisis competitivo de hashtags
 *   - Rotación inteligente para evitar shadowban
 *   - Detección de hashtags baneados/oscurecidos
 *   - Score de relevancia por hashtag
 *   - Sets pre-configurados por tipo de contenido
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const HASHTAG_DIR = path.resolve('data/hashtag-research');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type HashtagTier = 'mega' | 'macro' | 'medio' | 'micro' | 'nicho';

export interface HashtagData {
  tag: string; // sin el #
  tier: HashtagTier;
  estimatedPosts: number; // # de posts con el hashtag
  difficulty: number; // 0-100 (qué tan difícil rankear)
  relevanceScore: number; // 0-100 (qué tan relevante para la marca)
  competitorUsage: number; // cuántos competidores lo usan
  trendDirection: 'rising' | 'stable' | 'declining';
  isBanned: boolean;
  isShadowbanned: boolean;
  language: string;
  region?: string;
  bestForFormats: string[]; // ['carousel', 'reel', etc]
  relatedTags: string[];
  lastChecked: string;
}

export interface HashtagSet {
  id: string;
  brandId: string;
  name: string; // ej "Set Carrusel Educativo"
  description: string;
  contentType: string;
  pyramid: {
    mega: HashtagData[]; // 1-2 hashtags (>10M posts)
    macro: HashtagData[]; // 3-5 (1M-10M)
    medio: HashtagData[]; // 5-10 (100K-1M)
    micro: HashtagData[]; // 5-10 (10K-100K)
    nicho: HashtagData[]; // 3-5 (<10K, hyper-targeted)
  };
  totalCount: number;
  estimatedReach: number;
  optimalRotation: string[][]; // 3-4 rotaciones para evitar repetir
  createdAt: string;
  lastUsed?: string;
  performanceHistory: Array<{ date: string; reach: number; engagement: number }>;
}

export interface HashtagResearch {
  brandId: string;
  topic: string;
  generatedAt: string;
  recommendedSet: HashtagSet;
  variantSets: HashtagSet[]; // 3 sets alternativos
  competitorHashtags: string[]; // hashtags que usan competidores
  trendingNow: string[]; // hashtags en tendencia del nicho
  shouldAvoid: Array<{ tag: string; reason: string }>;
  geoTargeting?: string[]; // hashtags geográficos sugeridos
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureHashtagDir = async (): Promise<void> => {
  await fs.mkdir(HASHTAG_DIR, { recursive: true });
};

const hashtagPath = (brandId: string): string => path.join(HASHTAG_DIR, `${brandId}-research.json`);

// ── Hashtags baneados conocidos (lista parcial actualizable) ─────────────────

const KNOWN_BANNED_OR_SHADOW = new Set([
  'asia',
  'beautyblogger',
  'curvygirls',
  'date',
  'desk',
  'dm',
  'easter',
  'eggplant',
  'instagood',
  'kickoff',
  'master',
  'mirror',
  'overnight',
  'parties',
  'petite',
  'pushups',
  'singlelife',
  'snap',
  'snapchat',
  'streetphoto',
  'sunbathing',
  'tag4like',
  'tagsforlikes',
  'undies',
  'workflow',
  'youngmodel',
]);

// ── Generación de hashtag research ────────────────────────────────────────────

/** Genera investigación completa de hashtags estructurada en pirámide. */
export const researchHashtags = async (
  brand: BrandProfile,
  params: {
    topic: string;
    contentType: string; // 'carrusel-educativo', 'reel-tutorial', etc.
    targetGeography?: string; // 'AR', 'ES', 'global'
    avoidTags?: string[]; // hashtags a evitar
    competitorTags?: string[];
  },
): Promise<HashtagResearch> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[hashtagScientist] researching', { brandId, topic: params.topic });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3500,
    thinking: { type: 'adaptive' },
    system: `Eres científico de hashtags de Instagram con expertise en algoritmo y SEO.
Conoces volúmenes de posts por hashtag, dificultad de ranking, hashtags baneados y patrones de shadowban.
Construyes pirámides estratégicas que maximizan alcance sin penalización.
Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Investiga hashtags para ${brand.name}:

Tema: ${params.topic}
Tipo de contenido: ${params.contentType}
Industria: ${brand.industryCategory ?? 'general'}
${params.targetGeography ? `Geografía objetivo: ${params.targetGeography}` : ''}
${params.competitorTags?.length ? `Competidores usan: ${params.competitorTags.join(', ')}` : ''}
${params.avoidTags?.length ? `Evitar: ${params.avoidTags.join(', ')}` : ''}

Construye pirámide estratégica de 25-30 hashtags:
- MEGA (>10M posts): 1-2 hashtags
- MACRO (1M-10M): 3-5 hashtags
- MEDIO (100K-1M): 5-10 hashtags
- MICRO (10K-100K): 5-10 hashtags
- NICHO (<10K): 3-5 hashtags hyper-targeted

Para cada hashtag estima: estimatedPosts, difficulty (0-100), relevanceScore (0-100), trendDirection.

Devuelve:
{
  "recommendedSet": {
    "name": "nombre descriptivo del set",
    "description": "estrategia detrás del set",
    "pyramid": {
      "mega": [{"tag": "sin #", "estimatedPosts": número, "difficulty": 0-100, "relevanceScore": 0-100, "trendDirection": "rising|stable|declining", "competitorUsage": 0-10, "bestForFormats": [], "relatedTags": [], "language": "es", "isBanned": false, "isShadowbanned": false}],
      "macro": [...],
      "medio": [...],
      "micro": [...],
      "nicho": [...]
    },
    "estimatedReach": número estimado de alcance,
    "optimalRotation": [["set rotación 1"], ["rotación 2"], ["rotación 3"]]
  },
  "variantSets": [
    { "name": "set alternativo 1 (más agresivo)", "pyramid": {...} },
    { "name": "set alternativo 2 (más nicho)", "pyramid": {...} },
    { "name": "set alternativo 3 (geo-targeted)", "pyramid": {...} }
  ],
  "competitorHashtags": ["tag1", "tag2"],
  "trendingNow": ["tag1", "tag2"],
  "shouldAvoid": [{"tag": "", "reason": "baneado|shadowban|irrelevante|saturado"}],
  "geoTargeting": ["tag geográfico 1"]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[hashtagScientist] No research generated');

  const generated = JSON.parse(jsonMatch[0]) as Partial<HashtagResearch>;
  const now = new Date().toISOString();

  // Hidratar HashtagData faltantes + validar baneados
  const hydrateData = (data: Partial<HashtagData>, tier: HashtagTier): HashtagData => {
    const tag = (data.tag ?? '').replace(/^#/, '').trim().toLowerCase();
    return {
      tag,
      tier,
      estimatedPosts: data.estimatedPosts ?? 0,
      difficulty: data.difficulty ?? 50,
      relevanceScore: data.relevanceScore ?? 50,
      competitorUsage: data.competitorUsage ?? 0,
      trendDirection: data.trendDirection ?? 'stable',
      isBanned: data.isBanned ?? KNOWN_BANNED_OR_SHADOW.has(tag),
      isShadowbanned: data.isShadowbanned ?? false,
      language: data.language ?? 'es',
      region: data.region,
      bestForFormats: data.bestForFormats ?? [],
      relatedTags: data.relatedTags ?? [],
      lastChecked: now,
    };
  };

  const hydrateSet = (raw: Partial<HashtagSet>, idx: number): HashtagSet => {
    const pyramid = raw.pyramid ?? { mega: [], macro: [], medio: [], micro: [], nicho: [] };
    return {
      id: `hset-${Date.now()}-${idx}`,
      brandId,
      name: raw.name ?? `Set ${idx}`,
      description: raw.description ?? '',
      contentType: params.contentType,
      pyramid: {
        mega: (pyramid.mega ?? []).map((d) => hydrateData(d, 'mega')),
        macro: (pyramid.macro ?? []).map((d) => hydrateData(d, 'macro')),
        medio: (pyramid.medio ?? []).map((d) => hydrateData(d, 'medio')),
        micro: (pyramid.micro ?? []).map((d) => hydrateData(d, 'micro')),
        nicho: (pyramid.nicho ?? []).map((d) => hydrateData(d, 'nicho')),
      },
      totalCount: 0,
      estimatedReach: raw.estimatedReach ?? 0,
      optimalRotation: raw.optimalRotation ?? [],
      createdAt: now,
      performanceHistory: [],
    };
  };

  const recommendedSet = hydrateSet(generated.recommendedSet ?? {}, 0);
  recommendedSet.totalCount =
    recommendedSet.pyramid.mega.length +
    recommendedSet.pyramid.macro.length +
    recommendedSet.pyramid.medio.length +
    recommendedSet.pyramid.micro.length +
    recommendedSet.pyramid.nicho.length;

  const research: HashtagResearch = {
    brandId,
    topic: params.topic,
    generatedAt: now,
    recommendedSet,
    variantSets: (generated.variantSets ?? []).map((v, i) => hydrateSet(v, i + 1)),
    competitorHashtags: generated.competitorHashtags ?? [],
    trendingNow: generated.trendingNow ?? [],
    shouldAvoid: generated.shouldAvoid ?? [],
    geoTargeting: generated.geoTargeting,
  };

  await ensureHashtagDir();
  await fs.writeFile(hashtagPath(brandId), JSON.stringify(research, null, 2), 'utf-8');
  return research;
};

/** Aplana hashtag set a array de tags listos para usar. */
export const flattenSet = (set: HashtagSet, max = 30): string[] => {
  const all = [
    ...set.pyramid.mega,
    ...set.pyramid.macro,
    ...set.pyramid.medio,
    ...set.pyramid.micro,
    ...set.pyramid.nicho,
  ].filter((h) => !h.isBanned && !h.isShadowbanned);
  return all.slice(0, max).map((h) => `#${h.tag}`);
};

/** Rota a la siguiente versión del set (anti-shadowban). */
export const getNextRotation = (set: HashtagSet, lastRotationIndex: number): string[] => {
  if (set.optimalRotation.length === 0) return flattenSet(set);
  const nextIdx = (lastRotationIndex + 1) % set.optimalRotation.length;
  return set.optimalRotation[nextIdx] ?? flattenSet(set);
};

/** Detecta riesgo de shadowban en un set. */
export const detectShadowbanRisk = (set: HashtagSet): { risk: 'low' | 'medium' | 'high'; problemTags: string[] } => {
  const allTags = [
    ...set.pyramid.mega,
    ...set.pyramid.macro,
    ...set.pyramid.medio,
    ...set.pyramid.micro,
    ...set.pyramid.nicho,
  ];
  const banned = allTags.filter((h) => h.isBanned || h.isShadowbanned);
  if (banned.length === 0) return { risk: 'low', problemTags: [] };
  if (banned.length <= 2) return { risk: 'medium', problemTags: banned.map((h) => h.tag) };
  return { risk: 'high', problemTags: banned.map((h) => h.tag) };
};

/** Carga investigación previa. */
export const getResearch = async (brandId: string): Promise<HashtagResearch | null> => {
  try {
    return JSON.parse(await fs.readFile(hashtagPath(brandId), 'utf-8')) as HashtagResearch;
  } catch {
    return null;
  }
};

/** Registra performance de un set después de usarlo. */
export const recordSetPerformance = async (
  brandId: string,
  setId: string,
  reach: number,
  engagement: number,
): Promise<void> => {
  const research = await getResearch(brandId);
  if (!research) return;

  const set = [research.recommendedSet, ...research.variantSets].find((s) => s.id === setId);
  if (!set) return;

  set.performanceHistory.push({ date: new Date().toISOString(), reach, engagement });
  set.lastUsed = new Date().toISOString();

  await fs.writeFile(hashtagPath(brandId), JSON.stringify(research, null, 2), 'utf-8');
};
