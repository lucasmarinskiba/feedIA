/**
 * posting_first_comment used to pass a goal string straight to
 * executeWithRecovery() (real Computer Use) to type and post a first
 * comment on Instagram/TikTok's live UI. It now only generates the text —
 * ready for a human to paste, never auto-posted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/studio/computerUse/reliableSession.js', () => ({
  executeWithRecovery: vi.fn(),
}));

import { executeWithRecovery } from '../../../src/studio/computerUse/reliableSession.js';
import { executePostingTool } from '../../../src/agent/tools/postingTools.js';
import { loadBrandProfile } from '../../../src/config/index.js';

const brand = loadBrandProfile();
const mockedExecuteWithRecovery = vi.mocked(executeWithRecovery);

beforeEach(() => {
  mockedExecuteWithRecovery.mockClear();
});

describe('posting_first_comment: genera texto, nunca auto-publica', () => {
  it('devuelve el comentario listo para revisión humana sin tocar Computer Use', async () => {
    const raw = await executePostingTool(
      'posting_first_comment',
      {
        platform: 'instagram',
        post_url: 'https://instagram.com/p/x',
        comment_type: 'hashtags-only',
        hashtags: ['a', 'b'],
        niche: 'fitness',
      },
      brand,
    );
    const result = JSON.parse(raw);
    expect(result.ok).toBe(true);
    expect(result.comment_text).toBeTruthy();
    expect(result.summary).toMatch(/revisión humana/i);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });
});
