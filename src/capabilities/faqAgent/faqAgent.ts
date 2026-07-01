// @ts-nocheck
/**
 * FAQ Agent — Respuestas automáticas a preguntas frecuentes.
 *
 * Gestiona base de conocimiento del negocio (precios, envíos, horarios,
 * soporte) y genera respuestas instantáneas personalizadas para comentarios
 * y DMs. Incluye lógica de escalada a humano para casos complejos.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const FAQ_DIR = path.resolve('data/faq-agent');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface FAQEntry {
  id: string;
  category: string;
  question: string; // variante canónica
  variants: string[]; // otras formas de hacer la misma pregunta
  answer: string; // respuesta completa
  shortAnswer: string; // versión corta para comentarios (máx. 150 chars)
  requiresHuman: boolean; // si escala a humano automáticamente
  tags: string[];
  updatedAt: string;
}

export interface FAQResponse {
  question: string;
  matched: boolean;
  matchedFaq?: FAQEntry;
  response: string;
  confidence: number; // 0-1
  requiresHumanEscalation: boolean;
  escalationReason?: string;
  suggestedHashtags?: string[];
  replyChannel: 'comment' | 'dm' | 'both';
}

export interface FAQKnowledgeBase {
  brandId: string;
  entries: FAQEntry[];
  updatedAt: string;
  totalQueries: number;
  escalationRate: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureFAQDir = async (): Promise<void> => {
  await fs.mkdir(FAQ_DIR, { recursive: true });
};

const kbPath = (brandId: string): string => path.join(FAQ_DIR, `${brandId}-kb.json`);

const loadKB = async (brandId: string): Promise<FAQKnowledgeBase> => {
  try {
    return JSON.parse(await fs.readFile(kbPath(brandId), 'utf-8')) as FAQKnowledgeBase;
  } catch {
    return { brandId, entries: [], updatedAt: new Date().toISOString(), totalQueries: 0, escalationRate: 0 };
  }
};

const saveKB = async (kb: FAQKnowledgeBase): Promise<void> => {
  await ensureFAQDir();
  await fs.writeFile(kbPath(kb.brandId), JSON.stringify(kb, null, 2), 'utf-8');
};

// ── Gestión de la base de conocimiento ───────────────────────────────────────

/** Inicializa la base de conocimiento desde información del negocio. */
export const initKnowledgeBase = async (
  brand: BrandProfile,
  businessInfo: {
    products?: string[];
    priceRange?: string;
    shippingPolicy?: string;
    returnPolicy?: string;
    contactMethods?: string[];
    openHours?: string;
    location?: string;
    customFAQs?: Array<{ question: string; answer: string; category?: string }>;
  },
): Promise<FAQKnowledgeBase> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[faqAgent] initializing knowledge base', { brandId });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: `Eres un experto en servicio al cliente digital para Instagram.
Construyes bases de conocimiento que permiten respuestas instantáneas y personalizadas.
Cada respuesta suena a humano, no a bot. Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Construye la base de FAQs para ${brand.name} (${brand.industryCategory ?? 'general'}):

Información del negocio:
${businessInfo.products?.length ? `Productos/servicios: ${businessInfo.products.join(', ')}` : ''}
${businessInfo.priceRange ? `Rango de precios: ${businessInfo.priceRange}` : ''}
${businessInfo.shippingPolicy ? `Política de envíos: ${businessInfo.shippingPolicy}` : ''}
${businessInfo.returnPolicy ? `Política de devoluciones: ${businessInfo.returnPolicy}` : ''}
${businessInfo.contactMethods?.length ? `Medios de contacto: ${businessInfo.contactMethods.join(', ')}` : ''}
${businessInfo.openHours ? `Horario: ${businessInfo.openHours}` : ''}
${businessInfo.location ? `Ubicación: ${businessInfo.location}` : ''}
${businessInfo.customFAQs?.length ? `FAQs personalizadas:\n${businessInfo.customFAQs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n')}` : ''}

Genera 15-20 FAQs cubriendo: precios, disponibilidad, envíos, devoluciones, contacto, horarios, características del producto.

Para cada FAQ:
{
  "category": "precios|envíos|devoluciones|contacto|horarios|productos|soporte",
  "question": "pregunta canónica",
  "variants": ["otra forma de preguntar lo mismo", "variante 2"],
  "answer": "respuesta completa y amigable (50-150 palabras, tono ${brand.voice?.toneOfVoice ?? 'cercano'})",
  "shortAnswer": "versión muy corta para comentarios (máx 150 chars)",
  "requiresHuman": false,
  "tags": ["tag1", "tag2"]
}

