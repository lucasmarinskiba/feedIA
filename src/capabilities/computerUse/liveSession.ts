/**
 * Computer-Use Live Theater — el usuario MIRA al sistema operar
 * ─────────────────────────────────────────────────────────────────────────
 * Toma una instrucción en lenguaje natural, la convierte en un plan con el
 * planner existente y la "actúa" paso a paso EN VIVO, emitiendo por SSE cada
 * micro-evento (abrir app, mover el cursor a un punto, click, tipear letra
 * por letra, scrollear, captura). El frontend anima un cursor virtual y
 * teatro de apps, así el usuario se cruza de brazos y ve cómo trabaja.
 *
 * Sin dependencias: el "escenario" es determinista (coordenadas sintéticas
 * por gesto/target). Si en el futuro hay runtime real (Playwright), el mismo
 * canal admite eventos `screenshot` con la pantalla real.
 *
 * Pub/sub en memoria, una sala por sessionId. El router de http no cierra la
 * respuesta tras el handler → el SSE queda vivo.
 */

import type { ServerResponse } from 'node:http';
import { planComputerUse, type ComputerPlan, type ComputerAction } from './planner.js';
import { emit, on } from '../../agent/bus.js';
import { log } from '../../agent/logger.js';
import { computerUseLiveEnabled, runAnthropicComputerUse } from './anthropicDriver.js';

export type CuEvent =
  | { kind: 'session-start'; instruction: string; surface: string; steps: number; requiresApproval: boolean }
  | { kind: 'app-open'; app: string; note: string }
  | { kind: 'cursor'; x: number; y: number; label: string }
  | { kind: 'act'; step: number; gesture: string; target: string; narrate: string }
  | { kind: 'type-char'; char: string; full: string }
  | { kind: 'screenshot'; dataUri: string }
  | { kind: 'step-done'; step: number; status: 'ok' | 'skipped'; detail: string }
  | { kind: 'session-end'; completed: boolean; ok: number; total: number };

interface Session {
  id: string;
  instruction: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'done' | 'error';
  events: CuEvent[];
  peers: Set<ServerResponse>;
}

const sessions = new Map<string, Session>();
const RECENT_MAX = 30;

/* ── Integración GlassBox: mostrar "esperando aprobación" en el teatro ─── */
on('GlassBoxActionPending', (event) => {
  const corr = typeof event.payload?.['actionId'] === 'string' ? (event.payload['actionId'] as string) : '';
  if (!corr) return;
  for (const s of sessions.values()) {
    if (s.status !== 'running') continue;
    push(s, {
      kind: 'act',
      step: s.events.filter((e) => e.kind === 'act').length + 1,
      gesture: 'wait-approval',
      target: 'glassbox',
      narrate: `⏸️ Esperando aprobación del supervisor: ${event.payload?.['actionType'] ?? 'acción'}`,
    });
  }
});

on('GlassBoxActionExecuting', (event) => {
  for (const s of sessions.values()) {
    if (s.status !== 'running') continue;
    push(s, {
      kind: 'act',
      step: s.events.filter((e) => e.kind === 'act').length + 1,
      gesture: 'resume',
      target: 'glassbox',
      narrate: `▶️ Supervisor aprobó: ${event.payload?.['actionType'] ?? 'acción'} — continuando...`,
    });
  }
});

on('GlassBoxActionRejected', (event) => {
  for (const s of sessions.values()) {
    if (s.status !== 'running') continue;
    push(s, {
      kind: 'act',
      step: s.events.filter((e) => e.kind === 'act').length + 1,
      gesture: 'error',
      target: 'glassbox',
      narrate: `❌ Supervisor rechazó: ${event.payload?.['actionType'] ?? 'acción'}`,
    });
  }
});

const sse = (res: ServerResponse, event: string, data: unknown): void => {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    /* peer cerrado */
  }
};

const push = (s: Session, ev: CuEvent): void => {
  s.events.push(ev);
  if (s.events.length > 600) s.events.splice(0, s.events.length - 600);
  for (const res of s.peers) sse(res, 'cu', ev);
};

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Conecta un espectador al stream de una sesión (SSE). */
export const subscribeWatch = (sessionId: string, res: ServerResponse): boolean => {
  const s = sessions.get(sessionId);
  res.statusCode = 200;
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('connection', 'keep-alive');
  res.setHeader('access-control-allow-origin', '*');
  if (typeof (res as { flushHeaders?: () => void }).flushHeaders === 'function') {
    (res as { flushHeaders: () => void }).flushHeaders();
  }
  if (!s) {
    sse(res, 'cu', { kind: 'session-end', completed: false, ok: 0, total: 0 });
    return false;
  }
  // Replay de lo ya ocurrido (para que el que llega tarde vea el contexto).
  for (const ev of s.events) sse(res, 'cu', ev);
  if (s.status === 'running') {
    s.peers.add(res);
    const ping = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        /* cerrado */
      }
    }, 25_000);
    const cleanup = (): void => {
      clearInterval(ping);
      s.peers.delete(res);
    };
    res.on('close', cleanup);
    res.on('error', cleanup);
  }
  return true;
};

export const listWatchSessions = (): Array<{
  id: string;
  instruction: string;
  status: string;
  startedAt: string;
  steps: number;
}> =>
  [...sessions.values()]
    .slice(-RECENT_MAX)
    .reverse()
    .map((s) => ({
      id: s.id,
      instruction: s.instruction,
      status: s.status,
      startedAt: s.startedAt,
      steps: s.events.filter((e) => e.kind === 'act').length,
    }));

