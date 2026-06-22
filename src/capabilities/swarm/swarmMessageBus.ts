/**
 * Swarm Message Bus — Bus de mensajes para comunicación inter-agente.
 * Permite que agentes publiquen y suscriban mensajes en canales temáticos.
 */

import { log } from '../../agent/logger.js';

export interface SwarmMessage {
  id: string;
  channel: string;
  fromAgentId: string;
  toAgentId?: string; // undefined = broadcast
  payload: unknown;
  timestamp: string;
  priority: number; // 1-10
}

const messages: SwarmMessage[] = [];
const subscribers = new Map<string, Set<(msg: SwarmMessage) => void>>();
const MAX_MESSAGES = 500;

export const publishMessage = (
  channel: string,
  fromAgentId: string,
  payload: unknown,
  opts?: { toAgentId?: string; priority?: number },
): SwarmMessage => {
  const msg: SwarmMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    channel,
    fromAgentId,
    toAgentId: opts?.toAgentId,
    payload,
    timestamp: new Date().toISOString(),
    priority: opts?.priority ?? 5,
  };

  messages.push(msg);
  if (messages.length > MAX_MESSAGES) messages.shift();

  const subs = subscribers.get(channel);
  if (subs) {
    for (const cb of subs) {
      try {
        cb(msg);
      } catch (err) {
        log.warn(`[MessageBus] Subscriber error on ${channel}: ${(err as Error).message}`);
      }
    }
  }

  log.info(`[MessageBus] ${fromAgentId} → ${channel}${opts?.toAgentId ? ` (${opts.toAgentId})` : ''}`);
  return msg;
};

export const subscribeChannel = (channel: string, callback: (msg: SwarmMessage) => void): (() => void) => {
  if (!subscribers.has(channel)) subscribers.set(channel, new Set());
  subscribers.get(channel)!.add(callback);
  return () => subscribers.get(channel)?.delete(callback);
};

export const getMessages = (opts?: {
  channel?: string;
  fromAgentId?: string;
  toAgentId?: string;
  limit?: number;
  since?: string;
}): SwarmMessage[] => {
  let result = messages.slice();
  if (opts?.channel) result = result.filter((m) => m.channel === opts.channel);
  if (opts?.fromAgentId) result = result.filter((m) => m.fromAgentId === opts.fromAgentId);
  if (opts?.toAgentId)
    result = result.filter((m) => m.toAgentId === opts.toAgentId || (!m.toAgentId && opts.toAgentId === 'broadcast'));
  if (opts?.since) result = result.filter((m) => m.timestamp >= opts.since!);
  return result.slice(-(opts?.limit ?? 50));
};

export const getChannels = (): string[] => Array.from(new Set(messages.map((m) => m.channel)));

export const getUnreadCount = (agentId: string): number =>
  messages.filter((m) => m.toAgentId === agentId || (!m.toAgentId && m.fromAgentId !== agentId)).length;
