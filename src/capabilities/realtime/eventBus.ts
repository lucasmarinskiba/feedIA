/**
 * Event Bus — Pub/sub interno para comunicación real-time entre módulos.
 * Reemplaza al bus legacy con tipado y persistencia opcional.
 */

import { log } from '../../agent/logger.js';

export interface BusEvent {
  id: string;
  topic: string;
  payload: unknown;
  timestamp: string;
  source: string;
  priority: number; // 1-10
}

export interface BusSubscription {
  id: string;
  topic: string;
  callback: (event: BusEvent) => void;
}

const subscribers = new Map<string, Set<BusSubscription>>();
const eventHistory: BusEvent[] = [];
const MAX_HISTORY = 500;

export const publishEvent = (
  topic: string,
  payload: unknown,
  opts?: { source?: string; priority?: number },
): BusEvent => {
  const event: BusEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    topic,
    payload,
    timestamp: new Date().toISOString(),
    source: opts?.source ?? 'system',
    priority: opts?.priority ?? 5,
  };

  eventHistory.push(event);
  if (eventHistory.length > MAX_HISTORY) eventHistory.shift();

  const subs = subscribers.get(topic);
  if (subs) {
    for (const sub of subs) {
      try {
        sub.callback(event);
      } catch (err) {
        log.warn(`[EventBus] Subscriber error on ${topic}: ${(err as Error).message}`);
      }
    }
  }

  // Also notify wildcard subscribers
  const wildcards = subscribers.get('*');
  if (wildcards) {
    for (const sub of wildcards) {
      try {
        sub.callback(event);
      } catch (err) {
        log.warn(`[EventBus] Wildcard subscriber error: ${(err as Error).message}`);
      }
    }
  }

  log.info(`[EventBus] ${event.source} → ${topic}`);
  return event;
};

export const subscribeTopic = (topic: string, callback: (event: BusEvent) => void): string => {
  const subId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (!subscribers.has(topic)) subscribers.set(topic, new Set());
  subscribers.get(topic)!.add({ id: subId, topic, callback });
  return subId;
};

export const unsubscribeTopic = (subId: string): boolean => {
  for (const subs of subscribers.values()) {
    for (const sub of subs) {
      if (sub.id === subId) {
        subs.delete(sub);
        return true;
      }
    }
  }
  return false;
};

export const getEventHistory = (opts?: {
  topic?: string;
  source?: string;
  limit?: number;
  since?: string;
}): BusEvent[] => {
  let result = eventHistory.slice();
  if (opts?.topic) result = result.filter((e) => e.topic === opts.topic);
  if (opts?.source) result = result.filter((e) => e.source === opts.source);
  if (opts?.since) result = result.filter((e) => e.timestamp >= opts.since!);
  return result.slice(-(opts?.limit ?? 50));
};

export const getTopics = (): string[] => Array.from(subscribers.keys()).filter((t) => t !== '*');

export const getSubscriberCount = (topic: string): number => subscribers.get(topic)?.size ?? 0;
