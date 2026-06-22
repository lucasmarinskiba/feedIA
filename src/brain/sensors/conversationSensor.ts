// @ts-nocheck
/**
 * Conversation Sensor — Escucha conversaciones y aprende de ellas
 * Detecta intenciones, emociones, objeciones, promesas
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as lang from '../memory/languageMemory.js';

export interface ConversationInsight {
  intent: string;
  emotion: 'positive' | 'negative' | 'neutral' | 'urgent';
  objection?: string;
  promise?: string;
  slangTerms: string[];
  topicShift: boolean;
  engagementLevel: 'high' | 'medium' | 'low';
}

export const analyzeConversation = async (
  messages: { role: 'user' | 'bot'; text: string }[],
  userHandle: string,
  niche: string,
): Promise<ConversationInsight> => {
  const lastMessage = messages[messages.length - 1]?.text ?? '';
  const allText = messages.map((m) => m.text).join(' ');

  // Simple intent detection
  const intent = detectIntent(allText);
  const emotion = detectEmotion(allText);
  const objection = detectObjection(lastMessage);
  const promise = detectPromise(allText);
  const slangTerms = detectSlang(allText, niche);
  const topicShift = detectTopicShift(messages);
  const engagementLevel = detectEngagement(messages);

  const insight: ConversationInsight = {
    intent,
    emotion,
    objection,
    promise,
    slangTerms,
    topicShift,
    engagementLevel,
  };

  // Store learnings
  await semantic.storeMemory(
    `Conversación con @${userHandle}: ${intent} (${emotion})`,
    'conversation',
    {
      userHandle,
      intent,
      emotion,
      objection,
      promise,
      niche,
      engagementLevel,
      messageCount: messages.length,
    },
    engagementLevel === 'high' ? 0.8 : engagementLevel === 'medium' ? 0.5 : 0.3,
  );

  // Record slang
  for (const term of slangTerms) {
    lang.recordTerm({
      term,
      type: 'slang',
      meaning: `detected in conversation with @${userHandle}`,
      niche,
      confidence: 0.4,
      examples: [lastMessage.slice(0, 120)],
      status: 'emerging',
    });
  }

  // Episode
  episodic.recordEpisode('conversation-analyzed', `Analyzed ${messages.length} messages with @${userHandle}`, {
    who: userHandle,
    tags: ['conversation', intent, emotion, niche],
    emotion,
  });

  log.info(`[ConversationSensor] @${userHandle}: ${intent} | ${emotion} | engagement=${engagementLevel}`);
  return insight;
};

const detectIntent = (text: string): string => {
  const t = text.toLowerCase();
  if (t.match(/precio|cuánto|cuesta|valor|costo/)) return 'comercial';
  if (t.match(/ayuda|problema|no funciona|error/)) return 'soporte';
  if (t.match(/gracias|me encanta|genial|perfecto/)) return 'feedback-positivo';
  if (t.match(/malo|odio|horrible|peor/)) return 'feedback-negativo';
  if (t.match(/colabor|partnership|trabajar junt/)) return 'colaboracion';
  if (t.match(/info|información|saber más|detalles/)) return 'informacion';
  if (t.match(/compr|pedido|orden/)) return 'venta';
  return 'general';
};

const detectEmotion = (text: string): ConversationInsight['emotion'] => {
  const t = text.toLowerCase();
  const pos = (t.match(/\b(love|genial|perfecto|gracias|encanta|mejor|feliz|😍|❤️|🔥)\b/g) ?? []).length;
  const neg = (t.match(/\b(odio|malo|peor|horrible|triste|enojado|😤|😠|💩)\b/g) ?? []).length;
  const urgent = (t.match(/\b(urgente|ya|ahora|inmediato|emergencia|asap)\b/g) ?? []).length;

  if (urgent > 1) return 'urgent';
  if (neg > pos) return 'negative';
  if (pos > neg) return 'positive';
  return 'neutral';
};

const detectObjection = (text: string): string | undefined => {
  const t = text.toLowerCase();
  const objections = [
    { pattern: /caro|costoso|no tengo dinero|presupuesto/, text: 'precio' },
    { pattern: /no estoy seguro|dudoso|quizás/, text: 'duda' },
    { pattern: /no tengo tiempo|ocupado|después/, text: 'tiempo' },
    { pattern: /no confío|estafa|seguro/, text: 'confianza' },
    { pattern: /ya tengo|con otro|competencia/, text: 'competencia' },
  ];
  for (const o of objections) {
    if (o.pattern.test(t)) return o.text;
  }
  return undefined;
};

const detectPromise = (text: string): string | undefined => {
  const t = text.toLowerCase();
  const promises = [
    { pattern: /te envío|te mando|te paso/, text: 'enviar-info' },
    { pattern: /te contacto|te escribo/, text: 'contactar' },
    { pattern: /veo|reviso|chequeo/, text: 'revisar' },
  ];
  for (const p of promises) {
    if (p.pattern.test(t)) return p.text;
  }
  return undefined;
};

const detectSlang = (text: string, niche: string): string[] => {
  const slangPatterns: Record<string, RegExp[]> = {
    general: [
      /\bcringe\b/gi,
      /\bghostear\b/gi,
      /\bslay\b/gi,
      /\bvibes\b/gi,
      /\biconic\b/gi,
      /\bsnatched\b/gi,
      /\bmain character\b/gi,
      /\bred flag\b/gi,
    ],
    fitness: [
      /\bgains\b/gi,
      /\bswole\b/gi,
      /\bshredded\b/gi,
      /\bcheat day\b/gi,
      /\bmacros\b/gi,
      /\bPR\b/gi,
      /\bDOMS\b/gi,
    ],
    beauty: [/\bglow up\b/gi, /\bdegraded\b/gi, /\bno makeup makeup\b/gi, /\bskin care\b/gi, /\bgrwm\b/gi, /\blit\b/gi],
    tech: [
      /\bshipping\b/gi,
      /\bWIP\b/gi,
      /\bdebugging life\b/gi,
      /\b404\b/gi,
      /\bdeploy\b/gi,
      /\balpha\b/gi,
      /\bbeta\b/gi,
    ],
  };
  const patterns = slangPatterns[niche] ?? slangPatterns.general ?? [];
  const found: string[] = [];
  for (const pattern of patterns) {
    const match = text.toLowerCase().match(pattern);
    if (match) found.push(match[0]);
  }
  return [...new Set(found)];
};

const detectTopicShift = (messages: { role: 'user' | 'bot'; text: string }[]): boolean => {
  if (messages.length < 3) return false;
  const last3 = messages.slice(-3).map((m) => m.text.toLowerCase());
  if (last3.length < 3) return false;
  // Simple heuristic: if last message shares <20% words with first of last 3
  const words1 = new Set(last3[0]!.split(/\s+/));
  const words2 = new Set(last3[2]!.split(/\s+/));
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  return union > 0 && intersection / union < 0.2;
};

const detectEngagement = (messages: { role: 'user' | 'bot'; text: string }[]): 'high' | 'medium' | 'low' => {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length >= 5) return 'high';
  if (userMessages.length >= 2) return 'medium';
  return 'low';
};

export const getUserProfile = async (
  userHandle: string,
): Promise<{
  totalConversations: number;
  mainIntent: string;
  sentiment: string;
  objections: string[];
  slang: string[];
}> => {
  const past = await semantic.recall(`@${userHandle}`, 20, ['conversation']);
  const intents = new Map<string, number>();
  const emotions = new Map<string, number>();
  const objections: string[] = [];
  const slang: string[] = [];

  for (const r of past) {
    const meta = r.entry.metadata as Record<string, unknown>;
    if (meta.userHandle === userHandle) {
      const intent = String(meta.intent ?? 'unknown');
      intents.set(intent, (intents.get(intent) ?? 0) + 1);
      const emotion = String(meta.emotion ?? 'neutral');
      emotions.set(emotion, (emotions.get(emotion) ?? 0) + 1);
      if (meta.objection) objections.push(String(meta.objection));
      if (meta.slangTerms) slang.push(...(meta.slangTerms as string[]));
    }
  }

  const mainIntent = [...intents.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
  const sentiment = [...emotions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

  return {
    totalConversations: past.length,
    mainIntent,
    sentiment,
    objections: [...new Set(objections)],
    slang: [...new Set(slang)],
  };
};
