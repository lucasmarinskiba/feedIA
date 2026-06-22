// @ts-nocheck
/**
 * AIDA / PAS Copywriter — Redacción persuasiva estructurada.
 *
 * Transforma características de producto en copy emocional de alta conversión
 * usando las fórmulas AIDA (Atención-Interés-Deseo-Acción) y
 * PAS (Problema-Agitación-Solución).
 *
 * Evita frases genéricas de IA. Fuerza estructuras de conversión validadas.
 */

import Anthropic from '@anthropic-ai/sdk';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CopyFormula = 'AIDA' | 'PAS' | 'BAB' | 'FAB' | 'PPPP';

export interface AIDACopy {
  formula: 'AIDA';
  attention: string; // gancho — dolor o deseo en 1 frase impactante
  interest: string; // por qué les importa — contexto relevante
  desire: string; // beneficio concreto — transformación
  action: string; // CTA específico y urgente
  assembled: string; // texto completo listo para publicar
  characterCount: number;
}

export interface PASCopy {
  formula: 'PAS';
  problem: string; // el dolor exacto de la audiencia
  agitation: string; // amplificar el dolor — consecuencias
  solution: string; // tu oferta como la respuesta obvia
  assembled: string;
  characterCount: number;
}

export interface BABCopy {
  formula: 'BAB';
  before: string; // situación antes (dolor)
  after: string; // situación después (sueño)
  bridge: string; // tu producto/servicio como puente
  assembled: string;
  characterCount: number;
}

export type CopyOutput = AIDACopy | PASCopy | BABCopy;

export interface CopyRequest {
  product: string;
  feature: string; // característica principal
  benefit: string; // beneficio real para el usuario
  audience: string; // a quién va dirigido
  format: 'caption-instagram' | 'carousel-slide' | 'stories-text' | 'ad-copy' | 'bio' | 'email-subject';
  formula: CopyFormula;
  maxChars?: number; // límite de caracteres (default según formato)
  includeHashtags?: boolean;
  includeCTA?: boolean;
  urgency?: 'high' | 'medium' | 'low';
}

export interface CopyVariants {
  request: CopyRequest;
  variants: CopyOutput[];
  bestVariant: CopyOutput;
  hookOptions: string[]; // 5 hooks alternativos para probar
}

// ── Límites por formato ───────────────────────────────────────────────────────

const FORMAT_CHAR_LIMITS: Record<CopyRequest['format'], number> = {
  'caption-instagram': 2200,
  'carousel-slide': 150,
  'stories-text': 80,
  'ad-copy': 125,
  bio: 150,
  'email-subject': 60,
};

// ── Palabras prohibidas (eliminadas del output) ───────────────────────────────

const BANNED_AI_WORDS = [
  'en el vasto mundo',
  'fascinante',
  'revolucionario',
  'del mismo modo',
  'cabe destacar',
  'en conclusión',
  'sin lugar a dudas',
  'en definitiva',
  'cabe mencionar',
  'es importante destacar',
  'sin embargo, es crucial',
  'en el mundo digital',
  'en la era digital',
  'increíble',
  'excepcional',
  'transformador',
  'sinergias',
  'potenciar',
  'robusto',
  'holístico',
  'disruptivo',
];

const cleanAIWords = (text: string): string => {
  let clean = text;
  for (const word of BANNED_AI_WORDS) {
    clean = clean.replace(new RegExp(word, 'gi'), '');
  }
  return clean.replace(/\s{2,}/g, ' ').trim();
};

// ── Generación de copy ────────────────────────────────────────────────────────

