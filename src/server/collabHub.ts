/**
 * Collab Hub — SSE para la Pizarra colaborativa en tiempo real
 * ─────────────────────────────────────────────────────────────────────────
 * Pub/sub en memoria. La SALA es `${brandId}::${boardId}` → cada pizarra
 * nombrada de cada marca tiene su propio canal colaborativo aislado.
 *
 * Soporta:
 *   • presencia (roster con color por peer)
 *   • cursores remotos
 *   • ops CRDT por-elemento (element-upsert / element-delete) + board-replace
 *   • LOCKS de elemento ("X está editando esta nota") con limpieza automática
 *     al desconectar o por timeout.
 *
 * Sin dependencias: usa el `ServerResponse` crudo. El router de http.ts no
 * cierra la respuesta tras el handler, así que el SSE queda vivo.
 */

import type { ServerResponse } from 'node:http';

export interface CollabPeer {
  id: string;
  name: string;
  color: string;
  res: ServerResponse;
  lastSeen: number;
  cursor?: { x: number; y: number };
}

interface ElementLock {
  peerId: string;
  name: string;
  color: string;
  ts: number;
}

interface Room {
  peers: Map<string, CollabPeer>;
  locks: Map<string, ElementLock>; // elementId → quién lo tiene
}

const rooms = new Map<string, Room>();
const PALETTE = ['#e1306c', '#5b9bff', '#4ade80', '#fbbf24', '#a855f7', '#22d3ee', '#ff7849'];
let _colorSeq = 0;
const LOCK_TTL = 12_000;

export const roomKey = (brandId: string, boardId: string): string => `${brandId}::${boardId}`;

const roomOf = (key: string): Room => {
  let r = rooms.get(key);
  if (!r) {
    r = { peers: new Map(), locks: new Map() };
    rooms.set(key, r);
  }
  return r;
};

const sse = (res: ServerResponse, event: string, data: unknown): void => {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    /* peer cerrado */
  }
};

const roster = (room: Room): Array<{ id: string; name: string; color: string }> =>
  [...room.peers.values()].map((p) => ({ id: p.id, name: p.name, color: p.color }));

const lockList = (room: Room): Array<{ elementId: string; peerId: string; name: string; color: string }> => {
  const now = Date.now();
  const out: Array<{ elementId: string; peerId: string; name: string; color: string }> = [];
  for (const [elementId, l] of room.locks) {
    if (now - l.ts > LOCK_TTL) {
      room.locks.delete(elementId);
      continue;
    }
    out.push({ elementId, peerId: l.peerId, name: l.name, color: l.color });
  }
  return out;
};

const broadcast = (key: string, event: string, data: unknown, exceptId?: string): void => {
  const room = rooms.get(key);
  if (!room) return;
  for (const peer of room.peers.values()) {
    if (peer.id === exceptId) continue;
    sse(peer.res, event, data);
  }
};

export const subscribe = (key: string, peerId: string, name: string, res: ServerResponse): string => {
  res.statusCode = 200;
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('connection', 'keep-alive');
  res.setHeader('access-control-allow-origin', '*');
  if (typeof (res as { flushHeaders?: () => void }).flushHeaders === 'function') {
    (res as { flushHeaders: () => void }).flushHeaders();
  }

  const room = roomOf(key);
  const color = PALETTE[_colorSeq++ % PALETTE.length]!;
  room.peers.set(peerId, { id: peerId, name: name || 'Invitado', color, res, lastSeen: Date.now() });

  sse(res, 'welcome', { you: { id: peerId, color }, roster: roster(room), locks: lockList(room) });
  broadcast(key, 'presence', { roster: roster(room) }, peerId);

  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* cerrado */
    }
  }, 25_000);

  const cleanup = (): void => {
    clearInterval(ping);
    room.peers.delete(peerId);
    // soltar todos los locks de este peer
    let changed = false;
    for (const [eid, l] of room.locks)
      if (l.peerId === peerId) {
        room.locks.delete(eid);
        changed = true;
      }
    broadcast(key, 'presence', { roster: roster(room) });
    if (changed) broadcast(key, 'locks', { locks: lockList(room) });
    if (room.peers.size === 0) rooms.delete(key);
  };
  res.on('close', cleanup);
  res.on('error', cleanup);
  return peerId;
};

export type CollabOp =
  | { kind: 'cursor'; x: number; y: number }
  | { kind: 'selection'; ids: string[] }
  | { kind: 'element-upsert'; element: unknown }
  | { kind: 'element-delete'; id: string }
  | { kind: 'board-replace'; elements: unknown[] }
  | { kind: 'lock'; elementId: string }
  | { kind: 'unlock'; elementId: string };

export const publishOp = (key: string, peerId: string, op: CollabOp): { peers: number } => {
  const room = rooms.get(key);
  if (!room) return { peers: 0 };
  const peer = room.peers.get(peerId);
  if (peer) {
    peer.lastSeen = Date.now();
    if (op.kind === 'cursor') peer.cursor = { x: op.x, y: op.y };
  }

  if (op.kind === 'lock') {
    const existing = room.locks.get(op.elementId);
    // no robar un lock vigente de otro peer
    if (existing && existing.peerId !== peerId && Date.now() - existing.ts < LOCK_TTL) {
      return { peers: room.peers.size - 1 };
    }
    room.locks.set(op.elementId, {
      peerId,
      name: peer?.name ?? '·',
      color: peer?.color ?? '#888',
      ts: Date.now(),
    });
    broadcast(key, 'locks', { locks: lockList(room) });
    return { peers: room.peers.size - 1 };
  }
  if (op.kind === 'unlock') {
    const l = room.locks.get(op.elementId);
    if (l && l.peerId === peerId) {
      room.locks.delete(op.elementId);
      broadcast(key, 'locks', { locks: lockList(room) });
    }
    return { peers: room.peers.size - 1 };
  }

  const evt = op.kind === 'cursor' ? 'cursor' : op.kind === 'selection' ? 'selection' : 'op';
  broadcast(key, evt, { from: peerId, color: peer?.color, name: peer?.name, op }, peerId);
  return { peers: room.peers.size - 1 };
};

export const presenceCount = (key: string): number => rooms.get(key)?.peers.size ?? 0;
