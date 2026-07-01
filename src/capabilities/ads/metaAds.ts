// @ts-nocheck
/**
 * Meta Ads — Gestión autónoma de campañas publicitarias.
 *
 * Crea, optimiza y reporta campañas de Meta Ads (Facebook + Instagram)
 * usando Claude como motor de decisión: targeting, presupuesto, creativos,
 * A/B tests de anuncios y seguimiento comercial.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const ADS_DIR = path.resolve('data/meta-ads');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CampaignObjective =
  | 'brand-awareness'
  | 'reach'
  | 'traffic'
  | 'engagement'
  | 'lead-generation'
  | 'conversions'
  | 'catalog-sales'
  | 'store-visits';

export type AdFormat = 'single-image' | 'video' | 'carousel' | 'collection' | 'stories' | 'reels';

export interface AudienceSegment {
  id: string;
  name: string;
  ageRange: [number, number];
  genders: ('all' | 'male' | 'female')[];
  locations: string[];
  interests: string[];
  behaviors: string[];
  customAudiences: string[];
  lookalikeSeed?: string;
  estimatedReach: number;
  cpmEstimate: number; // costo por mil impresiones estimado
}

export interface AdCreative {
  id: string;
  format: AdFormat;
  headline: string; // máx. 40 caracteres
  primaryText: string; // máx. 125 caracteres
  description: string; // máx. 30 caracteres
  cta: string; // Learn More / Shop Now / Sign Up / etc.
  mediaUrl?: string;
  destinationUrl: string;
  aida: {
    attention: string;
    interest: string;
    desire: string;
    action: string;
  };
}

export interface AdSet {
  id: string;
  name: string;
  audience: AudienceSegment;
  budget: { type: 'daily' | 'lifetime'; amount: number; currency: string };
  schedule: { startDate: string; endDate?: string };
  placement: ('feed' | 'stories' | 'reels' | 'explore' | 'audience-network')[];
  bidStrategy: 'lowest-cost' | 'cost-cap' | 'target-cost';
  bidAmount?: number;
  ads: AdCreative[];
}

export interface Campaign {
  id: string;
  brandId: string;
  name: string;
  objective: CampaignObjective;
  status: 'draft' | 'active' | 'paused' | 'completed';
  totalBudget: number;
  currency: string;
  startDate: string;
  endDate?: string;
  adSets: AdSet[];
  kpis: {
    targetCPA?: number; // costo por adquisición objetivo
    targetROAS?: number; // retorno sobre inversión publicitaria
    targetCTR?: number; // click-through rate objetivo
    targetCPM?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CampaignPerformance {
  campaignId: string;
  dateRange: { from: string; to: string };
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
  engagementRate: number;
  topAdSetId: string;
  topCreativeId: string;
  recommendations: string[];
}

export interface CommercialTracking {
  brandId: string;
  period: string;
  leads: number;
  qualified: number;
  closedDeals: number;
  revenue: number;
  pipeline: Array<{
    stage: 'awareness' | 'interest' | 'consideration' | 'intent' | 'purchase' | 'loyalty';
    count: number;
    value: number;
  }>;
  topChannels: string[];
  campaignAttribution: Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureAdsDir = async (): Promise<void> => {
  await fs.mkdir(ADS_DIR, { recursive: true });
};

const campaignsPath = (brandId: string): string => path.join(ADS_DIR, `${brandId}-campaigns.json`);

const loadCampaigns = async (brandId: string): Promise<Campaign[]> => {
  try {
    return JSON.parse(await fs.readFile(campaignsPath(brandId), 'utf-8')) as Campaign[];
  } catch {
    return [];
  }
};

const saveCampaigns = async (brandId: string, campaigns: Campaign[]): Promise<void> => {
  await ensureAdsDir();
  await fs.writeFile(campaignsPath(brandId), JSON.stringify(campaigns.slice(-50), null, 2), 'utf-8');
};

// ── Generación de campaña con Claude ─────────────────────────────────────────

/** Diseña una campaña completa de Meta Ads para la marca. */
export const createCampaign = async (
  brand: BrandProfile,
  params: {
    objective: CampaignObjective;
    budget: number;
    currency?: string;
    durationDays?: number;
    product?: string;
    targetAudience?: string;
  },
): Promise<Campaign> => {
  log.info('[metaAds] creating campaign', { brand: brand.name, objective: params.objective });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: `Eres un especialista senior en Meta Ads con 10 años de experiencia.
Diseñas campañas de alta conversión para Instagram y Facebook.
Siempre usas segmentación granular, creativos con AIDA, y estructura de campaña escalable.
Devuelves JSON válido, sin texto extra.`,
    messages: [
      {
        role: 'user',
        content: `Diseña una campaña completa de Meta Ads:

Marca: ${brand.name}
Industria: ${brand.industryCategory ?? 'general'}
Descripción: ${brand.description ?? 'No especificada'}
Objetivo: ${params.objective}
Presupuesto total: ${params.budget} ${params.currency ?? 'USD'}
Duración: ${params.durationDays ?? 30} días
${params.product ? `Producto/servicio: ${params.product}` : ''}
${params.targetAudience ? `Audiencia target: ${params.targetAudience}` : ''}

Devuelve JSON con estructura Campaign:
{
  "name": "string",
  "adSets": [
    {
      "name": "string",
      "audience": {
        "name": "string",
        "ageRange": [min, max],
        "genders": ["all"],
        "locations": ["ciudad/país"],
        "interests": ["interés1", "interés2"],
        "behaviors": ["comportamiento"],
        "customAudiences": [],
        "estimatedReach": number,
        "cpmEstimate": number
      },
      "budget": { "type": "daily", "amount": number, "currency": "${params.currency ?? 'USD'}" },
      "placement": ["feed", "stories", "reels"],
      "bidStrategy": "lowest-cost",
      "ads": [
        {
          "format": "carousel",
          "headline": "máx 40 chars",
          "primaryText": "máx 125 chars con AIDA",
          "description": "máx 30 chars",
          "cta": "Learn More",
          "destinationUrl": "https://ejemplo.com",
          "aida": { "attention": "", "interest": "", "desire": "", "action": "" }
        }
      ]
    }
  ],
  "kpis": { "targetCPA": number, "targetROAS": number, "targetCTR": number }
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[metaAds] Claude did not return valid JSON');

  const generated = JSON.parse(jsonMatch[0]) as Partial<Campaign>;
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const now = new Date().toISOString();
  const endDate = new Date(Date.now() + (params.durationDays ?? 30) * 86400000).toISOString();

  const campaign: Campaign = {
    id: `camp-${Date.now()}`,
    brandId,
    name: generated.name ?? `Campaña ${params.objective} ${brand.name}`,
    objective: params.objective,
    status: 'draft',
    totalBudget: params.budget,
    currency: params.currency ?? 'USD',
    startDate: now,
    endDate,
    adSets: (generated.adSets ?? []).map((s, i) => ({
      id: `adset-${Date.now()}-${i}`,
      ...s,
      ads: (s.ads ?? []).map((a, j) => ({ id: `ad-${Date.now()}-${i}-${j}`, ...a })),
    })),
    kpis: generated.kpis ?? {},
    createdAt: now,
    updatedAt: now,
  };

  const campaigns = await loadCampaigns(brandId);
  await saveCampaigns(brandId, [...campaigns, campaign]);

  log.info('[metaAds] campaign created', { brandId, campaignId: campaign.id });
  return campaign;
};

/** Analiza performance y genera recomendaciones de optimización. */
export const analyzeCampaignPerformance = async (
  brand: BrandProfile,
  campaignId: string,
  metrics: Omit<CampaignPerformance, 'campaignId' | 'recommendations'>,
): Promise<CampaignPerformance> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Analiza el rendimiento de esta campaña de Meta Ads para ${brand.name}:

Métricas:
- Impresiones: ${metrics.impressions.toLocaleString()}
- Alcance: ${metrics.reach.toLocaleString()}
- Clics: ${metrics.clicks.toLocaleString()}
- Conversiones: ${metrics.conversions}
- Gasto: $${metrics.spend}
- Ingresos: $${metrics.revenue}
- CTR: ${(metrics.ctr * 100).toFixed(2)}%
- CPC: $${metrics.cpc.toFixed(2)}
- CPM: $${metrics.cpm.toFixed(2)}
- CPA: $${metrics.cpa.toFixed(2)}
- ROAS: ${metrics.roas.toFixed(2)}x

Genera 5-7 recomendaciones específicas y accionables para optimizar.
Devuelve JSON: { "recommendations": ["rec1", "rec2", ...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const recs = jsonMatch ? (JSON.parse(jsonMatch[0]) as { recommendations: string[] }).recommendations : [];

  return { campaignId, ...metrics, recommendations: recs };
};

/** Genera audiencias lookalike y segmentaciones para escalar. */
export const generateAudienceStrategy = async (
  brand: BrandProfile,
  currentMetrics: { engagementRate: number; followers: number; topAgeGroups: string[] },
): Promise<AudienceSegment[]> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Diseña 3 audiencias de Meta Ads para ${brand.name} (${brand.industryCategory ?? 'general'}):

Contexto actual:
- Engagement rate: ${(currentMetrics.engagementRate * 100).toFixed(1)}%
- Seguidores: ${currentMetrics.followers.toLocaleString()}
- Grupos de edad top: ${currentMetrics.topAgeGroups.join(', ')}

Devuelve JSON: { "audiences": [{ name, ageRange, genders, locations, interests, behaviors, customAudiences, estimatedReach, cpmEstimate }] }
3 audiencias: 1 fría (intereses), 1 tibia (lookalike), 1 caliente (retargeting).`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as { audiences: AudienceSegment[] };
  return result.audiences.map((a, i) => ({ id: `aud-${Date.now()}-${i}`, ...a }));
};

/** Seguimiento comercial: leads → pipeline → ingresos. */
export const trackCommercialPipeline = async (
  brand: BrandProfile,
  data: Omit<CommercialTracking, 'brandId'>,
): Promise<CommercialTracking & { insights: string[] }> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Analiza el pipeline comercial de ${brand.name}:

Período: ${data.period}
Leads totales: ${data.leads}
Calificados: ${data.qualified}
Deals cerrados: ${data.closedDeals}
Ingresos: $${data.revenue}
Canales top: ${data.topChannels.join(', ')}

Pipeline por etapa:
${data.pipeline.map((s) => `- ${s.stage}: ${s.count} contactos, $${s.value}`).join('\n')}

Devuelve JSON: { "insights": ["insight1", "insight2", ...] }
5 insights accionables sobre el embudo comercial.`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const insights = jsonMatch ? (JSON.parse(jsonMatch[0]) as { insights: string[] }).insights : [];

  const tracking: CommercialTracking = { brandId, ...data };
  await ensureAdsDir();
  await fs.writeFile(
    path.join(ADS_DIR, `${brandId}-tracking-${data.period}.json`),
    JSON.stringify(tracking, null, 2),
    'utf-8',
  );

  return { ...tracking, insights };
};

/** Retorna campañas activas. */
export const getActiveCampaigns = async (brandId: string): Promise<Campaign[]> => {
  const campaigns = await loadCampaigns(brandId);
  return campaigns.filter((c) => c.status === 'active' || c.status === 'draft');
};

/** Crea copy de anuncio con AIDA para un producto específico. */
export const generateAdCreative = async (
  brand: BrandProfile,
  product: string,
  format: AdFormat,
  objective: CampaignObjective,
): Promise<AdCreative> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 800,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Escribe un anuncio de Meta Ads para ${brand.name}.

Producto: ${product}
Formato: ${format}
Objetivo: ${objective}
Tono de marca: ${brand.voice?.toneOfVoice ?? 'profesional y cercano'}

Reglas estrictas:
- Headline: máx 40 caracteres, gancho de ATENCIÓN
- Primary text: máx 125 caracteres, estructura AIDA completa
- Description: máx 30 caracteres, refuerzo del CTA
- Sin emojis excesivos
- Sin palabras genéricas: "increíble", "único", "revolucionario"

Devuelve JSON:
{
  "headline": "",
  "primaryText": "",
  "description": "",
  "cta": "Shop Now|Learn More|Sign Up|Get Quote",
  "destinationUrl": "https://ejemplo.com",
  "aida": { "attention": "", "interest": "", "desire": "", "action": "" }
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[metaAds] No creative generated');

  const generated = JSON.parse(jsonMatch[0]) as Partial<AdCreative>;
  return {
    id: `creative-${Date.now()}`,
    format,
    headline: generated.headline ?? '',
    primaryText: generated.primaryText ?? '',
    description: generated.description ?? '',
    cta: generated.cta ?? 'Learn More',
    destinationUrl: generated.destinationUrl ?? 'https://ejemplo.com',
    aida: generated.aida ?? { attention: '', interest: '', desire: '', action: '' },
  };
};
