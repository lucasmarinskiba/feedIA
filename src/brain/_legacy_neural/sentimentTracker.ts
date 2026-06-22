// @ts-nocheck
/**
 * Sentiment Tracker — monitor continuo de mood de la audiencia.
 *
 * Detecta:
 *   - Shifts de sentiment (positive → negative en 24h)
 *   - Mood baseline por audience segment
 *   - Topics que generan polaridad
 *   - Crisis temprana antes que explote
 *   - Engagement quality (no solo cantidad)
 *
 * Distinto a feedbackLoop (métricas) — esto es emocional/cualitativo.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const SENTIMENT_DIR = path.resolve('data/neural/sentiment');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type SentimentLabel = 'love' | 'positive' | 'neutral' | 'concern' | 'negative' | 'hostile' | 'sarcasm';

export interface SentimentSnapshot {
  brandId: string;
  timestamp: string;
  windowDays: number;
  totalAnalyzed: number;
  distribution: Record<SentimentLabel, number>; // % por label
  overallScore: number; // -1 to 1
  trendVsLastWindow: number; // delta vs previous snapshot
  moodKeywords: { positive: string[]; negative: string[] };
  topPolarizingTopics: Array<{ topic: string; polarity: number; volume: number }>;
  earlyWarningSignals: string[];
  crisisRiskScore: number; // 0-1
}

export interface CommentAnalysis {
  text: string;
  label: SentimentLabel;
  score: number; // -1 to 1
  emotions: string[];
  toxicityScore: number;
  authenticityScore: number; // bot detection
  containsCallToAction: boolean;
  language: string;
}

// ── Análisis de comments en batch ────────────────────────────────────────────

export const analyzeCommentBatch = async (comments: string[]): Promise<CommentAnalysis[]> => {
  if (comments.length === 0) return [];

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: `Sentiment analyst especializado en comments IG. Detectás emoción, sarcasmo, hostilidad, bot patterns.`,
    messages: [
      {
        role: 'user',
        content: `Analizá estos ${comments.length} comments de IG:

${comments
  .slice(0, 60)
  .map((c, i) => `${i + 1}. ${c.slice(0, 200)}`)
  .join('\n')}

Para cada uno devolvé:
{
  "comments": [{
    "text": "primeros 80 chars",
    "label": "love|positive|neutral|concern|negative|hostile|sarcasm",
    "score": -1 a 1,
    "emotions": ["alegria", "rabia", ...],
    "toxicityScore": 0-1,
    "authenticityScore": 0-1 (1 = humano, 0 = bot),
    "containsCallToAction": boolean,
    "language": "es|en|pt|..."
  }]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as { comments: CommentAnalysis[] };
  return result.comments;
};

// ── Snapshot completo ────────────────────────────────────────────────────────

export const generateSentimentSnapshot = async (
  brand: BrandProfile,
  comments: string[],
  windowDays = 7,
): Promise<SentimentSnapshot> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[sentimentTracker] snapshot', { brandId, comments: comments.length });

  const analyses = await analyzeCommentBatch(comments);

  // Distribution
  const distribution: Record<SentimentLabel, number> = {
    love: 0,
    positive: 0,
    neutral: 0,
    concern: 0,
    negative: 0,
    hostile: 0,
    sarcasm: 0,
  };
  for (const a of analyses) distribution[a.label] = (distribution[a.label] ?? 0) + 1;
  const total = analyses.length || 1;
  for (const k of Object.keys(distribution) as SentimentLabel[]) {
    distribution[k] = distribution[k] / total;
  }

  // Overall score
  const overallScore = analyses.length > 0 ? analyses.reduce((s, a) => s + a.score, 0) / analyses.length : 0;

  // Trend vs previous
  const prev = await getLatestSnapshot(brandId);
  const trendVsLastWindow = prev ? overallScore - prev.overallScore : 0;

  // Early warning
  const earlyWarningSignals: string[] = [];
  if (distribution.hostile > 0.1)
    earlyWarningSignals.push(`${(distribution.hostile * 100).toFixed(0)}% comments hostiles`);
  if (distribution.negative + distribution.hostile > 0.25)
    earlyWarningSignals.push('Negative sentiment >25% — atención');
  if (trendVsLastWindow < -0.2) earlyWarningSignals.push('Caída brusca de sentiment vs período anterior');
  if (distribution.sarcasm > 0.15) earlyWarningSignals.push('Sarcasm elevado — audiencia escéptica');

  const crisisRiskScore = Math.min(
    1,
    distribution.hostile * 2 + distribution.negative * 1 + Math.max(0, -trendVsLastWindow) + distribution.sarcasm * 0.5,
  );

  // Moods keywords desde Claude
  const moodStream = await client.messages.stream({
    model: MODEL,
    max_tokens: 600,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `De estos comments, extraé keywords que aparecen en sentiment positive vs negative:

POSITIVE (label=love|positive): ${analyses
          .filter((a) => a.score > 0.5)
          .map((a) => a.text)
          .slice(0, 15)
          .join(' || ')}
NEGATIVE (label=negative|hostile): ${analyses
          .filter((a) => a.score < -0.3)
          .map((a) => a.text)
          .slice(0, 15)
          .join(' || ')}

JSON: {
  "positive": ["palabras top en positive"],
  "negative": ["palabras top en negative"],
  "topPolarizingTopics": [{ "topic": "...", "polarity": 0-1, "volume": número }]
}`,
      },
    ],
  });

  const moodMsg = await moodStream.finalMessage();
  const moodTextBlock = moodMsg.content.find((b) => b.type === 'text');
  const moodMatch = moodTextBlock?.text.match(/\{[\s\S]*\}/);
  const moodData = moodMatch
    ? (JSON.parse(moodMatch[0]) as {
        positive: string[];
        negative: string[];
        topPolarizingTopics: Array<{ topic: string; polarity: number; volume: number }>;
      })
    : { positive: [], negative: [], topPolarizingTopics: [] };

  const snapshot: SentimentSnapshot = {
    brandId,
    timestamp: new Date().toISOString(),
    windowDays,
    totalAnalyzed: analyses.length,
    distribution,
    overallScore,
    trendVsLastWindow,
    moodKeywords: { positive: moodData.positive, negative: moodData.negative },
    topPolarizingTopics: moodData.topPolarizingTopics,
    earlyWarningSignals,
    crisisRiskScore,
  };

  await fs.mkdir(SENTIMENT_DIR, { recursive: true });
  const file = path.join(SENTIMENT_DIR, `${brandId}-snapshots.json`);
  let history: SentimentSnapshot[] = [];
  try {
    history = JSON.parse(await fs.readFile(file, 'utf-8')) as SentimentSnapshot[];
  } catch {
    /* noop */
  }
  history.push(snapshot);
  await fs.writeFile(file, JSON.stringify(history.slice(-100), null, 2), 'utf-8');

  log.info('[sentimentTracker] snapshot saved', {
    brandId,
    score: overallScore.toFixed(2),
    crisis: crisisRiskScore.toFixed(2),
  });
  return snapshot;
};

