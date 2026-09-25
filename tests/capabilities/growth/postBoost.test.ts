/**
 * postBoost.ts ya no incluye 'beacon-engagement' (auto-like + auto-comentario
 * en cuentas de terceros para inflar alcance — engagement pod/INT-003) en el
 * calendario de acciones post-publicación.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/agent/tokenRouter.js', () => ({
  ask: vi.fn(async () => ({ text: 'Respuesta de prueba' })),
  generateReply: vi.fn(async () => 'Reply de prueba'),
}));
vi.mock('../../../src/capabilities/computerUse/instagramActions.js', () => ({
  verAnaliticasPost: vi.fn(async () => ({ ok: true, action: 'verAnaliticasPost', summary: '', durationMs: 0 })),
}));
vi.mock('../../../src/integrations/meta.js', () => ({
  commentOnPost: vi.fn(),
}));

import { commentOnPost } from '../../../src/integrations/meta.js';
import {
  schedulePostBoost,
  cancelBoost,
  runBoostTick,
  type BoostActionType,
} from '../../../src/capabilities/growth/postBoost.js';

const mockedCommentOnPost = vi.mocked(commentOnPost);

beforeEach(() => {
  mockedCommentOnPost.mockReset();
});

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

// publishedAt en el pasado para que la acción T+5min (pinned-comment) ya esté
// vencida y runBoostTick() la ejecute en el mismo tick.
const publishedTenMinutesAgo = (): string => new Date(Date.now() - 10 * 60 * 1000).toISOString();

describe('pinned-comment / community-prime: auto-post vía API solo con mediaId real', () => {
  it('con mediaId, publica de verdad vía commentOnPost (Graph API)', async () => {
    mockedCommentOnPost.mockResolvedValue({ ok: true, commentId: 'comment-abc' });

    const plan = schedulePostBoost({
      postId: `test-postboost-mediaid-${Date.now()}`,
      postUrl: 'https://instagram.com/p/propio123',
      mediaId: '17895695668004550',
      postFormat: 'post',
      publishedAt: publishedTenMinutesAgo(),
    });

    const tick = await runBoostTick();
    const pinned = tick.details.find((d) => d.planId === plan.id && d.action === 'pinned-comment');

    expect(mockedCommentOnPost).toHaveBeenCalledWith('17895695668004550', expect.any(String));
    expect(pinned?.ok).toBe(true);
    expect(pinned?.result).toMatch(/publicado automáticamente/i);

    cancelBoost(plan.postId);
  });

  it('sin mediaId, NUNCA llama a commentOnPost — deja el texto para revisión humana', async () => {
    const plan = schedulePostBoost({
      postId: `test-postboost-nomediaid-${Date.now()}`,
      postUrl: 'https://instagram.com/p/propio456',
      postFormat: 'post',
      publishedAt: publishedTenMinutesAgo(),
    });

    const tick = await runBoostTick();
    const pinned = tick.details.find((d) => d.planId === plan.id && d.action === 'pinned-comment');

    expect(mockedCommentOnPost).not.toHaveBeenCalled();
    expect(pinned?.ok).toBe(true);
    expect(pinned?.result).toMatch(/revisión humana/i);

    cancelBoost(plan.postId);
  });

  it('si commentOnPost falla/bloquea, el resultado lo dice y no lo esconde como éxito', async () => {
    mockedCommentOnPost.mockResolvedValue({ ok: false, error: 'Compliance: violación ALTA' });

    const plan = schedulePostBoost({
      postId: `test-postboost-blocked-${Date.now()}`,
      mediaId: '17895695668004999',
      postFormat: 'post',
      publishedAt: publishedTenMinutesAgo(),
    });

    const tick = await runBoostTick();
    const pinned = tick.details.find((d) => d.planId === plan.id && d.action === 'pinned-comment');

    expect(pinned?.result).toMatch(/bloqueado\/falló/i);
    expect(pinned?.result).toMatch(/revisión humana/i);

    cancelBoost(plan.postId);
  });
});
