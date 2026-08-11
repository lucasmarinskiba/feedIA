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
import { getDb } from '../database/db.js';

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

    // Step 4: Persist to SQLite DB
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        post_id TEXT NOT NULL,
        value REAL NOT NULL,
        timestamp TEXT NOT NULL,
        source TEXT NOT NULL,
        fan_id TEXT,
        refunded BOOLEAN DEFAULT 0,
        recorded_at TEXT DEFAULT (datetime('now')),
        UNIQUE(account_id, post_id, timestamp)
      )
    `);

    const convId = `conv-${accountId}-${validated.postId}-${Date.now()}`;
    db.prepare(`
      INSERT INTO conversions (id, account_id, post_id, value, timestamp, source, fan_id, refunded)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      convId,
      accountId,
      validated.postId,
      validated.value,
      validated.timestamp,
      validated.source,
      validated.fanId || null,
      validated.refunded ? 1 : 0,
    );

    log.info('[real-data-sync] conversion recorded', {
      accountId,
      postId: validated.postId,
      value: validated.value,
      source: validated.source,
      id: convId,
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

    // Persist to SQLite DB
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS fan_engagement (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        fan_id TEXT NOT NULL,
        engagement_score INTEGER NOT NULL,
        last_activity TEXT NOT NULL,
        tier TEXT NOT NULL,
        total_spent REAL NOT NULL,
        status TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(account_id, fan_id)
      )
    `);

    const engId = `eng-${accountId}-${validated.fanId}`;
    db.prepare(`
      INSERT OR REPLACE INTO fan_engagement (id, account_id, fan_id, engagement_score, last_activity, tier, total_spent, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      engId,
      accountId,
      validated.fanId,
      validated.engagementScore,
      validated.lastActivity,
      validated.tier,
      validated.totalSpent,
      validated.status,
    );

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

    // Persist to SQLite DB
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS lead_signals (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        lead_id TEXT NOT NULL,
        email TEXT NOT NULL,
        score INTEGER NOT NULL,
        signals TEXT,
        stage TEXT NOT NULL,
        value REAL NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(account_id, lead_id)
      )
    `);

    const sigId = `sig-${accountId}-${validated.leadId}`;
    db.prepare(`
      INSERT OR REPLACE INTO lead_signals (id, account_id, lead_id, email, score, signals, stage, value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sigId,
      accountId,
      validated.leadId,
      validated.email,
      validated.score,
      JSON.stringify(validated.signals),
      validated.stage,
      validated.value,
    );

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
 * Fetch live metrics from SQLite DB
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
    const db = getDb();

    // Conversions (last 7 days)
    const convStmt = db.prepare(`
      SELECT id, post_id, value, timestamp, source, fan_id, refunded
      FROM conversions
      WHERE account_id = ? AND datetime(timestamp) > datetime('now', '-7 days')
      ORDER BY timestamp DESC
    `);
    const conversions = (convStmt.all(accountId) as unknown[]) ?? [];

    // Fan engagement (active fans)
    const fanStmt = db.prepare(`
      SELECT fan_id, engagement_score, last_activity, tier, total_spent, status
      FROM fan_engagement
      WHERE account_id = ?
      ORDER BY engagement_score DESC
    `);
    const fans = (fanStmt.all(accountId) as unknown[]) ?? [];

    // Lead signals (active)
    const leadStmt = db.prepare(`
      SELECT lead_id, email, score, stage, value, signals
      FROM lead_signals
      WHERE account_id = ? AND stage IN ('new', 'contacted', 'qualified')
      ORDER BY score DESC
    `);
    const leads = (leadStmt.all(accountId) as unknown[]) ?? [];

    return {
      conversions,
      fans,
      leads,
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
