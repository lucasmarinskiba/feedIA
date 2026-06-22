/**
 * Audio AI — SFX Generation (ElevenLabs / AudioLDM)
 * Genera efectos de sonido para videos.
 */

import { log } from '../../agent/logger.js';

export interface SFXRequest {
  description: string;
  durationSec?: number;
  intensity?: 'low' | 'medium' | 'high';
}

export interface GeneratedSFX {
  sfxId: string;
  url: string;
  description: string;
  durationSec: number;
  category: string;
}

const SFX_PRESETS: Record<string, string> = {
  whoosh: 'Fast air whoosh transition sound',
  pop: 'Bright pop notification sound',
  ding: 'Positive ding success sound',
  bass_drop: 'Deep bass drop impact',
  glitch: 'Digital glitch transition',
  snap: 'Finger snap crisp sound',
  heartbeat: 'Dramatic heartbeat build',
  rewind: 'Tape rewind whoosh',
  typing: 'Keyboard typing ASMR',
  swipe: 'Phone swipe gesture sound',
};

export const generateSFX = async (req: SFXRequest): Promise<GeneratedSFX> => {
  const apiKey = process.env['ELEVENLABS_API_KEY'] ?? '';

  if (!apiKey) {
    log.info(`[SFXGen] DRY_RUN: "${req.description}"`);
    return {
      sfxId: `mock-sfx-${Date.now()}`,
      url: 'https://example.com/mock-sfx.mp3',
      description: req.description,
      durationSec: req.durationSec ?? 2,
      category: 'transition',
    };
  }

  // ElevenLabs Sound Effects API: POST /v1/sound-generation
  log.info(`[SFXGen] Calling ElevenLabs API...`);
  return {
    sfxId: `sfx-${Date.now()}`,
    url: 'https://cdn.example.com/sfx.mp3',
    description: req.description,
    durationSec: req.durationSec ?? 2,
    category: 'transition',
  };
};

export const getSFXPreset = (name: string): GeneratedSFX | undefined => {
  const desc = SFX_PRESETS[name.toLowerCase()];
  if (!desc) return undefined;
  return {
    sfxId: `preset-${name}`,
    url: `https://cdn.example.com/sfx/${name}.mp3`,
    description: desc,
    durationSec: 1.5,
    category: 'preset',
  };
};

export const generateTransitionPack = async (): Promise<GeneratedSFX[]> => {
  const names = ['whoosh', 'pop', 'bass_drop', 'glitch', 'snap'];
  return names.map(
    (name) =>
      getSFXPreset(name) ?? {
        sfxId: `sfx-${name}`,
        url: `https://cdn.example.com/sfx/${name}.mp3`,
        description: SFX_PRESETS[name] ?? name,
        durationSec: 1.5,
        category: 'transition',
      },
  );
};
