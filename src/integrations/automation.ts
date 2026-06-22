import { env } from '../config/index.js';
import { log } from '../agent/logger.js';

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const pickWebhook = (): { url: string; provider: string } | null => {
  if (env.automation.makeWebhook) return { url: env.automation.makeWebhook, provider: 'make' };
  if (env.automation.n8nWebhook) return { url: env.automation.n8nWebhook, provider: 'n8n' };
  if (env.automation.zapierWebhook) {
    return { url: env.automation.zapierWebhook, provider: 'zapier' };
  }
  return null;
};

export const triggerAutomation = async (payload: WebhookPayload): Promise<boolean> => {
  const target = pickWebhook();
  if (!target) {
    log.warn(`Sin webhook de automatización configurado. Evento "${payload.event}" no se ejecuta.`);
    return false;
  }
  if (env.dryRun) {
    log.info(`[DRY RUN] Dispararía ${target.provider} con evento "${payload.event}"`);
    return true;
  }
  try {
    const res = await fetch(target.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      log.error(`Webhook ${target.provider} respondió ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    log.error(`Error disparando webhook: ${(err as Error).message}`);
    return false;
  }
};
