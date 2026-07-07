/**
 * Neural Embedding Service
 * Text + image embeddings for semantic search
 * Similarity matching, cluster detection, pattern recognition
 */

import { log } from '../agent/logger.js';

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
   * Generate text embedding (simulated CLIP/sentence-transformer)
   * In production: call OpenAI embeddings or local CLIP model
   */
  async generateTextEmbedding(text: string, id?: string): Promise<TextEmbedding> {
    const embeddingId = id || `text-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Simulate embedding vector (in production: call real embedding service)
    // This is a placeholder using simple text hashing
    const vector = this.simulateTextVector(text);

    const embedding: TextEmbedding = {
      id: embeddingId,
      text,
      vector,
      model: 'sentence-transformers-placeholder',
      createdAt: new Date().toISOString(),
    };

    this.textEmbeddings.set(embeddingId, embedding);

    log.info('[NeuralEmbedding] Text embedding generated', { id: embeddingId, textLength: text.length });

    return embedding;
  }

  /**
   * Generate image embedding (simulated CLIP)
   * In production: call CLIP model or similar vision model
   */
  async generateImageEmbedding(
    imageUrl: string,
    features?: Record<string, any>,
    id?: string
  ): Promise<ImageEmbedding> {
    const embeddingId = id || `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Simulate embedding vector
    const vector = this.simulateImageVector(imageUrl);

    const embedding: ImageEmbedding = {
      id: embeddingId,
      imageUrl,
      vector,
      model: 'clip-placeholder',
      features: features || this.extractImageFeatures(imageUrl),
      createdAt: new Date().toISOString(),
    };

    this.imageEmbeddings.set(embeddingId, embedding);

    log.info('[NeuralEmbedding] Image embedding generated', { id: embeddingId, url: imageUrl });

    return embedding;
  }

  /**
   * Find similar texts (semantic search)
   */
  findSimilarTexts(queryText: string, topK: number = 10): SimilarityResult[] {
    const queryVector = this.simulateTextVector(queryText);

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
   * Find similar images (visual search)
   */
  findSimilarImages(queryImageUrl: string, topK: number = 10): SimilarityResult[] {
    const queryVector = this.simulateImageVector(queryImageUrl);

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
   * Cross-modal search (text to image)
   */
  findImagesForText(queryText: string, topK: number = 10): SimilarityResult[] {
    const queryVector = this.simulateTextVector(queryText);

    const similarities: SimilarityResult[] = [];

    for (const [id, embedding] of this.imageEmbeddings.entries()) {
      // Cross-modal similarity (text embedding vs image embedding)
      // In production: use shared embedding space (e.g., CLIP)
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
    // Create deterministic vector from text (for reproducibility)
    const hash = this.hashString(text);
    const vector: number[] = [];

    for (let i = 0; i < 384; i++) {
      // 384-dim (sentence-transformers size)
      vector.push(Math.sin(hash + i) * 0.5 + 0.5); // Normalize to [0, 1]
    }

    return vector;
  }

  /**
   * Helper: Simulate image embedding vector
   */
  private simulateImageVector(imageUrl: string): number[] {
    const hash = this.hashString(imageUrl);
    const vector: number[] = [];

    for (let i = 0; i < 512; i++) {
      // 512-dim (CLIP size)
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
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
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
