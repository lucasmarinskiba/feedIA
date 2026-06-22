// @ts-nocheck
/**
 * Quick Reel — Reel completo desde prompt mínimo.
 *
 * Reusa reelScriptwriter (guion completo). Output: package listo para render.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { generateReelScript, type ReelScript } from '../reelStudio/reelScriptwriter.js';

const REEL_DIR = path.resolve('data/quick-reel');

export interface QuickReelPrompt {
  prompt: string;
  duration?: 15 | 30 | 60 | 90; // presets de duración
  customDurationSec?: number; // sobreescribe duration (5-180s, ajustado al preset más cercano)
  style?: 'storytelling' | 'tutorial' | 'pov' | 'transformation' | 'comedy' | 'reaction' | 'listicle' | 'mythbusting';
  hook?: string;
  aspectRatio?: '9:16' | '1:1' | '4:5'; // 9:16 default (reels nativo)
}

/** Ajusta duración custom al preset disponible más cercano. */
const snapDuration = (sec?: number): 15 | 30 | 60 | 90 => {
  if (!sec) return 30;
  if (sec <= 22) return 15;
  if (sec <= 45) return 30;
  if (sec <= 75) return 60;
  return 90;
};

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(REEL_DIR, { recursive: true });
};

export const createQuickReel = async (brand: BrandProfile, input: QuickReelPrompt): Promise<ReelScript> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[quickReel] generating', { brandId, prompt: input.prompt.slice(0, 60) });

  const duration = input.customDurationSec ? snapDuration(input.customDurationSec) : (input.duration ?? 30);
  const script = await generateReelScript(brand, {
    topic: input.prompt,
    style: input.style ?? 'storytelling',
    duration,
    hook: input.hook,
  });

  await ensureDir();
  await fs.writeFile(path.join(REEL_DIR, `${brandId}-${script.id}.json`), JSON.stringify(script, null, 2), 'utf-8');
  return script;
};

export const getQuickReel = async (brandId: string, id: string): Promise<ReelScript | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(REEL_DIR, `${brandId}-${id}.json`), 'utf-8')) as ReelScript;
  } catch {
    return null;
  }
};
