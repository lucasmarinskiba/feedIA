// @ts-nocheck
/**
 * Buyer Persona Builder — Auditoría de cuenta e identificación de audiencia ideal.
 *
 * Analiza historial de publicaciones (CSV/JSON), extrae qué temáticas funcionan,
 * define la voz exacta de la marca y construye buyer personas detallados
 * con pain points, motivaciones y patrones de comportamiento digital.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const PERSONA_DIR = path.resolve('data/buyer-personas');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BuyerPersona {
  id: string;
  name: string; // nombre ficticio ("María la Emprendedora")
  archetype: string; // arquetipo breve
  demographics: {
    ageRange: [number, number];
    genders: string[];
    locations: string[];
    incomeLevel: 'bajo' | 'medio' | 'medio-alto' | 'alto';
    educationLevel: string;
    occupation: string;
  };
  psychographics: {
    values: string[];
    lifestyle: string;
    personality: string[];
    painPoints: string[]; // dolores específicos
    desires: string[]; // sueños/aspiraciones
    fears: string[]; // miedos que frenan la compra
  };
  digitalBehavior: {
    activePlatforms: string[];
    peakUsageHours: number[];
    contentPreferences: string[]; // qué tipo de contenido consume
    purchaseTriggers: string[]; // qué la hace comprar
    objections: string[]; // por qué NO compraría
  };
  journeyStage: 'awareness' | 'consideration' | 'decision' | 'loyalty';
  messagingAngle: string; // cómo hablarle exactamente
  contentIdeas: string[]; // 5 ideas de contenido específicas para esta persona
  cta: string; // llamada a la acción que más le resuena
}

export interface AccountAudit {
  brandId: string;
  auditedAt: string;
  totalPostsAnalyzed: number;
  topPerformingTopics: Array<{ topic: string; avgEngagement: number; posts: number }>;
  contentMixFound: Record<string, number>; // porcentaje por tipo
  bestPerformingFormats: string[];
  peakEngagementHours: number[];
  brandVoiceDescription: string;
  inconsistencies: string[];
  opportunities: string[];
  recommendations: string[];
}

export interface PostRecord {
  date: string;
  format: string;
  topic: string;
  caption?: string;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  engagementRate: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensurePersonaDir = async (): Promise<void> => {
  await fs.mkdir(PERSONA_DIR, { recursive: true });
};

const personasPath = (brandId: string): string => path.join(PERSONA_DIR, `${brandId}-personas.json`);

const loadPersonas = async (brandId: string): Promise<BuyerPersona[]> => {
  try {
    return JSON.parse(await fs.readFile(personasPath(brandId), 'utf-8')) as BuyerPersona[];
  } catch {
    return [];
  }
};

// ── Auditoría de cuenta ───────────────────────────────────────────────────────

/** Audita el historial de publicaciones y extrae insights. */
export const auditAccount = async (brand: BrandProfile, posts: PostRecord[]): Promise<AccountAudit> => {
  log.info('[buyerPersona] auditing account', { brand: brand.name, posts: posts.length });
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  // Calcular estadísticas básicas
  const avgEngagement = posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length;
  const topPosts = posts.sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 10);

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2500,
    thinking: { type: 'adaptive' },
    system: `Eres un estratega senior de Instagram con 10 años analizando cuentas.
Identificas patrones de lo que funciona y por qué. Eres específico y accionable.
Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Audita el rendimiento de la cuenta de ${brand.name}:

Total posts analizados: ${posts.length}
Engagement promedio: ${(avgEngagement * 100).toFixed(2)}%
Industria: ${brand.industryCategory ?? 'general'}

Top 10 publicaciones por engagement:
${topPosts.map((p) => `- Fecha: ${p.date} | Formato: ${p.format} | Tema: "${p.topic}" | Engagement: ${(p.engagementRate * 100).toFixed(1)}% | Likes: ${p.likes} | Comentarios: ${p.comments} | Guardados: ${p.saves}`).join('\n')}

Mix de contenido detectado:
${Object.entries(
  posts.reduce((acc, p) => ({ ...acc, [p.format]: (acc[p.format] ?? 0) + 1 }), {} as Record<string, number>),
)
  .map(([f, c]) => `- ${f}: ${Math.round((c / posts.length) * 100)}%`)
  .join('\n')}

Devuelve:
{
  "topPerformingTopics": [{ "topic": "", "avgEngagement": number, "posts": number }],
  "contentMixFound": { "carousel": %, "reel": %, "story": %, "post": % },
  "bestPerformingFormats": ["formato1", "formato2"],
  "peakEngagementHours": [hora1, hora2],
  "brandVoiceDescription": "descripción de cómo suena la marca actualmente",
  "inconsistencies": ["inconsistencia 1", ...],
  "opportunities": ["oportunidad 1", ...],
  "recommendations": ["acción concreta 1", ...]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);

  const generated = jsonMatch ? (JSON.parse(jsonMatch[0]) as Partial<AccountAudit>) : {};

  return {
    brandId,
    auditedAt: new Date().toISOString(),
    totalPostsAnalyzed: posts.length,
    topPerformingTopics: generated.topPerformingTopics ?? [],
    contentMixFound: generated.contentMixFound ?? {},
    bestPerformingFormats: generated.bestPerformingFormats ?? [],
    peakEngagementHours: generated.peakEngagementHours ?? [],
    brandVoiceDescription: generated.brandVoiceDescription ?? '',
    inconsistencies: generated.inconsistencies ?? [],
    opportunities: generated.opportunities ?? [],
    recommendations: generated.recommendations ?? [],
  };
};

/** Construye buyer personas detallados basados en la marca y la auditoría. */
export const buildBuyerPersonas = async (
  brand: BrandProfile,
  audit?: AccountAudit,
  personaCount = 2,
): Promise<BuyerPersona[]> => {
  log.info('[buyerPersona] building personas', { brand: brand.name, count: personaCount });
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: `Eres un experto en marketing con especialización en psicología del consumidor digital.
Creas buyer personas profundas y específicas que los equipos pueden usar para crear contenido.
Cada persona es un arquetipo real, no genérico.`,
    messages: [
      {
        role: 'user',
        content: `Construye ${personaCount} buyer personas para ${brand.name}:

