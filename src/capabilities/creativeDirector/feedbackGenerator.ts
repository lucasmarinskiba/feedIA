/**
 * Feedback Generator — convierte un puntaje de taste y sus dimensiones en
 * feedback accionable y un prompt de mejora para regenerar contenido.
 */

import type { TasteScore } from './tasteEngine.js';

export interface CreativeFeedback {
  score: number;
  passed: boolean;
  topIssues: string[];
  improvementPrompt: string;
}

const threshold = 75;

export const generateFeedback = (
  score: TasteScore,
  contentType: 'carrusel' | 'reel' | 'post',
  topic: string,
): CreativeFeedback => {
  const issues: string[] = [];
  const dims = score.dimensions;

  if (dims.scrollStop < 70) issues.push('La portada/hook no es suficientemente scroll-stopping. Prometé valor concreto y usá un título que se entienda sin contexto.');
  if (dims.visualCoherence < 70) issues.push('Falta coherencia visual: unificá paleta, tipografía y grid.');
  if (dims.storytelling < 70) issues.push('La narrativa es débil. Construí un arco: problema → tensión → insight → solución → CTA.');
  if (dims.shareability < 70) issues.push('Poco shareable/guardable. Incluí un insight, lista o framework que la gente quiera guardar.');
  if (dims.originality < 70) issues.push('El ángulo es genérico. Atacá el tema desde una opinión fuerte, un contraste o una experiencia propia.');
  if (dims.pinterestAesthetic < 70) issues.push('La estética no llega al estándar Pinterest. Mejorá fotografía, espacio negativo y composición.');

  const topIssues = issues.slice(0, 3);

  const improvementPrompt = `Reescribí este ${contentType} sobre "${topic}" aplicando EXACTAMENTE estas correcciones de un Creative Director:
${topIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Además, respetá estas reglas de oro:
- Sin clichés ("seguime para más", "guardá esto", "link en bio").
- Una idea por slide/párrafo.
- Títulos cortos (4-8 palabras), body máximo 25 palabras.
- CTA conversacional y específica.
- Estética coherente, aspiracional y con buen espacio negativo.

Devolvé SOLO el contenido mejorado en el mismo formato JSON que el original, sin explicaciones.`;

  return {
    score: score.overall,
    passed: score.overall >= threshold,
    topIssues,
    improvementPrompt,
  };
};
