// @ts-nocheck
/**
 * Competitor Brain — Inteligencia de competidores con aprendizaje real
 * No solo rastrea, sino que APRENDE de los competidores:
 * - Qué formatos usan y funcionan
 * - Qué horarios postean
 * - Qué hooks usan
 * - Cuándo cambian de estrategia
 * - Predice sus próximos movimientos
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as causal from '../reasoning/causalEngine.js';
import * as graph from '../memory/knowledgeGraph.js';

const COMP_PATH = resolve('data/runtime/brain/competitor-brain.json');

export interface CompetitorProfile {
  handle: string;
  niche: string;
  firstTracked: string;
  lastTracked: string;
  followerHistory: { date: string; count: number }[];
  postingPattern: {
    bestDays: string[];
    bestHours: number[];
    frequency: number; // posts per week
    formats: Record<string, number>;
  };
  topHooks: { text: string; engagement: number; usedAt: string }[];
  contentThemes: string[];
  weaknesses: string[];
  strengths: string[];
  strategyShifts: { date: string; from: string; to: string; confidence: number }[];
  predictedNextMoves: string[];
}

interface CompetitorStore {
  competitors: CompetitorProfile[];
  marketInsights: string[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): CompetitorStore => {
  try {
    ensureDir();
    if (!existsSync(COMP_PATH)) return { competitors: [], marketInsights: [] };
    return JSON.parse(readFileSync(COMP_PATH, 'utf-8')) as CompetitorStore;
  } catch {
    return { competitors: [], marketInsights: [] };
  }
};

const saveStore = (store: CompetitorStore): void => {
  ensureDir();
  writeFileSync(COMP_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Track competitor post ──────────────────────────────────────────────────

export const trackCompetitorPost = async (
  handle: string,
  post: {
    hook: string;
    format: string;
    engagement: number;
    postedAt: string;
    theme: string;
  },
  ourNiche: string,
): Promise<CompetitorProfile> => {
  const store = loadStore();
  let comp = store.competitors.find((c) => c.handle.toLowerCase() === handle.toLowerCase());

  if (!comp) {
    comp = {
      handle,
      niche: ourNiche,
      firstTracked: new Date().toISOString(),
      lastTracked: new Date().toISOString(),
      followerHistory: [],
      postingPattern: { bestDays: [], bestHours: [], frequency: 0, formats: {} },
      topHooks: [],
      contentThemes: [],
      weaknesses: [],
      strengths: [],
      strategyShifts: [],
      predictedNextMoves: [],
    };
    store.competitors.push(comp);
  }

  comp.lastTracked = new Date().toISOString();

  // Track hook
  comp.topHooks.push({ text: post.hook, engagement: post.engagement, usedAt: post.postedAt });
  comp.topHooks.sort((a, b) => b.engagement - a.engagement);
  comp.topHooks = comp.topHooks.slice(-20);

  // Track format
  comp.postingPattern.formats[post.format] = (comp.postingPattern.formats[post.format] ?? 0) + 1;

  // Track theme
  if (!comp.contentThemes.includes(post.theme)) comp.contentThemes.push(post.theme);

  // Detect strategy shift
  const recentThemes = comp.contentThemes.slice(-5);
  const previousThemes = comp.contentThemes.slice(-10, -5);
  const newThemes = recentThemes.filter((t) => !previousThemes.includes(t));
  if (newThemes.length >= 2 && comp.strategyShifts.length > 0) {
    const lastShift = comp.strategyShifts[comp.strategyShifts.length - 1]!;
    const daysSinceShift = (Date.now() - new Date(lastShift.date).getTime()) / (24 * 3600_000);
    if (daysSinceShift > 14) {
      comp.strategyShifts.push({
        date: new Date().toISOString(),
        from: previousThemes.join(', ') || 'unknown',
        to: recentThemes.join(', '),
        confidence: 0.7,
      });
    }
  }

  // Predict next moves
  comp.predictedNextMoves = predictMoves(comp);

  saveStore(store);

  // Learn from competitor success
  if (post.engagement > 1000) {
    await causal.inferCause({
      action: `competitor ${handle} usa hook: ${post.hook}`,
      outcome: 'alto engagement',
      before: 100,
      after: post.engagement,
      context: `format=${post.format}, theme=${post.theme}`,
      niche: ourNiche,
    });
  }

  await semantic.storeMemory(
    `Competidor @${handle}: "${post.hook}" → ${post.engagement} engagement (${post.format})`,
    'learning',
    { handle, format: post.format, engagement: post.engagement },
    Math.min(1, post.engagement / 5000),
  );

  graph.addTriple(handle, 'postea formato', post.format, 0.7, 'competitor-brain');
  graph.addTriple(handle, 'usa hook', post.hook.slice(0, 30), post.engagement / 10000, 'competitor-brain');

  episodic.recordEpisode('competitor-tracked', `${handle}: ${post.hook.slice(0, 50)}`, {
    tags: ['competitor', post.format],
    emotion: post.engagement > 1000 ? 'positive' : 'neutral',
  });

  log.info(`[CompetitorBrain] Tracked @${handle}: ${post.format}, engagement=${post.engagement}`);
  return comp;
};

// ── Predict competitor moves ───────────────────────────────────────────────

const predictMoves = (comp: CompetitorProfile): string[] => {
  const moves: string[] = [];

  // Based on format patterns
  const topFormat = Object.entries(comp.postingPattern.formats).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topFormat) moves.push(`Seguirá usando ${topFormat} como formato principal`);

  // Based on recent hooks
  if (comp.topHooks.length > 0) {
    const recentHook = comp.topHooks[0]!;
    moves.push(`Probablemente replique hooks similares a: "${recentHook.text.slice(0, 40)}..."`);
  }

  // Based on strategy shifts
  if (comp.strategyShifts.length > 0) {
    const lastShift = comp.strategyShifts[comp.strategyShifts.length - 1]!;
    moves.push(`Dirección estratégica: ${lastShift.to}`);
  }

  // Based on frequency
  const freq = comp.postingPattern.frequency;
  if (freq > 7) moves.push('Mantendrá alta frecuencia (daily posting)');
  else if (freq < 3) moves.push('Posible aumento de frecuencia próximamente');

  return moves;
};

// ── Get competitive intel ──────────────────────────────────────────────────

export const getCompetitorIntel = (handle: string): CompetitorProfile | undefined => {
  return loadStore().competitors.find((c) => c.handle.toLowerCase() === handle.toLowerCase());
};

export const getAllCompetitors = (): CompetitorProfile[] => loadStore().competitors;

export const getMarketGaps = (ourNiche: string): { gap: string; evidence: string[]; opportunity: string }[] => {
  const store = loadStore();
  const gaps: { gap: string; evidence: string[]; opportunity: string }[] = [];

  // Find content themes NO ONE is using
  const allThemes = new Set<string>();
  for (const c of store.competitors) c.contentThemes.forEach((t) => allThemes.add(t));

  const commonThemes = [...allThemes].filter(
    (t) => store.competitors.filter((c) => c.contentThemes.includes(t)).length >= 2,
  );
  const uncommonThemes = [...allThemes].filter((t) => !commonThemes.includes(t));

  if (uncommonThemes.length > 0) {
    gaps.push({
      gap: 'Contenido poco explotado',
      evidence: uncommonThemes.slice(0, 3),
      opportunity: 'Ser el primero en cubrir estos temas en el nicho',
    });
  }

  // Find posting time gaps
  const allHours = store.competitors.flatMap((c) => c.postingPattern.bestHours);
  const hourCounts = new Map<number, number>();
  for (const h of allHours) hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  const uncoveredHours = [6, 12, 18, 21].filter((h) => (hourCounts.get(h) ?? 0) < 2);
  if (uncoveredHours.length > 0) {
    gaps.push({
      gap: 'Horarios de publicación poco competitivos',
      evidence: uncoveredHours.map((h) => `${h}:00`),
      opportunity: 'Publicar en horarios donde nadie compite por atención',
    });
  }

  return gaps;
};

// ── Benchmark against competitors ──────────────────────────────────────────

export const benchmark = (
  ourHandle: string,
  metrics: { followers: number; engagement: number; frequency: number },
): {
  percentile: number;
  strongerThan: number;
  weakerThan: number;
  recommendations: string[];
} => {
  const store = loadStore();
  const comps = store.competitors;

  if (comps.length === 0)
    return {
      percentile: 50,
      strongerThan: 0,
      weakerThan: 0,
      recommendations: ['Agregar competidores para benchmarking'],
    };

  const followerScores = comps.map((c) => c.followerHistory[c.followerHistory.length - 1]?.count ?? 0);
  const engagementScores = comps.flatMap((c) => c.topHooks.map((h) => h.engagement));

  const followerPercentile = followerScores.filter((f) => f < metrics.followers).length / followerScores.length;
  const engagementPercentile =
    engagementScores.filter((e) => e < metrics.engagement).length / (engagementScores.length || 1);

  const avgPercentile = (followerPercentile + engagementPercentile) / 2;

  const recommendations: string[] = [];
  if (followerPercentile < 0.5) recommendations.push('Crecimiento de followers por debajo de la media del nicho');
  if (engagementPercentile < 0.5) recommendations.push('Engagement por debajo de competidores — revisar hooks y CTAs');
  if (metrics.frequency < 3) recommendations.push('Frecuencia de publicación baja vs competidores');

  return {
    percentile: Math.round(avgPercentile * 100),
    strongerThan: comps.filter((c) => (c.followerHistory[c.followerHistory.length - 1]?.count ?? 0) < metrics.followers)
      .length,
    weakerThan: comps.filter((c) => (c.followerHistory[c.followerHistory.length - 1]?.count ?? 0) > metrics.followers)
      .length,
    recommendations,
  };
};
