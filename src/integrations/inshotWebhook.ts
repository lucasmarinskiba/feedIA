/**
 * InShot Webhook Handler — recibe assets refinados desde Make/n8n/InShot mobile.
 *
 * Misma arquitectura que CapCut: envía webhook firmado y espera respuesta async
 * en /api/webhook/inshot.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';

export interface InShotEnhancementInput {
  requestId: string;
  videoUrl: string;
  caption?: string;
  captions?: string[];
  recipe?: 'inshot-auto-captions' | 'inshot-effects' | 'inshot-export-1080';
  webhookReturnUrl?: string;
}

export interface InShotEnhancementResult {
  ok: boolean;
  requestId: string;
  refinedUrl?: string;
  provider: string;
  error?: string;
}

export interface InShotWebhookPayload {
  requestId: string;
  refinedUrl?: string;
  error?: string;
}

const INSHOT_WEBHOOK_SECRET = process.env['INSHOT_WEBHOOK_SECRET'] ?? '';
const INSHOT_WEBHOOK_URL = process.env['INSHOT_WEBHOOK_URL'] ?? '';

const pending = new Map<
  string,
  {
    resolve: (value: InShotEnhancementResult) => void;
    reject: (reason?: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const signPayload = (body: string, secret: string): string =>
  createHmac('sha256', secret).update(body, 'utf8').digest('hex');

const resolveWebhookUrl = (): string | null => {
  if (INSHOT_WEBHOOK_URL) return INSHOT_WEBHOOK_URL;
  if (env.automation.makeWebhook) return env.automation.makeWebhook;
  if (env.automation.n8nWebhook) return env.automation.n8nWebhook;
  if (env.automation.zapierWebhook) return env.automation.zapierWebhook;
  return null;
};

const sendInShotWebhook = async (payload: WebhookPayload): Promise<boolean> => {
  const url = resolveWebhookUrl();
  if (!url) {
    log.warn('[InShotWebhook] No hay webhook configurado');
    return false;
  }

  if (env.dryRun) {
    log.info(`[InShotWebhook] DRY_RUN: dispararía ${url} con evento "${payload.event}"`);
    return true;
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (INSHOT_WEBHOOK_SECRET) {
    headers['x-inshot-signature'] = signPayload(body, INSHOT_WEBHOOK_SECRET);
  }

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) {
      log.error(`[InShotWebhook] Webhook respondió ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    log.error(`[InShotWebhook] Error enviando webhook: ${(err as Error).message}`);
    return false;
  }
};

export const requestInShotEnhancement = async (
  input: InShotEnhancementInput,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<InShotEnhancementResult> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(input.requestId);
      resolve({
        ok: false,
        requestId: input.requestId,
        provider: 'inshot',
        error: `Timeout esperando respuesta de InShot (${timeoutMs}ms)`,
      });
    }, timeoutMs);

    pending.set(input.requestId, { resolve, reject, timeout });

    if (env.dryRun) {
      log.info(`[InShotWebhook] DRY_RUN: simulando refinado para ${input.requestId}`);
      clearTimeout(timeout);
      pending.delete(input.requestId);
      resolve({ ok: true, requestId: input.requestId, refinedUrl: input.videoUrl, provider: 'inshot' });
      return;
    }

    void sendInShotWebhook({
      event: 'inshot.enhance',
      data: { ...input },
      timestamp: new Date().toISOString(),
    }).then((triggered) => {
      if (!triggered) {
        clearTimeout(timeout);
        pending.delete(input.requestId);
        resolve({
          ok: false,
          requestId: input.requestId,
          provider: 'inshot',
          error: 'No hay webhook de automatización configurado',
        });
      }
    });
  });

export const verifyInShotSignature = (body: string, signature: string): boolean => {
  if (!INSHOT_WEBHOOK_SECRET) return true;
  const expected = signPayload(body, INSHOT_WEBHOOK_SECRET);
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(signature, 'hex');
    return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
};

export const handleInShotWebhook = (payload: InShotWebhookPayload): InShotEnhancementResult => {
  const { requestId, refinedUrl, error } = payload;
  const waiter = pending.get(requestId);
  const result: InShotEnhancementResult = {
    ok: Boolean(refinedUrl) && !error,
    requestId,
    refinedUrl,
    provider: 'inshot',
    error,
  };
  if (waiter) {
    clearTimeout(waiter.timeout);
    pending.delete(requestId);
    waiter.resolve(result);
  } else {
    log.warn(`[InShotWebhook] Llegó respuesta para requestId no esperado: ${requestId}`);
  }
  return result;
};

export const getInShotPendingCount = (): number => pending.size;
