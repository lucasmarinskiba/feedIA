/**
 * Knowledge RAG — recuperación de contexto de producto/servicio para respuestas del bot.
 *
 * Lee documentos desde `data/knowledge/` (markdown/txt/json) y permite
 * búsqueda por keywords + similitud simple.
 */

import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { log } from '../../agent/logger.js';

const KNOWLEDGE_DIR = join(process.cwd(), 'data', 'knowledge');

export const KnowledgeChunkSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  content: z.string(),
  keywords: z.array(z.string()).default([]),
  category: z.enum(['faq', 'product', 'service', 'process', 'pricing', 'general']).default('general'),
});

export type KnowledgeChunk = z.infer<typeof KnowledgeChunkSchema>;

export interface KnowledgeQuery {
  query: string;
  category?: KnowledgeChunk['category'];
  limit?: number;
}

export interface KnowledgeResult {
  chunks: KnowledgeChunk[];
  query: string;
}

const ensureDir = (): void => {
  if (!existsSync(KNOWLEDGE_DIR)) mkdirSync(KNOWLEDGE_DIR, { recursive: true });
};

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

const jaccardSimilarity = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
};

const loadMarkdownFiles = (): KnowledgeChunk[] => {
  ensureDir();
  const files = readdirSync(KNOWLEDGE_DIR, { withFileTypes: true });
  const chunks: KnowledgeChunk[] = [];

  for (const file of files) {
    if (!file.isFile()) continue;
    const path = join(KNOWLEDGE_DIR, file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['md', 'txt', 'json'].includes(ext ?? '')) continue;

    try {
      const raw = readFileSync(path, 'utf8');
      if (ext === 'json') {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const chunk = KnowledgeChunkSchema.safeParse({ ...item, id: item.id ?? `${file.name}-${Date.now()}` });
          if (chunk.success) chunks.push(chunk.data);
        }
      } else {
        // Markdown/txt: dividir por secciones H2
        const sections = raw.split(/^##\s+/m).filter(Boolean);
        if (sections.length === 0) continue;

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i]!;
          const lines = section.split('\n').filter(Boolean);
          const title = lines[0]?.replace(/^#+\s*/, '').trim() ?? `Sección ${i + 1}`;
          const content = lines.slice(1).join('\n').trim();
          chunks.push({
            id: `${file.name}-${i}`,
            source: file.name,
            title,
            content,
            keywords: tokenize(`${title} ${content}`).slice(0, 20),
            category: inferCategory(title, content),
          });
        }
      }
    } catch (err) {
      log.warn(`[KnowledgeRAG] Error leyendo ${path}: ${(err as Error).message}`);
    }
  }

  return chunks;
};

const inferCategory = (title: string, content: string): KnowledgeChunk['category'] => {
  const text = `${title} ${content}`.toLowerCase();
  if (/precio|costo|plan|tarifa|membresía/.test(text)) return 'pricing';
  if (/cómo|paso|proceso|tutorial|guía/.test(text)) return 'process';
  if (/servicio|consultoría|implementación|soporte/.test(text)) return 'service';
  if (/producto|herramienta|software|app/.test(text)) return 'product';
  if (/pregunta|faq|duda|qué|cómo|cuándo|dónde/.test(text)) return 'faq';
  return 'general';
};

let cache: KnowledgeChunk[] | null = null;

export const loadKnowledgeBase = (): KnowledgeChunk[] => {
  if (!cache) cache = loadMarkdownFiles();
  return cache;
};

export const refreshKnowledgeBase = (): KnowledgeChunk[] => {
  cache = null;
  return loadKnowledgeBase();
};

export const addKnowledgeChunk = (chunk: Omit<KnowledgeChunk, 'id'>): KnowledgeChunk => {
  const full: KnowledgeChunk = {
    ...chunk,
    id: `chunk-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
  };
  cache = null; // invalidate
  return full;
};

export const searchKnowledge = (query: KnowledgeQuery): KnowledgeResult => {
  const chunks = loadKnowledgeBase();
  const queryTokens = new Set(tokenize(query.query));

  let scored = chunks.map((chunk) => {
    const chunkTokens = new Set([...chunk.keywords, ...tokenize(chunk.title), ...tokenize(chunk.content)]);
    const score = jaccardSimilarity(queryTokens, chunkTokens);
    return { chunk, score };
  });

  if (query.category) {
    scored = scored.filter((s) => s.chunk.category === query.category);
  }

  scored.sort((a, b) => b.score - a.score);

  const limit = query.limit ?? 3;
  return {
    chunks: scored.slice(0, limit).map((s) => s.chunk),
    query: query.query,
  };
};

export const buildKnowledgeContext = (query: string, limit = 3): string => {
  const result = searchKnowledge({ query, limit });
  if (result.chunks.length === 0) return '';
  return result.chunks.map((c, i) => `[${i + 1}] ${c.title}\n${c.content}`).join('\n\n');
};
