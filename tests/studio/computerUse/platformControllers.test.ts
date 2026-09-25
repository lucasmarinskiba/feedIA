/**
 * platformControllers.ts used to turn a natural-language goal into real
 * Computer Use (cursor + keyboard via Claude's computer-use API) against
 * Instagram/TikTok's live UI — no compliance check, no rate limit — to post
 * content, and (worse) to click through a real Ads Manager with a real USD
 * budget. Now permanently disabled; these are the regression guard.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/studio/computerUse/reliableSession.js', () => ({
  executeWithRecovery: vi.fn(),
}));

import { executeWithRecovery } from '../../../src/studio/computerUse/reliableSession.js';
import {
  instagramNativePost,
  tiktokNativePost,
  tiktokStudioAutomate,
  instagramAdsCreate,
  tiktokAdsCreate,
  applyContentEffects,
} from '../../../src/studio/computerUse/platformControllers.js';
import { loadBrandProfile } from '../../../src/config/index.js';

const brand = loadBrandProfile();
const mockedExecuteWithRecovery = vi.mocked(executeWithRecovery);

beforeEach(() => {
  mockedExecuteWithRecovery.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('platformControllers: todo deshabilitado, nunca toca Computer Use', () => {
  it('instagramNativePost nunca ejecuta', async () => {
    const result = await instagramNativePost(brand, 'a.jpg', 'caption', ['tag']);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/deshabilitad/i);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('tiktokNativePost nunca ejecuta', async () => {
    const result = await tiktokNativePost(brand, 'v.mp4', 'caption', ['tag']);
    expect(result.ok).toBe(false);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('tiktokStudioAutomate nunca ejecuta', async () => {
    const result = await tiktokStudioAutomate(brand, 'upload', {});
    expect(result.ok).toBe(false);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('instagramAdsCreate nunca gasta presupuesto real', async () => {
    const result = await instagramAdsCreate(brand, 'conversions', 500, 7, 'lookalike');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/dinero real|presupuesto/i);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('tiktokAdsCreate nunca gasta presupuesto real', async () => {
    const result = await tiktokAdsCreate(brand, 'conversions', 500, 'lookalike');
    expect(result.ok).toBe(false);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('applyContentEffects nunca ejecuta', async () => {
    const result = await applyContentEffects(brand, 'instagram', 'filter', {});
    expect(result.ok).toBe(false);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });
});
