/**
 * Video Engine types — modelos para producción de video con IA.
 */

import type { ReelScript } from '../content/reel.js';

export type VideoFormat = 'reel' | 'tiktok' | 'story' | 'youtube_short';

export interface VideoProductionInput {
  format: VideoFormat;
  script: ReelScript;
  topic: string;
  brandName: string;
  vertical?: boolean;
  durationSec?: number;
  style?: 'avatar' | 'broll' | 'motion' | 'mixed';
  brollUrls?: string[];
  coverUrl?: string;
}

export interface ProducedVideo {
  ok: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  provider: 'runway' | 'heygen' | 'ffmpeg' | 'mock' | 'none';
  durationSec: number;
  format: VideoFormat;
  metadata: {
    prompt?: string;
    taskId?: string;
    costEstimateUsd?: number;
  };
  error?: string;
}

export interface VideoEngineConfig {
  preferredProvider?: 'runway' | 'heygen' | 'ffmpeg';
  style?: 'avatar' | 'broll' | 'motion' | 'mixed';
  dryRun?: boolean;
  maxCostUsd?: number;
}