/* ── Escenario determinista: coordenada sintética por gesto/target ──────── */
const STAGE_W = 1000;
const STAGE_H = 620;

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const coordFor = (a: ComputerAction): { x: number; y: number } => {
  if (a.gesture === 'navigate') return { x: 380, y: 54 }; // barra de direcciones
  if (a.gesture === 'scroll') return { x: STAGE_W / 2, y: 360 };
  if (a.gesture === 'type') return { x: 300 + (hash(a.targetLabel) % 360), y: 230 };
  // click/hover/press → grilla estable a partir del label
  const hx = hash(a.targetLabel);
  const hy = hash(a.targetId + a.gesture);
  return { x: 120 + (hx % (STAGE_W - 240)), y: 130 + (hy % (STAGE_H - 220)) };
};

const appForSurface = (surface: ComputerPlan['surface']): string =>
  surface === 'instagram' ? 'Instagram' : surface === 'desktop-app' ? 'Editor de contenido' : 'FeedIA';

let _seq = 0;
const newId = (): string => `cu-${Date.now().toString(36)}-${(++_seq).toString(36)}`;

export interface WatchResult {
  sessionId: string;
  steps: number;
  surface: string;
  requiresApproval: boolean;
}

/**
 * Inicia una sesión observable. Devuelve el sessionId de inmediato y corre
 * la "actuación" en background, emitiendo eventos en tiempo real.
 */
export const startWatchSession = (
  instruction: string,
  opts: { brandId: string; speed?: number; plan?: ComputerPlan } = { brandId: 'default' },
): WatchResult => {
  // Si el caller trae un plan ya armado (ej: el guion de Canva), lo usamos
  // tal cual; si no, se planifica desde la instrucción libre.
  const plan = opts.plan ?? planComputerUse(instruction);
  const id = newId();
  const s: Session = {
    id,
    instruction,
    startedAt: new Date().toISOString(),
    status: 'running',
    events: [],
    peers: new Set(),
  };
  sessions.set(id, s);
  if (sessions.size > RECENT_MAX * 2) {
    const oldest = [...sessions.keys()][0];
    if (oldest) sessions.delete(oldest);
  }

  const speed = Math.max(0.15, Math.min(3, opts.speed ?? 1));
  const pace = (ms: number): number => Math.round(Math.min(ms, 2200) / speed);

  void (async (): Promise<void> => {
    push(s, {
      kind: 'session-start',
      instruction,
      surface: plan.surface,
      steps: plan.actions.length,
      requiresApproval: plan.requiresApproval,
    });

    // ── Computer Use REAL si está conectado y habilitado ────────────────
    if (computerUseLiveEnabled()) {
      try {
        const handled = await runAnthropicComputerUse(instruction, (ev) => push(s, ev), {});
        if (handled) {
          s.status = 'done';
          s.finishedAt = new Date().toISOString();
          for (const res of s.peers) {
            try {
              res.end();
            } catch {
              /* cerrado */
            }
          }
          s.peers.clear();
          log.success(`[CU-Theater] Sesión ${id} corrió en VIVO (Computer Use real)`);
          return;
        }
      } catch (err) {
        log.warn(`[CU-Theater] Live falló, sigo en simulación: ${(err as Error).message}`);
      }
    }

    // ── Modo simulado (siempre disponible) ──────────────────────────────
    push(s, {
      kind: 'app-open',
      app: appForSurface(plan.surface),
      note: `Abriendo ${appForSurface(plan.surface)} para: "${instruction.slice(0, 90)}"`,
    });
    await wait(pace(900));

    let ok = 0;
    let lastSurface = plan.surface;
    for (const a of plan.actions) {
      if (a.gesture === 'navigate' && a.url) {
        push(s, { kind: 'app-open', app: appForSurface(plan.surface), note: `Navegando a ${a.url}` });
      }
      // 1) mover el cursor al objetivo (el usuario lo VE desplazarse)
      const { x, y } = coordFor(a);
      push(s, { kind: 'cursor', x, y, label: a.targetLabel });
      await wait(pace(a.pacingMs * 0.6));

      // 2) ejecutar el gesto
      push(s, {
        kind: 'act',
        step: a.step,
        gesture: a.gesture,
        target: a.targetLabel,
        narrate: a.humanAction,
      });

      if (a.gesture === 'type' && a.text) {
        let acc = '';
        for (const ch of a.text.slice(0, 240)) {
          acc += ch;
          push(s, { kind: 'type-char', char: ch, full: acc });
          await wait(pace(45));
        }
      }
      await wait(pace(a.pacingMs * 0.5));
      ok += 1;
      push(s, { kind: 'step-done', step: a.step, status: 'ok', detail: a.humanAction });
      lastSurface = plan.surface;
    }

    s.status = 'done';
    s.finishedAt = new Date().toISOString();
    push(s, { kind: 'session-end', completed: true, ok, total: plan.actions.length });
    for (const res of s.peers) {
      try {
        res.end();
      } catch {
        /* cerrado */
      }
    }
    s.peers.clear();
    void lastSurface;
    emit({
      type: 'ComputerUseWatched',
      sourceAgent: 'computer-use-theater',
      priority: plan.requiresApproval ? 'high' : 'normal',
      correlationId: `cuw-${id}`,
      payload: { instruction, surface: plan.surface, steps: plan.actions.length },
    });
    log.success(`[CU-Theater] Sesión ${id} completada (${ok}/${plan.actions.length})`);
  })().catch((err) => {
    s.status = 'error';
    push(s, { kind: 'session-end', completed: false, ok: 0, total: plan.actions.length });
    log.warn(`[CU-Theater] Sesión ${id} falló: ${(err as Error).message}`);
  });

  return { sessionId: id, steps: plan.actions.length, surface: plan.surface, requiresApproval: plan.requiresApproval };
};
