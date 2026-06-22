// @ts-nocheck
/**
 * User Learning Engine — extrae patrones desde users reales.
 *
 * Cada user que usa FeedIA genera señales:
 *   - prompts que escribe → léxico + estilo + temas
 *   - feedback (👍/👎 sobre outputs) → preferencias estéticas
 *   - ediciones manuales del output → diff revela voz real
 *   - cuáles outputs publicó vs descartó → priorización implícita
 *   - hashtags que aprobó vs cambió
 *   - hora de uso + frecuencia → workstyle
 *
 * Brain extrae:
 *   - LEXICON personal del user (palabras que ama/odia)
 *   - STYLES preferidos (visual, copy, tono)
 *   - CULTURAL signals (referencias, jerga, modismos)
 *   - BUSINESS MODEL detectado (B2B/B2C/D2C/SaaS/agencia/creator)
 *   - INFLUENCE patterns (cuentas que cita/menciona/admira)
 *
 * Persiste por user. Disponible para próximos prompts.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const LEARNING_DIR = path.resolve('data/neural/user-learning');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface UserSignal {
  userId: string;
  brandId: string;
  type: 'prompt' | 'feedback' | 'edit' | 'publish' | 'discard' | 'tag-change' | 'rating';
  timestamp: string;
  payload: Record<string, unknown>;
  weight: number; // 0-1 importancia
}

export interface UserLexicon {
  preferred: string[]; // palabras que el user usa frecuentemente
  avoided: string[]; // palabras que el user nunca usa o reemplaza
  signature: string[]; // frases-firma del user
  emojis: string[]; // emojis preferidos
  capitalization: 'lowercase' | 'sentence' | 'title' | 'mixed';
  punctuation: 'minimal' | 'standard' | 'expressive';
}

export interface UserStyles {
  visualStyle: string; // 'minimalista' | 'maximalista' | 'vintage' | ...
  copyTone: string; // 'directo' | 'storyteller' | 'sarcástico' | ...
  contentLength: 'short' | 'medium' | 'long';
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
  ctaStyle: string;
  hookStyle: string;
}

export interface CulturalSignals {
  references: string[]; // memes, shows, personas que el user cita
  slang: string[]; // jerga regional/generacional detectada
  regionMarkers: string[]; // "che", "wey", "tío", "po", indicador región
  generationMarkers: string[]; // "gen-z", "millennial", "boomer" signals
  trends: string[]; // temas/trends que el user sigue
}

export interface BusinessProfile {
  detectedType:
    | 'B2B'
    | 'B2C'
    | 'D2C'
    | 'SaaS'
    | 'agencia'
    | 'creator'
    | 'ecommerce'
    | 'servicios'
    | 'producto-fisico'
    | 'unknown';
  pricePointHint: 'low' | 'mid' | 'premium' | 'unknown';
  salesCycle: 'impulse' | 'consultative' | 'complex' | 'unknown';
  targetMarket: string[];
  competitorsMentioned: string[];
}

export interface InfluencePatterns {
  citedAccounts: string[]; // @handles que el user menciona
  admiredBrands: string[];
  contentInspirations: string[]; // tipos de contenido que copia/adapta
  influenceTier: 'nano' | 'micro' | 'mid' | 'macro' | 'mega' | 'unknown';
}

export interface UserKnowledgeProfile {
  userId: string;
  brandId: string;
  generatedAt: string;
  signalsAnalyzed: number;
  lexicon: UserLexicon;
  styles: UserStyles;
  cultural: CulturalSignals;
  business: BusinessProfile;
  influence: InfluencePatterns;
  workstyle: {
    activeHours: number[]; // 0-23 horas donde el user está activo
    activeDays: string[]; // ['mon', 'tue', ...]
    sessionLength: 'quick' | 'medium' | 'long';
    revisionRate: number; // % de outputs que edita antes de publicar
  };
  topicAffinity: Array<{ topic: string; affinity: number }>;
  confidenceScore: number; // 0-1 qué tan confiable es este perfil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureLearningDir = async (): Promise<void> => {
  await fs.mkdir(LEARNING_DIR, { recursive: true });
};

const signalsPath = (userId: string): string => path.join(LEARNING_DIR, `${userId}-signals.json`);
const profilePath = (userId: string): string => path.join(LEARNING_DIR, `${userId}-profile.json`);

const loadSignals = async (userId: string): Promise<UserSignal[]> => {
  try {
    return JSON.parse(await fs.readFile(signalsPath(userId), 'utf-8')) as UserSignal[];
  } catch {
    return [];
  }
};

const saveSignals = async (userId: string, signals: UserSignal[]): Promise<void> => {
  await ensureLearningDir();
  // Mantener últimos 2000 signals por user
  await fs.writeFile(signalsPath(userId), JSON.stringify(signals.slice(-2000), null, 2), 'utf-8');
};

// ── API: Capturar signals ────────────────────────────────────────────────────

export const recordUserSignal = async (signal: Omit<UserSignal, 'timestamp'>): Promise<void> => {
  const signals = await loadSignals(signal.userId);
  signals.push({ ...signal, timestamp: new Date().toISOString() });
  await saveSignals(signal.userId, signals);
};

/** Convenience: registrar prompt del user. */
export const recordPrompt = async (userId: string, brandId: string, prompt: string): Promise<void> => {
  await recordUserSignal({ userId, brandId, type: 'prompt', payload: { prompt }, weight: 0.5 });
};

