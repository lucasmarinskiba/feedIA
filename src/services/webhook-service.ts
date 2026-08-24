/**
 * Webhook Service
 * User webhook subscriptions, event delivery, retry logic
 */

import { getPool } from '../db/postgres-real.js';

export interface WebhookSubscription {
  id: string;
  userId: string;
  url: string;
  events: WebhookEventType[];
  active: boolean;
  secret: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  subscriptionId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
  timestamp: Date;
  attempts: number;
  nextRetry?: Date;
  status: 'pending' | 'delivered' | 'failed';
}

export type WebhookEventType = 'campaign_created' | 'campaign_completed' | 'roi_calculated' | 'payment_succeeded' | 'subscription_updated' | 'usage_alert';

/**
 * Initialize webhook tables
 */
export const initializeWebhookTables = async (): Promise<void> => {
  try {
    console.log('[WebhookService] Initializing webhook tables...');

    // Webhook subscriptions
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        events TEXT[] NOT NULL,
        active BOOLEAN DEFAULT true,
        secret TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, url)
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user_id ON webhook_subscriptions (user_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions (active);
    `);

    // Webhook events queue
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        attempts INTEGER DEFAULT 0,
        next_retry TIMESTAMP,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (subscription_id) REFERENCES webhook_subscriptions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_events_subscription_id ON webhook_events (subscription_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events (status);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry ON webhook_events (next_retry);
    `);

    // Webhook delivery logs
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        subscription_id TEXT NOT NULL,
        http_status INTEGER,
        response_body TEXT,
        error_message TEXT,
        delivery_at TIMESTAMP DEFAULT NOW(),
        duration_ms INTEGER,
        FOREIGN KEY (event_id) REFERENCES webhook_events(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_event_id ON webhook_delivery_logs (event_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_subscription_id ON webhook_delivery_logs (subscription_id);
    `);

    console.log('[WebhookService] Webhook tables initialized');
  } catch (err) {
    console.error('[WebhookService] Table initialization error:', err);
    throw err;
  }
};

/**
 * Register webhook subscription
 */
export const registerWebhook = async (
  userId: string,
  url: string,
  events: WebhookEventType[],
): Promise<WebhookSubscription> => {
  try {
    const id = `whsub_${userId}_${Date.now()}`;
    const secret = generateSecret();

    const result = await getPool().query(
      `INSERT INTO webhook_subscriptions (id, user_id, url, events, secret)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, url, events, secret],
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to register webhook');
    }

    console.log(`[WebhookService] Webhook registered for ${userId}`);
    return parseWebhookSubscription(result.rows[0]);
  } catch (err) {
    console.error('[WebhookService] Register error:', err);
    throw err;
  }
};

/**
 * Unregister webhook
 */
export const unregisterWebhook = async (subscriptionId: string): Promise<boolean> => {
  try {
    const result = await getPool().query(`DELETE FROM webhook_subscriptions WHERE id = $1`, [subscriptionId]);
    return (result.rowCount || 0) > 0;
  } catch (err) {
    console.error('[WebhookService] Unregister error:', err);
    return false;
  }
};

/**
 * Get user's webhooks
 */
export const getUserWebhooks = async (userId: string): Promise<WebhookSubscription[]> => {
  try {
    const result = await getPool().query(
      `SELECT * FROM webhook_subscriptions WHERE user_id = $1 AND active = true ORDER BY created_at DESC`,
      [userId],
    );

    return (result.rows || []).map(parseWebhookSubscription);
  } catch (err) {
    console.error('[WebhookService] Get webhooks error:', err);
    return [];
  }
};

/**
 * Emit webhook event
 */
