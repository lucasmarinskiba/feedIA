#!/usr/bin/env node
/**
 * Script manual para probar el Creative Director / Taste Engine.
 */

import { evaluateTaste, generateFeedback } from '../src/capabilities/creativeDirector/index.js';
import type { CarruselResult } from '../src/capabilities/content/carrusel.js';

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

async function main(): Promise<void> {
  const score = await evaluateTaste({
    contentType: 'carrusel',
    topic: 'crecimiento en Instagram',
    carrusel,
    brandName: 'TestBrand',
    visualStyle: 'minimal',
    palette: ['#111', '#fff'],
  });
  console.log('Taste score:', JSON.stringify(score, null, 2));

  if (!score.passed) {
    const feedback = generateFeedback(score, 'carrusel', 'crecimiento en Instagram');
    console.log('\nFeedback:', JSON.stringify(feedback, null, 2));
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
