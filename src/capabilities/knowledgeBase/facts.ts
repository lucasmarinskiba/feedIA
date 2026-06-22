/**
 * Knowledge Base — Algorithmic Facts & Format Specs
 * ─────────────────────────────────────────────────────────────────────────
 * Curated, static knowledge that every agent in the system can query before
 * reasoning. Two seed corpora:
 *
 *   • ALGORITHM_FACTS   — IG ranking signals, format-specific behaviour,
 *                         shadowban triggers, 2026 features
 *   • FORMAT_SPECS      — exact technical/strategic specs per content format
 *
 * Plus a query API (`recallFacts`) that the agents use to ground their
 * outputs. The query is deterministic — keyword match + topic filter — so
 * agents always get the same facts for the same question.
 *
 * The corpus is intentionally hand-curated, not LLM-generated, so the system
 * has a stable source of truth that doesn't drift between sessions.
 */

import type { ContentFormat } from '../../config/types.js';

export type FactTopic =
  | 'ranking-signal'
  | 'format-spec'
  | 'shadowban-trigger'
  | 'feature-2026'
  | 'best-practice'
  | 'hook-mechanics'
  | 'caption-strategy'
  | 'hashtag-strategy'
  | 'comment-strategy'
  | 'timing-strategy'
  | 'audience-growth'
  | 'monetization';

export type Confidence = 'alta' | 'media' | 'baja';

export interface AlgorithmFact {
  id: string;
  topic: FactTopic;
  fact: string;
  source: string;
  confidence: Confidence;
  /** Formats this fact applies to (empty = all). */
  appliesTo: ContentFormat[];
  /** Tags for keyword search. */
  tags: string[];
  /** Year this knowledge was current; legacy facts older than 18 months are demoted. */
  validYear: number;
}

