/**
 * Crisis Alerts — Slack/email notifications para crisis detectadas.
 *
 * Dispara alertas cuando Crisis Agent detecta CRITICAL+ severity.
 * Integración: webhooks Slack (v1/incoming), SendGrid/SMTP para email.
 */

import { getProfile } from './_accountMemory.js';

// ── Formatear mensaje de crisis ───────────────────────────────────────────────

const formatCrisisMessage = (report) => {
  const { severityLevel, severityScore, triggers, protocol, generatedReport } = report;
  const emoji =
    {
      warning: '⚠️',
      elevated: '🟠',
      critical: '🔴',
      catastrophic: '🔴🔴',
    }[severityLevel] || '⚠️';

  return {
    title: `${emoji} CRISIS ALERT: ${severityLevel.toUpperCase()}`,
    score: severityScore,
    triggers,
    protocol: protocol.action,
    recommendations: protocol.recommendations || [],
    escalationLevel: protocol.escalationLevel || 'none',
    circuitBreakerActive: protocol.circuitBreakerActive || false,
  };
};

// ── Enviar a Slack ────────────────────────────────────────────────────────────

const sendSlackAlert = async (webhookUrl, message) => {
  if (!webhookUrl) return { ok: false, error: 'no-webhook-url' };

  const payload = {
    text: message.title,
    attachments: [
      {
        color:
          message.severityLevel === 'critical' ? 'danger' : message.severityLevel === 'elevated' ? 'warning' : 'good',
        fields: [
          { title: 'Severity', value: `${message.severityLevel.toUpperCase()} (${message.score}/100)`, short: true },
          {
            title: 'Escalation',
            value: message.escalationLevel.toUpperCase() || 'NONE',
            short: true,
          },
          { title: 'Circuit Breaker', value: message.circuitBreakerActive ? '🚨 ACTIVE' : 'Off', short: true },
          { title: 'Triggers', value: message.triggers.join('\n'), short: false },
          { title: 'Protocol', value: message.protocol, short: true },
          {
            title: 'Recommended Actions',
            value: message.recommendations.join('\n') || 'None',
            short: false,
          },
        ],
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
};

// ── Enviar email (SMTP/SendGrid) ──────────────────────────────────────────────

const sendEmailAlert = async (emailConfig, recipients, message) => {
  if (!emailConfig || !recipients || recipients.length === 0) {
    return { ok: false, error: 'missing-email-config-or-recipients' };
  }

  const {
    provider = 'smtp',
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    sendgridKey,
    fromEmail = 'alerts@feedia.com',
  } = emailConfig || {};

  // Cuerpo del email en HTML
  const htmlBody = `
    <h2 style="color: red;">${message.title}</h2>
    <p><strong>Severity:</strong> ${message.severityLevel.toUpperCase()} (${message.score}/100)</p>
    <p><strong>Escalation Level:</strong> ${message.escalationLevel.toUpperCase()}</p>
    <p><strong>Circuit Breaker Active:</strong> ${message.circuitBreakerActive ? 'YES 🚨' : 'NO'}</p>

    <h3>Triggers:</h3>
    <ul>
      ${message.triggers.map((t) => `<li>${t}</li>`).join('')}
    </ul>

    <h3>Recommended Actions:</h3>
    <ul>
      ${(message.recommendations || []).map((r) => `<li>${r}</li>`).join('')}
    </ul>

    <p><small>Timestamp: ${new Date().toISOString()}</small></p>
  `;

  if (provider === 'sendgrid' && sendgridKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: recipients.map((email) => ({ to: [{ email }] })),
          from: { email: fromEmail },
          subject: message.title,
          content: [{ type: 'text/html', value: htmlBody }],
        }),
      });
      return { ok: response.ok, status: response.status };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  // SMTP fallback (mock — requeriría nodemailer real)
  return { ok: false, error: 'smtp-not-implemented-use-sendgrid' };
};

// ── Disparar alerta ──────────────────────────────────────────────────────────

export const triggerCrisisAlert = async (scope, accountId, report) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const alertConfig = profile.alertConfig || {};

  // Solo alertar si CRITICAL+
  if (report.severityLevel !== 'critical' && report.severityLevel !== 'catastrophic') {
    return { ok: false, reason: 'below-alert-threshold' };
  }

  const message = formatCrisisMessage(report);
  const { slackWebhookUrl, emailConfig, emailRecipients = [] } = alertConfig;

  const results = [];

  // Enviar a Slack
  if (slackWebhookUrl) {
    const slackResult = await sendSlackAlert(slackWebhookUrl, message);
    results.push({ channel: 'slack', ...slackResult });
  }

  // Enviar email
  if (emailRecipients.length > 0) {
    const emailResult = await sendEmailAlert(emailConfig, emailRecipients, message);
    results.push({ channel: 'email', recipients: emailRecipients, ...emailResult });
  }

  return {
    ok: results.some((r) => r.ok),
    results,
    alertsSent: results.filter((r) => r.ok).length,
  };
};

// ── Configurar alertas ────────────────────────────────────────────────────────

export const configureAlerts = async (scope, accountId, config) => {
  const { saveProfile } = await import('./_accountMemory.js');
  const profile = await getProfile(scope, accountId).catch(() => ({}));

  const alertConfig = {
    ...profile.alertConfig,
    slackWebhookUrl: config.slackWebhookUrl || profile.alertConfig?.slackWebhookUrl,
    emailConfig: config.emailConfig || profile.alertConfig?.emailConfig,
    emailRecipients: config.emailRecipients || profile.alertConfig?.emailRecipients || [],
  };

  await saveProfile(scope, accountId, { ...profile, alertConfig });
  return { ok: true, alertConfig };
};

// ── HTTP handler ──────────────────────────────────────────────────────────────

export const handleCrisisAlerts = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  // POST /api/crisis/configure-alerts
  if (path === '/api/crisis/configure-alerts' && m === 'POST') {
    const { slackWebhookUrl, emailConfig, emailRecipients } = body || {};
    const accountId = body?.accountId || scope;
    const result = await configureAlerts(scope, accountId, { slackWebhookUrl, emailConfig, emailRecipients }).catch(
      () => null,
    );
    return json(result ? 200 : 500, result || { ok: false });
  }

  return false;
};
