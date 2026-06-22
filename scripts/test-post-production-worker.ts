#!/usr/bin/env node
/**
 * Script manual para probar el worker de post-producción en DRY_RUN.
 */

import { processVideoPostProduction } from '../src/workers/videoPostProductionWorker.js';
import type { Job } from 'bullmq';

async function main(): Promise<void> {
  const job = {
    id: 'manual-1',
    data: {
      payload: {
        provider: 'capcut' as const,
        requestId: `req-${Date.now()}`,
        videoUrl: 'https://cdn.test/video-base.mp4',
        audioUrl: 'https://cdn.test/audio.mp3',
        recipe: 'capcut-auto-captions',
        brandName: 'TestBrand',
        title: 'Reel de prueba',
        durationSec: 15,
      },
    },
  } as unknown as Job;

  const result = await processVideoPostProduction(job);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