/** Convenience: registrar feedback 👍/👎. */
export const recordFeedback = async (
  userId: string,
  brandId: string,
  artifactId: string,
  rating: 'up' | 'down' | number,
): Promise<void> => {
  const weight = typeof rating === 'number' ? rating : rating === 'up' ? 0.9 : 0.1;
  await recordUserSignal({ userId, brandId, type: 'feedback', payload: { artifactId, rating }, weight });
};

/** Registrar edición manual. Diff between original y edited revela voz. */
export const recordEdit = async (
  userId: string,
  brandId: string,
  artifactId: string,
  original: string,
  edited: string,
): Promise<void> => {
  await recordUserSignal({
    userId,
    brandId,
    type: 'edit',
    payload: { artifactId, original, edited, diffLength: Math.abs(original.length - edited.length) },
    weight: 0.8,
  });
};

/** Registrar publicación (output aprobado). */
export const recordPublish = async (
  userId: string,
  brandId: string,
  artifactId: string,
  format: string,
): Promise<void> => {
  await recordUserSignal({ userId, brandId, type: 'publish', payload: { artifactId, format }, weight: 1.0 });
};

/** Registrar descarte (output rechazado). */
export const recordDiscard = async (
  userId: string,
  brandId: string,
  artifactId: string,
  reason?: string,
): Promise<void> => {
  await recordUserSignal({ userId, brandId, type: 'discard', payload: { artifactId, reason }, weight: 0.7 });
};

// ── Consolidación: signals → profile ─────────────────────────────────────────

/**
 * Procesa signals acumulados → extrae UserKnowledgeProfile.
 * Ejecutar periódicamente (semanal) o cuando signals.length > 50.
 */
