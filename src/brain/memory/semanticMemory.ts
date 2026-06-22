// @ts-nocheck
/**
 * Semantic Memory — Vector store local para el cerebro FeedIA
 * Almacena conversaciones, posts, decisiones, aprendizajes con embeddings
 * Permite retrieval semántico: "qué dije sobre X", "qué funcionó para Y"
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';

const MEM_PATH = resolve('data/runtime/brain/semantic-memory.json');
const EMBEDDING_DIM = 384;

export interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  timestamp: string;
  source: 'conversation' | 'post' | 'decision' | 'learning' | 'trend' | 'profile';
  metadata: Record<string, unknown>;
  importance: number; // 0-1
}

interface MemoryStore {
  entries: MemoryEntry[];
  lastCompaction: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): MemoryStore => {
  try {
    ensureDir();
    if (!existsSync(MEM_PATH)) return { entries: [], lastCompaction: new Date().toISOString() };
    return JSON.parse(readFileSync(MEM_PATH, 'utf-8')) as MemoryStore;
  } catch {
    return { entries: [], lastCompaction: new Date().toISOString() };
  }
};

const saveStore = (store: MemoryStore): void => {
  ensureDir();
  writeFileSync(MEM_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Embedding generation ──────────────────────────────────────────────────

const generateEmbedding = async (text: string): Promise<number[]> => {
  // Try HuggingFace API first
  try {
    const { hfEmbeddings } = await import('../../integrations/providers/huggingface.js');
    const result = await hfEmbeddings(text.slice(0, 500));
    if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
      return result.data as number[];
    }
  } catch {
    // Fallback to keyword hashing
  }
  return keywordHashEmbedding(text);
};

const keywordHashEmbedding = (text: string): number[] => {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-záéíóúñü0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (const word of normalized) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % EMBEDDING_DIM;
    vec[idx] += 1 + word.length * 0.1;
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / mag);
};

const cosineSimilarity = (a: number[] | undefined, b: number[] | undefined): number => {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
};

// ── Public API ────────────────────────────────────────────────────────────

export const storeMemory = async (
  content: string,
  source: MemoryEntry['source'],
  metadata?: Record<string, unknown>,
  importance = 0.5,
): Promise<MemoryEntry> => {
  const embedding = await generateEmbedding(content);
  const entry: MemoryEntry = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    content: content.slice(0, 2000),
    embedding,
    timestamp: new Date().toISOString(),
    source,
    metadata: metadata ?? {},
    importance: Math.max(0, Math.min(1, importance)),
  };
  const store = loadStore();
  store.entries.push(entry);
  // Keep max 2000 entries, prune lowest importance
  if (store.entries.length > 2000) {
    store.entries.sort((a, b) => b.importance - a.importance);
    store.entries = store.entries.slice(0, 2000);
  }
  saveStore(store);
  log.info(`[SemanticMemory] Stored ${source}: ${content.slice(0, 60)}...`);
  return entry;
};

export const recall = async (
  query: string,
  topK = 5,
  sourceFilter?: MemoryEntry['source'][],
): Promise<{ entry: MemoryEntry; score: number }[]> => {
  const queryEmbedding = await generateEmbedding(query);
  const store = loadStore();
  let entries = store.entries;
  if (sourceFilter && sourceFilter.length > 0) {
    entries = entries.filter((e) => sourceFilter.includes(e.source));
  }
  const scored = entries.map((entry) => ({
    entry,
    score: cosineSimilarity(queryEmbedding, entry.embedding) * (0.5 + (entry.importance ?? 0.5) * 0.5),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter((s) => s.score > 0.15);
};

export const recallRecent = (hours = 24, sourceFilter?: MemoryEntry['source'][]): MemoryEntry[] => {
  const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
  const store = loadStore();
  let entries = store.entries.filter((e) => e.timestamp >= cutoff);
  if (sourceFilter) entries = entries.filter((e) => sourceFilter.includes(e.source));
  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const recallByEntity = (entity: string, topK = 5): { entry: MemoryEntry; score: number }[] => {
  const store = loadStore();
  const scored = store.entries
    .filter((e) => e.content.toLowerCase().includes(entity.toLowerCase()))
    .map((entry) => {
      const meta = entry.metadata as Record<string, unknown>;
      const hasEntity = Array.isArray(meta.mentionedEntities) && (meta.mentionedEntities as string[]).includes(entity);
      return {
        entry,
        score: entry.importance + (hasEntity ? 0.3 : 0),
      };
    });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
};

export const updateImportance = (id: string, delta: number): void => {
  const store = loadStore();
  const entry = store.entries.find((e) => e.id === id);
  if (entry) {
    entry.importance = Math.max(0, Math.min(1, entry.importance + delta));
    saveStore(store);
  }
};

export const getStats = (): { total: number; bySource: Record<string, number>; avgImportance: number } => {
  const store = loadStore();
  const bySource: Record<string, number> = {};
  for (const e of store.entries) bySource[e.source] = (bySource[e.source] ?? 0) + 1;
  const avgImportance =
    store.entries.length > 0 ? store.entries.reduce((s, e) => s + e.importance, 0) / store.entries.length : 0;
  return { total: store.entries.length, bySource, avgImportance };
};
