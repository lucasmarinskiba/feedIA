/**
 * AR Effect Composer — Compone efectos AR complejos combinando múltiples elementos.
 * Crea secuencias de efectos, transiciones, y experiencias inmersivas.
 */

import { log } from '../../agent/logger.js';
import type { ARFilter } from './arFilterGenerator.js';

export interface AREffectSequence {
  id: string;
  name: string;
  filters: Array<{ filterId: string; durationSec: number; trigger: string }>;
  totalDurationSec: number;
  musicSync?: boolean;
  platform: 'instagram' | 'tiktok' | 'both';
}

export interface ARExport {
  format: 'spark_ar' | 'effect_house' | 'json';
  fileSizeMb: number;
  compatibility: string[];
  assets: string[];
}

const sequences: AREffectSequence[] = [];

export const composeSequence = (
  name: string,
  filters: ARFilter[],
  platform: AREffectSequence['platform'],
): AREffectSequence => {
  const totalDuration = filters.length * 3; // 3 sec per filter

  const sequence: AREffectSequence = {
    id: `seq-${Date.now()}`,
    name,
    filters: filters.map((f, i) => ({
      filterId: f.id,
      durationSec: 3,
      trigger: i === 0 ? 'tap' : 'timer',
    })),
    totalDurationSec: totalDuration,
    musicSync: filters.some((f) => f.type === 'overlay'),
    platform,
  };

  sequences.push(sequence);
  log.info(`[AR] Sequence composed: ${sequence.name} (${sequence.totalDurationSec}s, ${filters.length} filters)`);
  return sequence;
};

export const exportEffect = (sequence: AREffectSequence, format: ARExport['format'] = 'json'): ARExport => {
  const hash = sequence.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);

  const exportData: ARExport = {
    format,
    fileSizeMb: Math.round((0.5 + (hash % 50) / 100) * 100) / 100,
    compatibility:
      sequence.platform === 'both'
        ? ['Instagram', 'TikTok']
        : [sequence.platform === 'instagram' ? 'Instagram' : 'TikTok'],
    assets: sequence.filters.map((f) => `asset_${f.filterId}.png`),
  };

  log.info(`[AR] Exported ${sequence.name} as ${format} (${exportData.fileSizeMb}MB)`);
  return exportData;
};

export const addTransition = (
  sequence: AREffectSequence,
  type: 'fade' | 'slide' | 'zoom' | 'morph',
): AREffectSequence => {
  sequence.filters = sequence.filters.map((f, i) =>
    i < sequence.filters.length - 1 ? ({ ...f, transition: type } as unknown as typeof f) : f,
  );
  log.info(`[AR] Added ${type} transitions to ${sequence.name}`);
  return sequence;
};

export const listSequences = (): AREffectSequence[] => sequences.slice(-20);
