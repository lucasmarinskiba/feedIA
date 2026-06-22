/**
 * Computer Use — Live Executor (optional runtime)
 * ─────────────────────────────────────────────────────────────────────────
 * Executes a ComputerPlan by literally driving cursor + keyboard through a
 * real browser, exactly like a human (click, type, scroll, navigate). Uses
 * Playwright via a *dynamic optional import* so:
 *
 *   • the project has NO hard dependency on a heavy automation runtime
 *   • the build always stays green
 *   • plan-mode (the auditable core) ALWAYS works
 *   • when an operator installs `playwright`, live execution lights up with
 *     zero code changes
 *
 * Every action is trace-logged and emitted on the bus before/after, so the
 * whole computer-use session is fully auditable. Write actions are gated by
 * the plan's requiresApproval flag — the executor refuses to run an
 * unapproved write plan unless explicitly forced.
 */

import { resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ComputerPlan, ComputerAction } from './planner.js';
import { recordTrace } from '../reasoningTrace/index.js';
import { emit } from '../../agent/bus.js';
import { actionGate } from '../../glassbox/index.js';
import { log } from '../../agent/logger.js';
import { getBestSelector } from './selectorHealth.js';

const HEADLESS = process.env['COMPUTER_USE_HEADLESS'] === 'true';
const STORAGE_STATE_PATH = resolve('data/runtime/cu-browser-state.json');

export interface ExecStepResult {
  step: number;
  targetLabel: string;
  gesture: string;
  status: 'ok' | 'skipped' | 'failed' | 'planned-only';
  detail?: string;
  durationMs: number;
}

export interface ExecResult {
  planInstruction: string;
  mode: 'live' | 'plan-only';
  runtimeAvailable: boolean;
  steps: ExecStepResult[];
  completed: boolean;
  startedAt: string;
  finishedAt: string;
}

/* ── Persistent history ──────────────────────────────────────────────────── */

const STORE = resolve('data/runtime/computerUse.json');

interface CuStore {
  runs: ExecResult[];
}

const readStore = (): CuStore => {
  if (!existsSync(STORE)) return { runs: [] };
  try {
    return JSON.parse(readFileSync(STORE, 'utf-8')) as CuStore;
  } catch {
    return { runs: [] };
  }
};
const writeStore = (s: CuStore): void => {
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify({ runs: s.runs.slice(-100) }, null, 2), 'utf-8');
};

export const listComputerRuns = (limit = 20): ExecResult[] => readStore().runs.slice(-limit).reverse();

/* ── Optional Playwright loader ──────────────────────────────────────────── */

interface BrowserLike {
  newPage: () => Promise<unknown>;
  close: () => Promise<void>;
}

const tryLoadPlaywright = async (): Promise<{ chromium: { launch: (o?: unknown) => Promise<BrowserLike> } } | null> => {
  try {
    const mod = await import(/* @vite-ignore */ 'playwright' as string).catch(() => null);
    if (mod && (mod as { chromium?: unknown }).chromium) {
      return mod as { chromium: { launch: (o?: unknown) => Promise<BrowserLike> } };
    }
    return null;
  } catch {
    return null;
  }
};

export const isLiveRuntimeAvailable = async (): Promise<boolean> => (await tryLoadPlaywright()) !== null;

/* ── Executor ────────────────────────────────────────────────────────────── */

export interface ExecOptions {
  /** Force live execution even if the plan requires approval (use with care). */
  force?: boolean;
  /** Instagram session is assumed pre-authenticated by the operator. */
  baseUrl?: string;
  brandId: string;
  correlationId?: string;
  /** Resume a previously crashed session. */
  resume?: boolean;
  /** Explicit session id (defaults to correlationId). */
  sessionId?: string;
}

/* ── Session resume persistence ──────────────────────────────────────────── */

const SESSION_DIR = resolve('data/runtime/cu-sessions');

interface SessionState {
  sessionId: string;
  correlationId?: string;
  brandId: string;
  planInstruction: string;
  stepsCompleted: ExecStepResult[];
  remainingActions: ComputerAction[];
  currentUrl?: string;
  startedAt: string;
  lastUpdatedAt: string;
  status: 'running' | 'completed' | 'failed';
}

const sessionPath = (id: string): string => resolve(SESSION_DIR, `${id}.json`);

const saveSession = (s: SessionState): void => {
  mkdirSync(SESSION_DIR, { recursive: true });
  writeFileSync(sessionPath(s.sessionId), JSON.stringify(s, null, 2), 'utf-8');
};

const loadSession = (id: string): SessionState | null => {
  const p = sessionPath(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as SessionState;
  } catch {
    return null;
  }
};

