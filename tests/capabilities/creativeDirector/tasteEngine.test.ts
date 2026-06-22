/**
 * Tests del motor de taste/gusto creativo.
 */
import { describe, it, expect } from 'vitest';
import { evaluateTaste, generateFeedback } from '../../../src/capabilities/creativeDirector/index.js';
import type { CarruselResult } from '../../../src/capabilities/content/carrusel.js';

const carrusel: CarruselResult = {
  slides: [
    { numero: 1, titulo: 'Cómo crecer en Instagram', cuerpo: 'Descubrí el método.', rolEnNarrativa: 'gancho', direccionVisual: 'tipografía bold' },
    { numero: 2, titulo: 'El problema', cuerpo: 'No sabés qué publicar.', rolEnNarrativa: 'tension', direccionVisual: 'imagen' },
    { numero: 3, titulo: 'La solución', cuerpo: 'Sistema de contenido.', rolEnNarrativa: 'desarrollo', direccionVisual: 'diagrama' },
    { numero: 4, titulo: 'Implementalo hoy', cuerpo: 'Paso a paso.', rolEnNarrativa: 'cta', direccionVisual: 'CTA' },
  ],
  caption: 'Guía rápida',
  hashtags: ['#instagram'],
  cta: 'Contame en los comentarios cuál es tu mayor duda.',
  formatoOptimo: '4:5',
  notasDiseno: '',
};

describe('TasteEngine (DRY_RUN)', () => {
  it('evalúa un carrusel y devuelve score simulado', async () => {
    const result = await evaluateTaste({
      contentType: 'carrusel',
      topic: 'crecimiento en Instagram',
      carrusel,
      brandName: 'TestBrand',
      visualStyle: 'minimal',
      palette: ['#111', '#fff'],
    });
    expect(result.overall).toBeGreaterThan(0);
    expect(result.passed).toBe(true);
    expect(result.dimensions.scrollStop).toBeDefined();
  });

  it('genera feedback cuando el score no pasa', () => {
    const feedback = generateFeedback(
      {
        overall: 60,
        passed: false,
        insights: [],
        dimensions: { scrollStop: 50, visualCoherence: 70, storytelling: 60, shareability: 55, originality: 50, pinterestAesthetic: 70 },
      },
      'carrusel',
      'test',
    );
    expect(feedback.passed).toBe(false);
    expect(feedback.topIssues.length).toBeGreaterThan(0);
    expect(feedback.improvementPrompt).toContain('Creative Director');
  });
});
