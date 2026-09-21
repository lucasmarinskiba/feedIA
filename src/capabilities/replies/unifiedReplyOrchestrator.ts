/**
 * Unified Reply Orchestrator — respuestas inteligentes con CRM + memoria + RAG + tone guardian.
 *
 * Flujo por mensaje entrante:
 *  1. Safety rails
 *  2. CRM lookup
 *  3. Memoria a corto y largo plazo
 *  4. FAQ match
 *  5. Knowledge RAG
 *  6. Generación de respuesta (FAQ / knowledge / LLM)
 *  7. Tone guardian
 *  8. Aprendizaje y persistencia
 */

import type { BrandProfile } from '../../config/types.js';
import { log } from '../../agent/logger.js';
import { ask } from '../../agent/tokenRouter.js';
import {
  recordIncomingMessage,
  recordOutgoingReply,
  escalateToHuman,
  loadContext,
  type UserContext,
  type Channel,
} from '../bot/conversationMemory.js';
import { evaluateRails, type RailsDecision } from '../bot/safetyRails.js';
import { resolveCRMContext, type CRMContextResult } from '../bot/crmContextResolver.js';
import {
  getClientMemory,
  buildMemoryContext,
  recordInteraction,
  updateClientMemory,
  type ClientMemory,
} from '../bot/clientMemory.js';
import { searchKnowledge, type KnowledgeResult } from '../bot/knowledgeRag.js';
import { findMatchingFAQ, type FAQMatch } from '../community/faqDatabase.js';
import { checkTone, type ToneCheckResult } from '../community/toneGuardian.js';
import { learnFromInteraction } from '../../brain/bridge/interactionLearner.js';
import {
  handleComment,
  isCommentBrainEnabled,
  resolveBrainConfig,
  getPostContext,
  getThreadContext,
  type BrainResult,
} from '../commentBrain/index.js';

export interface SmartReplyInput {
  userId: string;
  handle: string;
  channel: Channel;
  message: string;
  brand: BrandProfile;
  postId?: string;
  /** ID del comentario en la red (para leer el hilo). Solo canal 'comentario'. */
  commentId?: string;
  postContext?: { postId: string; tipo: string; resumenContenido: string };
}

export interface SmartReplyOutput {
  reply: string;
  sent: boolean;
  escalated: boolean;
  blocked: boolean;
  source: 'faq' | 'knowledge' | 'llm' | 'human' | 'blocked' | 'comment-brain' | 'ignored' | 'disabled';
  intent: string;
  confidence: number;
  rails?: RailsDecision;
  crm?: CRMContextResult;
  faqMatch?: FAQMatch;
  knowledge?: KnowledgeResult;
  tone?: ToneCheckResult;
  memory?: ClientMemory;
  /** Decisión del Comment Brain (solo comentarios con el brain habilitado). */
  brain?: BrainResult;
}

const FAQ_HIGH_CONFIDENCE = 0.75;
const KNOWLEDGE_HIGH_CONFIDENCE = 0.55;
const MAX_REPLY_LENGTH = 500;

const truncate = (text: string, max = MAX_REPLY_LENGTH): string =>
  text.length > max ? `${text.slice(0, max - 3)}...` : text;

const buildSystemPrompt = (brand: BrandProfile): string => {
  const voice = brand.voice;
  return `Sos el community manager de ${brand.name}. Respondés DMs y comentarios de Instagram de forma natural, útil y alineada con la marca.

Tono: ${voice?.tone?.join(', ') ?? 'cálido, profesional'}.
Palabras prohibidas: ${voice?.forbidden?.join(', ') ?? 'ninguna'}.

Reglas:
- Nunca prometas resultados que la marca no pueda sostener.
- No inventes precios, funciones ni políticas que no estén en el contexto.
- Si no sabés algo, derivá a humano con calidez.
- En comentarios públicos: máximo 2 oraciones.
- En DMs: máximo 4 oraciones, siempre con un CTA suave cuando corresponda.`;
};

const buildUserPrompt = (input: SmartReplyInput, ctx: UserContext, contextParts: string[]): string => {
  const recent = ctx.turnos
    .slice(-6)
    .map((t) => `${t.rol}: ${t.texto}`)
    .join('\n');
  const postInfo = input.postContext
    ? `Contexto del post: ${input.postContext.tipo} — ${input.postContext.resumenContenido}`
    : '';

  return `${contextParts.filter(Boolean).join('\n\n')}

${postInfo}

Historial reciente con @${input.handle}:
${recent || '(primer contacto)'}

Nuevo mensaje de @${input.handle}:
"${input.message}"

Escribí una respuesta corta, natural y alineada a la voz de marca. Si no tenés información suficiente, pedí que espere a un humano.`;
};

