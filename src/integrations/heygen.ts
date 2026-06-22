/**
 * HeyGen integration — avatares AI y voiceovers para video.
 * Docs: https://docs.heygen.com
 */

import { log } from '../agent/logger.js';

const HEYGEN_API_KEY = process.env['HEYGEN_API_KEY'] ?? '';
const HEYGEN_BASE = 'https://api.heygen.com/v2';
const DRY_RUN = process.env['DRY_RUN'] === 'true';

export interface HeyGenAvatarInput {
  script: string;
  avatarId?: string;
  voiceId?: string;
  background?: string;
  vertical?: boolean;
}

export interface HeyGenVideo {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  error?: string;
}

const mockGenerate = (input: HeyGenAvatarInput): HeyGenVideo => {
  log.info(`[HeyGen] MOCK generate: ${input.script.slice(0, 60)}`);
  return {
    id: `mock-heygen-${Date.now()}`,
    status: 'completed',
    url: `https://cdn.feedia.ai/mock/heygen/${Date.now()}.mp4`,
  };
};

export const generateAvatarVideo = async (input: HeyGenAvatarInput): Promise<HeyGenVideo> => {
  if (DRY_RUN || !HEYGEN_API_KEY) {
    return mockGenerate(input);
  }

  try {
    const response = await fetch(`${HEYGEN_BASE}/video/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HEYGEN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: input.avatarId ?? 'Daisy-inskirt-20220818',
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: input.script,
              voice_id: input.voiceId ?? '2d5b0e6cf36f460aa7a6d5d6b0e6cf36',
            },
            background: {
              type: 'color',
              value: input.background ?? '#000000',
            },
          },
        ],
        dimension: input.vertical ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HeyGen API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { data: { video_id: string } };
    return { id: data.data.video_id, status: 'pending' };
  } catch (err) {
    log.warn(`[HeyGen] Generate failed: ${(err as Error).message}. Fallback to mock.`);
    return mockGenerate(input);
  }
};

export const getVideo = async (videoId: string): Promise<HeyGenVideo> => {
  if (videoId.startsWith('mock-')) {
    return { id: videoId, status: 'completed', url: `https://cdn.feedia.ai/mock/heygen/${Date.now()}.mp4` };
  }

  try {
    const response = await fetch(`${HEYGEN_BASE}/video/status?video_id=${videoId}`, {
      headers: { Authorization: `Bearer ${HEYGEN_API_KEY}` },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HeyGen API error ${response.status}: ${text}`);
    }
    const data = (await response.json()) as { data: { status: string; video_url?: string; error?: string } };
    return {
      id: videoId,
      status: data.data.status as HeyGenVideo['status'],
      url: data.data.video_url,
      error: data.data.error,
    };
  } catch (err) {
    return { id: videoId, status: 'failed', error: (err as Error).message };
  }
};

export const pollUntilComplete = async (
  videoId: string,
  opts: { maxAttempts?: number; delayMs?: number } = {},
): Promise<HeyGenVideo> => {
  const { maxAttempts = 30, delayMs = 10_000 } = opts;
  for (let i = 0; i < maxAttempts; i++) {
    const video = await getVideo(videoId);
    if (video.status === 'completed' || video.status === 'failed') return video;
    log.info(`[HeyGen] Video ${videoId} status: ${video.status}. Waiting...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { id: videoId, status: 'failed', error: 'Polling timeout' };
};

export const isHeyGenAvailable = (): boolean => Boolean(HEYGEN_API_KEY);
