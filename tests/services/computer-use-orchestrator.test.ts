/**
 * computer-use-orchestrator.ts used to wire automated engagement
 * (like/comment/follow/story-view on third-party accounts, via
 * browserless-automation.ts) to a publicly reachable, unauthenticated
 * endpoint (api/engagement-routes.ts) — real money spent + real ban risk
 * for whichever Instagram account happened to be first in the token table,
 * triggerable by anyone. Now permanently disabled.
 */
import { describe, expect, it } from 'vitest';
import {
  executeEngagementTask,
  scheduleDailyEngagementRoutine,
  getEngagementMetrics,
  type EngagementTask,
} from '../../src/services/computer-use-orchestrator.js';

describe('executeEngagementTask: deshabilitado', () => {
  it.each<EngagementTask['action']>(['like', 'comment', 'follow', 'story-view'])(
    '%s: nunca ejecuta, falla rápido con error claro',
    async (action) => {
      const result = await executeEngagementTask({ accountId: 'acct-1', action, targetAccountId: 'alguien' });
      expect(result.success).toBe(false);
      expect(result.cost).toBe(0);
      expect(result.error).toMatch(/deshabilitad/i);
    },
  );
});

describe('scheduleDailyEngagementRoutine: deshabilitado', () => {
  it('nunca ejecuta ninguna acción', async () => {
    const result = await scheduleDailyEngagementRoutine('acct-1');
    expect(result).toEqual({ executed: 0, skipped: 0, errors: 0 });
  });
});

describe('getEngagementMetrics', () => {
  it('sigue siendo un stub inofensivo (no ejecuta nada)', () => {
    expect(getEngagementMetrics('acct-1')).toEqual({ likes: 0, comments: 0, follows: 0, reaches: 0 });
  });
});