const generateFAQReply = (match: FAQMatch): string => {
  const base =
    match.entry.alternativeAnswers.length > 0
      ? match.entry.alternativeAnswers[Math.floor(Math.random() * match.entry.alternativeAnswers.length)]!
      : match.entry.answer;
  return base;
};

const generateKnowledgeReply = (result: KnowledgeResult): string => {
  const chunks = result.chunks
    .slice(0, 2)
    .map((c) => `- ${c.title}: ${c.content}`)
    .join('\n');
  return `Basándome en lo que tenemos registrado:\n\n${chunks}\n\n¿Te sirvió? Si necesitás más detalle, te paso con el equipo.`;
};

const toMemoryChannel = (channel: Channel): ClientMemory['interactionHistory'][number]['channel'] =>
  channel === 'comentario' ? 'dm' : channel;

const generateLLMReply = async (input: SmartReplyInput, ctx: UserContext, contextParts: string[]): Promise<string> => {
  const prompt = buildUserPrompt(input, ctx, contextParts);
  const result = await ask(prompt, {
    taskType: 'response',
    systemPrompt: buildSystemPrompt(input.brand),
    maxTokens: 600,
    temperature: 0.65,
    freeOnly: true,
  });
  return result.text.trim();
};

const getTopKnowledgeScore = (result: KnowledgeResult): number => {
  if (result.chunks.length === 0) return 0;
  return Math.min(0.9, 0.4 + result.chunks.length * 0.15);
};

