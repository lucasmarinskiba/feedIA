/**
 * Webhook entrante para assets refinados de CapCut.
 *
 * El flujo Make/n8n/CapCut desktop exporta el video y envía un POST a:
 *   POST /api/webhook/capcut
 *
 * Body:
 *   {
 *     "requestId": "uuid",
 *     "refinedUrl": "https://...mp4",
 *     "error": "opcional"
 *   }
 *
 * Si `CAPCUT_WEBHOOK_SECRET` está configurado, el body debe venir firmado en
 * el header `x-capcut-signature` (HMAC-SHA256 hex).
 */

import type { RouteDefinition } from './http.js';
import { json } from './http.js';
import { handleCapCutWebhook, verifyCapCutSignature, getCapCutPendingCount } from '../integrations/capcutWebhook.js';
import { log } from '../agent/logger.js';

export const buildCapCutWebhookRoutes = (): RouteDefinition[] => [
  {
    method: 'POST',
    pattern: '/api/webhook/capcut',
    handler: async ({ body, rawBody, req, res }): Promise<void> => {
      const signature = (req.headers['x-capcut-signature'] as string) ?? '';
      const bodyString = rawBody.toString('utf8');

      if (!verifyCapCutSignature(bodyString, signature)) {
        log.warn('[CapCutWebhook] Firma inválida');
        json(res, 401, { ok: false, error: 'Firma inválida' });
        return;
      }

      const payload = body as { requestId?: string; refinedUrl?: string; error?: string };
      if (!payload.requestId) {
        json(res, 400, { ok: false, error: 'requestId requerido' });
        return;
      }
      log.info(`[CapCutWebhook] Recibido asset refinado: ${payload.requestId}`);
      const result = handleCapCutWebhook({
        requestId: payload.requestId,
        refinedUrl: payload.refinedUrl,
        error: payload.error,
      });
      json(res, 200, result);
    },
  },
  {
    method: 'GET',
    pattern: '/api/webhook/capcut/health',
    handler: async ({ res }): Promise<void> => {
      json(res, 200, { ok: true, provider: 'capcut', pending: getCapCutPendingCount() });
    },
  },
];
