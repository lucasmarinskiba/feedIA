/**
 * Content Strategy Engine — planificación, posicionamiento, gestión y
 * brújula de contenido para FeedIA.
 *
 * Construye ENCIMA de la infraestructura de scheduling existente
 * (src/database/calendarQueue.ts) en vez de reinventar storage: cada pieza
 * planificada se inserta como CalendarPost status='draft', con el pipeline
 * de producción (idea → guion → diseño → revisión → listo) guardado en
 * metadata.stage. Esto permite que el dispatcher/scheduler existente
 * (src/scheduler/jobs.ts) siga siendo la única fuente de verdad para el
 * envío real, y esta capa solo agrega inteligencia de planificación arriba.
 */

import { log } from '../agent/logger.js';
import {
  insertCalendarPost,
  listCalendarPostsByAccount,
  updateCalendarPost,
  type CalendarPost,
} from '../database/calendarQueue.js';
import { brujulaIntegration } from '../api/brujula-carousel-integration.js';
import type { BrandProfile } from '../config/types.js';

export type ContentStage = 'idea' | 'script' | 'design' | 'review' | 'ready' | 'scheduled';

export type FeedFormat = 'reel' | 'carrusel' | 'imagen' | 'historia';

/** Default weekly format cadence — how many of each format per 7 days. */
export const DEFAULT_WEEKLY_CADENCE: Record<FeedFormat, number> = {
  carrusel: 3,
  reel: 2,
  historia: 5,
  imagen: 1,
};

/** Content pillars — rotate through these so no single topic dominates the feed. */
export interface ContentPillar {
  name: string;
  occasion: string; // maps to promptLoader occasion / feediaBrain domain
  weight: number; // relative frequency, higher = more often picked
}

const DEFAULT_PILLARS: ContentPillar[] = [
  { name: 'Educativo', occasion: 'tips', weight: 3 },
  { name: 'Inspiracional', occasion: 'motivacion', weight: 2 },
  { name: 'Producto/Oferta', occasion: 'producto', weight: 2 },
  { name: 'Detrás de escena', occasion: 'proceso', weight: 1 },
  { name: 'Comunidad/Engagement', occasion: 'pregunta', weight: 2 },
];

interface CalendarPlanItem {
  date: string; // ISO date (day granularity)
  format: FeedFormat;
  pillar: string;
  occasion: string;
  postId: string;
  stage: ContentStage;
}

interface CalendarPlanResult {
  accountId: string;
  days: number;
  items: CalendarPlanItem[];
  formatDistribution: Record<FeedFormat, number>;
}

/**
 * Pick a pillar using weighted random selection — avoids strict round-robin
 * which feels mechanical, but still respects relative weights over time.
 */
const pickWeightedPillar = (pillars: ContentPillar[]): ContentPillar => {
  const totalWeight = pillars.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const pillar of pillars) {
    roll -= pillar.weight;
    if (roll <= 0) return pillar;
  }
  return pillars[pillars.length - 1] ?? pillars[0]!;
};

/** Expand a weekly cadence into a flat, shuffled list of formats for N days. */
const buildFormatSequence = (days: number, cadence: Record<FeedFormat, number>): FeedFormat[] => {
  const weeklyTotal = Object.values(cadence).reduce((a, b) => a + b, 0) || 1;
  const weeks = Math.ceil(days / 7);
  const sequence: FeedFormat[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekFormats: FeedFormat[] = [];
    (Object.entries(cadence) as [FeedFormat, number][]).forEach(([format, count]) => {
      for (let i = 0; i < count; i++) weekFormats.push(format);
    });
    // Shuffle so the same format doesn't always land on the same weekday
    for (let i = weekFormats.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [weekFormats[i], weekFormats[j]] = [weekFormats[j]!, weekFormats[i]!];
    }
    sequence.push(...weekFormats);
  }

  return sequence.slice(0, days).length ? sequence.slice(0, days) : Array(days).fill('carrusel' as FeedFormat);
};

class ContentStrategyEngine {
  /**
   * Plan a content calendar for the next N days and persist it as draft
   * CalendarPosts (stage='idea'). Does not generate final prompts yet —
   * that happens when a task advances to the 'script'/'design' stage,
   * keeping expensive LLM calls lazy until a human/agent commits to the slot.
   */
  async planCalendar(
    accountId: string,
    brand: BrandProfile,
    days: number = 7,
    cadence: Record<FeedFormat, number> = DEFAULT_WEEKLY_CADENCE,
    pillars: ContentPillar[] = DEFAULT_PILLARS
  ): Promise<CalendarPlanResult> {
    const formatSequence = buildFormatSequence(days, cadence);
    const items: CalendarPlanItem[] = [];
    const formatDistribution: Record<FeedFormat, number> = { carrusel: 0, reel: 0, historia: 0, imagen: 0 };

    const startDate = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const format = formatSequence[i] ?? 'carrusel';
      const pillar = pickWeightedPillar(pillars);

      formatDistribution[format]++;

      const post = await insertCalendarPost({
        accountId,
        format,
        mediaUrls: [],
        status: 'draft',
        metadata: {
          stage: 'idea' as ContentStage,
          pillar: pillar.name,
          occasion: pillar.occasion,
          plannedDate: date.toISOString().slice(0, 10),
          brandName: brand.name,
        },
      });

      items.push({
        date: date.toISOString().slice(0, 10),
        format,
        pillar: pillar.name,
        occasion: pillar.occasion,
        postId: post.id,
        stage: 'idea',
      });
    }

