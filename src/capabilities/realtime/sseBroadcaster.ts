/**
 * SSE Broadcaster — Server-Sent Events para streaming unidireccional.
 * Emite eventos a clientes conectados vía SSE (simulado en memoria).
 */

import { log } from '../../agent/logger.js';

export interface SSEClient {
  id: string;
  channels: string[];
  connectedAt: string;
  lastEventId?: string;
}

export interface SSEEvent {
  id: string;
  event: string;
  data: unknown;
  channel: string;
  timestamp: string;
}

const clients = new Map<string, SSEClient>();
const eventLog: SSEEvent[] = [];
const MAX_LOG = 200;

export const connectSSE = (clientId: string, channels: string[] = ['default']): SSEClient => {
  const client: SSEClient = {
    id: clientId,
    channels,
    connectedAt: new Date().toISOString(),
  };
  clients.set(clientId, client);
  log.info(`[SSE] Client ${clientId} connected to ${channels.join(',')}`);
  return client;
};

export const disconnectSSE = (clientId: string): boolean => {
  const existed = clients.delete(clientId);
  if (existed) log.info(`[SSE] Client ${clientId} disconnected`);
  return existed;
};

export const emitEvent = (channel: string, eventName: string, data: unknown): SSEEvent => {
  const event: SSEEvent = {
    id: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    event: eventName,
    data,
    channel,
    timestamp: new Date().toISOString(),
  };

  eventLog.push(event);
  if (eventLog.length > MAX_LOG) eventLog.shift();

  let count = 0;
  for (const client of clients.values()) {
    if (client.channels.includes(channel) || client.channels.includes('*')) {
      count++;
      client.lastEventId = event.id;
      // In real implementation, write to SSE stream
    }
  }

  log.info(`[SSE] ${eventName} → ${channel} (${count} clients)`);
  return event;
};

export const getEvents = (opts?: { channel?: string; event?: string; since?: string; limit?: number }): SSEEvent[] => {
  let result = eventLog.slice();
  if (opts?.channel) result = result.filter((e) => e.channel === opts.channel);
  if (opts?.event) result = result.filter((e) => e.event === opts.event);
  if (opts?.since) result = result.filter((e) => e.timestamp >= opts.since!);
  return result.slice(-(opts?.limit ?? 50));
};

export const getClientEvents = (clientId: string, limit = 20): SSEEvent[] => {
  const client = clients.get(clientId);
  if (!client) return [];
  return eventLog.filter((e) => client.channels.includes(e.channel) || client.channels.includes('*')).slice(-limit);
};

export const getSSEStats = (): { clients: number; events: number; byChannel: Record<string, number> } => {
  const byChannel: Record<string, number> = {};
  for (const e of eventLog) {
    byChannel[e.channel] = (byChannel[e.channel] ?? 0) + 1;
  }
  return { clients: clients.size, events: eventLog.length, byChannel };
};
