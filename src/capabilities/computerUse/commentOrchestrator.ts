/**
 * Comment Orchestrator — gestión y orquestación de comentarios de Instagram.
 *
 * Módulos:
 *  • analyzeComments           — clasifica sentimiento y sugiere acciones via Claude
 *  • generateCommentReplies    — genera planes de respuesta priorizados
 *  • detectCrisis              — detecta crisis de marca en el batch
 *  • generateSeedComments      — genera comentarios semilla para arrancar conversación
 *  • buildCommentResponseLibrary — construye biblioteca reutilizable de respuestas
 *  • shouldPinComment          — lógica pura para determinar si un comentario merece pin
 */

import Anthropic from '@anthropic-ai/sdk';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

// ── Cliente Anthropic ─────────────────────────────────────────────────────────

const client = new Anthropic();

// SDK v0.32 no tipa aún `claude-opus-4-7` ni `adaptive thinking` como literales.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientAny = client as any;

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type CommentSentiment = 'positive' | 'negative' | 'neutral' | 'question' | 'spam';
export type CommentAction = 'reply' | 'like' | 'pin' | 'hide' | 'delete' | 'ignore' | 'escalate';

export interface Comment {
  id: string;
  postId: string;
  username: string;
  text: string;
  timestamp: string;
  likes: number;
  isReply: boolean;
  parentCommentId?: string;
  sentiment?: CommentSentiment;
  action?: CommentAction;
  replyText?: string;
  isInfluencer?: boolean;
  followerCount?: number;
}

export interface CommentBatch {
  postId: string;
  brandId: string;
  comments: Comment[];
  analyzedAt: string;
  summary: {
    total: number;
    positive: number;
    negative: number;
    questions: number;
    spam: number;
    topEngagers: string[];
    sentiment: 'overwhelmingly-positive' | 'positive' | 'mixed' | 'negative' | 'crisis';
    suggestedActions: string[];
  };
}

