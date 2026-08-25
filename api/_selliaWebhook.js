/**
 * SellIA Webhooks — conversión + fan engagement tracking.
 *
 * Recibe eventos de SellIA (ventas, leads calificados, refund) y:
 * 1. Registra en Revenue Attribution (recordConversion)
 * 2. Registra en Fan Recognition (recordFanEngagement, recordPurchase)
 * 3. Emite alerts si big sale o churn
 *
 * Webhook flow: SellIA → POST /api/sellia/webhook → parse → dispatch
 */

import { recordConversion } from './_revenueAttribution.js';
import { recordFanEngagement, recordFanPurchase } from './_fanRecognition.js';
import { getProfile, saveProfile } from './_accountMemory.js';

// ── Validar firma webhook (obligatorio para production) ────────────────────────

const validateWebhookSignature = (payload, signature, secret) => {
  const crypto = require('crypto');
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (isProd && !secret) {
    throw new Error('[CRITICAL] SELLIA_WEBHOOK_SECRET must be configured in production.');
  }

  if (!secret) return true; // Dev mode: skip if not configured
  if (!signature) return false; // Reject if signature missing

  const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false; // Buffer lengths don't match
  }
};

// ── Event handlers por tipo ───────────────────────────────────────────────────

const handleSale = async (scope, event) => {
  const {
    orderId,
    customerEmail,
    totalAmount,
    currency = 'USD',
    productIds = [],
    sourcePostId,
    sourcePostTopic,
    sourcePostFormat,
    timestamp = new Date().toISOString(),
  } = event;

  if (!orderId || !totalAmount) return { ok: false, error: 'missing-order-data' };

  const accountId = scope;

  // 1) Registrar conversión en Revenue Attribution (si hay sourcePostId)
  let conversionResult = null;
  if (sourcePostId) {
    conversionResult = await recordConversion(scope, accountId, {
      postId: sourcePostId,
      value: totalAmount,
      currency,
      type: 'sale',
      orderId,
      products: productIds,
    }).catch(() => null);
  }

  // 2) Registrar fan engagement (compra)
  const fanResult = await recordFanPurchase(scope, accountId, {
    email: customerEmail,
    amount: totalAmount,
    currency,
    orderId,
    timestamp,
  }).catch(() => null);

  // 3) Log webhook event
  await logWebhookEvent(scope, accountId, 'sale', {
    orderId,
    amount: totalAmount,
    conversionRecorded: Boolean(conversionResult),
    fanEngagementRecorded: Boolean(fanResult),
  });

  return {
    ok: true,
    orderId,
    conversionId: conversionResult?.id,
    fanId: fanResult?.id,
  };
};

const handleLeadQualified = async (scope, event) => {
  const { leadId, email, score, tier, sourcePostId, timestamp = new Date().toISOString() } = event;

  if (!leadId || !email) return { ok: false, error: 'missing-lead-data' };

  const accountId = scope;

  // Registrar fan engagement (lead interacción)
  const fanResult = await recordFanEngagement(scope, accountId, {
    email,
    type: 'lead-qualified',
    leadId,
    score,
    tier,
    timestamp,
  }).catch(() => null);

  await logWebhookEvent(scope, accountId, 'lead-qualified', {
    leadId,
    email,
    tier,
    fanEngagementRecorded: Boolean(fanResult),
  });

  return {
    ok: true,
    leadId,
    fanId: fanResult?.id,
  };
};

const handleRefund = async (scope, event) => {
  const { orderId, originalConversionId, refundAmount, reason = '', timestamp = new Date().toISOString() } = event;

  if (!orderId || !refundAmount) return { ok: false, error: 'missing-refund-data' };

  const accountId = scope;
  const profile = await getProfile(scope, accountId).catch(() => ({}));

  // Marcar conversión como refundada (restar de ROI)
  const attributionStore = profile.attributionStore || { conversions: [] };
  const conversion = attributionStore.conversions?.find((c) => c.orderId === orderId);
  if (conversion) {
    conversion.refunded = true;
    conversion.refundAmount = refundAmount;
    conversion.refundReason = reason;
    conversion.refundedAt = timestamp;
  }

  await saveProfile(scope, accountId, { ...profile, attributionStore });

  await logWebhookEvent(scope, accountId, 'refund', {
    orderId,
    amount: refundAmount,
    reason,
  });

  return { ok: true, orderId, conversionId: originalConversionId };
};

