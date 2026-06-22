/**
 * Dream Engine — Procesamiento nocturno creativo
 * Cuando "duerme", el cerebro conecta ideas aparentemente no relacionadas,
 * genera insights, encuentra patrones ocultos, y propone experimentos.
 * Es la creatividad artificial del cerebro.
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as graph from '../memory/knowledgeGraph.js';

export interface DreamInsight {
  id: string;
  sourceConcepts: string[];
  insight: string;
  confidence: number;
  suggestedAction: string;
  generatedAt: string;
}

// ── Main dream cycle ───────────────────────────────────────────────────────

export const dream = async (niche: string): Promise<DreamInsight[]> => {
  const insights: DreamInsight[] = [];

  // 1. Connect unrelated memories
  const recentMemories = await semantic.recallRecent(72, ['post', 'learning', 'trend']);
  if (recentMemories.length >= 3) {
    const first = recentMemories[0];
    const second = recentMemories[1];
    if (first && second) {
      const combo = `${first.content.slice(0, 40)} + ${second.content.slice(0, 40)}`;
      insights.push({
        id: `dream-${Date.now()}-1`,
        sourceConcepts: [first.content.slice(0, 30), second.content.slice(0, 30)],
        insight: `Conexión emergente: ${combo}`,
        confidence: 0.4,
        suggestedAction: `Crear contenido que combine ambos conceptos`,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Find weakly connected entities in graph
  const entities = Array.from(
    new Set(
      recentMemories.flatMap((m) => {
        const words = m.content.match(/\b[A-Z][a-z]+\b/g) ?? [];
        return words.slice(0, 3);
      }),
    ),
  );

  for (let i = 0; i < Math.min(entities.length, 3); i++) {
    for (let j = i + 1; j < Math.min(entities.length, 3); j++) {
      const e1 = entities[i];
      const e2 = entities[j];
      if (!e1 || !e2) continue;
      const paths = graph.findPath(e1, e2, 2);
      if (paths.length === 0) {
        insights.push({
          id: `dream-${Date.now()}-${i}-${j}`,
          sourceConcepts: [e1, e2],
          insight: `"${e1}" y "${e2}" no están conectados en el grafo — oportunidad de crear contenido puente`,
          confidence: 0.5,
          suggestedAction: `Crear post que conecte ${e1} con ${e2}`,
          generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // 3. Detect recurring themes in episodic memory
  const recentEpisodes = episodic.recallLastDays(7);
  const themes = new Map<string, number>();
  for (const ep of recentEpisodes) {
    for (const tag of ep.tags) themes.set(tag, (themes.get(tag) ?? 0) + 1);
  }
  const topThemes = Array.from(themes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (topThemes.length >= 2) {
    insights.push({
      id: `dream-${Date.now()}-theme`,
      sourceConcepts: topThemes.map((t) => t[0]),
      insight: `Temas recurrentes esta semana: ${topThemes.map((t) => t[0]).join(', ')}`,
      confidence: 0.7,
      suggestedAction: `Crear serie de contenido sobre estos temas interconectados`,
      generatedAt: new Date().toISOString(),
    });
  }

  // 4. Suggest experiments from low-confidence areas
  const lowConfidence = await semantic.recall(niche, 5, ['learning']);
  const weakRules = lowConfidence.filter((r) => r.entry.importance < 0.4);
  if (weakRules.length > 0) {
    insights.push({
      id: `dream-${Date.now()}-experiment`,
      sourceConcepts: weakRules.map((r) => r.entry.content.slice(0, 30)),
      insight: `Reglas débiles detectadas: ${weakRules.length} áreas necesitan más datos`,
      confidence: 0.6,
      suggestedAction: `Diseñar experimentos A/B para fortalecer estas reglas`,
      generatedAt: new Date().toISOString(),
    });
  }

  // Store insights
  for (const insight of insights) {
    await semantic.storeMemory(
      `DREAM: ${insight.insight} → ${insight.suggestedAction}`,
      'learning',
      { dream: true, concepts: insight.sourceConcepts },
      insight.confidence,
    );
  }

  log.info(`[DreamEngine] ${insights.length} insights generated for ${niche}`);
  return insights;
};

// ── Get recent dreams ──────────────────────────────────────────────────────

export const getRecentDreams = async (hours = 24): Promise<DreamInsight[]> => {
  const recent = await semantic.recall('DREAM:', 10, ['learning']);
  return recent
    .filter((r) => r.entry.metadata && (r.entry.metadata as Record<string, unknown>).dream === true)
    .map((r) => ({
      id: r.entry.id,
      sourceConcepts: ((r.entry.metadata as Record<string, unknown>).concepts as string[]) ?? [],
      insight: r.entry.content.replace('DREAM: ', ''),
      confidence: r.entry.importance,
      suggestedAction: 'Ver memoria semántica',
      generatedAt: r.entry.timestamp,
    }));
};
