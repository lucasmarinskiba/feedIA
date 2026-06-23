/**
 * Webhook Notifier — Send POST to external URL on job completion.
 */

import { log } from '../../agent/logger.js';

/**
 * Trigger webhook when job completes.
 */
export const notifyWebhook = async (
  webhookUrl: string,
  jobId: string,
  status: 'done' | 'error',
  data?: any,
): Promise<boolean> => {
  if (!webhookUrl) return false;

  try {
    const payload = {
      event: `carousel.${status}`,
      jobId,
      timestamp: new Date().toISOString(),
      data,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 10000,
    });

    if (response.ok) {
      log.info(`[Webhook] Notified ${webhookUrl}: ${status}`);
      return true;
    }

    log.warn(`[Webhook] Failed (${response.status}): ${webhookUrl}`);
    return false;
  } catch (err) {
    log.error(`[Webhook] Error: ${(err as Error).message}`);
    return false;
  }
};

export const webhookNotifier = {
  notifyWebhook,
};
