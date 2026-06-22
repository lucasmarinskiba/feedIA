/**
 * Tests del worker de post-producción de video.
 */
import { describe, it, expect } from 'vitest';
import { processVideoPostProduction } from '../../src/workers/videoPostProductionWorker.js';
import type { Job } from 'bullmq';

describe('VideoPostProductionWorker (DRY_RUN)', () => {
  it('simula refinado CapCut en dry run', async () => {
    const job = {
      id: 'job-1',
      data: {
        payload: {
          provider: 'capcut',
          requestId: 'req-1',
          videoUrl: 'https://cdn.test/video.mp4',
          recipe: 'capcut-auto-captions',
          brandName: 'TestBrand',
          title: 'Reel test',
        },
      },
    } as unknown as Job;

    const result = await processVideoPostProduction(job);
    expect(result.ok).toBe(true);
    expect(result.provider).toBe('capcut');
    expect(result.refinedUrl).toMatch(/simulated-req-1\.mp4$/);
  });

  it('simula refinado InShot en dry run', async () => {
    const job = {
      id: 'job-2',
      data: {
        payload: {
          provider: 'inshot',
          requestId: 'req-2',
          videoUrl: 'https://cdn.test/video.mp4',
        },
      },
    } as unknown as Job;

    const result = await processVideoPostProduction(job);
    expect(result.ok).toBe(true);
    expect(result.provider).toBe('inshot');
  });
});
