/**
 * Oncall Automation — PagerDuty + Slack Integration
 *
 * Flow: Alert triggered → Incident created in PagerDuty → Slack notification
 * Auto-recovery: Circuit breaker half-open → Success → Incident resolved
 *
 * Integrations: PagerDuty API, Slack Webhooks
 */

import { debug, error as logError, warn } from './structured-logger.js';

// ─── Types ──────────────────────────────────────────────────────────────

export interface IncidentPayload {
  title: string;
  severity: 'critical' | 'error' | 'warning';
  description: string;
  service: string; // 'webhooks', 'database', 'anomalies', etc.
  details?: Record<string, unknown>;
}

export interface IncidentResponse {
  id: string;
  status: 'triggered' | 'acknowledged' | 'resolved';
  url: string;
}

// ─── PagerDuty Integration ──────────────────────────────────────────────

/**
 * Create incident in PagerDuty
 *
 * Triggers page for on-call engineer based on escalation policy
 */
export const createPagerDutyIncident = async (payload: IncidentPayload): Promise<IncidentResponse | null> => {
  const pdToken = process.env.PAGERDUTY_API_TOKEN;
  const pdServiceId = process.env.PAGERDUTY_SERVICE_ID;

  if (!pdToken || !pdServiceId) {
    warn('[oncall-automation] PagerDuty not configured', {
      pdConfigured: !!pdToken && !!pdServiceId,
    });
    return null;
  }

  try {
    const body = {
      incident: {
        type: 'incident',
        title: payload.title,
        service: {
          type: 'service_reference',
          id: pdServiceId,
        },
        urgency: payload.severity === 'critical' ? 'high' : 'low',
        body: {
          type: 'incident_body',
          details: JSON.stringify({
            description: payload.description,
            service: payload.service,
            ...payload.details,
          }),
        },
      },
    };

    const response = await fetch('https://api.pagerduty.com/incidents', {
      method: 'POST',
      headers: {
        Authorization: `Token token=${pdToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.pagerduty+json;version=2',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.statusText}`);
    }

    const result = (await response.json()) as Record<string, unknown>;
    const incident = (result as Record<string, unknown>).incident as Record<string, unknown>;

    debug('[oncall-automation] PagerDuty incident created', {
      id: incident.id as string,
      title: payload.title,
      severity: payload.severity,
      service: payload.service,
    });

    return {
      id: incident.id as string,
      status: 'triggered',
      url: (incident.html_url as string) ?? '',
    };
  } catch (err) {
    logError(
      '[oncall-automation] PagerDuty incident creation failed',
      err instanceof Error ? err : new Error(String(err)),
      {
        service: payload.service,
        severity: payload.severity,
      },
    );
    return null;
  }
};

/**
 * Resolve incident in PagerDuty
 *
 * Called when auto-recovery succeeds (e.g., circuit breaker closes)
 */
export const resolvePagerDutyIncident = async (incidentId: string): Promise<boolean> => {
  const pdToken = process.env.PAGERDUTY_API_TOKEN;

  if (!pdToken) {
    warn('[oncall-automation] PagerDuty not configured for resolve');
    return false;
  }

  try {
    const response = await fetch(`https://api.pagerduty.com/incidents/${incidentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Token token=${pdToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.pagerduty+json;version=2',
      },
      body: JSON.stringify({
        incident: {
          type: 'incident_reference',
          status: 'resolved',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.statusText}`);
    }

    debug('[oncall-automation] PagerDuty incident resolved', { incidentId });
    return true;
  } catch (err) {
    logError(
      '[oncall-automation] PagerDuty incident resolution failed',
      err instanceof Error ? err : new Error(String(err)),
      {
        incidentId,
      },
    );
    return false;
  }
};

// ─── Slack Integration ───────────────────────────────────────────────────

/**
 * Send alert to Slack channel
 *
 * Posts to #incidents or #feedia-alerts
 */
export const sendSlackAlert = async (payload: IncidentPayload): Promise<boolean> => {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;

  if (!slackWebhook) {
    warn('[oncall-automation] Slack webhook not configured');
    return false;
  }

  try {
    const colorMap: Record<string, string> = {
      critical: 'danger', // Red
      error: 'warning', // Orange
      warning: '#808080', // Gray
    };

    const body = {
      attachments: [
        {
          fallback: payload.title,
          color: colorMap[payload.severity],
          title: payload.title,
          text: payload.description,
          fields: [
            {
              title: 'Service',
              value: payload.service,
              short: true,
            },
            {
              title: 'Severity',
              value: payload.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Details',
              value: JSON.stringify(payload.details ?? {}, null, 2),
              short: false,
            },
          ],
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    debug('[oncall-automation] Slack alert sent', {
      service: payload.service,
      severity: payload.severity,
    });

    return true;
  } catch (err) {
    logError('[oncall-automation] Slack alert failed', err instanceof Error ? err : new Error(String(err)), {
      service: payload.service,
    });
    return false;
  }
};

/**
 * Send alert to both PagerDuty and Slack
 */
export const alertOncall = async (
  payload: IncidentPayload,
): Promise<{ pd: IncidentResponse | null; slack: boolean }> => {
  const [pd, slack] = await Promise.all([createPagerDutyIncident(payload), sendSlackAlert(payload)]);

  return { pd, slack };
};

export default {
  createPagerDutyIncident,
  resolvePagerDutyIncident,
  sendSlackAlert,
  alertOncall,
};
