/**
 * RAG Engine — Retrieval-Augmented Generation
 * Recupera documentos relevantes y genera respuestas contextualizadas.
 */

import { log } from '../../agent/logger.js';
import { querySimilar } from './vectorStore.js';

export interface RAGQuery {
  question: string;
  context?: string;
  topK?: number;
  filter?: Record<string, unknown>;
}

export interface RAGResult {
  answer: string;
  sources: Array<{ id: string; text: string; relevance: number }>;
  confidence: number;
  retrievedCount: number;
}

export const queryRAG = async (opts: RAGQuery): Promise<RAGResult> => {
  log.info(`[RAG] Query: ${opts.question.slice(0, 60)}...`);

  const results = await querySimilar(opts.question, {
    topK: opts.topK ?? 5,
    filter: opts.filter,
  });

  if (results.length === 0) {
    return {
      answer: 'No tengo información suficiente en mi knowledge base para responder esa pregunta.',
      sources: [],
      confidence: 0,
      retrievedCount: 0,
    };
  }

  // Simple answer generation (in real implementation, call LLM here)
  const sourceTexts = results.map((r) => r.text.toLowerCase());
  const questionWords = opts.question.toLowerCase().split(/\s+/);

  // Find most relevant sentence
  let bestSentence = '';
  let bestScore = 0;
  for (const text of sourceTexts) {
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      const score = questionWords.filter((w) => sentence.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence.trim();
      }
    }
  }

  const answer = bestSentence
    ? `Según mi knowledge base: ${bestSentence.charAt(0).toUpperCase() + bestSentence.slice(1)}.`
    : 'Encontré información relacionada pero no una respuesta directa.';

  const avgRelevance = results.reduce((s, r) => s + (1 - r.distance), 0) / results.length;

  return {
    answer,
    sources: results.map((r) => ({ id: r.id, text: r.text.slice(0, 200), relevance: 1 - r.distance })),
    confidence: Math.round(avgRelevance * 100) / 100,
    retrievedCount: results.length,
  };
};

export const ingestKnowledge = async (opts: {
  text: string;
  source: string;
  chunkSize?: number;
  metadata?: Record<string, unknown>;
}): Promise<number> => {
  const { addDocuments } = await import('./vectorStore.js');
  const chunkSize = opts.chunkSize ?? 500;
  const chunks: string[] = [];

  // Simple chunking by sentences
  const sentences = opts.text.split(/[.!?]+/);
  let currentChunk = '';
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  const docs = chunks.map((chunk) => ({
    text: chunk,
    metadata: { source: opts.source, ...(opts.metadata ?? {}) },
  }));

  await addDocuments(docs);
  log.info(`[RAG] Ingested ${docs.length} chunks from ${opts.source}`);
  return docs.length;
};

export const ingestFAQ = async (
  faqs: Array<{ question: string; answer: string; category?: string }>,
): Promise<number> => {
  const { addDocuments } = await import('./vectorStore.js');
  const docs = faqs.map((faq) => ({
    text: `Q: ${faq.question}\nA: ${faq.answer}`,
    metadata: { type: 'faq', category: faq.category ?? 'general' },
  }));
  await addDocuments(docs);
  return docs.length;
};
