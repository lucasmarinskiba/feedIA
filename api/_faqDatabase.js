/**
 * FAQ Database serverless — detección + respuesta de preguntas frecuentes.
 *
 * Patrón: extrae Q&A del histórico de DMs/comentarios, agrupa similares,
 * propone respuestas automáticas con personalización.
 *
 * Persistencia: usa _accountMemory.js (MongoDB) en lugar de FS.
 * Port de src/capabilities/community/faqDatabase.ts → serverless.
 */

import { getProfile, saveProfile } from './_accountMemory.js';
import { askLLMJson, askLLM } from './_llm.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

const DEFAULT_FAQ_STORE = {
  entries: [],
  pendingDetections: [],
  lastUpdated: new Date().toISOString(),
};

// ── Similitud (Jaccard simple) ────────────────────────────────────────────────

const tokenize = (text) => {
  const normalized = text
    .toLowerCase()
    .replace(/[¿?¡!.,;:\-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(normalized);
};

const jaccardSimilarity = (a, b) => {
  const setA = tokenize(a);
  const setB = tokenize(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

const findSimilarQuestion = (question, entries, threshold = 0.6) => {
  let best = null;
  let bestScore = threshold;
  for (const entry of entries || []) {
    const score = jaccardSimilarity(question, entry.question);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
};

// ── Carga/Guarda FAQ ──────────────────────────────────────────────────────────

const loadFAQ = async (scope, accountId) => {
  try {
    const profile = await getProfile(scope, accountId);
    return profile?.faqStore || DEFAULT_FAQ_STORE;
  } catch {
    return DEFAULT_FAQ_STORE;
  }
};

const saveFAQ = async (scope, accountId, faqStore) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  await saveProfile(scope, accountId, { ...profile, faqStore });
};

// ── Detección de preguntas frecuentes desde texto ─────────────────────────────

export const detectQuestionFromText = async (text, context = 'dm') => {
  if (!text || text.length < 10) return null;

  const prompt = `Analiza este ${context}. ¿Contiene una pregunta/duda del usuario?
Si sí, devolvé SOLO la pregunta limpia (máx 20 palabras).
Si no, devolvé null.

Texto:
"""
${text}
"""

Respuesta JSON: { "question": "..." | null }`;

  const result = await askLLMJson(prompt, { maxTokens: 100 }).catch(() => null);
  return result?.question || null;
};

// ── Generar respuesta automática con personalización ────────────────────────────

export const generateAnswerForQuestion = async (question, faqEntry, context = {}) => {
  if (!faqEntry) return null;

  const { accountName = 'nuestra marca', tone = 'cercano' } = context;
  const alternativeIdx = Math.floor(Math.random() * (faqEntry.alternativeAnswers?.length || 1));
  const baseAnswer = faqEntry.alternativeAnswers?.[alternativeIdx] || faqEntry.answer;

  // Si la respuesta es simple, devolverla directamente
  if (baseAnswer.length < 150) return baseAnswer;

  // Sino, personalizar con LLM
  const prompt = `Personalizá esta respuesta FAQ para sonar más cercana al contexto.

Pregunta: ${question}
Respuesta base:
"""
${baseAnswer}
"""

Marca: ${accountName}
Tono deseado: ${tone}

Reescribí SOLO la respuesta, mismo largo, sin explicaciones.`;

  const personalized = await askLLM(prompt, { maxTokens: 250 }).catch(() => null);
  return personalized || baseAnswer;
};

// ── Agregar nueva FAQ (después de aprobación manual) ───────────────────────────

export const addFAQEntry = async (scope, accountId, question, answer, options = {}) => {
  const faqStore = await loadFAQ(scope, accountId);
  const { category = 'general', language = 'es', alternativeAnswers = [] } = options;

  const entry = {
    id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    question,
    questionPatterns: [question],
    answer,
    category,
    language,
    popularity: 1,
    lastAskedAt: new Date().toISOString(),
    approvedByHuman: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    alternativeAnswers,
    tags: options.tags || [],
  };

  faqStore.entries = [...(faqStore.entries || []), entry];
  await saveFAQ(scope, accountId, faqStore);

  return entry;
};

// ── Detectar nueva pregunta (agregar a pendientes) ───────────────────────────

export const detectAndTrackQuestion = async (scope, accountId, question, examples = []) => {
  const faqStore = await loadFAQ(scope, accountId);
  const similar = findSimilarQuestion(question, faqStore.entries);

  if (similar) {
    // Si ya existe, incrementar popularidad
    similar.popularity = (similar.popularity || 0) + 1;
    similar.lastAskedAt = new Date().toISOString();
    await saveFAQ(scope, accountId, faqStore);
    return { status: 'matched-existing', entry: similar };
  }

  // Si no existe, agregar a pendientes para revisión humana
  const pending = faqStore.pendingDetections || [];
  const existingPending = pending.find((p) => jaccardSimilarity(p.detectedQuestion, question) > 0.7);

  if (existingPending) {
    existingPending.occurrences = (existingPending.occurrences || 0) + 1;
    existingPending.lastSeenAt = new Date().toISOString();
    if (examples.length > 0 && (!existingPending.examples || existingPending.examples.length < 5)) {
      existingPending.examples = [...(existingPending.examples || []), ...examples].slice(0, 5);
    }
  } else {
    pending.push({
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      detectedQuestion: question,
      occurrences: 1,
      examples: examples.slice(0, 5),
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
  }

  faqStore.pendingDetections = pending;
  await saveFAQ(scope, accountId, faqStore);

  return { status: 'pending-review', pendingId: existingPending?.id || pending[pending.length - 1]?.id };
};

// ── Aprobar/rechazar pregunta pendiente ───────────────────────────────────────

export const approvePendingQuestion = async (scope, accountId, pendingId, answer, options = {}) => {
  const faqStore = await loadFAQ(scope, accountId);
  const pending = (faqStore.pendingDetections || []).find((p) => p.id === pendingId);

  if (!pending) return { ok: false, error: 'pending-not-found' };

  // Mover de pendientes a entries
  const entry = await addFAQEntry(scope, accountId, pending.detectedQuestion, answer, options);

  // Remover de pendientes
  faqStore.pendingDetections = (faqStore.pendingDetections || []).filter((p) => p.id !== pendingId);
  await saveFAQ(scope, accountId, faqStore);

  return { ok: true, entry };
};

export const rejectPendingQuestion = async (scope, accountId, pendingId) => {
  const faqStore = await loadFAQ(scope, accountId);
  faqStore.pendingDetections = (faqStore.pendingDetections || []).filter((p) => p.id !== pendingId);
  await saveFAQ(scope, accountId, faqStore);
  return { ok: true };
};

// ── Búsqueda de FAQ ───────────────────────────────────────────────────────────

export const searchFAQ = async (scope, accountId, query, limit = 5) => {
  const faqStore = await loadFAQ(scope, accountId);
  const entries = faqStore.entries || [];

  const scored = entries.map((entry) => ({
    entry,
    score: jaccardSimilarity(query, entry.question),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.entry);
};

// ── Estadísticas ──────────────────────────────────────────────────────────────

export const getFAQStats = async (scope, accountId) => {
  const faqStore = await loadFAQ(scope, accountId);
  const entries = faqStore.entries || [];
  const pending = faqStore.pendingDetections || [];

  return {
    totalEntries: entries.length,
    totalPending: pending.length,
    mostPopular: entries.sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 5),
    byCategory: entries.reduce((acc, e) => {
      acc[e.category || 'general'] = (acc[e.category || 'general'] || 0) + 1;
      return acc;
    }, {}),
    pendingHighestOccurrences: pending.sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0)).slice(0, 3),
  };
};

// ── HTTP handler ──────────────────────────────────────────────────────────────

export const handleFAQDatabase = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  // GET /api/faq/search?query=...
  if (path === '/api/faq/search' && m === 'GET') {
    const q = req.query?.query || '';
    const accountId = req.query?.accountId || scope;
    if (!q) return json(400, { ok: false, error: 'missing query' });
    const results = await searchFAQ(scope, accountId, q, 10).catch(() => []);
    return json(200, { ok: true, results });
  }

  // POST /api/faq/detect
  if (path === '/api/faq/detect' && m === 'POST') {
    const { text, context } = body || {};
    if (!text) return json(400, { ok: false, error: 'missing text' });
    const question = await detectQuestionFromText(text, context || 'dm').catch(() => null);
    if (!question) return json(200, { ok: true, detected: false });
    const accountId = body.accountId || scope;
    const result = await detectAndTrackQuestion(scope, accountId, question, [text]).catch(() => null);
    return json(200, { ok: true, detected: true, question, ...result });
  }

  // POST /api/faq/add
  if (path === '/api/faq/add' && m === 'POST') {
    const { question, answer, category, language, tags, alternativeAnswers } = body || {};
    if (!question || !answer) return json(400, { ok: false, error: 'missing question or answer' });
    const accountId = body.accountId || scope;
    const entry = await addFAQEntry(scope, accountId, question, answer, {
      category,
      language,
      tags,
      alternativeAnswers,
    }).catch(() => null);
    return json(200, { ok: entry ? true : false, entry });
  }

  // GET /api/faq/stats
  if (path === '/api/faq/stats' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const stats = await getFAQStats(scope, accountId).catch(() => ({}));
    return json(200, { ok: true, stats });
  }

  // POST /api/faq/approve-pending
  if (path === '/api/faq/approve-pending' && m === 'POST') {
    const { pendingId, answer, category } = body || {};
    if (!pendingId || !answer) return json(400, { ok: false, error: 'missing pendingId or answer' });
    const accountId = body.accountId || scope;
    const result = await approvePendingQuestion(scope, accountId, pendingId, answer, { category }).catch(() => null);
    return json(result?.ok ? 200 : 400, result);
  }

  return false;
};