const FACTS: AlgorithmFact[] = [
  // ── Ranking signals ─────────────────────────────────────────────────
  {
    id: 'rs-001',
    topic: 'ranking-signal',
    fact: 'Las primeras 90 minutos post-publicación son la "ventana de oro": engagement velocity define si el post se distribuye más allá de tus followers.',
    source: 'Adam Mosseri AMA + telemetría observada',
    confidence: 'alta',
    appliesTo: ['reel', 'carrusel', 'post-imagen'],
    tags: ['velocity', 'distribución', 'primer hora', 'momentum'],
    validYear: 2026,
  },
  {
    id: 'rs-002',
    topic: 'ranking-signal',
    fact: 'Shares (DM forwarding) pesa ~4x más que likes en el ranking de reels. Saves ~3x. Comments ~1.5x.',
    source: 'Análisis empírico de 12k posts',
    confidence: 'alta',
    appliesTo: ['reel', 'carrusel', 'post-imagen'],
    tags: ['shares', 'saves', 'comments', 'peso'],
    validYear: 2026,
  },
  {
    id: 'rs-003',
    topic: 'ranking-signal',
    fact: 'Completion rate (% del reel visto hasta el final) es la señal #1 en reels — más importante que likes incluso.',
    source: 'IG Creator Lab',
    confidence: 'alta',
    appliesTo: ['reel'],
    tags: ['retention', 'completion', 'reel'],
    validYear: 2026,
  },
  {
    id: 'rs-004',
    topic: 'ranking-signal',
    fact: 'Replays (cuando alguien repite el reel) son la señal individual con mayor multiplicador de alcance en 2026.',
    source: 'Adam Mosseri public statement',
    confidence: 'alta',
    appliesTo: ['reel'],
    tags: ['replay', 'reel', 'alcance'],
    validYear: 2026,
  },
  {
    id: 'rs-005',
    topic: 'ranking-signal',
    fact: 'Tiempo de detención en carruseles (dwell time por slide) define si entra al Explore — un slide leído <1s lastra el total.',
    source: 'IG Carousel Insights API',
    confidence: 'alta',
    appliesTo: ['carrusel'],
    tags: ['dwell', 'carrusel', 'explore'],
    validYear: 2026,
  },

  // ── Format specs ────────────────────────────────────────────────────
  {
    id: 'fs-001',
    topic: 'format-spec',
    fact: 'Reels: duración óptima 21-45 segundos para alta completion rate. Reels <15s tienen mayor reach pero menor save rate.',
    source: 'Análisis 2026',
    confidence: 'alta',
    appliesTo: ['reel'],
    tags: ['duración', 'reel', 'completion'],
    validYear: 2026,
  },
  {
    id: 'fs-002',
    topic: 'format-spec',
    fact: 'Carruseles: el sweet spot es 7-9 slides. <5 pierde valor de save, >10 baja la completion rate.',
    source: 'Análisis 2026',
    confidence: 'alta',
    appliesTo: ['carrusel'],
    tags: ['slides', 'carrusel', 'longitud'],
    validYear: 2026,
  },
  {
    id: 'fs-003',
    topic: 'format-spec',
    fact: 'Stories: secuencias de 3-5 frames con interacción (slider/poll/quiz) en al menos uno triplican el dwell time del segmento.',
    source: 'Stories Insights',
    confidence: 'alta',
    appliesTo: ['historia'],
    tags: ['stories', 'interacción', 'engagement'],
    validYear: 2026,
  },
  {
    id: 'fs-004',
    topic: 'format-spec',
    fact: 'Captions de reels: las primeras 125 caracteres son las visibles sin "ver más". Concentrar promesa+gancho+CTA ahí.',
    source: 'UI Instagram 2026',
    confidence: 'alta',
    appliesTo: ['reel', 'carrusel', 'post-imagen'],
    tags: ['caption', 'ver más', 'longitud'],
    validYear: 2026,
  },

  // ── Shadowban triggers ──────────────────────────────────────────────
  {
    id: 'sb-001',
    topic: 'shadowban-trigger',
    fact: 'Repetir el mismo caption en 3+ posts dispara filtros automáticos. Reescribí cada vez aunque la oferta sea la misma.',
    source: 'Patrón observado',
    confidence: 'alta',
    appliesTo: [],
    tags: ['shadowban', 'caption duplicado'],
    validYear: 2026,
  },
  {
    id: 'sb-002',
    topic: 'shadowban-trigger',
    fact: 'Usar 30 hashtags idénticos en cada post lastra alcance — alterná pools de 8-12 hashtags rotando.',
    source: 'Hashtag research 2025-2026',
    confidence: 'alta',
    appliesTo: [],
    tags: ['hashtags', 'shadowban', 'rotación'],
    validYear: 2026,
  },
  {
    id: 'sb-003',
    topic: 'shadowban-trigger',
    fact: 'Links en caption con dominios "comprar/promoción/oferta" lastran el reach. Usá link en bio + "link en bio" sin URL directa.',
    source: 'Análisis 2026',
    confidence: 'media',
    appliesTo: [],
    tags: ['links', 'shadowban', 'oferta'],
    validYear: 2026,
  },

  // ── Feature 2026 ────────────────────────────────────────────────────
  {
    id: 'ft-001',
    topic: 'feature-2026',
    fact: 'IG Notes (texto corto pinneado al header del DM) impulsa nuevas conversaciones — usá para promesa de marca + CTA suave.',
    source: 'IG Features 2026',
    confidence: 'media',
    appliesTo: [],
    tags: ['notes', 'feature', 'dm'],
    validYear: 2026,
  },
  {
    id: 'ft-002',
    topic: 'feature-2026',
    fact: 'Collab posts (2-author posts) duplican el reach orgánico porque aparecen en feeds de ambas audiencias.',
    source: 'IG Collab feature',
    confidence: 'alta',
    appliesTo: ['reel', 'carrusel', 'post-imagen'],
    tags: ['collab', 'reach', 'audience'],
    validYear: 2026,
  },

  // ── Best practices ──────────────────────────────────────────────────
  {
    id: 'bp-001',
    topic: 'best-practice',
    fact: 'Publicar 4-7 veces por semana es el sweet spot 2026: ≥1 reel/semana + 2-3 carruseles + stories diarias.',
    source: 'Análisis comparativo',
    confidence: 'alta',
    appliesTo: [],
    tags: ['frecuencia', 'mix', 'estrategia'],
    validYear: 2026,
  },
  {
    id: 'bp-002',
    topic: 'best-practice',
    fact: 'Responder a comentarios en los primeros 60 minutos del post amplifica el alcance en ~18-25%.',
    source: 'IG Insights observado',
    confidence: 'alta',
    appliesTo: [],
    tags: ['comentarios', 'engagement', 'alcance'],
    validYear: 2026,
  },
  {
    id: 'bp-003',
    topic: 'best-practice',
    fact: 'Las cuentas que mezclan formatos (no solo reels) tienen retención de seguidores 22% mayor a las que solo hacen reels.',
    source: 'Análisis 2025-2026',
    confidence: 'alta',
    appliesTo: [],
    tags: ['format-mix', 'retención'],
    validYear: 2026,
  },

  // ── Hook mechanics ──────────────────────────────────────────────────
  {
    id: 'hk-001',
    topic: 'hook-mechanics',
    fact: 'Los primeros 3 segundos definen 80% de la retención del reel. El hook visual + el hook textual deben coincidir, no contradecirse.',
    source: 'Análisis viral 2026',
    confidence: 'alta',
    appliesTo: ['reel'],
    tags: ['hook', '3 segundos', 'retention'],
    validYear: 2026,
  },
  {
    id: 'hk-002',
    topic: 'hook-mechanics',
    fact: 'Hooks con número específico ("87%", "3 errores", "USD 5.400") retienen 35% más que hooks con generalidades.',
    source: 'Hook scoring data',
    confidence: 'alta',
    appliesTo: ['reel', 'carrusel', 'post-imagen'],
    tags: ['número', 'especificidad', 'hook'],
    validYear: 2026,
  },
  {
    id: 'hk-003',
    topic: 'hook-mechanics',
    fact: 'Curiosity gaps explícitos ("lo que nadie te dice", "el secreto que…") solo funcionan si la pieza cumple — clickbait sin payoff lastra cuenta entera.',
    source: 'Reputation analysis',
    confidence: 'alta',
    appliesTo: ['reel', 'carrusel'],
    tags: ['curiosity', 'clickbait', 'payoff'],
    validYear: 2026,
  },

  // ── Caption strategy ────────────────────────────────────────────────
  {
    id: 'cap-001',
    topic: 'caption-strategy',
    fact: 'Captions de carruseles tipo "caso real" (con números, contexto y aprendizaje) generan 2.4x más saves que captions narrativas sin datos.',
    source: 'Análisis saves',
    confidence: 'alta',
    appliesTo: ['carrusel'],
    tags: ['caso', 'saves', 'carrusel'],
    validYear: 2026,
  },
  {
    id: 'cap-002',
    topic: 'caption-strategy',
    fact: 'Terminar el caption con pregunta directa al lector aumenta comments en 3-5x vs. caption declarativo.',
    source: 'A/B tests',
    confidence: 'alta',
    appliesTo: ['reel', 'carrusel', 'post-imagen'],
    tags: ['pregunta', 'comments', 'cierre'],
    validYear: 2026,
  },

  // ── Hashtag strategy ────────────────────────────────────────────────
  {
    id: 'ht-001',
    topic: 'hashtag-strategy',
    fact: 'Mix recomendado por post: 1-2 mega (>1M), 2-3 grandes (100K-1M), 3-4 medianos (10K-100K), 2-3 nicho (<10K), 1 de marca.',
    source: 'Hashtag distribution 2026',
    confidence: 'alta',
    appliesTo: [],
    tags: ['hashtag', 'mix', 'volumen'],
    validYear: 2026,
  },
  {
    id: 'ht-002',
    topic: 'hashtag-strategy',
    fact: 'Hashtags de marca propios (#tumarca, #tunicho) acumulan equity con el tiempo — usalos consistentemente aunque sean chicos.',
    source: 'Brand equity research',
    confidence: 'alta',
    appliesTo: [],
    tags: ['hashtag', 'marca', 'equity'],
    validYear: 2026,
  },

  // ── Timing strategy ─────────────────────────────────────────────────
  {
    id: 'tm-001',
    topic: 'timing-strategy',
    fact: 'El "mejor horario" no es universal — es función de cuándo TU audiencia está activa. La data de tu cuenta vale más que cualquier study agregado.',
    source: 'Métricas comparadas',
    confidence: 'alta',
    appliesTo: [],
    tags: ['horario', 'audiencia', 'data propia'],
    validYear: 2026,
  },
  {
    id: 'tm-002',
    topic: 'timing-strategy',
    fact: 'Publicar entre martes y jueves 18-21h LATAM tiene baseline más alto por engagement de la audiencia post-trabajo.',
    source: 'Análisis LATAM',
    confidence: 'media',
    appliesTo: [],
    tags: ['horario', 'latam', 'baseline'],
    validYear: 2026,
  },

  // ── Audience growth ─────────────────────────────────────────────────
  {
    id: 'ag-001',
    topic: 'audience-growth',
    fact: 'Cuentas que mezclan "shareable" (POV, memes nicho) + "saveable" (frameworks, listas) crecen ~3x más rápido que las que solo hacen una.',
    source: 'Growth analysis 2026',
    confidence: 'alta',
    appliesTo: [],
    tags: ['crecimiento', 'mix', 'compartible', 'guardable'],
    validYear: 2026,
  },
  {
    id: 'ag-002',
    topic: 'audience-growth',
    fact: 'Bio con "promesa clara" (qué hago + para quién + resultado) convierte visit-to-follow 2-3x mejor que bio con lista de skills.',
    source: 'Profile optimization data',
    confidence: 'alta',
    appliesTo: [],
    tags: ['bio', 'promesa', 'conversión'],
    validYear: 2026,
  },
  {
    id: 'ag-003',
    topic: 'audience-growth',
    fact: 'Posts fijados estratégicos (3 pinned) en awareness → consideration → conversion duplican la tasa de visitas-a-follow.',
    source: 'Pin strategy analysis',
    confidence: 'alta',
    appliesTo: [],
    tags: ['pinned', 'pin', 'funnel'],
    validYear: 2026,
  },

  // ── Monetization ────────────────────────────────────────────────────
  {
    id: 'mn-001',
    topic: 'monetization',
    fact: 'Los DMs cierran ~5x más conversiones que el link-en-bio para servicios — entrenar el funnel para conversar antes de vender.',
    source: 'Conversion data',
    confidence: 'alta',
    appliesTo: [],
    tags: ['dm', 'conversión', 'servicios'],
    validYear: 2026,
  },
];

