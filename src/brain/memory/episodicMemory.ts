// @ts-nocheck
/**
 * Episodic Memory — Memoria de eventos concretos del cerebro FeedIA
 * "Qué pasó el 15 de mayo", "Qué le prometí a @usuario", "Qué funcionó en marzo"
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';

const EP_PATH = resolve('data/runtime/brain/episodic-memory.json');

export interface Episode {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  event: string;
  who?: string;
  what: string;
  outcome?: string;
  emotion?: 'positive' | 'negative' | 'neutral' | 'urgent';
  tags: string[];
}

interface EpisodicStore {
  episodes: Episode[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): EpisodicStore => {
  try {
    ensureDir();
    if (!existsSync(EP_PATH)) return { episodes: [] };
    return JSON.parse(readFileSync(EP_PATH, 'utf-8')) as EpisodicStore;
  } catch {
    return { episodes: [] };
  }
};

const saveStore = (store: EpisodicStore): void => {
  ensureDir();
  writeFileSync(EP_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

export const recordEpisode = (
  event: string,
  what: string,
  opts?: {
    who?: string;
    outcome?: string;
    emotion?: Episode['emotion'];
    tags?: string[];
    date?: string;
  },
): Episode => {
  const now = new Date();
  const episode: Episode = {
    id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    date: opts?.date ?? now.toISOString().slice(0, 10),
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    event,
    who: opts?.who,
    what,
    outcome: opts?.outcome,
    emotion: opts?.emotion ?? 'neutral',
    tags: opts?.tags ?? [],
  };
  const store = loadStore();
  store.episodes.push(episode);
  // Max 500 episodes, prune oldest
  if (store.episodes.length > 500) store.episodes = store.episodes.slice(-500);
  saveStore(store);
  log.info(`[EpisodicMemory] Recorded: ${event} — ${what.slice(0, 60)}`);
  return episode;
};

export const recallByDate = (date: string): Episode[] => {
  const store = loadStore();
  return store.episodes.filter((e) => e.date === date).sort((a, b) => a.time.localeCompare(b.time));
};

export const recallByTag = (tag: string): Episode[] => {
  const store = loadStore();
  return store.episodes.filter((e) => e.tags.includes(tag)).sort((a, b) => b.date.localeCompare(a.date));
};

export const recallByWho = (who: string): Episode[] => {
  const store = loadStore();
  return store.episodes
    .filter((e) => e.who?.toLowerCase() === who.toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date));
};

export const recallByEmotion = (emotion: Episode['emotion']): Episode[] => {
  const store = loadStore();
  return store.episodes.filter((e) => e.emotion === emotion).sort((a, b) => b.date.localeCompare(a.date));
};

export const recallLastDays = (days = 7): Episode[] => {
  const cutoff = new Date(Date.now() - days * 24 * 3600_000).toISOString().slice(0, 10);
  const store = loadStore();
  return store.episodes.filter((e) => e.date >= cutoff).sort((a, b) => b.date.localeCompare(a.date));
};

export const searchEpisodes = (query: string): Episode[] => {
  const q = query.toLowerCase();
  const store = loadStore();
  return store.episodes
    .filter(
      (e) =>
        e.event.toLowerCase().includes(q) ||
        e.what.toLowerCase().includes(q) ||
        e.outcome?.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
};

export const summarizePeriod = (
  days = 30,
): {
  total: number;
  byEmotion: Record<string, number>;
  byTag: Record<string, number>;
  highlights: string[];
} => {
  const episodes = recallLastDays(days);
  const byEmotion: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  const highlights: string[] = [];

  for (const e of episodes) {
    byEmotion[e.emotion ?? 'neutral'] = (byEmotion[e.emotion ?? 'neutral'] ?? 0) + 1;
    for (const t of e.tags) byTag[t] = (byTag[t] ?? 0) + 1;
    if (e.emotion === 'positive' || (e.outcome && e.outcome.length > 10)) {
      highlights.push(`${e.date}: ${e.event} → ${e.outcome ?? e.what}`);
    }
  }

  return { total: episodes.length, byEmotion, byTag, highlights: highlights.slice(0, 10) };
};
