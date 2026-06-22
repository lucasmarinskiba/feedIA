/**
 * Content Sequencing Engine — Secuencias narrativas de contenido
 * Crea arcos de contenido que cuentan historias a lo largo del tiempo
 * No posts sueltos, sino EPISODIOS de una serie mayor.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';

const SEQ_PATH = resolve('data/runtime/brain/sequencing-engine.json');

export interface ContentSequence {
  id: string;
  title: string;
  niche: string;
  theme: string;
  episodes: {
    number: number;
    format: string;
    hook: string;
    angle: string;
    scheduledFor?: string;
    postedAt?: string;
    performance?: { reach: number; engagement: number };
  }[];
  currentEpisode: number;
  status: 'planning' | 'active' | 'paused' | 'complete';
  targetAudience: string;
  goal: 'awareness' | 'engagement' | 'conversion' | 'community';
  createdAt: string;
}

interface SeqStore {
  sequences: ContentSequence[];
  templates: Record<string, string[]>;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): SeqStore => {
  try {
    ensureDir();
    if (!existsSync(SEQ_PATH)) return { sequences: [], templates: {} };
    return JSON.parse(readFileSync(SEQ_PATH, 'utf-8')) as SeqStore;
  } catch {
    return { sequences: [], templates: {} };
  }
};

const saveStore = (store: SeqStore): void => {
  ensureDir();
  writeFileSync(SEQ_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Create a sequence ──────────────────────────────────────────────────────

export const createSequence = (
  title: string,
  niche: string,
  theme: string,
  episodeCount: number,
  goal: ContentSequence['goal'],
  targetAudience: string,
): ContentSequence => {
  const store = loadStore();

  const formats = ['reel', 'carousel', 'story', 'post'];
  const angles = generateAngles(theme, episodeCount);

  const episodes: ContentSequence['episodes'] = [];
  for (let i = 0; i < episodeCount; i++) {
    episodes.push({
      number: i + 1,
      format: formats[i % formats.length] ?? 'post',
      hook: generateHook(theme, i + 1, episodeCount),
      angle: angles[i] ?? `Parte ${i + 1} de ${title}`,
    });
  }

  const sequence: ContentSequence = {
    id: `seq-${Date.now()}`,
    title,
    niche,
    theme,
    episodes,
    currentEpisode: 0,
    status: 'planning',
    targetAudience,
    goal,
    createdAt: new Date().toISOString(),
  };

  store.sequences.push(sequence);
  saveStore(store);

  semantic.storeMemory(
    `Secuencia creada: "${title}" (${episodeCount} episodios) — ${theme}`,
    'learning',
    { sequenceId: sequence.id, niche, goal },
    0.7,
  );

  log.info(`[SequencingEngine] Created "${title}": ${episodeCount} episodes`);
  return sequence;
};

// ── Get next episode to post ───────────────────────────────────────────────

export const getNextEpisode = (sequenceId: string): ContentSequence['episodes'][0] | null => {
  const store = loadStore();
  const seq = store.sequences.find((s) => s.id === sequenceId);
  if (!seq || seq.status !== 'active') return null;

  const next = seq.episodes[seq.currentEpisode];
  if (!next) return null;

  return next;
};

// ── Mark episode posted ────────────────────────────────────────────────────

export const markEpisodePosted = (sequenceId: string, performance?: { reach: number; engagement: number }): void => {
  const store = loadStore();
  const seq = store.sequences.find((s) => s.id === sequenceId);
  if (!seq) return;

  const ep = seq.episodes[seq.currentEpisode];
  if (ep) {
    ep.postedAt = new Date().toISOString();
    ep.performance = performance;
  }

  seq.currentEpisode += 1;
  if (seq.currentEpisode >= seq.episodes.length) {
    seq.status = 'complete';
  }

  saveStore(store);

  episodic.recordEpisode('sequence-episode-posted', `${seq.title} #${seq.currentEpisode}`, {
    tags: ['sequence', seq.niche],
    emotion: performance && performance.engagement > 1000 ? 'positive' : 'neutral',
  });

  log.info(`[SequencingEngine] Posted episode ${seq.currentEpisode} of "${seq.title}"`);
};

// ── Get active sequences ───────────────────────────────────────────────────

export const getActiveSequences = (niche?: string): ContentSequence[] => {
  return loadStore().sequences.filter((s) => s.status === 'active' && (!niche || s.niche === niche));
};

// ─- Sequence performance ───────────────────────────────────────────────────

export const getSequencePerformance = (
  sequenceId: string,
): {
  totalReach: number;
  totalEngagement: number;
  avgEngagementRate: number;
  bestEpisode: number;
} => {
  const store = loadStore();
  const seq = store.sequences.find((s) => s.id === sequenceId);
  if (!seq) return { totalReach: 0, totalEngagement: 0, avgEngagementRate: 0, bestEpisode: 0 };

  const posted = seq.episodes.filter((e) => e.performance);
  const totalReach = posted.reduce((s, e) => s + (e.performance?.reach ?? 0), 0);
  const totalEngagement = posted.reduce((s, e) => s + (e.performance?.engagement ?? 0), 0);
  const avgRate = totalReach > 0 ? totalEngagement / totalReach : 0;

  const best = posted.sort((a, b) => (b.performance?.engagement ?? 0) - (a.performance?.engagement ?? 0))[0];

  return { totalReach, totalEngagement, avgEngagementRate: avgRate, bestEpisode: best?.number ?? 0 };
};

// ── Helpers ────────────────────────────────────────────────────────────────

const generateAngles = (theme: string, count: number): string[] => {
  const templates = [
    `El problema que nadie ve en ${theme}`,
    `La solución que cambió todo en ${theme}`,
    `El antes y después de ${theme}`,
    `Mitos que destruyen ${theme}`,
    `Secretos que los expertos ocultan de ${theme}`,
    `Cómo empezar con ${theme} desde cero`,
    `Errores que te cuestan caro en ${theme}`,
    `La verdad incómoda sobre ${theme}`,
  ];
  return templates.slice(0, count);
};

const generateHook = (theme: string, episode: number, total: number): string => {
  const hooks = [
    `Parte ${episode}: Esto de ${theme} te va a volar la cabeza 🤯`,
    `${episode}/${total} — Lo que nadie te dice de ${theme}`,
    `Si te perdiste las partes anteriores, esto de ${theme} te interesa`,
    `Continuamos con ${theme}: la parte que más me pidieron`,
    `${episode} de ${total}: El plot twist de ${theme}`,
  ];
  return hooks[(episode - 1) % hooks.length] ?? `Parte ${episode} de ${total}`;
};

export const getStats = (): { total: number; active: number; complete: number } => {
  const store = loadStore();
  return {
    total: store.sequences.length,
    active: store.sequences.filter((s) => s.status === 'active').length,
    complete: store.sequences.filter((s) => s.status === 'complete').length,
  };
};
