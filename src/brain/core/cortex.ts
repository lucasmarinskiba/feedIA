// @ts-nocheck
/**
 * Cortex — Cerebro central de FeedIA
 * Orquesta las 4 capas: Sensores → Memoria → Razonamiento → Actuadores
 * Proporciona la API unificada para todo el sistema
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as graph from '../memory/knowledgeGraph.js';
import * as episodic from '../memory/episodicMemory.js';
import * as lang from '../memory/languageMemory.js';

export interface BrainInput {
  type: 'message' | 'post' | 'trend' | 'insight' | 'feedback' | 'decision' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  importance?: number;
  entity?: string;
  tags?: string[];
}

export interface BrainRecall {
  semantic: { entry: semantic.MemoryEntry; score: number }[];
  relatedEntities: string[];
  episodes: episodic.Episode[];
  language: lang.LanguageTerm[];
  context: string;
}

// ── Ingesta ────────────────────────────────────────────────────────────────

export const ingest = async (input: BrainInput): Promise<void> => {
  const { type, content, metadata, importance = 0.5, entity, tags = [] } = input;

  // 1. Semantic memory
  const sourceMap: Record<BrainInput['type'], semantic.MemoryEntry['source']> = {
    message: 'conversation',
    post: 'post',
    trend: 'trend',
    insight: 'learning',
    feedback: 'learning',
    decision: 'decision',
    system: 'learning',
  };
  const entry = await semantic.storeMemory(content, sourceMap[type], metadata, importance);

  // 2. Episodic
  episodic.recordEpisode(type, content, {
    tags: [...tags, type],
    emotion: type === 'feedback' ? 'positive' : type === 'system' ? 'neutral' : undefined,
    ...(metadata?.who ? { who: String(metadata.who) } : {}),
    ...(metadata?.outcome ? { outcome: String(metadata.outcome) } : {}),
  });

  // 3. Knowledge graph
  if (entity) {
    graph.addTriple(entity, 'tiene', type, 0.7, 'system');
    if (metadata?.topic) graph.addTriple(entity, 'relacionado con', String(metadata.topic), 0.6, 'system');
  }

  // 4. Language
  if (type === 'message' || type === 'post') {
    const slangMatches = content.match(/\b\w{2,12}\b/g) ?? [];
    for (const word of [...new Set(slangMatches)].slice(0, 3)) {
      if (word.length >= 3 && !isCommonWord(word)) {
        lang.recordTerm({
          term: word,
          type: 'slang',
          meaning: 'detected in content',
          niche: (metadata?.niche as string) ?? 'general',
          confidence: 0.3,
          examples: [content.slice(0, 100)],
          status: 'emerging',
        });
      }
    }
  }

  log.info(`[Cortex] Ingested ${type}: ${content.slice(0, 60)}... (id=${entry.id})`);
};

// ── Recall ─────────────────────────────────────────────────────────────────

export const recall = async (query: string, entity?: string, niche?: string): Promise<BrainRecall> => {
  const [semanticResults, episodes, language] = await Promise.all([
    semantic.recall(query, 5),
    episodic.searchEpisodes(query).slice(0, 5),
    niche
      ? lang.getTrendingTerms(niche, 5)
      : lang.suggestModernPhrases(5).map((t) => ({ term: t }) as lang.LanguageTerm),
  ]);

  const relatedEntities = entity ? graph.getRelatedEntities(entity, 1) : [];

  // Build context string
  const ctxLines: string[] = [];
  if (semanticResults.length > 0) {
    ctxLines.push('MEMORIA SEMÁNTICA:');
    for (const r of semanticResults)
      ctxLines.push(`  - ${r.entry.content.slice(0, 120)} (score: ${r.score.toFixed(2)})`);
  }
  if (episodes.length > 0) {
    ctxLines.push('\nEVENTOS RECIENTES:');
    for (const e of episodes) ctxLines.push(`  - ${e.date} ${e.event}: ${e.what.slice(0, 100)}`);
  }
  if (relatedEntities.length > 0) {
    ctxLines.push(`\nENTIDADES RELACIONADAS CON "${entity}": ${relatedEntities.join(', ')}`);
  }
  if (language.length > 0) {
    ctxLines.push('\nTÉRMINOS DE LENGUAJE:');
    for (const t of language) ctxLines.push(`  - ${t.term} (${t.type})${t.meaning ? ': ' + t.meaning : ''}`);
  }

  const context = ctxLines.join('\n');
  return { semantic: semanticResults, relatedEntities, episodes, language, context };
};

// ── Perfil evolutivo ───────────────────────────────────────────────────────

export const buildPersonalityContext = async (niche: string, brandName: string): Promise<string> => {
  const [episodes, graphContext, langContext] = await Promise.all([
    episodic.summarizePeriod(30),
    graph.exportAsContext(brandName),
    lang.getLanguageContext(niche),
  ]);

  const lines: string[] = [
    `=== CONTEXTO EVOLUTIVO DE "${brandName}" ===`,
    '',
    graphContext || 'Sin conocimiento previo.',
    '',
    langContext || 'Sin términos de lenguaje registrados.',
    '',
    `ÚLTIMOS 30 DÍAS: ${episodes.total} eventos`,
    `  Positivos: ${episodes.byEmotion.positive ?? 0}`,
    `  Negativos: ${episodes.byEmotion.negative ?? 0}`,
    '',
  ];

  if (episodes.highlights.length > 0) {
    lines.push('HIGHLIGHTS:');
    for (const h of episodes.highlights.slice(0, 5)) lines.push(`  - ${h}`);
  }

  return lines.join('\n');
};

// ── Helpers ────────────────────────────────────────────────────────────────

const isCommonWord = (word: string): boolean => {
  const common = new Set([
    'el',
    'la',
    'los',
    'las',
    'un',
    'una',
    'unos',
    'unas',
    'de',
    'del',
    'al',
    'por',
    'para',
    'con',
    'sin',
    'que',
    'qué',
    'como',
    'cómo',
    'cuando',
    'cuándo',
    'donde',
    'dónde',
    'este',
    'esta',
    'esto',
    'ese',
    'esa',
    'eso',
    'aquel',
    'aquella',
    'y',
    'o',
    'pero',
    'aunque',
    'porque',
    'si',
    'no',
    'sí',
    'en',
    'entre',
    'sobre',
    'hasta',
    'desde',
    'hacia',
    'durante',
    'mediante',
    'según',
    'tras',
    'ante',
    'bajo',
    'contra',
    'hasta',
    'más',
    'menos',
    'muy',
    'mucho',
    'poco',
    'todo',
    'todos',
    'nada',
    'alguno',
    'ninguno',
    'cada',
    'otro',
    'mismo',
    'tal',
    'cual',
    'ser',
    'estar',
    'haber',
    'tener',
    'hacer',
    'poder',
    'decir',
    'ir',
    'ver',
    'dar',
    'saber',
    'querer',
    'llegar',
    'pasar',
    'deber',
    'poner',
    'parecer',
    'quedar',
    'creer',
    'hablar',
    'llevar',
    'dejar',
    'seguir',
    'encontrar',
    'llamar',
    'venir',
    'pensar',
    'salir',
    'volver',
    'tomar',
    'conocer',
    'vivir',
    'sentir',
    'tratar',
    'mirar',
    'contar',
    'empezar',
    'esperar',
    'buscar',
    'existir',
    'entrar',
    'trabajar',
    'escribir',
    'perder',
    'producir',
    'ocurrir',
    'entender',
    'leer',
    'cambiar',
    'caer',
    'abrir',
    'considerar',
    'aparecer',
    'incluir',
    'continuar',
    'mantener',
    'recordar',
    'recibir',
    'morir',
    'necesitar',
    'resultar',
    'permitir',
    'afectar',
    'generar',
    'indicar',
    'comenzar',
    'convertir',
    'gustar',
    'crear',
    'jugar',
    'cubrir',
    'alcanzar',
    'sufrir',
    'suponer',
    'evitar',
    'responder',
    'terminar',
    'exigir',
    'obtener',
    'presentar',
    'realizar',
    'conseguir',
    'funcionar',
    'the',
    'and',
    'for',
    'are',
    'but',
    'not',
    'you',
    'all',
    'can',
    'her',
    'was',
    'one',
    'our',
    'out',
    'day',
    'get',
    'has',
    'him',
    'his',
    'how',
    'its',
    'may',
    'new',
    'now',
    'old',
    'see',
    'two',
    'who',
    'boy',
    'did',
    'she',
    'use',
    'her',
    'way',
    'many',
    'oil',
    'sit',
    'set',
    'run',
    'eat',
    'far',
    'sea',
    'eye',
    'ago',
    'off',
    'too',
    'any',
    'say',
    'man',
    'try',
    'ask',
    'end',
    'why',
    'let',
    'put',
    'say',
    'she',
    'try',
    'way',
    'own',
    'say',
    'too',
    'old',
    'tell',
    'very',
    'when',
    'much',
    'would',
    'there',
    'their',
    'what',
    'said',
    'each',
    'which',
    'will',
    'about',
    'could',
    'other',
    'after',
    'first',
    'never',
    'these',
    'think',
    'where',
    'being',
    'every',
    'great',
    'might',
    'shall',
    'still',
    'those',
    'while',
    'this',
    'that',
    'have',
    'from',
    'they',
    'know',
    'want',
    'been',
    'good',
    'much',
    'some',
    'time',
    'than',
    'them',
  ]);
  return common.has(word.toLowerCase());
};

// ── Stats ──────────────────────────────────────────────────────────────────

export const getBrainStats = () => {
  return {
    semantic: semantic.getStats(),
    graph: graph.getStats(),
    episodes: episodic.summarizePeriod(30).total,
    language: lang.getTrendingTerms(undefined, 9999).length,
  };
};
