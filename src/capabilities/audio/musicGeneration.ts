/**
 * Audio AI — Music Generation (Suno / Udio)
 * Genera música original para reels y TikTok.
 */

import { log } from '../../agent/logger.js';

export interface MusicGenerationRequest {
  prompt: string;
  style?: string;
  durationSec?: number;
  tempo?: 'slow' | 'medium' | 'fast';
  mood?: 'energetic' | 'chill' | 'epic' | 'emotional' | 'upbeat' | 'dark';
  instrumental?: boolean;
}

export interface GeneratedTrack {
  trackId: string;
  url: string;
  prompt: string;
  style: string;
  durationSec: number;
  bpm: number;
  tags: string[];
  createdAt: string;
}

export const generateMusic = async (req: MusicGenerationRequest): Promise<GeneratedTrack> => {
  const apiKey = process.env['SUNO_API_KEY'] ?? process.env['UDIO_API_KEY'] ?? '';
  const useSuno = Boolean(process.env['SUNO_API_KEY']);

  if (!apiKey) {
    log.info(`[MusicGen] DRY_RUN: Generating music for "${req.prompt}"`);
    return {
      trackId: `mock-music-${Date.now()}`,
      url: 'https://example.com/mock-track.mp3',
      prompt: req.prompt,
      style: req.style ?? 'pop electronic',
      durationSec: req.durationSec ?? 15,
      bpm: req.tempo === 'fast' ? 140 : req.tempo === 'slow' ? 80 : 120,
      tags: [req.mood ?? 'upbeat', req.style ?? 'pop', req.tempo ?? 'medium'],
      createdAt: new Date().toISOString(),
    };
  }

  // TODO: Implementar llamada real a Suno/Udio API
  // Suno: POST https://api.suno.ai/v1/generate
  // Udio: POST https://api.udio.com/v1/generate
  log.info(`[MusicGen] Calling ${useSuno ? 'Suno' : 'Udio'} API...`);

  return {
    trackId: `track-${Date.now()}`,
    url: 'https://cdn.example.com/track.mp3',
    prompt: req.prompt,
    style: req.style ?? 'pop',
    durationSec: req.durationSec ?? 15,
    bpm: 120,
    tags: [req.mood ?? 'upbeat'],
    createdAt: new Date().toISOString(),
  };
};

export const generateMusicForReel = async (theme: string, mood: string): Promise<GeneratedTrack> => {
  const prompt = `Upbeat ${mood} background music for Instagram reel about ${theme}. Catchy hook, modern production, 15 seconds.`;
  return generateMusic({
    prompt,
    mood: mood as 'energetic' | 'chill' | 'epic' | 'emotional' | 'upbeat' | 'dark' | undefined,
    durationSec: 15,
    instrumental: true,
  });
};

export const generateMusicForTikTok = async (niche: string, trendStyle?: string): Promise<GeneratedTrack> => {
  const prompt = `Trending TikTok sound for ${niche}. ${trendStyle ?? 'Fast cuts, big drop, viral potential'}. 15-20 seconds.`;
  return generateMusic({ prompt, durationSec: 15, tempo: 'fast', instrumental: true });
};

export const generateLoopMusic = async (theme: string): Promise<GeneratedTrack> => {
  const prompt = `Seamless looping background music for social media. ${theme}. No vocals, clean loop point.`;
  return generateMusic({ prompt, durationSec: 30, instrumental: true });
};
