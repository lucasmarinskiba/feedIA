/**
 * SFX Engine — genera/busca efectos de sonido para videos.
 *
 * Soporta:
 * - ElevenLabs Sound Effects API (con ELEVENLABS_API_KEY).
 * - Catálogo local mock como fallback.
 */

import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';

const ELEVENLABS_API_KEY = process.env['ELEVENLABS_API_KEY'] ?? '';
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

export type SfxName = 'pop' | 'whoosh' | 'notification' | 'like' | 'transition' | 'success' | 'error';

const CATALOGUE: Record<SfxName, string> = {
  pop: 'https://cdn.feedia.ai/mock/sfx/pop.mp3',
  whoosh: 'https://cdn.feedia.ai/mock/sfx/whoosh.mp3',
  notification: 'https://cdn.feedia.ai/mock/sfx/notification.mp3',
  like: 'https://cdn.feedia.ai/mock/sfx/like.mp3',
  transition: 'https://cdn.feedia.ai/mock/sfx/transition.mp3',
  success: 'https://cdn.feedia.ai/mock/sfx/success.mp3',
  error: 'https://cdn.feedia.ai/mock/sfx/error.mp3',
};

const PROMPTS: Record<SfxName, string> = {
  pop: 'Short bright pop sound effect for social media',
  whoosh: 'Fast whoosh transition sound effect',
  notification: 'Clean notification ding sound effect',
  like: 'Social media like heart pop sound effect',
  transition: 'Quick swipe transition sound effect',
  success: 'Positive success chime sound effect',
  error: 'Soft error buzz sound effect',
};

export interface SfxResult {
  ok: boolean;
  url?: string;
  provider: string;
  error?: string;
}

const mockSfx = (name: SfxName): SfxResult => ({
  ok: true,
  url: CATALOGUE[name],
  provider: 'mock-sfx',
});

export const generateSfx = async (name: SfxName): Promise<SfxResult> => {
  if (env.dryRun || !ELEVENLABS_API_KEY) {
    return mockSfx(name);
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE}/sound-generation`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: PROMPTS[name],
        duration_seconds: 2,
        prompt_influence: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ElevenLabs SFX error ${response.status}: ${text}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');
    const url = `data:audio/mpeg;base64,${base64}`;
    return { ok: true, url, provider: 'elevenlabs-sfx' };
  } catch (err) {
    log.warn(`[SFX] ${name} failed: ${(err as Error).message}. Fallback a catálogo.`);
    return mockSfx(name);
  }
};

export const getSfxUrl = (name: SfxName): string => CATALOGUE[name] ?? CATALOGUE.pop!;

export const listSfx = (): SfxName[] => Object.keys(CATALOGUE) as SfxName[];