Industria: ${brand.industryCategory ?? 'general'}
Descripción: ${brand.description ?? 'No especificada'}
Tono de marca: ${brand.toneOfVoice ?? 'profesional cercano'}
${
  audit
    ? `
Insights de auditoría:
- Temas que más enganchan: ${audit.topPerformingTopics
        .slice(0, 3)
        .map((t) => t.topic)
        .join(', ')}
- Formatos top: ${audit.bestPerformingFormats.join(', ')}
- Voz actual: ${audit.brandVoiceDescription}`
    : ''
}

Para cada persona devuelve:
{
  "name": "nombre ficticio descriptivo",
  "archetype": "arquetipo en 3-5 palabras",
  "demographics": {
    "ageRange": [min, max],
    "genders": [""],
    "locations": ["ciudad/región"],
    "incomeLevel": "bajo|medio|medio-alto|alto",
    "educationLevel": "",
    "occupation": ""
  },
  "psychographics": {
    "values": ["valor1", "valor2"],
    "lifestyle": "descripción de su estilo de vida",
    "personality": ["rasgo1", "rasgo2"],
    "painPoints": ["dolor específico 1", "dolor específico 2", "dolor específico 3"],
    "desires": ["sueño 1", "sueño 2"],
    "fears": ["miedo que frena la compra 1", "miedo 2"]
  },
  "digitalBehavior": {
    "activePlatforms": ["instagram", "tiktok"],
    "peakUsageHours": [9, 12, 21],
    "contentPreferences": ["tipo de contenido que consume"],
    "purchaseTriggers": ["qué la hace comprar"],
    "objections": ["por qué NO compraría"]
  },
  "journeyStage": "awareness|consideration|decision|loyalty",
  "messagingAngle": "cómo hablarle exactamente — tono y enfoque",
  "contentIdeas": ["idea específica 1", "idea 2", "idea 3", "idea 4", "idea 5"],
  "cta": "llamada a la acción que más le resuena"
}

Devuelve: { "personas": [...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as { personas: Partial<BuyerPersona>[] };
  const personas: BuyerPersona[] = result.personas.map((p, i) => ({
    id: `persona-${Date.now()}-${i}`,
    name: p.name ?? `Persona ${i + 1}`,
    archetype: p.archetype ?? '',
    demographics: p.demographics ?? {
      ageRange: [25, 45],
      genders: ['all'],
      locations: [],
      incomeLevel: 'medio',
      educationLevel: '',
      occupation: '',
    },
    psychographics: p.psychographics ?? {
      values: [],
      lifestyle: '',
      personality: [],
      painPoints: [],
      desires: [],
      fears: [],
    },
    digitalBehavior: p.digitalBehavior ?? {
      activePlatforms: ['instagram'],
      peakUsageHours: [9, 18, 21],
      contentPreferences: [],
      purchaseTriggers: [],
      objections: [],
    },
    journeyStage: p.journeyStage ?? 'awareness',
    messagingAngle: p.messagingAngle ?? '',
    contentIdeas: p.contentIdeas ?? [],
    cta: p.cta ?? '',
  }));

  await ensurePersonaDir();
  await fs.writeFile(personasPath(brandId), JSON.stringify(personas, null, 2), 'utf-8');
  return personas;
};

/** Carga buyer personas guardados. */
export const getPersonas = async (brandId: string): Promise<BuyerPersona[]> => loadPersonas(brandId);

/** Genera ideas de contenido específicas para una persona. */
export const generatePersonaContent = async (
  brand: BrandProfile,
  persona: BuyerPersona,
  count = 5,
): Promise<string[]> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 800,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Genera ${count} ideas de contenido específicas para ${brand.name} dirigidas a "${persona.name}" (${persona.archetype}).

Pain points: ${persona.psychographics.painPoints.join(' / ')}
Deseos: ${persona.psychographics.desires.join(' / ')}
Ángulo de mensajería: ${persona.messagingAngle}

Cada idea debe incluir: formato | tema específico | ángulo diferenciador | hook de apertura.
Devuelve: { "ideas": ["formato: tema — ángulo [Hook: '...']", ...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? (JSON.parse(jsonMatch[0]) as { ideas: string[] }).ideas : [];
};