export const consolidateUserProfile = async (
  userId: string,
  brand: BrandProfile,
): Promise<UserKnowledgeProfile | null> => {
  const signals = await loadSignals(userId);
  if (signals.length < 10) {
    log.info('[userLearning] insufficient signals', { userId, count: signals.length });
    return null;
  }

  log.info('[userLearning] consolidating profile', { userId, signals: signals.length });

  // Construir resumen pasable a Claude
  const prompts = signals.filter((s) => s.type === 'prompt').slice(-30);
  const edits = signals.filter((s) => s.type === 'edit').slice(-20);
  const publishes = signals.filter((s) => s.type === 'publish').slice(-50);
  const discards = signals.filter((s) => s.type === 'discard').slice(-30);
  const positiveFeedback = signals.filter((s) => s.type === 'feedback' && s.weight > 0.6).slice(-30);
  const negativeFeedback = signals.filter((s) => s.type === 'feedback' && s.weight < 0.4).slice(-30);

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: `Analista de patrones de comportamiento de usuario.
Tu tarea: extraer LEXICON + STYLES + CULTURAL + BUSINESS + INFLUENCE desde signals.
Sé específico, no genérico. Devolvés JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Analizá los signals del usuario que opera la cuenta "${brand.name}" (${brand.industryCategory ?? 'general'}):

PROMPTS recientes (${prompts.length}):
${prompts.map((s) => `- "${(s.payload['prompt'] as string).slice(0, 200)}"`).join('\n')}

EDITS realizados (${edits.length}):
${edits
  .slice(0, 10)
  .map(
    (s) =>
      `- Original: "${(s.payload['original'] as string).slice(0, 100)}" → Editado: "${(s.payload['edited'] as string).slice(0, 100)}"`,
  )
  .join('\n')}

PUBLICADOS (lo que sí pasó el filtro del user): ${publishes.length}
DESCARTADOS (lo que rechazó): ${discards.length}
Feedback positivo: ${positiveFeedback.length} | Feedback negativo: ${negativeFeedback.length}

Extraé:
{
  "lexicon": {
    "preferred": ["palabras que el user usa repetidamente"],
    "avoided": ["palabras que el user reemplaza en edits"],
    "signature": ["frases-firma del user"],
    "emojis": ["emojis recurrentes"],
    "capitalization": "lowercase|sentence|title|mixed",
    "punctuation": "minimal|standard|expressive"
  },
  "styles": {
    "visualStyle": "estilo visual inferido",
    "copyTone": "tono del copy",
    "contentLength": "short|medium|long",
    "emojiUsage": "none|minimal|moderate|heavy",
    "ctaStyle": "estilo de CTA",
    "hookStyle": "estilo de hooks"
  },
  "cultural": {
    "references": ["referencias culturales que cita"],
    "slang": ["jerga detectada"],
    "regionMarkers": ["marcadores región"],
    "generationMarkers": ["generación"],
    "trends": ["trends que sigue"]
  },
  "business": {
    "detectedType": "B2B|B2C|D2C|SaaS|agencia|creator|ecommerce|servicios|producto-fisico",
    "pricePointHint": "low|mid|premium",
    "salesCycle": "impulse|consultative|complex",
    "targetMarket": [],
    "competitorsMentioned": []
  },
  "influence": {
    "citedAccounts": ["@handles mencionados"],
    "admiredBrands": [],
    "contentInspirations": [],
    "influenceTier": "nano|micro|mid|macro|mega"
  },
  "topicAffinity": [{"topic": "", "affinity": 0.0-1.0}]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const generated = JSON.parse(jsonMatch[0]) as Partial<UserKnowledgeProfile>;

  // Workstyle desde timestamps
  const activeHoursMap: Record<number, number> = {};
  const activeDaysMap: Record<string, number> = {};
  for (const s of signals) {
    const d = new Date(s.timestamp);
    activeHoursMap[d.getHours()] = (activeHoursMap[d.getHours()] ?? 0) + 1;
    const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()] ?? 'unknown';
    activeDaysMap[day] = (activeDaysMap[day] ?? 0) + 1;
  }
  const topHours = Object.entries(activeHoursMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([h]) => parseInt(h));
  const topDays = Object.entries(activeDaysMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);

  const revisionRate = publishes.length > 0 ? edits.length / publishes.length : 0;

  const profile: UserKnowledgeProfile = {
    userId,
    brandId: brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-'),
    generatedAt: new Date().toISOString(),
    signalsAnalyzed: signals.length,
    lexicon: generated.lexicon ?? ({} as UserLexicon),
    styles: generated.styles ?? ({} as UserStyles),
    cultural: generated.cultural ?? ({} as CulturalSignals),
    business: generated.business ?? ({} as BusinessProfile),
    influence: generated.influence ?? ({} as InfluencePatterns),
    workstyle: {
      activeHours: topHours,
      activeDays: topDays,
      sessionLength: revisionRate > 0.5 ? 'long' : revisionRate > 0.2 ? 'medium' : 'quick',
      revisionRate,
    },
    topicAffinity: generated.topicAffinity ?? [],
    confidenceScore: Math.min(1, signals.length / 200),
  };

  await ensureLearningDir();
  await fs.writeFile(profilePath(userId), JSON.stringify(profile, null, 2), 'utf-8');
  log.info('[userLearning] profile saved', { userId, confidence: profile.confidenceScore });
  return profile;
};

export const getUserProfile = async (userId: string): Promise<UserKnowledgeProfile | null> => {
  try {
    return JSON.parse(await fs.readFile(profilePath(userId), 'utf-8')) as UserKnowledgeProfile;
  } catch {
    return null;
  }
};

/** Inyecta perfil del user en próximo prompt para personalización. */
export const buildPromptEnrichment = async (userId: string): Promise<string> => {
  const profile = await getUserProfile(userId);
  if (!profile || profile.confidenceScore < 0.2) return '';

  const parts: string[] = ['[CONTEXTO USUARIO — usá esto para personalizar]'];
  if (profile.lexicon.preferred.length)
    parts.push(`Palabras preferidas: ${profile.lexicon.preferred.slice(0, 10).join(', ')}`);
  if (profile.lexicon.avoided.length) parts.push(`EVITAR: ${profile.lexicon.avoided.slice(0, 10).join(', ')}`);
  if (profile.lexicon.signature.length)
    parts.push(`Frases-firma: ${profile.lexicon.signature.slice(0, 3).join(' / ')}`);
  if (profile.styles.copyTone) parts.push(`Tono: ${profile.styles.copyTone}`);
  if (profile.styles.emojiUsage) parts.push(`Emojis: ${profile.styles.emojiUsage}`);
  if (profile.cultural.slang.length) parts.push(`Jerga: ${profile.cultural.slang.slice(0, 5).join(', ')}`);
  if (profile.business.detectedType !== 'unknown') parts.push(`Tipo de negocio: ${profile.business.detectedType}`);
  parts.push('[FIN CONTEXTO USUARIO]');
  return parts.join('\n');
};
