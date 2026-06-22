/**
 * Executive Decision Queue — cola unificada de decisiones esperando owner approve.
 *
 * Fuentes: proactiveAgent triggers, anomalyDetector alerts, council outputs,
 * goal-at-risk replans, ad spend bursts, sensitivity content reviews.
 *
 * Sin Anthropic call directo. Persistencia JSON.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const DECISION_DIR = path.resolve('data/executive/decisions');

export type DecisionSource =
  | 'proactive-agent'
  | 'anomaly-detector'
  | 'council'
  | 'goal-replan'
  | 'ad-spend'
  | 'content-safety'
  | 'community-crisis'
  | 'opportunity-window'
  | 'experiment-result';
export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'auto-executed' | 'expired' | 'snoozed';
export type DecisionUrgency = 'critical' | 'high' | 'medium' | 'low';

export interface DecisionAction {
  label: string;
  skillToInvoke?: string;
  payload?: Record<string, unknown>;
  irreversible: boolean;
  estimatedCostUsd: number;
  estimatedImpactScore: number;
}

export interface ExecutiveDecision {
  id: string;
  brandId: string;
  source: DecisionSource;
  urgency: DecisionUrgency;
  status: DecisionStatus;
  title: string;
  context: string;
  reasoning: string;
  evidence: string[];
  recommendedAction: DecisionAction;
  alternativeActions: DecisionAction[];
  expectedOutcome: string;
  risks: string[];
  expiresAt?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: 'owner' | 'auto' | 'expiry';
  outcomeNote?: string;
  autoExecuteIfNoResponse: boolean;
}

const queuePath = (brandId: string): string => path.join(DECISION_DIR, `${brandId}-queue.json`);

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(DECISION_DIR, { recursive: true });
};

const loadQueue = async (brandId: string): Promise<ExecutiveDecision[]> => {
  try {
    return JSON.parse(await fs.readFile(queuePath(brandId), 'utf-8')) as ExecutiveDecision[];
  } catch {
    return [];
  }
};

const saveQueue = async (brandId: string, queue: ExecutiveDecision[]): Promise<void> => {
  await ensureDir();
  await fs.writeFile(queuePath(brandId), JSON.stringify(queue.slice(-300), null, 2), 'utf-8');
};

export const enqueueDecision = async (params: {
  brandId: string;
  source: DecisionSource;
  urgency: DecisionUrgency;
  title: string;
  context: string;
  reasoning: string;
  evidence?: string[];
  recommendedAction: DecisionAction;
  alternativeActions?: DecisionAction[];
  expectedOutcome: string;
  risks?: string[];
  ttlMinutes?: number;
  autoExecuteIfNoResponse?: boolean;
}): Promise<ExecutiveDecision> => {
  const queue = await loadQueue(params.brandId);
  const decision: ExecutiveDecision = {
    id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId: params.brandId,
    source: params.source,
    urgency: params.urgency,
    status: 'pending',
    title: params.title,
    context: params.context,
    reasoning: params.reasoning,
    evidence: params.evidence ?? [],
    recommendedAction: params.recommendedAction,
    alternativeActions: params.alternativeActions ?? [],
    expectedOutcome: params.expectedOutcome,
    risks: params.risks ?? [],
    expiresAt: params.ttlMinutes ? new Date(Date.now() + params.ttlMinutes * 60_000).toISOString() : undefined,
    createdAt: new Date().toISOString(),
    autoExecuteIfNoResponse: params.autoExecuteIfNoResponse ?? false,
  };
  queue.push(decision);
  await saveQueue(params.brandId, queue);
  log.info('[executiveDecisionQueue] enqueued', {
    brandId: params.brandId,
    id: decision.id,
    urgency: decision.urgency,
  });
  return decision;
};

export const resolveDecision = async (
  brandId: string,
  decisionId: string,
  resolution: {
    status: Exclude<DecisionStatus, 'pending' | 'snoozed'>;
    outcomeNote?: string;
    resolvedBy?: 'owner' | 'auto' | 'expiry';
  },
): Promise<ExecutiveDecision | null> => {
  const queue = await loadQueue(brandId);
  const decision = queue.find((d) => d.id === decisionId);
  if (!decision) return null;
  decision.status = resolution.status;
  decision.resolvedAt = new Date().toISOString();
  decision.resolvedBy = resolution.resolvedBy ?? 'owner';
  decision.outcomeNote = resolution.outcomeNote;
  await saveQueue(brandId, queue);
  return decision;
};

export const snoozeDecision = async (
  brandId: string,
  decisionId: string,
  untilIso: string,
): Promise<ExecutiveDecision | null> => {
  const queue = await loadQueue(brandId);
  const decision = queue.find((d) => d.id === decisionId);
  if (!decision) return null;
  decision.status = 'snoozed';
  decision.expiresAt = untilIso;
  await saveQueue(brandId, queue);
  return decision;
};

export const listPending = async (
  brandId: string,
  opts?: { urgency?: DecisionUrgency },
): Promise<ExecutiveDecision[]> => {
  const queue = await loadQueue(brandId);
  const now = Date.now();
  return queue
    .filter(
      (d) => d.status === 'pending' || (d.status === 'snoozed' && d.expiresAt && new Date(d.expiresAt).getTime() < now),
    )
    .filter((d) => !opts?.urgency || d.urgency === opts.urgency)
    .sort((a, b) => {
      const order: Record<DecisionUrgency, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.urgency] - order[b.urgency];
    });
};

export const expireOldDecisions = async (brandId: string): Promise<number> => {
  const queue = await loadQueue(brandId);
  const now = Date.now();
  let expired = 0;
  for (const d of queue) {
    if (d.status === 'pending' && d.expiresAt && new Date(d.expiresAt).getTime() < now) {
      if (d.autoExecuteIfNoResponse) {
        d.status = 'auto-executed';
        d.resolvedBy = 'auto';
        d.outcomeNote = 'Auto-ejecutada por expiración sin respuesta';
      } else {
        d.status = 'expired';
        d.resolvedBy = 'expiry';
      }
      d.resolvedAt = new Date().toISOString();
      expired++;
    }
  }
  if (expired > 0) await saveQueue(brandId, queue);
  return expired;
};

export const getDecisionStats = async (
  brandId: string,
  days = 30,
): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  autoExecuted: number;
  expired: number;
  avgResolutionMinutes: number;
  byUrgency: Record<DecisionUrgency, number>;
  bySource: Record<string, number>;
}> => {
  const queue = await loadQueue(brandId);
  const cutoff = Date.now() - days * 86_400_000;
  const recent = queue.filter((d) => new Date(d.createdAt).getTime() >= cutoff);

  const stats = {
    total: recent.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    autoExecuted: 0,
    expired: 0,
    avgResolutionMinutes: 0,
    byUrgency: { critical: 0, high: 0, medium: 0, low: 0 } as Record<DecisionUrgency, number>,
    bySource: {} as Record<string, number>,
  };

  let totalResolutionMs = 0;
  let resolvedCount = 0;

  for (const d of recent) {
    if (d.status === 'pending') stats.pending++;
    else if (d.status === 'approved') stats.approved++;
    else if (d.status === 'rejected') stats.rejected++;
    else if (d.status === 'auto-executed') stats.autoExecuted++;
    else if (d.status === 'expired') stats.expired++;
    stats.byUrgency[d.urgency]++;
    stats.bySource[d.source] = (stats.bySource[d.source] ?? 0) + 1;
    if (d.resolvedAt) {
      totalResolutionMs += new Date(d.resolvedAt).getTime() - new Date(d.createdAt).getTime();
      resolvedCount++;
    }
  }
  stats.avgResolutionMinutes = resolvedCount > 0 ? Math.round(totalResolutionMs / resolvedCount / 60_000) : 0;
  return stats;
};
