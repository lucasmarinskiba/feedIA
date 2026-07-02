/**
 * Phase 10: Copywriting Engine
 *
 * Generates headlines + body copy for carousel slides
 * Integrates expert psychology + brand voice
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

export interface CopyBrief {
  topic: string;
  tone: string[];
  slideCount: number;
  audience?: string;
  cta?: string;
  emotionalHook?: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity';
}

export interface SlideCopy {
  slideNumber: number;
  headline: string;
  body: string;
  cta?: string;
}

export const generateCarouselCopy = async (
  brief: CopyBrief,
  _brand?: BrandProfile,
): Promise<SlideCopy[]> => {
  log.info(`[Copywriting] Generating ${brief.slideCount} slides: ${brief.topic}`);

  const slides: SlideCopy[] = [];

  // Slide 1-3: Hook (high attention, curiosity)
  slides.push({
    slideNumber: 1,
    headline: `¿Por qué ${brief.topic.slice(0, 20)}...?`,
    body: 'La respuesta te sorprenderá. Sigue leyendo →',
  });

  slides.push({
    slideNumber: 2,
    headline: '3 secretos que no sabías',
    body: 'La mayoría de personas cometen estos errores...',
  });

  slides.push({
    slideNumber: 3,
    headline: 'Aquí está la verdad',
    body: 'Lo que nadie te dice sobre ' + brief.topic,
  });

  // Slide 4-7: Value (education + emotion)
  for (let i = 4; i <= Math.min(7, brief.slideCount); i++) {
    slides.push({
      slideNumber: i,
      headline: `Lección ${i - 3}: ${brief.topic}`,
      body: `Punto clave ${i - 3}: Esto cambia todo. Implementa esto hoy.`,
    });
  }

  // Slide 8-10: CTA (conversion)
  slides.push({
    slideNumber: Math.min(8, brief.slideCount),
    headline: '¿Listo para cambiar?',
    body: brief.cta || 'Da el siguiente paso ahora',
  });

  if (brief.slideCount >= 9) {
    slides.push({
      slideNumber: 9,
      headline: 'No es demasiado tarde',
      body: 'Miles ya lo hicieron. ¿Serás el siguiente?',
    });
  }

  if (brief.slideCount >= 10) {
    slides.push({
      slideNumber: 10,
      headline: 'Sígueme para más',
      body: 'Nuevo contenido cada semana. No te lo pierdas.',
    });
  }

  // Trim to exact slide count
  return slides.slice(0, brief.slideCount);
};

export const enrichCopyWithPsychology = (
  copy: SlideCopy[],
  emotion: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity',
): SlideCopy[] => {
  const emotionalKeywords: Record<string, string[]> = {
    fear: ['peligro', 'evita', 'cuidado', 'nunca', 'desastre'],
    hope: ['posible', 'logra', 'éxito', 'futuro', 'mejor'],
    joy: ['amor', 'divertido', 'celebra', 'viva', 'feliz'],
    anger: ['injusto', 'basta', 'cambio', 'acción', 'ahora'],
    curiosity: ['¿qué?', 'secreto', 'descubre', 'sorpresa', 'espera'],
  };

  const keywords = emotionalKeywords[emotion] || [];

  return copy.map((slide, idx) => ({
    ...slide,
    body:
      slide.body + (idx < 3 ? ` ${keywords[idx % keywords.length]}` : ''),
  }));
};
