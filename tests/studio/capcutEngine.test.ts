/**
 * Tests básicos del CapCut Studio Engine.
 *
 * Nota: en DRY_RUN no se llama a webhooks reales; se valida la estructura
 * de salida y el plan de Computer Use.
 */
import { describe, it, expect } from 'vitest';
import { CapCutEngine } from '../../src/studio/engines/capcutEngine.js';
import type { RenderRequest } from '../../src/studio/types.js';

const baseRequest = (overrides?: Partial<RenderRequest>): RenderRequest => ({
  id: 'test-capcut-1',
  format: 'mp4',
  title: 'Reel de prueba',
  brandProfileId: 'default',
  assets: [
    { id: 'v1', type: 'video', source: 'generated', url: 'https://cdn.test/video-base.mp4' },
    { id: 'a1', type: 'audio', source: 'generated', url: 'https://cdn.test/music.mp3' },
  ],
  fields: { texto_pantalla: 'Gancho inicial' },
  options: { beats: [{ texto: 'Beat 1', segundos: 3, notaVisual: 'b-roll genérico' }] },
  ...overrides,
});

describe('CapCutEngine (DRY_RUN)', () => {
  it('renderiza video simulado en dry run', async () => {
    const engine = new CapCutEngine({ recipe: 'capcut-auto-captions', brandName: 'TestBrand' });
    const request = baseRequest();
    const result = await engine.render(request);

    expect(result.ok).toBe(true);
    expect(result.engineName).toBe('capcut');
    expect(result.requestId).toBe(request.id);
    expect(result.artifactUrls?.length).toBeGreaterThan(0);
    expect(result.artifactUrls?.[0]).toMatch(/simulated-test-capcut-1\.mp4$/);
  });

  it('falla si no hay asset de video', async () => {
    const engine = new CapCutEngine();
    const request = baseRequest({ assets: [] });
    const result = await engine.render(request);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/requiere un asset de video/i);
  });

  it('solo soporta formato mp4', () => {
    const engine = new CapCutEngine();
    expect(engine.supports(baseRequest({ format: 'mp4' }))).toBe(true);
    expect(engine.supports(baseRequest({ format: 'png' }))).toBe(false);
  });
});
