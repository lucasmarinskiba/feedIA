/**
 * HeyGen API Integration — Avatares AI para video.
 * Usa la API REST de HeyGen cuando HEYGEN_API_KEY está configurada.
 */
import { log } from '../../agent/logger.js';

export interface HeyGenVideoOptions {
  script: string;
  avatarId?: string;
  voiceId?: string;
  language?: string;
  backgroundColor?: string;
}

export interface HeyGenResult {
  ok: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: string;
}

const HEYGEN_API_BASE = 'https://api.heygen.com/v2';

export const createAvatarVideo = async (opts: HeyGenVideoOptions): Promise<HeyGenResult> => {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'HEYGEN_API_KEY no configurada' };
  }

  try {
    log.info(`[HeyGenAPI] Creando video con avatar: "${opts.script.slice(0, 50)}..."`);

    const res = await fetch(`${HEYGEN_API_BASE}/video/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: opts.avatarId ?? 'Daisy-inskirt-20220818',
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: opts.script,
              voice_id: opts.voiceId ?? 'en-US-JennyNeural',
            },
            background: {
              type: 'color',
              value: opts.backgroundColor ?? '#ffffff',
            },
          },
        ],
        test: false,
        dimension: { width: 1080, height: 1920 },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HeyGen API error ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { data: { video_id: string } };
    return { ok: true, videoId: data.data.video_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const checkHeyGenVideo = async (videoId: string): Promise<HeyGenResult> => {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return { ok: false, error: 'HEYGEN_API_KEY no configurada' };

  try {
    const res = await fetch(`${HEYGEN_API_BASE}/video/status?video_id=${videoId}`, {
      headers: { 'X-Api-Key': apiKey },
    });
    const data = (await res.json()) as { data: { status: string; video_url?: string } };
    if (data.data.status === 'completed') {
      return { ok: true, videoId, videoUrl: data.data.video_url };
    }
    return { ok: false, error: `Estado: ${data.data.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};
