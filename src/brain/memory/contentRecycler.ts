// @ts-nocheck
/**
 * Content Recycler — Memoria de contenido reciclable
 * Sabe qué posts revivir, cuándo, y cómo transformarlos.
 * Ningún contenido muere, solo cambia de forma.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from './semanticMemory.js';
import * as episodic from './episodicMemory.js';

const RECYCLE_PATH = resolve('data/runtime/brain/content-recycler.json');

export interface RecyclableContent {
  originalId: string;
  content: string;
  format: string;
  niche: string;
  createdAt: string;
  performance: {
    reach: number;
    engagement: number;
    saves: number;
    shares: number;
    sentiment: 'hit' | 'good' | 'average' | 'flop';
  };
  recycles: {
    date: string;
    format: string;
    variation: string;
    performance: string; // 'better' | 'similar' | 'worse'
  }[];
  recycleScore: number; // 0-1, higher = better candidate for recycling
  suggestedFormats: string[];
  bestTimeToRecycle: string;
}

interface RecyclerStore {
  contents: RecyclableContent[];
  recycleRules: string[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): RecyclerStore => {
  try {
    ensureDir();
    if (!existsSync(RECYCLE_PATH)) return { contents: [], recycleRules: [] };
    return JSON.parse(readFileSync(RECYCLE_PATH, 'utf-8')) as RecyclerStore;
  } catch {
    return { contents: [], recycleRules: [] };
  }
};

const saveStore = (store: RecyclerStore): void => {
  ensureDir();
  writeFileSync(RECYCLE_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Store content for potential recycling ──────────────────────────────────

export const storeContent = async (
  contentId: string,
  content: string,
  format: string,
  niche: string,
  performance: { reach: number; engagement: number; saves: number; shares: number },
): Promise<RecyclableContent> => {
  const store = loadStore();

  const engagementRate = performance.reach > 0 ? performance.engagement / performance.reach : 0;
  const sentiment: RecyclableContent['performance']['sentiment'] =
    engagementRate > 0.1 ? 'hit' : engagementRate > 0.05 ? 'good' : engagementRate > 0.02 ? 'average' : 'flop';

  // Calculate recycle score
  const recycleScore =
    (performance.saves / (performance.reach || 1)) * 0.4 + // saves = evergreen
    (performance.shares / (performance.reach || 1)) * 0.3 + // shares = viral potential
    (sentiment === 'hit' ? 0.3 : sentiment === 'good' ? 0.2 : 0.05);

  const suggestedFormats = getRecycleFormats(format, sentiment);
  const bestTimeToRecycle = getBestRecycleTime(performance.reach, performance.engagement);

  const recyclable: RecyclableContent = {
    originalId: contentId,
    content,
    format,
    niche,
    createdAt: new Date().toISOString(),
    performance: { ...performance, sentiment },
    recycles: [],
    recycleScore: Math.min(1, recycleScore),
    suggestedFormats,
    bestTimeToRecycle,
  };

  store.contents.push(recyclable);
  if (store.contents.length > 500)
    store.contents = store.contents.sort((a, b) => b.recycleScore - a.recycleScore).slice(0, 500);
  saveStore(store);

  await semantic.storeMemory(
    `Contenido reciclable: "${content.slice(0, 60)}..." (score=${recycleScore.toFixed(2)})`,
    'post',
    { contentId, format, niche, sentiment, recycleScore },
    recycleScore,
  );

  log.info(`[ContentRecycler] Stored ${contentId}: sentiment=${sentiment}, recycleScore=${recycleScore.toFixed(2)}`);
  return recyclable;
};

// ── Find best content to recycle now ───────────────────────────────────────

export const getRecycleCandidates = (niche: string, limit = 5): RecyclableContent[] => {
  const store = loadStore();
  const now = Date.now();

  return store.contents
    .filter((c) => {
      const daysOld = (now - new Date(c.createdAt).getTime()) / (24 * 3600_000);
      return c.niche === niche && daysOld > 30 && c.recycles.length < 3 && c.recycleScore > 0.4;
    })
    .sort((a, b) => b.recycleScore - a.recycleScore)
    .slice(0, limit);
};

// ── Generate recycle variation ─────────────────────────────────────────────

export const generateVariation = (
  content: RecyclableContent,
  targetFormat: string,
): { text: string; hook: string; cta: string } => {
  const original = content.content;

  const variations: Record<string, (text: string) => { text: string; hook: string; cta: string }> = {
    reel: (t) => ({
      text: `POV: ${t.slice(0, 80)}... [versión video]`,
      hook: `Esto cambió todo para mí...`,
      cta: 'Guarda para después 📌',
    }),
    carousel: (t) => ({
      text: `Desglose completo: ${t.slice(0, 60)}... [carrusel educativo]`,
      hook: `Swipe para ver todo 👉`,
      cta: 'Comparte con alguien que lo necesite 🔄',
    }),
    story: (t) => ({
      text: `${t.slice(0, 100)}... [encuesta + explicación]`,
      hook: `¿Vos qué harías?`,
      cta: 'Responde en los stories 👆',
    }),
    quote: (t) => ({
      text: `"${t.slice(0, 120)}..."`,
      hook: `Esto lo necesitás leer hoy.`,
      cta: 'Etiquetá a alguien que lo necesite 👇',
    }),
  };

  const generator = variations[targetFormat] ?? variations.quote;
  if (!generator) return { text: original, hook: 'Mira esto 👀', cta: 'Comparte 🔄' };
  return generator(original);
};

// ── Record recycle performance ─────────────────────────────────────────────

export const recordRecycle = (originalId: string, variation: string, format: string, performance: string): void => {
  const store = loadStore();
  const content = store.contents.find((c) => c.originalId === originalId);
  if (!content) return;

  content.recycles.push({ date: new Date().toISOString(), format, variation, performance });

  // Adjust recycle score based on performance
  if (performance === 'better') content.recycleScore = Math.min(1, content.recycleScore + 0.1);
  if (performance === 'worse') content.recycleScore = Math.max(0, content.recycleScore - 0.1);

  saveStore(store);
  log.info(`[ContentRecycler] Recycled ${originalId} → ${format}: ${performance}`);
};

// ── Helpers ────────────────────────────────────────────────────────────────

const getRecycleFormats = (originalFormat: string, sentiment: string): string[] => {
  const map: Record<string, string[]> = {
    post: ['reel', 'carousel', 'story', 'quote'],
    reel: ['carousel', 'post', 'quote'],
    carousel: ['reel', 'post', 'story'],
    story: ['reel', 'post'],
  };

  const base = map[originalFormat] ?? ['post', 'quote'];
  if (sentiment === 'hit') return [...base, 'carousel'];
  return base;
};

const getBestRecycleTime = (reach: number, engagement: number): string => {
  const score = reach + engagement * 3;
  if (score > 10000) return '30 días (contenido hit, reciclar rápido)';
  if (score > 3000) return '60 días (buen contenido, esperar un poco)';
  return '90 días (contenido promedio, dejar madurar)';
};

export const getStats = (): { total: number; hits: number; readyToRecycle: number } => {
  const store = loadStore();
  return {
    total: store.contents.length,
    hits: store.contents.filter((c) => c.performance.sentiment === 'hit').length,
    readyToRecycle: getRecycleCandidates('all', 999).length,
  };
};
