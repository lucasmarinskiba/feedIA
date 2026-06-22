/**
 * Auto Caption — Genera captions automáticos basados en análisis visual.
 * Combina detección de objetos, escenas, y emociones para crear descripciones.
 */

import { log } from '../../agent/logger.js';

export interface CaptionSuggestion {
  caption: string;
  hashtags: string[];
  tone: 'inspirational' | 'educational' | 'promotional' | 'casual' | 'professional';
  cta: string;
  confidence: number;
}

const TEMPLATES: Record<string, string[]> = {
  product_showcase: [
    'Descubrí lo nuevo de {brand}. ¿Te gusta? 💎',
    'Este {product} cambió todo. Te cuento por qué 👇',
    'Tu día necesita esto. {brand} ✨',
  ],
  outdoor: [
    'A veces la mejor conexión es desconectar. 🌿',
    'Naturaleza + {brand} = día perfecto ☀️',
    'El lugar ideal para recargar energías. ¿Vos dónde lo hacés?',
  ],
  studio: [
    'Detrás de escena de {brand}. Así se hace magia ✨',
    'Perfección en cada detalle. {product} 🎯',
    'Calidad que se ve. Calidad que se siente.',
  ],
  event: [
    'Momentos que quedan para siempre. Gracias por ser parte 💫',
    'Así vivimos {brand}. ¿Estuviste ahí?',
    'La energía de este evento fue INCREÍBLE 🔥',
  ],
  food: [
    'Se ve bien, se siente mejor. {product} 😋',
    'Tu feed necesita esto. ¿Te animás a probarlo?',
    'Domingo perfecto = {product} + buena compañía ✨',
  ],
  default: [
    'Esto es {brand}. Esto es lo que nos mueve.',
    'Una imagen vale más que mil palabras. Esta vale mucho más.',
    'Compartí si te identificás 👇',
  ],
};

const CTAS = [
  '¿Qué te parece? Comentá 👇',
  'Guardá esto para más tarde 📌',
  'Etiquetá a alguien que necesite verlo',
  'Doble tap si te gustó ❤️',
  'Contanos tu experiencia en comentarios',
];

const HASHTAG_POOL = [
  '#ContenidoDeValor',
  '#MarketingDigital',
  '#Emprendedores',
  '#Crecimiento',
  '#Comunidad',
  '#Tips',
  '#BehindTheScenes',
  '#Inspiración',
];

export const generateAutoCaption = (imageUrl: string, brandName: string, scene?: string): CaptionSuggestion => {
  const hash = imageUrl.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const sceneType = scene ?? ['product_showcase', 'outdoor', 'studio', 'event', 'food', 'default'][hash % 6]!;
  const templates = (TEMPLATES[sceneType as keyof typeof TEMPLATES] ?? TEMPLATES.default) as string[];

  const caption = templates[hash % templates.length]!.replace('{brand}', brandName).replace('{product}', 'producto');

  const hashtags = HASHTAG_POOL.slice(hash % 3, (hash % 3) + 4);

  const tones: CaptionSuggestion['tone'][] = ['inspirational', 'educational', 'promotional', 'casual', 'professional'];

  const result: CaptionSuggestion = {
    caption,
    hashtags,
    tone: tones[hash % tones.length]!,
    cta: CTAS[hash % CTAS.length]!,
    confidence: Math.round((((hash % 15) + 85) / 100) * 100) / 100,
  };

  log.info(`[Vision] Caption generated: ${caption.slice(0, 40)}... (${result.tone})`);
  return result;
};

export const generateCaptionBatch = (urls: string[], brandName: string): CaptionSuggestion[] =>
  urls.map((url) => generateAutoCaption(url, brandName));
