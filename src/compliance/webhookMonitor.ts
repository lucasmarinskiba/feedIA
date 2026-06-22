/**
 * Monitoreo de Webhook y API
 *
 * Registra el estado de los webhooks entrantes y las llamadas a la API
 * para detectar problemas de conectividad, fallos de entrega o
 * comportamientos anómalos.
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { audit } from './auditLog.js';

export interface WebhookEvent {
  id: string;
  timestamp: string;
  source: 'meta' | 'custom';
  eventType: string;
  payloadSize: number;
  signatureValid: boolean;
  processed: boolean;
  processingTimeMs: number;
  error?: string;
}

export interface ApiCall {
  id: string;
  timestamp: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'DELETE';
  statusCode: number;
  responseTimeMs: number;
  success: boolean;
  errorMessage?: string;
}

const webhookHistory: WebhookEvent[] = [];
const apiCallHistory: ApiCall[] = [];

const MAX_HISTORY = 1000;

/**
 * Registra un evento de webhook recibido.
 */
export const recordWebhookEvent = (event: Omit<WebhookEvent, 'id'>): WebhookEvent => {
  const fullEvent: WebhookEvent = {
    ...event,
    id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };

  webhookHistory.push(fullEvent);
  if (webhookHistory.length > MAX_HISTORY) {
    webhookHistory.shift();
  }

  if (!event.signatureValid) {
    log.error(`[WEBHOOK] Firma inválida: ${event.eventType}`);
    audit({
      action: 'WEBHOOK_RECEIVE',
      outcome: 'failure',
      reason: 'Firma HMAC inválida',
      dryRun: env.dryRun,
    });
  } else if (event.error) {
    log.warn(`[WEBHOOK] Error procesando ${event.eventType}: ${event.error}`);
  } else {
    log.debug(`[WEBHOOK] ${event.eventType} procesado en ${event.processingTimeMs}ms`);
  }

  return fullEvent;
};

/**
 * Registra una llamada a la API.
 */
export const recordApiCall = (call: Omit<ApiCall, 'id'>): ApiCall => {
  const fullCall: ApiCall = {
    ...call,
    id: `api-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };

  apiCallHistory.push(fullCall);
  if (apiCallHistory.length > MAX_HISTORY) {
    apiCallHistory.shift();
  }

  if (!call.success) {
    log.warn(`[API] ${call.method} ${call.endpoint} → ${call.statusCode} (${call.responseTimeMs}ms)`);
  }

  return fullCall;
};

/**
 * Analiza la salud de los webhooks recientes.
 */
export const analyzeWebhookHealth = (): {
  totalRecent: number;
  failedRecent: number;
  invalidSignatures: number;
  avgProcessingTime: number;
  healthy: boolean;
} => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recent = webhookHistory.filter((e) => new Date(e.timestamp).getTime() > oneHourAgo);

  const failed = recent.filter((e) => !!e.error || !e.signatureValid);
  const invalidSignatures = recent.filter((e) => !e.signatureValid).length;
  const avgTime = recent.length > 0 ? recent.reduce((sum, e) => sum + e.processingTimeMs, 0) / recent.length : 0;

  // Considerado no saludable si > 20% fallaron o hay firmas inválidas
  const healthy = recent.length === 0 || (failed.length / recent.length < 0.2 && invalidSignatures === 0);

  return {
    totalRecent: recent.length,
    failedRecent: failed.length,
    invalidSignatures,
    avgProcessingTime: Math.round(avgTime),
    healthy,
  };
};

/**
 * Analiza la salud de las llamadas API recientes.
 */
export const analyzeApiHealth = (): {
  totalRecent: number;
  failedRecent: number;
  avgResponseTime: number;
  rateLimitHits: number;
  healthy: boolean;
} => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recent = apiCallHistory.filter((c) => new Date(c.timestamp).getTime() > oneHourAgo);

  const failed = recent.filter((c) => !c.success);
  const rateLimitHits = recent.filter((c) => c.statusCode === 429).length;
  const avgTime = recent.length > 0 ? recent.reduce((sum, c) => sum + c.responseTimeMs, 0) / recent.length : 0;

  const healthy = recent.length === 0 || (failed.length / recent.length < 0.3 && rateLimitHits < 3);

  return {
    totalRecent: recent.length,
    failedRecent: failed.length,
    avgResponseTime: Math.round(avgTime),
    rateLimitHits,
    healthy,
  };
};

/**
 * Obtiene estadísticas de monitoreo.
 */
export const getMonitoringStats = (): {
  webhooks: ReturnType<typeof analyzeWebhookHealth>;
  api: ReturnType<typeof analyzeApiHealth>;
  overallHealthy: boolean;
} => {
  const webhooks = analyzeWebhookHealth();
  const api = analyzeApiHealth();

  return {
    webhooks,
    api,
    overallHealthy: webhooks.healthy && api.healthy,
  };
};
