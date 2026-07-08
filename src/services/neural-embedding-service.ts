/**
 * Neural Embedding Service
 * Text + image embeddings for semantic search
 * Similarity matching, cluster detection, pattern recognition
 */

import { log } from '../agent/logger.js';
import {
  generateRealTextEmbedding,
  generateRealImageEmbeddingViaCaption,
  isGeminiConfigured,
} from './gemini-vision-client.js';

interface TextEmbedding {
  id: string;
  text: string;
  vector: number[];
  model: string;
  createdAt: string;
}

interface ImageEmbedding {
  id: string;
  imageUrl: string;
  vector: number[];
  model: string;
  features: Record<string, any>;
  createdAt: string;
}

interface SimilarityResult {
  itemId: string;
  itemText?: string;
  similarity: number; // 0-1
  rank: number;
}

class NeuralEmbeddingService {
  private textEmbeddings: Map<string, TextEmbedding> = new Map();
  private imageEmbeddings: Map<string, ImageEmbedding> = new Map();

  /**
   * Generate text embedding — real Gemini gemini-embedding-001 (3072-dim,
   * verified live against the API) when GEMINI_API_KEY is configured,
   * falling back to a deterministic simulated vector (same 3072 dimension,
   * so mixed real/simulated sets stay comparable via cosine similarity) if
   * the key is unset or the call fails.
   */
  async generateTextEmbedding(text: string, id?: string): Promise<TextEmbedding> {
    const embeddingId = id || `text-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const real = isGeminiConfigured() ? await generateRealTextEmbedding(text) : null;
    const vector = real ?? this.simulateTextVector(text);

    const embedding: TextEmbedding = {
      id: embeddingId,
      text,
      vector,
      model: real ? 'gemini-embedding-001' : 'simulated-fallback-3072d',
      createdAt: new Date().toISOString(),
    };

    this.textEmbeddings.set(embeddingId, embedding);

    log.info('[NeuralEmbedding] Text embedding generated', {
      id: embeddingId,
      textLength: text.length,
      real: Boolean(real),
    });

    return embedding;
  }

  /**
   * Generate image embedding via caption-then-embed (Gemini vision describes
   * the image, then the real gemini-embedding-001 model embeds that
   * description — see gemini-vision-client.ts). Since this reuses the same
   * text-embedding model, real image embeddings live in the SAME 3072-dim
   * space as text embeddings, making findImagesForText() a genuine
   * cross-modal comparison instead of comparing two unrelated random vectors.
   * Falls back to a simulated 3072-dim vector if the real call fails/unset.
   */
  async generateImageEmbedding(
    imageUrl: string,
    features?: Record<string, any>,
    id?: string
  ): Promise<ImageEmbedding> {
    const embeddingId = id || `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const real = isGeminiConfigured() ? await generateRealImageEmbeddingViaCaption(imageUrl) : null;
    const vector = real?.embedding ?? this.simulateImageVector(imageUrl);

    const embedding: ImageEmbedding = {
      id: embeddingId,
      imageUrl,
      vector,
      model: real ? 'gemini-caption-then-embed-001' : 'simulated-fallback-3072d',
      features: features || (real ? { caption: real.caption } : this.extractImageFeatures(imageUrl)),
      createdAt: new Date().toISOString(),
    };

    this.imageEmbeddings.set(embeddingId, embedding);

    log.info('[NeuralEmbedding] Image embedding generated', {
      id: embeddingId,
      url: imageUrl,
      real: Boolean(real),
    });

    return embedding;
  }

  /**
   * Find similar texts (semantic search). Uses a real query embedding when
   * GEMINI_API_KEY is configured so search quality matches whatever
   * generated the stored embeddings.
   */
  async findSimilarTexts(queryText: string, topK: number = 10): Promise<SimilarityResult[]> {
    const real = isGeminiConfigured() ? await generateRealTextEmbedding(queryText) : null;
    const queryVector = real ?? this.simulateTextVector(queryText);

    const similarities: SimilarityResult[] = [];

    for (const [id, embedding] of this.textEmbeddings.entries()) {
      const similarity = this.cosineSimilarity(queryVector, embedding.vector);

      similarities.push({
        itemId: id,
        itemText: embedding.text.slice(0, 100),
        similarity,
        rank: 0,
      });
    }

    // Sort by similarity, assign ranks
    similarities.sort((a, b) => b.similarity - a.similarity);
    similarities.forEach((item, index) => (item.rank = index + 1));

    return similarities.slice(0, topK);
  }

