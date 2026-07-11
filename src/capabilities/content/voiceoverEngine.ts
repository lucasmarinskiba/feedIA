/**
 * Phase 11: Voiceover Engine
 *
 * Generates text-to-speech audio specs & timing
 * Includes tone, emotion, pacing
 */

import { log } from '../../agent/logger.js';
import type { VideoScript } from './videoScriptGenerator.js';

export interface VoiceoverSegment {
  second: number;
  text: string;
  duration: number;
  voice: {
    gender: 'male' | 'female' | 'neutral';
    tone: 'energetic' | 'calm' | 'urgent' | 'friendly' | 'professional';
    pace: 'slow' | 'normal' | 'fast';
    pitch: 'low' | 'medium' | 'high';
  };
  provider?: 'google-tts' | 'eleven-labs' | 'elevenlabs-premium';
}

export interface VoiceoverTrack {
  totalDuration: number;
  segments: VoiceoverSegment[];
  audioUrl?: string;
  metadata: {
    language: string;
    emotion: string;
    hookStyle: string;
  };
}

export const generateVoiceoverTrack = (
  script: VideoScript,
  voicePreference?: {gender?: string; tone?: string} | undefined,
): VoiceoverTrack => {
  log.info(`[Voiceover] Generating TTS track for ${script.duration}s video`);

  const segments: VoiceoverSegment[] = [];

  // Hook segment: Energetic, fast-paced
  segments.push({
    second: 0,
    text: script.hook,
    duration: calculateDuration(script.hook, 'fast'),
    voice: {
      gender: voicePreference?.gender === 'male' ? 'male' : 'female',
      tone: 'energetic',
      pace: 'fast',
      pitch: 'high',
    },
    provider: 'eleven-labs',
  });

  // Scene segments: Mix of tones
  script.scenes.forEach((scene, idx) => {
    const isValueSection = scene.second >= 5 && scene.second < script.duration - 5;

    segments.push({
      second: scene.second,
      text: scene.voiceover,
      duration: calculateDuration(scene.voiceover, 'normal'),
      voice: {
        gender: voicePreference?.gender === 'male' ? 'male' : 'female',
        tone: isValueSection ? 'professional' : 'urgent',
        pace: isValueSection ? 'normal' : 'fast',
        pitch: 'medium',
      },
      provider: 'eleven-labs',
    });
  });

  // CTA segment: Urgent, friendly
  segments.push({
    second: script.duration - 5,
    text: script.cta,
    duration: calculateDuration(script.cta, 'normal'),
    voice: {
      gender: voicePreference?.gender === 'male' ? 'male' : 'female',
      tone: 'friendly',
      pace: 'normal',
      pitch: 'medium',
    },
    provider: 'eleven-labs',
  });

  return {
    totalDuration: script.duration,
    segments,
    metadata: {
      language: 'es',
      emotion: 'energetic',
      hookStyle: 'curiosity-driven',
    },
  };
};

const calculateDuration = (text: string, pace: 'slow' | 'normal' | 'fast'): number => {
  // Avg: 140 words/min normal = 0.43s per word
  const wordCount = text.split(' ').length;
  const baseWPM = 140;

  const paceMultiplier: Record<string, number> = {
    slow: 0.7,
    normal: 1.0,
    fast: 1.4,
  };

  const secondsPerWord = 60 / (baseWPM * (paceMultiplier[pace] ?? 1.0));
  return Math.ceil(wordCount * secondsPerWord);
};

export const generateTTSMarkup = (segment: VoiceoverSegment): string => {
  // SSML-like markup for TTS engines
  const toneAttrs: Record<string, string> = {
    energetic: 'rate="1.3" pitch="+20%"',
    calm: 'rate="0.8" pitch="-10%"',
    urgent: 'rate="1.2" pitch="+15%"',
    friendly: 'rate="1.0" pitch="+5%"',
    professional: 'rate="0.95" pitch="0%"',
  };

  return `<speak rate="${toneAttrs[segment.voice.tone]}">${segment.text}</speak>`;
};
