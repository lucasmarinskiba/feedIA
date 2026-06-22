// @ts-nocheck
/**
 * Cultural Calendar — efemérides + holidays + awareness days + micro-trends por geo.
 *
 * Genera calendar de eventos culturales relevantes al nicho:
 *   - Holidays nacionales (Navidad, Halloween, etc)
 *   - Awareness days (Día de la salud mental, del medio ambiente)
 *   - Eventos de industria (Black Friday, Cyber Monday, festivales)
 *   - Micro-trends por geo (carnavales regionales, fechas locales)
 *
 * Output: oportunidades de newsjacking respetando context.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const CULTURAL_DIR = path.resolve('data/neural/cultural');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EventCategory =
  | 'holiday-global'
  | 'holiday-national'
  | 'awareness-day'
  | 'commercial-event'
  | 'cultural-event'
  | 'sports-event'
  | 'religious'
  | 'pride-event'
  | 'seasonal'
  | 'industry-event'
  | 'pop-culture'
  | 'environmental';

export type RelevanceLevel = 'critical' | 'high' | 'medium' | 'low' | 'avoid';

export interface CulturalEvent {
  id: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // si es multi-día
  name: string;
  category: EventCategory;
  region: string; // 'global' | 'AR' | 'LATAM' | 'US' | ...
  relevance: RelevanceLevel; // para el nicho específico
  description: string;
  contentAngles: string[]; // ángulos posibles para post
  hashtagSuggestions: string[];
  toneRecommended: string; // 'celebratorio' | 'reflexivo' | 'humor' | 'educativo'
  taboosToAvoid: string[];
  preparationLeadDays: number; // cuántos días antes empezar a preparar
  audienceInterestScore: number; // 0-1
}

export interface CulturalCalendar {
  brandId: string;
  niche: string;
  regions: string[];
  generatedAt: string;
  horizonDays: number;
  events: CulturalEvent[];
  upcomingPriorities: CulturalEvent[];
  weeklyDigest: Record<string, CulturalEvent[]>; // 'YYYY-Wxx' → events
}

// ── Generación del calendar ──────────────────────────────────────────────────

export const buildCulturalCalendar = async (
  brand: BrandProfile,
  options: {
    regions?: string[];
    horizonDays?: number;
    includeReligious?: boolean;
    includePolitical?: boolean;
  } = {},
): Promise<CulturalCalendar> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const regions = options.regions ?? [brand.audience?.locale?.split('-')[1] ?? 'AR', 'global'];
  const horizonDays = options.horizonDays ?? 90;
  const niche = brand.industryCategory ?? 'general';

  log.info('[culturalCalendar] building', { brandId, regions, horizonDays });

  const now = new Date();
  const endDate = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: `Experto en calendar cultural global y regional.
Conocés holidays, awareness days, eventos comerciales, festivales, religiosos, pop culture
de cada región. Sabés cuáles son relevantes para qué nicho y cuáles evitar.`,
    messages: [
      {
        role: 'user',
        content: `Construí calendar cultural para ${brand.name} (nicho: ${niche}):

Regiones: ${regions.join(', ')}
Período: ${now.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}
${options.includeReligious ? 'Incluir fechas religiosas' : 'Solo si son culturalmente neutrales'}
${options.includePolitical ? 'Incluir fechas políticas' : 'Excluir fechas políticas divisivas'}

Identificá 20-35 eventos relevantes. Para cada uno:
{
  "date": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD opcional",
  "name": "nombre",
  "category": "holiday-global|holiday-national|awareness-day|commercial-event|cultural-event|sports-event|religious|pride-event|seasonal|industry-event|pop-culture|environmental",
  "region": "región",
  "relevance": "critical|high|medium|low|avoid",
  "description": "qué es",
  "contentAngles": ["ángulo posible 1", "ángulo 2"],
  "hashtagSuggestions": ["#hashtag1"],
  "toneRecommended": "celebratorio|reflexivo|humor|educativo|empático",
  "taboosToAvoid": ["qué no hacer"],
  "preparationLeadDays": número,
  "audienceInterestScore": 0-1
}

JSON: { "events": [...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[culturalCalendar] No events');

  const result = JSON.parse(jsonMatch[0]) as { events: Partial<CulturalEvent>[] };
  const events: CulturalEvent[] = result.events
    .map((e, i) => ({
      id: `event-${Date.now()}-${i}`,
      date: e.date ?? '',
      endDate: e.endDate,
      name: e.name ?? '',
      category: e.category ?? 'cultural-event',
      region: e.region ?? 'global',
      relevance: e.relevance ?? 'medium',
      description: e.description ?? '',
      contentAngles: e.contentAngles ?? [],
      hashtagSuggestions: e.hashtagSuggestions ?? [],
      toneRecommended: e.toneRecommended ?? 'celebratorio',
      taboosToAvoid: e.taboosToAvoid ?? [],
      preparationLeadDays: e.preparationLeadDays ?? 7,
      audienceInterestScore: e.audienceInterestScore ?? 0.5,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Upcoming priorities: próximos 30 días con relevance >= high
  const cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingPriorities = events.filter((e) => {
    const eDate = new Date(e.date);
    return eDate >= now && eDate <= cutoff && (e.relevance === 'critical' || e.relevance === 'high');
  });

  // Weekly digest
  const weeklyDigest: Record<string, CulturalEvent[]> = {};
  for (const event of events) {
    const eDate = new Date(event.date);
    const year = eDate.getFullYear();
    const week = Math.ceil(
      ((eDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7,
    );
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    weeklyDigest[key] = weeklyDigest[key] ?? [];
    weeklyDigest[key]!.push(event);
  }

  const calendar: CulturalCalendar = {
    brandId,
    niche,
    regions,
    generatedAt: new Date().toISOString(),
    horizonDays,
    events,
    upcomingPriorities,
    weeklyDigest,
  };

  await fs.mkdir(CULTURAL_DIR, { recursive: true });
  await fs.writeFile(path.join(CULTURAL_DIR, `${brandId}-calendar.json`), JSON.stringify(calendar, null, 2), 'utf-8');
  log.info('[culturalCalendar] saved', { brandId, events: events.length, priorities: upcomingPriorities.length });
  return calendar;
};

export const getCulturalCalendar = async (brandId: string): Promise<CulturalCalendar | null> => {
  try {
    return JSON.parse(
      await fs.readFile(path.join(CULTURAL_DIR, `${brandId}-calendar.json`), 'utf-8'),
    ) as CulturalCalendar;
  } catch {
    return null;
  }
};

/** Eventos en los próximos N días que deberían disparar contenido. */
export const getActionableEvents = async (brandId: string, lookAheadDays = 14): Promise<CulturalEvent[]> => {
  const calendar = await getCulturalCalendar(brandId);
  if (!calendar) return [];
  const now = Date.now();
  const cutoff = now + lookAheadDays * 24 * 60 * 60 * 1000;
  return calendar.events.filter((e) => {
    const eTime = new Date(e.date).getTime();
    const leadTime = eTime - e.preparationLeadDays * 24 * 60 * 60 * 1000;
    return leadTime <= cutoff && eTime >= now && e.relevance !== 'avoid' && e.relevance !== 'low';
  });
};

export const buildCulturalEnrichment = async (brandId: string): Promise<string> => {
  const actionable = await getActionableEvents(brandId, 14);
  if (actionable.length === 0) return '';
  const parts: string[] = ['[CALENDARIO CULTURAL — eventos próximos 14 días]'];
  for (const e of actionable.slice(0, 5)) {
    parts.push(`- ${e.date} | ${e.name} (${e.relevance}) — ángulos: ${e.contentAngles.slice(0, 2).join(' / ')}`);
    if (e.taboosToAvoid.length) parts.push(`  ⚠️ Evitar: ${e.taboosToAvoid.join('; ')}`);
  }
  parts.push('[FIN CALENDARIO]');
  return parts.join('\n');
};
