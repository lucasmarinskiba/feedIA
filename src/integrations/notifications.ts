import { env } from '../config/index.js';
import { log } from '../agent/logger.js';

export type AlertSeverity = 'info' | 'warn' | 'crisis' | 'lead' | 'reporte';

export interface Alert {
  severity: AlertSeverity;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  ctaUrl?: string;
}

const slackEmoji: Record<AlertSeverity, string> = {
  info: ':information_source:',
  warn: ':warning:',
  crisis: ':rotating_light:',
  lead: ':moneybag:',
  reporte: ':bar_chart:',
};

const formatSlack = (alert: Alert): Record<string, unknown> => ({
  text: `${slackEmoji[alert.severity]} *${alert.title}*`,
  blocks: [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `${slackEmoji[alert.severity]} *${alert.title}*` },
    },
    { type: 'section', text: { type: 'mrkdwn', text: alert.body } },
    ...(alert.metadata
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                '```\n' +
                Object.entries(alert.metadata)
                  .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                  .join('\n') +
                '\n```',
            },
          },
        ]
      : []),
    ...(alert.ctaUrl
      ? [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Abrir' },
                url: alert.ctaUrl,
              },
            ],
          },
        ]
      : []),
  ],
});

export const sendAlert = async (alert: Alert): Promise<{ ok: boolean; error?: string }> => {
  if (env.dryRun) {
    log.info(`[DRY RUN] Alerta ${alert.severity}: ${alert.title}`);
    return { ok: true };
  }
  const targets: Array<Promise<{ ok: boolean; error?: string }>> = [];

  if (env.notifications.slackWebhook) {
    targets.push(
      fetch(env.notifications.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatSlack(alert)),
      }).then((r) => ({ ok: r.ok, ...(r.ok ? {} : { error: `slack ${r.status}` }) })),
    );
  }

  if (env.notifications.genericWebhook) {
    targets.push(
      fetch(env.notifications.genericWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      }).then((r) => ({ ok: r.ok, ...(r.ok ? {} : { error: `webhook ${r.status}` }) })),
    );
  }

  if (targets.length === 0) {
    log.warn(`Sin canal de notificaciones configurado. Alerta "${alert.title}" no se envió.`);
    return { ok: false, error: 'sin canales configurados' };
  }

  const results = await Promise.all(targets);
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) return { ok: true };
  return { ok: false, error: failed.map((f) => f.error).join('; ') };
};
