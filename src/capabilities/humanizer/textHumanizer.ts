// @ts-nocheck
/**
 * Text Humanizer — Limpia textos de IA y aplica voz de marca.
 *
 * Elimina palabras y estructuras características de LLMs ("del mismo modo",
 * "en conclusión", "revolucionario"), adapta el tono al manual de marca
 * (formal, humorístico, de nicho) y agrega autenticidad humana.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ToneProfile =
  | 'formal-profesional'
  | 'cercano-amigable'
  | 'humoristico-irreverente'
  | 'experto-tecnico'
  | 'inspiracional'
  | 'nicho-especifico'
  | 'vendedor-directo';

export interface StyleGuide {
  brandId: string;
  tone: ToneProfile;
  vocabulary: {
    preferred: string[]; // palabras que sí usa la marca
    avoided: string[]; // palabras que NUNCA usa
    signature: string[]; // frases o muletillas de la marca
  };
  sentenceStyle: {
    avgLength: 'short' | 'medium' | 'long'; // cortas<10, medias<20, largas<30 palabras
    usesContractions: boolean;
    usesHumor: boolean;
    usesEmojis: boolean;
    emojiFrequency?: 'sparse' | 'moderate' | 'heavy';
  };
  examples: string[]; // ejemplos reales de la voz de marca
}

export interface HumanizationResult {
  original: string;
  humanized: string;
  changes: string[]; // qué se cambió y por qué
  aiScore: number; // 0-100 (100=muy robótico, 0=muy humano)
  humanScore: number; // 0-100 (cuánto "suena a humano")
}

// ── Palabras y estructuras de IA a eliminar ───────────────────────────────────

const AI_PATTERNS = [
  // Frases típicas de apertura
  /en el vasto mundo (de|del|digital)/gi,
  /en la era (digital|moderna|actual)/gi,
  /en el mundo (digital|actual|moderno|de hoy)/gi,
  /en el dinámico (mundo|panorama|ecosistema)/gi,
  /en conclusión[,.]?/gi,
  /en definitiva[,.]?/gi,
  /cabe (destacar|mencionar|señalar) que/gi,
  /es importante (destacar|mencionar|señalar|recordar) que/gi,
  /sin lugar a dudas[,.]?/gi,
  /resulta evidente que/gi,
  /como podemos observar/gi,
  /del mismo modo[,.]?/gi,
  /de igual manera[,.]?/gi,
  /por otro lado[,.]?/gi,
  /en primer lugar[,.]?/gi,
  /en segundo lugar[,.]?/gi,
  /en tercer lugar[,.]?/gi,
  /a modo de (conclusión|resumen|cierre)/gi,
  /en resumen[,.]?/gi,
  /para finalizar[,.]?/gi,

  // Adjetivos genéricos de IA
  /\bapasionante\b/gi,
  /\bfascinante\b/gi,
  /\bincreíble\b/gi,
  /\bexcepcional\b/gi,
  /\bsuperior\b/gi,
  /\btransformador\b/gi,
  /\brevolucionario\b/gi,
  /\bdisruptivo\b/gi,
  /\bholístico\b/gi,
  /\brobusto\b/gi,
  /\bsinergias\b/gi,
  /\bparadigma\b/gi,
  /\becosistema (digital)?\b/gi,
  /\bpotenciar\b/gi,
  /\boptimizar\b/gi,
  /\bapalancarse?\b/gi,
  /\bescalable\b/gi,
];

const removeAIPatterns = (text: string): string => {
  let clean = text;
  for (const pattern of AI_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  return clean
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
};

// ── Humanización con Claude ───────────────────────────────────────────────────

/** Humaniza un texto eliminando rastros de IA y aplicando la voz de marca. */
export const humanizeText = async (
  brand: BrandProfile,
  text: string,
  styleGuide?: Partial<StyleGuide>,
): Promise<HumanizationResult> => {
  const preClean = removeAIPatterns(text);
  const tone = styleGuide?.tone ?? 'cercano-amigable';

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: `Eres un editor especializado en eliminar el "olor a IA" de los textos.
Tu trabajo es reescribir textos para que suenen genuinamente humanos, sin perder el mensaje.

REGLAS ABSOLUTAS:
1. Eliminar todas las frases típicas de IA (conclusiones, transiciones genéricas, adjetivos inflados)
2. Acortar frases largas en oraciones directas
3. Agregar imperfecciones naturales: variación de ritmo, preguntas retóricas, énfasis personal
4. Preservar TODA la información y los puntos clave
5. NO añadir emojis si el original no los tenía (a menos que se indique)
6. Devolver JSON puro sin texto adicional`,
    messages: [
      {
        role: 'user',
        content: `Humaniza este texto para ${brand.name}:

TONO REQUERIDO: ${tone}
${styleGuide?.vocabulary?.preferred?.length ? `Palabras preferidas de la marca: ${styleGuide.vocabulary.preferred.join(', ')}` : ''}
${styleGuide?.vocabulary?.avoided?.length ? `Palabras a evitar: ${styleGuide.vocabulary.avoided.join(', ')}` : ''}
${styleGuide?.examples?.length ? `Ejemplos de la voz de marca:\n${styleGuide.examples.join('\n')}` : ''}

TEXTO ORIGINAL (pre-limpiado):
"${preClean}"

Devuelve:
{
  "humanized": "texto reescrito completamente en voz humana y auténtica",
  "changes": ["cambio específico 1", "cambio específico 2", ...],
  "aiScore": número 0-100 del original (qué tan robótico sonaba),
  "humanScore": número 0-100 del resultado (qué tan humano suena ahora)
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {
      original: text,
      humanized: preClean,
      changes: ['Limpieza básica de patrones de IA'],
      aiScore: 70,
      humanScore: 60,
    };
  }

  const result = JSON.parse(jsonMatch[0]) as Omit<HumanizationResult, 'original'>;
  return { original: text, ...result };
};

/** Genera una guía de estilo de voz de marca desde ejemplos. */
export const buildStyleGuide = async (
  brand: BrandProfile,
  examples: string[],
  tone?: ToneProfile,
): Promise<StyleGuide> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Analiza estos ejemplos de contenido de ${brand.name} y extrae su guía de estilo:

${examples.map((e, i) => `Ejemplo ${i + 1}:\n"${e}"`).join('\n\n')}

Identifica y devuelve JSON:
{
  "tone": "formal-profesional|cercano-amigable|humoristico-irreverente|experto-tecnico|inspiracional|nicho-especifico|vendedor-directo",
  "vocabulary": {
    "preferred": ["palabra1", "palabra2"],
    "avoided": ["palabra1", "palabra2"],
    "signature": ["frase característica 1", "frase 2"]
  },
  "sentenceStyle": {
    "avgLength": "short|medium|long",
    "usesContractions": boolean,
    "usesHumor": boolean,
    "usesEmojis": boolean,
    "emojiFrequency": "sparse|moderate|heavy"
  }
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);

  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const defaults: StyleGuide = {
    brandId,
    tone: tone ?? 'cercano-amigable',
    vocabulary: { preferred: [], avoided: [], signature: [] },
    sentenceStyle: {
      avgLength: 'medium',
      usesContractions: true,
      usesHumor: false,
      usesEmojis: true,
      emojiFrequency: 'moderate',
    },
    examples,
  };

  if (!jsonMatch) return defaults;

  const result = JSON.parse(jsonMatch[0]) as Partial<StyleGuide>;
  return { ...defaults, ...result, brandId, examples };
};

/** Verifica si un texto suena a IA (score > 60 = riesgoso). */
export const detectAIContent = async (text: string): Promise<{ score: number; flags: string[] }> => {
  let score = 0;
  const flags: string[] = [];

  for (const pattern of AI_PATTERNS) {
    if (pattern.test(text)) {
      score += 8;
      flags.push(`Patrón detectado: ${pattern.source.replace(/\\/g, '').slice(0, 40)}`);
      pattern.lastIndex = 0;
    }
  }

  // Penalizar oraciones largas
  const sentences = text.split(/[.!?]+/);
  const longSentences = sentences.filter((s) => s.split(' ').length > 30);
  if (longSentences.length > 2) {
    score += longSentences.length * 5;
    flags.push(`${longSentences.length} oraciones muy largas (>30 palabras)`);
  }

  return { score: Math.min(100, score), flags };
};
