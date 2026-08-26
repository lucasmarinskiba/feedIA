/**
 * Webhook Endpoints & Delivery System
 * POST /api/webhooks - Subscribe to events
 * GET /api/webhooks - List subscriptions
 * DELETE /api/webhooks/:id - Unsubscribe
 * POST /api/webhooks/:id/test - Test webhook
 */

import type { Request, Response } from 'express';
import { query } from '../db/client.js';
import type { Webhook } from '../db/client.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = [5000, 30000, 300000]; // 5s, 30s, 5m

/**
 * POST /api/webhooks
 * Subscribe to webhook events
 */
export const createWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { url, eventTypes } = req.body;

    if (!url || !eventTypes) {
      res.status(400).json({ error: 'url and eventTypes required' });
      return;
    }

    const webhookId = crypto.randomUUID();
    const eventTypesStr = Array.isArray(eventTypes) ? eventTypes.join(',') : eventTypes;

    await query(
      `INSERT INTO webhooks (id, user_id, url, event_types, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [webhookId, userId, url, eventTypesStr, true]
    );

    res.status(201).json({
      id: webhookId,
      url,
      eventTypes: eventTypesStr.split(','),
      isActive: true,
    });
    return;
  } catch (err) {
    console.error('[Webhook] Create error:', err);
    res.status(500).json({ error: 'Webhook creation failed' });
    return;
  }
};

/**
 * GET /api/webhooks
 * List user's webhooks
 */
export const listWebhooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const result = await query(
      'SELECT id, url, event_types, is_active, created_at, last_triggered FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const webhooks = (result.rows as Webhook[]).map((w) => ({
      id: w.id,
      url: w.url,
      eventTypes: w.event_types.split(','),
      isActive: w.is_active,
      createdAt: w.created_at,
      lastTriggered: w.last_triggered,
    }));

    res.json({ webhooks });
    return;
  } catch (err) {
    console.error('[Webhook] List error:', err);
    res.status(500).json({ error: 'List retrieval failed' });
    return;
  }
};

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
export const deleteWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    await query('DELETE FROM webhooks WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({ message: 'Webhook deleted' });
    return;
  } catch (err) {
    console.error('[Webhook] Delete error:', err);
    res.status(500).json({ error: 'Deletion failed' });
    return;
  }
};

/**
 * POST /api/webhooks/:id/test
 * Send test payload to webhook
 */
export const testWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const result = await query('SELECT * FROM webhooks WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    const webhook = result.rows[0] as Webhook;

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook' },
    };

    // Send test payload
    const delivered = await deliverWebhook(webhook.url, testPayload);

    if (delivered) {
      // Update last_triggered
      await query('UPDATE webhooks SET last_triggered = NOW() WHERE id = $1', [id]);
      res.json({ message: 'Test payload delivered', statusCode: 200 });
      return;
    } else {
      res.status(503).json({ error: 'Failed to deliver test payload', statusCode: 500 });
      return;
    }
  } catch (err) {
    console.error('[Webhook] Test error:', err);
    res.status(500).json({ error: 'Test failed' });
    return;
  }
};

/**
 * Deliver webhook payload (with retries)
 */
export const deliverWebhook = async (url: string, payload: any): Promise<boolean> => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 10000,
      });

      if (response.ok) {
        return true;
      }

      if (attempt < MAX_RETRIES && response.status >= 500) {
        // Retry on server errors
        await new Promise((r) => setTimeout(r, RETRY_DELAY[attempt]));
        continue;
      }

      return false;
    } catch (err) {
      console.warn(`[Webhook] Delivery attempt ${attempt + 1} failed:`, (err as Error).message);

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY[attempt]));
        continue;
      }

      return false;
    }
  }

  return false;
};

/**
 * Queue webhook delivery (async)
 * Called after events (campaign created, content published, etc.)
 */
export const queueWebhookDelivery = async (userId: string, eventType: string, data: any): Promise<void> => {
  try {
    // Get relevant webhooks
    const result = await query(
      `SELECT * FROM webhooks
       WHERE user_id = $1 AND is_active = true
       AND event_types LIKE $2`,
      [userId, `%${eventType}%`]
    );

    for (const webhook of result.rows as Webhook[]) {
      const deliveryId = crypto.randomUUID();

      // Create delivery record
      await query(
        `INSERT INTO webhook_deliveries (id, webhook_id, event_id, status, retry_count, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [deliveryId, webhook.id, `${eventType}:${Date.now()}`, 'pending', 0]
      );

      // Attempt delivery (async)
      attemptWebhookDelivery(deliveryId, webhook.url, { event: eventType, data }).catch((err) => {
        console.error('[Webhook] Delivery error:', err);
      });
    }
  } catch (err) {
    console.error('[Webhook] Queue error:', err);
  }
};

/**
 * Attempt delivery with retry tracking
 */
const attemptWebhookDelivery = async (deliveryId: string, url: string, payload: any): Promise<void> => {
  let retryCount = 0;

  while (retryCount <= MAX_RETRIES) {
    const delivered = await deliverWebhook(url, payload);

    if (delivered) {
      await query('UPDATE webhook_deliveries SET status = $1 WHERE id = $2', ['delivered', deliveryId]);
      return;
    }

    retryCount++;

    if (retryCount <= MAX_RETRIES) {
      const delay = RETRY_DELAY[retryCount - 1];
      await new Promise((r) => setTimeout(r, delay));

      await query(
        'UPDATE webhook_deliveries SET retry_count = $1, last_retry_at = NOW() WHERE id = $2',
        [retryCount, deliveryId]
      );
    }
  }

  // Final failure
  await query(
    `UPDATE webhook_deliveries SET status = $1, error_message = $2 WHERE id = $3`,
    ['failed', `Failed after ${MAX_RETRIES} retries`, deliveryId]
  );
};