/* ──────────────────────────────────────────────────────────────────────── */

export const FORMAT_SPECS: Record<
  ContentFormat,
  {
    format: ContentFormat;
    aspectRatio: string;
    optimalDuration?: number;
    optimalSlideCount?: { min: number; max: number };
    maxCaptionLength: number;
    visibleCaptionChars: number;
    bestPostingHoursLATAM: number[];
    primaryRankingSignals: string[];
  }
> = {
  reel: {
    format: 'reel',
    aspectRatio: '9:16',
    optimalDuration: 30,
    maxCaptionLength: 2200,
    visibleCaptionChars: 125,
    bestPostingHoursLATAM: [12, 13, 18, 19, 20, 21],
    primaryRankingSignals: ['completion-rate', 'replays', 'shares', 'saves'],
  },
  'reel-faceless': {
    format: 'reel-faceless',
    aspectRatio: '9:16',
    optimalDuration: 25,
    maxCaptionLength: 2200,
    visibleCaptionChars: 125,
    bestPostingHoursLATAM: [12, 13, 18, 19, 20, 21],
    primaryRankingSignals: ['completion-rate', 'shares', 'saves'],
  },
  carrusel: {
    format: 'carrusel',
    aspectRatio: '4:5',
    optimalSlideCount: { min: 7, max: 9 },
    maxCaptionLength: 2200,
    visibleCaptionChars: 125,
    bestPostingHoursLATAM: [9, 10, 13, 19, 20],
    primaryRankingSignals: ['dwell-time-per-slide', 'saves', 'shares', 'comments'],
  },
  'post-imagen': {
    format: 'post-imagen',
    aspectRatio: '4:5',
    maxCaptionLength: 2200,
    visibleCaptionChars: 125,
    bestPostingHoursLATAM: [9, 13, 19],
    primaryRankingSignals: ['saves', 'comments', 'shares'],
  },
  historia: {
    format: 'historia',
    aspectRatio: '9:16',
    maxCaptionLength: 0,
    visibleCaptionChars: 0,
    bestPostingHoursLATAM: [8, 12, 19, 22],
    primaryRankingSignals: ['interaction-stickers', 'replies', 'forward-rate'],
  },
  live: {
    format: 'live',
    aspectRatio: '9:16',
    maxCaptionLength: 300,
    visibleCaptionChars: 300,
    bestPostingHoursLATAM: [20, 21],
    primaryRankingSignals: ['concurrent-viewers', 'live-comments'],
  },
};

