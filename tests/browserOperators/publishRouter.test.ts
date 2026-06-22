/**
 * Tests del Publish Router.
 */
import { describe, it, expect } from 'vitest';
import { checkPublishHealth, publishToInstagramViaRouter } from '../../src/browserOperators/instagram/publishRouter.js';
import { loadBrandProfile } from '../../src/config/index.js';

const brand = loadBrandProfile();

describe('PublishRouter', () => {
  it('checkPublishHealth retorna estado de las 3 vías', async () => {
    const health = await checkPublishHealth(brand);
    expect(health).toHaveProperty('api');
    expect(health).toHaveProperty('web');
    expect(health).toHaveProperty('app');
    expect(health).toHaveProperty('recommended');
    expect(['api', 'web', 'app']).toContain(health.recommended);
  });

  it('publishToInstagramViaRouter funciona en dry_run', async () => {
    const result = await publishToInstagramViaRouter(brand, {
      format: 'post',
      mediaPaths: ['test.jpg'],
      caption: 'Test via router',
    });
    // En dry_run, debería intentar API primero, luego fallback
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('via');
    expect(result).toHaveProperty('durationMs');
  });

  it('publishToInstagramViaRouter con via forzada', async () => {
    const result = await publishToInstagramViaRouter(
      brand,
      {
        format: 'story',
        mediaPaths: ['test.jpg'],
        caption: '',
      },
      'web',
    );
    expect(result.via).toBe('web');
  });
});
