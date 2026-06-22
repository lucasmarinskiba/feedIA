// @ts-nocheck
/**
 * Cross-Platform Synergy — compounding multi-platform.
 *
 * IG no vive solo. Top creators usan IG + TikTok + YouTube + LinkedIn + Twitter
 * con flujos de contenido compuestos (1 idea → N piezas adaptadas).
 *
 * Optimiza:
 *   - Qué piezas migran a qué plataforma
 *   - Order de publishing (TikTok first vs IG first)
 *   - Audience overlap (no canibalizar)
 *   - Platform-specific affordances
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const SYNERGY_DIR = path.resolve('data/neural/synergy');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Platform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'youtube-shorts'
  | 'linkedin'
  | 'twitter'
  | 'pinterest'
  | 'threads'
  | 'whatsapp'
  | 'email'
  | 'blog'
  | 'podcast';

export interface PlatformAffordance {
  platform: Platform;
  strengths: string[];
  weaknesses: string[];
  audienceDemographics: { ageRange: [number, number]; gender: string; interests: string[] };
  optimalContentTypes: string[];
  postingFrequencySweet: string; // '3x/semana' | 'diario'
  algorithmFactors: string[];
  cohortSize: number; // tu audience estimada en esa plataforma
}

export interface CrossPlatformFlow {
  id: string;
  brandId: string;
  centralIdea: string;
  primaryPlatform: Platform;
  flow: Array<{
    step: number;
    platform: Platform;
    format: string;
    timing: 'immediate' | 'same-day' | 'next-day' | 'next-week' | 'evergreen';
    adaptation: string;
    expectedAmplification: number; // multiplier vs solo en 1 plataforma
  }>;
  totalEstimatedReach: number;
  audienceOverlap: Record<string, number>; // platform-pair → overlap %
  cannibalizationRisk: number;
}

export interface PlatformPriority {
  platform: Platform;
  priority: number; // 0-100
  reason: string;
  recommendedInvestment: 'low' | 'medium' | 'high' | 'core';
}

// ── Knowledge base de plataformas ────────────────────────────────────────────

const PLATFORM_DATA: Record<Platform, Omit<PlatformAffordance, 'cohortSize'>> = {
  instagram: {
    platform: 'instagram',
    strengths: [
      'Visual storytelling',
      'Engaged audiences',
      'Shopping integration',
      'Stories for daily presence',
      'Reels distribution',
    ],
    weaknesses: ['Algoritmo cambiante', 'Bajo organic reach', 'Saturation hashtags'],
    audienceDemographics: {
      ageRange: [18, 45],
      gender: 'mixed',
      interests: ['lifestyle', 'fashion', 'food', 'business'],
    },
    optimalContentTypes: ['reel', 'carousel', 'story', 'live'],
    postingFrequencySweet: '5-7/semana feed + 5-10 stories/día',
    algorithmFactors: ['watch time', 'saves', 'shares', 'comments', 'profile visits'],
  },
  tiktok: {
    platform: 'tiktok',
    strengths: ['Viral distribution', 'Gen-Z audience', 'Sound discovery', 'For You Page', 'Lower competition'],
    weaknesses: ['Skew demográfico joven', 'Política plataforma', 'Difícil monetizar directo'],
    audienceDemographics: {
      ageRange: [13, 35],
      gender: 'mixed',
      interests: ['entertainment', 'trends', 'humor', 'beauty'],
    },
    optimalContentTypes: ['short-video', 'trending-sounds', 'duets', 'series'],
    postingFrequencySweet: '1-3/día',
    algorithmFactors: ['completion rate', 'shares', 'sound usage', 'rewatch rate'],
  },
  youtube: {
    platform: 'youtube',
    strengths: ['Long-form authority', 'SEO compounding', 'Monetization ads', 'Search discovery'],
    weaknesses: ['Production cost alto', 'Slow to grow', 'Tiempo producción'],
    audienceDemographics: { ageRange: [18, 65], gender: 'mixed', interests: ['education', 'reviews', 'tutorials'] },
    optimalContentTypes: ['long-form', 'tutorials', 'reviews', 'documentaries'],
    postingFrequencySweet: '1-2/semana',
    algorithmFactors: ['watch time', 'click-through rate', 'subscriber retention', 'sessions'],
  },
  'youtube-shorts': {
    platform: 'youtube-shorts',
    strengths: ['Bridge to long-form', 'YouTube ecosystem', 'Less saturated than TikTok'],
    weaknesses: ['Algoritmo joven', 'Menor reach vs YT principal'],
    audienceDemographics: { ageRange: [16, 45], gender: 'mixed', interests: ['quick-learning', 'entertainment'] },
    optimalContentTypes: ['short-vertical', 'teasers', 'highlights'],
    postingFrequencySweet: '3-5/semana',
    algorithmFactors: ['swipe rate', 'completion', 'comments'],
  },
  linkedin: {
    platform: 'linkedin',
    strengths: ['B2B authority', 'Professional network', 'Long-form posts viral', 'Lead gen'],
    weaknesses: ['Inappropriate para B2C casual', 'Tone formal requerido'],
    audienceDemographics: { ageRange: [25, 60], gender: 'mixed', interests: ['career', 'business', 'leadership'] },
    optimalContentTypes: ['text-post', 'carousel-pdf', 'article', 'native-video'],
    postingFrequencySweet: '3-5/semana',
    algorithmFactors: ['dwell time', 'comments deep', 'shares', 'profile visits'],
  },
  twitter: {
    platform: 'twitter',
    strengths: ['Real-time conversation', 'Thought leadership', 'News distribution', 'Direct access influencers'],
    weaknesses: ['Algoritmo polarizado', 'Lifespan corto post (4h)', 'Tone polémico'],
    audienceDemographics: { ageRange: [20, 55], gender: 'mixed-male-skew', interests: ['news', 'tech', 'politics'] },
    optimalContentTypes: ['threads', 'one-liners', 'images-quotes', 'replies-strategic'],
    postingFrequencySweet: '3-10/día',
    algorithmFactors: ['retweets', 'replies', 'likes-velocity', 'bookmark'],
  },
  pinterest: {
    platform: 'pinterest',
    strengths: ['Search-driven', 'Long content lifespan', 'High intent (planning, shopping)', 'Female skew'],
    weaknesses: ['Slow growth', 'Demográfico nicho'],
    audienceDemographics: { ageRange: [25, 55], gender: 'female-skew', interests: ['home', 'fashion', 'food', 'DIY'] },
    optimalContentTypes: ['idea-pins', 'static-pins', 'video-pins'],
    postingFrequencySweet: '10-25/semana',
    algorithmFactors: ['saves', 'click-through', 'search match'],
  },
  threads: {
    platform: 'threads',
    strengths: ['IG synergy', 'Text-first', 'New platform low competition'],
    weaknesses: ['Sin algoritmo maduro', 'Sin search robusto'],
    audienceDemographics: { ageRange: [18, 45], gender: 'mixed', interests: ['lifestyle', 'culture'] },
    optimalContentTypes: ['short-text', 'questions', 'opinions'],
    postingFrequencySweet: '2-5/día',
    algorithmFactors: ['replies', 'likes', 'follows desde IG'],
  },
  whatsapp: {
    platform: 'whatsapp',
    strengths: ['98% delivery', 'Intimate channel', 'High response rate'],
    weaknesses: ['No mass posting', 'Riesgo spam'],
    audienceDemographics: { ageRange: [16, 70], gender: 'mixed', interests: ['todo'] },
    optimalContentTypes: ['broadcast', 'status', 'community-channel'],
    postingFrequencySweet: '1-3/semana broadcast',
    algorithmFactors: ['no algorithm — direct delivery'],
  },
  email: {
    platform: 'email',
    strengths: ['Own the list', 'No algorithm', 'High lifetime value', 'Personalizable'],
    weaknesses: ['Open rates declining', 'Spam folder risk'],
    audienceDemographics: { ageRange: [25, 65], gender: 'mixed', interests: ['varied'] },
    optimalContentTypes: ['newsletter', 'sequences', 'broadcasts'],
    postingFrequencySweet: '1-2/semana',
    algorithmFactors: ['open rate', 'click rate', 'list growth'],
  },
  blog: {
    platform: 'blog',
    strengths: ['SEO compounding', 'Authority building', 'Long-form depth'],
    weaknesses: ['Slow growth', 'Producción intensiva'],
    audienceDemographics: { ageRange: [25, 60], gender: 'mixed', interests: ['research', 'tutorials'] },
    optimalContentTypes: ['articles', 'guides', 'case studies'],
    postingFrequencySweet: '1-4/mes',
    algorithmFactors: ['SEO ranking', 'dwell time', 'backlinks'],
  },
  podcast: {
    platform: 'podcast',
    strengths: ['Deep audience bond', 'Discoverability low', 'Authority compounding'],
    weaknesses: ['Difficulty growth', 'Producción audio costoso'],
    audienceDemographics: { ageRange: [25, 55], gender: 'mixed', interests: ['learning', 'commute'] },
    optimalContentTypes: ['long-form', 'interviews', 'solo-episodes'],
    postingFrequencySweet: '1/semana',
    algorithmFactors: ['retention', 'reviews', 'listener growth'],
  },
};

// ── Diseño de flow cross-platform ────────────────────────────────────────────

export const designCrossPlatformFlow = async (
  brand: BrandProfile,
  options: {
    centralIdea: string;
    primaryPlatform?: Platform;
    targetPlatforms?: Platform[];
  },
): Promise<CrossPlatformFlow> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const primaryPlatform = options.primaryPlatform ?? 'instagram';
  const targets = options.targetPlatforms ?? ['instagram', 'tiktok', 'linkedin', 'youtube-shorts', 'twitter'];

  log.info('[crossPlatformSynergy] designing flow', { brandId, primary: primaryPlatform, targets: targets.length });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2500,
    thinking: { type: 'adaptive' },
    system: `Estratega multi-platform senior. Diseñás flujos de contenido que amplifican mediante compounding cross-platform.
Conocés affordances de cada plataforma + audience overlap + timing óptimo.`,
    messages: [
      {
        role: 'user',
        content: `Diseñá flow cross-platform para ${brand.name}:

Central idea: "${options.centralIdea}"
Primary platform: ${primaryPlatform}
Target platforms: ${targets.join(', ')}

Diseñá secuencia de N piezas (5-9) con plataforma + format + timing + adaptation + amplification expected.

Considera:
- Audience overlap entre platforms (no canibalizar)
- Algorithm preferences por platform
- Production cost (1 idea → N adaptations)
- Order óptimo de publishing

JSON: {
  "flow": [{
    "step": 1,
    "platform": "instagram|tiktok|youtube|youtube-shorts|linkedin|twitter|pinterest|threads|whatsapp|email|blog|podcast",
    "format": "tipo específico",
    "timing": "immediate|same-day|next-day|next-week|evergreen",
    "adaptation": "cómo se adapta el contenido a esta platform",
    "expectedAmplification": número multiplicador (1 = no amp, 2 = 2x)
  }],
  "audienceOverlap": { "instagram-tiktok": 0-1, ... },
  "cannibalizationRisk": 0-1
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[crossPlatformSynergy] No flow');

  const generated = JSON.parse(jsonMatch[0]) as Partial<CrossPlatformFlow>;
  const totalAmplification = (generated.flow ?? []).reduce((sum, s) => sum + s.expectedAmplification, 1);

  const flowResult: CrossPlatformFlow = {
    id: `flow-${Date.now()}`,
    brandId,
    centralIdea: options.centralIdea,
    primaryPlatform,
    flow: generated.flow ?? [],
    totalEstimatedReach: Math.round(10_000 * totalAmplification),
    audienceOverlap: generated.audienceOverlap ?? {},
    cannibalizationRisk: generated.cannibalizationRisk ?? 0.2,
  };

  await fs.mkdir(SYNERGY_DIR, { recursive: true });
  await fs.writeFile(
    path.join(SYNERGY_DIR, `${brandId}-flow-${flowResult.id}.json`),
    JSON.stringify(flowResult, null, 2),
    'utf-8',
  );
  log.info('[crossPlatformSynergy] flow saved', { steps: flowResult.flow.length, totalAmplification });
  return flowResult;
};

/** Prioriza plataformas para invertir tiempo según brand fit. */
export const prioritizePlatforms = async (
  brand: BrandProfile,
  audienceSize?: Partial<Record<Platform, number>>,
): Promise<PlatformPriority[]> => {
  const allPlatforms = Object.keys(PLATFORM_DATA) as Platform[];
  const priorities: PlatformPriority[] = [];

  for (const platform of allPlatforms) {
    const data = PLATFORM_DATA[platform];
    let score = 50;

    // Audience match
    const brandAudience = brand.audience?.description?.toLowerCase() ?? '';
    if (data.audienceDemographics.interests.some((i) => brandAudience.includes(i))) score += 15;

    // Existing audience size
    const existingSize = audienceSize?.[platform] ?? 0;
    if (existingSize > 10_000) score += 20;
    else if (existingSize > 1_000) score += 10;

    // Industry fit
    const industry = brand.industryCategory?.toLowerCase() ?? '';
    if (
      platform === 'linkedin' &&
      (industry.includes('b2b') || industry.includes('finanzas') || industry.includes('consultor'))
    )
      score += 20;
    if (
      platform === 'pinterest' &&
      (industry.includes('moda') || industry.includes('home') || industry.includes('decor'))
    )
      score += 20;
    if (
      platform === 'tiktok' &&
      (industry.includes('moda') || industry.includes('entertainment') || industry.includes('food'))
    )
      score += 15;

    const recommendedInvestment: PlatformPriority['recommendedInvestment'] =
      score > 80 ? 'core' : score > 65 ? 'high' : score > 50 ? 'medium' : 'low';

    priorities.push({
      platform,
      priority: Math.min(100, score),
      reason: `Match audience: ${data.audienceDemographics.interests.slice(0, 2).join(', ')}; existing size: ${existingSize}`,
      recommendedInvestment,
    });
  }

  return priorities.sort((a, b) => b.priority - a.priority);
};

export const getPlatformAffordance = (platform: Platform): Omit<PlatformAffordance, 'cohortSize'> =>
  PLATFORM_DATA[platform];

export const getAllFlows = async (brandId: string): Promise<CrossPlatformFlow[]> => {
  try {
    const dir = path.join(SYNERGY_DIR);
    const files = await fs.readdir(dir);
    const flows: CrossPlatformFlow[] = [];
    for (const f of files) {
      if (f.startsWith(`${brandId}-flow-`)) {
        flows.push(JSON.parse(await fs.readFile(path.join(dir, f), 'utf-8')) as CrossPlatformFlow);
      }
    }
    return flows;
  } catch {
    return [];
  }
};
