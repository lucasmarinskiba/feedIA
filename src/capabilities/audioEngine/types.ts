/**
 * Audio Engine types — modelos para producción de audio (TTS, música, SFX).
 */

export interface TTSTask {
  ok: boolean;
  audioUrl?: string;
  audioBase64?: string;
  provider: string;
  voiceId?: string;
  error?: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  mood: 'upbeat' | 'chill' | 'dramatic' | 'funny' | 'inspirational' | 'trending';
  bpm: number;
  durationSec: number;
  genre: string;
  url?: string;
  license: 'free' | 'licensed' | 'trending';
}

export interface AudioMixInput {
  voiceover?: TTSTask;
  music?: MusicTrack;
  soundEffects?: string[];
  sfxUrls?: string[];
  targetDurationSec: number;
}

export interface AudioMixResult {
  ok: boolean;
  audioUrl?: string;
  provider: string;
  error?: string;
}
