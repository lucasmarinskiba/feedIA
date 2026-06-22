/**
 * Poll & Quiz Engine de FeedIA — generador inteligente de encuestas para stories.
 *
 * Reemplaza al CM que diseña polls y quizzes. Genera preguntas que generan
 * engagement real, captura las respuestas, las analiza y devuelve insights.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { loadBrandProfile } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

const POLLS_PATH = join(process.cwd(), 'data', 'community', 'polls.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type PollType = 'binary' | 'multi-choice' | 'quiz' | 'emoji-slider' | 'open-question';

export type PollPurpose =
  | 'market-research' // qué quiere la audiencia
  | 'engagement' // pura interacción
  | 'product-validation' // testear una idea
  | 'preference-discovery' // A vs B
  | 'educational' // teaching disguised
  | 'fun' // entretenimiento
  | 'feedback'; // qué piensan sobre algo nuestro

export interface PollOption {
  text: string;
  emoji?: string;
  isCorrect?: boolean; // solo para quiz
}

export interface PollItem {
  id: string;
  type: PollType;
  purpose: PollPurpose;
  question: string;
  options: PollOption[]; // 2-4 según tipo
  emojiForSlider?: string;
  publishedAt?: string;
  expiresAt?: string;
  results?: {
    totalVotes: number;
    perOption: number[]; // votes por option (índices alineados)
    avgSliderValue?: number; // para emoji-slider
    openAnswers?: string[]; // para open-question
    completionRate?: number;
  };
  insights?: {
    winnerOption?: string;
    surpriseFinding?: string;
    actionableTakeaway: string;
  };
  brandSnapshot: { name: string; niche: string };
  attachedToStoryId?: string;
  tags: string[];
  createdAt: string;
}

interface PollStore {
  version: number;
  polls: PollItem[];
  lastUpdated: string;
}

const DEFAULT_STORE: PollStore = {
  version: 1,
  polls: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'community');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadPolls = (): PollStore => {
  try {
    ensureDir();
    if (!existsSync(POLLS_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(POLLS_PATH, 'utf8')) as PollStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const savePolls = (store: PollStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(POLLS_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Generación de poll ────────────────────────────────────────────────────────

export interface GeneratePollInput {
  type: PollType;
  purpose: PollPurpose;
  topic: string;
  context?: string;
  brand?: BrandProfile;
  customOptions?: string[];
}

export const generatePoll = async (input: GeneratePollInput): Promise<PollItem> => {
  const brand = input.brand ?? loadBrandProfile();

  const typeInstructions: Record<PollType, string> = {
    binary: 'Pregunta con 2 opciones binarias (sí/no o A/B). Las opciones deben ser opuestas y claras.',
    'multi-choice': 'Pregunta con 3-4 opciones que cubran el espacio de respuestas reales (no falsas dicotomías).',
    quiz: 'Pregunta con 2-4 opciones donde UNA es correcta. La pregunta debe enseñar algo útil del nicho.',
    'emoji-slider': 'Pregunta que pide medir intensidad de algo. Sin opciones, solo emoji + frase.',
    'open-question': 'Pregunta abierta que invite respuesta de 1-2 líneas. Sin opciones.',
  };

  const purposeContext: Record<PollPurpose, string> = {
    'market-research': 'Querés aprender qué necesita/quiere la audiencia. Pregunta lo que NO sabés ya.',
    engagement: 'Pura interacción. La pregunta tiene que ser divertida o relatable, no comercial.',
    'product-validation':
      'Querés validar una idea de producto/servicio antes de invertir. Especificá la idea claramente.',
    'preference-discovery': 'Querés saber qué prefieren entre 2-3 opciones para tomar una decisión.',
    educational: 'Querés enseñar algo. El quiz debe tener una respuesta correcta + explicación.',
    fun: 'Entretenimiento puro. Sin agenda comercial.',
    feedback: 'Pedir opinión sobre algo nuestro (post reciente, propuesta, cambio).',
  };

  const prompt = `Generá un poll/quiz inteligente para una story de Instagram.

MARCA: ${brand.name} | NICHO: ${brand.niche}
AUDIENCIA: ${brand.audience.description}
TONO: ${brand.voice.tone.join(', ')}

TIPO: ${input.type}
INSTRUCCIÓN PARA EL TIPO: ${typeInstructions[input.type]}

PROPÓSITO: ${input.purpose}
CONTEXTO DEL PROPÓSITO: ${purposeContext[input.purpose]}

TEMA: ${input.topic}
${input.context ? `CONTEXTO ADICIONAL: ${input.context}` : ''}
${input.customOptions ? `OPCIONES PROPUESTAS: ${input.customOptions.join(' | ')}` : ''}

Reglas:
- Pregunta MAX 60 caracteres (legible en story)
- Opciones MAX 25 caracteres c/u
- Sin signos !! ni emojis decorativos en exceso
- Que invite a interactuar, no abrumadora
- Si es quiz, la respuesta correcta debe ser sorprendente o útil (no obvia)

JSON:
{
  "question": "la pregunta exacta",
  "options": [
    { "text": "opción 1", "emoji": "opcional", "isCorrect": false }
  ],
  "emojiForSlider": "para emoji-slider, qué emoji usar",
  "expectedInsight": "qué esperamos aprender de las respuestas"
}`;

  const result = await routerAskJson<{
    question: string;
    options: PollOption[];
    emojiForSlider?: string;
    expectedInsight: string;
  }>(prompt, {
    taskType: 'creative',
    maxTokens: 800,
    systemPrompt: 'Sos creative director de stories. Tus polls generan interacción real y revelan información útil.',
  });

  const poll: PollItem = {
    id: `poll-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    type: input.type,
    purpose: input.purpose,
    question: result.question,
    options: result.options ?? [],
    emojiForSlider: result.emojiForSlider,
    brandSnapshot: { name: brand.name, niche: brand.niche },
    tags: [input.purpose, input.type],
    createdAt: new Date().toISOString(),
  };

  const store = loadPolls();
  store.polls.push(poll);
  if (store.polls.length > 500) store.polls = store.polls.slice(-500);
  savePolls(store);

  log.info(`[PollQuizEngine] Poll generado: "${result.question}" (${input.type}, ${input.purpose})`);
  return poll;
};

// ── Registrar resultados (después de que se cerró el poll) ───────────────────

export const recordPollResults = (pollId: string, results: NonNullable<PollItem['results']>): PollItem | null => {
  const store = loadPolls();
  const poll = store.polls.find((p) => p.id === pollId);
  if (!poll) return null;

  poll.results = results;
  savePolls(store);
  return poll;
};

// ── Análisis post-poll: extraer insights ─────────────────────────────────────

export const analyzePollResults = async (pollId: string): Promise<PollItem | null> => {
  const store = loadPolls();
  const poll = store.polls.find((p) => p.id === pollId);
  if (!poll || !poll.results) return null;

  const optionsWithVotes = poll.options
    .map((o, i) => `${o.text}: ${poll.results?.perOption[i] ?? 0} votos`)
    .join(' | ');
  const winnerIdx =
    (poll.results.perOption ?? []).map((v, i) => ({ idx: i, v })).sort((a, b) => b.v - a.v)[0]?.idx ?? 0;
  const winnerOption = poll.options[winnerIdx]?.text;

  const prompt = `Analizá los resultados de este poll y extraé insights accionables.

PREGUNTA: ${poll.question}
TIPO: ${poll.type}
PROPÓSITO: ${poll.purpose}
RESULTADOS: ${optionsWithVotes}
TOTAL VOTOS: ${poll.results.totalVotes}
${poll.results.openAnswers ? `RESPUESTAS ABIERTAS: ${poll.results.openAnswers.slice(0, 10).join(' | ')}` : ''}

JSON:
{
  "winnerOption": "${winnerOption}",
  "surpriseFinding": "algo no esperado (si lo hay, sino null)",
  "actionableTakeaway": "1 acción concreta que la marca puede tomar a partir de este resultado"
}`;

  const insights = await routerAskJson<NonNullable<PollItem['insights']>>(prompt, {
    taskType: 'analysis',
    maxTokens: 600,
    freeOnly: true,
  });

  poll.insights = insights;
  savePolls(store);
  return poll;
};

// ── Plantillas de polls ganadores (banco) ────────────────────────────────────

export const POLL_TEMPLATES = [
  {
    type: 'binary' as PollType,
    purpose: 'preference-discovery' as PollPurpose,
    topic: 'Carrusel vs Reel para enseñar',
  },
  { type: 'binary' as PollType, purpose: 'engagement' as PollPurpose, topic: 'Mañana o noche para publicar' },
  {
    type: 'multi-choice' as PollType,
    purpose: 'market-research' as PollPurpose,
    topic: 'Qué tema querés que profundice',
  },
  { type: 'quiz' as PollType, purpose: 'educational' as PollPurpose, topic: 'Mito sobre el nicho' },
  {
    type: 'emoji-slider' as PollType,
    purpose: 'feedback' as PollPurpose,
    topic: 'Qué tan útil te pareció el último post',
  },
  {
    type: 'open-question' as PollType,
    purpose: 'market-research' as PollPurpose,
    topic: 'Cuál es tu mayor frustración con [tema]',
  },
  { type: 'binary' as PollType, purpose: 'fun' as PollPurpose, topic: 'Team café vs team mate' },
  {
    type: 'multi-choice' as PollType,
    purpose: 'product-validation' as PollPurpose,
    topic: 'Cuál de estos formatos te interesa más',
  },
];

export const suggestPollFromContext = async (context: string, brand?: BrandProfile): Promise<PollItem> => {
  const b = brand ?? loadBrandProfile();

  // Elegir un template apropiado según el contexto
  const prompt = `Dado este contexto, recomendá qué tipo de poll/quiz hacer y sobre qué tema.

CONTEXTO: ${context}
NICHO: ${b.niche}

JSON:
{
  "recommendedType": "binary | multi-choice | quiz | emoji-slider | open-question",
  "recommendedPurpose": "market-research | engagement | product-validation | preference-discovery | educational | fun | feedback",
  "specificTopic": "el tema concreto a usar"
}`;

  const suggestion = await routerAskJson<{
    recommendedType: PollType;
    recommendedPurpose: PollPurpose;
    specificTopic: string;
  }>(prompt, { taskType: 'creative', maxTokens: 400, freeOnly: true });

  return generatePoll({
    type: suggestion.recommendedType,
    purpose: suggestion.recommendedPurpose,
    topic: suggestion.specificTopic,
    brand: b,
    context,
  });
};

// ── Consultas ────────────────────────────────────────────────────────────────

export const listPolls = (
  filters: { type?: PollType; purpose?: PollPurpose; hasResults?: boolean } = {},
): PollItem[] => {
  let polls = loadPolls().polls;
  if (filters.type) polls = polls.filter((p) => p.type === filters.type);
  if (filters.purpose) polls = polls.filter((p) => p.purpose === filters.purpose);
  if (filters.hasResults) polls = polls.filter((p) => Boolean(p.results));
  return polls.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getPoll = (pollId: string): PollItem | null => loadPolls().polls.find((p) => p.id === pollId) ?? null;

export const getPollSnapshot = (): {
  total: number;
  byPurpose: Record<string, number>;
  byType: Record<string, number>;
  withResults: number;
  avgVotesPerPoll: number;
  topInsights: Array<{ pollId: string; takeaway: string }>;
} => {
  const polls = loadPolls().polls;
  const byPurpose: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalVotes = 0;
  let countWithResults = 0;

  for (const p of polls) {
    byPurpose[p.purpose] = (byPurpose[p.purpose] ?? 0) + 1;
    byType[p.type] = (byType[p.type] ?? 0) + 1;
    if (p.results) {
      countWithResults++;
      totalVotes += p.results.totalVotes;
    }
  }

  return {
    total: polls.length,
    byPurpose,
    byType,
    withResults: countWithResults,
    avgVotesPerPoll: countWithResults > 0 ? totalVotes / countWithResults : 0,
    topInsights: polls
      .filter((p) => p.insights?.actionableTakeaway)
      .slice(-10)
      .map((p) => ({ pollId: p.id, takeaway: p.insights!.actionableTakeaway })),
  };
};

export const exportPolls = (): PollStore => loadPolls();
