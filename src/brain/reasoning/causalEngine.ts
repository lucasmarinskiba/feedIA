// @ts-nocheck
/**
 * Causal Engine — Inferencia causal simple para FeedIA
 * Detecta "X causa Y" a partir de observaciones temporales
 * Ej: "post con hook emocional → +40% engagement"
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as graph from '../memory/knowledgeGraph.js';

export interface CausalRule {
  cause: string;
  effect: string;
  confidence: number;
  evidenceCount: number;
  niche: string;
  conditions: string[];
  typicalDelta: number; // typical improvement %
}

export interface Observation {
  action: string;
  outcome: string;
  before: number; // metric before
  after: number; // metric after
  context: string;
  niche: string;
}

// const RULES_PATH = 'data/runtime/brain/causal-rules.json'; // reserved for persistence layer

// Store a causal rule
export const inferCause = async (obs: Observation): Promise<CausalRule | null> => {
  if (obs.before <= 0) return null;
  const delta = ((obs.after - obs.before) / obs.before) * 100;

  // Only infer if change is significant (>20%)
  if (Math.abs(delta) < 20) return null;

  const cause = obs.action;
  const effect = `${obs.outcome} ${delta > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(delta).toFixed(0)}%`;
  const rule: CausalRule = {
    cause,
    effect,
    confidence: Math.min(0.95, Math.abs(delta) / 100 + 0.3),
    evidenceCount: 1,
    niche: obs.niche,
    conditions: [obs.context],
    typicalDelta: delta,
  };

  // Check if similar rule exists
  const existing = await semantic.recall(`${cause} → ${obs.outcome}`, 5, ['learning']);
  if (existing && existing.length > 0 && existing[0] && existing[0].score > 0.6) {
    // Strengthen existing
    const entry = existing[0].entry;
    const meta = entry.metadata as Record<string, unknown>;
    const newCount = ((meta?.evidenceCount as number) ?? 1) + 1;
    const newConfidence = Math.min(0.98, ((meta.confidence as number) ?? 0.5) + 0.05);
    entry.metadata = { ...meta, evidenceCount: newCount, confidence: newConfidence };
    entry.importance = newConfidence;
    log.info(
      `[CausalEngine] Strengthened rule: ${cause} → ${obs.outcome} (n=${newCount}, conf=${newConfidence.toFixed(2)})`,
    );
    return null; // Rule already tracked
  }

  // Store new rule
  await semantic.storeMemory(
    `CAUSA: "${cause}" → EFECTO: "${effect}" (${obs.context})`,
    'learning',
    {
      ruleType: 'causal',
      cause,
      effect: obs.outcome,
      delta,
      niche: obs.niche,
      evidenceCount: 1,
      confidence: rule.confidence,
    },
    rule.confidence,
  );

  // Add to knowledge graph
  graph.addTriple(cause, 'causa', effect, rule.confidence, 'causal-engine');
  graph.addTriple(obs.niche, 'tiene regla causal', `${cause}→${effect}`, rule.confidence, 'causal-engine');

  log.info(`[CausalEngine] New rule: ${cause} → ${effect} (conf=${rule.confidence.toFixed(2)})`);
  return rule;
};

// Query what causes an effect
export const whatCauses = async (effect: string, niche?: string): Promise<CausalRule[]> => {
  const results = await semantic.recall(`causa → ${effect}`, 10, ['learning']);
  const rules: CausalRule[] = [];

  for (const r of results) {
    const meta = r.entry.metadata as Record<string, unknown>;
    if (meta.ruleType !== 'causal') continue;
    if (niche && meta.niche !== niche) continue;

    rules.push({
      cause: String(meta.cause ?? ''),
      effect: String(meta.effect ?? ''),
      confidence: Number(meta.confidence ?? 0),
      evidenceCount: Number(meta.evidenceCount ?? 1),
      niche: String(meta.niche ?? 'general'),
      conditions: [String(meta.context ?? '')],
      typicalDelta: Number(meta.delta ?? 0),
    });
  }

  return rules.sort((a, b) => b.confidence - a.confidence);
};

// Query what an action causes
export const whatDoesItCause = async (action: string, niche?: string): Promise<CausalRule[]> => {
  const results = await semantic.recall(`CAUSA: "${action}" → EFECTO:`, 10, ['learning']);
  const rules: CausalRule[] = [];

  for (const r of results) {
    const meta = r.entry.metadata as Record<string, unknown>;
    if (meta.ruleType !== 'causal') continue;
    if (niche && meta.niche !== niche) continue;

    rules.push({
      cause: String(meta.cause ?? ''),
      effect: String(meta.effect ?? ''),
      confidence: Number(meta.confidence ?? 0),
      evidenceCount: Number(meta.evidenceCount ?? 1),
      niche: String(meta.niche ?? 'general'),
      conditions: [String(meta.context ?? '')],
      typicalDelta: Number(meta.delta ?? 0),
    });
  }

  return rules.sort((a, b) => b.confidence - a.confidence);
};

// A/B comparison of two actions
export const compareActions = async (
  actionA: string,
  actionB: string,
  outcome: string,
  niche: string,
): Promise<{ winner: string; confidence: number; rulesA: CausalRule[]; rulesB: CausalRule[] }> => {
  const rulesA = await whatDoesItCause(actionA, niche);
  const rulesB = await whatDoesItCause(actionB, niche);

  const relevantA = rulesA.filter((r) => r.effect.includes(outcome));
  const relevantB = rulesB.filter((r) => r.effect.includes(outcome));

  const scoreA = relevantA.reduce((s, r) => s + r.confidence * r.typicalDelta, 0);
  const scoreB = relevantB.reduce((s, r) => s + r.confidence * r.typicalDelta, 0);

  const winner = scoreA >= scoreB ? actionA : actionB;
  const total = Math.abs(scoreA) + Math.abs(scoreB);
  const confidence = total > 0 ? Math.abs(scoreA - scoreB) / total : 0.5;

  return { winner, confidence, rulesA: relevantA, rulesB: relevantB };
};

// Export all rules as context for LLM
export const getCausalContext = async (niche: string): Promise<string> => {
  const results = await semantic.recall('CAUSA:', 20, ['learning']);
  const lines: string[] = [`REGLAS CAUSALES PARA "${niche}":`];

  for (const r of results) {
    const meta = r.entry.metadata as Record<string, unknown>;
    if (meta.ruleType !== 'causal' || (niche && meta.niche !== niche)) continue;
    const delta = Number(meta.delta ?? 0);
    const arrow = delta > 0 ? '↑' : '↓';
    lines.push(`  - ${meta.cause} → ${meta.effect} ${arrow}${Math.abs(delta).toFixed(0)}% (conf=${meta.confidence})`);
  }

  return lines.length > 1 ? lines.join('\n') : '';
};
