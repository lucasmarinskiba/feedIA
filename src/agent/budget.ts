/**
 * Budget Governor — gobierno de tokens y costo de LLM
 * ─────────────────────────────────────────────────────────────────────────
 * Un sistema autónomo 24/7 que llama a modelos NO puede gastar sin techo.
 * Este módulo es el "contador de tokens" del sistema:
 *
 *   • Tarifa por modelo (USD / millón de tokens, in/out).
 *   • Ledger diario persistido: gasto, llamadas, desglose por modelo.
 *   • Circuit breaker: pasado el tope diario, `canSpend()` da false y
 *     `guardBudget()` lanza BudgetExceededError. Como todo el sistema tiene
 *     fallbacks deterministas (planner/crítico/consult), degrada con gracia
 *     en vez de seguir gastando.
 *
 * Tope configurable por env LLM_DAILY_BUDGET_USD (default 5).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { sendAlert } from '../integrations/notifications.js';

export class BudgetExceededError extends Error {
  constructor(spent: number, cap: number) {
    super(
      `Presupuesto diario de LLM agotado: $${spent.toFixed(3)} / $${cap.toFixed(2)}. ` +
        'El sistema sigue operando en modo determinista (sin LLM) hasta mañana.',
    );
    this.name = 'BudgetExceededError';
  }
}

export interface LlmUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface DayLedger {
  day: string;
  spentUsd: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  byModel: Record<string, { calls: number; usd: number }>;
  alerted80?: boolean;
}

interface Store {
  current: DayLedger;
  history: Array<Omit<DayLedger, 'byModel'>>;
}

const PATH = resolve('data/runtime/budgetLedger.json');
const HISTORY_MAX = 60;

/** USD por millón de tokens [input, output]. Aproximado y conservador. */
const PRICING: Array<{ match: RegExp; in: number; out: number }> = [
  { match: /opus/i, in: 15, out: 75 },
  { match: /sonnet/i, in: 3, out: 15 },
  { match: /haiku/i, in: 0.8, out: 4 },
];
const DEFAULT_PRICE = { in: 3, out: 15 };

const priceFor = (model: string): { in: number; out: number } =>
  PRICING.find((p) => p.match.test(model)) ?? DEFAULT_PRICE;

const today = (): string => new Date().toISOString().slice(0, 10);

export const dailyCapUsd = (): number => {
  const raw = Number(process.env['LLM_DAILY_BUDGET_USD']);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
};

const emptyDay = (): DayLedger => ({
  day: today(),
  spentUsd: 0,
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  byModel: {},
  alerted80: false,
});

const read = (): Store => {
  if (!existsSync(PATH)) return { current: emptyDay(), history: [] };
  try {
    const s = JSON.parse(readFileSync(PATH, 'utf-8')) as Store;
    // Rollover de día: archiva el anterior y arranca limpio.
    if (s.current.day !== today()) {
      const c = s.current;
      if (c.calls > 0) {
        s.history.push({
          day: c.day,
          spentUsd: c.spentUsd,
          calls: c.calls,
          inputTokens: c.inputTokens,
          outputTokens: c.outputTokens,
        });
      }
      if (s.history.length > HISTORY_MAX) s.history.splice(0, s.history.length - HISTORY_MAX);
      s.current = emptyDay();
    }
    return s;
  } catch {
    return { current: emptyDay(), history: [] };
  }
};

const write = (s: Store): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

export const estimateCostUsd = (model: string, usage: LlmUsage): number => {
  const p = priceFor(model);
  const inTok = usage.input_tokens ?? 0;
  const outTok = usage.output_tokens ?? 0;
  return (inTok / 1_000_000) * p.in + (outTok / 1_000_000) * p.out;
};

/** Registra el consumo real de una llamada (lee response.usage). */
const checkBudgetAlert = (spent: number, cap: number, alerted?: boolean): boolean => {
  if (alerted || cap <= 0) return false;
  const pct = spent / cap;
  if (pct < 0.8) return false;
  void sendAlert({
    severity: 'warn',
    title: 'FeedIA: 80% del presupuesto diario de LLM consumido',
    body: `Se alcanzó el ${(pct * 100).toFixed(1)}% del presupuesto diario ($${spent.toFixed(3)} / $${cap.toFixed(2)}).`,
    metadata: { spentUsd: spent, capUsd: cap, usedPct: pct },
  });
  return true;
};

export const recordUsage = (model: string, usage: LlmUsage): number => {
  const s = read();
  const cost = estimateCostUsd(model, usage);
  s.current.spentUsd = Number((s.current.spentUsd + cost).toFixed(6));
  s.current.calls += 1;
  s.current.inputTokens += usage.input_tokens ?? 0;
  s.current.outputTokens += usage.output_tokens ?? 0;
  const m = s.current.byModel[model] ?? { calls: 0, usd: 0 };
  m.calls += 1;
  m.usd = Number((m.usd + cost).toFixed(6));
  s.current.byModel[model] = m;
  if (checkBudgetAlert(s.current.spentUsd, dailyCapUsd(), s.current.alerted80)) {
    s.current.alerted80 = true;
  }
  write(s);
  return cost;
};

export const canSpend = (): boolean => read().current.spentUsd < dailyCapUsd();

/** Lanza si el presupuesto del día está agotado. Llamar antes de cada request. */
export const guardBudget = (): void => {
  const spent = read().current.spentUsd;
  const cap = dailyCapUsd();
  if (spent >= cap) throw new BudgetExceededError(spent, cap);
};

export interface BudgetStatus {
  day: string;
  spentUsd: number;
  capUsd: number;
  remainingUsd: number;
  usedPct: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  breaker: 'open' | 'closed';
  byModel: Record<string, { calls: number; usd: number }>;
}

export const getBudgetStatus = (): BudgetStatus => {
  const { current } = read();
  const cap = dailyCapUsd();
  return {
    day: current.day,
    spentUsd: Number(current.spentUsd.toFixed(4)),
    capUsd: cap,
    remainingUsd: Number(Math.max(0, cap - current.spentUsd).toFixed(4)),
    usedPct: Number(((current.spentUsd / cap) * 100).toFixed(1)),
    calls: current.calls,
    inputTokens: current.inputTokens,
    outputTokens: current.outputTokens,
    breaker: current.spentUsd >= cap ? 'open' : 'closed',
    byModel: current.byModel,
  };
};

export const getBudgetHistory = (): Array<Omit<DayLedger, 'byModel'>> => read().history.slice().reverse();
