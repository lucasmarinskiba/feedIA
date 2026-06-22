/**
 * Outreach Store — tracks every outreach sequence the system has fired:
 * which template + variant + recipient + step status + reply state. The
 * orchestrator reads this to know which step is due next, and to compute
 * the A/B variant winner over time.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type OutreachStatus = 'pending' | 'sent' | 'replied' | 'dropped' | 'completed';

export interface OutreachInstance {
  id: string;
  templateId: string;
  variantLabel: string;
  recipientHandle: string;
  /** Per-step status; index matches steps[] in the template. */
  steps: Array<{
    stepNumber: number;
    status: OutreachStatus;
    sentAt?: string;
    repliedAt?: string;
    rendered: string;
  }>;
  currentStep: number;
  /** When the entire sequence was scheduled to start (or did start). */
  startedAt: string;
  /** When recipient last replied, if any. */
  lastReplyAt?: string;
  /** Overall outcome. */
  outcome: 'in-progress' | 'reply' | 'no-reply' | 'dropped';
  /** Any opaque context the orchestrator wants to keep — placeholder values etc. */
  context?: Record<string, string>;
}

interface OutreachStoreShape {
  instances: OutreachInstance[];
}

const PATH = resolve('data/runtime/outreach.json');

const readStore = (): OutreachStoreShape => {
  if (!existsSync(PATH)) return { instances: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as OutreachStoreShape;
  } catch {
    return { instances: [] };
  }
};

const writeStore = (s: OutreachStoreShape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const enqueueOutreach = (params: {
  templateId: string;
  variantLabel: string;
  recipientHandle: string;
  renderedSteps: Array<{ stepNumber: number; rendered: string }>;
  context?: Record<string, string>;
}): OutreachInstance => {
  const s = readStore();
  const instance: OutreachInstance = {
    id: newId('out'),
    templateId: params.templateId,
    variantLabel: params.variantLabel,
    recipientHandle: params.recipientHandle,
    steps: params.renderedSteps.map((rs) => ({
      stepNumber: rs.stepNumber,
      status: 'pending',
      rendered: rs.rendered,
    })),
    currentStep: 1,
    startedAt: new Date().toISOString(),
    outcome: 'in-progress',
    context: params.context,
  };
  s.instances.push(instance);
  // Keep last 500 to avoid disk bloat.
  if (s.instances.length > 500) s.instances.splice(0, s.instances.length - 500);
  writeStore(s);
  return instance;
};

export const markStepSent = (instanceId: string, stepNumber: number): OutreachInstance | null => {
  const s = readStore();
  const inst = s.instances.find((i) => i.id === instanceId);
  if (!inst) return null;
  const step = inst.steps.find((st) => st.stepNumber === stepNumber);
  if (!step) return null;
  step.status = 'sent';
  step.sentAt = new Date().toISOString();
  inst.currentStep = stepNumber + 1;
  writeStore(s);
  return inst;
};

export const markReply = (instanceId: string): OutreachInstance | null => {
  const s = readStore();
  const inst = s.instances.find((i) => i.id === instanceId);
  if (!inst) return null;
  inst.lastReplyAt = new Date().toISOString();
  inst.outcome = 'reply';
  // Mark the current step as replied (the one that triggered the response).
  const lastSent = inst.steps.filter((st) => st.status === 'sent').pop();
  if (lastSent) {
    lastSent.status = 'replied';
    lastSent.repliedAt = inst.lastReplyAt;
  }
  writeStore(s);
  return inst;
};

export const markDropped = (instanceId: string, reason?: string): OutreachInstance | null => {
  const s = readStore();
  const inst = s.instances.find((i) => i.id === instanceId);
  if (!inst) return null;
  inst.outcome = 'dropped';
  if (reason) inst.context = { ...(inst.context ?? {}), dropReason: reason };
  writeStore(s);
  return inst;
};

export const listOutreach = (filter?: {
  templateId?: string;
  outcome?: OutreachInstance['outcome'];
  recipientHandle?: string;
}): OutreachInstance[] => {
  const all = readStore().instances;
  return all.filter(
    (i) =>
      (!filter?.templateId || i.templateId === filter.templateId) &&
      (!filter?.outcome || i.outcome === filter.outcome) &&
      (!filter?.recipientHandle || i.recipientHandle === filter.recipientHandle),
  );
};

export interface VariantPerformance {
  templateId: string;
  variantLabel: string;
  totalSent: number;
  replied: number;
  replyRate: number;
}

/** Compute reply rate per (template, variant) combo for A/B winner picking. */
export const computeVariantPerformance = (): VariantPerformance[] => {
  const all = readStore().instances;
  const buckets = new Map<string, { sent: number; replied: number; templateId: string; variantLabel: string }>();
  for (const i of all) {
    const key = `${i.templateId}::${i.variantLabel}`;
    const sentSteps = i.steps.filter((st) => st.status === 'sent' || st.status === 'replied').length;
    if (sentSteps === 0) continue;
    const bucket = buckets.get(key) ?? { sent: 0, replied: 0, templateId: i.templateId, variantLabel: i.variantLabel };
    bucket.sent += 1;
    if (i.outcome === 'reply') bucket.replied += 1;
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values()).map((b) => ({
    templateId: b.templateId,
    variantLabel: b.variantLabel,
    totalSent: b.sent,
    replied: b.replied,
    replyRate: b.sent === 0 ? 0 : +(b.replied / b.sent).toFixed(3),
  }));
};

export const getDueSteps = (
  _now: Date = new Date(),
): Array<{
  instance: OutreachInstance;
  stepNumber: number;
  body: string;
}> => {
  const all = readStore().instances;
  const due: Array<{ instance: OutreachInstance; stepNumber: number; body: string }> = [];
  for (const inst of all) {
    if (inst.outcome !== 'in-progress') continue;
    const next = inst.steps.find((st) => st.status === 'pending' && st.stepNumber === inst.currentStep);
    if (!next) continue;
    // Determine if delay has elapsed: previous-step.sentAt + delayHours.
    const prev = inst.steps.find((st) => st.stepNumber === inst.currentStep - 1);
    const baseTime = prev?.sentAt ? Date.parse(prev.sentAt) : Date.parse(inst.startedAt);
    // We don't have delayHours here — caller must check against template.
    // Return all pending current steps and let caller verify timing.
    void baseTime;
    due.push({ instance: inst, stepNumber: next.stepNumber, body: next.rendered });
  }
  return due;
};
