/**
 * CapCut Webhook Handler — recibe assets refinados desde Make/n8n/CapCut desktop.
 *
 * Flujo:
 * 1. `requestCapCutEnhancement(input)` envía webhook firmado con requestId.
 * 2. El flujo de automatización edita el video en CapCut y POSTea el resultado a
 *    `/api/webhook/capcut` con la firma en `X-CapCut-Signature`.
 * 3. Se resuelve la promesa pendiente y se devuelve la URL del video refinado.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';

export interface CapCutEnhancementInput {
  requestId: string;
  videoUrl: string;
  caption?: string;
  captions?: string[];
  recipe?: 'capcut-auto-captions' | 'capcut-beat-sync' | 'capcut-add-b-roll' | 'capcut-color-grading' | 'capcut-export-1080';
  webhookReturnUrl?: string;
}

export interface CapCutEnhancementResult {
  ok: boolean;
  requestId: string;
  refinedUrl?: string;
  provider: string;
  error?: string;
}

export interface CapCutWebhookPayload {
  requestId: string;
  refinedUrl?: string;
  error?: string;
}

const CAPCUT_WEBHOOK_SECRET = process.env['CAPCUT_WEBHOOK_SECRET'] ?? '';
const CAPCUT_WEBHOOK_URL = process.env['CAPCUT_WEBHOOK_URL'] ?? '';

const pending = new Map<
  string,
  {
    resolve: (value: CapCutEnhancementResult) => void;
    reject: (reason?: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

const signPayload = (body: string, secret: string): string =>
  createHmac('sha256', secret).update(body, 'utf8').digest('hex');

const resolveWebhookUrl = (): string | null => {
  if (CAPCUT_WEBHOOK_URL) return CAPCUT_WEBHOOK_URL;
  if (env.automation.makeWebhook) return env.automation.makeWebhook;
  if (env.automation.n8nWebhook) return env.automation.n8nWebhook;
  if (env.automation.zapierWebhook) return env.automation.zapierWebhook;
  return null;
};

const sendCapCutWebhook = async (payload: WebhookPayload): Promise<boolean> => {
  const url = resolveWebhookUrl();
  if (!url) {
    log.warn('[CapCutWebhook] No hay webhook configurado (CAPCUT_WEBHOOK_URL ni MAKE/N8N/ZAPIER_WEBHOOK_URL)');
    return false;
  }

  if (env.dryRun) {
    log.info(`[CapCutWebhook] DRY_RUN: dispararía ${url} con evento "${payload.event}"`);
    return true;
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (CAPCUT_WEBHOOK_SECRET) {
    headers['x-capcut-signature'] = signPayload(body, CAPCUT_WEBHOOK_SECRET);
  }

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) {
      log.error(`[CapCutWebhook] Webhook respondió ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    log.error(`[CapCutWebhook] Error enviando webhook: ${(err as Error).message}`);
    return false;
  }
};

export const requestCapCutEnhancement = async (
  input: CapCutEnhancementInput,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<CapCutEnhancementResult> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(input.requestId);
      resolve({
        ok: false,
        requestId: input.requestId,
        provider: 'capcut',
        error: `Timeout esperando respuesta de CapCut (${timeoutMs}ms)`,
      });
    }, timeoutMs);

    pending.set(input.requestId, { resolve, reject, timeout });

    if (env.dryRun) {
      log.info(`[CapCutWebhook] DRY_RUN: simulando refinado para ${input.requestId}`);
      clearTimeout(timeout);
      pending.delete(input.requestId);
      resolve({
        ok: true,
        requestId: input.requestId,
        refinedUrl: input.videoUrl,
        provider: 'capcut',
      });
      return;
    }

    void sendCapCutWebhook({
      event: 'capcut.enhance',
      data: { ...input },
      timestamp: new Date().toISOString(),
    }).then((triggered) => {
      if (!triggered) {
        clearTimeout(timeout);
        pending.delete(input.requestId);
        resolve({
          ok: false,
          requestId: input.requestId,
          provider: 'capcut',
          error: 'No hay webhook de automatización configurado (MAKE/N8N/ZAPIER_WEBHOOK_URL o CAPCUT_WEBHOOK_URL)',
        });
      }
    });
  });

export const verifyCapCutSignature = (body: string, signature: string): boolean => {
  if (!CAPCUT_WEBHOOK_SECRET) return true; // sin secreto configurado se acepta (modo desarrollo)
  const expected = signPayload(body, CAPCUT_WEBHOOK_SECRET);
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(signature, 'hex');
    return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
};

export const handleCapCutWebhook = (payload: CapCutWebhookPayload): CapCutEnhancementResult => {
  const { requestId, refinedUrl, error } = payload;
  const waiter = pending.get(requestId);

  const result: CapCutEnhancementResult = {
    ok: Boolean(refinedUrl) && !error,
    requestId,
    refinedUrl,
    provider: 'capcut',
    error,
  };

  if (waiter) {
    clearTimeout(waiter.timeout);
    pending.delete(requestId);
    waiter.resolve(result);
  } else {
    log.warn(`[CapCutWebhook] Llegó respuesta para requestId no esperado: ${requestId}`);
  }

  return result;
};

export const isCapCutPending = (requestId: string): boolean => pending.has(requestId);

export const getCapCutPendingCount = (): number => pending.size;

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}
