/**
 * Tests del Instagram Web Operator (modo DRY_RUN).
 */
import { describe, it, expect } from 'vitest';
import { InstagramWebOperator } from '../../src/browserOperators/instagram/instagramWebOperator.js';
import { loadBrandProfile } from '../../src/config/index.js';

const brand = loadBrandProfile();

describe('InstagramWebOperator', () => {
  it('se inicializa en modo dry_run sin Playwright', async () => {
    const op = new InstagramWebOperator({ brand, headless: true, dryRun: true });
    expect(op.getPlatform()).toBe('instagram-web');
    expect(op.isDryRun()).toBe(true);
  });

  it('healthCheck retorna healthy en dry_run', async () => {
    const op = new InstagramWebOperator({ brand, headless: true, dryRun: true });
    const health = await op.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.details.mode).toBe('dry_run');
  });

  it('publishPost en dry_run no falla', async () => {
    const op = new InstagramWebOperator({ brand, headless: true, dryRun: true });
    const result = await op.publishPost({
      imagePaths: ['test.jpg'],
      caption: 'Test post',
      hashtags: ['#test'],
    });
    expect(result.ok).toBe(true);
    expect(result.action).toBe('publishPost');
  });

  it('publishReel en dry_run no falla', async () => {
    const op = new InstagramWebOperator({ brand, headless: true, dryRun: true });
    const result = await op.publishReel({
      videoPath: 'test.mp4',
      caption: 'Test reel',
    });
    expect(result.ok).toBe(true);
    expect(result.action).toBe('publishReel');
  });

  it('publishStory en dry_run no falla', async () => {
    const op = new InstagramWebOperator({ brand, headless: true, dryRun: true });
    const result = await op.publishStory({
      mediaPath: 'test.jpg',
    });
    expect(result.ok).toBe(true);
    expect(result.action).toBe('publishStory');
  });
});
