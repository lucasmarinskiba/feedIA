// @ts-nocheck
/**
 * Content Actuator — Genera contenido enriquecido con contexto cerebral
 * Usa predicción viral, reglas causales, y memoria de patrones
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as graph from '../memory/knowledgeGraph.js';
import * as lang from '../memory/languageMemory.js';
import * as causal from '../reasoning/causalEngine.js';
import * as viral from '../reasoning/viralScoring.js';

export interface ContentRequest {
  topic: string;
  niche: string;
  brandName: string;
  format: 'carousel' | 'reel' | 'story' | 'post' | 'caption';
  tone?: string;
  goal?: 'engagement' | 'conversion' | 'awareness' | 'community';
  constraints?: string[];
}

export interface BrainEnrichedContent {
  context: string;
  suggestions: string[];
  predictedScore: number;
  topPatterns: { pattern: string; type: string; confidence: number }[];
  trendingTerms: string[];
  causalRules: string[];
  hookSuggestion: string;
  ctaSuggestion: string;
}

export const generateContent = async (req: ContentRequest): Promise<BrainEnrichedContent> => {
  const { topic, niche, brandName, format, tone, goal, constraints = [] } = req;

  // 1. Recall what works
  const [pastContent, brandKnowledge, topPatterns, trendingTerms, causalRules] = await Promise.all([
    semantic.recall(`${topic} ${format}`, 5, ['post', 'learning']),
    graph.exportAsContext(brandName),
    viral.predictViralPotential(`${topic} test`, niche, format),
    lang.getTrendingTerms(niche, 10),
    causal.whatDoesItCause(format, niche),
  ]);

  // 2. Build enriched context
  const lines: string[] = [
    `=== GENERACIÓN DE CONTENIDO PARA "${brandName}" ===`,
    `Tema: ${topic}`,
    `Nicho: ${niche}`,
    `Formato: ${format}`,
    `Objetivo: ${goal ?? 'engagement'}`,
    `Tono: ${tone ?? 'según marca'}`,
    '',
  ];

  if (brandKnowledge) {
    lines.push('CONOCIMIENTO DE MARCA:');
    lines.push(brandKnowledge);
    lines.push('');
  }

  if (pastContent.length > 0) {
    lines.push('CONTENIDO SIMILAR ANTERIOR:');
    for (const p of pastContent.slice(0, 3)) {
      lines.push(`  - ${p.entry.content.slice(0, 120)} (score=${p.score.toFixed(2)})`);
    }
    lines.push('');
  }

  // 3. Viral suggestions
  lines.push('ANÁLISIS VIRAL:');
  lines.push(`  Score predicho: ${(topPatterns.score * 100).toFixed(0)}%`);
  for (const [k, v] of Object.entries(topPatterns.breakdown)) {
    lines.push(`  - ${k}: ${(v * 100).toFixed(0)}%`);
  }
  lines.push('');

  // 4. Causal rules
  const relevantRules = causalRules.slice(0, 5);
  if (relevantRules.length > 0) {
    lines.push('REGLAS CAUSALES APLICABLES:');
    for (const r of relevantRules) {
      const arrow = r.typicalDelta > 0 ? '↑' : '↓';
      lines.push(`  - ${r.cause} → ${r.effect} ${arrow}${Math.abs(r.typicalDelta).toFixed(0)}%`);
    }
    lines.push('');
  }

  // 5. Trending terms
  if (trendingTerms.length > 0) {
    lines.push('TÉRMINOS TRENDING:');
    lines.push(`  ${trendingTerms.map((t) => t.term).join(', ')}`);
    lines.push('');
  }

  // 6. Constraints
  lines.push('RESTRICCIONES:');
  lines.push(`  - Formato: ${format}`);
  lines.push(`  - Objetivo: ${goal ?? 'engagement'}`);
  for (const c of constraints) lines.push(`  - ${c}`);
  lines.push('');

  // 7. Suggestions
  const suggestions: string[] = [
    ...topPatterns.suggestions,
    ...relevantRules
      .slice(0, 3)
      .map((r) => `Aplicar: ${r.cause} (efecto típico ${r.typicalDelta > 0 ? '+' : ''}${r.typicalDelta.toFixed(0)}%)`),
  ];

  // 8. Hook and CTA suggestions
  const hookSuggestion = generateHook(topic, niche, trendingTerms?.[0]?.term);
  const ctaSuggestion = generateCTA(goal ?? 'engagement', format);

  return {
    context: lines.join('\n'),
    suggestions: [...new Set(suggestions)],
    predictedScore: topPatterns.score,
    topPatterns: pastContent.slice(0, 3).map((p) => ({
      pattern: p.entry.content.slice(0, 60),
      type: String(p.entry.metadata.patternType ?? 'general'),
      confidence: p.score,
    })),
    trendingTerms: trendingTerms.map((t) => t.term),
    causalRules: relevantRules.map((r) => `${r.cause} → ${r.effect}`),
    hookSuggestion,
    ctaSuggestion,
  };
};

const generateHook = (topic: string, niche: string, trendingTerm?: string): string => {
  const hooks = [
    `El secreto que nadie te cuenta sobre ${topic}...`,
    `¿Por qué el 90% falla en ${topic}?`,
    `3 cosas que cambiarán tu ${topic} para siempre`,
    `Me tomó 5 años entender esto sobre ${topic}`,
    trendingTerm
      ? `Si usas "${trendingTerm}" en ${topic}, esto te pasa:`
      : `Lo que realmente funciona en ${topic} (spoiler: no es lo que crees)`,
    `Stop. Antes de seguir con ${topic}, lee esto.`,
    `La verdad incómoda sobre ${topic}`,
  ];
  // Pick based on niche preference (could use bandit here)
  const idx = Math.abs(topic.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % (hooks?.length ?? 1);
  return hooks?.[idx] ?? '';
};

const generateCTA = (goal: string, format: string): string => {
  const ctas: Record<string, string[]> = {
    engagement: ['Doble tap si te resonó 💖', 'Guarda para después 📌', 'Comenta tu opinión 👇'],
    conversion: ['Link en bio 🛒', 'DM "INFO" para saber más 💬', 'Desliza para ver todo 👉'],
    awareness: ['Sígueme para más tips ✨', 'Comparte con alguien que lo necesite 🔄'],
    community: ['Etiqueta a tu squad 👥', 'Comenta tu experiencia 👇'],
  };
  const list = ctas[goal] ?? ctas.engagement;
  const idx = Math.abs(format.charCodeAt(0)) % (list?.length ?? 1);
  return list?.[idx] ?? '';
};

// Store generated content
export const storeContent = async (
  content: string,
  request: ContentRequest,
  metrics?: { likes: number; comments: number; shares: number },
): Promise<void> => {
  await semantic.storeMemory(
    content,
    'post',
    {
      topic: request.topic,
      niche: request.niche,
      format: request.format,
      goal: request.goal,
      ...(metrics ? { engagement: metrics.likes + metrics.comments * 3 + metrics.shares * 5 } : {}),
    },
    metrics ? 0.7 + Math.min(0.3, metrics.likes / 1000) : 0.5,
  );

  log.info(`[ContentActuator] Stored ${request.format} content for ${request.niche}`);
};
