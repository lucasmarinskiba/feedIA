/**
 * FAQ Database de FeedIA — banco de preguntas frecuentes que aprende del histórico.
 *
 * Reemplaza al CM que responde las mismas preguntas todos los días. Detecta patrones
 * en los DMs/comentarios, genera entradas FAQ, y propone respuestas semi-automáticas
 * con personalización al contexto.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson, ask as routerAsk } from '../../agent/tokenRouter.js';
import { listConversations } from './dmInbox.js';
import type { BrandProfile } from '../../config/types.js';

const FAQ_PATH = join(process.cwd(), 'data', 'community', 'faq.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface FAQEntry {
  id: string;
  question: string;
  questionPatterns: string[]; // variaciones similares aprendidas
  answer: string;
  category:
    | 'producto'
    | 'precio'
    | 'envío'
    | 'devoluciones'
    | 'soporte'
    | 'horarios'
    | 'método-pago'
    | 'política'
    | 'general';
  language: string;
  popularity: number; // veces que se respondió esta FAQ
  lastAskedAt: string;
  approvedByHuman: boolean;
  createdAt: string;
  updatedAt: string;
  alternativeAnswers: string[]; // variaciones del template para evitar repetición
  tags: string[];
}

interface FAQStore {
  version: number;
  entries: FAQEntry[];
  pendingDetections: PendingPattern[];
  lastUpdated: string;
}

interface PendingPattern {
  id: string;
  detectedQuestion: string;
  occurrences: number;
  examples: string[]; // hasta 5 ejemplos textuales
  firstSeenAt: string;
  lastSeenAt: string;
}

const DEFAULT_STORE: FAQStore = {
  version: 1,
  entries: [],
  pendingDetections: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'community');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadFAQ = (): FAQStore => {
  try {
    ensureDir();
    if (!existsSync(FAQ_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(FAQ_PATH, 'utf8')) as FAQStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveFAQ = (store: FAQStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(FAQ_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Similitud entre preguntas (simple jaccard) ───────────────────────────────

const tokenize = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .replace(/[¿?¡!.,;:]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );

const jaccardSimilarity = (a: string, b: string): number => {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  const intersection = new Set([...ta].filter((t) => tb.has(t)));
  const union = new Set([...ta, ...tb]);
  return intersection.size / union.size;
};

// ── CRUD básico ───────────────────────────────────────────────────────────────

export interface CreateFAQInput {
  question: string;
  answer: string;
  category: FAQEntry['category'];
  language?: string;
  patterns?: string[];
  approvedByHuman?: boolean;
}

export const createFAQ = (input: CreateFAQInput): FAQEntry => {
  const store = loadFAQ();
  const entry: FAQEntry = {
    id: `faq-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    question: input.question,
    questionPatterns: input.patterns ?? [input.question],
    answer: input.answer,
    category: input.category,
    language: input.language ?? 'es',
    popularity: 0,
    lastAskedAt: new Date().toISOString(),
    approvedByHuman: input.approvedByHuman ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    alternativeAnswers: [],
    tags: [input.category],
  };
  store.entries.push(entry);
  saveFAQ(store);
  log.info(`[FAQDatabase] FAQ creada: "${input.question.slice(0, 50)}..." (${input.category})`);
  return entry;
};

// ── Match: buscar FAQ que coincida con una pregunta ──────────────────────────

export interface FAQMatch {
  entry: FAQEntry;
  similarity: number;
  matchedPattern: string;
}

export const findMatchingFAQ = (question: string, minSimilarity = 0.5): FAQMatch | null => {
  const store = loadFAQ();
  let best: FAQMatch | null = null;

  for (const entry of store.entries) {
    if (!entry.approvedByHuman) continue;
    for (const pattern of entry.questionPatterns) {
      const sim = jaccardSimilarity(question, pattern);
      if (sim >= minSimilarity && (!best || sim > best.similarity)) {
        best = { entry, similarity: sim, matchedPattern: pattern };
      }
    }
  }

  return best;
};

// ── Generar respuesta personalizada usando la FAQ ────────────────────────────

export const generateContextualAnswer = async (
  faqEntry: FAQEntry,
  userQuestion: string,
  conversationContext: string,
  brand: BrandProfile,
): Promise<string> => {
  const prompt = `Personalizá esta respuesta FAQ para el contexto específico del cliente, manteniendo la voz de marca.

FAQ APROBADA:
Pregunta original: ${faqEntry.question}
Respuesta canónica: ${faqEntry.answer}
Categoría: ${faqEntry.category}

PREGUNTA REAL DEL CLIENTE:
"${userQuestion}"

CONTEXTO DE CONVERSACIÓN:
${conversationContext}

VOZ DE MARCA: ${brand.voice.tone.join(', ')}

Adaptá la respuesta para que:
- Suene natural (no copy-paste literal)
- Use el tono de marca
- Responda exactamente lo que el cliente preguntó
- Máximo 280 caracteres
- Si la respuesta canónica no cubre algo de lo que pregunta, decilo

Respondé SOLO con el mensaje a enviar, sin prefijos ni explicaciones.`;

  const result = await routerAsk(prompt, { taskType: 'response', maxTokens: 400 });

  // Registrar uso (popularity++)
  const store = loadFAQ();
  const entry = store.entries.find((e) => e.id === faqEntry.id);
  if (entry) {
    entry.popularity++;
    entry.lastAskedAt = new Date().toISOString();
    entry.alternativeAnswers.push(result.text.trim());
    if (entry.alternativeAnswers.length > 10) entry.alternativeAnswers.shift();
    saveFAQ(store);
  }

  return result.text.trim();
};

// ── Detección automática de FAQs nuevas (mining del histórico) ──────────────

export const detectFAQPatterns = async (brand: BrandProfile): Promise<PendingPattern[]> => {
  log.info('[FAQDatabase] Detectando patrones de FAQ desde el histórico de DMs...');
  const conversations = listConversations({});
  if (conversations.length < 20) {
    log.warn('[FAQDatabase] Poco histórico para detectar patrones (<20 conversaciones)');
    return [];
  }

  // Tomar primeros mensajes de cada conversación (los que abrieron tema)
  const firstMessages = conversations
    .slice(0, 200)
    .map((c) => c.messages.find((m) => m.sender === 'them')?.text)
    .filter((t): t is string => typeof t === 'string' && t.length > 10 && t.length < 500);

  if (firstMessages.length < 15) return [];

  const sample = firstMessages
    .slice(0, 80)
    .map((m, i) => `${i + 1}. "${m}"`)
    .join('\n');

  const prompt = `Analizá estos primeros mensajes de DM y detectá las 5-10 preguntas frecuentes recurrentes (patrones que aparecen en múltiples mensajes con variaciones).

MENSAJES:
${sample}

MARCA: @${brand.name} (${brand.niche})

JSON:
{
  "patterns": [
    {
      "canonicalQuestion": "la pregunta normalizada",
      "occurrences": número estimado de veces que aparece,
      "examples": ["ejemplo 1 textual", "ejemplo 2", "ejemplo 3"],
      "suggestedCategory": "producto | precio | envío | devoluciones | soporte | horarios | método-pago | política | general"
    }
  ]
}`;

  const result = await routerAskJson<{
    patterns: Array<{
      canonicalQuestion: string;
      occurrences: number;
      examples: string[];
      suggestedCategory: FAQEntry['category'];
    }>;
  }>(prompt, {
    taskType: 'analysis',
    maxTokens: 3000,
    systemPrompt: 'Sos analista de patrones conversacionales. Identificás preguntas frecuentes con precisión.',
  });

  const store = loadFAQ();
  const newPatterns: PendingPattern[] = [];

  for (const p of result.patterns ?? []) {
    // Skip si ya existe una FAQ similar
    const existing = findMatchingFAQ(p.canonicalQuestion, 0.6);
    if (existing) continue;

    const alreadyDetected = store.pendingDetections.find(
      (pd) => jaccardSimilarity(pd.detectedQuestion, p.canonicalQuestion) >= 0.6,
    );
    if (alreadyDetected) {
      alreadyDetected.occurrences = Math.max(alreadyDetected.occurrences, p.occurrences);
      alreadyDetected.lastSeenAt = new Date().toISOString();
      alreadyDetected.examples = [...new Set([...alreadyDetected.examples, ...p.examples])].slice(0, 5);
      continue;
    }

    const pattern: PendingPattern = {
      id: `pattern-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      detectedQuestion: p.canonicalQuestion,
      occurrences: p.occurrences,
      examples: p.examples.slice(0, 5),
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    store.pendingDetections.push(pattern);
    newPatterns.push(pattern);
  }

  saveFAQ(store);
  log.info(
    `[FAQDatabase] ${newPatterns.length} patrones nuevos detectados, ${store.pendingDetections.length} pendientes de aprobación total`,
  );
  return newPatterns;
};

// ── Promover un pattern a FAQ (con respuesta generada por IA + validación humana) ──

export const proposeFAQFromPattern = async (
  patternId: string,
  brand: BrandProfile,
): Promise<{
  draftEntry: Omit<FAQEntry, 'id' | 'createdAt' | 'updatedAt' | 'popularity' | 'lastAskedAt' | 'alternativeAnswers'>;
  pattern: PendingPattern | null;
}> => {
  const store = loadFAQ();
  const pattern = store.pendingDetections.find((p) => p.id === patternId);
  if (!pattern) return { draftEntry: null as never, pattern: null };

  const prompt = `Generá la respuesta canónica para esta FAQ recurrente.

PREGUNTA DETECTADA: "${pattern.detectedQuestion}"
EJEMPLOS DE CÓMO LA HACEN: ${pattern.examples.map((e) => `"${e}"`).join(' | ')}
OCURRENCIAS DETECTADAS: ${pattern.occurrences}

MARCA: ${brand.name}
NICHO: ${brand.niche}
TONO: ${brand.voice.tone.join(', ')}

La respuesta debe:
- Ser clara y directa
- Resolver completamente la duda en 1 mensaje
- Si requiere info específica (precios, horarios), dejar marcado con placeholder [DATO]
- Máximo 280 caracteres

JSON:
{
  "answer": "respuesta canónica",
  "suggestedCategory": "producto | precio | envío | devoluciones | soporte | horarios | método-pago | política | general",
  "questionVariations": ["variación 1 de la pregunta", "variación 2", "variación 3"]
}`;

  const result = await routerAskJson<{
    answer: string;
    suggestedCategory: FAQEntry['category'];
    questionVariations: string[];
  }>(prompt, {
    taskType: 'response',
    maxTokens: 800,
    systemPrompt: 'Sos un especialista en customer support. Tus respuestas son claras y resolutivas.',
  });

  const draftEntry: Omit<
    FAQEntry,
    'id' | 'createdAt' | 'updatedAt' | 'popularity' | 'lastAskedAt' | 'alternativeAnswers'
  > = {
    question: pattern.detectedQuestion,
    questionPatterns: [pattern.detectedQuestion, ...result.questionVariations].slice(0, 6),
    answer: result.answer,
    category: result.suggestedCategory,
    language: 'es',
    approvedByHuman: false, // Pendiente de validación humana
    tags: [result.suggestedCategory, 'auto-detected'],
  };

  return { draftEntry, pattern };
};

export const approveAndAddFAQ = (
  draft: Omit<FAQEntry, 'id' | 'createdAt' | 'updatedAt' | 'popularity' | 'lastAskedAt' | 'alternativeAnswers'>,
  patternId?: string,
): FAQEntry => {
  const entry = createFAQ({
    question: draft.question,
    answer: draft.answer,
    category: draft.category,
    language: draft.language,
    patterns: draft.questionPatterns,
    approvedByHuman: true,
  });

  // Remover el pattern pendiente
  if (patternId) {
    const store = loadFAQ();
    store.pendingDetections = store.pendingDetections.filter((p) => p.id !== patternId);
    saveFAQ(store);
  }

  return entry;
};

// ── Consultas y vistas ───────────────────────────────────────────────────────

export const listFAQs = (filters: { category?: FAQEntry['category']; minPopularity?: number } = {}): FAQEntry[] => {
  let entries = loadFAQ().entries;
  if (filters.category) entries = entries.filter((e) => e.category === filters.category);
  if (filters.minPopularity) entries = entries.filter((e) => e.popularity >= filters.minPopularity!);
  return entries.sort((a, b) => b.popularity - a.popularity);
};

export const getFAQ = (faqId: string): FAQEntry | null => loadFAQ().entries.find((e) => e.id === faqId) ?? null;

export const updateFAQ = (faqId: string, updates: Partial<FAQEntry>): FAQEntry | null => {
  const store = loadFAQ();
  const entry = store.entries.find((e) => e.id === faqId);
  if (!entry) return null;
  Object.assign(entry, updates, { updatedAt: new Date().toISOString() });
  saveFAQ(store);
  return entry;
};

export const deleteFAQ = (faqId: string): boolean => {
  const store = loadFAQ();
  const before = store.entries.length;
  store.entries = store.entries.filter((e) => e.id !== faqId);
  saveFAQ(store);
  return store.entries.length < before;
};

export const listPendingPatterns = (): PendingPattern[] =>
  loadFAQ().pendingDetections.sort((a, b) => b.occurrences - a.occurrences);

export const getFAQSnapshot = (): {
  totalFAQs: number;
  approvedFAQs: number;
  pendingPatterns: number;
  byCategory: Record<string, number>;
  mostUsed: FAQEntry[];
  recentlyAdded: FAQEntry[];
} => {
  const store = loadFAQ();
  const byCategory: Record<string, number> = {};
  for (const e of store.entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
  }
  const sorted = [...store.entries].sort((a, b) => b.popularity - a.popularity);
  const byDate = [...store.entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    totalFAQs: store.entries.length,
    approvedFAQs: store.entries.filter((e) => e.approvedByHuman).length,
    pendingPatterns: store.pendingDetections.length,
    byCategory,
    mostUsed: sorted.slice(0, 5),
    recentlyAdded: byDate.slice(0, 5),
  };
};

// ── Try-to-answer pipeline ────────────────────────────────────────────────────

export interface AutoAnswerResult {
  matched: boolean;
  faqId?: string;
  answer?: string;
  confidence: number;
  needsHumanReview: boolean;
  reason: string;
}

export const tryAnswerWithFAQ = async (
  userQuestion: string,
  conversationContext: string,
  brand: BrandProfile,
  options: { minConfidence?: number } = {},
): Promise<AutoAnswerResult> => {
  const minConfidence = options.minConfidence ?? 0.65;
  const match = findMatchingFAQ(userQuestion, minConfidence);

  if (!match) {
    return {
      matched: false,
      confidence: 0,
      needsHumanReview: false,
      reason: 'No hay FAQ que coincida con esta pregunta',
    };
  }

  const answer = await generateContextualAnswer(match.entry, userQuestion, conversationContext, brand);

  return {
    matched: true,
    faqId: match.entry.id,
    answer,
    confidence: match.similarity,
    needsHumanReview: match.similarity < 0.75,
    reason: `Match FAQ (similarity ${match.similarity.toFixed(2)}, pattern: "${match.matchedPattern.slice(0, 50)}")`,
  };
};

export const exportFAQ = (): FAQStore => loadFAQ();
