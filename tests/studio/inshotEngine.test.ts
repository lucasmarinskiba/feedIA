/**
 * Tests básicos del InShot Studio Engine.
 */
import { describe, it, expect } from 'vitest';
import { InShotEngine } from '../../src/studio/engines/inshotEngine.js';
import type { RenderRequest } from '../../src/studio/types.js';

const baseRequest = (overrides?: Partial<RenderRequest>): RenderRequest => ({
  id: 'test-inshot-1',
  format: 'mp4',
  title: 'Story de prueba',
  brandProfileId: 'default',
  assets: [{ id: 'v1', type: 'video', source: 'generated', url: 'https://cdn.test/video-base.mp4' }],
  fields: {},
  options: { captions: ['Hola', 'Mundo'] },
  ...overrides,
});

describe('InShotEngine (DRY_RUN)', () => {
  it('renderiza video simulado', async () => {
    const engine = new InShotEngine({ recipe: 'inshot-auto-captions', brandName: 'TestBrand' });
    const result = await engine.render(baseRequest());
    expect(result.ok).toBe(true);
    expect(result.engineName).toBe('inshot');
    expect(result.artifactUrls?.[0]).toMatch(/simulated-test-inshot-1\.mp4$/);
  });

  it('falla si no hay video', async () => {
    const engine = new InShotEngine();
    const result = await engine.render(baseRequest({ assets: [] }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/requiere un asset de video/i);
  });

  it('soporta mp4 y png', () => {
    const engine = new InShotEngine();
    expect(engine.supports(baseRequest({ format: 'mp4' }))).toBe(true);
    expect(engine.supports(baseRequest({ format: 'png' }))).toBe(true);
    expect(engine.supports(baseRequest({ format: 'jpg' }))).toBe(false);
  });
});
