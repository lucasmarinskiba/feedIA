/**
 * Video Brain — Análisis de reels/video
 * Aprende qué funciona en video: duración, ritmo, hooks visuales,
 * música, transiciones, texto en pantalla.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';

const VIDEO_PATH = resolve('data/runtime/brain/video-brain.json');

export interface VideoPattern {
  id: string;
  duration: number; // seconds
  hookType: 'visual-shock' | 'question' | 'promise' | 'story' | 'trending-audio' | 'text-overlay';
  hasTrendingAudio: boolean;
  textOverlayCount: number;
  transitionStyle: 'cut' | 'smooth' | 'zoom' | 'none';
  captionStyle: 'minimal' | 'storytelling' | 'educational' | 'hype';
  engagement: number;
  watchTime: number; // %
  shares: number;
  saves: number;
  niche: string;
  createdAt: string;
}

interface VideoStore {
  patterns: VideoPattern[];
  optimalDuration: Record<string, number>;
  hookPerformance: Record<string, number[]>;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): VideoStore => {
  try {
    ensureDir();
    if (!existsSync(VIDEO_PATH)) return { patterns: [], optimalDuration: {}, hookPerformance: {} };
    return JSON.parse(readFileSync(VIDEO_PATH, 'utf-8')) as VideoStore;
  } catch {
    return { patterns: [], optimalDuration: {}, hookPerformance: {} };
  }
};

const saveStore = (store: VideoStore): void => {
  ensureDir();
  writeFileSync(VIDEO_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Record video pattern ───────────────────────────────────────────────────

export const recordVideoPattern = (
  pattern: Omit<VideoPattern, 'id' | 'createdAt' | 'engagement'> & { engagement: number },
): VideoPattern => {
  const store = loadStore();

  const fullPattern: VideoPattern = {
    ...pattern,
    id: `vid-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  store.patterns.push(fullPattern);
  if (store.patterns.length > 300) store.patterns = store.patterns.slice(-300);

  // Update optimal duration for niche
  const currentOptimal = store.optimalDuration[pattern.niche] ?? 30;
  store.optimalDuration[pattern.niche] = currentOptimal * 0.9 + pattern.duration * 0.1;

  // Update hook performance
  const hooks = store.hookPerformance[pattern.hookType] ?? [];
  hooks.push(pattern.engagement);
  store.hookPerformance[pattern.hookType] = hooks.slice(-50);

  saveStore(store);

  semantic.storeMemory(
    `Video: ${pattern.hookType}, ${pattern.duration}s, ${pattern.transitionStyle} → engagement ${pattern.engagement}`,
    'post',
    { hookType: pattern.hookType, duration: pattern.duration, niche: pattern.niche },
    Math.min(1, pattern.engagement / 10000),
  );

  log.info(`[VideoBrain] Recorded ${pattern.hookType} reel: ${pattern.duration}s, engagement=${pattern.engagement}`);
  return fullPattern;
};

// ── Get video formula ──────────────────────────────────────────────────────

export const getVideoFormula = (
  niche: string,
): {
  optimalDuration: number;
  bestHook: string;
  bestTransition: string;
  bestCaption: string;
  tips: string[];
} => {
  const store = loadStore();
  const nichePatterns = store.patterns.filter((p) => p.niche === niche);

  if (nichePatterns.length === 0) {
    return {
      optimalDuration: 30,
      bestHook: 'visual-shock',
      bestTransition: 'cut',
      bestCaption: 'educational',
      tips: ['Probar reels de 20-30s', 'Hook visual en primeros 3 segundos'],
    };
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

  // Best hook
  const hookScores = new Map<string, number[]>();
  for (const p of nichePatterns) {
    const arr = hookScores.get(p.hookType) ?? [];
    arr.push(p.engagement);
    hookScores.set(p.hookType, arr);
  }
  const bestHook = Array.from(hookScores.entries()).sort((a, b) => avg(b[1]) - avg(a[1]))[0]?.[0] ?? 'visual-shock';

  // Best transition
  const transScores = new Map<string, number[]>();
  for (const p of nichePatterns) {
    const arr = transScores.get(p.transitionStyle) ?? [];
    arr.push(p.engagement);
    transScores.set(p.transitionStyle, arr);
  }
  const bestTransition = Array.from(transScores.entries()).sort((a, b) => avg(b[1]) - avg(a[1]))[0]?.[0] ?? 'cut';

  // Best caption
  const capScores = new Map<string, number[]>();
  for (const p of nichePatterns) {
    const arr = capScores.get(p.captionStyle) ?? [];
    arr.push(p.engagement);
    capScores.set(p.captionStyle, arr);
  }
  const bestCaption = Array.from(capScores.entries()).sort((a, b) => avg(b[1]) - avg(a[1]))[0]?.[0] ?? 'educational';

  const tips: string[] = [];
  const avgWatchTime = nichePatterns.reduce((s, p) => s + p.watchTime, 0) / nichePatterns.length;
  if (avgWatchTime < 0.3) tips.push('Watch time bajo — mejorar hook en primeros 3 segundos');
  if (
    nichePatterns.filter((p) => p.hasTrendingAudio).reduce((s, p) => s + p.engagement, 0) /
      (nichePatterns.filter((p) => p.hasTrendingAudio).length || 1) >
    nichePatterns.filter((p) => !p.hasTrendingAudio).reduce((s, p) => s + p.engagement, 0) /
      (nichePatterns.filter((p) => !p.hasTrendingAudio).length || 1)
  ) {
    tips.push('Usar audio trending aumenta engagement');
  }

  return {
    optimalDuration: Math.round(store.optimalDuration[niche] ?? 30),
    bestHook,
    bestTransition,
    bestCaption,
    tips,
  };
};

export const getStats = (): { patterns: number; niches: string[] } => {
  const store = loadStore();
  const niches = [...new Set(store.patterns.map((p) => p.niche))];
  return { patterns: store.patterns.length, niches };
};
