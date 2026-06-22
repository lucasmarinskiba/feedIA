// @ts-nocheck
/**
 * Language Memory — Diccionario vivo de slang, términos trending, memes por nicho
 * Aprende automáticamente del lenguaje que usa la audiencia
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';

const LANG_PATH = resolve('data/runtime/brain/language-memory.json');

export interface LanguageTerm {
  term: string;
  type: 'slang' | 'meme' | 'phrase' | 'hashtag' | 'abbreviation' | 'sound' | 'reference';
  meaning: string;
  origin?: string;
  niche: string;
  ageGroup?: string;
  platformOrigin?: string;
  firstSeen: string;
  lastSeen: string;
  frequency: number;
  confidence: number; // 0-1, how sure we are this is real
  examples: string[];
  status: 'emerging' | 'peak' | 'declining' | 'dead';
}

interface LangStore {
  terms: LanguageTerm[];
  lastScan: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): LangStore => {
  try {
    ensureDir();
    if (!existsSync(LANG_PATH)) return { terms: [], lastScan: new Date().toISOString() };
    return JSON.parse(readFileSync(LANG_PATH, 'utf-8')) as LangStore;
  } catch {
    return { terms: [], lastScan: new Date().toISOString() };
  }
};

const saveStore = (store: LangStore): void => {
  ensureDir();
  writeFileSync(LANG_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

export const recordTerm = (term: Omit<LanguageTerm, 'firstSeen' | 'lastSeen' | 'frequency'>): LanguageTerm => {
  const store = loadStore();
  const existing = store.terms.find((t) => t.term.toLowerCase() === term.term.toLowerCase() && t.niche === term.niche);

  if (existing) {
    existing.lastSeen = new Date().toISOString();
    existing.frequency += 1;
    existing.examples = [...existing.examples, ...term.examples].slice(-5);
    if (term.confidence > existing.confidence) existing.confidence = term.confidence;
    if (term.status !== existing.status) {
      // Auto-update status based on time
      const daysSinceFirst = (Date.now() - new Date(existing.firstSeen).getTime()) / (24 * 3600_000);
      if (daysSinceFirst < 7) existing.status = 'emerging';
      else if (daysSinceFirst < 30) existing.status = 'peak';
      else if (daysSinceFirst < 90) existing.status = 'declining';
      else existing.status = 'dead';
    }
    saveStore(store);
    return existing;
  }

  const fullTerm: LanguageTerm = {
    ...term,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    frequency: 1,
  };
  store.terms.push(fullTerm);
  saveStore(store);
  log.info(`[LanguageMemory] New term recorded: "${term.term}" (${term.type})`);
  return fullTerm;
};

export const getTermsByNiche = (niche: string, status?: LanguageTerm['status']): LanguageTerm[] => {
  const store = loadStore();
  let terms = store.terms.filter((t) => t.niche.toLowerCase() === niche.toLowerCase());
  if (status) terms = terms.filter((t) => t.status === status);
  return terms.sort((a, b) => b.frequency - a.frequency);
};

export const getTermsByStatus = (status: LanguageTerm['status']): LanguageTerm[] => {
  const store = loadStore();
  return store.terms.filter((t) => t.status === status).sort((a, b) => b.frequency - a.frequency);
};

export const getTrendingTerms = (niche?: string, limit = 20): LanguageTerm[] => {
  const store = loadStore();
  let terms = store.terms.filter((t) => t.status === 'emerging' || t.status === 'peak');
  if (niche) terms = terms.filter((t) => t.niche.toLowerCase() === niche.toLowerCase());
  return terms.sort((a, b) => b.frequency - a.frequency).slice(0, limit);
};

export const getDeadTerms = (limit = 20): LanguageTerm[] => {
  const store = loadStore();
  return store.terms
    .filter((t) => t.status === 'dead')
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);
};

export const searchTerms = (query: string): LanguageTerm[] => {
  const q = query.toLowerCase();
  const store = loadStore();
  return store.terms
    .filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.meaning.toLowerCase().includes(q) ||
        t.examples.some((e) => e.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.frequency - a.frequency);
};

export const getLanguageContext = (niche: string): string => {
  const terms = getTrendingTerms(niche, 15);
  if (terms.length === 0) return '';
  const lines = [`LENGUAJE ACTUAL DEL NICHO "${niche}":`];
  for (const t of terms) {
    lines.push(`  - "${t.term}" (${t.type}, ${t.status}): ${t.meaning}`);
  }
  return lines.join('\n');
};

export const isTermKnown = (term: string, niche: string): boolean => {
  const store = loadStore();
  return store.terms.some(
    (t) => t.term.toLowerCase() === term.toLowerCase() && t.niche.toLowerCase() === niche.toLowerCase(),
  );
};

export const getTermStatus = (term: string, niche: string): LanguageTerm['status'] | null => {
  const store = loadStore();
  const found = store.terms.find(
    (t) => t.term.toLowerCase() === term.toLowerCase() && t.niche.toLowerCase() === niche.toLowerCase(),
  );
  return found?.status ?? null;
};

export const suggestModernPhrases = (count = 5): string[] => {
  const terms = getTrendingTerms(undefined, count);
  return terms.map((t) => t.term);
};

export const pruneDeadTerms = (olderThanDays = 180): number => {
  const store = loadStore();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600_000).toISOString();
  const before = store.terms.length;
  store.terms = store.terms.filter((t) => !(t.status === 'dead' && t.lastSeen < cutoff));
  saveStore(store);
  const pruned = before - store.terms.length;
  if (pruned > 0) log.info(`[LanguageMemory] Pruned ${pruned} dead terms`);
  return pruned;
};