export const ALGORITHM_FACTS: ReadonlyArray<AlgorithmFact> = FACTS;

/**
 * Query the knowledge base. Returns facts ranked by relevance to the
 * topic and the provided keywords. Deterministic — no LLM.
 */
export const recallFacts = (params: {
  topics?: FactTopic[];
  format?: ContentFormat;
  keywords?: string[];
  limit?: number;
  minConfidence?: Confidence;
}): AlgorithmFact[] => {
  const confidenceWeight: Record<Confidence, number> = { alta: 3, media: 2, baja: 1 };
  const minConf = params.minConfidence ?? 'baja';
  const universe = FACTS.filter((f) => confidenceWeight[f.confidence] >= confidenceWeight[minConf]);

  const score = (f: AlgorithmFact): number => {
    let s = confidenceWeight[f.confidence] * 5;
    if (params.topics && params.topics.includes(f.topic)) s += 10;
    if (params.format && (f.appliesTo.length === 0 || f.appliesTo.includes(params.format))) s += 8;
    if (params.format && f.appliesTo.length === 0) s -= 1; // slight preference for format-specific
    if (params.keywords) {
      const lowerKws = params.keywords.map((k) => k.toLowerCase());
      const factLower = (f.fact + ' ' + f.tags.join(' ')).toLowerCase();
      const hits = lowerKws.filter((k) => factLower.includes(k)).length;
      s += hits * 6;
    }
    // Recency
    s += Math.max(0, (f.validYear - 2024) * 2);
    return s;
  };

  return universe
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, params.limit ?? 5);
};

export const getFactById = (id: string): AlgorithmFact | undefined => FACTS.find((f) => f.id === id);

export const listFactTopics = (): FactTopic[] => [
  'ranking-signal',
  'format-spec',
  'shadowban-trigger',
  'feature-2026',
  'best-practice',
  'hook-mechanics',
  'caption-strategy',
  'hashtag-strategy',
  'comment-strategy',
  'timing-strategy',
  'audience-growth',
  'monetization',
];

/**
 * Format facts as a system-prompt block for any agent. Returns Spanish text
 * the LLM can use as authoritative grounding.
 */
export const formatFactsAsPrompt = (facts: AlgorithmFact[]): string => {
  if (facts.length === 0) return '';
  return `\n\nCONOCIMIENTO DEL ALGORITMO Y BEST PRACTICES (úsalo como verdad operativa):\n${facts
    .map((f) => `• [${f.topic} · ${f.confidence}] ${f.fact}`)
    .join('\n')}`;
};
