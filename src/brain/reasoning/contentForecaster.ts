/**
 * Content Forecaster — Predice qué contenido necesitará la audiencia
 * Anticipa necesidades basándose en calendario, trending, historic patterns,
 * y ciclo de vida de la audiencia.
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import { getTrendsForNiche, getTrendContentIdeas } from '../growth/trendSync.js';

export interface ContentForecast {
  period: string;
  predictions: {
    type: string;
    format: string;
    urgency: 'immediate' | 'this_week' | 'this_month';
    confidence: number;
    reasoning: string;
    suggestedAngle: string;
  }[];
  gaps: string[];
  opportunities: string[];
}

// ── Forecast content needs ─────────────────────────────────────────────────

export const forecast = async (niche: string, brandTopics: string[]): Promise<ContentForecast> => {
  const now = new Date();
  const month = now.getMonth();
  const predictions: ContentForecast['predictions'] = [];
  const gaps: string[] = [];
  const opportunities: string[] = [];

  // 1. Seasonal forecasting
  const seasonalNeeds = getSeasonalNeeds(niche, month);
  for (const need of seasonalNeeds) {
    predictions.push({
      type: 'seasonal',
      format: need.format,
      urgency: now.getDate() < 15 ? 'this_month' : 'this_week',
      confidence: 0.8,
      reasoning: `Patrón estacional: ${need.reason}`,
      suggestedAngle: need.angle,
    });
  }

  // 2. Trend-based prediction
  const trends = getTrendsForNiche(niche, 0.4);
  const ideas = getTrendContentIdeas(niche);
  if (trends.length > 0 && ideas.length > 0) {
    predictions.push({
      type: 'trending',
      format: 'reel',
      urgency: 'immediate',
      confidence: trends[0]!.signalStrength,
      reasoning: `Trending: ${trends[0]!.topic}`,
      suggestedAngle: ideas[0]!.idea,
    });
  }

  // 3. Gap detection from memory
  const recentTopics = await semantic.recall(niche, 20, ['post', 'learning']);
  const coveredTopics = new Set(recentTopics.map((r) => r.entry.content.slice(0, 20)));
  for (const topic of brandTopics) {
    if (!Array.from(coveredTopics).some((c) => c.includes(topic))) {
      gaps.push(topic);
    }
  }

  // 4. Lifecycle-based opportunities
  const recentEpisodes = episodic.recallLastDays(14);
  const stages = new Map<string, number>();
  for (const ep of recentEpisodes) {
    // Check tags for lifecycle indicators
    for (const tag of ep.tags) {
      if (['stalker', 'lurker', 'fan', 'lead', 'customer', 'ambassador'].includes(tag)) {
        stages.set(tag, (stages.get(tag) ?? 0) + 1);
      }
    }
  }
  const leadCount = stages.get('lead') ?? 0;
  const customerCount = stages.get('customer') ?? 0;
  if (leadCount > customerCount) {
    opportunities.push('Audiencia está en fase lead — necesita contenido de conversión');
  }

  log.info(`[ContentForecaster] ${predictions.length} predictions, ${gaps.length} gaps for ${niche}`);

  return {
    period: `${now.getFullYear()}-${String(month + 1).padStart(2, '0')}`,
    predictions,
    gaps: gaps.slice(0, 5),
    opportunities: opportunities.slice(0, 3),
  };
};

// ── Seasonal patterns ──────────────────────────────────────────────────────

interface SeasonalNeed {
  format: string;
  reason: string;
  angle: string;
}

const getSeasonalNeeds = (niche: string, month: number): SeasonalNeed[] => {
  const needs: SeasonalNeed[] = [];

  const patterns: Record<string, Record<number, SeasonalNeed[]>> = {
    fitness: {
      0: [{ format: 'carousel', reason: 'New Year resolutions', angle: 'Rutina de 30 días para empezar el año' }],
      5: [{ format: 'reel', reason: 'Summer body prep', angle: 'Preparación verano: 6 semanas' }],
      8: [{ format: 'carousel', reason: 'Back to routine', angle: 'Volver a la rutina post-vacaciones' }],
    },
    beauty: {
      0: [{ format: 'carousel', reason: 'New Year glow up', angle: 'Glow up 2026: paso a paso' }],
      5: [{ format: 'reel', reason: 'Summer skincare', angle: 'Rutina skincare verano' }],
      11: [{ format: 'carousel', reason: 'Holiday looks', angle: 'Looks de fiesta paso a paso' }],
    },
    business: {
      0: [{ format: 'carousel', reason: 'Q1 planning', angle: 'Planifica tu mejor Q1' }],
      3: [{ format: 'reel', reason: 'Q2 momentum', angle: 'Acelera en Q2' }],
      8: [{ format: 'carousel', reason: 'Q4 prep', angle: 'Prepárate para el Q4' }],
    },
    tech: {
      5: [{ format: 'reel', reason: 'WWDC/Summer releases', angle: 'Novedades tech de verano' }],
      8: [{ format: 'carousel', reason: 'iPhone/event season', angle: 'Lo que viene este otoño' }],
      11: [{ format: 'reel', reason: 'Year in review', angle: 'Resumen tech 2026' }],
    },
  };

  const nichePatterns = patterns[niche] ?? {};
  return nichePatterns[month] ?? [];
};

export const getStats = (): { forecasts: number } => ({ forecasts: 0 }); // placeholder
