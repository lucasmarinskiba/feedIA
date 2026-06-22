/**
 * Tests básicos para publicación cross-platform unificada.
 */
import { describe, it, expect } from 'vitest';
import { publishToSocialPlatforms } from '../../src/integrations/socialPublisher.js';
import type { CarruselResult } from '../../src/capabilities/content/carrusel.js';

const carrusel: CarruselResult = {
  slides: [
    { numero: 1, titulo: 'Gancho', cuerpo: 'Problema', rolEnNarrativa: 'gancho', direccionVisual: 'persona' },
    { numero: 2, titulo: 'Solución', cuerpo: 'Pasos', rolEnNarrativa: 'desarrollo', direccionVisual: 'lista' },
    { numero: 3, titulo: 'CTA', cuerpo: 'Guardalo', rolEnNarrativa: 'cta', direccionVisual: 'CTA' },
  ],
  caption: 'caption',
  hashtags: ['#test'],
  cta: 'Guardalo',
  formatoOptimo: '4:5',
  notasDiseno: '',
};

describe('SocialPublisher (DRY_RUN)', () => {
  it('publica reel en Instagram y TikTok con una sola llamada', async () => {
    const result = await publishToSocialPlatforms({
      platforms: ['instagram', 'tiktok'],
      format: 'reel',
      caption: 'Test reel',
      mediaUrls: ['https://cdn.test/video.mp4'],
    });
    expect(result.ok).toBe(true);
    expect(result.perPlatform.length).toBe(2);
    expect(result.perPlatform.some((p) => p.platform === 'instagram')).toBe(true);
    expect(result.perPlatform.some((p) => p.platform === 'tiktok')).toBe(true);
    expect(result.uploads.length).toBe(1);
  });

  it('publica carrusel en Instagram y genera video para TikTok', async () => {
    const result = await publishToSocialPlatforms({
      platforms: ['instagram', 'tiktok'],
      format: 'carrusel',
      caption: 'Test carrusel',
      mediaUrls: ['https://cdn.test/slide1.png', 'https://cdn.test/slide2.png', 'https://cdn.test/slide3.png'],
      carrusel,
      brandName: 'TestBrand',
    });
    expect(result.ok).toBe(true);
    const ig = result.perPlatform.find((p) => p.platform === 'instagram');
    const tt = result.perPlatform.find((p) => p.platform === 'tiktok');
    expect(ig).toBeDefined();
    expect(tt).toBeDefined();
    expect(result.uploads.length).toBe(2); // IG + TikTok
  });

  it('rechaza publicar story en TikTok', async () => {
    const result = await publishToSocialPlatforms({
      platforms: ['instagram', 'tiktok'],
      format: 'story',
      caption: 'Test story',
      mediaUrls: ['https://cdn.test/story.png'],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('TikTok'))).toBe(true);
  });

  it('programa publicación cuando se pasa scheduledAt', async () => {
    const result = await publishToSocialPlatforms({
      platforms: ['instagram'],
      format: 'reel',
      caption: 'Test scheduled',
      mediaUrls: ['https://cdn.test/video.mp4'],
      scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    const ig = result.perPlatform.find((p) => p.platform === 'instagram');
    expect(ig?.status).toBe('scheduled');
  });
});
