/**
 * Reasoning Trace Store
 * ─────────────────────────────────────────────────────────────────────────
 * Every autonomous decision the system makes — picking a hook pattern,
 * choosing a posting hour, routing a conversation, planning a pulse —
 * gets a structured trace logged here.
 *
 * A trace captures:
 *   • agentId       — which subsystem decided
 *   • decisionType  — what kind of choice this was
 *   • context       — the inputs used
 *   • alternatives  — what other options were considered + scores
 *   • chosen        — the option chosen + its score
 *   • reasoning     — short explanation
 *   • factsUsed     — which knowledge-base facts grounded the decision
 *   • outcome       — eventually backfilled when the decision's effect is measurable
 *
 * This is the foundation for auditing the autonomous system and for the
 * feedback loop that closes when outcomes are attributed back to decisions.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type DecisionType =
  | 'content-format'
  | 'hook-pattern'
  | 'visual-pattern'
  | 'template-pick'
  | 'posting-time'
  | 'audience-segment'
  | 'experiment-design'
  | 'outreach-template'
  | 'pulse-type'
  | 'intent-route'
  | 'pin-slot'
  | 'strategy-adjustment'
  | 'goal-decomposition';

export interface Alternative {
  /** Human-readable option label. */
  option: string;
  /** 0–100 score the system computed for this option. */
  score: number;
  /** Optional one-line reasoning specific to this option. */
  reasoning?: string;
}

export interface TraceOutcome {
  /** Metric the outcome is measured by. */
  metric: string;
  /** Observed value. */
  value: number;
  /** Comparison to the no-decision baseline. */
  ranking: 'better' | 'same' | 'worse';
  /** When the outcome was measured. */
  measuredAt: string;
  /** Optional notes. */
  notes?: string;
}

export interface ReasoningTrace {
  id: string;
  /** Logical agent or subsystem that made the decision. */
  agentId: string;
  decisionType: DecisionType;
  /** Inputs used for the decision (any agent-specific shape). */
  context: Record<string, unknown>;
  alternatives: Alternative[];
  /** The chosen option (label). Should match one of the alternatives. */
  chosen: string;
  /** Score of the chosen option, for fast filtering / leaderboards. */
  chosenScore: number;
  /** Short prose justification. */
  reasoning: string;
  /** IDs of facts from the knowledge base that grounded the decision. */
  factsUsed: string[];
  /** Brand this trace belongs to. */
  brandId: string;
  /** Correlation id if the decision belongs to a playbook run. */
  correlationId?: string;
  createdAt: string;
  outcome?: TraceOutcome;
}

interface TraceStoreShape {
  traces: ReasoningTrace[];
}

const PATH = resolve('data/runtime/reasoningTraces.json');

const readStore = (): TraceStoreShape => {
  if (!existsSync(PATH)) return { traces: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as TraceStoreShape;
  } catch {
    return { traces: [] };
  }
};

