/**
 * Pinterest Aesthetics — principios de estética aspiracional para elevar el
 * buen gusto visual del contenido generado.
 */

export interface PinterestAesthetic {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  do: string[];
  dont: string[];
}

export const PINTEREST_AESTHETICS: PinterestAesthetic[] = [
  {
    id: 'clean-editorial',
    name: 'Clean Editorial',
    description: 'Minimalista, tipografía sofisticada, mucho aire, paleta reducida.',
    keywords: ['minimal', 'editorial', 'serif', 'neutral', 'grid'],
    do: ['Espacio negativo generoso', 'Tipografía serif en títulos', 'Paleta de 2-3 colores', 'Fotografía de calidad'],
    dont: ['Bordes recargados', 'Más de 2 fuentes', 'Stock fotográfico genérico'],
  },
  {
    id: 'warm-organic',
    name: 'Warm Organic',
    description: 'Texturas naturales, tonos tierra, tipografía redonda, sensación humana.',
    keywords: ['warm', 'organic', 'earth tones', 'handwritten', 'paper'],
    do: ['Colores tierra', 'Texturas sutiles', 'Fotos con luz natural', 'Tipografía amigable'],
    dont: ['Colores neón', 'Formas muy rígidas', 'Fondos planos sin textura'],
  },
  {
    id: 'bold-playful',
    name: 'Bold Playful',
    description: 'Colores vibrantes, formas orgánicas, tipografía bold, energía alta.',
    keywords: ['bold', 'playful', 'colorful', 'rounded', 'dynamic'],
    do: ['Contraste alto', 'Formas orgánicas', 'Tipografía bold', 'Animaciones simples'],
    dont: ['Mezclar demasiados colores', 'Tipografía ilegible', 'Caos visual'],
  },
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    description: 'Fondos oscuros, acentos metálicos, tipografía sans serif, sensación de lujo.',
    keywords: ['dark', 'premium', 'luxury', 'gold', 'sophisticated'],
    do: ['Fondo oscuro', 'Acento dorado o metálico', 'Tipografía sans serif elegante', 'Poca pero buena imagen'],
    dont: ['Fondos blancos puros', 'Colores chillones', 'Tipografía decorativa'],
  },
];

export const getAestheticByKeywords = (keywords: string[]): PinterestAesthetic | undefined => {
  const lower = keywords.map((k) => k.toLowerCase());
  return PINTEREST_AESTHETICS.find((a) => a.keywords.some((k) => lower.includes(k)));
};

export const formatAestheticForPrompt = (aesthetic?: PinterestAesthetic): string => {
  if (!aesthetic) return '';
  return [
    `Estética Pinterest: ${aesthetic.name} — ${aesthetic.description}`,
    'Hacé:',
    ...aesthetic.do.map((d) => `  - ${d}`),
    'Evitá:',
    ...aesthetic.dont.map((d) => `  - ${d}`),
  ].join('\n');
};