Devuelve: { "faqs": [...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);

  const now = new Date().toISOString();
  const faqs = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as { faqs: Partial<FAQEntry>[] }).faqs.map((f, i) => ({
        id: `faq-${Date.now()}-${i}`,
        category: f.category ?? 'general',
        question: f.question ?? '',
        variants: f.variants ?? [],
        answer: f.answer ?? '',
        shortAnswer: f.shortAnswer ?? '',
        requiresHuman: f.requiresHuman ?? false,
        tags: f.tags ?? [],
        updatedAt: now,
      }))
    : [];

  const kb: FAQKnowledgeBase = {
    brandId,
    entries: faqs,
    updatedAt: now,
    totalQueries: 0,
    escalationRate: 0,
  };

  await saveKB(kb);
  return kb;
};

/** Agrega o actualiza una entrada FAQ. */
export const upsertFAQ = async (brandId: string, entry: Omit<FAQEntry, 'id' | 'updatedAt'>): Promise<FAQEntry> => {
  const kb = await loadKB(brandId);
  const existing = kb.entries.find((e) => e.question.toLowerCase() === entry.question.toLowerCase());

  const faq: FAQEntry = {
    id: existing?.id ?? `faq-${Date.now()}`,
    updatedAt: new Date().toISOString(),
    ...entry,
  };

  if (existing) {
    kb.entries = kb.entries.map((e) => (e.id === faq.id ? faq : e));
  } else {
    kb.entries.push(faq);
  }

  await saveKB(kb);
  return faq;
};

// ── Motor de respuesta ────────────────────────────────────────────────────────

/** Genera respuesta a una pregunta de usuario. */
export const answerQuestion = async (
  brand: BrandProfile,
  userQuestion: string,
  context: {
    channel: 'comment' | 'dm';
    userName?: string;
    previousMessages?: string[];
  },
): Promise<FAQResponse> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const kb = await loadKB(brandId);

  // Buscar match semántico simple primero
  const lowerQ = userQuestion.toLowerCase();
  const directMatch = kb.entries.find(
    (e) =>
      e.question.toLowerCase().includes(lowerQ) ||
      e.variants.some((v) => v.toLowerCase().includes(lowerQ)) ||
      lowerQ.includes(e.question.toLowerCase().split(' ').slice(0, 3).join(' ')),
  );

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 600,
    thinking: { type: 'adaptive' },
    system: `Eres el agente de atención al cliente de ${brand.name}.
Respondes en el tono de la marca: ${brand.voice?.toneOfVoice ?? 'cercano y profesional'}.
REGLAS:
- Nunca suenes a bot o template
- Si no sabes la respuesta, di que la consultarás y escala
- Para comentarios: máx 150 chars. Para DMs: máx 300 chars.
- Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Responde a este mensaje en Instagram ${context.channel}:

Usuario: ${context.userName ?? 'Cliente'}
Pregunta: "${userQuestion}"
Canal: ${context.channel}
${context.previousMessages?.length ? `Contexto previo:\n${context.previousMessages.slice(-3).join('\n')}` : ''}

${directMatch ? `FAQ disponible:\nPregunta: ${directMatch.question}\nRespuesta completa: ${directMatch.answer}\nRespuesta corta: ${directMatch.shortAnswer}\nRequiere humano: ${directMatch.requiresHuman}` : 'No se encontró FAQ directa. Usa tu conocimiento general de la marca.'}

Devuelve:
{
  "response": "respuesta exacta lista para enviar (tono humano, sin emojis excesivos)",
  "confidence": número 0-1,
  "requiresHumanEscalation": boolean,
  "escalationReason": "razón si escala" | null
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);

  const generated = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as {
        response: string;
        confidence: number;
        requiresHumanEscalation: boolean;
        escalationReason?: string;
      })
    : { response: 'Gracias por tu mensaje! Te responderemos pronto.', confidence: 0.3, requiresHumanEscalation: true };

  // Actualizar contadores
  kb.totalQueries++;
  if (generated.requiresHumanEscalation) {
    kb.escalationRate = (kb.escalationRate * (kb.totalQueries - 1) + 1) / kb.totalQueries;
  }
  await saveKB(kb);

  log.info('[faqAgent] question answered', {
    brandId,
    confidence: generated.confidence,
    escalation: generated.requiresHumanEscalation,
  });

  return {
    question: userQuestion,
    matched: !!directMatch,
    matchedFaq: directMatch,
    response: generated.response,
    confidence: generated.confidence,
    requiresHumanEscalation: generated.requiresHumanEscalation || (directMatch?.requiresHuman ?? false),
    escalationReason: generated.escalationReason,
    replyChannel: context.channel,
  };
};

/** Carga la base de conocimiento. */
export const getKnowledgeBase = async (brandId: string): Promise<FAQKnowledgeBase> => loadKB(brandId);
