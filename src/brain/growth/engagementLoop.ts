/**
 * Engagement Loop Optimizer — Aprende el "loop" ideal de engagement
 * Identifica secuencias óptimas: qué post lleva a qué acción, qué momento
 * es mejor para stories, cómo mantener el momentum.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';

const LOOP_PATH = resolve('data/runtime/brain/engagement-loops.json');

export interface EngagementLoop {
  id: string;
  triggerPostId: string;
  triggerType: 'carousel' | 'reel' | 'story' | 'static' | 'live';
  followerActions: {
    like: number;
    comment: number;
    save: number;
    share: number;
    dm: number;
    storyReply: number;
  };
  nextOptimalAction: string;
  waitHours: number;
  conversionRate: number; // % que hacen la acción siguiente
  niche: string;
  createdAt: string;
}

interface LoopStore {
  loops: EngagementLoop[];
  optimalSequences: Record<string, string[]>; // postType -> [nextAction, nextAction]
  peakHours: Record<string, number[]>; // niche -> [hour1, hour2, ...]
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): LoopStore => {
  try {
    ensureDir();
    if (!existsSync(LOOP_PATH)) return { loops: [], optimalSequences: {}, peakHours: {} };
    return JSON.parse(readFileSync(LOOP_PATH, 'utf-8')) as LoopStore;
  } catch {
    return { loops: [], optimalSequences: {}, peakHours: {} };
  }
};

const saveStore = (store: LoopStore): void => {
  ensureDir();
  writeFileSync(LOOP_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ─- Record loop ───────────────────────────────────────────────────────────

export const recordLoop = (
  triggerPostId: string,
  triggerType: EngagementLoop['triggerType'],
  followerActions: EngagementLoop['followerActions'],
  nextOptimalAction: string,
  waitHours: number,
  conversionRate: number,
  niche: string,
): EngagementLoop => {
  const store = loadStore();

  const loop: EngagementLoop = {
    id: `loop-${Date.now()}`,
    triggerPostId,
    triggerType,
    followerActions,
    nextOptimalAction,
    waitHours,
    conversionRate,
    niche,
    createdAt: new Date().toISOString(),
  };

  store.loops.push(loop);
  if (store.loops.length > 300) store.loops = store.loops.slice(-300);

  // Update optimal sequences
  const seq = store.optimalSequences[triggerType] ?? [];
  seq.push(nextOptimalAction);
  store.optimalSequences[triggerType] = seq.slice(-20);

  saveStore(store);

  log.info(`[EngagementLoop] Recorded ${triggerType} → ${nextOptimalAction} (conv: ${conversionRate.toFixed(1)}%)`);
  return loop;
};

// ─- Get optimal loop ───────────────────────────────────────────────────────

export const getOptimalLoop = (
  niche: string,
  lastPostType: string,
): {
  nextAction: string;
  waitHours: number;
  urgency: 'high' | 'medium' | 'low';
  reasoning: string;
} => {
  const store = loadStore();
  const nicheLoops = store.loops.filter((l) => l.niche === niche && l.triggerType === lastPostType);

  if (nicheLoops.length === 0) {
    return {
      nextAction: 'story',
      waitHours: 6,
      urgency: 'medium',
      reasoning: 'Sin datos: story de seguimiento es acción segura',
    };
  }

  // Find best next action by conversion rate
  const byAction = new Map<string, number[]>();
  for (const l of nicheLoops) {
    const arr = byAction.get(l.nextOptimalAction) ?? [];
    arr.push(l.conversionRate);
    byAction.set(l.nextOptimalAction, arr);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const bestAction = Array.from(byAction.entries()).sort((a, b) => avg(b[1]) - avg(a[1]))[0]!;
  const avgWait =
    nicheLoops.filter((l) => l.nextOptimalAction === bestAction[0]).reduce((s, l) => s + l.waitHours, 0) /
    nicheLoops.filter((l) => l.nextOptimalAction === bestAction[0]).length;

  return {
    nextAction: bestAction[0],
    waitHours: Math.round(avgWait),
    urgency: avg(bestAction[1]) > 5 ? 'high' : 'medium',
    reasoning: `${bestAction[0]} tiene ${avg(bestAction[1]).toFixed(1)}% conversión después de ${lastPostType}`,
  };
};

// ─- Record peak hour ───────────────────────────────────────────────────────

export const recordPeakHour = (niche: string, hour: number, engagement: number): void => {
  const store = loadStore();
  const current = store.peakHours[niche] ?? [];
  current.push(hour);
  store.peakHours[niche] = current.slice(-50);
  saveStore(store);
  log.info(`[EngagementLoop] Peak hour ${hour}:00 for ${niche}`);
};

export const getPeakHours = (niche: string): number[] => {
  const store = loadStore();
  const hours = store.peakHours[niche] ?? [];
  if (hours.length === 0) return [9, 12, 18, 20];
  const freq = new Map<number, number>();
  for (const h of hours) freq.set(h, (freq.get(h) ?? 0) + 1);
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([h]) => h);
};

export const getStats = (): { loops: number; sequences: number } => {
  const store = loadStore();
  return { loops: store.loops.length, sequences: Object.keys(store.optimalSequences).length };
};
