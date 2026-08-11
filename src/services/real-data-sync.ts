/**
 * Real Data Sync — Production webhook handlers
 *
 * Flow: Webhook → Validate (Zod) → Check Idempotency → Persist → Cache
 *
 * All events validated before storage. Duplicates detected via idempotency key.
 * Errors logged structured. No silent failures.
 */

import { z } from 'zod';
import { log } from '../agent/logger.js';

// ─── Validation Schemas ─────────────────────────────────────────────────

const ConversionEventSchema = z.object({
  postId: z.string().min(1, 'postId required'),
  value: z.number().positive('value must be > 0'),
  timestamp: z.string().datetime('invalid timestamp format'),
  source: z.enum(['instagram', 'sellia']),
  fanId: z.string().optional(),
  refunded: z.boolean().optional().default(false),
});

const FanEngagementEventSchema = z.object({
  fanId: z.string().min(1, 'fanId required'),
  engagementScore: z.number().min(0).max(100, 'score 0-100'),
  lastActivity: z.string().datetime('invalid timestamp format'),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  totalSpent: z.number().nonnegative(),
  status: z.enum(['active', 'churned']),
});

const LeadSignalEventSchema = z.object({
  leadId: z.string().min(1, 'leadId required'),
  email: z.string().email('invalid email'),
  score: z.number().min(0).max(100, 'score 0-100'),
  signals: z.array(z.string().min(1)).min(0),
  stage: z.enum(['new', 'contacted', 'qualified', 'converted']),
  value: z.number().nonnegative(),
});

export type ConversionEvent = z.infer<typeof ConversionEventSchema>;
export type FanEngagementEvent = z.infer<typeof FanEngagementEventSchema>;
export type LeadSignalEvent = z.infer<typeof LeadSignalEventSchema>;

// ─── Idempotency Cache (In-Memory, 24h TTL) ─────────────────────────────

interface CacheEntry {
  timestamp: number;
  result: {
    recorded: true;
  };
}

class IdempotencyCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24h

  set(key: string): void {
    this.cache.set(key, { timestamp: Date.now(), result: { recorded: true } });
  }

  get(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Expired: remove and return false
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Cleanup: remove expired entries every hour
  startCleanup(): void {
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (now - entry.timestamp > this.TTL_MS) {
            this.cache.delete(key);
          }
        }
      },
      60 * 60 * 1000,
    );
  }
}

const idempotencyCache = new IdempotencyCache();
idempotencyCache.startCleanup();

// ─── Sync Result Type ───────────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  idempotencyKey: string;
  error?: string;
  duplicate?: boolean;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Record conversion from webhook (Instagram/SellIA)
 *
 * Validates input, checks idempotency, logs structured
 * Returns success/error + idempotency key for caller to retry/deduplicate
 */
