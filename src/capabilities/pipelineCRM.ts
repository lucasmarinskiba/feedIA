/**
 * Pipeline CRM — Gestión de deals y pipeline de ventas
 * Sigue leads desde primer contacto hasta cierre.
 */

import { log } from '../agent/logger.js';

export type DealStage =
  | 'nuevo'
  | 'calificado'
  | 'propuesta-enviada'
  | 'negociacion'
  | 'cerrado-ganado'
  | 'cerrado-perdido';

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  source: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  notes: string[];
  history: Array<{ stage: DealStage; timestamp: string; note?: string }>;
}

const STORAGE_KEY = 'pipeline_deals';

const loadDeals = (): Deal[] => {
  try {
    const raw = process.env[STORAGE_KEY];
    return raw ? (JSON.parse(raw) as Deal[]) : [];
  } catch {
    return [];
  }
};

const saveDeals = (deals: Deal[]): void => {
  process.env[STORAGE_KEY] = JSON.stringify(deals);
};

let dealsCache: Deal[] | null = null;
const getDeals = (): Deal[] => {
  if (!dealsCache) dealsCache = loadDeals();
  return dealsCache;
};
const setDeals = (deals: Deal[]): void => {
  dealsCache = deals;
  saveDeals(deals);
};

export const addDeal = (opts: {
  title: string;
  value: number;
  stage?: DealStage;
  source?: string;
  score?: number;
}): Deal => {
  const deal: Deal = {
    id: `deal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: opts.title,
    value: opts.value,
    stage: opts.stage ?? 'nuevo',
    source: opts.source ?? 'manual',
    score: opts.score ?? 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: [],
    history: [{ stage: opts.stage ?? 'nuevo', timestamp: new Date().toISOString() }],
  };
  const deals = getDeals();
  deals.push(deal);
  setDeals(deals);
  log.info(`[Pipeline] Deal agregado: ${deal.title} ($${deal.value})`);
  return deal;
};

export const advanceDeal = (id: string, stage: DealStage, note?: string): Deal | null => {
  const deals = getDeals();
  const idx = deals.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const deal = deals[idx]!;
  deal.stage = stage;
  deal.updatedAt = new Date().toISOString();
  deal.history.push({ stage, timestamp: deal.updatedAt, note });
  if (note) deal.notes.push(note);
  if (stage === 'cerrado-ganado' || stage === 'cerrado-perdido') {
    deal.closedAt = deal.updatedAt;
  }
  setDeals(deals);
  log.info(`[Pipeline] Deal ${id} → ${stage}${note ? ` (${note})` : ''}`);
  return deal;
};

export const getDeal = (id: string): Deal | undefined => getDeals().find((d) => d.id === id);

export const listDeals = (stage?: DealStage): Deal[] => {
  const deals = getDeals();
  return stage ? deals.filter((d) => d.stage === stage) : deals;
};

export interface PipelineSummary {
  totalDeals: number;
  totalValue: number;
  winRate: number;
  avgDealSize: number;
  stages: Array<{ stage: DealStage; count: number; value: number; avgDays: number }>;
}

export const getPipelineSummary = (): PipelineSummary => {
  const deals = getDeals();
  const won = deals.filter((d) => d.stage === 'cerrado-ganado');
  const lost = deals.filter((d) => d.stage === 'cerrado-perdido');
  const closed = won.length + lost.length;

  const stages: PipelineSummary['stages'] = [
    'nuevo',
    'calificado',
    'propuesta-enviada',
    'negociacion',
    'cerrado-ganado',
    'cerrado-perdido',
  ].map((s) => {
    const stageDeals = deals.filter((d) => d.stage === s);
    const totalDays = stageDeals.reduce((sum, d) => {
      const created = new Date(d.createdAt).getTime();
      const updated = new Date(d.updatedAt).getTime();
      return sum + (updated - created) / (1000 * 60 * 60 * 24);
    }, 0);
    return {
      stage: s as DealStage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      avgDays: stageDeals.length > 0 ? totalDays / stageDeals.length : 0,
    };
  });

  return {
    totalDeals: deals.length,
    totalValue: deals.reduce((sum, d) => sum + d.value, 0),
    winRate: closed > 0 ? won.length / closed : 0,
    avgDealSize: deals.length > 0 ? deals.reduce((sum, d) => sum + d.value, 0) / deals.length : 0,
    stages,
  };
};

export const getFunnelVelocity = (): Array<{ stage: DealStage; conversionRate: number; avgDays: number }> => {
  const deals = getDeals();
  const stages: DealStage[] = ['nuevo', 'calificado', 'propuesta-enviada', 'negociacion', 'cerrado-ganado'];
  return stages.map((stage, i) => {
    const stageDeals = deals.filter((d) => d.stage === stage || d.history.some((h) => h.stage === stage));
    const nextStage = stages[i + 1];
    const nextDeals = nextStage
      ? deals.filter((d) => d.stage === nextStage || d.history.some((h) => h.stage === nextStage))
      : [];
    const totalDays = stageDeals.reduce((sum, d) => {
      const h = d.history.find((h) => h.stage === stage);
      if (!h) return sum;
      const nextH = nextStage ? d.history.find((h2) => h2.stage === nextStage) : undefined;
      const end = nextH ? new Date(nextH.timestamp).getTime() : new Date().getTime();
      return sum + (end - new Date(h.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    return {
      stage,
      conversionRate: stageDeals.length > 0 ? nextDeals.length / stageDeals.length : 0,
      avgDays: stageDeals.length > 0 ? totalDays / stageDeals.length : 0,
    };
  });
};

export const getDealsByScore = (minScore: number): Deal[] =>
  getDeals()
    .filter((d) => d.score >= minScore)
    .sort((a, b) => b.score - a.score);
