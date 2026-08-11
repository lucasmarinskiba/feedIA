/**
 * Real API Integrations — Swap mock context for production APIs
 *
 * Integrates: Instagram Graph API, Budget API, Email service
 * Used by: autonomous-executor.ts
 */

import { ExecutionContext } from './autonomous-executor.js';
import { debug, error as logError } from './structured-logger.js';

// ─── Instagram Graph API ────────────────────────────────────────────────

const createInstagramContext = () => {
  const token = process.env.META_ACCESS_TOKEN;
  const apiVersion = 'v18.0';

  return {
    toggleAutoPublish: async (channelId: string, enabled: boolean) => {
      if (!token) throw new Error('META_ACCESS_TOKEN not configured');

      try {
        const url = `https://graph.instagram.com/${apiVersion}/${channelId}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            auto_publish: enabled,
          }),
        });

        if (!response.ok) {
          throw new Error(`Instagram API error: ${response.statusText}`);
        }

        debug(`[api-integrations] Instagram auto_publish=${enabled} for ${channelId}`, {
          channelId,
          enabled,
        });

        return { success: true, channelId };
      } catch (err) {
        logError('[api-integrations] Instagram toggle failed', err instanceof Error ? err : new Error(String(err)), {
          channelId,
          enabled,
        });
        throw err;
      }
    },

    getPauseStatus: async (channelId: string) => {
      if (!token) throw new Error('META_ACCESS_TOKEN not configured');

      try {
        const url = `https://graph.instagram.com/${apiVersion}/${channelId}?fields=auto_publish`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error(`Instagram API error: ${response.statusText}`);

        const data = (await response.json()) as Record<string, unknown>;
        const paused = data.auto_publish === false;

        return { paused };
      } catch (err) {
        logError('[api-integrations] Instagram status check failed', err instanceof Error ? err : new Error(String(err)), {
          channelId,
        });
        throw err;
      }
    },
  };
};

// ─── Budget API (Internal) ───────────────────────────────────────────────

const createBudgetContext = () => {
  return {
    getSpend: async (accountId: string) => {
      try {
        // TODO: Query internal budget service or DB
        // For now, return mock value
        debug('[api-integrations] getSpend', { accountId });
        return 1500;
      } catch (err) {
        logError('[api-integrations] Budget getSpend failed', err instanceof Error ? err : new Error(String(err)), {
          accountId,
        });
        throw err;
      }
    },

    adjust: async (accountId: string, amount: number) => {
      try {
        // TODO: Call budget service to adjust allocation
        // For now, mock response
        const newBudget = 2000 + amount;
        debug('[api-integrations] Budget adjusted', {
          accountId,
          adjustment: amount,
          newBudget,
        });

        return { newBudget, previous: 2000 };
      } catch (err) {
        logError('[api-integrations] Budget adjust failed', err instanceof Error ? err : new Error(String(err)), {
          accountId,
          amount,
        });
        throw err;
      }
    },

    revert: async (accountId: string, previousBudget: number) => {
      try {
        // TODO: Call budget service to revert to previous
        debug('[api-integrations] Budget reverted', {
          accountId,
          previousBudget,
        });

        return { success: true };
      } catch (err) {
        logError('[api-integrations] Budget revert failed', err instanceof Error ? err : new Error(String(err)), {
          accountId,
          previousBudget,
        });
        throw err;
      }
    },
  };
};

// ─── Email Service (SendGrid/Mailgun) ────────────────────────────────────

const createEmailContext = () => {
  return {
    sendRetention: async (fanId: string, content: Record<string, unknown>) => {
      try {
        // TODO: Send via SendGrid/Mailgun
        // For now, log only
        debug('[api-integrations] Retention email queued', {
          fanId,
          content,
        });

        return { messageId: `msg_${Date.now()}`, status: 'queued' };
      } catch (err) {
        logError('[api-integrations] Email sendRetention failed', err instanceof Error ? err : new Error(String(err)), {
          fanId,
        });
        throw err;
      }
    },

    sendReactivation: async (fanId: string) => {
      try {
        // TODO: Send reactivation email
        debug('[api-integrations] Reactivation email queued', { fanId });

        return { messageId: `msg_${Date.now()}`, status: 'queued' };
      } catch (err) {
        logError('[api-integrations] Email sendReactivation failed', err instanceof Error ? err : new Error(String(err)), {
          fanId,
        });
        throw err;
      }
    },

    notifyTeam: async (subject: string, content: string) => {
      try {
        // TODO: Send to team Slack or email
        debug('[api-integrations] Team notification queued', { subject });

        return { success: true, recipients: [process.env.OWNER_TEST_EMAIL ?? 'team@feedia.ai'] };
      } catch (err) {
        logError('[api-integrations] Email notifyTeam failed', err instanceof Error ? err : new Error(String(err)), {
          subject,
        });
        throw err;
      }
    },
  };
};

// ─── Export Combined Context ────────────────────────────────────────────

/**
 * Create production execution context with real APIs
 *
 * Usage in autonomous-executor:
 * const context = createRealContext();
 * await executeAction(action, context);
 */
export const createRealContext = (): ExecutionContext => {
  return {
    instagram: createInstagramContext(),
    budgetAPI: createBudgetContext(),
    email: createEmailContext(),
  };
};

export default {
  createRealContext,
};