    log.info('[ContentStrategy] Calendar planned', {
      accountId,
      days,
      distribution: formatDistribution,
    });

    return { accountId, days, items, formatDistribution };
  }

  /**
   * Task list: every draft/scheduled post for an account, grouped by
   * production stage. This is the "lista de tareas" — what's still an idea,
   * what needs a script, what's in design/review, what's ready to schedule.
   */
  async getTaskList(accountId: string): Promise<Record<ContentStage, CalendarPost[]>> {
    const posts = await listCalendarPostsByAccount(accountId, { status: 'draft', limit: 200 });

    const grouped: Record<ContentStage, CalendarPost[]> = {
      idea: [],
      script: [],
      design: [],
      review: [],
      ready: [],
      scheduled: [],
    };

    for (const post of posts) {
      const stage = (post.metadata?.stage as ContentStage) ?? 'idea';
      (grouped[stage] ?? grouped.idea).push(post);
    }

    return grouped;
  }

  /**
   * Advance a planned piece to the next production stage. When moving into
   * 'design' the caller is expected to have already generated a caption/prompt
   * via the Master Content Pipeline or Brújula — this just tracks progress.
   */
  async advanceStage(
    postId: string,
    newStage: ContentStage,
    updates?: { caption?: string; mediaUrls?: string[]; scheduledAt?: string }
  ): Promise<void> {
    const metadataPatch: Record<string, unknown> = { stage: newStage };

    await updateCalendarPost(postId, {
      ...(updates?.caption !== undefined ? { caption: updates.caption } : {}),
      ...(updates?.mediaUrls !== undefined ? { mediaUrls: updates.mediaUrls } : {}),
      ...(newStage === 'scheduled' && updates?.scheduledAt ? { scheduledAt: updates.scheduledAt, status: 'scheduled' } : {}),
      metadata: metadataPatch,
    });

    log.info('[ContentStrategy] Task advanced', { postId, newStage });
  }

  /**
   * Content Compass ("Brújula de contenido"): looks at the last 14 days of
   * activity, compares actual format distribution against the ideal cadence,
   * and returns concrete gaps + a recommended next batch to fill them.
   */
  async getContentCompass(
    accountId: string,
    brand: BrandProfile,
    cadence: Record<FeedFormat, number> = DEFAULT_WEEKLY_CADENCE
  ): Promise<Record<string, any>> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const recent = await listCalendarPostsByAccount(accountId, {
      from: since.toISOString(),
      limit: 200,
    });

    const actualDistribution: Record<FeedFormat, number> = { carrusel: 0, reel: 0, historia: 0, imagen: 0 };
    for (const post of recent) {
      if (post.format in actualDistribution) actualDistribution[post.format as FeedFormat]++;
    }

    // Ideal over 2 weeks = cadence * 2
    const gaps: Array<{ format: FeedFormat; ideal: number; actual: number; deficit: number }> = [];
    (Object.keys(cadence) as FeedFormat[]).forEach(format => {
      const ideal = cadence[format] * 2;
      const actual = actualDistribution[format];
      const deficit = ideal - actual;
      if (deficit > 0) gaps.push({ format, ideal, actual, deficit });
    });

    gaps.sort((a, b) => b.deficit - a.deficit);

    const recommendation = gaps.length
      ? `Priority gap: ${gaps[0]!.format} (${gaps[0]!.actual}/${gaps[0]!.ideal} in last 14 days). Recommend planning ${gaps[0]!.deficit} more ${gaps[0]!.format} post(s) this week.`
      : 'Format mix is balanced. Maintain current cadence.';

    log.info('[ContentStrategy] Compass computed', { accountId, gapCount: gaps.length });

    return {
      accountId,
      windowDays: 14,
      actualDistribution,
      idealDistribution: Object.fromEntries((Object.keys(cadence) as FeedFormat[]).map(f => [f, cadence[f] * 2])),
      gaps,
      recommendation,
      suggestedPillarFocus: gaps.length ? DEFAULT_PILLARS.find(p => p.weight === Math.max(...DEFAULT_PILLARS.map(pl => pl.weight)))?.name : null,
    };
  }

  /**
   * Auto-fill compass gaps: plans just enough posts to close the biggest
   * detected gap, instead of a blind full-week replan.
   */
  async fillCompassGaps(accountId: string, brand: BrandProfile): Promise<CalendarPlanResult> {
    const compass = await this.getContentCompass(accountId, brand);
    const topGap = compass.gaps[0];

    if (!topGap) {
      return { accountId, days: 0, items: [], formatDistribution: { carrusel: 0, reel: 0, historia: 0, imagen: 0 } };
    }

    const fillCadence: Record<FeedFormat, number> = { carrusel: 0, reel: 0, historia: 0, imagen: 0 };
    fillCadence[topGap.format as FeedFormat] = topGap.deficit;

    return this.planCalendar(accountId, brand, 7, fillCadence);
  }
}

export const contentStrategyEngine = new ContentStrategyEngine();