const handleChurn = async (scope, event) => {
  const { fanId, email, days = 90, reason = '', timestamp = new Date().toISOString() } = event;

  if (!fanId || !email) return { ok: false, error: 'missing-fan-data' };

  const accountId = scope;
  const profile = await getProfile(scope, accountId).catch(() => ({}));

  // Marcar fan como churned
  const fanStore = profile.fanStore || { fans: [] };
  const fan = fanStore.fans?.find((f) => f.email === email);
  if (fan) {
    fan.status = 'churned';
    fan.churnedAt = timestamp;
    fan.churnReason = reason;
    fan.inactiveDays = days;
  }

  await saveProfile(scope, accountId, { ...profile, fanStore });

  await logWebhookEvent(scope, accountId, 'churn', {
    email,
    inactiveDays: days,
    reason,
  });

  return { ok: true, fanId };
};

// ── Logging de webhooks ───────────────────────────────────────────────────────

const logWebhookEvent = async (scope, accountId, eventType, details) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const webhookLog = profile.selliaWebhookLog || [];

  webhookLog.push({
    timestamp: new Date().toISOString(),
    eventType,
    details,
  });

  // Keep last 1000 events
  const trimmed = webhookLog.slice(-1000);
  await saveProfile(scope, accountId, { ...profile, selliaWebhookLog: trimmed }).catch(() => {});
};

// ── HTTP handler ──────────────────────────────────────────────────────────────

export const handleSelliaWebhook = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path !== '/api/sellia/webhook' || m !== 'POST') return false;

  const scope = ctx.userId || 'anon';
  const { event, eventType, signature } = body || {};

  // Validar webhook (si secret configurado)
  const secret = process.env.SELLIA_WEBHOOK_SECRET;
  if (!validateWebhookSignature(body, signature, secret)) {
    return json(401, { ok: false, error: 'invalid-signature' });
  }

  if (!eventType || !event) {
    return json(400, { ok: false, error: 'missing-event-data' });
  }

  let result;
  try {
    switch (eventType) {
      case 'sale':
        result = await handleSale(scope, event);
        break;
      case 'lead-qualified':
        result = await handleLeadQualified(scope, event);
        break;
      case 'refund':
        result = await handleRefund(scope, event);
        break;
      case 'churn':
        result = await handleChurn(scope, event);
        break;
      default:
        return json(400, { ok: false, error: `unknown-event-type: ${eventType}` });
    }

    return json(200, { ok: result?.ok || false, ...result });
  } catch (err) {
    return json(500, { ok: false, error: 'webhook-processing-failed' });
  }
};

// ── Sync webhook (GET /api/sellia/sync) — manual trigger para testing ────────

export const syncSelliaWebhook = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path !== '/api/sellia/sync' || m !== 'POST') return false;

  const scope = ctx.userId || 'anon';
  const { eventType, event } = body || {};

  if (!eventType || !event) {
    return json(400, { ok: false, error: 'missing-event-data' });
  }

  let result;
  try {
    switch (eventType) {
      case 'sale':
        result = await handleSale(scope, event);
        break;
      case 'lead-qualified':
        result = await handleLeadQualified(scope, event);
        break;
      case 'refund':
        result = await handleRefund(scope, event);
        break;
      case 'churn':
        result = await handleChurn(scope, event);
        break;
      default:
        return json(400, { ok: false, error: `unknown-event-type: ${eventType}` });
    }

    return json(200, { ok: result?.ok || false, ...result });
  } catch (err) {
    return json(500, { ok: false, error: 'webhook-processing-failed' });
  }
};