const listPendingSessions = (): SessionState[] => {
  if (!existsSync(SESSION_DIR)) return [];
  const files = readdirSync(SESSION_DIR) as string[];
  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => loadSession(f.replace('.json', '')))
    .filter((s): s is SessionState => s !== null && s.status === 'running');
};

export const getPendingSessions = listPendingSessions;

export const executePlan = async (plan: ComputerPlan, opts: ExecOptions): Promise<ExecResult> => {
  const startedAt = new Date().toISOString();
  const steps: ExecStepResult[] = [];
  let actions = plan.actions;
  let currentUrl: string | undefined;
  const sessionId = opts.sessionId ?? opts.correlationId ?? `cu-${Date.now()}`;

  // Resume mode
  if (opts.resume) {
    const prev = loadSession(sessionId);
    if (prev && prev.status === 'running' && prev.planInstruction === plan.instruction) {
      steps.push(...prev.stepsCompleted);
      actions = prev.remainingActions;
      currentUrl = prev.currentUrl;
      log.info(`[CU-Resume] Reanudando sesión ${sessionId} desde paso ${steps.length + 1}`);
    }
  }

  // Approval gate.
  if (plan.requiresApproval && !opts.force) {
    const result: ExecResult = {
      planInstruction: plan.instruction,
      mode: 'plan-only',
      runtimeAvailable: false,
      steps: plan.actions.map((a) => ({
        step: a.step,
        targetLabel: a.targetLabel,
        gesture: a.gesture,
        status: 'planned-only' as const,
        detail: 'Bloqueado: el plan requiere aprobación humana (acciones de escritura).',
        durationMs: 0,
      })),
      completed: false,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
    persistAndTrace(plan, result, opts);
    return result;
  }

  const pw = await tryLoadPlaywright();

  // Plan-only mode: runtime not installed → describe each action without doing it.
  if (!pw) {
    const result: ExecResult = {
      planInstruction: plan.instruction,
      mode: 'plan-only',
      runtimeAvailable: false,
      steps: plan.actions.map((a) => ({
        step: a.step,
        targetLabel: a.targetLabel,
        gesture: a.gesture,
        status: 'planned-only' as const,
        detail: a.humanAction,
        durationMs: 0,
      })),
      completed: true,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
    persistAndTrace(plan, result, opts);
    return result;
  }

  // Live mode.
  let browser: BrowserLike | null = null;
  let context: unknown = null;
  try {
    browser = await pw.chromium.launch({ headless: HEADLESS });
    const storageState = existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined;
    // Playwright context API (loose typing)
    context = await (browser as unknown as { newContext: (o?: unknown) => Promise<unknown> }).newContext(
      storageState ? { storageState } : {},
    );
    const page = (await (context as { newPage: () => Promise<unknown> }).newPage()) as PwPage;
    const base = opts.baseUrl ?? 'https://www.instagram.com';

    // If resuming with a saved URL, navigate there first
    if (currentUrl) {
      try {
        await page.goto(currentUrl);
      } catch {
        /* ignore navigation errors on resume */
      }
    }

    for (let idx = 0; idx < actions.length; idx++) {
      const a = actions[idx]!;
      const t0 = Date.now();
      try {
        const shotB64 = await page.screenshot({ type: 'png' }).then((b) => b.toString('base64'));
        const gateResult = await actionGate(
          `browser_${a.gesture}`,
          `${a.humanAction} (target: ${a.targetLabel})`,
          async () => {
            await runOneAction(page, base, a);
          },
          {
            source: 'computer-use-browser',
            correlationId: opts.correlationId ?? `cu-browser-${Date.now()}`,
            actionCategory: 'api_request',
            screenshot: shotB64,
          },
        );
        if (!gateResult.ok) {
          steps.push({
            step: a.step,
            targetLabel: a.targetLabel,
            gesture: a.gesture,
            status: 'failed',
            detail: `GlassBox: ${gateResult.reason ?? 'bloqueado'}`,
            durationMs: Date.now() - t0,
          });
        } else {
          await page.waitForTimeout(Math.min(a.pacingMs, 2000));
          steps.push({
            step: a.step,
            targetLabel: a.targetLabel,
            gesture: a.gesture,
            status: 'ok',
            detail: a.humanAction,
            durationMs: Date.now() - t0,
          });
        }

        // Persist session state after each successful step
        try {
          currentUrl = (page as unknown as { url: () => string }).url?.() ?? currentUrl;
        } catch {
          /* ignore */
        }
        saveSession({
          sessionId,
          correlationId: opts.correlationId,
          brandId: opts.brandId,
          planInstruction: plan.instruction,
          stepsCompleted: steps,
          remainingActions: actions.slice(idx + 1),
          currentUrl,
          startedAt,
          lastUpdatedAt: new Date().toISOString(),
          status: 'running',
        });
      } catch (err) {
        steps.push({
          step: a.step,
          targetLabel: a.targetLabel,
          gesture: a.gesture,
          status: 'failed',
          detail: (err as Error).message,
          durationMs: Date.now() - t0,
        });
        // Mark session as failed so it can be inspected
        saveSession({
          sessionId,
          correlationId: opts.correlationId,
          brandId: opts.brandId,
          planInstruction: plan.instruction,
          stepsCompleted: steps,
          remainingActions: actions.slice(idx + 1),
          currentUrl,
          startedAt,
          lastUpdatedAt: new Date().toISOString(),
          status: 'failed',
        });
      }
    }
  } catch (err) {
    steps.push({
      step: 0,
      targetLabel: 'browser',
      gesture: 'wait',
      status: 'failed',
      detail: `No se pudo lanzar el navegador: ${(err as Error).message}`,
      durationMs: 0,
    });
  } finally {
    // Persist cookies / localStorage for next session
    try {
      if (context) {
        await (context as { storageState: (o?: unknown) => Promise<unknown> }).storageState({
          path: STORAGE_STATE_PATH,
        });
      }
    } catch {
      /* ignore */
    }
    try {
      await browser?.close();
    } catch {
      /* ignore */
    }
  }

  const completed = steps.every((s) => s.status === 'ok') && steps.length === plan.actions.length;

  // Mark session completed
  saveSession({
    sessionId,
    correlationId: opts.correlationId,
    brandId: opts.brandId,
    planInstruction: plan.instruction,
    stepsCompleted: steps,
    remainingActions: [],
    currentUrl,
    startedAt,
    lastUpdatedAt: new Date().toISOString(),
    status: completed ? 'completed' : 'failed',
  });

  const result: ExecResult = {
    planInstruction: plan.instruction,
    mode: 'live',
    runtimeAvailable: true,
    steps,
    completed,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
  persistAndTrace(plan, result, opts);
  return result;
};

/** Re-run a previously interrupted session. */
export const resumeSession = async (sessionId: string): Promise<ExecResult | null> => {
  const s = loadSession(sessionId);
  if (!s || s.status !== 'running') return null;
  const { planComputerUse } = await import('./planner.js');
  const plan = planComputerUse(s.planInstruction);
  return executePlan(plan, {
    brandId: s.brandId,
    correlationId: s.correlationId,
    sessionId: s.sessionId,
    resume: true,
  });
};

/* ── Playwright page type (loose, dynamic import) ───────────────────────── */

interface PwPage {
  goto: (u: string) => Promise<unknown>;
  click: (s: string, o?: unknown) => Promise<unknown>;
  fill: (s: string, v: string) => Promise<unknown>;
  hover: (s: string) => Promise<unknown>;
  mouse: { wheel: (x: number, y: number) => Promise<unknown> };
  keyboard: { press: (k: string) => Promise<unknown> };
  screenshot: (o?: unknown) => Promise<Buffer>;
  waitForTimeout: (ms: number) => Promise<unknown>;
  waitForSelector: (s: string, o?: unknown) => Promise<unknown>;
  locator: (s: string) => {
    first: () => {
      click: (o?: unknown) => Promise<unknown>;
      fill: (v: string) => Promise<unknown>;
      hover: () => Promise<unknown>;
      scrollIntoViewIfNeeded: () => Promise<unknown>;
      boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null>;
    };
    count: () => Promise<number>;
  };
  evaluate: (fn: string, arg?: unknown) => Promise<unknown>;
}

/* ── Smart action runner with fallback selectors, wait, retry, scroll ───── */

const SELECTOR_TIMEOUT = 5_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

/* ── Post-action verification ────────────────────────────────────────────── */

const verifyAction = async (page: PwPage, a: ComputerAction): Promise<void> => {
  switch (a.gesture) {
    case 'navigate': {
      if (!a.url) return;
      const expected = a.url.replace(/^#/, '/');
      // Playwright page.url() is sync
      const url = (page as unknown as { url: () => string }).url();
      if (!url.includes(expected)) {
        throw new Error(`Navegación fallida: URL actual ${url} no contiene ${expected}`);
      }
      break;
    }
    case 'type': {
      if (!a.text) return;
      const sel = a.selectors[0];
      if (!sel) return;
      const value = (await page.evaluate(
        `(sel) => { const el = document.querySelector(sel); return (el as HTMLInputElement | HTMLTextAreaElement)?.value ?? ''; }`,
        sel,
      )) as string;
      if (!value.includes(a.text)) {
        throw new Error(`Verificación fallida: el input no contiene "${a.text}" (valor: "${value}")`);
      }
      break;
    }
    case 'click': {
      // After a click, wait briefly for a common downstream indicator (modal, toast, or URL change)
      // We try each selector as a "success indicator" with a short timeout
      const downstreamIndicators = [
        '[role="dialog"]',
        '[role="alert"]',
        'svg[aria-label="Me gusta"]',
        'svg[aria-label="Like"]',
      ];
      for (const ind of downstreamIndicators) {
        try {
          await page.waitForSelector(ind, { timeout: 1500, state: 'visible' });
          break;
        } catch {
          /* ignore */
        }
      }
      // Not all clicks produce visible indicators; don't fail if none found
      break;
    }
    default:
      break;
  }
};

const runOneAction = async (page: PwPage, base: string, a: ComputerAction): Promise<void> => {
  if (a.gesture === 'navigate' && a.url) {
    await page.goto(a.url.startsWith('http') ? a.url : `${base}${a.url.replace(/^#/, '/')}`);
    return;
  }

  // Integrate selector health: prepend best-known-working selector if available
  const best = getBestSelector(a.targetId);
  const selectors = best && !a.selectors.includes(best) ? [best, ...a.selectors] : a.selectors;

  // Try each selector with wait + retry
  let lastError: string | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    for (const sel of selectors) {
      try {
        // Wait for element to appear
        await page.waitForSelector(sel, { timeout: SELECTOR_TIMEOUT, state: 'visible' });

        // Scroll into view before interacting
        const loc = page.locator(sel).first();
        await loc.scrollIntoViewIfNeeded();

        switch (a.gesture) {
          case 'click':
          case 'double-click': {
            const opts = a.gesture === 'double-click' ? { clickCount: 2 } : undefined;
            await loc.click(opts);
            break;
          }
          case 'type': {
            await loc.fill(a.text ?? '');
            break;
          }
          case 'hover': {
            await loc.hover();
            break;
          }
          case 'scroll': {
            // Intelligent scroll: try to get element position and scroll there
            const box = await loc.boundingBox();
            if (box) {
              await page.evaluate(
                `({x,y}) => { window.scrollTo({top: y - window.innerHeight/2, behavior: 'smooth'}); }`,
                { x: box.x, y: box.y },
              );
            } else {
              await page.mouse.wheel(0, 900);
            }
            break;
          }
          case 'press': {
            await page.keyboard.press('Enter');
            break;
          }
          default:
            break;
        }
        // Post-action verification
        try {
          await verifyAction(page, a);
        } catch (verifyErr) {
          lastError = (verifyErr as Error).message;
          log.debug(`[CU-Executor] Verificación falló para ${sel}: ${lastError}`);
          continue;
        }
        return; // Success!
      } catch (err) {
        lastError = (err as Error).message;
        log.debug(`[CU-Executor] Selector falló: ${sel} — ${lastError}`);
        continue; // Try next selector
      }
    }
    // All selectors failed on this attempt → wait and retry
    if (attempt < MAX_RETRIES) {
      log.debug(`[CU-Executor] Reintentando en ${RETRY_DELAY_MS}ms (intento ${attempt + 1}/${MAX_RETRIES})`);
      await page.waitForTimeout(RETRY_DELAY_MS);
    }
  }

  throw new Error(`Todos los selectores fallaron para ${a.targetId} (${a.gesture}): ${lastError ?? 'sin detalle'}`);
};

/* ── Persistence ────────────────────────────────────────────────────────── */

const persistAndTrace = (plan: ComputerPlan, result: ExecResult, opts: ExecOptions): void => {
  const s = readStore();
  s.runs.push(result);
  writeStore(s);

  recordTrace({
    agentId: 'computer-use',
    decisionType: 'goal-decomposition',
    context: { instruction: plan.instruction, surface: plan.surface, steps: plan.actions.length },
    alternatives: [
      {
        option: result.mode,
        score: result.completed ? 100 : 50,
        reasoning: result.runtimeAvailable ? 'runtime disponible' : 'runtime no instalado — plan-only',
      },
    ],
    chosen: result.mode,
    reasoning: `Computer-use ${result.mode}: ${result.steps.filter((x) => x.status === 'ok').length}/${result.steps.length} pasos OK`,
    brandId: opts.brandId,
    correlationId: opts.correlationId,
  });

  emit({
    type: 'ComputerUseExecuted',
    sourceAgent: 'computer-use',
    priority: plan.requiresApproval ? 'high' : 'normal',
    correlationId: opts.correlationId ?? `cu-${Date.now()}`,
    payload: {
      instruction: plan.instruction,
      mode: result.mode,
      completed: result.completed,
      steps: result.steps.length,
    },
  });
};
