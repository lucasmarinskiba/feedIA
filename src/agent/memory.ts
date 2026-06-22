import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { BrandProfile } from '../config/types.js';
import { getLatestAnalytics, listInbound, listPostsByAccount } from '../database/index.js';

interface PerformanceRecord {
  postId: string;
  format: string;
  publishedAt: string;
  metrics: { likes: number; comments: number; shares: number; saves: number; reach: number };
  hookFirstLine: string;
}

interface MemoryShape {
  brand: BrandProfile;
  history: PerformanceRecord[];
  lastTrendsSnapshot?: { capturedAt: string; angles: string[] };
  bestHours?: string[];
}

const MEMORY_PATH = resolve('data/runtime/memory.json');

const persist = (mem: MemoryShape): void => {
  mkdirSync(dirname(MEMORY_PATH), { recursive: true });
  writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2), 'utf-8');
};

export const initMemory = (brand: BrandProfile): MemoryShape => {
  if (existsSync(MEMORY_PATH)) {
    const existing = JSON.parse(readFileSync(MEMORY_PATH, 'utf-8')) as MemoryShape;
    existing.brand = brand;
    persist(existing);
    return existing;
  }
  const fresh: MemoryShape = { brand, history: [] };
  persist(fresh);
  return fresh;
};

export const recordPerformance = (record: PerformanceRecord): void => {
  if (!existsSync(MEMORY_PATH)) throw new Error('Memoria no inicializada');
  const mem = JSON.parse(readFileSync(MEMORY_PATH, 'utf-8')) as MemoryShape;
  mem.history.push(record);
  persist(mem);
};

export const topPerformers = (limit = 5): PerformanceRecord[] => {
  if (!existsSync(MEMORY_PATH)) return [];
  const mem = JSON.parse(readFileSync(MEMORY_PATH, 'utf-8')) as MemoryShape;
  return [...mem.history]
    .sort((a, b) => b.metrics.saves + b.metrics.shares - (a.metrics.saves + a.metrics.shares))
    .slice(0, limit);
};

export const brandContext = (brand: BrandProfile): string =>
  `MARCA: ${brand.name} (${brand.type})
NICHO: ${brand.niche}
AUDIENCIA: ${brand.audience.description}
DOLORES: ${brand.audience.pains.join(' · ')}
DESEOS: ${brand.audience.desires.join(' · ')}
TONO: ${brand.voice.tone.join(', ')}
PROHIBIDO DECIR: ${brand.voice.forbidden.join(', ') || 'nada en particular'}
OBJETIVO PRIMARIO: ${brand.goals.primary}
MÉTRICAS A VIGILAR: ${brand.goals.metricsToWatch.join(', ')}
${brand.voice.referenceQuotes.length ? `FRASES DE REFERENCIA:\n- ${brand.voice.referenceQuotes.join('\n- ')}` : ''}`;

/**
 * Construye un contexto enriquecido con datos reales de SQLite.
 * Se inyecta automáticamente en todos los agentes via createAgentBase.
 */
export const getAnalyticsContext = (brandId: string): string => {
  try {
    const lines: string[] = [];

    // Latest analytics snapshot
    const latest = getLatestAnalytics(brandId);
    if (latest) {
      lines.push('📊 ÚLTIMAS MÉTRICAS:');
      if (latest.followers !== undefined) lines.push(`  Followers: ${latest.followers}`);
      if (latest.reach !== undefined) lines.push(`  Reach: ${latest.reach}`);
      if (latest.impressions !== undefined) lines.push(`  Impressions: ${latest.impressions}`);
      if (latest.profileViews !== undefined) lines.push(`  Profile Views: ${latest.profileViews}`);
    }

    // Recent posts
    const posts = listPostsByAccount(brandId, 'published').slice(0, 5);
    if (posts.length > 0) {
      lines.push('\n📝 ÚLTIMOS POSTS PUBLICADOS:');
      for (const post of posts) {
        lines.push(
          `  [${post.format}] ${post.caption?.slice(0, 60) ?? '(sin caption)'}... (${post.publishedAt?.slice(0, 10) ?? '?'})`,
        );
      }
    }

    // Recent inbound messages
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const inbound = listInbound(brandId, undefined, since).slice(0, 5);
    if (inbound.length > 0) {
      lines.push('\n💬 MENSAJES ENTRANTES RECIENTES (7 días):');
      for (const msg of inbound) {
        lines.push(`  [${msg.type}] ${msg.sender}: ${msg.text?.slice(0, 50) ?? ''}...`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : '';
  } catch {
    return '';
  }
};
