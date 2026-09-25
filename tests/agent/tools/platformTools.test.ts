/**
 * platformTools.ts had 7 tools that built a natural-language goal and passed
 * it straight to executeWithRecovery() — real Computer Use against Instagram/
 * TikTok, no compliance check, no rate limit, no AI disclosure.
 * platform_auto_reply was the worst of these: "reply to comments + like all
 * replied-to comments" via raw browser automation on any post_url handed to
 * it. All 7 are now permanently disabled — this is the regression guard.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/studio/computerUse/reliableSession.js', () => ({
  executeWithRecovery: vi.fn(),
}));
vi.mock('../../../src/studio/computerUse/platformControllers.js', () => ({
  instagramNativePost: vi.fn(async () => ({ ok: false, durationMs: 0, error: 'disabled' })),
  tiktokNativePost: vi.fn(async () => ({ ok: false, durationMs: 0, error: 'disabled' })),
  tiktokStudioAutomate: vi.fn(async () => ({ ok: false, durationMs: 0, error: 'disabled' })),
  instagramAdsCreate: vi.fn(async () => ({ ok: false, durationMs: 0, error: 'disabled' })),
  tiktokAdsCreate: vi.fn(async () => ({ ok: false, durationMs: 0, error: 'disabled' })),
  applyContentEffects: vi.fn(async () => ({ ok: false, durationMs: 0, error: 'disabled' })),
}));

import { executeWithRecovery } from '../../../src/studio/computerUse/reliableSession.js';
import { executePlatformTool } from '../../../src/agent/tools/platformTools.js';
import { loadBrandProfile } from '../../../src/config/index.js';

const brand = loadBrandProfile();
const mockedExecuteWithRecovery = vi.mocked(executeWithRecovery);

beforeEach(() => {
  mockedExecuteWithRecovery.mockClear();
});

describe('executePlatformTool: acciones que controlaban el navegador, deshabilitadas', () => {
  it('platform_auto_reply nunca responde ni likea comentarios de verdad', async () => {
    const raw = await executePlatformTool(
      'platform_auto_reply',
      { platform: 'instagram', post_url: 'https://instagram.com/p/x', reply_strategy: 'engage-questions' },
      brand,
    );
    const result = JSON.parse(raw);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/deshabilitad/i);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('platform_engagement_monitor nunca controla el navegador', async () => {
    const raw = await executePlatformTool(
      'platform_engagement_monitor',
      { platform: 'instagram', monitor_type: 'comments' },
      brand,
    );
    const result = JSON.parse(raw);
    expect(result.ok).toBe(false);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('instagram_reel_upload nunca publica vía Computer Use', async () => {
    const raw = await executePlatformTool('instagram_reel_upload', { video_path: 'v.mp4', caption: 'hi' }, brand);
    const result = JSON.parse(raw);
    expect(result.ok).toBe(false);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('instagram_story_sequence nunca publica vía Computer Use', async () => {
    const raw = await executePlatformTool(
      'instagram_story_sequence',
      { story_slides: [{ media_path: 's1.jpg' }] },
      brand,
    );
    const result = JSON.parse(raw);
    expect(result.ok).toBe(false);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('tiktok_fyp_optimize nunca publica vía Computer Use', async () => {
    const raw = await executePlatformTool('tiktok_fyp_optimize', { video_path: 'v.mp4', niche: 'fitness' }, brand);
    const result = JSON.parse(raw);
    expect(result.ok).toBe(false);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('tiktok_duet_stitch nunca interactúa con el video de un tercero', async () => {
    const raw = await executePlatformTool(
      'tiktok_duet_stitch',
      { source_video_url: 'https://tiktok.com/@x/video/1', response_type: 'stitch', response_caption: 'hi' },
      brand,
    );
    const result = JSON.parse(raw);
    expect(result.ok).toBe(false);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('platform_profile_optimize con execute_changes:true solo devuelve el plan, no ejecuta', async () => {
    const raw = await executePlatformTool(
      'platform_profile_optimize',
      {
        platform: 'instagram',
        niche: 'fitness',
        value_proposition: 'get fit',
        cta_link: 'https://example.com',
        execute_changes: true,
      },
      brand,
    );
    const result = JSON.parse(raw);
    expect(result.executed).toBe(false);
    expect(result.optimization_plan).toBeTruthy();
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });

  it('instagram_post_native (vía platformControllers, mockeado) refleja el disable de abajo', async () => {
    const raw = await executePlatformTool('instagram_post_native', { media_path: 'a.jpg', caption: 'hi' }, brand);
    const result = JSON.parse(raw);
    expect(result.ok).toBe(false);
  });
});
