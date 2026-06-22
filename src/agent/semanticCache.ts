/**
 * Semantic Cache — no re-pagar prompts equivalentes
 * ─────────────────────────────────────────────────────────────────────────
 * El cache exacto del router sólo acierta si el prompt es idéntico. Este
 * cache semántico (similaridad léxica Jaccard sobre tokens normalizados,
 * sin embeddings ni dependencias) recupera la respuesta de un prompt
 * SUFICIENTEMENTE parecido del mismo tipo de tarea. Cada hit es una llamada
 * de LLM que no se paga.
 *
 * Conservador a propósito: sólo cachea tareas de baja temperatura (no
 * creativas) y exige similaridad alta. Persistido y con TTL.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

interface Entry {
  taskType: string;
  prompt: string;
  tokens: string[];
  text: string;
  model: string;
  at: string;
  hits: number;
}
interface Store {
  entries: Entry[];
  stats: { hits: number; misses: number };
}

const PATH = resolve('data/runtime/semanticCache.json');
const MAX_ENTRIES = 400;
const TTL_MS = 24 * 3_600_000;
const DEFAULT_MIN_SIM = 0.9;

const STOP = new Set([
  'de',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'y',
  'o',
  'a',
  'en',
  'con',
  'para',
  'por',
  'que',
  'del',
  'al',
  'su',
  'sus',
  'lo',
  'es',
  'the',
  'of',
  'to',
  'and',
  'esta',
  'este',
  'sobre',
  'más',
  'mas',
]);

const tokenize = (s: string): string[] =>
  Array.from(
    new Set(
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP.has(w)),
    ),
  );

const jaccard = (a: string[], b: Set<string>): number => {
  if (a.length === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.length + b.size - inter);
};

const read = (): Store => {
  if (!existsSync(PATH)) return { entries: [], stats: { hits: 0, misses: 0 } };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as Store;
  } catch {
    return { entries: [], stats: { hits: 0, misses: 0 } };
  }
};
const write = (s: Store): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  if (s.entries.length > MAX_ENTRIES) s.entries.splice(0, s.entries.length - MAX_ENTRIES);
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const fresh = (e: Entry): boolean => Date.now() - Date.parse(e.at) < TTL_MS;

export interface SemanticHit {
  text: string;
  model: string;
  similarity: number;
}

export const lookupSemantic = (taskType: string, prompt: string, minSim = DEFAULT_MIN_SIM): SemanticHit | null => {
  const s = read();
  const qTokens = tokenize(prompt);
  if (qTokens.length === 0) return null;
  const q = new Set(qTokens);
  let best: Entry | null = null;
  let bestSim = 0;
  for (const e of s.entries) {
    if (e.taskType !== taskType || !fresh(e)) continue;
    const sim = jaccard(e.tokens, q);
    if (sim > bestSim) {
      bestSim = sim;
      best = e;
    }
  }
  if (best && bestSim >= minSim) {
    best.hits += 1;
    s.stats.hits += 1;
    write(s);
    return { text: best.text, model: best.model, similarity: Number(bestSim.toFixed(3)) };
  }
  s.stats.misses += 1;
  write(s);
  return null;
};

export const storeSemantic = (taskType: string, prompt: string, text: string, model: string): void => {
  if (!text || text.length < 8) return;
  const s = read();
  const tokens = tokenize(prompt);
  if (tokens.length === 0) return;
  // Si ya hay una entrada casi idéntica, refrescala en vez de duplicar.
  const q = new Set(tokens);
  const dup = s.entries.find((e) => e.taskType === taskType && jaccard(e.tokens, q) >= 0.97);
  if (dup) {
    dup.text = text;
    dup.model = model;
    dup.at = new Date().toISOString();
  } else {
    s.entries.push({
      taskType,
      prompt: prompt.slice(0, 400),
      tokens,
      text,
      model,
      at: new Date().toISOString(),
      hits: 0,
    });
  }
  write(s);
};

export interface SemanticCacheStats {
  entries: number;
  hits: number;
  misses: number;
  hitRatePct: number;
  topReused: Array<{ taskType: string; hits: number; prompt: string }>;
}

export const semanticCacheStats = (): SemanticCacheStats => {
  const s = read();
  const total = s.stats.hits + s.stats.misses;
  return {
    entries: s.entries.length,
    hits: s.stats.hits,
    misses: s.stats.misses,
    hitRatePct: total > 0 ? Number(((s.stats.hits / total) * 100).toFixed(1)) : 0,
    topReused: [...s.entries]
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5)
      .map((e) => ({ taskType: e.taskType, hits: e.hits, prompt: e.prompt.slice(0, 80) })),
  };
};
