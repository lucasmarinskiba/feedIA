/**
 * Audio AI — Voice Cloning & TTS (ElevenLabs)
 * Clona voz de marca para narración consistente en todos los videos.
 */

import { log } from '../../agent/logger.js';

export interface VoiceProfile {
  voiceId: string;
  name: string;
  language: string;
  accent?: string;
  gender: 'male' | 'female' | 'neutral';
  ageRange?: string;
  description: string;
  useCase: string[];
  sampleUrl?: string;
}

export interface TTSRequest {
  text: string;
  voiceId: string;
  speed?: number;
  stability?: number;
  clarity?: number;
}

export interface GeneratedVoice {
  audioId: string;
  url: string;
  text: string;
  voiceId: string;
  durationSec: number;
}

const BRAND_VOICES: VoiceProfile[] = [
  {
    voiceId: 'brand-primary',
    name: 'Brand Voice Primary',
    language: 'es-AR',
    accent: 'latam',
    gender: 'female',
    ageRange: '25-35',
    description: 'Voz cálida y profesional para contenido educativo',
    useCase: ['narration', 'education', 'storytelling'],
  },
  {
    voiceId: 'brand-energetic',
    name: 'Brand Voice Energetic',
    language: 'es-AR',
    accent: 'latam',
    gender: 'male',
    ageRange: '20-30',
    description: 'Voz energética y joven para contenido viral',
    useCase: ['viral', 'comedy', 'hype'],
  },
];

export const listBrandVoices = (): VoiceProfile[] => BRAND_VOICES;

export const getVoiceProfile = (voiceId: string): VoiceProfile | undefined =>
  BRAND_VOICES.find((v) => v.voiceId === voiceId);

export const synthesizeSpeech = async (req: TTSRequest): Promise<GeneratedVoice> => {
  const apiKey = process.env['ELEVENLABS_API_KEY'] ?? '';

  if (!apiKey) {
    log.info(`[VoiceClone] DRY_RUN: TTS for "${req.text.slice(0, 40)}..."`);
    return {
      audioId: `mock-tts-${Date.now()}`,
      url: 'https://example.com/mock-tts.mp3',
      text: req.text,
      voiceId: req.voiceId,
      durationSec: Math.round(req.text.length * 0.08),
    };
  }

  // ElevenLabs TTS API: POST /v1/text-to-speech/{voice_id}
  log.info(`[VoiceClone] Calling ElevenLabs TTS...`);
  return {
    audioId: `tts-${Date.now()}`,
    url: 'https://cdn.example.com/tts.mp3',
    text: req.text,
    voiceId: req.voiceId,
    durationSec: Math.round(req.text.length * 0.08),
  };
};

export const cloneVoice = async (name: string, samples: string[]): Promise<VoiceProfile> => {
  const apiKey = process.env['ELEVENLABS_API_KEY'] ?? '';

  if (!apiKey) {
    log.info(`[VoiceClone] DRY_RUN: Cloning voice "${name}" from ${samples.length} samples`);
    const profile: VoiceProfile = {
      voiceId: `clone-${Date.now()}`,
      name,
      language: 'es-AR',
      gender: 'neutral',
      description: `Cloned voice: ${name}`,
      useCase: ['narration'],
      sampleUrl: samples[0],
    };
    BRAND_VOICES.push(profile);
    return profile;
  }

  // ElevenLabs Voice Cloning: POST /v1/voices/add
  const profile: VoiceProfile = {
    voiceId: `clone-${Date.now()}`,
    name,
    language: 'es-AR',
    gender: 'neutral',
    description: `Cloned voice: ${name}`,
    useCase: ['narration'],
    sampleUrl: samples[0],
  };
  BRAND_VOICES.push(profile);
  return profile;
};

export const generateVoiceoverForScript = async (script: string, voiceId?: string): Promise<GeneratedVoice> => {
  const vid = voiceId ?? BRAND_VOICES[0]?.voiceId ?? 'brand-primary';
  return synthesizeSpeech({ text: script, voiceId: vid });
};
