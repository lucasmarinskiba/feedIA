// @ts-nocheck
/**
 * Content Sensor — Analiza contenido existente y detecta patrones
 * Evalúa engagement, identifica qué funcionó y qué no
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as graph from '../memory/knowledgeGraph.js';

export interface ContentPattern {
  pattern: string;
  type: 'hook' | 'format' | 'visual' | 'timing' | 'topic' | 'ctoa';
  engagement: number;
  reach: number;
  samples: number;
  confidence: number;
  niche: string;
}

export const analyzeContent = async (
  content: string,
  metrics: { likes: number; comments: number; shares: number; saves: number; reach: number },
  niche: string,
): Promise<ContentPattern[]> => {
  const engagement =
    metrics?.reach > 0
      ? ((metrics?.likes ?? 0) +
          (metrics?.comments ?? 0) * 3 +
          (metrics?.shares ?? 0) * 5 +
          (metrics?.saves ?? 0) * 4) /
        (metrics?.reach ?? 1)
      : 0;

  const patterns: ContentPattern[] = [];

  // Detect hook pattern
  const hookMatch = content.match(/^(.*?)[.?¿!]/);
  if (hookMatch && hookMatch[1]) {
    patterns.push({
      pattern: hookMatch[1].trim(),
      type: 'hook',
      engagement,
      reach: metrics.reach,
      samples: 1,
      confidence: Math.min(1, engagement * 2),
      niche,
    });
  }

  // Detect format
  const formatType = detectFormat(content);
  if (formatType) {
    patterns.push({
      pattern: formatType,
      type: 'format',
      engagement,
      reach: metrics.reach,
      samples: 1,
      confidence: Math.min(1, engagement * 2),
      niche,
    });
  }

  // Detect CTA
  const cta = detectCTA(content);
  if (cta) {
    patterns.push({
      pattern: cta,
      type: 'ctoa',
      engagement,
      reach: metrics.reach,
      samples: 1,
      confidence: Math.min(1, engagement * 2),
      niche,
    });
  }

  // Store learnings
  for (const p of patterns) {
    await semantic.storeMemory(
      `Patrón ${p.type}: "${p.pattern}" → engagement ${(p.engagement * 100).toFixed(1)}%`,
      'learning',
      { patternType: p.type, niche, engagement: p.engagement },
      p.confidence,
    );
    graph.addTriple(niche, `usa patrón ${p.type}`, p.pattern, p.confidence, 'content-analysis');
  }

  log.info(
    `[ContentSensor] Analyzed content, ${patterns.length} patterns found (eng=${(engagement * 100).toFixed(1)}%)`,
  );
  return patterns;
};

const detectFormat = (content: string): string | null => {
  if (content.includes('\n') && content.split('\n').length > 3) return 'lista-numerada';
  if (content.includes('🔥') || content.includes('⚡') || content.includes('💡')) return 'emoji-heavy';
  if (content.match(/^\d+\./)) return 'lista-contada';
  if (content.includes('"') || content.includes('\"')) return 'quote-style';
  if (content.match(/\?/g)?.length ?? 0 > 1) return 'preguntas';
  return null;
};

const detectCTA = (content: string): string | null => {
  const ctas = [
    'doble tap',
    'guarda',
    'comparte',
    'comenta',
    'sígueme',
    'link',
    'bio',
    'desliza',
    'swipe',
    'guarda esto',
    'comparte si',
    'tag',
  ];
  const lower = content.toLowerCase();
  for (const cta of ctas) {
    if (lower.includes(cta)) return cta;
  }
  return null;
};

export const getTopPatterns = async (
  niche: string,
  type?: ContentPattern['type'],
  limit = 5,
): Promise<ContentPattern[]> => {
  const results = await semantic.recall(`patrón ${type ?? ''} ${niche}`, 20, ['learning']);
  const patterns: ContentPattern[] = [];

  for (const r of results) {
    const meta = r.entry.metadata as Record<string, unknown>;
    if (meta.niche === niche && (!type || meta.patternType === type)) {
      const content = r.entry.content;
      const pattern = content.match(/"([^"]+)"/)?.[1] ?? content;
      patterns.push({
        pattern,
        type: (meta.patternType as ContentPattern['type']) ?? 'hook',
        engagement: Number(meta.engagement ?? 0),
        reach: 0,
        samples: 1,
        confidence: r.score,
        niche,
      });
    }
  }

  // Aggregate by pattern
  const byPattern = new Map<string, ContentPattern>();
  for (const p of patterns) {
    const existing = byPattern.get(p.pattern);
    if (existing) {
      existing.engagement = (existing.engagement * existing.samples + p.engagement) / (existing.samples + 1);
      existing.samples += 1;
      existing.confidence = Math.max(existing.confidence, p.confidence);
    } else {
      byPattern.set(p.pattern, { ...p });
    }
  }

  return Array.from(byPattern.values())
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, limit);
};
