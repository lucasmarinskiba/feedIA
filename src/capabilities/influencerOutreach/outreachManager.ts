// @ts-nocheck
/**
 * Influencer Outreach Manager — Reemplaza al especialista de PR/colaboraciones.
 *
 * Identifica influencers compatibles, redacta mensajes personalizados,
 * gestiona pipeline de colaboraciones y mide ROI.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const OUTREACH_DIR = path.resolve('data/influencer-outreach');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type InfluencerTier = 'nano' | 'micro' | 'mid' | 'macro' | 'mega';

export interface InfluencerProfile {
  handle: string;
  name?: string;
  tier: InfluencerTier;
  followers: number;
  engagementRate: number;
  niche: string[];
  audienceDemographics: {
    primaryGenders: string[];
    primaryAgeRanges: string[];
    primaryLocations: string[];
  };
  contentStyle: string[];
  estimatedCostUSD: { post: number; story: number; reel: number };
  contactMethods: string[];
  previousBrandCollabs: string[];
  authenticityScore: number; // 0-100 (engagement real vs comprado)
  brandFitScore: number; // 0-100 (qué tan bien encaja con la marca)
  flaggedRisks: string[]; // controversias, fake followers, etc
  lastUpdated: string;
}

export type CollabStage =
  | 'identified'
  | 'researched'
  | 'first-contact'
  | 'negotiating'
  | 'agreed'
  | 'content-in-progress'
  | 'published'
  | 'completed'
  | 'declined'
  | 'ghosted';

export interface CollabRecord {
  id: string;
  brandId: string;
  influencerHandle: string;
  stage: CollabStage;
  outreachMessage: string;
  responseLog: Array<{ date: string; from: 'us' | 'them'; message: string }>;
  agreedDeliverables?: Array<{ type: 'post' | 'reel' | 'story' | 'live'; quantity: number; agreedPriceUSD: number }>;
  expectedReach?: number;
  actualReach?: number;
  leadsGenerated?: number;
  conversionsGenerated?: number;
  totalCostUSD?: number;
  roiPercent?: number;
  createdAt: string;
  closedAt?: string;
  notes: string;
}

export interface OutreachMessage {
  influencerHandle: string;
  subject?: string; // si es email
  message: string;
  tone: 'profesional' | 'casual' | 'amigable' | 'directo';
  proposedDeliverable: string;
  proposedBudget?: string;
  followUpDate: string; // cuándo reintentar si no responden
  personalizationPoints: string[]; // qué referencias específicas se incluyeron
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureOutreachDir = async (): Promise<void> => {
  await fs.mkdir(OUTREACH_DIR, { recursive: true });
};

const collabsPath = (brandId: string): string => path.join(OUTREACH_DIR, `${brandId}-collabs.json`);

const loadCollabs = async (brandId: string): Promise<CollabRecord[]> => {
  try {
    return JSON.parse(await fs.readFile(collabsPath(brandId), 'utf-8')) as CollabRecord[];
  } catch {
    return [];
  }
};

const saveCollabs = async (brandId: string, collabs: CollabRecord[]): Promise<void> => {
  await ensureOutreachDir();
  await fs.writeFile(collabsPath(brandId), JSON.stringify(collabs.slice(-500), null, 2), 'utf-8');
};

const tierFromFollowers = (followers: number): InfluencerTier => {
  if (followers < 10_000) return 'nano';
  if (followers < 100_000) return 'micro';
  if (followers < 500_000) return 'mid';
  if (followers < 1_000_000) return 'macro';
  return 'mega';
};

// ── Identificación de influencers ─────────────────────────────────────────────

/** Sugiere influencers compatibles para la marca según nicho y presupuesto. */
export const findCompatibleInfluencers = async (
  brand: BrandProfile,
  params: {
    nicheKeywords: string[];
    budgetUSD: number;
    targetTier?: InfluencerTier;
    targetGeography?: string;
    minEngagementRate?: number; // default 0.02 (2%)
    count?: number; // default 10
  },
): Promise<InfluencerProfile[]> => {
  log.info('[outreach] finding influencers', { brand: brand.name });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: `Experto en influencer marketing para Instagram.
Conoces el ecosistema de creadores por nicho, sus tarifas estimadas y patrones de fraude.
Devuelves JSON puro con perfiles realistas y verificables.`,
    messages: [
      {
        role: 'user',
        content: `Identifica ${params.count ?? 10} influencers compatibles con ${brand.name}:

Nicho de marca: ${brand.industryCategory ?? 'general'}
Keywords del nicho: ${params.nicheKeywords.join(', ')}
Presupuesto disponible: $${params.budgetUSD} USD
${params.targetTier ? `Tier deseado: ${params.targetTier}` : ''}
${params.targetGeography ? `Geografía: ${params.targetGeography}` : ''}
Engagement mínimo: ${(params.minEngagementRate ?? 0.02) * 100}%

Para cada influencer devuelve perfil completo:
{
  "handle": "@handle",
  "tier": "nano|micro|mid|macro|mega",
  "followers": número,
  "engagementRate": número decimal,
  "niche": ["nicho1"],
  "audienceDemographics": { "primaryGenders": [], "primaryAgeRanges": [], "primaryLocations": [] },
  "contentStyle": ["estilo1"],
  "estimatedCostUSD": { "post": número, "story": número, "reel": número },
  "contactMethods": ["DM", "email", "manager"],
  "previousBrandCollabs": ["marca1"],
  "authenticityScore": 0-100,
  "brandFitScore": 0-100,
  "flaggedRisks": ["riesgo si existe"]
}

JSON: { "influencers": [...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as { influencers: Partial<InfluencerProfile>[] };
  return result.influencers.map((p) => ({
    handle: p.handle ?? '',
    name: p.name,
    tier: p.tier ?? tierFromFollowers(p.followers ?? 0),
    followers: p.followers ?? 0,
    engagementRate: p.engagementRate ?? 0,
    niche: p.niche ?? [],
    audienceDemographics: p.audienceDemographics ?? { primaryGenders: [], primaryAgeRanges: [], primaryLocations: [] },
    contentStyle: p.contentStyle ?? [],
    estimatedCostUSD: p.estimatedCostUSD ?? { post: 0, story: 0, reel: 0 },
    contactMethods: p.contactMethods ?? ['DM'],
    previousBrandCollabs: p.previousBrandCollabs ?? [],
    authenticityScore: p.authenticityScore ?? 70,
    brandFitScore: p.brandFitScore ?? 70,
    flaggedRisks: p.flaggedRisks ?? [],
    lastUpdated: new Date().toISOString(),
  }));
};

/** Redacta mensaje de outreach personalizado. */
export const composeOutreachMessage = async (
  brand: BrandProfile,
  influencer: InfluencerProfile,
  deliverable: string,
  budget?: number,
): Promise<OutreachMessage> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 800,
    thinking: { type: 'adaptive' },
    system: `Especialista en outreach de influencers. Tus mensajes consiguen >30% tasa de respuesta porque:
- Investigas al creador antes de escribir
- Eres específico, no genérico
- Ofreces valor claro
- Respetas su tiempo (mensajes <150 palabras)`,
    messages: [
      {
        role: 'user',
        content: `Redacta mensaje de outreach para ${influencer.handle}:

Marca: ${brand.name} | Industria: ${brand.industryCategory ?? 'general'}
Tono de marca: ${brand.toneOfVoice ?? 'profesional cercano'}

Influencer:
- Followers: ${influencer.followers.toLocaleString()}
- Engagement: ${(influencer.engagementRate * 100).toFixed(1)}%
- Nicho: ${influencer.niche.join(', ')}
- Estilo: ${influencer.contentStyle.join(', ')}

Propuesta:
- Deliverable: ${deliverable}
${budget ? `- Budget: $${budget} USD` : '- Negociable según deliverable'}

JSON:
{
  "message": "mensaje completo (<150 palabras, sin emojis excesivos, personalizado)",
  "tone": "profesional|casual|amigable|directo",
  "proposedDeliverable": "deliverable específico",
  "proposedBudget": "rango si aplica",
  "followUpDate": "fecha sugerida si no responden (formato YYYY-MM-DD, +5 días)",
  "personalizationPoints": ["referencia específica 1", "referencia 2"]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[outreach] No message composed');

  const generated = JSON.parse(jsonMatch[0]) as Partial<OutreachMessage>;
  return {
    influencerHandle: influencer.handle,
    message: generated.message ?? '',
    tone: generated.tone ?? 'profesional',
    proposedDeliverable: generated.proposedDeliverable ?? deliverable,
    proposedBudget: generated.proposedBudget,
    followUpDate: generated.followUpDate ?? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
    personalizationPoints: generated.personalizationPoints ?? [],
  };
};

/** Crea registro de colaboración. */
export const createCollabRecord = async (
  brand: BrandProfile,
  influencerHandle: string,
  outreachMessage: string,
): Promise<CollabRecord> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const collab: CollabRecord = {
    id: `collab-${Date.now()}`,
    brandId,
    influencerHandle,
    stage: 'first-contact',
    outreachMessage,
    responseLog: [{ date: new Date().toISOString(), from: 'us', message: outreachMessage }],
    createdAt: new Date().toISOString(),
    notes: '',
  };
  const collabs = await loadCollabs(brandId);
  await saveCollabs(brandId, [...collabs, collab]);
  return collab;
};

/** Avanza estado de un collab record. */
export const updateCollabStage = async (
  brandId: string,
  collabId: string,
  stage: CollabStage,
  note?: string,
): Promise<void> => {
  const collabs = await loadCollabs(brandId);
  const collab = collabs.find((c) => c.id === collabId);
  if (!collab) return;
  collab.stage = stage;
  if (note) collab.notes += `\n[${new Date().toISOString()}] ${note}`;
  if (['completed', 'declined', 'ghosted'].includes(stage)) collab.closedAt = new Date().toISOString();
  await saveCollabs(brandId, collabs);
};

/** Pipeline de colaboraciones agrupado por etapa. */
export const getPipeline = async (brandId: string): Promise<Record<CollabStage, CollabRecord[]>> => {
  const collabs = await loadCollabs(brandId);
  const pipeline: Record<CollabStage, CollabRecord[]> = {
    identified: [],
    researched: [],
    'first-contact': [],
    negotiating: [],
    agreed: [],
    'content-in-progress': [],
    published: [],
    completed: [],
    declined: [],
    ghosted: [],
  };
  for (const c of collabs) pipeline[c.stage].push(c);
  return pipeline;
};

/** Calcula ROI de colaboración cerrada. */
export const calculateROI = (collab: CollabRecord, revenuePerLead = 50): number => {
  const cost = collab.totalCostUSD ?? 0;
  if (cost === 0) return 0;
  const revenue =
    (collab.leadsGenerated ?? 0) * revenuePerLead + (collab.conversionsGenerated ?? 0) * revenuePerLead * 5;
  return ((revenue - cost) / cost) * 100;
};