  /**
   * Find similar images (visual search). Uses a real caption-then-embed
   * query vector when GEMINI_API_KEY is configured.
   */
  async findSimilarImages(queryImageUrl: string, topK: number = 10): Promise<SimilarityResult[]> {
    const real = isGeminiConfigured() ? await generateRealImageEmbeddingViaCaption(queryImageUrl) : null;
    const queryVector = real?.embedding ?? this.simulateImageVector(queryImageUrl);

    const similarities: SimilarityResult[] = [];

    for (const [id, embedding] of this.imageEmbeddings.entries()) {
      const similarity = this.cosineSimilarity(queryVector, embedding.vector);

      similarities.push({
        itemId: id,
        similarity,
        rank: 0,
      });
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    similarities.forEach((item, index) => (item.rank = index + 1));

    return similarities.slice(0, topK);
  }

  /**
   * Cluster similar prompts (detect patterns)
   */
  clusterTextEmbeddings(threshold: number = 0.7): Map<string, string[]> {
    const clusters: Map<string, string[]> = new Map();
    const visited = new Set<string>();

    for (const [id, embedding] of this.textEmbeddings.entries()) {
      if (visited.has(id)) continue;

      const cluster: string[] = [id];
      visited.add(id);

      for (const [otherId, otherEmbedding] of this.textEmbeddings.entries()) {
        if (visited.has(otherId)) continue;

        const similarity = this.cosineSimilarity(embedding.vector, otherEmbedding.vector);
        if (similarity >= threshold) {
          cluster.push(otherId);
          visited.add(otherId);
        }
      }

      clusters.set(`cluster-${clusters.size}`, cluster);
    }

    log.info('[NeuralEmbedding] Clustering complete', { clusterCount: clusters.size });

    return clusters;
  }

  /**
   * Cross-modal search (text to image). With real embeddings configured,
   * both text and image embeddings live in the same Gemini text-embedding
   * space (images are embedded via caption-then-embed), so this is now a
   * genuine cross-modal comparison rather than two unrelated random vectors.
   */
  async findImagesForText(queryText: string, topK: number = 10): Promise<SimilarityResult[]> {
    const real = isGeminiConfigured() ? await generateRealTextEmbedding(queryText) : null;
    const queryVector = real ?? this.simulateTextVector(queryText);

    const similarities: SimilarityResult[] = [];

    for (const [id, embedding] of this.imageEmbeddings.entries()) {
      const similarity = this.cosineSimilarity(queryVector, embedding.vector);

      similarities.push({
        itemId: id,
        similarity,
        rank: 0,
      });
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    similarities.forEach((item, index) => (item.rank = index + 1));

    return similarities.slice(0, topK);
  }

  /**
   * Helper: Simulate text embedding vector
   * Production: replace with actual embedding service
   */
  private simulateTextVector(text: string): number[] {
    // Fallback only — used when GEMINI_API_KEY is unset or the real call
    // fails. 3072-dim to match gemini-embedding-001 (verified live) so mixed
    // real/fallback sets stay comparable via cosine similarity.
    const hash = this.hashString(text);
    const vector: number[] = [];

    for (let i = 0; i < 3072; i++) {
      vector.push(Math.sin(hash + i) * 0.5 + 0.5); // Normalize to [0, 1]
    }

    return vector;
  }

  /**
   * Helper: Simulate image embedding vector (fallback only — see note above)
   */
  private simulateImageVector(imageUrl: string): number[] {
    const hash = this.hashString(imageUrl);
    const vector: number[] = [];

    for (let i = 0; i < 3072; i++) {
      vector.push(Math.cos(hash + i) * 0.5 + 0.5);
    }

    return vector;
  }

  /**
   * Helper: Extract image features (placeholder)
   * Production: use vision model for actual feature extraction
   */
  private extractImageFeatures(imageUrl: string): Record<string, any> {
    return {
      hasText: imageUrl.includes('text'),
      hasFace: imageUrl.includes('face'),
      hasProduct: imageUrl.includes('product'),
      dominant_colors: ['blue', 'white', 'gray'],
      estimated_quality: 0.85,
    };
  }

  /**
   * Helper: Cosine similarity between vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      const a = vec1[i] ?? 0;
      const b = vec2[i] ?? 0;
      dotProduct += a * b;
      norm1 += a * a;
      norm2 += b * b;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);

    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Helper: Simple hash for string (for reproducible vectors)
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get embedding by ID
   */
  getTextEmbedding(id: string): TextEmbedding | undefined {
    return this.textEmbeddings.get(id);
  }

  /**
   * Get image embedding by ID
   */
  getImageEmbedding(id: string): ImageEmbedding | undefined {
    return this.imageEmbeddings.get(id);
  }

  /**
   * Stats
   */
  getStats(): Record<string, any> {
    return {
      textEmbeddings: this.textEmbeddings.size,
      imageEmbeddings: this.imageEmbeddings.size,
      totalEmbeddings: this.textEmbeddings.size + this.imageEmbeddings.size,
    };
  }
}

export const neuralEmbeddingService = new NeuralEmbeddingService();
