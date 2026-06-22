/**
 * ElevenLabs integration — text-to-speech de alta calidad.
 * Docs: https://elevenlabs.io/docs
 */

import { log } from '../agent/logger.js';

const ELEVENLABS_API_KEY = process.env['ELEVENLABS_API_KEY'] ?? '';
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const DRY_RUN = process.env['DRY_RUN'] === 'true';

export interface TTSInput {
  text: string;
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface TTSResult {
  ok: boolean;
  audioUrl?: string;
  audioBase64?: string;
  error?: string;
  provider: string;
}

const mockTTS = (input: TTSInput): TTSResult => {
  log.info(`[ElevenLabs] MOCK TTS: ${input.text.slice(0, 60)}`);
  return {
    ok: true,
    audioUrl: `https://cdn.feedia.ai/mock/elevenlabs/${Date.now()}.mp3`,
    provider: 'elevenlabs-mock',
  };
};

export const textToSpeech = async (input: TTSInput): Promise<TTSResult> => {
  if (DRY_RUN || !ELEVENLABS_API_KEY) {
    return mockTTS(input);
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${input.voiceId ?? '21m00Tcm4TlvDq8ikWAM'}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: input.text,
        model_id: input.model ?? 'eleven_multilingual_v2',
        voice_settings: {
          stability: input.stability ?? 0.5,
          similarity_boost: input.similarityBoost ?? 0.75,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ElevenLabs API error ${response.status}: ${text}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: true,
      audioBase64: buffer.toString('base64'),
      provider: 'elevenlabs',
    };
  } catch (err) {
    log.warn(`[ElevenLabs] TTS failed: ${(err as Error).message}. Fallback to mock.`);
    return mockTTS(input);
  }
};

export const isElevenLabsAvailable = (): boolean => Boolean(ELEVENLABS_API_KEY);
