/**
 * Cost Guardian — gobierno financiero de FeedIA
 * ─────────────────────────────────────────────────────────────────────────
 * Unifica TODO el gasto (LLM + infraestructura) contra la recaudación real,
 * y aplica una política simple: "no gastar fortuna sin recaudar primero".
 *
 * Fuentes de gasto:
 *   - LLM (Claude + DeepSeek): ledger de budget.ts, ya metering real por request.
 *   - Externos (Railway, Backblaze, otros): registrados manualmente acá.
 *
 * Fuente de ingresos:
 *   - Manual (vos cargás montos a medida que factura) — funciona hoy.
 *   - Stripe: campo `source` ya listo para sumar un webhook más adelante,
 *     sin romper el schema ni el historial ya cargado.
 *
 * Política de dos modos:
 *   - PRE-REVENUE (sin ingresos en la ventana): tope fijo mensual conservador.
 *     Cuando no facturás, el gasto no puede crecer libre.
 *   - REVENUE-RATIO (con ingresos en la ventana): el gasto puede crecer, pero
 *     nunca por encima de un % configurable de lo recaudado. Gastás más
 *     porque recaudás mucho más — la regla que pediste, hecha código.
 *
 * Persistencia: JSON en disco, mismo patrón que budget.ts (sin dependencias
 * nuevas, sin migraciones, funciona igual en Railway con FS efímero — el
 * historial se resetea en cada deploy, igual que el ledger de LLM).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { sendAlert } from '../integrations/notifications.js';
import { log } from './logger.js';
import { getBudgetHistory, getBudgetStatus } from './budget.js';

export type CostSource = 'railway' | 'backblaze' | 'other-api' | 'manual';
export type RevenueSource = 'manual' | 'stripe';

export interface CostEntry {
  id: string;
  source: CostSource;
  amountUsd: number;
  description?: string;
  recordedAt: number;
}

export interface RevenueEntry {
  id: string;
  source: RevenueSource;
  amountUsd: number;
  description?: string;
  recordedAt: number;
}

export interface CostGuardianConfig {
  /** Costo mensual fijo de Railway en USD — vos lo actualizás cuando cambia el plan. */
  railwayMonthlyCostUsd: number;
  /** Tope de gasto mensual en modo pre-revenue (sin ingresos aún). */
  preRevenueCeilingUsd: number;
  /** % de la recaudación que el gasto puede ocupar como máximo, en modo revenue. */
  revenueRatioLimitPct: number;
  /** Última alerta enviada (para no spamear). */
  lastAlertedStatus?: 'warning' | 'critical';
}

interface Store {
  costs: CostEntry[];
  revenue: RevenueEntry[];
  config: CostGuardianConfig;
}

const PATH = resolve('data/runtime/costGuardianLedger.json');
const MAX_ENTRIES = 2000; // ~años de historial diario antes de podar

const DEFAULT_CONFIG: CostGuardianConfig = {
  railwayMonthlyCostUsd: 0,
  preRevenueCeilingUsd: 30, // conservador — pre-lanzamiento, sin usuarios pagos
  revenueRatioLimitPct: 30, // gasto ≤ 30% de lo recaudado, una vez que hay ingresos
};

const genId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const read = (): Store => {
  if (!existsSync(PATH)) return { costs: [], revenue: [], config: { ...DEFAULT_CONFIG } };
  try {
    const s = JSON.parse(readFileSync(PATH, 'utf-8')) as Store;
    return {
      costs: s.costs ?? [],
      revenue: s.revenue ?? [],
      config: { ...DEFAULT_CONFIG, ...s.config },
    };
  } catch {
    return { costs: [], revenue: [], config: { ...DEFAULT_CONFIG } };
  }
};

const write = (s: Store): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  // Podar historial si crece demasiado (FIFO, se conserva lo más reciente).
  if (s.costs.length > MAX_ENTRIES) s.costs = s.costs.slice(-MAX_ENTRIES);
  if (s.revenue.length > MAX_ENTRIES) s.revenue = s.revenue.slice(-MAX_ENTRIES);
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

/** Registra un costo externo (Railway, Backblaze, cualquier API pagada fuera de LLM). */
export const recordExternalCost = (source: CostSource, amountUsd: number, description?: string): CostEntry => {
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    throw new Error(`[CostGuardian] amountUsd inválido: ${amountUsd}`);
  }
  const s = read();
  const entry: CostEntry = { id: genId(), source, amountUsd, description, recordedAt: Date.now() };
  s.costs.push(entry);
  write(s);
  log.info('[CostGuardian] Costo registrado', { source, amountUsd, description });
  return entry;
};

/** Registra recaudación (venta, suscripción cobrada, etc). */
export const recordRevenue = (source: RevenueSource, amountUsd: number, description?: string): RevenueEntry => {
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    throw new Error(`[CostGuardian] amountUsd inválido: ${amountUsd}`);
  }
  const s = read();
  const entry: RevenueEntry = { id: genId(), source, amountUsd, description, recordedAt: Date.now() };
  s.revenue.push(entry);
  write(s);
  log.info('[CostGuardian] Ingreso registrado', { source, amountUsd, description });
  return entry;
};

export const getConfig = (): CostGuardianConfig => read().config;

export const updateConfig = (patch: Partial<Omit<CostGuardianConfig, 'lastAlertedStatus'>>): CostGuardianConfig => {
  const s = read();
  s.config = { ...s.config, ...patch };
  write(s);
  log.info('[CostGuardian] Config actualizada', patch);
  return s.config;
};

const sumInWindow = <T extends { amountUsd: number; recordedAt: number }>(entries: T[], sinceMs: number): number =>
  entries.filter((e) => e.recordedAt >= sinceMs).reduce((acc, e) => acc + e.amountUsd, 0);

