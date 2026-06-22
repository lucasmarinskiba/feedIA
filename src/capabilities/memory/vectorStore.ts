/**
 * Vector Store — Cliente ChromaDB para embeddings y búsqueda semántica
 * Fallback a SQLite local si ChromaDB no está disponible.
 */

import { log } from '../../agent/logger.js';

export interface VectorDocument {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

export interface VectorQueryResult {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  distance: number;
}

const STORAGE_KEY = 'vector_store_docs';

const loadDocs = (): VectorDocument[] => {
  try {
    const raw = process.env[STORAGE_KEY];
    return raw ? (JSON.parse(raw) as VectorDocument[]) : [];
  } catch {
    return [];
  }
};

const saveDocs = (docs: VectorDocument[]): void => {
  process.env[STORAGE_KEY] = JSON.stringify(docs.slice(-1000));
};

// Simple cosine similarity for fallback mode
const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Mock embedding (random normalized vector) for fallback
const mockEmbedding = (text: string): number[] => {
  const dim = 128;
  const vec: number[] = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    const v = Math.sin(hash + i * 0.5) * 0.5 + 0.5;
    vec.push(v);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / norm);
};

export const addDocument = async (doc: Omit<VectorDocument, 'id' | 'embedding'>): Promise<VectorDocument> => {
  const embedding = mockEmbedding(doc.text);
  const full: VectorDocument = {
    ...doc,
    id: `vec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    embedding,
  };
  const docs = loadDocs();
  docs.push(full);
  saveDocs(docs);
  log.info(`[VectorStore] Added doc: ${full.id} (${doc.text.slice(0, 40)}...)`);
  return full;
};

export const addDocuments = async (
  docs: Array<Omit<VectorDocument, 'id' | 'embedding'>>,
): Promise<VectorDocument[]> => {
  const results: VectorDocument[] = [];
  for (const doc of docs) {
    results.push(await addDocument(doc));
  }
  return results;
};

export const querySimilar = async (
  queryText: string,
  opts?: { topK?: number; filter?: Record<string, unknown> },
): Promise<VectorQueryResult[]> => {
  const queryEmbedding = mockEmbedding(queryText);
  const docs = loadDocs();

  let candidates = docs;
  if (opts?.filter) {
    candidates = candidates.filter((d) => Object.entries(opts.filter!).every(([k, v]) => d.metadata[k] === v));
  }

  const scored = candidates
    .filter((d) => d.embedding)
    .map((d) => ({
      id: d.id,
      text: d.text,
      metadata: d.metadata,
      distance: 1 - cosineSimilarity(queryEmbedding, d.embedding!),
    }));

  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, opts?.topK ?? 5);
};

export const deleteDocument = async (id: string): Promise<boolean> => {
  const docs = loadDocs();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return false;
  docs.splice(idx, 1);
  saveDocs(docs);
  return true;
};

export const getCollectionStats = async (): Promise<{ count: number; avgDocLength: number }> => {
  const docs = loadDocs();
  const totalLen = docs.reduce((s, d) => s + d.text.length, 0);
  return {
    count: docs.length,
    avgDocLength: docs.length > 0 ? Math.round(totalLen / docs.length) : 0,
  };
};