export const getLatestSnapshot = async (brandId: string): Promise<SentimentSnapshot | null> => {
  try {
    const all = JSON.parse(
      await fs.readFile(path.join(SENTIMENT_DIR, `${brandId}-snapshots.json`), 'utf-8'),
    ) as SentimentSnapshot[];
    return all[all.length - 1] ?? null;
  } catch {
    return null;
  }
};

export const getSentimentTrend = async (brandId: string, days = 30): Promise<SentimentSnapshot[]> => {
  try {
    const all = JSON.parse(
      await fs.readFile(path.join(SENTIMENT_DIR, `${brandId}-snapshots.json`), 'utf-8'),
    ) as SentimentSnapshot[];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return all.filter((s) => new Date(s.timestamp).getTime() >= cutoff);
  } catch {
    return [];
  }
};

export const buildSentimentEnrichment = async (brandId: string): Promise<string> => {
  const snap = await getLatestSnapshot(brandId);
  if (!snap) return '';
  const parts: string[] = ['[SENTIMENT AUDIENCIA — últimos 7 días]'];
  parts.push(
    `Mood overall: ${snap.overallScore.toFixed(2)} (trend ${snap.trendVsLastWindow > 0 ? '+' : ''}${snap.trendVsLastWindow.toFixed(2)})`,
  );
  parts.push(
    `Distribution: ${Object.entries(snap.distribution)
      .map(([k, v]) => `${k}=${(v * 100).toFixed(0)}%`)
      .join(' | ')}`,
  );
  if (snap.moodKeywords.positive.length)
    parts.push(`Palabras + : ${snap.moodKeywords.positive.slice(0, 5).join(', ')}`);
  if (snap.moodKeywords.negative.length)
    parts.push(`Palabras - : ${snap.moodKeywords.negative.slice(0, 5).join(', ')}`);
  if (snap.earlyWarningSignals.length) parts.push(`⚠️ Warnings: ${snap.earlyWarningSignals.join('; ')}`);
  if (snap.crisisRiskScore > 0.6) parts.push(`🚨 CRISIS RISK: ${(snap.crisisRiskScore * 100).toFixed(0)}%`);
  parts.push('[FIN SENTIMENT]');
  return parts.join('\n');
};
