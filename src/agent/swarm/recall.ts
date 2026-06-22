/**
 * Mission Recall — memoria basada en casos (case-based reasoning)
 * ─────────────────────────────────────────────────────────────────────────
 * El sistema se vuelve más inteligente con el tiempo: antes de planificar,
 * recupera misiones pasadas SIMILARES y le pasa al planner "qué funcionó y
 * qué no" para objetivos parecidos. Sin embeddings ni dependencias —
 * similaridad léxica (Jaccard sobre tokens normalizados), determinista.
 */

import { listMissions, type MissionRecord } from './conductor.js';

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
  'con',
  'esta',
  'este',
  'sobre',
  'más',
  'mas',
]);

const tokenize = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
};

export interface RecalledMission {
  id: string;
  objective: string;
  status: MissionRecord['status'];
  similarity: number;
  crew: string[];
  summary: string;
}

/** Top-k misiones pasadas más parecidas (priorizando las que salieron bien). */
export const recallSimilarMissions = (objective: string, brandId: string, k = 3): RecalledMission[] => {
  const target = tokenize(objective);
  const scored = listMissions(brandId)
    .filter((m) => m.objective && m.id)
    .map((m) => {
      const sim = jaccard(target, tokenize(m.objective));
      const statusBoost = m.status === 'completed' ? 0.15 : m.status === 'partial' ? 0.05 : -0.1;
      return { m, score: sim + statusBoost, sim };
    })
    .filter((x) => x.sim >= 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored.map(({ m, sim }) => ({
    id: m.id,
    objective: m.objective,
    status: m.status,
    similarity: Number(sim.toFixed(2)),
    crew: m.crew.map((c) => c.agentId),
    summary: m.summary.slice(0, 220),
  }));
};

/** Bloque compacto para inyectar en el prompt del planner. */
export const formatRecallForPrompt = (objective: string, brandId: string): string => {
  const hits = recallSimilarMissions(objective, brandId, 3);
  if (hits.length === 0) return 'Sin misiones previas comparables (es territorio nuevo).';
  return hits
    .map(
      (h) =>
        `• [${h.status}, sim ${h.similarity}] "${h.objective.slice(0, 70)}" — crew ${h.crew.join('/') || '—'}. ${h.summary}`,
    )
    .join('\n');
};
