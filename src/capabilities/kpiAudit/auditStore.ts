/**
 * Audit Store
 * ─────────────────────────────────────────────────────────────────────────
 * Persists weekly audit results so:
 *   • dashboard can render the score history (trend over weeks)
 *   • the system can compare current vs prior week
 *   • we can attribute KPI improvements to specific audits/adjustments
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { WeeklyAuditResult } from './weeklyAudit.js';

interface AuditStoreShape {
  audits: WeeklyAuditResult[];
}

const PATH = resolve('data/runtime/audits.json');

const readStore = (): AuditStoreShape => {
  if (!existsSync(PATH)) return { audits: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as AuditStoreShape;
  } catch {
    return { audits: [] };
  }
};

const writeStore = (s: AuditStoreShape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

export const persistAudit = (audit: WeeklyAuditResult): void => {
  const s = readStore();
  s.audits.push(audit);
  // Keep last 26 weeks (~6 months) — old data isn't useful for trend.
  if (s.audits.length > 26) s.audits.splice(0, s.audits.length - 26);
  writeStore(s);
};

export const listAudits = (limit = 12): WeeklyAuditResult[] => readStore().audits.slice(-limit).reverse();

export const getLastAudit = (): WeeklyAuditResult | null => {
  const all = readStore().audits;
  return all.length ? all[all.length - 1]! : null;
};

/** Compare the most recent audit to the previous one for trend display. */
export const getAuditTrend = (): {
  current: WeeklyAuditResult | null;
  previous: WeeklyAuditResult | null;
  deltaPct: number | null;
} => {
  const all = readStore().audits;
  const current = all[all.length - 1] ?? null;
  const previous = all.length >= 2 ? all[all.length - 2]! : null;
  const deltaPct =
    current && previous && previous.overallScore > 0
      ? +(((current.overallScore - previous.overallScore) / previous.overallScore) * 100).toFixed(1)
      : null;
  return { current, previous, deltaPct };
};
