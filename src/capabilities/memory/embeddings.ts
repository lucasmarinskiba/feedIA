/**
 * Embeddings — Generación de embeddings de texto e imagen
 * Fallback a mock embeddings. Integración real con sentence-transformers vía ONNX.
 */

import { log } from '../../agent/logger.js';

export interface EmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
}

// Mock embedding usando hashing consistente (no random)
export const generateTextEmbedding = async (text: string): Promise<EmbeddingResult> => {
  const dim = 384; // all-MiniLM-L6-v2 dimensions
  const vec = new Array(dim).fill(0);

  // Simple hash-based embedding (determinístico)
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    for (let d = 0; d < dim; d++) {
      vec[d]! += Math.sin(char + d * 0.1) * 0.01;
    }
  }

  // Normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  const normalized = norm > 0 ? vec.map((v) => v / norm) : vec;

  return {
    vector: normalized,
    model: 'mock-all-MiniLM-L6-v2',
    dimensions: dim,
  };
};

export const generateImageEmbedding = async (_imageUrl: string): Promise<EmbeddingResult> => {
  // TODO: Integrar CLIP para embeddings de imagen
  log.info('[Embeddings] Image embedding not yet implemented, returning mock');
  return {
    vector: new Array(512).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.01),
    model: 'mock-clip-vit-base-patch32',
    dimensions: 512,
  };
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) throw new Error('Dimension mismatch');
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
};

export const euclideanDistance = (a: number[], b: number[]): number => {
  if (a.length !== b.length) throw new Error('Dimension mismatch');
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i]! - b[i]!;
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};