/** Genera copy con fórmula AIDA. */
export const generateAIDACopy = async (brand: BrandProfile, req: CopyRequest): Promise<AIDACopy> => {
  const maxChars = req.maxChars ?? FORMAT_CHAR_LIMITS[req.format];

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1000,
    thinking: { type: 'adaptive' },
    system: `Eres un copywriter de clase mundial especializado en Instagram.
Escribes textos que convierten porque siguen estructuras de psicología del consumidor.
REGLAS ABSOLUTAS:
- Prohibido: ${BANNED_AI_WORDS.slice(0, 8).join(', ')} (y similares)
- Sin emojis excesivos (máx. 3 por copy)
- Cada frase debe ganar su lugar — sin relleno
- Límite estricto: ${maxChars} caracteres en el texto ensamblado
- Devuelves JSON puro, sin texto adicional`,
    messages: [
      {
        role: 'user',
        content: `Escribe copy AIDA para:

Marca: ${brand.name} | Tono: ${brand.toneOfVoice ?? 'profesional cercano'}
Producto: ${req.product}
Característica: ${req.feature}
Beneficio real: ${req.benefit}
Audiencia: ${req.audience}
Formato: ${req.format}
Urgencia: ${req.urgency ?? 'medium'}
${req.includeCTA ? 'Incluir CTA fuerte.' : ''}
${req.includeHashtags ? 'Incluir 5-8 hashtags relevantes al final.' : ''}

Estructura AIDA requerida:
- ATTENTION: 1 frase gancho impactante (máx 15 palabras). Usa dolor o deseo específico.
- INTEREST: 2-3 frases explicando POR QUÉ les importa. Datos o hechos concretos.
- DESIRE: 2-3 frases mostrando la transformación / beneficio vívido.
- ACTION: 1 frase de CTA específico, urgente, sin "haz clic aquí".

Devuelve:
{
  "attention": "...",
  "interest": "...",
  "desire": "...",
  "action": "...",
  "assembled": "texto completo listo para publicar"
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[aidaCopywriter] No AIDA copy generated');

  const raw = JSON.parse(jsonMatch[0]) as Omit<AIDACopy, 'formula' | 'characterCount'>;
  const assembled = cleanAIWords(raw.assembled);

  return {
    formula: 'AIDA',
    attention: cleanAIWords(raw.attention),
    interest: cleanAIWords(raw.interest),
    desire: cleanAIWords(raw.desire),
    action: cleanAIWords(raw.action),
    assembled,
    characterCount: assembled.length,
  };
};

/** Genera copy con fórmula PAS. */
export const generatePASCopy = async (brand: BrandProfile, req: CopyRequest): Promise<PASCopy> => {
  const maxChars = req.maxChars ?? FORMAT_CHAR_LIMITS[req.format];

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1000,
    thinking: { type: 'adaptive' },
    system: `Copywriter experto en fórmula PAS (Problema-Agitación-Solución).
La agitación debe hacer que el lector sienta el dolor visceralmente, no solo lo entienda.
REGLAS: Sin palabras de IA. Límite ${maxChars} chars en assembled. JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Escribe copy PAS para:

Marca: ${brand.name} | Tono: ${brand.toneOfVoice ?? 'directo y empático'}
Producto: ${req.product}
Beneficio: ${req.benefit}
Audiencia: ${req.audience}

Estructura:
- PROBLEM: El dolor específico que vive tu audiencia. Nombra la situación exacta.
- AGITATION: Amplifica. ¿Qué pasa si no lo resuelven? Consecuencias emocionales y prácticas.
- SOLUTION: Tu producto/servicio como la solución obvia y natural. Sin sonar a venta forzada.

Devuelve:
{
  "problem": "...",
  "agitation": "...",
  "solution": "...",
  "assembled": "texto completo"
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[aidaCopywriter] No PAS copy generated');

  const raw = JSON.parse(jsonMatch[0]) as Omit<PASCopy, 'formula' | 'characterCount'>;
  const assembled = cleanAIWords(raw.assembled);

  return {
    formula: 'PAS',
    problem: cleanAIWords(raw.problem),
    agitation: cleanAIWords(raw.agitation),
    solution: cleanAIWords(raw.solution),
    assembled,
    characterCount: assembled.length,
  };
};

/** Genera 3 variantes de copy (AIDA + PAS + BAB) para A/B testing. */
export const generateCopyVariants = async (brand: BrandProfile, req: CopyRequest): Promise<CopyVariants> => {
  log.info('[aidaCopywriter] generating variants', { formula: req.formula, format: req.format });

  const [aida, pas] = await Promise.all([
    generateAIDACopy(brand, { ...req, formula: 'AIDA' }),
    generatePASCopy(brand, { ...req, formula: 'PAS' }),
  ]);

  // Generar hooks alternativos
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 600,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Genera 5 hooks de apertura alternativos para este copy de Instagram sobre "${req.product}" para "${req.audience}".

Cada hook debe:
- Ser diferente en su enfoque (pregunta, dato, afirmación, controversia, historia)
- Máximo 15 palabras
- Generar urgencia de leer más
- Sin palabras genéricas de IA

Devuelve: { "hooks": ["hook1", "hook2", "hook3", "hook4", "hook5"] }`,
      },
    ],
  });

  const hooksMsg = await stream.finalMessage();
  const hooksText = hooksMsg.content.find((b) => b.type === 'text');
  const hooksMatch = hooksText?.text.match(/\{[\s\S]*\}/);
  const hookOptions = hooksMatch ? (JSON.parse(hooksMatch[0]) as { hooks: string[] }).hooks : [];

  const variants: CopyOutput[] = [aida, pas];
  const bestVariant = aida.characterCount <= (req.maxChars ?? FORMAT_CHAR_LIMITS[req.format]) ? aida : pas;

  return { request: req, variants, bestVariant, hookOptions };
};

/** Genera guión de carrusel completo con hooks + slides estructuradas. */
export const generateCarouselScript = async (
  brand: BrandProfile,
  topic: string,
  slideCount = 7,
): Promise<Array<{ slide: number; visualText: string; designNotes: string; wordCount: number }>> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: `Experto en carruseles de Instagram de alta retención.
Cada slide debe tener una sola idea. Los carruseles se leen en 15 segundos — cada palabra cuenta.`,
    messages: [
      {
        role: 'user',
        content: `Crea un guión de carrusel de ${slideCount} slides para ${brand.name}:

Tema: ${topic}
Tono: ${brand.toneOfVoice ?? 'educativo y cercano'}

Reglas:
- Slide 1: Hook obligatorio. Máx 10 palabras. Dolor o promesa específica.
- Slides 2-${slideCount - 1}: UNA sola idea por slide. Máx 25 palabras. Valor concreto.
- Slide ${slideCount}: CTA claro. "Guarda este post" / "Comenta X" / "Comparte si..."
- Sin emojis en texto principal (solo en notas de diseño)

Devuelve JSON:
{
  "slides": [
    {
      "slide": 1,
      "visualText": "texto exacto que va en la diapositiva",
      "designNotes": "instrucciones para el diseñador: color, tipografía, imagen sugerida",
      "wordCount": number
    }
  ]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as {
    slides: Array<{ slide: number; visualText: string; designNotes: string; wordCount: number }>;
  };
  return result.slides.map((s) => ({ ...s, visualText: cleanAIWords(s.visualText) }));
};