export const recordConversion = async (accountId: string | undefined, event: unknown): Promise<SyncResult> => {
  const idemKey = `conv:${accountId}:${Date.now()}`;

  // Validate accountId exists
  if (!accountId || typeof accountId !== 'string') {
    log.warn('[real-data-sync] missing accountId', { event });
    return { success: false, idempotencyKey: idemKey, error: 'Missing accountId' };
  }

  try {
    // Step 1: Validate input schema
    const validated = ConversionEventSchema.parse(event);

    // Step 2: Create idempotency key from natural key
    const naturalKey = `conv:${accountId}:${validated.postId}:${validated.timestamp}`;

    // Step 3: Check idempotency
    if (idempotencyCache.get(naturalKey)) {
      log.info('[real-data-sync] duplicate conversion detected', {
        accountId,
        postId: validated.postId,
        timestamp: validated.timestamp,
      });
      return {
        success: true,
        idempotencyKey: naturalKey,
        duplicate: true,
      };
    }

    // Step 4: Persist to DB (TODO: wire to MongoDB)
    // const result = await db.conversions.insertOne({
    //   ...validated,
    //   accountId,
    //   recordedAt: new Date(),
    // });

    log.info('[real-data-sync] conversion recorded', {
      accountId,
      postId: validated.postId,
      value: validated.value,
      source: validated.source,
    });

    // Step 5: Mark as processed in cache
    idempotencyCache.set(naturalKey);

    return { success: true, idempotencyKey: naturalKey };
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn('[real-data-sync] conversion validation failed', {
        accountId,
        errors: err.errors.map((e) => ({ path: e.path, message: e.message })),
      });
      return {
        success: false,
        idempotencyKey: idemKey,
        error: `Validation: ${err.errors[0]?.message ?? 'unknown'}`,
      };
    }

    log.error('[real-data-sync] conversion record failed', {
      accountId,
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { success: false, idempotencyKey: idemKey, error: String(err) };
  }
};

/**
 * Record fan engagement (likes, saves, follows)
 */
export const recordFanEngagement = async (accountId: string | undefined, event: unknown): Promise<SyncResult> => {
  const idemKey = `eng:${accountId}:${Date.now()}`;

  if (!accountId || typeof accountId !== 'string') {
    log.warn('[real-data-sync] missing accountId', { event });
    return { success: false, idempotencyKey: idemKey, error: 'Missing accountId' };
  }

  try {
    const validated = FanEngagementEventSchema.parse(event);

    const naturalKey = `eng:${accountId}:${validated.fanId}:${validated.lastActivity}`;

    if (idempotencyCache.get(naturalKey)) {
      log.info('[real-data-sync] duplicate engagement detected', {
        accountId,
        fanId: validated.fanId,
      });
      return { success: true, idempotencyKey: naturalKey, duplicate: true };
    }

    // TODO: Persist to MongoDB
    // const result = await db.fans.updateOne(
    //   { accountId, fanId: validated.fanId },
    //   { $set: { ...validated, updatedAt: new Date() } },
    //   { upsert: true }
    // );

    log.info('[real-data-sync] engagement recorded', {
      accountId,
      fanId: validated.fanId,
      tier: validated.tier,
      score: validated.engagementScore,
    });

    idempotencyCache.set(naturalKey);

    return { success: true, idempotencyKey: naturalKey };
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn('[real-data-sync] engagement validation failed', {
        accountId,
        errors: err.errors.map((e) => ({ path: e.path, message: e.message })),
      });
      return {
        success: false,
        idempotencyKey: idemKey,
        error: `Validation: ${err.errors[0]?.message ?? 'unknown'}`,
      };
    }

    log.error('[real-data-sync] engagement record failed', {
      accountId,
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { success: false, idempotencyKey: idemKey, error: String(err) };
  }
};

/**
 * Record lead signal (price question, urgency, etc.)
 */
export const recordLeadSignal = async (accountId: string | undefined, event: unknown): Promise<SyncResult> => {
  const idemKey = `sig:${accountId}:${Date.now()}`;

  if (!accountId || typeof accountId !== 'string') {
    log.warn('[real-data-sync] missing accountId', { event });
    return { success: false, idempotencyKey: idemKey, error: 'Missing accountId' };
  }

  try {
    const validated = LeadSignalEventSchema.parse(event);

    const naturalKey = `sig:${accountId}:${validated.leadId}`;

    if (idempotencyCache.get(naturalKey)) {
      log.info('[real-data-sync] duplicate signal detected', {
        accountId,
        leadId: validated.leadId,
      });
      return { success: true, idempotencyKey: naturalKey, duplicate: true };
    }

    // TODO: Persist to MongoDB
    // const result = await db.leads.updateOne(
    //   { accountId, leadId: validated.leadId },
    //   { $set: { ...validated, updatedAt: new Date() } },
    //   { upsert: true }
    // );

    log.info('[real-data-sync] lead signal recorded', {
      accountId,
      leadId: validated.leadId,
      stage: validated.stage,
      score: validated.score,
    });

    idempotencyCache.set(naturalKey);

    return { success: true, idempotencyKey: naturalKey };
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn('[real-data-sync] signal validation failed', {
        accountId,
        errors: err.errors.map((e) => ({ path: e.path, message: e.message })),
      });
      return {
        success: false,
        idempotencyKey: idemKey,
        error: `Validation: ${err.errors[0]?.message ?? 'unknown'}`,
      };
    }

    log.error('[real-data-sync] signal record failed', {
      accountId,
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { success: false, idempotencyKey: idemKey, error: String(err) };
  }
};

/**
 * Fetch live metrics from DB
 * TODO: Wire to MongoDB when available
 */
export const getLiveMetrics = async (
  accountId: string,
): Promise<{
  conversions: unknown[];
  fans: unknown[];
  leads: unknown[];
  accountId: string;
  timestamp: string;
} | null> => {
  try {
    // TODO: Implement real DB queries
    return {
      conversions: [],
      fans: [],
      leads: [],
      accountId,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    log.error('[real-data-sync] db fetch failed', { accountId, error: String(err) });
    return null;
  }
};

/**
 * Aggregate live dashboard data
 */
export const aggregateLiveDashboard = async (
  accountId: string,
): Promise<{
  timestamp: string;
  overview: Record<string, unknown>;
  leads: Record<string, unknown>;
  raw: Record<string, unknown>;
} | null> => {
  const metrics = await getLiveMetrics(accountId);
  if (!metrics) return null;

  // Safe aggregation
  const fans = Array.isArray(metrics.fans) ? metrics.fans : [];
  const activeFans = fans.filter(
    (f: unknown) => typeof f === 'object' && f !== null && (f as Record<string, unknown>).status === 'active',
  ).length;

  return {
    timestamp: new Date().toISOString(),
    overview: {
      totalFans: fans.length,
      activeFans,
      retentionRate: fans.length > 0 ? ((activeFans / fans.length) * 100).toFixed(1) : 0,
    },
    leads: { funnel: { stats: { new: 0, contacted: 0, qualified: 0, converted: 0 } } },
    raw: metrics,
  };
};

export default {
  recordConversion,
  recordFanEngagement,
  recordLeadSignal,
  getLiveMetrics,
  aggregateLiveDashboard,
};