export const emitWebhookEvent = async (
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
  userIds?: string[],
): Promise<void> => {
  try {
    let query = `SELECT id FROM webhook_subscriptions WHERE active = true`;
    const params: unknown[] = [];

    if (userIds && userIds.length > 0) {
      query += ` AND user_id = ANY($1)`;
      params.push(userIds);
    }

    const result = await getPool().query(query, params);
    const subscriptions = result.rows || [];

    for (const row of subscriptions) {
      const subscriptionId = String(row.id);
      const subscription = await getWebhookSubscription(subscriptionId);

      // Check if subscription is interested in this event
      if (subscription && subscription.events.includes(eventType)) {
        const eventId = `wh_${subscriptionId}_${Date.now()}`;

        await getPool().query(
          `INSERT INTO webhook_events (id, subscription_id, event_type, payload, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [eventId, subscriptionId, eventType, JSON.stringify(payload), 'pending'],
        );

        console.log(`[WebhookService] Event queued: ${eventType} for ${subscriptionId}`);
      }
    }
  } catch (err) {
    console.error('[WebhookService] Emit event error:', err);
  }
};

/**
 * Process pending webhook events (run via worker/cron)
 */
export const processPendingWebhooks = async (maxAttempts: number = 5): Promise<number> => {
  try {
    const result = await getPool().query(
      `SELECT id, subscription_id FROM webhook_events
       WHERE status = 'pending' AND (next_retry IS NULL OR next_retry <= NOW())
       AND attempts < $1
       LIMIT 100`,
      [maxAttempts],
    );

    const events = result.rows || [];
    let processed = 0;

    for (const row of events) {
      const rowObj = row as Record<string, unknown>;
      const eventId = String(rowObj.id);
      const subscriptionId = String(rowObj.subscription_id);

      const success = await deliverWebhook(eventId, subscriptionId);
      if (success) {
        processed++;
      }
    }

    console.log(`[WebhookService] Processed ${processed} pending webhooks`);
    return processed;
  } catch (err) {
    console.error('[WebhookService] Process pending error:', err);
    return 0;
  }
};

/**
 * Deliver webhook event (with retry logic)
 */
export const deliverWebhook = async (eventId: string, subscriptionId: string): Promise<boolean> => {
  try {
    // Get event
    const eventResult = await getPool().query(
      `SELECT payload, event_type, attempts FROM webhook_events WHERE id = $1`,
      [eventId],
    );

    if (!eventResult.rows || eventResult.rows.length === 0) {
      return false;
    }

    const eventRow = eventResult.rows[0] as Record<string, unknown>;

    // Get subscription
    const subscription = await getWebhookSubscription(subscriptionId);
    if (!subscription || !subscription.active) {
      return false;
    }

    // Generate signature
    const payload = JSON.stringify(eventRow.payload || {});
    const signature = generateSignature(payload, subscription.secret);

    // Deliver
    const startTime = Date.now();
    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': eventId,
          'X-Event-Type': event.event_type,
        },
        body: payload,
        timeout: 10000,
      });

      const duration = Date.now() - startTime;
      const responseBody = await response.text();

      // Log delivery
      await logWebhookDelivery(
        eventId,
        subscriptionId,
        response.status,
        responseBody,
        null,
        duration,
      );

      if (response.ok) {
        // Mark as delivered
        await getPool().query(
          `UPDATE webhook_events
           SET status = 'delivered', attempts = attempts + 1, updated_at = NOW()
           WHERE id = $1`,
          [eventId],
        );

        console.log(`[WebhookService] Event delivered: ${eventId}`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (deliveryErr) {
      const duration = Date.now() - startTime;
      const errorMsg = String(deliveryErr);

      // Log failure
      await logWebhookDelivery(eventId, subscriptionId, null, null, errorMsg, duration);

      // Update with retry
      const attempts = Number(eventRow.attempts || 0) + 1;
      const nextRetry = calculateNextRetry(attempts);

      await getPool().query(
        `UPDATE webhook_events
         SET status = $1, attempts = $2, next_retry = $3, updated_at = NOW()
         WHERE id = $4`,
        [attempts >= 5 ? 'failed' : 'pending', attempts, nextRetry, eventId],
      );

      console.warn(`[WebhookService] Event delivery failed (attempt ${attempts}): ${eventId}`);
      return false;
    }
  } catch (err) {
    console.error('[WebhookService] Deliver error:', err);
    return false;
  }
};

/**
 * Get webhook subscription
 */
const getWebhookSubscription = async (subscriptionId: string): Promise<WebhookSubscription | null> => {
  try {
    const result = await getPool().query(
      `SELECT * FROM webhook_subscriptions WHERE id = $1`,
      [subscriptionId],
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return parseWebhookSubscription(result.rows[0]);
  } catch (err) {
    console.error('[WebhookService] Get subscription error:', err);
    return null;
  }
};

/**
 * Log webhook delivery attempt
 */
const logWebhookDelivery = async (
  eventId: string,
  subscriptionId: string,
  httpStatus: number | null,
  responseBody: string | null,
  errorMessage: string | null,
  durationMs: number,
): Promise<void> => {
  try {
    const logId = `whlog_${eventId}_${Date.now()}`;

    await getPool().query(
      `INSERT INTO webhook_delivery_logs
       (id, event_id, subscription_id, http_status, response_body, error_message, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [logId, eventId, subscriptionId, httpStatus, responseBody, errorMessage, durationMs],
    );
  } catch (err) {
    console.error('[WebhookService] Log delivery error:', err);
  }
};

/**
 * Calculate next retry time (exponential backoff)
 */
function calculateNextRetry(attempt: number): Date {
  const delayMs = Math.min(300000, 1000 * Math.pow(2, attempt)); // Max 5 minutes
  return new Date(Date.now() + delayMs);
}

/**
 * Generate webhook signature (HMAC-SHA256)
 */
function generateSignature(payload: string, secret: string): string {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Generate webhook secret
 */
function generateSecret(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Parse webhook subscription from database row
 */
function parseWebhookSubscription(row: Record<string, unknown>): WebhookSubscription {
  const events = (row.events as string[]) || [];
  return {
    id: String(row.id || ''),
    userId: String(row.user_id || ''),
    url: String(row.url || ''),
    events: events as WebhookEventType[],
    active: Boolean(row.active),
    secret: String(row.secret || ''),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}
