// @ts-nocheck
/**
 * Niche Brain Expander — extrae conocimiento de top brands por nicho.
 *
 * Para cada NichePack (21 tipos de cuenta), identifica las 10-20 mejores
 * marcas globales y aprende:
 *   - Qué formatos usan
 *   - Qué horarios publican
 *   - Cómo escriben captions
 *   - Qué hashtags usan
 *   - Qué visual style aplican
 *   - Qué ofertas/CTAs convierten
 *
 * Resultado: NicheBenchmark que cualquier marca de ese nicho usa como referencia.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import {
  runFullAnalysis,
  getTopPatterns,
  type WinningPattern,
  type NicheBenchmark,
} from './postPerformanceAnalyzer.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const NICHE_DIR = path.resolve('data/neural/niche-brain');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface NicheKnowledge {
  niche: string;
  generatedAt: string;
  topBrands: TopBrand[];
  benchmark: NicheBenchmark;
  emergingTrends: string[];
  dyingTrends: string[]; // patrones que están perdiendo engagement
  taboos: string[]; // qué NO hacer en este nicho
  audienceLanguage: {
    keywords: string[];
    slang: string[];
    influencers: string[];
  };
  monetizationModels: string[]; // cómo monetizan los top players
  contentCadenceSweetSpot: { postsPerWeek: number; storiesPerWeek: number; reelsPerWeek: number };
}

export interface TopBrand {
  handle: string;
  followers: number;
  engagementRate: number;
  whyTop: string; // qué hace especial a esta marca
  signatureMove: string; // su táctica distintiva
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureNicheDir = async (): Promise<void> => {
  await fs.mkdir(NICHE_DIR, { recursive: true });
};

const knowledgePath = (niche: string): string => path.join(NICHE_DIR, `${niche}-knowledge.json`);

// ── Discovery de top brands del nicho ────────────────────────────────────────

export const discoverTopBrandsInNiche = async (niche: string, count = 15): Promise<TopBrand[]> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: `Experto en Instagram. Conocés las top marcas mundiales por nicho.
Cuando te piden top brands de un nicho, das nombres reales y verificables.`,
    messages: [
      {
        role: 'user',
        content: `Listame las ${count} mejores cuentas de Instagram en el nicho "${niche}".

Criterios:
- Followers > 50K (no nano)
- Engagement rate > 2% (calidad, no solo cantidad)
- Audiencia auténtica (no comprada)
- Contenido reconocible y replicable
- Mix de regiones (no solo USA)

Para cada una:
{
  "handle": "@nombre",
  "followers": número estimado,
  "engagementRate": decimal,
  "whyTop": "qué la hace destacable",
  "signatureMove": "su táctica distintiva (1 oración)"
}

JSON: { "topBrands": [...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as { topBrands: TopBrand[] };
  return result.topBrands;
};

// ── Análisis profundo de nicho ───────────────────────────────────────────────

export const expandNicheBrain = async (
  brand: BrandProfile,
  niche: string,
  options: { scrapeTopBrands?: number; existingPatterns?: WinningPattern[] } = {},
): Promise<NicheKnowledge> => {
  log.info('[nicheBrainExpander] starting', { niche });

  // 1. Discover top brands
  const topBrands = await discoverTopBrandsInNiche(niche, 15);
  log.info('[nicheBrainExpander] top brands found', { niche, count: topBrands.length });

  // 2. Scrapear sus posts (opcional, si CU disponible)
  let allPatterns: WinningPattern[] = options.existingPatterns ?? [];
  const scrapeCount = options.scrapeTopBrands ?? 5;
  if (scrapeCount > 0) {
    const handlesToScrape = topBrands.slice(0, scrapeCount).map((b) => b.handle);
    const analysis = await runFullAnalysis({
      brand,
      scope: 'niche-top',
      handles: handlesToScrape,
      maxPostsPerHandle: 8,
    });
    allPatterns = [...allPatterns, ...analysis.patterns];
  }

  // 3. Síntesis de conocimiento del nicho
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3500,
    thinking: { type: 'adaptive' },
    system: `Estratega senior de marketing digital especializado en análisis de nichos.
Conocés deeply el ecosistema Instagram de cada vertical.`,
    messages: [
      {
        role: 'user',
        content: `Construí el conocimiento completo del nicho "${niche}" para Instagram:

TOP BRANDS identificadas:
${topBrands.map((b) => `- ${b.handle} (${b.followers.toLocaleString()} followers, ${(b.engagementRate * 100).toFixed(1)}% engagement) — ${b.signatureMove}`).join('\n')}

WINNING PATTERNS extraídos de análisis previo:
${allPatterns
  .slice(0, 15)
  .map((p) => `- [${p.patternType}] ${p.description} (conf ${(p.confidence * 100).toFixed(0)}%)`)
  .join('\n')}

Devolvé conocimiento estructurado del nicho:
{
  "benchmark": {
    "avgEngagementRate": número,
    "topEngagementRate": número,
    "avgPostsPerWeek": número,
    "bestFormats": ["formato más usado por top brands"],
    "bestPostingTimes": [horas],
    "topHashtags": ["#hashtag1", ...],
    "commonHooks": ["hook que se repite en top performers"]
  },
  "emergingTrends": ["trend que está creciendo en el nicho"],
  "dyingTrends": ["patrón que está perdiendo engagement"],
  "taboos": ["qué NO hacer en este nicho"],
  "audienceLanguage": {
    "keywords": ["palabras clave que la audiencia entiende"],
    "slang": ["jerga del nicho"],
    "influencers": ["@handle de líderes de opinión del nicho"]
  },
  "monetizationModels": ["cómo monetizan los top players"],
  "contentCadenceSweetSpot": {
    "postsPerWeek": número,
    "storiesPerWeek": número,
    "reelsPerWeek": número
  }
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[nicheBrainExpander] No knowledge generated');

  const generated = JSON.parse(jsonMatch[0]) as Partial<NicheKnowledge>;

  const knowledge: NicheKnowledge = {
    niche,
    generatedAt: new Date().toISOString(),
    topBrands,
    benchmark: {
      niche,
      topBrands: topBrands.map((b) => b.handle),
      generatedAt: new Date().toISOString(),
      benchmarkMetrics: generated.benchmark?.benchmarkMetrics ??
        (generated.benchmark as unknown as NicheBenchmark['benchmarkMetrics']) ?? {
          avgEngagementRate: 0.03,
          topEngagementRate: 0.08,
          avgPostsPerWeek: 5,
          bestFormats: [],
          bestPostingTimes: [],
          topHashtags: [],
          commonHooks: [],
        },
      winningPatterns: allPatterns,
    },
    emergingTrends: generated.emergingTrends ?? [],
    dyingTrends: generated.dyingTrends ?? [],
    taboos: generated.taboos ?? [],
    audienceLanguage: generated.audienceLanguage ?? { keywords: [], slang: [], influencers: [] },
    monetizationModels: generated.monetizationModels ?? [],
    contentCadenceSweetSpot: generated.contentCadenceSweetSpot ?? {
      postsPerWeek: 5,
      storiesPerWeek: 10,
      reelsPerWeek: 3,
    },
  };

  await ensureNicheDir();
  await fs.writeFile(knowledgePath(niche), JSON.stringify(knowledge, null, 2), 'utf-8');
  log.info('[nicheBrainExpander] knowledge saved', { niche, patterns: allPatterns.length });
  return knowledge;
};

export const getNicheKnowledge = async (niche: string): Promise<NicheKnowledge | null> => {
  try {
    return JSON.parse(await fs.readFile(knowledgePath(niche), 'utf-8')) as NicheKnowledge;
  } catch {
    return null;
  }
};

/** Inyecta knowledge del nicho en prompt de generación. */
export const buildNicheEnrichment = async (niche: string): Promise<string> => {
  const knowledge = await getNicheKnowledge(niche);
  if (!knowledge) return '';
  const parts: string[] = [`[CONOCIMIENTO DEL NICHO ${niche.toUpperCase()}]`];

  parts.push(
    `Engagement benchmark: ${(knowledge.benchmark.benchmarkMetrics.avgEngagementRate * 100).toFixed(1)}% promedio / ${(knowledge.benchmark.benchmarkMetrics.topEngagementRate * 100).toFixed(1)}% top`,
  );
  if (knowledge.benchmark.benchmarkMetrics.bestFormats.length)
    parts.push(`Formatos top: ${knowledge.benchmark.benchmarkMetrics.bestFormats.join(', ')}`);
  if (knowledge.benchmark.benchmarkMetrics.commonHooks.length)
    parts.push(`Hooks que funcionan: ${knowledge.benchmark.benchmarkMetrics.commonHooks.slice(0, 3).join(' / ')}`);
  if (knowledge.emergingTrends.length) parts.push(`Trends en alza: ${knowledge.emergingTrends.slice(0, 3).join(', ')}`);
  if (knowledge.dyingTrends.length)
    parts.push(`EVITAR (trends muriendo): ${knowledge.dyingTrends.slice(0, 3).join(', ')}`);
  if (knowledge.taboos.length) parts.push(`Taboos del nicho: ${knowledge.taboos.slice(0, 3).join('; ')}`);
  if (knowledge.audienceLanguage.slang.length)
    parts.push(`Jerga audiencia: ${knowledge.audienceLanguage.slang.slice(0, 5).join(', ')}`);

  parts.push('[FIN CONOCIMIENTO DEL NICHO]');
  return parts.join('\n');
};

/** Lista top patterns del nicho. */
export const getNicheTopPatterns = async (niche: string, limit = 10): Promise<WinningPattern[]> => {
  const knowledge = await getNicheKnowledge(niche);
  if (!knowledge) return [];
  return knowledge.benchmark.winningPatterns
    .sort((a, b) => b.confidence * b.avgEngagement - a.confidence * a.avgEngagement)
    .slice(0, limit);
};

void getTopPatterns;
