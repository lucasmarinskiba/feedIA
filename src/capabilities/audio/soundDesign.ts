/**
 * Audio AI — Sound Design
 * Combina música, SFX y voiceover en un mix profesional para reels/TikTok.
 */

import type { GeneratedTrack } from './musicGeneration.js';
import type { GeneratedSFX } from './sfxGeneration.js';
import type { GeneratedVoice } from './voiceCloning.js';

export interface SoundDesignProject {
  projectId: string;
  name: string;
  durationSec: number;
  layers: SoundLayer[];
  masterVolume: number;
  exportFormat: 'mp3' | 'wav' | 'm4a';
}

export interface SoundLayer {
  id: string;
  type: 'music' | 'sfx' | 'voice' | 'ambient';
  assetUrl: string;
  startTime: number;
  endTime: number;
  volume: number; // 0-1
  fadeIn?: number;
  fadeOut?: number;
  pan?: number; // -1 (left) to 1 (right)
}

export interface SoundDesignRecipe {
  name: string;
  description: string;
  forFormat: 'reel' | 'tiktok' | 'story' | 'youtube_short';
  layers: Array<{
    type: SoundLayer['type'];
    timing: 'full' | 'intro' | 'hook' | 'outro' | 'transitions';
    volume: number;
    notes: string;
  }>;
}

const RECIPES: SoundDesignRecipe[] = [
  {
    name: 'TikTok Viral Drop',
    description: 'Música con drop en 3s, SFX en transiciones, voiceover limpio',
    forFormat: 'tiktok',
    layers: [
      { type: 'music', timing: 'full', volume: 0.35, notes: '128bpm, drop at 3.5s' },
      { type: 'sfx', timing: 'transitions', volume: 0.6, notes: 'whoosh on cuts' },
      { type: 'voice', timing: 'hook', volume: 0.9, notes: 'voiceover en primeros 5s' },
    ],
  },
  {
    name: 'Reel Storytime',
    description: 'Voiceover dominante, música lo-fi de fondo, mínimo SFX',
    forFormat: 'reel',
    layers: [
      { type: 'music', timing: 'full', volume: 0.2, notes: 'lo-fi, no vocals' },
      { type: 'voice', timing: 'full', volume: 0.95, notes: 'narración clara' },
      { type: 'sfx', timing: 'transitions', volume: 0.3, notes: 'subtle transitions only' },
    ],
  },
  {
    name: 'Hype Reel',
    description: 'Música hype alta, SFX intensos, voiceover energético',
    forFormat: 'reel',
    layers: [
      { type: 'music', timing: 'full', volume: 0.5, notes: '140bpm hype beat' },
      { type: 'sfx', timing: 'transitions', volume: 0.7, notes: 'bass drops, impacts' },
      { type: 'voice', timing: 'hook', volume: 0.85, notes: 'energetic, short phrases' },
    ],
  },
];

export const getRecipe = (name: string): SoundDesignRecipe | undefined => RECIPES.find((r) => r.name === name);

export const listRecipes = (forFormat?: string): SoundDesignRecipe[] => {
  if (forFormat) return RECIPES.filter((r) => r.forFormat === forFormat);
  return RECIPES;
};

export const createSoundDesign = (
  name: string,
  durationSec: number,
  music?: GeneratedTrack,
  sfxList?: GeneratedSFX[],
  voice?: GeneratedVoice,
): SoundDesignProject => {
  const layers: SoundLayer[] = [];

  if (music) {
    layers.push({
      id: 'layer-music',
      type: 'music',
      assetUrl: music.url,
      startTime: 0,
      endTime: durationSec,
      volume: 0.35,
      fadeIn: 0.5,
      fadeOut: 1.0,
    });
  }

  if (voice) {
    layers.push({
      id: 'layer-voice',
      type: 'voice',
      assetUrl: voice.url,
      startTime: 0,
      endTime: Math.min(durationSec, voice.durationSec),
      volume: 0.9,
    });
  }

  if (sfxList) {
    for (let i = 0; i < sfxList.length; i++) {
      const sfx = sfxList[i]!;
      layers.push({
        id: `layer-sfx-${i}`,
        type: 'sfx',
        assetUrl: sfx.url,
        startTime: (i + 1) * (durationSec / (sfxList.length + 1)),
        endTime: (i + 1) * (durationSec / (sfxList.length + 1)) + sfx.durationSec,
        volume: 0.6,
      });
    }
  }

  return {
    projectId: `sd-${Date.now()}`,
    name,
    durationSec,
    layers,
    masterVolume: 1.0,
    exportFormat: 'mp3',
  };
};

export const autoDesignForVideo = (
  videoType: 'reel' | 'tiktok',
  durationSec: number,
  topic: string,
  hasVoiceover: boolean,
): SoundDesignRecipe => {
  if (videoType === 'tiktok') {
    return RECIPES[0]!; // TikTok Viral Drop
  }
  if (hasVoiceover) {
    return topic.toLowerCase().includes('hype') || topic.toLowerCase().includes('sale')
      ? RECIPES[2]! // Hype Reel
      : RECIPES[1]!; // Reel Storytime
  }
  return RECIPES[2]!;
};
