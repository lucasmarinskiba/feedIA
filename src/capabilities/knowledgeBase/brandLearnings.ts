/**
 * Brand Learnings Store
 * ─────────────────────────────────────────────────────────────────────────
 * Per-brand observed insights that complement the static algorithm facts.
 * Sources include the auto-optimization loop, the audit history, and
 * explicit lessons captured from human-approved decisions.
 *
 * Every learning carries:
 *   • category (what-works / what-doesnt / audience-insight / timing / topic)
 *   • the insight itself
 *   • evidence (data point, post id, audit id, etc.)
 *   • confidence + capturedAt
 *
 * This is the brand's "personal" knowledge base — the system uses it ALONGSIDE
 * the global algorithm facts so agent decisions are grounded in BOTH general
 * best practices AND what's been observed for this specific account.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Confidence } from './facts.js';

export type LearningCategory =
  | 'what-works'
  | 'what-doesnt'
  | 'audience-insight'
  | 'timing-insight'
  | 'topic-resonance'
  | 'hook-pattern-winner'
  | 'format-mix-balance';

export interface BrandLearning {
  id: string;
  brandId: string;
  category: LearningCategory;
  insight: string;
  evidence: string;
  /** Tags for keyword search. */
  tags: string[];
  confidence: Confidence;
  capturedAt: string;
  /** Optional weight if this learning has been validated multiple times. */
  reinforcements: number;
}

interface BrandLearningsShape {
  learnings: BrandLearning[];
}

const PATH = resolve('data/runtime/brandLearnings.json');

const readStore = (): BrandLearningsShape => {
  if (!existsSync(PATH)) return { learnings: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as BrandLearningsShape;
  } catch {
    return { learnings: [] };
  }
};

const writeStore = (s: BrandLearningsShape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const newId = (): string => `bl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/* ──────────────────────────────────────────────────────────────────────── */

export const captureLearning = (params: {
  brandId: string;
  category: LearningCategory;
  insight: string;
  evidence: string;
  tags?: string[];
  confidence?: Confidence;
}): BrandLearning => {
  const s = readStore();

  // De-duplication: if there's already a learning with the same insight verbatim
  // for the same brand, just reinforce it.
  const existing = s.learnings.find((l) => l.brandId === params.brandId && l.insight === params.insight);
  if (existing) {
    existing.reinforcements += 1;
    // Promote confidence if a 'baja' learning is reinforced enough.
    if (existing.reinforcements >= 3 && existing.confidence === 'baja') existing.confidence = 'media';
    if (existing.reinforcements >= 5 && existing.confidence === 'media') existing.confidence = 'alta';
    existing.capturedAt = new Date().toISOString();
    writeStore(s);
    return existing;
  }

  const fresh: BrandLearning = {
    id: newId(),
    brandId: params.brandId,
    category: params.category,
    insight: params.insight,
    evidence: params.evidence,
    tags: params.tags ?? [],
    confidence: params.confidence ?? 'media',
    capturedAt: new Date().toISOString(),
    reinforcements: 1,
  };
  s.learnings.push(fresh);
  // Cap at 500 per brand to avoid unbounded growth.
  const sameBrand = s.learnings.filter((l) => l.brandId === params.brandId);
  if (sameBrand.length > 500) {
    // Drop the oldest, lowest-confidence ones first.
    const dropCount = sameBrand.length - 500;
    const cw = { baja: 1, media: 2, alta: 3 } as const;
    const toDropSet = new Set(
      sameBrand
        .slice()
        .sort((a, b) => {
          const cAdiff = cw[a.confidence] - cw[b.confidence];
          if (cAdiff !== 0) return cAdiff;
          return Date.parse(a.capturedAt) - Date.parse(b.capturedAt);
        })
        .slice(0, dropCount)
        .map((l) => l.id),
    );
    s.learnings = s.learnings.filter((l) => !toDropSet.has(l.id));
  }
  writeStore(s);
  return fresh;
};

export const queryLearnings = (params: {
  brandId: string;
  category?: LearningCategory;
  keywords?: string[];
  limit?: number;
  minConfidence?: Confidence;
}): BrandLearning[] => {
  const all = readStore().learnings.filter((l) => l.brandId === params.brandId);
  const cw: Record<Confidence, number> = { baja: 1, media: 2, alta: 3 };
  const minConf = params.minConfidence ?? 'baja';

  const matched = all.filter((l) => {
    if (cw[l.confidence] < cw[minConf]) return false;
    if (params.category && l.category !== params.category) return false;
    if (params.keywords && params.keywords.length > 0) {
      const lower = (l.insight + ' ' + l.tags.join(' ') + ' ' + l.evidence).toLowerCase();
      return params.keywords.some((k) => lower.includes(k.toLowerCase()));
    }
    return true;
  });

  const score = (l: BrandLearning): number => cw[l.confidence] * 5 + l.reinforcements * 2;

  return matched
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, params.limit ?? 10);
};

export const listLearnings = (brandId: string): BrandLearning[] =>
  readStore().learnings.filter((l) => l.brandId === brandId);

export const deleteLearning = (id: string): boolean => {
  const s = readStore();
  const idx = s.learnings.findIndex((l) => l.id === id);
  if (idx < 0) return false;
  s.learnings.splice(idx, 1);
  writeStore(s);
  return true;
};

export const formatLearningsAsPrompt = (learnings: BrandLearning[]): string => {
  if (learnings.length === 0) return '';
  return `\n\nAPRENDIZAJES PROPIOS DE ESTA MARCA (priorizar sobre best practices genéricas):\n${learnings
    .map((l) => `• [${l.category} · conf ${l.confidence} · x${l.reinforcements}] ${l.insight}`)
    .join('\n')}`;
};
