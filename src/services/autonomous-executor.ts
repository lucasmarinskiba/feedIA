/**
 * Autonomous Executor — Execute agent decisions via real APIs
 *
 * Flow: AgentDecision → Validate → Execute (Instagram/Email/Budget) → Track → Report
 *
 * Integrations: Instagram API (pause/resume), Email (nurture), Budget API (scale)
 * All actions logged for audit trail + rollback capability.
 */

import { log } from '../agent/logger.js';

// ─── Types ──────────────────────────────────────────────────────────────

export type ActionType =
  'pausePublication' | 'scaleBudget' | 'activateRetention' | 'triggerReactivation' | 'circuitBreak' | 'notifyTeam';
export type ActionStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back';

export interface ExecutableAction {
  id: string;
  type: ActionType;
  accountId: string;
  target: string; // channel, fan segment, or notification group
  amount?: number; // for scaleBudget
  reason: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface ActionExecution extends ExecutableAction {
  status: ActionStatus;
  result?: Record<string, unknown>;
  error?: string;
  executedAt?: string;
  apiResponse?: unknown;
}

export interface ExecutionContext {
  instagram: {
    toggleAutoPublish: (channelId: string, enabled: boolean) => Promise<{ success: boolean; channelId: string }>;
    getPauseStatus: (channelId: string) => Promise<{ paused: boolean; reason?: string }>;
  };
  budgetAPI: {
    getSpend: (accountId: string) => Promise<number>;
    adjust: (accountId: string, amount: number) => Promise<{ newBudget: number; previous: number }>;
    revert: (accountId: string, previousBudget: number) => Promise<{ success: boolean }>;
  };
  email: {
    sendRetention: (fanId: string, _content: Record<string, unknown>) => Promise<{ messageId: string; status: string }>;
    sendReactivation: (fanId: string) => Promise<{ messageId: string; status: string }>;
    notifyTeam: (subject: string, content: string) => Promise<{ success: boolean; recipients: string[] }>;
  };
}

// ─── In-Memory Action Log (TODO: persist to DB) ─────────────────────────

const actionLog = new Map<string, ActionExecution>();

export const getActionLog = (): ActionExecution[] => Array.from(actionLog.values());

export const getActionById = (id: string): ActionExecution | undefined => actionLog.get(id);

// ─── Execution Functions ────────────────────────────────────────────────

/**
 * Execute single action via appropriate API
 *
 * Validates context, calls real API, tracks result, enables rollback
 */
export const executeAction = async (action: ExecutableAction, context: ExecutionContext): Promise<ActionExecution> => {
  const execution: ActionExecution = {
    ...action,
    status: 'pending',
    executedAt: new Date().toISOString(),
  };

  try {
    log.info('[autonomous-executor] executing action', {
      actionId: action.id,
      type: action.type,
      target: action.target,
      severity: action.severity,
    });

    // Route to appropriate handler
    if (action.type === 'pausePublication') {
      execution.apiResponse = await context.instagram.toggleAutoPublish(action.target, false);
      execution.result = { paused: true, channel: action.target };
    } else if (action.type === 'scaleBudget') {
      if (!action.amount) throw new Error('scaleBudget requires amount');
      const budgetResponse = await context.budgetAPI.adjust(action.accountId, action.amount);
      execution.apiResponse = budgetResponse;
      execution.result = { budgetAdjusted: action.amount, total: budgetResponse.newBudget };
    } else if (action.type === 'activateRetention') {
      execution.apiResponse = await context.email.sendRetention(action.target, {
        accountId: action.accountId,
        reason: action.reason,
      });
      execution.result = { emailSent: true, recipientId: action.target };
    } else if (action.type === 'triggerReactivation') {
      execution.apiResponse = await context.email.sendReactivation(action.target);
      execution.result = { reactivationEmailSent: true, fanId: action.target };
    } else if (action.type === 'circuitBreak') {
      // Circuit break: pause all publishing for account
      execution.apiResponse = await context.instagram.toggleAutoPublish(action.accountId, false);
      execution.result = { circuitBreakerEngaged: true, allPublishingPaused: true };
    } else if (action.type === 'notifyTeam') {
      const notifyResponse = await context.email.notifyTeam(action.reason, action.target);
      execution.apiResponse = notifyResponse;
      const recipients: string[] = notifyResponse.recipients;
      execution.result = {
        notificationSent: true,
        recipients,
      };
    } else {
      throw new Error(`Unknown action type: ${action.type}`);
    }

    execution.status = 'completed';
    actionLog.set(action.id, execution);

    log.info('[autonomous-executor] action completed', {
      actionId: action.id,
      type: action.type,
      result: execution.result,
    });

    return execution;
  } catch (err) {
    execution.status = 'failed';
    execution.error = String(err);

    log.error('[autonomous-executor] action failed', {
      actionId: action.id,
      type: action.type,
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    actionLog.set(action.id, execution);
    return execution;
  }
};

/**
 * Rollback budget scaling action
 *
 * Reverts budget to previous level if scale-up failed or caused ROI collapse
 */
export const rollbackBudgetAction = async (
  actionId: string,
  previousBudget: number,
  context: ExecutionContext,
  accountId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const action = actionLog.get(actionId);
    if (!action) return { success: false, error: `Action ${actionId} not found` };
    if (action.type !== 'scaleBudget') return { success: false, error: 'Action is not a budget scaling action' };

    log.info('[autonomous-executor] rolling back budget', {
      actionId,
      previousBudget,
      accountId,
    });

    const result = await context.budgetAPI.revert(accountId, previousBudget);

    if (result.success) {
      action.status = 'rolled_back';
      log.info('[autonomous-executor] rollback succeeded', { actionId, previousBudget });
      return { success: true };
    }

    return { success: false, error: 'API rollback failed' };
  } catch (err) {
    log.error('[autonomous-executor] rollback error', {
      actionId,
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { success: false, error: String(err) };
  }
};

/**
 * Build execution plan from agent decisions
 *
 * Combines anomalies + agent decisions → ordered action list
 * Critical actions first, medium/low batched
 */
export const buildExecutionPlan = (
  anomalies: Array<{ type: string; severity: 'critical' | 'high' | 'medium'; details: Record<string, unknown> }>,
  decisions: Array<{
    type: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    target: string;
    reason: string;
  }>,
  accountId: string,
): ExecutableAction[] => {
  const actions: ExecutableAction[] = [];
  const actionMap = new Map<string, ExecutableAction>();

  // Map anomalies → actions
  for (const anomaly of anomalies) {
    if (anomaly.type === 'viralDrop' && anomaly.severity === 'critical') {
      // Viral score dropped >50% → pause publishing to investigate
      const action: ExecutableAction = {
        id: `action:${accountId}:${Date.now()}:1`,
        type: 'pausePublication',
        accountId,
        target: accountId,
        reason: 'Viral score drop >50% detected. Pausing to prevent further ROI loss.',
        severity: 'critical',
        timestamp: new Date().toISOString(),
      };
      actionMap.set(action.id, action);
    }

    if (anomaly.type === 'roiCollapse' && anomaly.severity === 'critical') {
      // ROI collapsed <50% → circuit break
      const action: ExecutableAction = {
        id: `action:${accountId}:${Date.now()}:2`,
        type: 'circuitBreak',
        accountId,
        target: accountId,
        reason: 'ROI collapse <50%. All publishing paused.',
        severity: 'critical',
        timestamp: new Date().toISOString(),
      };
      actionMap.set(action.id, action);
    }

    if (anomaly.type === 'churnAcceleration' && (anomaly.severity === 'critical' || anomaly.severity === 'high')) {
      // Churn spike >2x → activate retention emails
      const action: ExecutableAction = {
        id: `action:${accountId}:${Date.now()}:3`,
        type: 'activateRetention',
        accountId,
        target: accountId,
        reason: `Churn acceleration detected (${anomaly.details.riskScore}% risk). Retention activated.`,
        severity: anomaly.severity,
        timestamp: new Date().toISOString(),
      };
      actionMap.set(action.id, action);
    }
  }

  // Map decisions → actions
  for (const decision of decisions) {
    if (decision.priority === 'critical' || decision.priority === 'high') {
      if (decision.action === 'scale_budget') {
        const amount = decision.target === 'scale_up' ? 500 : -250; // Example: +$500 or -$250
        const action: ExecutableAction = {
          id: `action:${accountId}:${Date.now()}:4`,
          type: 'scaleBudget',
          accountId,
          target: decision.target,
          amount,
          reason: decision.reason,
          severity: decision.priority,
          timestamp: new Date().toISOString(),
        };
        actionMap.set(action.id, action);
      }

      if (decision.action === 'notify_team') {
        const action: ExecutableAction = {
          id: `action:${accountId}:${Date.now()}:5`,
          type: 'notifyTeam',
          accountId,
          target: decision.target,
          reason: decision.reason,
          severity: decision.priority,
          timestamp: new Date().toISOString(),
        };
        actionMap.set(action.id, action);
      }
    }
  }

  // Sort by severity: critical → high → medium → low
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.push(...Array.from(actionMap.values()).sort((a, b) => severityRank[a.severity] - severityRank[b.severity]));

  log.info('[autonomous-executor] execution plan built', {
    accountId,
    planSize: actions.length,
    criticalCount: actions.filter((a) => a.severity === 'critical').length,
  });

  return actions;
};

/**
 * Mock execution context (for testing without real APIs)
 *
 * Returns successful responses for all actions
 */
export const createMockContext = (): ExecutionContext => ({
  instagram: {
    toggleAutoPublish: async (
      channelId: string,
      enabled: boolean,
    ): Promise<{ success: boolean; channelId: string }> => {
      log.info('[autonomous-executor] mock: toggleAutoPublish', { channelId, enabled });
      return { success: true, channelId };
    },
    getPauseStatus: async (channelId: string): Promise<{ paused: boolean; reason?: string }> => {
      log.info('[autonomous-executor] mock: getPauseStatus', { channelId });
      return { paused: false };
    },
  },
  budgetAPI: {
    getSpend: async (accountId: string): Promise<number> => {
      log.info('[autonomous-executor] mock: getSpend', { accountId });
      return 1500;
    },
    adjust: async (accountId: string, amount: number): Promise<{ newBudget: number; previous: number }> => {
      log.info('[autonomous-executor] mock: adjust', { accountId, amount });
      return { newBudget: 2000 + amount, previous: 2000 };
    },
    revert: async (accountId: string, previousBudget: number): Promise<{ success: boolean }> => {
      log.info('[autonomous-executor] mock: revert', { accountId, previousBudget });
      return { success: true };
    },
  },
  email: {
    sendRetention: async (
      fanId: string,
      _content: Record<string, unknown>,
    ): Promise<{ messageId: string; status: string }> => {
      log.info('[autonomous-executor] mock: sendRetention', { fanId });
      return { messageId: `msg_${Date.now()}`, status: 'sent' };
    },
    sendReactivation: async (fanId: string): Promise<{ messageId: string; status: string }> => {
      log.info('[autonomous-executor] mock: sendReactivation', { fanId });
      return { messageId: `msg_${Date.now()}`, status: 'sent' };
    },
    notifyTeam: async (subject: string, content: string): Promise<{ success: boolean; recipients: string[] }> => {
      log.info('[autonomous-executor] mock: notifyTeam', { subject, content });
      return { success: true, recipients: ['team@example.com'] };
    },
  },
});

export default {
  executeAction,
  rollbackBudgetAction,
  buildExecutionPlan,
  createMockContext,
  getActionLog,
  getActionById,
};
