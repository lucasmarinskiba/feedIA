/**
 * Quota Tracker — control de cuota mensual por user.
 *
 * Trackea cuántos carruseles/posts ha creado el user este mes.
 * Bloquea si supera plan.maxPostsPerMonth.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { findUserById, PLAN_LIMITS } from './userAccounts.js';

const QUOTA_DIR = path.resolve('data/auth/quota');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface QuotaUsage {
  userId: string;
  period: string; // YYYY-MM
  postsCreated: number;
  postsPublished: number;
  adsCampaigns: number;
  lastReset: string;
  warningsSent: number; // 80%, 95%, 100%
}

export interface QuotaCheck {
  allowed: boolean;
  current: number;
  max: number;
  remaining: number;
  percentUsed: number;
  reason?: string;
  warningLevel?: 'safe' | 'warning' | 'critical' | 'exceeded';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureQuotaDir = async (): Promise<void> => {
  await fs.mkdir(QUOTA_DIR, { recursive: true });
};

const quotaPath = (userId: string): string => path.join(QUOTA_DIR, `${userId}.json`);

const currentPeriod = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const loadOrInit = async (userId: string): Promise<QuotaUsage> => {
  const period = currentPeriod();
  try {
    const data = JSON.parse(await fs.readFile(quotaPath(userId), 'utf-8')) as QuotaUsage;
    // Reset si cambió el mes
    if (data.period !== period) {
      return {
        userId,
        period,
        postsCreated: 0,
        postsPublished: 0,
        adsCampaigns: 0,
        lastReset: new Date().toISOString(),
        warningsSent: 0,
      };
    }
    return data;
  } catch {
    return {
      userId,
      period,
      postsCreated: 0,
      postsPublished: 0,
      adsCampaigns: 0,
      lastReset: new Date().toISOString(),
      warningsSent: 0,
    };
  }
};

const save = async (usage: QuotaUsage): Promise<void> => {
  await ensureQuotaDir();
  await fs.writeFile(quotaPath(usage.userId), JSON.stringify(usage, null, 2), 'utf-8');
};

// ── API ───────────────────────────────────────────────────────────────────────

/** Chequea si user puede crear otro post. */
export const checkPostQuota = async (userId: string): Promise<QuotaCheck> => {
  const user = await findUserById(userId);
  if (!user) return { allowed: false, current: 0, max: 0, remaining: 0, percentUsed: 0, reason: 'User no existe' };

  const limits = PLAN_LIMITS[user.plan];
  const usage = await loadOrInit(userId);
  const max = limits.maxPostsPerMonth;

  // -1 = ilimitado
  if (max === -1)
    return { allowed: true, current: usage.postsCreated, max: -1, remaining: -1, percentUsed: 0, warningLevel: 'safe' };

  const remaining = max - usage.postsCreated;
  const percentUsed = (usage.postsCreated / max) * 100;

  let warningLevel: QuotaCheck['warningLevel'] = 'safe';
  if (percentUsed >= 100) warningLevel = 'exceeded';
  else if (percentUsed >= 95) warningLevel = 'critical';
  else if (percentUsed >= 80) warningLevel = 'warning';

  if (usage.postsCreated >= max) {
    return {
      allowed: false,
      current: usage.postsCreated,
      max,
      remaining: 0,
      percentUsed: 100,
      reason: `Quota mensual agotada (${usage.postsCreated}/${max}). Upgradeá tu plan o esperá al siguiente mes.`,
      warningLevel,
    };
  }

  return { allowed: true, current: usage.postsCreated, max, remaining, percentUsed, warningLevel };
};

/** Incrementa contador cuando user crea un carrusel. Dispara warning si pasa thresholds. */
export const incrementPostCounter = async (userId: string): Promise<QuotaUsage> => {
  const usage = await loadOrInit(userId);
  usage.postsCreated++;
  await save(usage);

  // Notificar warnings
  const user = await findUserById(userId);
  if (!user) return usage;
  const max = PLAN_LIMITS[user.plan].maxPostsPerMonth;
  if (max === -1) return usage;

  const percent = (usage.postsCreated / max) * 100;
  const { createNotification } = await import('./notificationCenter.js');

  if (percent >= 80 && percent < 95 && usage.warningsSent < 1) {
    usage.warningsSent = 1;
    await save(usage);
    await createNotification({
      userId,
      type: 'quota-warning',
      priority: 'warning',
      title: 'Quota al 80%',
      message: `Llevás ${usage.postsCreated}/${max} posts este mes. Considerá upgradear tu plan.`,
      metadata: { percent, plan: user.plan },
    });
  } else if (percent >= 95 && percent < 100 && usage.warningsSent < 2) {
    usage.warningsSent = 2;
    await save(usage);
    await createNotification({
      userId,
      type: 'quota-warning',
      priority: 'critical',
      title: 'Quota al 95% — casi agotada',
      message: `${usage.postsCreated}/${max} posts. Te quedan ${max - usage.postsCreated}.`,
      metadata: { percent, plan: user.plan },
    });
  } else if (percent >= 100 && usage.warningsSent < 3) {
    usage.warningsSent = 3;
    await save(usage);
    await createNotification({
      userId,
      type: 'quota-exceeded',
      priority: 'critical',
      title: 'Quota mensual AGOTADA',
      message: `Llegaste al máximo (${max}). No vas a poder crear más posts este mes salvo que upgradees.`,
      metadata: { plan: user.plan },
    });
  }

  return usage;
};

/** Incrementa publicaciones exitosas. */
export const incrementPublishedCounter = async (userId: string): Promise<void> => {
  const usage = await loadOrInit(userId);
  usage.postsPublished++;
  await save(usage);
};

/** Estadísticas del mes actual. */
export const getMonthlyStats = async (userId: string): Promise<QuotaUsage> => loadOrInit(userId);
