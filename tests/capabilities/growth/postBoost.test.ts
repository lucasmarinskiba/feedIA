/**
 * postBoost.ts ya no incluye 'beacon-engagement' (auto-like + auto-comentario
 * en cuentas de terceros para inflar alcance — engagement pod/INT-003) en el
 * calendario de acciones post-publicación.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/agent/tokenRouter.js', () => ({
  ask: vi.fn(async () => ({ text: 'Respuesta de prueba' })),
  generateReply: vi.fn(async () => 'Reply de prueba'),
}));
vi.mock('../../../src/capabilities/computerUse/instagramActions.js', () => ({
  verAnaliticasPost: vi.fn(async () => ({ ok: true, action: 'verAnaliticasPost', summary: '', durationMs: 0 })),
}));

import { schedulePostBoost, cancelBoost, type BoostActionType } from '../../../src/capabilities/growth/postBoost.js';

describe('schedulePostBoost: calendario de acciones', () => {
  it('nunca programa beacon-engagement (auto-engagement en cuentas de terceros)', () => {
    const plan = schedulePostBoost({
      postId: `test-postboost-${Date.now()}`,
      postUrl: 'https://instagram.com/p/propio123',
      postFormat: 'post',
      publishedAt: new Date().toISOString(),
    });

    const actionTypes = plan.actions.map((a) => a.type);
    expect(actionTypes).not.toContain('beacon-engagement' as BoostActionType);
    expect(actionTypes).toEqual([
      'pinned-comment',
      'community-prime',
      'cross-promotion',
      'reply-thread',
      'check-metrics',
    ]);

    cancelBoost(plan.postId);
  });
});