const writeStore = (s: TraceStoreShape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const newId = (): string => `trc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/* ──────────────────────────────────────────────────────────────────────── */

export const recordTrace = (params: {
  agentId: string;
  decisionType: DecisionType;
  context: Record<string, unknown>;
  alternatives: Alternative[];
  chosen: string;
  reasoning: string;
  factsUsed?: string[];
  brandId: string;
  correlationId?: string;
}): ReasoningTrace => {
  const chosenAlt = params.alternatives.find((a) => a.option === params.chosen);
  const trace: ReasoningTrace = {
    id: newId(),
    agentId: params.agentId,
    decisionType: params.decisionType,
    context: params.context,
    alternatives: params.alternatives,
    chosen: params.chosen,
    chosenScore: chosenAlt?.score ?? 0,
    reasoning: params.reasoning,
    factsUsed: params.factsUsed ?? [],
    brandId: params.brandId,
    correlationId: params.correlationId,
    createdAt: new Date().toISOString(),
  };
  const s = readStore();
  s.traces.push(trace);
  // Cap at 1000 to keep file size sane.
  if (s.traces.length > 1000) s.traces.splice(0, s.traces.length - 1000);
  writeStore(s);
  return trace;
};

export const recordOutcome = (traceId: string, outcome: TraceOutcome): ReasoningTrace | null => {
  const s = readStore();
  const t = s.traces.find((x) => x.id === traceId);
  if (!t) return null;
  t.outcome = outcome;
  writeStore(s);
  return t;
};

export const listTraces = (filter?: {
  brandId?: string;
  agentId?: string;
  decisionType?: DecisionType;
  correlationId?: string;
  withOutcomeOnly?: boolean;
  limit?: number;
}): ReasoningTrace[] => {
  const all = readStore().traces;
  let filtered = all.filter(
    (t) =>
      (!filter?.brandId || t.brandId === filter.brandId) &&
      (!filter?.agentId || t.agentId === filter.agentId) &&
      (!filter?.decisionType || t.decisionType === filter.decisionType) &&
      (!filter?.correlationId || t.correlationId === filter.correlationId) &&
      (!filter?.withOutcomeOnly || t.outcome !== undefined),
  );
  filtered = filtered.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return filter?.limit ? filtered.slice(0, filter.limit) : filtered;
};

export const getTraceById = (id: string): ReasoningTrace | undefined => readStore().traces.find((t) => t.id === id);

export interface TraceStats {
  totalTraces: number;
  byAgent: Record<string, number>;
  byDecisionType: Record<DecisionType, number>;
  withOutcomes: number;
  successRate: number; // outcomes ranked 'better' / withOutcomes
  avgChosenScore: number;
}

export const getTraceStats = (brandId?: string): TraceStats => {
  const all = brandId ? readStore().traces.filter((t) => t.brandId === brandId) : readStore().traces;
  const byAgent: Record<string, number> = {};
  const byDecisionType = {} as Record<DecisionType, number>;
  let withOutcomes = 0;
  let better = 0;
  let scoreSum = 0;
  for (const t of all) {
    byAgent[t.agentId] = (byAgent[t.agentId] ?? 0) + 1;
    byDecisionType[t.decisionType] = (byDecisionType[t.decisionType] ?? 0) + 1;
    if (t.outcome) {
      withOutcomes += 1;
      if (t.outcome.ranking === 'better') better += 1;
    }
    scoreSum += t.chosenScore;
  }
  return {
    totalTraces: all.length,
    byAgent,
    byDecisionType,
    withOutcomes,
    successRate: withOutcomes === 0 ? 0 : +(better / withOutcomes).toFixed(3),
    avgChosenScore: all.length === 0 ? 0 : +(scoreSum / all.length).toFixed(1),
  };
};

/**
 * Pure helper for agents — build an alternatives list deterministically
 * from a scoring function. Useful when you have N candidates and a score()
 * function and want to record the trace + return the winner with one call.
 */
export const decideAndTrace = <T>(params: {
  agentId: string;
  decisionType: DecisionType;
  brandId: string;
  candidates: T[];
  scoreFn: (c: T) => { option: string; score: number; reasoning?: string };
  context: Record<string, unknown>;
  reasoning: string;
  factsUsed?: string[];
  correlationId?: string;
}): { winner: T; trace: ReasoningTrace } | null => {
  if (params.candidates.length === 0) return null;
  const scored = params.candidates.map((c) => ({ c, ...params.scoreFn(c) }));
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]!;
  const alternatives: Alternative[] = scored.map((s) => ({
    option: s.option,
    score: s.score,
    reasoning: s.reasoning,
  }));
  const trace = recordTrace({
    agentId: params.agentId,
    decisionType: params.decisionType,
    context: params.context,
    alternatives,
    chosen: winner.option,
    reasoning: params.reasoning,
    factsUsed: params.factsUsed,
    brandId: params.brandId,
    correlationId: params.correlationId,
  });
  return { winner: winner.c, trace };
};
