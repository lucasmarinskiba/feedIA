/**
 * Audience Lifecycle Mapper — Mapa completo del viaje del follower
 * Desde "stalking" hasta "cliente recurrente" y "embajador"
 * Cada usuario tiene un "estado de vida" que evoluciona
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';

const LC_PATH = resolve('data/runtime/brain/audience-lifecycle.json');

export type LifecycleStage =
  | 'unknown' // Never interacted
  | 'stalker' // Views but no interaction
  | 'lurker' // Watches stories, occasional like
  | 'engager' // Comments, shares occasionally
  | 'fan' // High engagement, emotional connection
  | 'lead' // Showed buying intent
  | 'customer' // Made a purchase
  | 'repeat' // Multiple purchases
  | 'ambassador' // Promotes organically
  | 'churned'; // Was active, now gone

export interface LifecycleRecord {
  handle: string;
  currentStage: LifecycleStage;
  stageHistory: { stage: LifecycleStage; enteredAt: string; exitedAt?: string }[];
  touchpoints: { type: string; date: string; impact: number }[];
  timeInCurrentStage: number; // days
  nextLikelyStage: LifecycleStage;
  probability: number; // 0-1
  recommendedAction: string;
  churnRisk: number; // 0-1
  lifetimeValue: number;
}

interface LCStore {
  records: LifecycleRecord[];
  stageTransitions: Record<string, Record<string, number>>; // from -> to -> count
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): LCStore => {
  try {
    ensureDir();
    if (!existsSync(LC_PATH)) return { records: [], stageTransitions: {} };
    return JSON.parse(readFileSync(LC_PATH, 'utf-8')) as LCStore;
  } catch {
    return { records: [], stageTransitions: {} };
  }
};

const saveStore = (store: LCStore): void => {
  ensureDir();
  writeFileSync(LC_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Stage progression logic ────────────────────────────────────────────────

const STAGE_ORDER: LifecycleStage[] = [
  'unknown',
  'stalker',
  'lurker',
  'engager',
  'fan',
  'lead',
  'customer',
  'repeat',
  'ambassador',
];

const stageTransitions: Record<LifecycleStage, Partial<Record<LifecycleStage, number>>> = {
  unknown: { stalker: 0.3, lurker: 0.1 },
  stalker: { lurker: 0.4, engager: 0.05 },
  lurker: { engager: 0.3, fan: 0.05, stalker: 0.1 },
  engager: { fan: 0.2, lead: 0.1, lurker: 0.1 },
  fan: { lead: 0.15, ambassador: 0.05, engager: 0.05 },
  lead: { customer: 0.25, fan: 0.1, engager: 0.05 },
  customer: { repeat: 0.3, fan: 0.1, churned: 0.05 },
  repeat: { ambassador: 0.15, churned: 0.05 },
  ambassador: { churned: 0.02 },
  churned: { lurker: 0.1, engager: 0.05 },
};

const actionsByStage: Record<LifecycleStage, string> = {
  unknown: 'Atraer con contenido de valor puro',
  stalker: 'Stories con CTA sutil para interactuar',
  lurker: 'Contenido que invite a comentar',
  engager: 'Agradecer y profundizar conexión',
  fan: 'Ofrecer exclusividad / early access',
  lead: 'DM con info de producto/servicio',
  customer: 'Onboarding y solicitar testimonio',
  repeat: 'Programa de fidelización / upsell',
  ambassador: 'Programa de referidos / colaboración',
  churned: 'Re-engagement campaign / encuesta',
};

// ── Update lifecycle stage ─────────────────────────────────────────────────

export const updateStage = (
  handle: string,
  signals: {
    storyViews?: number;
    likes?: number;
    comments?: number;
    dms?: number;
    purchases?: number;
    mentions?: number;
    daysSinceLastInteraction?: number;
  },
): LifecycleRecord => {
  const store = loadStore();
  let record = store.records.find((r) => r.handle.toLowerCase() === handle.toLowerCase());

  if (!record) {
    record = {
      handle,
      currentStage: 'unknown',
      stageHistory: [{ stage: 'unknown', enteredAt: new Date().toISOString() }],
      touchpoints: [],
      timeInCurrentStage: 0,
      nextLikelyStage: 'stalker',
      probability: 0.3,
      recommendedAction: actionsByStage.unknown,
      churnRisk: 0,
      lifetimeValue: 0,
    };
    store.records.push(record);
  }

  // Determine new stage from signals
  let newStage = record.currentStage;

  if (signals.purchases && signals.purchases > 1) newStage = 'repeat';
  else if (signals.purchases && signals.purchases === 1) newStage = 'customer';
  else if (signals.dms && signals.dms > 0 && (signals.likes ?? 0) > 5) newStage = 'lead';
  else if (signals.mentions && signals.mentions > 2) newStage = 'ambassador';
  else if (signals.comments && signals.comments > 5 && (signals.likes ?? 0) > 10) newStage = 'fan';
  else if (signals.comments && signals.comments > 0) newStage = 'engager';
  else if (signals.storyViews && signals.storyViews > 10) newStage = 'lurker';
  else if (signals.storyViews && signals.storyViews > 0) newStage = 'stalker';

  // Churn detection
  if (signals.daysSinceLastInteraction && signals.daysSinceLastInteraction > 60 && record.currentStage !== 'churned') {
    newStage = 'churned';
    record.churnRisk = 1;
  }

  // Stage change
  if (newStage !== record.currentStage) {
    const currentHist = record.stageHistory.find((h) => h.stage === record.currentStage && !h.exitedAt);
    if (currentHist) currentHist.exitedAt = new Date().toISOString();

    record.stageHistory.push({ stage: newStage, enteredAt: new Date().toISOString() });

    // Track transition
    const fromStage = record.currentStage;
    store.stageTransitions[fromStage] = store.stageTransitions[fromStage] ?? {};
    store.stageTransitions[fromStage][newStage] = (store.stageTransitions[fromStage][newStage] ?? 0) + 1;

    record.currentStage = newStage;
    record.timeInCurrentStage = 0;
  } else {
    record.timeInCurrentStage = signals.daysSinceLastInteraction ?? record.timeInCurrentStage + 1;
  }

  // Predict next stage
  const transitions = stageTransitions[record.currentStage] ?? {};
  const entries = Object.entries(transitions);
  if (entries.length > 0) {
    const top = entries.sort((a, b) => b[1] - a[1])[0];
    if (top) {
      record.nextLikelyStage = top[0] as LifecycleStage;
      record.probability = top[1];
    }
  }

  // Churn risk calculation
  if (record.currentStage !== 'churned') {
    record.churnRisk = Math.min(1, record.timeInCurrentStage / 90 + (record.currentStage === 'customer' ? 0.1 : 0));
  }

  // LTV
  const stageValue: Record<LifecycleStage, number> = {
    unknown: 0,
    stalker: 0,
    lurker: 0,
    engager: 0,
    fan: 5,
    lead: 10,
    customer: 50,
    repeat: 150,
    ambassador: 200,
    churned: 0,
  };
  record.lifetimeValue = stageValue[record.currentStage] + record.touchpoints.length * 2;

  record.recommendedAction = actionsByStage[record.currentStage];

  // Add touchpoint
  if (signals.comments || signals.dms || signals.likes) {
    record.touchpoints.push({
      type: signals.dms ? 'dm' : signals.comments ? 'comment' : 'like',
      date: new Date().toISOString(),
      impact: signals.dms ? 5 : signals.comments ? 3 : 1,
    });
  }

  saveStore(store);

  semantic.storeMemory(
    `Lifecycle @${handle}: ${record.currentStage} → next: ${record.nextLikelyStage} (${(record.probability * 100).toFixed(0)}%)`,
    'learning',
    { handle, stage: record.currentStage, churnRisk: record.churnRisk },
    0.6,
  );

  log.info(
    `[AudienceLifecycle] @${handle}: ${record.currentStage} (churnRisk=${(record.churnRisk * 100).toFixed(0)}%, LTV=$${record.lifetimeValue})`,
  );
  return record;
};

// ── Get funnel stats ───────────────────────────────────────────────────────

export const getFunnelStats = (): Record<LifecycleStage, number> => {
  const store = loadStore();
  const stats: Record<string, number> = {};
  for (const r of store.records) stats[r.currentStage] = (stats[r.currentStage] ?? 0) + 1;
  return stats as Record<LifecycleStage, number>;
};

export const getAtRiskUsers = (limit = 20): LifecycleRecord[] => {
  return loadStore()
    .records.filter((r) => r.churnRisk > 0.5 && r.currentStage !== 'churned')
    .sort((a, b) => b.churnRisk - a.churnRisk)
    .slice(0, limit);
};

export const getHighValueUsers = (limit = 20): LifecycleRecord[] => {
  return loadStore()
    .records.filter((r) => ['customer', 'repeat', 'ambassador'].includes(r.currentStage))
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
    .slice(0, limit);
};

export const getRecord = (handle: string): LifecycleRecord | undefined => {
  return loadStore().records.find((r) => r.handle.toLowerCase() === handle.toLowerCase());
};
