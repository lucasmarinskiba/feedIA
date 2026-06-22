/**
 * Webhook entrante para assets refinados de InShot.
 *
 * Payload:
 *   { "requestId": "uuid", "refinedUrl": "https://...mp4", "error": "opcional" }
 *
 * Si `INSHOT_WEBHOOK_SECRET` está configurado, se requiere firma en
 * `x-inshot-signature` (HMAC-SHA256 hex).
 */

import type { RouteDefinition } from './http.js';
import { json } from './http.js';
import { handleInShotWebhook, verifyInShotSignature, getInShotPendingCount } from '../integrations/inshotWebhook.js';
import { log } from '../agent/logger.js';

export const buildInShotWebhookRoutes = (): RouteDefinition[] => [
  {
    method: 'POST',
    pattern: '/api/webhook/inshot',
    handler: async ({ body, rawBody, req, res }): Promise<void> => {
      const signature = (req.headers['x-inshot-signature'] as string) ?? '';
      const bodyString = rawBody.toString('utf8');

      if (!verifyInShotSignature(bodyString, signature)) {
        log.warn('[InShotWebhook] Firma inválida');
        json(res, 401, { ok: false, error: 'Firma inválida' });
        return;
      }

      const payload = body as { requestId?: string; refinedUrl?: string; error?: string };
      if (!payload.requestId) {
        json(res, 400, { ok: false, error: 'requestId requerido' });
        return;
      }
      log.info(`[InShotWebhook] Recibido asset refinado: ${payload.requestId}`);
      const result = handleInShotWebhook({
        requestId: payload.requestId,
        refinedUrl: payload.refinedUrl,
        error: payload.error,
      });
      json(res, 200, result);
    },
  },
  {
    method: 'GET',
    pattern: '/api/webhook/inshot/health',
    handler: async ({ res }): Promise<void> => {
      json(res, 200, { ok: true, provider: 'inshot', pending: getInShotPendingCount() });
    },
  },
];
