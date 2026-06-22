/**
 * Engagement Loop Optimizer
 * Analiza los loops de engagement (post → comentarios → respuestas → nuevos comentarios)
 * y optimiza la estrategia de respuesta para maximizar la duración y profundidad de conversaciones.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';

const LOOP_PATH = resolve('data/runtime/brain/engagement-loops.json');

export interface LoopRecord {
  threadId: string;
  postId: string;
  initialEngagement: number;
  replyCount: number;
  uniqueParticipants: number;
  conversationDepth: number;
  totalRepliesFromBrand: number;
  avgTimeBetweenReplies: number;
  loopDuration: number; // minutes
  engagementAtEnd: number;
  niche: string;
  createdAt: string;
}

interface LoopStore {
  loops: LoopRecord[];
  replyTiming: Record<string, number[]>; // niche -> reply timing
  depthPerformance: Record<number, number[]>; // depth -> engagement
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): LoopStore => {
  try {
    ensureDir();
    if (!existsSync(LOOP_PATH)) return { loops: [], replyTiming: {}, depthPerformance: {} };
    return JSON.parse(readFileSync(LOOP_PATH, 'utf-8')) as LoopStore;
  } catch {
    return { loops: [], replyTiming: {}, depthPerformance: {} };
  }
};

const saveStore = (store: LoopStore): void => {
  ensureDir();
  writeFileSync(LOOP_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Record loop ────────────────────────────────────────────────────────────

export const recordLoop = (loop: Omit<LoopRecord, 'createdAt'>): LoopRecord => {
  const store = loadStore();

  const fullLoop: LoopRecord = { ...loop, createdAt: new Date().toISOString() };
  store.loops.push(fullLoop);
  if (store.loops.length > 300) store.loops = store.loops.slice(-300);

  // Update reply timing
  const timing = store.replyTiming[loop.niche] ?? [];
  timing.push(loop.avgTimeBetweenReplies);
  store.replyTiming[loop.niche] = timing.slice(-50);

  // Update depth performance
  const depth = store.depthPerformance[loop.conversationDepth] ?? [];
  depth.push(loop.engagementAtEnd);
  store.depthPerformance[loop.conversationDepth] = depth.slice(-30);

  saveStore(store);

  semantic.storeMemory(
    `Loop: ${loop.replyCount} replies, depth ${loop.conversationDepth} → engagement ${loop.engagementAtEnd}`,
    'post',
    { threadId: loop.threadId, depth: loop.conversationDepth, niche: loop.niche },
    Math.min(1, loop.engagementAtEnd / 10000),
  );

  log.info(`[EngagementLoop] Recorded loop: ${loop.replyCount} replies, depth ${loop.conversationDepth}`);
  return fullLoop;
};

// ─- Optimal strategy ───────────────────────────────────────────────────────

export const getOptimalStrategy = (
  niche: string,
): {
  optimalReplyTime: number;
  optimalDepth: number;
  shouldContinue: boolean;
  tips: string[];
} => {
  const store = loadStore();
  const nicheLoops = store.loops.filter((l) => l.niche === niche);

  if (nicheLoops.length === 0) {
    return {
      optimalReplyTime: 15,
      optimalDepth: 3,
      shouldContinue: true,
      tips: ['Responder en 10-20 minutos', 'Mantener conversación activa 3-4 niveles'],
    };
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

  // Optimal reply time
  const timings = store.replyTiming[niche] ?? [];
  const optimalReplyTime = Math.round(avg(timings) || 15);

  // Optimal depth
  const depthEntries = Object.entries(store.depthPerformance)
    .map(([depth, engagements]) => ({ depth: parseInt(depth, 10), avgEngagement: avg(engagements) }))
    .filter((d) => !isNaN(d.depth));
  const optimalDepth = depthEntries.sort((a, b) => b.avgEngagement - a.avgEngagement)[0]?.depth ?? 3;

  // Should continue?
  const highDepthLoops = nicheLoops.filter((l) => l.conversationDepth >= optimalDepth);
  const lowDepthLoops = nicheLoops.filter((l) => l.conversationDepth < optimalDepth);
  const shouldContinue =
    avg(highDepthLoops.map((l) => l.engagementAtEnd)) > avg(lowDepthLoops.map((l) => l.engagementAtEnd));

  const tips: string[] = [];
  if (optimalReplyTime < 10) tips.push('Responder rápido mantiene el momentum');
  if (optimalReplyTime > 30) tips.push('Esperar respuesta permite que la conversación madure');
  if (shouldContinue) tips.push('Profundizar en conversaciones aumenta engagement');
  else tips.push('No forzar profundidad — calidad sobre cantidad');

  return { optimalReplyTime, optimalDepth, shouldContinue, tips };
};

export const getStats = (): { loops: number; niches: string[] } => {
  const store = loadStore();
  return { loops: store.loops.length, niches: [...new Set(store.loops.map((l) => l.niche))] };
};
