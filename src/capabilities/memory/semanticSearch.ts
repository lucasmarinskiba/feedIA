/**
 * Semantic Search — Búsqueda semántica en contenido histórico
 * Usa embeddings para encontrar contenido similar por significado, no keywords.
 */

import { log } from '../../agent/logger.js';
import { generateTextEmbedding, cosineSimilarity } from './embeddings.js';

export interface SearchableContent {
  id: string;
  text: string;
  type: 'post' | 'comment' | 'dm' | 'brief' | 'caption' | 'hashtag';
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface SemanticSearchResult {
  content: SearchableContent;
  similarity: number;
  matchedConcepts: string[];
}

const STORAGE_KEY = 'semantic_search_index';

const loadIndex = (): Array<{ id: string; embedding: number[]; type: string }> => {
  try {
    const raw = process.env[STORAGE_KEY];
    return raw ? (JSON.parse(raw) as Array<{ id: string; embedding: number[]; type: string }>) : [];
  } catch {
    return [];
  }
};

const saveIndex = (index: Array<{ id: string; embedding: number[]; type: string }>): void => {
  process.env[STORAGE_KEY] = JSON.stringify(index.slice(-500));
};

export const indexContent = async (content: SearchableContent): Promise<void> => {
  const { vector } = await generateTextEmbedding(content.text);
  const index = loadIndex();

  // Remove old entry if exists
  const existingIdx = index.findIndex((i) => i.id === content.id);
  if (existingIdx >= 0) index.splice(existingIdx, 1);

  index.push({ id: content.id, embedding: vector, type: content.type });
  saveIndex(index);
  log.info(`[SemanticSearch] Indexed: ${content.id} (${content.type})`);
};

export const searchSimilar = async (
  query: string,
  opts?: { type?: string; limit?: number; minSimilarity?: number },
): Promise<SemanticSearchResult[]> => {
  const { vector: queryEmbedding } = await generateTextEmbedding(query);
  const index = loadIndex();

  let candidates = index;
  if (opts?.type) candidates = candidates.filter((i) => i.type === opts.type);

  const scored = candidates.map((i) => ({
    id: i.id,
    similarity: cosineSimilarity(queryEmbedding, i.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);

  const filtered = scored.filter((s) => s.similarity >= (opts?.minSimilarity ?? 0.5));
  const limited = filtered.slice(0, opts?.limit ?? 5);

  // Mock content retrieval (in real impl, fetch from DB)
  return limited.map((s) => ({
    content: {
      id: s.id,
      text: `[Content ${s.id}]`,
      type: (candidates.find((c) => c.id === s.id)?.type as SearchableContent['type']) ?? 'post',
      timestamp: new Date().toISOString(),
      metadata: {},
    },
    similarity: Math.round(s.similarity * 1000) / 1000,
    matchedConcepts: query.split(/\s+/).slice(0, 3),
  }));
};

export const findDuplicateContent = async (
  text: string,
  threshold = 0.85,
): Promise<Array<{ id: string; similarity: number }>> => {
  const results = await searchSimilar(text, { minSimilarity: threshold, limit: 3 });
  return results.map((r) => ({ id: r.content.id, similarity: r.similarity }));
};

export const getSearchStats = (): { indexedCount: number; types: Record<string, number> } => {
  const index = loadIndex();
  const types: Record<string, number> = {};
  for (const i of index) {
    types[i.type] = (types[i.type] ?? 0) + 1;
  }
  return { indexedCount: index.length, types };
};
