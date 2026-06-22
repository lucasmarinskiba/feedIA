/**
 * Push Notifier — Notificaciones push en tiempo real.
 * Encola, prioriza y despacha notificaciones a canales configurados.
 */

import { log } from '../../agent/logger.js';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  channel: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

const notificationQueue: PushNotification[] = [];
const MAX_QUEUE = 200;
const channels = new Set<string>();

export const registerChannel = (name: string): void => {
  channels.add(name);
};

export const sendPush = (
  title: string,
  body: string,
  channel: string,
  opts?: { priority?: PushNotification['priority']; actionUrl?: string; metadata?: Record<string, unknown> },
): PushNotification => {
  if (!channels.has(channel)) channels.add(channel);

  const notif: PushNotification = {
    id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    body,
    channel,
    priority: opts?.priority ?? 'normal',
    timestamp: new Date().toISOString(),
    read: false,
    actionUrl: opts?.actionUrl,
    metadata: opts?.metadata,
  };

  notificationQueue.push(notif);
  if (notificationQueue.length > MAX_QUEUE) notificationQueue.shift();

  log.info(`[Push] [${notif.priority}] ${title} → ${channel}`);
  return notif;
};

export const markRead = (id: string): boolean => {
  const notif = notificationQueue.find((n) => n.id === id);
  if (!notif) return false;
  notif.read = true;
  return true;
};

export const markAllRead = (channel?: string): number => {
  let count = 0;
  for (const n of notificationQueue) {
    if (!channel || n.channel === channel) {
      if (!n.read) count++;
      n.read = true;
    }
  }
  return count;
};

export const getNotifications = (opts?: {
  channel?: string;
  priority?: string;
  unreadOnly?: boolean;
  limit?: number;
}): PushNotification[] => {
  let result = notificationQueue.slice();
  if (opts?.channel) result = result.filter((n) => n.channel === opts.channel);
  if (opts?.priority) result = result.filter((n) => n.priority === opts.priority);
  if (opts?.unreadOnly) result = result.filter((n) => !n.read);
  return result.slice(-(opts?.limit ?? 50)).reverse();
};

export const getUnreadCount = (channel?: string): number =>
  notificationQueue.filter((n) => !n.read && (!channel || n.channel === channel)).length;

export const getChannels = (): string[] => Array.from(channels);