export interface CommentReplyPlan {
  comment: Comment;
  reply: string;
  action: CommentAction;
  priority: number;
  requiresApproval: boolean;
  rationale: string;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

const parseJsonSafe = <T>(raw: string, fallback: T): T => {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
};

const getTextContent = (content: Array<{ type: string; text?: string }>): string =>
  content.find((b) => b.type === 'text')?.text ?? '';

// ── 1. analyzeComments ────────────────────────────────────────────────────────

export const analyzeComments = async (comments: Comment[], brand: BrandProfile): Promise<CommentBatch> => {
  if (comments.length === 0) {
    log.warn('[CommentOrchestrator] analyzeComments llamado con lista vacía');
    return {
      postId: comments[0]?.postId ?? 'unknown',
      brandId: brand.name,
      comments: [],
      analyzedAt: new Date().toISOString(),
      summary: {
        total: 0,
        positive: 0,
        negative: 0,
        questions: 0,
        spam: 0,
        topEngagers: [],
        sentiment: 'positive',
        suggestedActions: [],
      },
    };
  }

  const postId = comments[0]?.postId ?? 'unknown';
  const tones = brand.voice.tone.join(', ');
  const forbidden = brand.voice.forbidden.length ? brand.voice.forbidden.join(', ') : 'ninguna';

  const commentsForAnalysis = comments.map((c) => ({
    id: c.id,
    username: c.username,
    text: c.text,
    likes: c.likes,
    followerCount: c.followerCount,
    isInfluencer: c.isInfluencer,
  }));

  const systemPrompt = `Sos un experto en community management para marcas argentinas de Instagram.
Analizás comentarios con criterio profesional: detectás preguntas, críticas, spam y oportunidades.
Marca: ${brand.name} (${brand.niche}). Tono: ${tones}. Palabras prohibidas: ${forbidden}.
Respondés SIEMPRE con JSON válido sin markdown.`;

  const userPrompt = `Analizá estos ${comments.length} comentarios de Instagram para la marca ${brand.name}.

Comentarios:
${JSON.stringify(commentsForAnalysis, null, 2)}

Para cada comentario determiná:
- sentiment: "positive" | "negative" | "neutral" | "question" | "spam"
- action: "reply" | "like" | "pin" | "hide" | "delete" | "ignore" | "escalate"

Criterios:
- question: cualquier comentario que pide información o usa "?" → action: "reply"
- negative: críticas, quejas, comentarios dañinos → action: "reply" o "escalate" si es grave
- spam: publicidad, links externos, ofensivo → action: "hide" o "delete"
- positive con muchos likes o de influencer → action: "pin" o "reply"
- neutral sin valor → action: "like" o "ignore"

También calculá el resumen global.

Respondé SOLO con este JSON:
{
  "comments": [
    { "id": "id-del-comentario", "sentiment": "...", "action": "..." }
  ],
  "summary": {
    "positive": 0,
    "negative": 0,
    "questions": 0,
    "spam": 0,
    "topEngagers": ["username1"],
    "sentiment": "positive",
    "suggestedActions": ["Acción sugerida 1", "Acción sugerida 2"]
  }
}`;

  log.info(`[CommentOrchestrator] Analizando ${comments.length} comentarios para "${brand.name}"`);

  try {
    const response = await clientAny.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      thinking: { type: 'adaptive', budget_tokens: 8000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = getTextContent(response.content as Array<{ type: string; text?: string }>);

    interface AnalysisResult {
      comments: Array<{ id: string; sentiment: CommentSentiment; action: CommentAction }>;
      summary: CommentBatch['summary'];
    }

    const parsed = parseJsonSafe<AnalysisResult>(raw, { comments: [], summary: {} as CommentBatch['summary'] });

    // Merge analysis back into original comments
    const analysisMap = new Map(
      (parsed.comments ?? []).map((c) => [c.id, { sentiment: c.sentiment, action: c.action }]),
    );

    const enrichedComments: Comment[] = comments.map((c) => {
      const analysis = analysisMap.get(c.id);
      return {
        ...c,
        sentiment: analysis?.sentiment ?? 'neutral',
        action: analysis?.action ?? 'ignore',
      };
    });

    const summary = parsed.summary ?? {};
    const overallSentiment: CommentBatch['summary']['sentiment'] = (
      ['overwhelmingly-positive', 'positive', 'mixed', 'negative', 'crisis'] as const
    ).includes(summary.sentiment as CommentBatch['summary']['sentiment'])
      ? (summary.sentiment as CommentBatch['summary']['sentiment'])
      : 'mixed';

    log.success(`[CommentOrchestrator] Análisis completado — sentimiento general: ${overallSentiment}`);

    return {
      postId,
      brandId: brand.name,
      comments: enrichedComments,
      analyzedAt: new Date().toISOString(),
      summary: {
        total: comments.length,
        positive: summary.positive ?? 0,
        negative: summary.negative ?? 0,
        questions: summary.questions ?? 0,
        spam: summary.spam ?? 0,
        topEngagers: summary.topEngagers ?? [],
        sentiment: overallSentiment,
        suggestedActions: summary.suggestedActions ?? [],
      },
    };
  } catch (err) {
    log.error(`[CommentOrchestrator] Error en analyzeComments: ${(err as Error).message}`);
    // Graceful fallback: return batch with neutral sentiment and no enrichment
    return {
      postId,
      brandId: brand.name,
      comments,
      analyzedAt: new Date().toISOString(),
      summary: {
        total: comments.length,
        positive: 0,
        negative: 0,
        questions: 0,
        spam: 0,
        topEngagers: [],
        sentiment: 'mixed',
        suggestedActions: ['Revisar comentarios manualmente debido a error en análisis automático'],
      },
    };
  }
};

// ── 2. generateCommentReplies ─────────────────────────────────────────────────

export interface GenerateRepliesOptions {
  mode: 'autopilot' | 'supervised';
  maxReplies?: number;
}

const SENTIMENT_PRIORITY: Record<CommentSentiment, number> = {
  question: 10,
  negative: 8,
  positive: 5,
  neutral: 2,
  spam: 0,
};

export const generateCommentReplies = async (
  batch: CommentBatch,
  brand: BrandProfile,
  options: GenerateRepliesOptions = { mode: 'supervised' },
): Promise<CommentReplyPlan[]> => {
  const { mode, maxReplies = 10 } = options;
  const tones = brand.voice.tone.join(', ');
  const forbidden = brand.voice.forbidden.length ? brand.voice.forbidden.join(', ') : 'ninguna';

  // Sort by priority: influencers first, then by sentiment priority, then by likes
  const actionableComments = batch.comments
    .filter((c) => c.sentiment !== 'spam' && c.action !== 'ignore' && c.action !== 'delete' && c.action !== 'hide')
    .sort((a, b) => {
      const influencerBonus = (isInf: boolean | undefined): number => (isInf ? 10 : 0);
      const aScore =
        (SENTIMENT_PRIORITY[a.sentiment ?? 'neutral'] ?? 0) + influencerBonus(a.isInfluencer) + Math.min(a.likes, 5);
      const bScore =
        (SENTIMENT_PRIORITY[b.sentiment ?? 'neutral'] ?? 0) + influencerBonus(b.isInfluencer) + Math.min(b.likes, 5);
      return bScore - aScore;
    })
    .slice(0, maxReplies);

  if (actionableComments.length === 0) {
    log.info('[CommentOrchestrator] Sin comentarios accionables para responder');
    return [];
  }

  const systemPrompt = `Sos el community manager de ${brand.name}.
Escribís respuestas auténticas en español rioplatense, tono: ${tones}.
Palabras prohibidas: ${forbidden}.
Cada respuesta tiene entre 1 y 3 oraciones. Sin hashtags. Sin links.
Respondés SIEMPRE con JSON válido sin markdown.`;

  const userPrompt = `Generá respuestas para estos comentarios de Instagram de ${brand.name}.

Comentarios a responder:
${JSON.stringify(
  actionableComments.map((c) => ({
    id: c.id,
    username: c.username,
    text: c.text,
    sentiment: c.sentiment,
    isInfluencer: c.isInfluencer,
    likes: c.likes,
  })),
  null,
  2,
)}

Modo de operación: ${mode}
${mode === 'autopilot' ? 'Las respuestas se publicarán automáticamente.' : 'Todas las respuestas requieren revisión humana.'}

Para cada comentario generá:
- reply: texto de la respuesta (auténtico, en rioplatense)
- action: la acción final (reply/like/pin/escalate)
- priority: 1-10 (10=urgente)
- requiresApproval: true si es negativo, sensible o de alto impacto
- rationale: por qué esta respuesta/acción

Reglas de aprobación obligatoria:
- Cualquier comentario negativo → requiresApproval: true SIEMPRE
- Influencers → requiresApproval: true en modo supervised
- Respuestas sobre precios, política de empresa, quejas → requiresApproval: true

Respondé SOLO con este JSON:
{
  "replies": [
    {
      "commentId": "id",
      "reply": "texto respuesta",
      "action": "reply",
      "priority": 8,
      "requiresApproval": false,
      "rationale": "razón"
    }
  ]
}`;

  log.info(`[CommentOrchestrator] Generando respuestas para ${actionableComments.length} comentarios`);

  try {
    const response = await clientAny.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      thinking: { type: 'adaptive', budget_tokens: 6000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = getTextContent(response.content as Array<{ type: string; text?: string }>);

    interface RepliesResult {
      replies: Array<{
        commentId: string;
        reply: string;
        action: CommentAction;
        priority: number;
        requiresApproval: boolean;
        rationale: string;
      }>;
    }

    const parsed = parseJsonSafe<RepliesResult>(raw, { replies: [] });
    const replyMap = new Map((parsed.replies ?? []).map((r) => [r.commentId, r]));

    const plans: CommentReplyPlan[] = actionableComments.map((comment) => {
      const plan = replyMap.get(comment.id);
      const isNegative = comment.sentiment === 'negative';
      return {
        comment,
        reply: plan?.reply ?? `¡Gracias por tu comentario, @${comment.username}!`,
        action: plan?.action ?? 'reply',
        priority: plan?.priority ?? SENTIMENT_PRIORITY[comment.sentiment ?? 'neutral'] ?? 2,
        requiresApproval: isNegative ? true : (plan?.requiresApproval ?? mode === 'supervised'),
        rationale: plan?.rationale ?? 'Respuesta automática de fallback',
      };
    });

    const sorted = plans.sort((a, b) => b.priority - a.priority);
    log.success(`[CommentOrchestrator] ${sorted.length} planes de respuesta generados`);
    return sorted;
  } catch (err) {
    log.error(`[CommentOrchestrator] Error generando respuestas: ${(err as Error).message}`);
    return actionableComments.map((comment) => ({
      comment,
      reply: `¡Gracias por tu mensaje, @${comment.username}! Te respondemos a la brevedad.`,
      action: 'reply' as CommentAction,
      priority: SENTIMENT_PRIORITY[comment.sentiment ?? 'neutral'] ?? 2,
      requiresApproval: true,
      rationale: 'Fallback por error en generación automática — revisar manualmente',
    }));
  }
};

// ── 3. detectCrisis ───────────────────────────────────────────────────────────

export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: 'low' | 'medium' | 'high';
  triggers: string[];
  suggestedResponse: string;
}

export const detectCrisis = (batch: CommentBatch): CrisisDetectionResult => {
  const { summary, comments } = batch;
  const triggers: string[] = [];

  const total = summary.total || 1;
  const negativeRatio = summary.negative / total;

  // Trigger 1: > 20% negative comments
  if (negativeRatio > 0.2) {
    triggers.push(`${Math.round(negativeRatio * 100)}% de comentarios negativos (umbral: 20%)`);
  }

  // Trigger 2: Coordinated attack — many comments from different users with similar negative text
  const negativeComments = comments.filter((c) => c.sentiment === 'negative');
  if (negativeComments.length >= 3) {
    const texts = negativeComments.map((c) => c.text.toLowerCase());
    const words = texts.flatMap((t) => t.split(/\s+/));
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (word.length > 4) {
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }
    }
    const repeated = [...wordFreq.entries()].filter(([, count]) => count >= 3);
    if (repeated.length > 0) {
      triggers.push(
        `Palabras repetidas en comentarios negativos: ${repeated
          .map(([w]) => w)
          .slice(0, 3)
          .join(', ')}`,
      );
    }
  }

  // Trigger 3: Overall sentiment is 'crisis' or 'negative'
  if (summary.sentiment === 'crisis') {
    triggers.push('Sentimiento general clasificado como crisis por el análisis de IA');
  } else if (summary.sentiment === 'negative' && negativeRatio > 0.4) {
    triggers.push('Sentimiento general negativo con alta concentración de críticas');
  }

  // Trigger 4: Escalated comments
  const escalated = comments.filter((c) => c.action === 'escalate');
  if (escalated.length > 0) {
    triggers.push(`${escalated.length} comentario(s) marcados para escalado inmediato`);
  }

  const isCrisis = triggers.length > 0;
  let severity: CrisisDetectionResult['severity'] = 'low';
  if (triggers.length >= 3 || summary.sentiment === 'crisis') {
    severity = 'high';
  } else if (triggers.length === 2 || negativeRatio > 0.3) {
    severity = 'medium';
  }

  const suggestedResponse = isCrisis
    ? severity === 'high'
      ? 'ACCIÓN URGENTE: Pausar publicaciones programadas. Notificar al equipo de dirección. Preparar comunicado oficial. Responder individualmente a los comentarios más visibles con tono empático y propuesta de solución concreta.'
      : severity === 'medium'
        ? 'Monitorear de cerca. Responder comentarios negativos en < 2 horas. Preparar respuesta tipo para el patrón detectado. Evaluar si pausar las publicaciones del día.'
        : 'Responder comentarios negativos con cuidado. Monitorear si la situación escala. No ignorar ni eliminar comentarios legítimos.'
    : 'Situación normal. Continuar con el plan de community management habitual.';

  if (isCrisis) {
    log.warn(
      `[CommentOrchestrator] CRISIS DETECTADA — severidad: ${severity.toUpperCase()} | triggers: ${triggers.length}`,
    );
  }

  return { isCrisis, severity, triggers, suggestedResponse };
};

// ── 4. generateSeedComments ───────────────────────────────────────────────────

export interface SeedCommentPost {
  hook: string;
  caption: string;
  format: string;
}

export const generateSeedComments = async (
  post: SeedCommentPost,
  brand: BrandProfile,
  count = 3,
): Promise<string[]> => {
  const tones = brand.voice.tone.join(', ');
  const locale = brand.audience.locale ?? 'es-AR';

  const systemPrompt = `Sos el community manager de ${brand.name}.
Escribís comentarios naturales y conversacionales que arrancan la conversación en un post de Instagram.
Idioma: español rioplatense (${locale}). Tono: ${tones}.
Los comentarios parecen genuinos, no publicitarios. Generan respuestas.`;

  const userPrompt = `Generá ${count} comentarios semilla para este post de Instagram.

Marca: ${brand.name}
Formato: ${post.format}
Hook del post: ${post.hook}
Caption: ${post.caption.slice(0, 300)}

Reglas:
- Cada comentario hace UNA pregunta o invita a opinar
- Máximo 2 oraciones por comentario
- Sin hashtags, sin emojis en exceso (máximo 1)
- Parecen escritos por un seguidor entusiasta de la marca, no por la marca misma
- Variedad: distintos ángulos (curiosidad, experiencia personal, pregunta concreta)

Respondé SOLO con un array JSON de strings:
["comentario 1", "comentario 2", "comentario 3"]`;

  log.info(`[CommentOrchestrator] Generando ${count} comentarios semilla`);

  try {
    const response = await clientAny.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2000,
      thinking: { type: 'adaptive', budget_tokens: 3000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = getTextContent(response.content as Array<{ type: string; text?: string }>);
    const parsed = parseJsonSafe<string[]>(raw, []);

    if (Array.isArray(parsed) && parsed.length > 0) {
      log.success(`[CommentOrchestrator] ${parsed.length} comentarios semilla generados`);
      return parsed.slice(0, count);
    }

    throw new Error('Respuesta no es un array válido');
  } catch (err) {
    log.error(`[CommentOrchestrator] Error generando seed comments: ${(err as Error).message}`);
    return [
      `¿Cómo empezaron con esto en ${brand.name}? Me genera mucha curiosidad.`,
      'Justo estaba pensando en algo así. ¿Tienen más info?',
      `Esto es exactamente lo que necesitaba ver hoy. ¿Le pasó a alguien más?`,
    ].slice(0, count);
  }
};

// ── 5. buildCommentResponseLibrary ────────────────────────────────────────────

export type CommentResponseLibrary = Record<CommentSentiment, { templates: string[]; when: string; avoid: string[] }>;

export const buildCommentResponseLibrary = async (brand: BrandProfile): Promise<CommentResponseLibrary> => {
  const tones = brand.voice.tone.join(', ');
  const forbidden = brand.voice.forbidden.length ? brand.voice.forbidden.join(', ') : 'ninguna';
  const locale = brand.audience.locale ?? 'es-AR';

  const systemPrompt = `Sos experto en community management para marcas argentinas.
Creás bibliotecas de respuestas reusables para Instagram.
Idioma: español rioplatense (${locale}).
Tono de ${brand.name}: ${tones}. Palabras prohibidas: ${forbidden}.
Respondés SIEMPRE con JSON válido sin markdown.`;

  const userPrompt = `Creá una biblioteca de respuestas para los comentarios de Instagram de ${brand.name} (${brand.niche}).

Para cada tipo de sentimiento necesitamos:
- templates: 4 respuestas listas para usar (con variables como @username, [tema] donde aplique)
- when: descripción de cuándo usar este bloque
- avoid: 3 cosas que NO hacer al responder este tipo de comentario

Tipos de sentimiento:
- positive: comentarios de elogio, apoyo, agradecimiento
- negative: quejas, críticas, experiencias malas
- neutral: comentarios sin carga emocional clara
- question: preguntas directas o indirectas
- spam: publicidad no solicitada, links, contenido irrelevante

Respondé SOLO con este JSON (EXACTAMENTE estas 5 claves):
{
  "positive": { "templates": [], "when": "", "avoid": [] },
  "negative": { "templates": [], "when": "", "avoid": [] },
  "neutral":  { "templates": [], "when": "", "avoid": [] },
  "question": { "templates": [], "when": "", "avoid": [] },
  "spam":     { "templates": [], "when": "", "avoid": [] }
}`;

  log.info(`[CommentOrchestrator] Construyendo biblioteca de respuestas para "${brand.name}"`);

  const fallbackLibrary: CommentResponseLibrary = {
    positive: {
      templates: [
        '¡Gracias @username! Nos alegra mucho leer esto 🙌',
        'Esto nos motiva a seguir, @username. ¡Gracias por el apoyo!',
        '¡Qué lindo mensaje! Nos encanta saber que te gustó.',
        'Gracias @username, comentarios como el tuyo hacen la diferencia.',
      ],
      when: 'Comentarios de elogio, agradecimiento o apoyo espontáneo',
      avoid: ['Respuestas genéricas sin personalización', 'Ignorar el comentario', 'Responder solo con emojis'],
    },
    negative: {
      templates: [
        'Hola @username, lamentamos que hayas tenido esa experiencia. ¿Nos escribís por DM para resolverlo?',
        'Gracias por contarnos, @username. Esto no refleja nuestros estándares y lo queremos resolver.',
        '@username, entendemos tu frustración. Por favor escribinos al privado y lo solucionamos.',
        'Lamentamos mucho esto, @username. Te escribimos por DM ahora.',
      ],
      when: 'Cualquier queja, crítica o experiencia negativa — siempre responder',
      avoid: ['Ignorar comentarios negativos', 'Responder de forma defensiva', 'Borrar comentarios legítimos'],
    },
    neutral: {
      templates: [
        '¡Gracias por pasarte, @username! 👋',
        'Qué bueno leerte por acá, @username.',
        '¡Nos alegramos que estés por acá!',
        'Gracias @username, siempre es un placer.',
      ],
      when: 'Comentarios sin carga emocional particular — un like suele ser suficiente',
      avoid: ['Sobre-responder', 'Ser forzado o excesivamente efusivo', 'Gastar tiempo en respuestas largas'],
    },
    question: {
      templates: [
        '¡Buena pregunta, @username! [respuesta directa]. ¿Querés más info?',
        'Hola @username, [respuesta]. Cualquier otra duda, acá estamos.',
        '@username, la respuesta es [dato clave]. ¿Te ayuda eso?',
        'Gracias por preguntar, @username. Te cuento: [respuesta]. ¿Quedó claro?',
      ],
      when: 'Preguntas directas o indirectas que requieren información concreta',
      avoid: [
        'Dejar preguntas sin respuesta',
        'Responder "te mandamos DM" sin responder algo en el comentario',
        'Dar información incorrecta',
      ],
    },
    spam: {
      templates: [
        '(ocultar sin responder)',
        '(reportar si es ofensivo)',
        '(eliminar si viola comunidad)',
        '(ignorar si es inocuo)',
      ],
      when: 'Publicidad no solicitada, links externos, contenido irrelevante o malicioso',
      avoid: ['Interactuar con el spam', 'Responder de forma agresiva', 'Compartir o dar visibilidad'],
    },
  };

  try {
    const response = await clientAny.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8000,
      thinking: { type: 'adaptive', budget_tokens: 5000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = getTextContent(response.content as Array<{ type: string; text?: string }>);
    const parsed = parseJsonSafe<CommentResponseLibrary>(raw, fallbackLibrary);

    // Validate structure — ensure all 5 keys exist
    const sentiments: CommentSentiment[] = ['positive', 'negative', 'neutral', 'question', 'spam'];
    const isValid = sentiments.every(
      (s) =>
        parsed[s] &&
        Array.isArray(parsed[s].templates) &&
        typeof parsed[s].when === 'string' &&
        Array.isArray(parsed[s].avoid),
    );

    const library: CommentResponseLibrary = isValid ? parsed : fallbackLibrary;

    // Persist to data/runtime/comment-library/{brandId}.json
    const brandId = brand.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const libraryDir = join(process.cwd(), 'data', 'runtime', 'comment-library');
    mkdirSync(libraryDir, { recursive: true });
    const filePath = join(libraryDir, `${brandId}.json`);
    writeFileSync(filePath, JSON.stringify(library, null, 2), 'utf-8');

    log.success(`[CommentOrchestrator] Biblioteca guardada en ${filePath}`);
    return library;
  } catch (err) {
    log.error(`[CommentOrchestrator] Error construyendo biblioteca: ${(err as Error).message}`);
    return fallbackLibrary;
  }
};

// ── 6. shouldPinComment ───────────────────────────────────────────────────────

export const shouldPinComment = (comment: Comment, allComments: Comment[]): boolean => {
  // Never pin spam or negative comments
  if (comment.sentiment === 'spam' || comment.sentiment === 'negative') return false;

  const totalComments = allComments.length || 1;
  const maxLikes = Math.max(...allComments.map((c) => c.likes), 0);

  // Pin if influencer and positive/question
  if (comment.isInfluencer && (comment.sentiment === 'positive' || comment.sentiment === 'question')) {
    return true;
  }

  // Pin if most-liked comment (top 10%) and positive
  if (comment.likes >= maxLikes * 0.9 && comment.likes > 0 && comment.sentiment === 'positive') {
    return true;
  }

  // Pin if positive question (generates conversation)
  if (comment.sentiment === 'question' && comment.likes > 0) {
    return true;
  }

  // Pin if highly engaged (likes > 5% of total comments count) and brand-aligned
  const likeThreshold = Math.max(5, Math.floor(totalComments * 0.05));
  if (comment.likes >= likeThreshold && comment.sentiment === 'positive') {
    return true;
  }

  return false;
};
