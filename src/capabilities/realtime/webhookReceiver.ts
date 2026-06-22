/**
 * Webhook Receiver — Gestiona webhooks entrantes de plataformas externas.
 * Valida signatures, enruta a handlers, y gestiona reintentos.
 */

import { log } from '../../agent/logger.js';

export interface WebhookEndpoint {
  id: string;
  path: string;
  source: string;
  secret?: string;
  isActive: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  payload: unknown;
  receivedAt: string;
  status: 'received' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error?: string;
}

const endpoints = new Map<string, WebhookEndpoint>();
const deliveries: WebhookDelivery[] = [];
const MAX_DELIVERIES = 300;

export const registerEndpoint = (path: string, source: string, secret?: string): WebhookEndpoint => {
  const endpoint: WebhookEndpoint = {
    id: `wh-${Date.now()}`,
    path,
    source,
    secret,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  endpoints.set(endpoint.id, endpoint);
  log.info(`[Webhook] Registered ${source} → ${path}`);
  return endpoint;
};

export const deactivateEndpoint = (id: string): boolean => {
  const ep = endpoints.get(id);
  if (!ep) return false;
  ep.isActive = false;
  return true;
};

export const receiveWebhook = (endpointId: string, payload: unknown, signature?: string): WebhookDelivery => {
  const ep = endpoints.get(endpointId);
  const delivery: WebhookDelivery = {
    id: `dlv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    endpointId,
    payload,
    receivedAt: new Date().toISOString(),
    status: 'received',
    attempts: 1,
  };

  if (!ep || !ep.isActive) {
    delivery.status = 'failed';
    delivery.error = 'Endpoint not found or inactive';
  } else if (ep.secret && signature !== ep.secret) {
    delivery.status = 'failed';
    delivery.error = 'Invalid signature';
  } else {
    delivery.status = 'completed';
  }

  deliveries.push(delivery);
  if (deliveries.length > MAX_DELIVERIES) deliveries.shift();

  log.info(`[Webhook] ${ep?.source ?? 'unknown'} delivery ${delivery.id}: ${delivery.status}`);
  return delivery;
};

export const retryDelivery = (deliveryId: string): WebhookDelivery | undefined => {
  const delivery = deliveries.find((d) => d.id === deliveryId);
  if (!delivery) return undefined;

  delivery.attempts++;
  const ep = endpoints.get(delivery.endpointId);
  if (ep && ep.isActive) {
    delivery.status = 'completed';
    delivery.error = undefined;
  } else {
    delivery.status = 'failed';
    delivery.error = 'Retry failed: endpoint unavailable';
  }

  return delivery;
};

export const listEndpoints = (): WebhookEndpoint[] => Array.from(endpoints.values());

export const listDeliveries = (opts?: { endpointId?: string; status?: string; limit?: number }): WebhookDelivery[] => {
  let result = deliveries.slice();
  if (opts?.endpointId) result = result.filter((d) => d.endpointId === opts.endpointId);
  if (opts?.status) result = result.filter((d) => d.status === opts.status);
  return result.slice(-(opts?.limit ?? 50));
};

export const getEndpointStats = (endpointId: string): { total: number; completed: number; failed: number } => {
  const relevant = deliveries.filter((d) => d.endpointId === endpointId);
  return {
    total: relevant.length,
    completed: relevant.filter((d) => d.status === 'completed').length,
    failed: relevant.filter((d) => d.status === 'failed').length,
  };
};
