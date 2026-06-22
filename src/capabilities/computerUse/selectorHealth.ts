/**
 * Selector Health — automated DOM rot detection for Instagram UI map
 * ─────────────────────────────────────────────────────────────────────────
 * Periodically validates every selector in the UI map against the live
 * Instagram DOM. Selectors that no longer resolve are flagged as "rotten"
 * so engineers get an early warning before a scheduled job starts failing.
 *
 * Results are persisted to `data/runtime/selector-health.json`.
 */

import { resolve, dirname } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { INSTAGRAM_UI, type UiTarget } from './uiMap.js';
import { log } from '../../agent/logger.js';

const HEALTH_STORE = resolve('data/runtime/selector-health.json');

export interface SelectorCheck {
  selector: string;
  ok: boolean;
  ms: number;
  error?: string;
}

export interface TargetHealth {
  targetId: string;
  label: string;
  url?: string;
  checks: SelectorCheck[];
  healthy: boolean; // true if at least one selector resolved
  bestSelector?: string;
  timestamp: string;
}

export interface HealthReport {
  runAt: string;
  totalTargets: number;
  healthyTargets: number;
  rottenTargets: number;
  targets: TargetHealth[];
}

/* ── Persistence ─────────────────────────────────────────────────────────── */

const readStore = (): { reports: HealthReport[] } => {
  if (!existsSync(HEALTH_STORE)) return { reports: [] };
  try {
    return JSON.parse(readFileSync(HEALTH_STORE, 'utf-8')) as { reports: HealthReport[] };
  } catch {
    return { reports: [] };
  }
};

const writeStore = (s: { reports: HealthReport[] }): void => {
  mkdirSync(dirname(HEALTH_STORE), { recursive: true });
  writeFileSync(HEALTH_STORE, JSON.stringify({ reports: s.reports.slice(-20) }, null, 2), 'utf-8');
};

export const getLatestHealthReport = (): HealthReport | null => {
  const s = readStore();
  return s.reports[s.reports.length - 1] ?? null;
};

/* ── Loose Playwright types (dynamic import) ─────────────────────────────── */

interface PwPage {
  goto: (u: string) => Promise<unknown>;
  waitForSelector: (s: string, o?: unknown) => Promise<unknown>;
  locator: (s: string) => { count: () => Promise<number> };
}

interface BrowserLike {
  newPage: () => Promise<unknown>;
  close: () => Promise<void>;
}

/* ── Health check per target ─────────────────────────────────────────────── */

export const checkTargetHealth = async (page: PwPage, target: UiTarget): Promise<TargetHealth> => {
  const checks: SelectorCheck[] = [];
  let bestSelector: string | undefined;

  for (const sel of target.selectors) {
    const t0 = Date.now();
    try {
      await page.waitForSelector(sel, { timeout: 3000, state: 'attached' });
      const count = await page.locator(sel).count();
      if (count > 0) {
        checks.push({ selector: sel, ok: true, ms: Date.now() - t0 });
        if (!bestSelector) bestSelector = sel;
      } else {
        checks.push({ selector: sel, ok: false, ms: Date.now() - t0, error: '0 matches' });
      }
    } catch (err) {
      checks.push({
        selector: sel,
        ok: false,
        ms: Date.now() - t0,
        error: (err as Error).message,
      });
    }
  }

  return {
    targetId: target.id,
    label: target.label,
    url: target.url,
    checks,
    healthy: checks.some((c) => c.ok),
    bestSelector,
    timestamp: new Date().toISOString(),
  };
};

/* ── Full health check (requires Playwright) ─────────────────────────────── */

export const runFullHealthCheck = async (): Promise<HealthReport> => {
  let mod: { chromium: { launch: (o?: unknown) => Promise<BrowserLike> } } | null = null;
  try {
    mod = (await import(/* @vite-ignore */ 'playwright' as string).catch(() => null)) as {
      chromium: { launch: (o?: unknown) => Promise<BrowserLike> };
    } | null;
  } catch {
    /* ignore */
  }

  if (!mod) {
    throw new Error('Playwright no está instalado — no se puede correr health check.');
  }

  const browser = await mod.chromium.launch({ headless: true });
  const page = (await browser.newPage()) as PwPage;

  const targets: TargetHealth[] = [];
  let healthyTargets = 0;
  let rottenTargets = 0;

  try {
    // Instagram requires login for most selectors; we still test structural ones on the login page.
    // For authenticated runs, set INSTAGRAM_SESSION_COOKIE env or pre-auth the browser context.
    const base = 'https://www.instagram.com';
    await page.goto(base);

    for (const target of INSTAGRAM_UI) {
      // If target has a URL, navigate there first
      if (target.url && target.url !== '/') {
        try {
          await page.goto(`${base}${target.url}`);
        } catch {
          /* some URLs may require auth; skip navigation error and test selectors anyway */
        }
      }

      const health = await checkTargetHealth(page, target);
      targets.push(health);
      if (health.healthy) healthyTargets++;
      else rottenTargets++;

      // Throttle to avoid looking like a bot
      await new Promise((r) => setTimeout(r, 200));
    }
  } finally {
    try {
      await browser.close();
    } catch {
      /* ignore */
    }
  }

  const report: HealthReport = {
    runAt: new Date().toISOString(),
    totalTargets: targets.length,
    healthyTargets,
    rottenTargets,
    targets,
  };

  const store = readStore();
  store.reports.push(report);
  writeStore(store);

  log.info(`[SelectorHealth] ${healthyTargets}/${targets.length} targets healthy, ${rottenTargets} rotten`);
  return report;
};

/* ── Quick check: is a specific target still healthy? ────────────────────── */

export const isTargetHealthy = (targetId: string): boolean | undefined => {
  const report = getLatestHealthReport();
  if (!report) return undefined;
  const t = report.targets.find((x) => x.targetId === targetId);
  return t?.healthy;
};

/** Return the best working selector for a target according to the latest report. */
export const getBestSelector = (targetId: string): string | undefined => {
  const report = getLatestHealthReport();
  if (!report) return undefined;
  const t = report.targets.find((x) => x.targetId === targetId);
  return t?.bestSelector;
};