export const generateSmartReply = async (input: SmartReplyInput): Promise<SmartReplyOutput> => {
  const { userId, handle, channel, message, brand } = input;

  // 1. Registrar mensaje entrante y cargar contexto
  const ctx = recordIncomingMessage(userId, handle, channel, message, input.postId);

  // 2. Safety rails.
  //    Comment Brain en modo `suggest` no envía nada: el interruptor maestro (BOT_AUTO_REPLY_ENABLED) y el
  //    horario silencioso, que protegen ENVÍOS, no aplican. Así el modo sombra junta datos aun con el bot "apagado".
  const observeOnly =
    channel === 'comentario' && isCommentBrainEnabled() && resolveBrainConfig().autonomy === 'suggest';
  const rails = evaluateRails(ctx, message, { observeOnly });
  if (!rails.permitir) {
    log.info(`[UnifiedReply] Bloqueado por rails: ${rails.motivos.join(', ')}`);
    return {
      reply: '',
      sent: false,
      escalated: true,
      blocked: true,
      source: 'blocked',
      intent: 'bloqueado',
      confidence: 1,
      rails,
    };
  }

  // 3. CRM + memoria
  const crmPromise = resolveCRMContext(handle);
  const memory = getClientMemory(userId);
  const memoryContext = buildMemoryContext(userId);

  // 4. FAQ + knowledge en paralelo
  const [crm, faqMatch, knowledge] = await Promise.all([
    crmPromise,
    Promise.resolve(findMatchingFAQ(message, 0.5)),
    Promise.resolve(searchKnowledge({ query: message, limit: 3 })),
  ]);

  // 4b. Comentarios públicos: los decide el Comment Brain (tipo + sarcasmo + riesgo).
  //     FAQ y knowledge dejan de ser respuestas enlatadas y pasan a ser HECHOS citables.
  if (channel === 'comentario' && isCommentBrainEnabled()) {
    const facts = [
      ...(faqMatch ? [`${faqMatch.entry.question} → ${faqMatch.entry.answer}`] : []),
      ...knowledge.chunks.slice(0, 3).map((c) => `${c.title}: ${c.content}`),
    ];
    const [post, thread] = await Promise.all([getPostContext(input.postId), getThreadContext(input.commentId)]);
    const brain = await handleComment({
      commentId: input.commentId,
      handle,
      text: message,
      brand,
      post,
      thread,
      facts,
    });
    const intent = brain.classification.kind;
    const confidence = brain.classification.confidence;
    const base = {
      intent,
      confidence,
      rails,
      crm,
      faqMatch: faqMatch ?? undefined,
      knowledge,
      memory,
      brain,
    };

    // Defensa en profundidad: en modo observación el brain nunca devuelve `reply`; si algún día lo hiciera, no se envía.
    if (observeOnly && brain.action === 'reply') {
      log.warn('[UnifiedReply] modo observación devolvió reply: se descarta el envío');
      return { ...base, reply: '', sent: false, escalated: true, blocked: false, source: 'comment-brain' };
    }

    if (brain.action === 'reply' && brain.reply) {
      const reply = truncate(brain.reply);
      recordOutgoingReply(userId, reply, true, intent);
      recordInteraction(userId, {
        channel: toMemoryChannel(channel),
        intent,
        summary: `${message} → ${reply.slice(0, 80)}`,
      });
      await learnFromInteraction({
        handle,
        incoming: message,
        outgoing: reply,
        channel: 'comment',
        intent,
        confidence,
        brand,
        metadata: { postId: input.postId, autoReplied: true, escalated: false },
      }).catch((err: Error) => log.warn(`[UnifiedReply] learn failed: ${err.message}`));
      return { ...base, reply, sent: true, escalated: false, blocked: false, source: 'comment-brain' };
    }

    if (brain.action === 'ignore') {
      return { ...base, reply: '', sent: false, escalated: false, blocked: false, source: 'ignored' };
    }

    // draft-for-review | escalate: el brain ya lo dejó en la cola de revisión.
    return { ...base, reply: '', sent: false, escalated: true, blocked: false, source: 'comment-brain' };
  }

  const contextParts: string[] = [];
  if (crm.found) contextParts.push(`Contexto CRM:\n${crm.context}`);
  if (memoryContext) contextParts.push(`Memoria del cliente:\n${memoryContext}`);

  // 5. Decidir source y generar respuesta
  let source: SmartReplyOutput['source'] = 'llm';
  let reply = '';
  let intent = 'otro';
  let confidence = 0.5;

  if (faqMatch && faqMatch.similarity >= FAQ_HIGH_CONFIDENCE) {
    source = 'faq';
    reply = generateFAQReply(faqMatch);
    intent = 'pregunta-info';
    confidence = faqMatch.similarity;
  } else if (knowledge.chunks.length > 0 && getTopKnowledgeScore(knowledge) >= KNOWLEDGE_HIGH_CONFIDENCE) {
    source = 'knowledge';
    reply = generateKnowledgeReply(knowledge);
    intent = 'pregunta-info';
    confidence = getTopKnowledgeScore(knowledge);
  } else {
    reply = await generateLLMReply(input, ctx, contextParts);
    intent = 'respuesta-generada';
    confidence = 0.7;
  }

  // 6. Tone guardian
  const tone = await checkTone(reply, channel === 'dm' ? 'dm-reply' : 'comment-reply', { brand });
  if (!tone.passes && tone.suggestedRewrite) {
    reply = tone.suggestedRewrite;
  }

  reply = truncate(reply);

  // 7. Escalar si tone falla gravemente o no hay respuesta
  if (!reply || tone.score < 40) {
    escalateToHuman(userId, `Tone guardian score ${tone.score} o respuesta vacía`);
    return {
      reply: '',
      sent: false,
      escalated: true,
      blocked: false,
      source,
      intent,
      confidence,
      rails,
      crm,
      faqMatch: faqMatch ?? undefined,
      knowledge,
      tone,
      memory,
    };
  }

  // 8. Registrar respuesta saliente y actualizar memoria
  recordOutgoingReply(userId, reply, true, intent);
  recordInteraction(userId, {
    channel: toMemoryChannel(channel),
    intent,
    summary: `${message} → ${reply.slice(0, 80)}`,
  });

  // Extraer intereses/objeciones simples
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('precio') || lowerMsg.includes('cuánto')) {
    updateClientMemory(userId, { interests: ['pricing'] });
  }
  if (lowerMsg.includes('no puedo') || lowerMsg.includes('caro')) {
    updateClientMemory(userId, { objections: ['price_concern'] });
  }

  // 9. Aprendizaje
  await learnFromInteraction({
    handle,
    incoming: message,
    outgoing: reply,
    channel: channel === 'comentario' ? 'comment' : channel,
    intent,
    confidence,
    brand,
    metadata: {
      postId: input.postId,
      autoReplied: true,
      escalated: false,
    },
  }).catch((err: Error) => log.warn(`[UnifiedReply] learn failed: ${err.message}`));

  return {
    reply,
    sent: true,
    escalated: false,
    blocked: false,
    source,
    intent,
    confidence,
    rails,
    crm,
    faqMatch: faqMatch ?? undefined,
    knowledge,
    tone,
    memory,
  };
};

export const getReplyContext = (userId: string): { conversation: UserContext | null; memory: ClientMemory } => ({
  conversation: loadContext(userId),
  memory: getClientMemory(userId),
});