const groupBySource = <T extends { source: string; amountUsd: number; recordedAt: number }>(
  entries: T[],
  sinceMs: number,
): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (e.recordedAt < sinceMs) continue;
    out[e.source] = (out[e.source] ?? 0) + e.amountUsd;
  }
  return out;
};

export interface FinancialStatus {
  windowDays: number;
  mode: 'pre-revenue' | 'revenue-ratio';
  llmSpendUsd: number;
  externalSpendUsd: number;
  railwayProratedUsd: number;
  totalSpendUsd: number;
  revenueUsd: number;
  limitUsd: number; // techo aplicable según el modo
  usedPct: number; // totalSpendUsd / limitUsd * 100
  status: 'ok' | 'warning' | 'critical';
  breakdown: {
    costBySource: Record<string, number>;
    revenueBySource: Record<string, number>;
    llmByModel: Record<string, { calls: number; usd: number }>;
  };
}

/**
 * Estado financiero unificado de los últimos `windowDays`.
 * LLM: se toma de budget.ts (día actual + historial). Externos: ledger propio.
 */
export const getFinancialStatus = (windowDays = 30): FinancialStatus => {
  const s = read();
  const sinceMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  // LLM: budget.ts guarda historial por día (spentUsd, sin desglose por modelo
  // en el histórico) + el día actual completo con desglose por modelo.
  const llmToday = getBudgetStatus();
  const llmHistory = getBudgetHistory();
  const historyWindow = llmHistory.filter((d) => new Date(`${d.day}T00:00:00Z`).getTime() >= sinceMs);
  const llmSpendUsd = llmToday.spentUsd + historyWindow.reduce((acc, d) => acc + d.spentUsd, 0);

  const externalSpendUsd = sumInWindow(s.costs, sinceMs);
  const revenueUsd = sumInWindow(s.revenue, sinceMs);

  // Railway es un costo fijo mensual — se prorratea por la ventana consultada.
  const railwayProratedUsd = (s.config.railwayMonthlyCostUsd / 30) * windowDays;

  const totalSpendUsd = llmSpendUsd + externalSpendUsd + railwayProratedUsd;

  const mode: FinancialStatus['mode'] = revenueUsd > 0 ? 'revenue-ratio' : 'pre-revenue';
  const limitUsd =
    mode === 'revenue-ratio'
      ? revenueUsd * (s.config.revenueRatioLimitPct / 100)
      : (s.config.preRevenueCeilingUsd / 30) * windowDays;

  const usedPct = limitUsd > 0 ? (totalSpendUsd / limitUsd) * 100 : totalSpendUsd > 0 ? 100 : 0;

  let status: FinancialStatus['status'] = 'ok';
  if (usedPct >= 100) status = 'critical';
  else if (usedPct >= 75) status = 'warning';

  return {
    windowDays,
    mode,
    llmSpendUsd: Number(llmSpendUsd.toFixed(4)),
    externalSpendUsd: Number(externalSpendUsd.toFixed(4)),
    railwayProratedUsd: Number(railwayProratedUsd.toFixed(4)),
    totalSpendUsd: Number(totalSpendUsd.toFixed(4)),
    revenueUsd: Number(revenueUsd.toFixed(4)),
    limitUsd: Number(limitUsd.toFixed(4)),
    usedPct: Number(usedPct.toFixed(1)),
    status,
    breakdown: {
      costBySource: groupBySource(s.costs, sinceMs),
      revenueBySource: groupBySource(s.revenue, sinceMs),
      llmByModel: llmToday.byModel,
    },
  };
};

/**
 * Evalúa la política y alerta si corresponde. Debounce: solo re-alerta si el
 * status escaló (ok→warning→critical), no en cada corrida mientras se mantiene.
 */
export const evaluateAndAlert = async (windowDays = 30): Promise<FinancialStatus> => {
  const status = getFinancialStatus(windowDays);
  const s = read();

  if ((status.status === 'warning' || status.status === 'critical') && s.config.lastAlertedStatus !== status.status) {
    const escalatedStatus = status.status;
    const modeLabel = status.mode === 'pre-revenue' ? 'PRE-LANZAMIENTO (sin ingresos)' : 'vs. recaudación';
    await sendAlert({
      severity: escalatedStatus === 'critical' ? 'crisis' : 'warn',
      title: `💰 Cost Guardian: gasto ${escalatedStatus === 'critical' ? 'supera el tope' : 'al 75%+'} (${modeLabel})`,
      body: [
        `Gasto total (${status.windowDays}d): $${status.totalSpendUsd.toFixed(2)} de $${status.limitUsd.toFixed(2)} (${status.usedPct}%)`,
        `  LLM: $${status.llmSpendUsd.toFixed(2)} · Railway: $${status.railwayProratedUsd.toFixed(2)} · Otros: $${status.externalSpendUsd.toFixed(2)}`,
        status.mode === 'revenue-ratio'
          ? `Recaudación: $${status.revenueUsd.toFixed(2)}`
          : 'Sin recaudación registrada aún.',
      ].join('\n'),
      metadata: { ...status },
    });
    s.config.lastAlertedStatus = escalatedStatus;
    write(s);
  } else if (status.status === 'ok' && s.config.lastAlertedStatus) {
    // Volvió a estar OK — resetea el debounce para la próxima escalada.
    s.config.lastAlertedStatus = undefined;
    write(s);
  }

  return status;
};

export const getCostHistory = (limit = 100): CostEntry[] => read().costs.slice(-limit).reverse();
export const getRevenueHistory = (limit = 100): RevenueEntry[] => read().revenue.slice(-limit).reverse();
