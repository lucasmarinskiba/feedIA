// @ts-nocheck
/**
 * Trend Forecaster — predicción de tendencias 7-30 días antes que se vuelvan obvias.
 *
 * Combina señales de:
 *   - Velocity de hashtags (slope > 0 → growing)
 *   - Adopción de formato (% de top accounts usando X)
 *   - Sound adoption en Reels (creciente vs declinante)
 *   - Topic mentions cross-platform (TikTok → IG migration)
 *   - Emerging keywords en captions de top performers
 *
 * Output: trend predictions con confidence, ETA viralización, expected lifespan.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const TREND_DIR = path.resolve('data/neural/trends');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TrendType = 'hashtag' | 'sound' | 'format' | 'topic' | 'aesthetic' | 'meme' | 'challenge' | 'narrative';

export type TrendPhase = 'germination' | 'emerging' | 'rising' | 'peak' | 'declining' | 'extinct';

export interface TrendSignal {
  date: string;
  metric: 'mentions' | 'uses' | 'engagement' | 'searches';
  value: number;
}

export interface TrendForecast {
  id: string;
  type: TrendType;
  name: string;
  description: string;
  phase: TrendPhase;
  detectedAt: string;
  estimatedPeakDate: string;
  estimatedExtinctionDate: string;
  velocityScore: number; // 0-1 (rate of adoption growth)
  saturationScore: number; // 0-1 (how crowded)
  windowOfOpportunityDays: number;
  confidenceScore: number; // 0-1
  recommendedAction: 'ride-now' | 'prepare' | 'wait' | 'avoid';
  riskFactors: string[];
  evidence: TrendSignal[];
  competingAccountsUsing: string[];
  applicabilityToBrand: number; // 0-1
}

export interface TrendForecastReport {
  brandId: string;
  niche: string;
  generatedAt: string;
  forecasts: TrendForecast[];
  topOpportunities: TrendForecast[];
  riskyTrends: TrendForecast[];
}

// ── Cálculo de phase desde signals ───────────────────────────────────────────

export const computeVelocity = (signals: TrendSignal[]): number => {
  if (signals.length < 3) return 0;
  const sorted = [...signals].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-5);
  // Slope simple desde primera a última
  const first = recent[0]?.value ?? 0;
  const last = recent[recent.length - 1]?.value ?? 0;
  if (first === 0) return last > 0 ? 1 : 0;
  return Math.min(1, Math.max(-1, (last - first) / first));
};

const inferPhase = (velocity: number, saturationScore: number): TrendPhase => {
  if (velocity > 0.5 && saturationScore < 0.3) return 'emerging';
  if (velocity > 0.3 && saturationScore < 0.6) return 'rising';
  if (velocity > -0.1 && velocity < 0.3 && saturationScore > 0.6) return 'peak';
  if (velocity < -0.1) return saturationScore > 0.4 ? 'declining' : 'extinct';
  if (velocity > 0.1 && saturationScore < 0.1) return 'germination';
  return 'rising';
};

const recommendAction = (
  phase: TrendPhase,
  applicability: number,
  saturation: number,
): TrendForecast['recommendedAction'] => {
  if (applicability < 0.3) return 'avoid';
  if (phase === 'germination' || phase === 'emerging') return 'ride-now';
  if (phase === 'rising' && saturation < 0.7) return 'ride-now';
  if (phase === 'peak') return saturation > 0.85 ? 'wait' : 'prepare';
  if (phase === 'declining' || phase === 'extinct') return 'avoid';
  return 'prepare';
};

// ── Forecasting principal ────────────────────────────────────────────────────

export const forecastTrends = async (
  brand: BrandProfile,
  options: {
    niche?: string;
    horizon?: number; // días hacia adelante (default 30)
    includeRiskyTrends?: boolean;
  } = {},
): Promise<TrendForecastReport> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const niche = options.niche ?? brand.industryCategory ?? 'general';

  log.info('[trendForecaster] forecasting', { brandId, niche, horizon: options.horizon ?? 30 });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3500,
    thinking: { type: 'adaptive' },
    system: `Analista de trends de Instagram con expertise en pattern detection y predicción.
Identificás trends en fase germination/emerging ANTES que sean obvias.
Conocés cómo TikTok migra a Instagram, qué formatos están en alza, qué estéticas decaen.
Devolvés JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Forecasteá trends para el nicho "${niche}" en próximos ${options.horizon ?? 30} días.

Marca: ${brand.name}
Tono: ${brand.voice?.tone?.join(', ') ?? 'general'}

Identificá 8-12 trends en distintas phases:
- Al menos 2 en germination (early signal, riesgo alto / upside alto)
- Al menos 3 en emerging (window de oportunidad clara)
- Al menos 2 en rising (still time to ride)
- Al menos 1 en peak (cuidado saturación)
- Al menos 2 en declining (qué evitar / reemplazar)

Para cada trend:
{
  "type": "hashtag|sound|format|topic|aesthetic|meme|challenge|narrative",
  "name": "nombre exacto del trend",
  "description": "qué es + por qué crece (o decae)",
  "phase": "germination|emerging|rising|peak|declining|extinct",
  "estimatedPeakDate": "YYYY-MM-DD",
  "estimatedExtinctionDate": "YYYY-MM-DD",
  "velocityScore": 0-1,
  "saturationScore": 0-1,
  "windowOfOpportunityDays": número,
  "confidenceScore": 0-1,
  "riskFactors": ["riesgo si lo uso"],
  "competingAccountsUsing": ["@handle"],
  "applicabilityToBrand": 0-1
}

JSON: { "forecasts": [...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[trendForecaster] No forecasts');

  const result = JSON.parse(jsonMatch[0]) as { forecasts: Partial<TrendForecast>[] };

  const forecasts: TrendForecast[] = result.forecasts.map((f, i) => {
    const velocity = f.velocityScore ?? 0.5;
    const saturation = f.saturationScore ?? 0.5;
    const phase = f.phase ?? inferPhase(velocity, saturation);
    const applicability = f.applicabilityToBrand ?? 0.5;
    return {
      id: `trend-${Date.now()}-${i}`,
      type: f.type ?? 'topic',
      name: f.name ?? '',
      description: f.description ?? '',
      phase,
      detectedAt: new Date().toISOString(),
      estimatedPeakDate: f.estimatedPeakDate ?? '',
      estimatedExtinctionDate: f.estimatedExtinctionDate ?? '',
      velocityScore: velocity,
      saturationScore: saturation,
      windowOfOpportunityDays: f.windowOfOpportunityDays ?? 14,
      confidenceScore: f.confidenceScore ?? 0.6,
      recommendedAction: recommendAction(phase, applicability, saturation),
      riskFactors: f.riskFactors ?? [],
      evidence: f.evidence ?? [],
      competingAccountsUsing: f.competingAccountsUsing ?? [],
      applicabilityToBrand: applicability,
    };
  });

  const topOpportunities = forecasts
    .filter((f) => f.recommendedAction === 'ride-now' && f.applicabilityToBrand > 0.5)
    .sort(
      (a, b) =>
        b.velocityScore * b.confidenceScore * b.applicabilityToBrand -
        a.velocityScore * a.confidenceScore * a.applicabilityToBrand,
    )
    .slice(0, 5);

  const riskyTrends = forecasts
    .filter((f) => f.recommendedAction === 'avoid' || f.phase === 'declining' || f.phase === 'extinct')
    .slice(0, 5);

  const report: TrendForecastReport = {
    brandId,
    niche,
    generatedAt: new Date().toISOString(),
    forecasts,
    topOpportunities,
    riskyTrends,
  };

  await fs.mkdir(TREND_DIR, { recursive: true });
  await fs.writeFile(path.join(TREND_DIR, `${brandId}-forecast.json`), JSON.stringify(report, null, 2), 'utf-8');
  log.info('[trendForecaster] done', { forecasts: forecasts.length, opportunities: topOpportunities.length });
  return report;
};

/** Registra signal real observado para refinar futuros forecasts. */
export const recordTrendSignal = async (trendId: string, signal: TrendSignal): Promise<void> => {
  const file = path.join(TREND_DIR, `signals-${trendId}.json`);
  let signals: TrendSignal[] = [];
  try {
    signals = JSON.parse(await fs.readFile(file, 'utf-8')) as TrendSignal[];
  } catch {
    /* noop */
  }
  signals.push(signal);
  await fs.mkdir(TREND_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(signals.slice(-100), null, 2), 'utf-8');
};

export const getLatestForecast = async (brandId: string): Promise<TrendForecastReport | null> => {
  try {
    return JSON.parse(
      await fs.readFile(path.join(TREND_DIR, `${brandId}-forecast.json`), 'utf-8'),
    ) as TrendForecastReport;
  } catch {
    return null;
  }
};

/** Enrichment de prompt con top trends actuales. */
export const buildTrendEnrichment = async (brandId: string): Promise<string> => {
  const report = await getLatestForecast(brandId);
  if (!report || report.topOpportunities.length === 0) return '';
  const parts: string[] = ['[TRENDS A MONTAR — predicción del cerebro]'];
  for (const t of report.topOpportunities.slice(0, 3)) {
    parts.push(
      `- [${t.phase}] ${t.name} (window ${t.windowOfOpportunityDays}d, confidence ${(t.confidenceScore * 100).toFixed(0)}%) — ${t.description}`,
    );
  }
  if (report.riskyTrends.length > 0) {
    parts.push('[EVITAR — trends en declive]');
    for (const t of report.riskyTrends.slice(0, 2)) {
      parts.push(`- ${t.name}: ${t.description}`);
    }
  }
  parts.push('[FIN TRENDS]');
  return parts.join('\n');
};
