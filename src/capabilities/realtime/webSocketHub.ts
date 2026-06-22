/**
 * WebSocket Hub — Simulación de hub WebSocket para broadcast real-time.
 * En producción se conecta a un servidor WS real; aquí gestiona "conexiones" en memoria.
 */

import { log } from '../../agent/logger.js';

export interface WSConnection {
  id: string;
  clientId: string;
  connectedAt: string;
  channels: string[];
  lastPing: string;
}

export interface WSMessage {
  channel: string;
  payload: unknown;
  timestamp: string;
}

const connections = new Map<string, WSConnection>();
const messageLog: WSMessage[] = [];
const MAX_LOG = 200;

export const connectClient = (clientId: string, channels: string[] = ['default']): WSConnection => {
  const conn: WSConnection = {
    id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    clientId,
    connectedAt: new Date().toISOString(),
    channels,
    lastPing: new Date().toISOString(),
  };
  connections.set(conn.id, conn);
  log.info(`[WS] Client ${clientId} connected (${conn.id})`);
  return conn;
};

export const disconnectClient = (connId: string): boolean => {
  const existed = connections.delete(connId);
  if (existed) log.info(`[WS] ${connId} disconnected`);
  return existed;
};

export const broadcast = (channel: string, payload: unknown): number => {
  const msg: WSMessage = { channel, payload, timestamp: new Date().toISOString() };
  messageLog.push(msg);
  if (messageLog.length > MAX_LOG) messageLog.shift();

  let count = 0;
  for (const conn of connections.values()) {
    if (conn.channels.includes(channel) || conn.channels.includes('*')) {
      count++;
      // In real implementation, send via WebSocket
    }
  }

  log.info(`[WS] Broadcast to ${channel}: ${count} clients`);
  return count;
};

export const sendToClient = (connId: string, _payload: unknown): boolean => {
  const conn = connections.get(connId);
  if (!conn) return false;
  log.info(`[WS] Message to ${conn.clientId}`);
  return true;
};

export const pingClient = (connId: string): boolean => {
  const conn = connections.get(connId);
  if (!conn) return false;
  conn.lastPing = new Date().toISOString();
  return true;
};

export const getConnections = (): WSConnection[] => Array.from(connections.values());

export const getConnectionStats = (): { total: number; byChannel: Record<string, number> } => {
  const byChannel: Record<string, number> = {};
  for (const conn of connections.values()) {
    for (const ch of conn.channels) {
      byChannel[ch] = (byChannel[ch] ?? 0) + 1;
    }
  }
  return { total: connections.size, byChannel };
};

export const pruneDeadConnections = (maxIdleMs = 300000): number => {
  const now = Date.now();
  let removed = 0;
  for (const [id, conn] of connections) {
    if (now - new Date(conn.lastPing).getTime() > maxIdleMs) {
      connections.delete(id);
      removed++;
    }
  }
  if (removed > 0) log.info(`[WS] Pruned ${removed} dead connections`);
  return removed;
};
