/**
 * Hashtag Ecosystem — Inteligencia profunda de hashtags
 * No solo sugiere hashtags: entiende su ecosistema, su ciclo de vida,
 * su relación con otros hashtags, y predice cuáles están por explotar.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';

const TAG_PATH = resolve('data/runtime/brain/hashtag-ecosystem.json');

export interface HashtagNode {
  tag: string;
  niche: string;
  usageCount: number;
  avgEngagement: number;
  postsPerHour: number;
  reachScore: number; // 0-1
  saturationLevel: 'low' | 'medium' | 'high' | 'oversaturated';
  relatedTags: string[];
  peakHours: number[];
  trendDirection: 'rising' | 'stable' | 'falling' | 'viral';
  firstSeen: string;
  lastSeen: string;
}

interface TagStore {
  tags: HashtagNode[];
  clusters: Record<string, string[]>; // niche -> cluster of related tags
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): TagStore => {
  try {
    ensureDir();
    if (!existsSync(TAG_PATH)) return { tags: [], clusters: {} };
    return JSON.parse(readFileSync(TAG_PATH, 'utf-8')) as TagStore;
  } catch {
    return { tags: [], clusters: {} };
  }
};

const saveStore = (store: TagStore): void => {
  ensureDir();
  writeFileSync(TAG_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ─- Record hashtag usage ───────────────────────────────────────────────────

export const recordHashtag = (
  tag: string,
  niche: string,
  performance: { engagement: number; reach: number },
  relatedTags: string[] = [],
): HashtagNode => {
  const store = loadStore();
  const existing = store.tags.find((t) => t.tag === tag && t.niche === niche);

  if (existing) {
    existing.usageCount += 1;
    existing.avgEngagement = existing.avgEngagement * 0.9 + performance.engagement * 0.1;
    existing.reachScore = Math.min(1, existing.reachScore * 0.9 + (performance.reach / 10000) * 0.1);
    existing.lastSeen = new Date().toISOString();
    existing.relatedTags = [...new Set([...existing.relatedTags, ...relatedTags])].slice(0, 10);
    existing.trendDirection =
      performance.engagement > existing.avgEngagement * 1.3
        ? 'rising'
        : performance.engagement < existing.avgEngagement * 0.7
          ? 'falling'
          : 'stable';
    saveStore(store);
    return existing;
  }

  const node: HashtagNode = {
    tag,
    niche,
    usageCount: 1,
    avgEngagement: performance.engagement,
    postsPerHour: 0.1,
    reachScore: Math.min(1, performance.reach / 10000),
    saturationLevel: 'low',
    relatedTags: relatedTags.slice(0, 10),
    peakHours: [],
    trendDirection: 'stable',
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };

  store.tags.push(node);
  if (store.tags.length > 1000) store.tags = store.tags.slice(-1000);

  saveStore(store);

  semantic.storeMemory(
    `Hashtag #${tag}: engagement=${performance.engagement.toFixed(0)}, reach=${performance.reach}`,
    'learning',
    { tag, niche, relatedTags },
    Math.min(1, performance.engagement / 5000),
  );

  log.info(`[HashtagEcosystem] Tracked #${tag} for ${niche}`);
  return node;
};

// ─- Get hashtag strategy ───────────────────────────────────────────────────

export const getHashtagStrategy = (
  niche: string,
): {
  tags: { tag: string; size: string; score: number; why: string }[];
  mix: string;
  avoid: string[];
} => {
  const store = loadStore();
  const nicheTags = store.tags.filter((t) => t.niche === niche);

  if (nicheTags.length === 0) {
    return {
      tags: [{ tag: niche, size: 'medium', score: 0.5, why: 'Niche principal' }],
      mix: '80% nicho + 20% trending',
      avoid: [],
    };
  }

  const sorted = [...nicheTags].sort((a, b) => b.avgEngagement - a.avgEngagement);

  const tags = sorted.slice(0, 15).map((t) => ({
    tag: t.tag,
    size: t.postsPerHour > 50 ? 'large' : t.postsPerHour > 10 ? 'medium' : 'small',
    score: Math.round(t.reachScore * 100),
    why: t.trendDirection === 'rising' ? 'En alza 🔥' : t.saturationLevel === 'low' ? 'Poco saturado' : 'Consistente',
  }));

  const avoid = sorted
    .filter((t) => t.saturationLevel === 'oversaturated' || t.trendDirection === 'falling')
    .slice(0, 5)
    .map((t) => t.tag);

  return {
    tags,
    mix: '40% nicho medio + 40% específico + 20% discovery',
    avoid,
  };
};

// ─- Find emerging hashtags ─────────────────────────────────────────────────

export const findEmergingHashtags = (niche: string): string[] => {
  const store = loadStore();
  return store.tags
    .filter((t) => t.niche === niche && t.trendDirection === 'rising' && t.usageCount < 10)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 5)
    .map((t) => t.tag);
};

// ─- Build tag cluster ──────────────────────────────────────────────────────

export const buildCluster = (niche: string): string[] => {
  const store = loadStore();
  const nicheTags = store.tags.filter((t) => t.niche === niche);
  const cluster = new Set<string>();

  for (const tag of nicheTags.slice(0, 10)) {
    cluster.add(tag.tag);
    for (const related of tag.relatedTags.slice(0, 3)) cluster.add(related);
  }

  const result = Array.from(cluster).slice(0, 15);
  store.clusters[niche] = result;
  saveStore(store);
  return result;
};

export const getStats = (): { tags: number; clusters: number } => {
  const store = loadStore();
  return { tags: store.tags.length, clusters: Object.keys(store.clusters).length };
};
