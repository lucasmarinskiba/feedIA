/**
 * FAQ Store
 * ─────────────────────────────────────────────────────────────────────────
 * Persisted list of canned answers the conversational router can return
 * directly for high-frequency questions. The matcher uses token Jaccard
 * over question variants so semantic-equivalent phrasings match the same
 * entry without a vector DB.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tokenize } from '../originality/fingerprint.js';

export interface FaqEntry {
  id: string;
  topic: string;
  /** Multiple phrasings that should all match this entry. */
  questionVariants: string[];
  answer: string;
  intentHint?: 'support' | 'lead-warm' | 'content-ask' | 'off-topic';
  /** Pre-computed token sets, derived from variants. */
  tokenSets?: string[][];
  createdAt: string;
  hits: number;
}

interface FaqStoreShape {
  entries: FaqEntry[];
}

const PATH = resolve('data/runtime/faqs.json');

const readStore = (): FaqStoreShape => {
  if (!existsSync(PATH)) return { entries: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as FaqStoreShape;
  } catch {
    return { entries: [] };
  }
};

const writeStore = (s: FaqStoreShape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const buildTokenSets = (variants: string[]): string[][] => variants.map((v) => tokenize(v));

export const listFaqs = (): FaqEntry[] => readStore().entries;

export const upsertFaq = (
  entry: Omit<FaqEntry, 'id' | 'createdAt' | 'hits' | 'tokenSets'> & { id?: string },
): FaqEntry => {
  const s = readStore();
  const tokenSets = buildTokenSets(entry.questionVariants);
  if (entry.id) {
    const existing = s.entries.find((e) => e.id === entry.id);
    if (existing) {
      Object.assign(existing, { ...entry, tokenSets });
      writeStore(s);
      return existing;
    }
  }
  const created: FaqEntry = {
    id: entry.id ?? `faq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    topic: entry.topic,
    questionVariants: entry.questionVariants,
    answer: entry.answer,
    intentHint: entry.intentHint,
    tokenSets,
    createdAt: new Date().toISOString(),
    hits: 0,
  };
  s.entries.push(created);
  writeStore(s);
  return created;
};

export const deleteFaq = (id: string): boolean => {
  const s = readStore();
  const idx = s.entries.findIndex((e) => e.id === id);
  if (idx < 0) return false;
  s.entries.splice(idx, 1);
  writeStore(s);
  return true;
};

export const incrementFaqHit = (id: string): void => {
  const s = readStore();
  const e = s.entries.find((x) => x.id === id);
  if (!e) return;
  e.hits += 1;
  writeStore(s);
};

/**
 * Match a user message to the best FAQ entry. Returns null if no entry
 * passes the similarity threshold. Pure deterministic — no LLM.
 */
export const matchFaq = (message: string, threshold = 0.35): { entry: FaqEntry; similarity: number } | null => {
  const msgTokens = new Set(tokenize(message));
  if (msgTokens.size === 0) return null;
  const entries = readStore().entries;
  let best: { entry: FaqEntry; similarity: number } | null = null;
  for (const e of entries) {
    const sets = e.tokenSets ?? buildTokenSets(e.questionVariants);
    for (const variantTokens of sets) {
      const v = new Set(variantTokens);
      let inter = 0;
      for (const t of msgTokens) if (v.has(t)) inter += 1;
      const union = msgTokens.size + v.size - inter;
      const sim = union === 0 ? 0 : inter / union;
      if (sim >= threshold && (!best || sim > best.similarity)) {
        best = { entry: e, similarity: +sim.toFixed(3) };
      }
    }
  }
  if (best) incrementFaqHit(best.entry.id);
  return best;
};
