/**
 * Base de datos local de performance para FeedIA.
 * Persiste métricas históricas de posts para aprendizaje continuo y detección de patrones.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import type { ContentFormat } from '../../config/types.js';

const DB_PATH = join(process.cwd(), 'data', 'analytics', 'performance.json');

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  profileVisits: number;
  websiteClicks: number;
  watchTimePercent: number; // reels: % visto en promedio
  replays: number; // reels: reproducciones adicionales
  engagementRate: number; // (likes+comments+saves+shares) / reach * 100
}

export interface PostRecord {
  id: string;
  publishedAt: string; // ISO
  format: ContentFormat;
  caption: string;
  hashtags: string[];
  hookText: string; // primera línea del caption
  topics: string[];
  contentScore: number; // score predicho antes de publicar (0-100)
  metrics: PostMetrics;
  actualScore: number; // score calculado con métricas reales
  isTopPerformer: boolean; // top 20% de su formato
  lessons: string[]; // aprendizajes extraídos
}

export interface FormatBenchmark {
  avgEngagementRate: number;
  avgReach: number;
  avgSaves: number;
  avgComments: number;
  sampleSize: number;
}

interface PerformanceDB {
  version: number;
  lastUpdated: string;
  posts: PostRecord[];
  benchmarks: Record<ContentFormat, FormatBenchmark>;
}

const EMPTY_BENCHMARK: FormatBenchmark = {
  avgEngagementRate: 0,
  avgReach: 0,
  avgSaves: 0,
  avgComments: 0,
  sampleSize: 0,
};

const ALL_FORMATS: ContentFormat[] = ['reel', 'carrusel', 'post-imagen', 'historia', 'reel-faceless', 'live'];

const DEFAULT_DB: PerformanceDB = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  posts: [],
  benchmarks: Object.fromEntries(ALL_FORMATS.map((f) => [f, { ...EMPTY_BENCHMARK }])) as Record<
    ContentFormat,
    FormatBenchmark
  >,
};

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'analytics');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadDB = (): PerformanceDB => {
  try {
    ensureDir();
    if (!existsSync(DB_PATH)) return structuredClone(DEFAULT_DB);
    return JSON.parse(readFileSync(DB_PATH, 'utf8')) as PerformanceDB;
  } catch {
    log.warn('[PerformanceDB] No se pudo cargar la DB, usando vacía');
    return structuredClone(DEFAULT_DB);
  }
};

const saveDB = (db: PerformanceDB): void => {
  ensureDir();
  db.lastUpdated = new Date().toISOString();
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
};

const calculateActualScore = (metrics: PostMetrics): number => {
  // Pesos: saves 35% + eng rate 30% + reach 20% + comentarios 15%
  const saveScore = Math.min(metrics.saves / 150, 1) * 35;
  const engScore = Math.min(metrics.engagementRate / 10, 1) * 30;
  const reachScore = Math.min(metrics.reach / 15000, 1) * 20;
  const commScore = Math.min(metrics.comments / 60, 1) * 15;
  return Math.round(saveScore + engScore + reachScore + commScore);
};

const rollingAvg = (current: number, n: number, newVal: number): number => (current * n + newVal) / (n + 1);

export const recordPost = (record: Omit<PostRecord, 'actualScore' | 'isTopPerformer' | 'lessons'>): PostRecord => {
  const db = loadDB();
  const actualScore = calculateActualScore(record.metrics);

  const formatPosts = db.posts.filter((p) => p.format === record.format);
  const top20Threshold =
    formatPosts.length >= 5
      ? ([...formatPosts].sort((a, b) => b.actualScore - a.actualScore)[Math.floor(formatPosts.length * 0.2)]
          ?.actualScore ?? 0)
      : 0;
  const isTopPerformer = actualScore >= top20Threshold && formatPosts.length >= 5;

  const full: PostRecord = { ...record, actualScore, isTopPerformer, lessons: [] };

  // Actualizar benchmark del formato
  const bm = db.benchmarks[record.format] ?? { ...EMPTY_BENCHMARK };
  const n = bm.sampleSize;
  bm.avgEngagementRate = rollingAvg(bm.avgEngagementRate, n, record.metrics.engagementRate);
  bm.avgReach = rollingAvg(bm.avgReach, n, record.metrics.reach);
  bm.avgSaves = rollingAvg(bm.avgSaves, n, record.metrics.saves);
  bm.avgComments = rollingAvg(bm.avgComments, n, record.metrics.comments);
  bm.sampleSize = n + 1;
  db.benchmarks[record.format] = bm;

  db.posts.push(full);
  if (db.posts.length > 600) db.posts = db.posts.slice(-600);

  saveDB(db);
  log.info(
    `[PerformanceDB] Post registrado: score=${actualScore} topPerformer=${isTopPerformer} formato=${record.format}`,
  );
  return full;
};

export const updatePostLessons = (postId: string, lessons: string[]): void => {
  const db = loadDB();
  const post = db.posts.find((p) => p.id === postId);
  if (post) {
    post.lessons = lessons;
    saveDB(db);
  }
};

export const getTopPerformers = (format?: ContentFormat, limit = 10): PostRecord[] => {
  const db = loadDB();
  return db.posts
    .filter((p) => p.metrics.reach > 0 && (!format || p.format === format))
    .sort((a, b) => b.actualScore - a.actualScore)
    .slice(0, limit);
};

export const getRecentPosts = (days = 30, format?: ContentFormat): PostRecord[] => {
  const db = loadDB();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return db.posts
    .filter((p) => p.publishedAt >= cutoff && (!format || p.format === format))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
};

export const getBenchmarks = (): Record<ContentFormat, FormatBenchmark> => loadDB().benchmarks;

export const extractPatterns = (): {
  topTopics: Array<{ topic: string; avgScore: number; count: number }>;
  topHooks: string[];
  bestFormats: Array<{ format: ContentFormat; avgEngagement: number }>;
  bestHashtags: Array<{ hashtag: string; avgReach: number; count: number }>;
} => {
  const db = loadDB();
  const posts = db.posts.filter((p) => p.metrics.reach > 0);

  // Temas
  const topicMap = new Map<string, { total: number; count: number }>();
  posts.forEach((p) => {
    p.topics.forEach((t) => {
      const cur = topicMap.get(t) ?? { total: 0, count: 0 };
      topicMap.set(t, { total: cur.total + p.actualScore, count: cur.count + 1 });
    });
  });
  const topTopics = [...topicMap.entries()]
    .map(([topic, d]) => ({ topic, avgScore: d.total / d.count, count: d.count }))
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  // Hooks ganadores
  const topHooks = posts
    .filter((p) => p.isTopPerformer)
    .sort((a, b) => b.actualScore - a.actualScore)
    .slice(0, 8)
    .map((p) => p.hookText);

  // Mejores formatos
  const fmtMap = new Map<ContentFormat, { total: number; count: number }>();
  posts.forEach((p) => {
    const cur = fmtMap.get(p.format) ?? { total: 0, count: 0 };
    fmtMap.set(p.format, { total: cur.total + p.metrics.engagementRate, count: cur.count + 1 });
  });
  const bestFormats = [...fmtMap.entries()]
    .map(([format, d]) => ({ format, avgEngagement: d.total / d.count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Hashtags con mejor alcance
  const htMap = new Map<string, { total: number; count: number }>();
  posts.forEach((p) => {
    p.hashtags.forEach((h) => {
      const cur = htMap.get(h) ?? { total: 0, count: 0 };
      htMap.set(h, { total: cur.total + p.metrics.reach, count: cur.count + 1 });
    });
  });
  const bestHashtags = [...htMap.entries()]
    .map(([hashtag, d]) => ({ hashtag, avgReach: d.total / d.count, count: d.count }))
    .filter((h) => h.count >= 2)
    .sort((a, b) => b.avgReach - a.avgReach)
    .slice(0, 25);

  return { topTopics, topHooks, bestFormats, bestHashtags };
};

export const getAccountSummary = (): {
  totalPosts: number;
  avgEngagementRate: number;
  bestFormat: ContentFormat | null;
  totalReach: number;
  topPerformerCount: number;
  trend: 'mejorando' | 'estable' | 'bajando';
} => {
  const db = loadDB();
  const posts = db.posts.filter((p) => p.metrics.reach > 0);

  if (posts.length === 0) {
    return {
      totalPosts: 0,
      avgEngagementRate: 0,
      bestFormat: null,
      totalReach: 0,
      topPerformerCount: 0,
      trend: 'estable',
    };
  }

  const avgEngagementRate = posts.reduce((s, p) => s + p.metrics.engagementRate, 0) / posts.length;
  const totalReach = posts.reduce((s, p) => s + p.metrics.reach, 0);
  const topPerformerCount = posts.filter((p) => p.isTopPerformer).length;

  const fmtWins = new Map<ContentFormat, number>();
  posts
    .filter((p) => p.isTopPerformer)
    .forEach((p) => {
      fmtWins.set(p.format, (fmtWins.get(p.format) ?? 0) + 1);
    });
  const bestFormat = [...fmtWins.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const sorted = [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const recent = sorted.slice(0, 10);
  const previous = sorted.slice(10, 20);
  let trend: 'mejorando' | 'estable' | 'bajando' = 'estable';
  if (recent.length >= 5 && previous.length >= 5) {
    const rAvg = recent.reduce((s, p) => s + p.actualScore, 0) / recent.length;
    const pAvg = previous.reduce((s, p) => s + p.actualScore, 0) / previous.length;
    if (rAvg > pAvg * 1.1) trend = 'mejorando';
    else if (rAvg < pAvg * 0.9) trend = 'bajando';
  }

  return { totalPosts: posts.length, avgEngagementRate, bestFormat, totalReach, topPerformerCount, trend };
};
