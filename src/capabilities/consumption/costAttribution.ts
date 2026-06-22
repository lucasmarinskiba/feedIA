/**
 * Cost Attribution Dashboard de FeedIA — atribución granular de costos.
 *
 * Mientras `budget.ts` agrega el gasto total, este módulo lo desglosa por
 * dimensión: qué workflow consumió cuánto, qué agente fue el más caro,
 * qué tipo de tarea genera más tokens. Permite optimizar racionalmente.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getBudgetStatus, getBudgetHistory } from '../../agent/budget.js';

const ATTRIBUTION_PATH = join(process.cwd(), 'data', 'consumption', 'cost-attribution.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AttributionDimension = 'workflow' | 'agent' | 'taskType' | 'feature' | 'user';

export interface CostEvent {
  id: string;
  at: string; // ISO
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  dimensions: {
    workflow?: string;
    agent?: string;
    taskType?: string;
    feature?: string;
    user?: string;
  };
  metadata?: Record<string, unknown>;
}

interface AttributionStore {
  version: number;
  events: CostEvent[];
  lastUpdated: string;
}

const DEFAULT_STORE: AttributionStore = {
  version: 1,
  events: [],
  lastUpdated: new Date().toISOString(),
};

const MAX_EVENTS = 5000;

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'consumption');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): AttributionStore => {
  try {
    ensureDir();
    if (!existsSync(ATTRIBUTION_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(ATTRIBUTION_PATH, 'utf8')) as AttributionStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: AttributionStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(ATTRIBUTION_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Tracking ─────────────────────────────────────────────────────────────────

export interface TrackCostInput {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  workflow?: string;
  agent?: string;
  taskType?: string;
  feature?: string;
  user?: string;
  metadata?: Record<string, unknown>;
}

export const trackCost = (input: TrackCostInput): CostEvent => {
  const store = loadStore();
  const event: CostEvent = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    at: new Date().toISOString(),
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    costUsd: input.costUsd,
    dimensions: {
      workflow: input.workflow,
      agent: input.agent,
      taskType: input.taskType,
      feature: input.feature,
      user: input.user,
    },
    metadata: input.metadata,
  };
  store.events.push(event);
  if (store.events.length > MAX_EVENTS) store.events = store.events.slice(-MAX_EVENTS);
  saveStore(store);
  return event;
};

// ── Queries ──────────────────────────────────────────────────────────────────

export interface BreakdownEntry {
  key: string;
  totalCostUsd: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgCostPerCall: number;
  pctOfTotal: number;
}

const breakdownBy = (dimension: AttributionDimension, fromDate?: string): BreakdownEntry[] => {
  const store = loadStore();
  const events = fromDate ? store.events.filter((e) => e.at >= fromDate) : store.events;
  const groups = new Map<string, { cost: number; calls: number; inTok: number; outTok: number }>();
  let total = 0;
  for (const e of events) {
    const key = e.dimensions[dimension] ?? '(sin asignar)';
    const cur = groups.get(key) ?? { cost: 0, calls: 0, inTok: 0, outTok: 0 };
    cur.cost += e.costUsd;
    cur.calls++;
    cur.inTok += e.inputTokens;
    cur.outTok += e.outputTokens;
    groups.set(key, cur);
    total += e.costUsd;
  }
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      totalCostUsd: Number(g.cost.toFixed(4)),
      totalCalls: g.calls,
      totalInputTokens: g.inTok,
      totalOutputTokens: g.outTok,
      avgCostPerCall: g.calls > 0 ? Number((g.cost / g.calls).toFixed(4)) : 0,
      pctOfTotal: total > 0 ? Number(((g.cost / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd);
};

export const getCostBreakdownByWorkflow = (fromDate?: string): BreakdownEntry[] => breakdownBy('workflow', fromDate);
export const getCostBreakdownByAgent = (fromDate?: string): BreakdownEntry[] => breakdownBy('agent', fromDate);
export const getCostBreakdownByTaskType = (fromDate?: string): BreakdownEntry[] => breakdownBy('taskType', fromDate);
export const getCostBreakdownByFeature = (fromDate?: string): BreakdownEntry[] => breakdownBy('feature', fromDate);

// ── Time-series ──────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  costUsd: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export const getCostTimeSeries = (days = 30): TimeSeriesPoint[] => {
  const store = loadStore();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const grouped = new Map<string, { cost: number; calls: number; inTok: number; outTok: number }>();

  for (const e of store.events.filter((x) => x.at >= cutoff)) {
    const date = e.at.split('T')[0]!;
    const cur = grouped.get(date) ?? { cost: 0, calls: 0, inTok: 0, outTok: 0 };
    cur.cost += e.costUsd;
    cur.calls++;
    cur.inTok += e.inputTokens;
    cur.outTok += e.outputTokens;
    grouped.set(date, cur);
  }

  return [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, g]) => ({
      date,
      costUsd: Number(g.cost.toFixed(4)),
      calls: g.calls,
      inputTokens: g.inTok,
      outputTokens: g.outTok,
    }));
};

// ── Dashboard agregado ──────────────────────────────────────────────────────

export interface CostAttributionDashboard {
  today: {
    spentUsd: number;
    capUsd: number;
    remainingUsd: number;
    usedPct: number;
    calls: number;
    breaker: 'open' | 'closed';
  };
  last7Days: { totalCostUsd: number; totalCalls: number; avgPerDay: number };
  last30Days: { totalCostUsd: number; totalCalls: number; avgPerDay: number };
  byWorkflow: BreakdownEntry[];
  byAgent: BreakdownEntry[];
  byTaskType: BreakdownEntry[];
  byFeature: BreakdownEntry[];
  byModel: Array<{ model: string; callsToday: number; costUsdToday: number }>;
  timeSeries30Days: TimeSeriesPoint[];
  history: ReturnType<typeof getBudgetHistory>;
  topCostlyEvents: Array<{ id: string; at: string; costUsd: number; model: string; workflow?: string; agent?: string }>;
  optimizationHints: string[];
}

const summarizePeriod = (days: number): { totalCostUsd: number; totalCalls: number; avgPerDay: number } => {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const events = loadStore().events.filter((e) => e.at >= cutoff);
  const cost = events.reduce((s, e) => s + e.costUsd, 0);
  return {
    totalCostUsd: Number(cost.toFixed(4)),
    totalCalls: events.length,
    avgPerDay: Number((cost / Math.max(1, days)).toFixed(4)),
  };
};

const buildOptimizationHints = (
  byWorkflow: BreakdownEntry[],
  byAgent: BreakdownEntry[],
  byModel: BreakdownEntry[],
): string[] => {
  const hints: string[] = [];
  if (byWorkflow[0] && byWorkflow[0].pctOfTotal > 50) {
    hints.push(
      `El workflow "${byWorkflow[0].key}" representa ${byWorkflow[0].pctOfTotal}% del gasto. Considerar cachear o usar modelo más barato.`,
    );
  }
  if (byAgent[0] && byAgent[0].pctOfTotal > 40) {
    hints.push(
      `El agente "${byAgent[0].key}" concentra ${byAgent[0].pctOfTotal}% del consumo. Revisar si todas sus llamadas son necesarias.`,
    );
  }
  const opus = byModel.find((m) => m.key.toLowerCase().includes('opus'));
  if (opus && opus.pctOfTotal > 30) {
    hints.push(`Claude Opus genera ${opus.pctOfTotal}% del gasto. Para tareas no críticas usar Sonnet o Haiku.`);
  }
  if (hints.length === 0) hints.push('Distribución de costo balanceada. Sin optimizaciones urgentes.');
  return hints;
};

export const buildCostAttributionDashboard = (): CostAttributionDashboard => {
  const budget = getBudgetStatus();
  const byWorkflow = getCostBreakdownByWorkflow();
  const byAgent = getCostBreakdownByAgent();
  const byTaskType = getCostBreakdownByTaskType();
  const byFeature = getCostBreakdownByFeature();
  const modelBreakdown = Object.entries(budget.byModel).map(([model, m]) => ({
    model,
    callsToday: m.calls,
    costUsdToday: Number(m.usd.toFixed(4)),
  }));

  const events = loadStore().events;
  const topCostly = [...events]
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      at: e.at,
      costUsd: Number(e.costUsd.toFixed(4)),
      model: e.model,
      workflow: e.dimensions.workflow,
      agent: e.dimensions.agent,
    }));

  const modelHintBreakdown: BreakdownEntry[] = modelBreakdown.map((m) => ({
    key: m.model,
    totalCostUsd: m.costUsdToday,
    totalCalls: m.callsToday,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    avgCostPerCall: m.callsToday > 0 ? m.costUsdToday / m.callsToday : 0,
    pctOfTotal: budget.spentUsd > 0 ? (m.costUsdToday / budget.spentUsd) * 100 : 0,
  }));

  return {
    today: {
      spentUsd: budget.spentUsd,
      capUsd: budget.capUsd,
      remainingUsd: budget.remainingUsd,
      usedPct: budget.usedPct,
      calls: budget.calls,
      breaker: budget.breaker,
    },
    last7Days: summarizePeriod(7),
    last30Days: summarizePeriod(30),
    byWorkflow: byWorkflow.slice(0, 15),
    byAgent: byAgent.slice(0, 15),
    byTaskType: byTaskType.slice(0, 15),
    byFeature: byFeature.slice(0, 15),
    byModel: modelBreakdown,
    timeSeries30Days: getCostTimeSeries(30),
    history: getBudgetHistory(),
    topCostlyEvents: topCostly,
    optimizationHints: buildOptimizationHints(byWorkflow, byAgent, modelHintBreakdown),
  };
};

export const getRecentEvents = (limit = 50): CostEvent[] => loadStore().events.slice(-limit).reverse();

export const exportAttributionState = (): AttributionStore => loadStore();
