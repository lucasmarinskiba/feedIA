/**
 * Tests básicos para Motion Graphics Engine
 */
import { describe, it, expect } from 'vitest';
import {
  generateMotionGraphic,
  generateTextRevealLottie,
  generateZoomPulseLottie,
  listMotionGraphics,
} from '../../../src/capabilities/creativeSuite/motionGraphics.js';

describe('MotionGraphicsEngine', () => {
  it('genera un Lottie de text reveal con estructura válida', () => {
    const result = generateMotionGraphic({ type: 'text_reveal', text: 'Hook poderoso', width: 1080, height: 1920 });
    expect(result.json).toBeTruthy();
    expect(result.lottie.v).toBe('5.7.0');
    expect(result.lottie.w).toBe(1080);
    expect(result.lottie.h).toBe(1920);
    expect(result.lottie.layers.length).toBeGreaterThan(0);
  });

  it('genera un Lottie de zoom/pulse sin texto', () => {
    const result = generateMotionGraphic({ type: 'zoom', width: 1080, height: 1920 });
    expect(result.lottie.nm).toContain('zoom');
    expect(result.lottie.layers.length).toBeGreaterThan(0);
  });

  it('text reveal contiene el texto en alguna capa', () => {
    const text = 'Texto de prueba';
    const lottie = generateTextRevealLottie(text, 1080, 1920);
    const hasTextLayer = lottie.layers.some((layer: unknown) => {
      const l = layer as { nm?: string; t?: { d?: { k?: Array<{ s?: { t?: string } }> } } };
      if (l.nm === text) return true;
      const firstText = l.t?.d?.k?.[0]?.s?.t;
      return firstText === text;
    });
    expect(hasTextLayer).toBe(true);
  });

  it('zoom pulse tiene una capa de forma animada', () => {
    const lottie = generateZoomPulseLottie(1080, 1920);
    const shapeLayer = lottie.layers.find((layer: unknown) => {
      const l = layer as { ty?: number; shapes?: unknown[] };
      return l.ty === 4 && Array.isArray(l.shapes) && l.shapes.length > 0;
    });
    expect(shapeLayer).toBeDefined();
  });

  it('lista motion graphics disponibles', () => {
    const graphics = listMotionGraphics();
    expect(graphics.length).toBeGreaterThanOrEqual(3);
    expect(graphics.some((g) => g.type === 'text_reveal')).toBe(true);
    expect(graphics.some((g) => g.type === 'zoom')).toBe(true);
  });
});
