/**
 * TTS Engine — genera voiceovers con ElevenLabs u otros providers.
 */

import { log } from '../../agent/logger.js';
import { textToSpeech as elevenLabsTTS, isElevenLabsAvailable } from '../../integrations/elevenlabs.js';
import type { TTSTask } from './types.js';

export interface TTSInput {
  text: string;
  voiceId?: string;
  language?: 'es' | 'en' | 'pt';
  style?: 'conversational' | 'energetic' | 'calm' | 'professional';
}

const mockTTS = (input: TTSInput): TTSTask => {
  log.info(`[TTS] MOCK voiceover: ${input.text.slice(0, 60)}`);
  return {
    ok: true,
    audioUrl: `https://cdn.feedia.ai/mock/tts/${Date.now()}.mp3`,
    provider: 'tts-mock',
    voiceId: input.voiceId ?? 'default',
  };
};

export const generateVoiceover = async (input: TTSInput): Promise<TTSTask> => {
  if (isElevenLabsAvailable()) {
    return elevenLabsTTS({
      text: input.text,
      voiceId: input.voiceId,
    });
  }

  log.warn('[TTS] No TTS provider available. Using mock.');
  return mockTTS(input);
};

export const generateReelVoiceover = async (scriptText: string, voiceId?: string): Promise<TTSTask> =>
  generateVoiceover({ text: scriptText, voiceId, style: 'energetic' });
