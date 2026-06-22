/**
 * StrategyPlanner — genera pilares, tono y diferenciación a partir de un BrandProfile.
 *
 * Si ANTHROPIC_API_KEY está disponible, enriquece con Claude. Si no, produce una
 * estrategia determinista usable para tests y desarrollo local.
 */

import { askJson, hasApiKey } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile, ContentPillar } from '../../config/types.js';

export interface StrategyPlan {
  pillars: ContentPillar[];
  toneNotes: string;
  differentiation: string;
  positioningStatement: string;
}

const defaultPillars = (brand: BrandProfile): ContentPillar[] => {
  const base: ContentPillar[] = [
    {
      id: 'educacion',
      name: 'Educación práctica',
      description: `Contenido que enseña algo útil al público de ${brand.niche}.`,
      weight: 30,
      formats: ['carrusel', 'reel'],
      exampleTopics: [`Errores comunes en ${brand.niche}`, `Guía rápida para principiantes`],
    },
    {
      id: 'autoridad',
      name: 'Autoridad y caso de estudio',
      description: 'Demuestra experiencia con resultados, procesos o testimonios.',
      weight: 25,
      formats: ['reel', 'carrusel'],
      exampleTopics: ['Detrás de escena de nuestro proceso', 'Resultado de un cliente'],
    },
    {
      id: 'comunidad',
      name: 'Conversación y comunidad',
      description: 'Invita a interactuar, compartir opiniones y sentirse parte.',
      weight: 20,
      formats: ['historia', 'post-imagen'],
      exampleTopics: ['Pregunta a tu audiencia', 'Encuesta del día'],
    },
    {
      id: 'valor-emocional',
      name: 'Valor emocional',
      description: 'Conecta con los deseos y dolores de la audiencia.',
      weight: 25,
      formats: ['reel', 'historia'],
      exampleTopics: ['La historia detrás de la marca', 'Motivación para seguir adelante'],
    },
  ];
  if (brand.goals.primary === 'ventas' || brand.goals.primary === 'leads') {
    base.push({
      id: 'conversion',
      name: 'Conversión suave',
      description: 'Presenta la oferta sin ser agresivo, enfocado en el beneficio.',
      weight: 20,
      formats: ['carrusel', 'reel'],
      exampleTopics: ['Cómo funciona nuestro servicio', 'Preguntas frecuentes antes de comprar'],
    });
  }
  // Normalizar pesos a 100
  const total = base.reduce((sum, p) => sum + p.weight, 0);
  return base.map((p) => ({ ...p, weight: Math.round((p.weight / total) * 100) }));
};

const claudePlan = async (brand: BrandProfile): Promise<StrategyPlan> => {
  const prompt = `Actuá como estratega de marca senior para Instagram.

${brandContext(brand)}

Generá una estrategia de contenido clara y accionable:
1. Entre 4 y 6 pilares de contenido con peso (0-100), formatos recomendados y 2 temas de ejemplo cada uno.
2. Notas de tono: cómo debe sonar la marca en 3 líneas.
3. Diferenciación: en una oración, qué hace única a esta marca en su nicho.
4. Positioning statement: "Para [audiencia], [marca] es la única [categoría] que [beneficio diferencial]."

Formato JSON:
{
  "pillars": [
    { "id": "string", "name": "string", "description": "string", "weight": number, "formats": ["reel","carrusel","post-imagen","historia"], "exampleTopics": ["string"] }
  ],
  "toneNotes": "string",
  "differentiation": "string",
  "positioningStatement": "string"
}`;
  return askJson<StrategyPlan>(prompt, { maxTokens: 4000 });
};

export const planStrategy = async (brand: BrandProfile): Promise<StrategyPlan> => {
  if (hasApiKey()) {
    try {
      return await claudePlan(brand);
    } catch {
      // fallback determinista si Claude falla
    }
  }

  const pillars = defaultPillars(brand);
  const differentiation =
    brand.brandStrategy.differentiators[0] ??
    `Enfocamos ${brand.niche} con un tono ${brand.voice.tone[0] ?? 'auténtico'} y contenido realmente útil.`;
  const positioningStatement =
    brand.brandStrategy.positioning ||
    `Para ${brand.audience.description}, ${brand.name} es la guía de ${brand.niche} que transforma ${brand.audience.pains[0] ?? 'dolores'} en ${brand.audience.desires[0] ?? 'resultados'}.`;

  return {
    pillars,
    toneNotes: `La marca habla con un tono ${brand.voice.tone.join(', ') || 'amigable y profesional'}. Evita: ${brand.voice.forbidden.join(', ') || 'jerga excesiva'}.`,
    differentiation,
    positioningStatement,
  };
};
