/**
 * Instagram Carousel Best Practices — knowledge base extraído de cuentas de
 * alto rendimiento (educación, lifestyle, SaaS, creatividad).
 */

export interface CarouselPrinciple {
  id: string;
  category: 'cover' | 'structure' | 'copy' | 'design' | 'cta';
  rule: string;
  why: string;
  example?: string;
}

export const CAROUSEL_PRINCIPLES: CarouselPrinciple[] = [
  {
    id: 'cover-scroll-stop',
    category: 'cover',
    rule: 'La portada debe funcionar sin contexto: título grande + promesa concreta.',
    why: 'El 70% de usuarios decide swippear en menos de 1 segundo.',
    example: '"Los 5 errores que te crecen lento" > "Tips de Instagram"',
  },
  {
    id: 'one-idea-per-slide',
    category: 'structure',
    rule: 'Una sola idea por slide.',
    why: 'Facilita el consumo móvil y aumenta la retención.',
  },
  {
    id: 'slide-count',
    category: 'structure',
    rule: 'Entre 5 y 10 slides. Más de 12 solo si la profundidad lo justifica.',
    why: 'Completion rate óptimo entre 7-9 slides.',
  },
  {
    id: 'title-length',
    category: 'copy',
    rule: 'Títulos de 4-8 palabras. Body máximo 25 palabras por slide.',
    why: 'Legibilidad en pantallas pequeñas.',
  },
  {
    id: 'arc-narrative',
    category: 'structure',
    rule: 'Arco: Hook → Problema/Tensión → Insight → Solución → CTA.',
    why: 'El último slide debe justificar guardar todo el carrusel.',
  },
  {
    id: 'avoid-generic-cta',
    category: 'cta',
    rule: 'CTA específico y conversacional. Evitar "seguime para más" o "guardá esto".',
    why: 'CTA genéricos reducen engagement y denotan falta de criterio.',
    example: '"¿Cuál de estos 3 errores cometés vos? Respondé abajo."',
  },
  {
    id: 'visual-consistency',
    category: 'design',
    rule: 'Misma paleta, tipografía y grid en todos los slides.',
    why: 'Construye reconocimiento de marca y mejora el feed.',
  },
  {
    id: 'negative-space',
    category: 'design',
    rule: '30-40% de espacio negativo por slide.',
    why: 'Reduce fatiga visual y mejora legibilidad.',
  },
  {
    id: 'contrast-hierarchy',
    category: 'design',
    rule: 'Jerarquía clara: título 2-3x más grande que body.',
    why: 'Guía la mirada y facilita scan.',
  },
  {
    id: 'pinterest-quality',
    category: 'design',
    rule: 'Imágenes aspiracionales, bien compuestas, sin stock genérico.',
    why: 'Pinterest eleva el estándar de estética; el contenido aspiracional se guarda más.',
  },
];

export const getPrinciplesByCategory = (category?: CarouselPrinciple['category']): CarouselPrinciple[] => {
  if (!category) return CAROUSEL_PRINCIPLES;
  return CAROUSEL_PRINCIPLES.filter((p) => p.category === category);
};

export const formatPrinciplesForPrompt = (principles = CAROUSEL_PRINCIPLES): string =>
  principles.map((p) => `- ${p.rule}`).join('\n');
