// @ts-nocheck
/**
 * Trend Sensor — Detecta tendencias virales y nichos emergentes
 * Monitorea hashtags, audios, formatos, challenges
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';

export interface TrendSignal {
  topic: string;
  platform: string;
  signal: number; // 0-1
  evidence: string[];
  firstSeen: string;
  velocity: 'stable' | 'accelerating' | 'exploding' | 'declining';
  related: string[];
  niche: string;
}

export const detectTrend = async (
  topic: string,
  platform: string,
  niche: string,
  evidence: string[],
  signalStrength = 0.5,
): Promise<TrendSignal> => {
  // Recall past mentions
  const past = await semantic.recall(topic, 3, ['trend', 'post', 'learning']);
  const mentions = past?.length ?? 0;

  let velocity: TrendSignal['velocity'] = 'stable';
  if (mentions === 0) velocity = 'stable';
  else if (mentions > 5) velocity = 'exploding';
  else if (mentions > 2) velocity = 'accelerating';

  const signal: TrendSignal = {
    topic,
    platform,
    signal: Math.min(1, signalStrength + mentions * 0.1),
    evidence,
    firstSeen: mentions > 0 && past[0] ? past[0].entry.timestamp : new Date().toISOString(),
    velocity,
    related: past.flatMap((p) => (p.entry.metadata.relatedTopics as string[]) ?? []),
    niche,
  };

  // Store as learning
  await semantic.storeMemory(
    `Tendencia ${velocity}: ${topic} en ${platform} (señal ${signal.signal.toFixed(2)})`,
    'trend',
    { platform, niche, velocity, relatedTopics: signal.related },
    signal.signal * 0.8 + 0.2,
  );

  episodic.recordEpisode('trend-detected', `${topic} on ${platform}`, {
    tags: ['trend', niche, platform],
    emotion: velocity === 'exploding' ? 'positive' : 'neutral',
  });

  log.info(`[TrendSensor] ${velocity.toUpperCase()}: ${topic} (${platform}, score=${signal.signal.toFixed(2)})`);
  return signal;
};

export const getTrendingTopics = async (niche?: string, limit = 10): Promise<TrendSignal[]> => {
  const recent = semantic.recallRecent(168, ['trend']); // 7 days
  const byTopic = new Map<string, TrendSignal>();

  for (const entry of recent) {
    const topic = (entry.metadata.topic as string) ?? entry.content.split(':')[1]?.trim() ?? 'unknown';
    if (!byTopic.has(topic)) {
      byTopic.set(topic, {
        topic,
        platform: (entry.metadata.platform as string) ?? 'unknown',
        signal: entry.importance,
        evidence: [entry.content],
        firstSeen: entry.timestamp,
        velocity: (entry.metadata.velocity as TrendSignal['velocity']) ?? 'stable',
        related: (entry.metadata.relatedTopics as string[]) ?? [],
        niche: (entry.metadata.niche as string) ?? 'general',
      });
    } else {
      const existing = byTopic.get(topic)!;
      existing.signal = Math.max(existing.signal, entry.importance);
      existing.evidence.push(entry.content);
    }
  }

  let signals = Array.from(byTopic.values());
  if (niche) signals = signals.filter((s) => s.niche === niche);
  return signals.sort((a, b) => b.signal - a.signal).slice(0, limit);
};
