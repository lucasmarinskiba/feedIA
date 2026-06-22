/**
 * Notification Center — sistema de notificaciones por usuario.
 *
 * Persiste eventos relevantes (publicación exitosa, error, scheduled ejecutado,
 * quota cerca del límite, etc) y los expone para que el frontend los lea.
 *
 * Bonus: si hay EMAIL provider configurado, dispara email para eventos críticos.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../agent/logger.js';

const NOTIF_DIR = path.resolve('data/auth/notifications');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'carousel-published'
  | 'carousel-scheduled-ran'
  | 'carousel-failed'
  | 'quota-warning'
  | 'quota-exceeded'
  | 'plan-upgraded'
  | 'brand-added'
  | 'brand-removed'
  | 'security-login';

export type NotificationPriority = 'info' | 'success' | 'warning' | 'critical';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  readAt?: string;
  emailSent?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureNotifDir = async (): Promise<void> => {
  await fs.mkdir(NOTIF_DIR, { recursive: true });
};

const notifPath = (userId: string): string => path.join(NOTIF_DIR, `${userId}.json`);

const loadNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    return JSON.parse(await fs.readFile(notifPath(userId), 'utf-8')) as Notification[];
  } catch {
    return [];
  }
};

const saveNotifications = async (userId: string, list: Notification[]): Promise<void> => {
  await ensureNotifDir();
  // Mantener últimas 200 por user
  await fs.writeFile(notifPath(userId), JSON.stringify(list.slice(-200), null, 2), 'utf-8');
};

// ── API ───────────────────────────────────────────────────────────────────────

export const createNotification = async (params: {
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> => {
  const notif: Notification = {
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: params.userId,
    type: params.type,
    priority: params.priority,
    title: params.title,
    message: params.message,
    metadata: params.metadata ?? {},
    read: false,
    createdAt: new Date().toISOString(),
  };

  const list = await loadNotifications(params.userId);
  list.push(notif);
  await saveNotifications(params.userId, list);

  // Email para criticals/warnings si hay provider
  if (params.priority === 'critical' || params.priority === 'warning') {
    void trySendEmail(notif);
  }

  log.info('[notifCenter] created', { userId: params.userId, type: params.type, priority: params.priority });
  return notif;
};

export const listNotifications = async (
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<Notification[]> => {
  const list = await loadNotifications(userId);
  let filtered = list;
  if (opts.unreadOnly) filtered = filtered.filter((n) => !n.read);
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, opts.limit ?? 50);
};

export const markAsRead = async (userId: string, notificationId: string): Promise<boolean> => {
  const list = await loadNotifications(userId);
  const notif = list.find((n) => n.id === notificationId);
  if (!notif) return false;
  notif.read = true;
  notif.readAt = new Date().toISOString();
  await saveNotifications(userId, list);
  return true;
};

export const markAllAsRead = async (userId: string): Promise<number> => {
  const list = await loadNotifications(userId);
  let count = 0;
  for (const n of list) {
    if (!n.read) {
      n.read = true;
      n.readAt = new Date().toISOString();
      count++;
    }
  }
  await saveNotifications(userId, list);
  return count;
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const list = await loadNotifications(userId);
  return list.filter((n) => !n.read).length;
};

// ── Email integration (opcional) ──────────────────────────────────────────────

const trySendEmail = async (notif: Notification): Promise<void> => {
  try {
    if ((process.env['EMAIL_PROVIDER'] ?? 'none') === 'none') return;
    const { sendEmail } = await import('../integrations/email.js');

    const { findUserById } = await import('./userAccounts.js');
    const user = await findUserById(notif.userId);
    if (!user) return;

    await sendEmail(user.email, `[FeedIA] ${notif.title}`, notif.message);

    // Marcar emailSent
    const list = await loadNotifications(notif.userId);
    const item = list.find((n) => n.id === notif.id);
    if (item) {
      item.emailSent = true;
      await saveNotifications(notif.userId, list);
    }
  } catch (err) {
    log.warn('[notifCenter] email send failed', { err: String(err) });
  }
};
