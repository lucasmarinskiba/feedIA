/**
 * GlassBox Action Stream — SSE en tiempo real
 * ─────────────────────────────────────────────────────────────────────────
 * Transmite cada cambio de estado de acciones del GlassBox a espectadores
 * conectados vía Server-Sent Events. Sigue el mismo patrón que collabHub
 * y liveSession (SSE nativo sobre Node HTTP).
 */

import type { ServerResponse } from 'node:http';
import type { ActionRequest, GlassBoxMode } from './supervisor.js';
import { onModeChange } from './supervisor.js';
import { log } from '../agent/logger.js';

export type GbStreamEvent =
  | { kind: 'action-pending'; action: ActionRequest }
  | { kind: 'action-approved'; actionId: string; note?: string }
  | { kind: 'action-rejected'; actionId: string; reason?: string }
  | { kind: 'action-modified'; actionId: string; payload: Record<string, unknown> }
  | { kind: 'action-executing'; actionId: string }
  | { kind: 'action-completed'; actionId: string }
  | { kind: 'action-failed'; actionId: string; error: string }
  | { kind: 'mode-changed'; mode: GlassBoxMode; previous: GlassBoxMode }
  | { kind: 'screenshot-update'; actionId: string; dataUri: string }
  | { kind: 'ping' };

interface Peer {
  res: ServerResponse;
  pingTimer: ReturnType<typeof setInterval>;
}

const peers = new Set<Peer>();
const eventBuffer: GbStreamEvent[] = [];
const BUFFER_MAX = 300;

/* ── SSE helpers ───────────────────────────────────────────────────────── */

const sse = (res: ServerResponse, event: string, data: unknown): void => {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    /* peer cerrado */
  }
};

const broadcast = (ev: GbStreamEvent): void => {
  eventBuffer.push(ev);
  if (eventBuffer.length > BUFFER_MAX) eventBuffer.splice(0, eventBuffer.length - BUFFER_MAX);

  for (const peer of peers) {
    sse(peer.res, 'gb', ev);
  }
};

/* ── Suscripción / unsub ───────────────────────────────────────────────── */

export const subscribe = (res: ServerResponse): void => {
  res.statusCode = 200;
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('connection', 'keep-alive');
  res.setHeader('access-control-allow-origin', '*');
  if (typeof (res as { flushHeaders?: () => void }).flushHeaders === 'function') {
    (res as { flushHeaders: () => void }).flushHeaders();
  }

  // Replay de buffer reciente para que el nuevo espectador vea contexto
  for (const ev of eventBuffer) {
    sse(res, 'gb', ev);
  }

  const pingTimer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* cerrado */
    }
  }, 25_000);

  const peer: Peer = { res, pingTimer };
  peers.add(peer);

  const cleanup = (): void => {
    clearInterval(pingTimer);
    peers.delete(peer);
  };

  res.on('close', cleanup);
  res.on('error', cleanup);

  log.debug(`[GlassBoxStream] Nuevo peer conectado (${peers.size} total)`);
};

/* ── Emisores públicos ─────────────────────────────────────────────────── */

export const emitActionPending = (action: ActionRequest): void => broadcast({ kind: 'action-pending', action });

export const emitActionApproved = (actionId: string, note?: string): void =>
  broadcast({ kind: 'action-approved', actionId, note });

export const emitActionRejected = (actionId: string, reason?: string): void =>
  broadcast({ kind: 'action-rejected', actionId, reason });

export const emitActionModified = (actionId: string, payload: Record<string, unknown>): void =>
  broadcast({ kind: 'action-modified', actionId, payload });

export const emitActionExecuting = (actionId: string): void => broadcast({ kind: 'action-executing', actionId });

export const emitActionCompleted = (actionId: string): void => broadcast({ kind: 'action-completed', actionId });

export const emitActionFailed = (actionId: string, error: string): void =>
  broadcast({ kind: 'action-failed', actionId, error });

export const emitScreenshotUpdate = (actionId: string, dataUri: string): void =>
  broadcast({ kind: 'screenshot-update', actionId, dataUri });

/* ── Auto-listener de cambios de modo ──────────────────────────────────── */

onModeChange((mode, previous) => {
  broadcast({ kind: 'mode-changed', mode, previous });
});

/* ── Peer count ────────────────────────────────────────────────────────── */

export const getPeerCount = (): number => peers.size;
