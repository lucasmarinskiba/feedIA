// @ts-nocheck
/**
 * Response Actuator — Genera respuestas con contexto cerebral completo
 * Usa memoria semántica, episódica, grafo y personalidad
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as graph from '../memory/knowledgeGraph.js';
import * as personality from '../reasoning/personalityEngine.js';
// import * as viral from '../reasoning/viralScoring.js'; // reserved for future viral-scoring integration

export interface ResponseContext {
  userHandle: string;
  conversationHistory: { role: 'user' | 'bot'; text: string }[];
  brandName: string;
  niche: string;
  platform: 'instagram' | 'tiktok' | 'twitter' | 'general';
  intent?: string;
  emotion?: 'positive' | 'negative' | 'neutral' | 'urgent';
  maxSentences: number;
}

export interface BrainEnrichedResponse {
  text: string;
  confidence: number;
  sources: string[];
  personalityApplied: boolean;
  similarPast?: string;
}

export const generateResponse = async (ctx: ResponseContext): Promise<BrainEnrichedResponse> => {
  const { userHandle, conversationHistory, brandName, niche, platform, intent, emotion, maxSentences } = ctx;
  const lastUserMessage = conversationHistory.filter((m) => m.role === 'user').pop()?.text ?? '';

  // 1. Recall brain context
  const [semanticMem, userEpisodes, brandKnowledge] = await Promise.all([
    semantic.recall(lastUserMessage, 3, ['conversation', 'learning']),
    episodic.recallByWho(userHandle).slice(0, 3),
    graph.exportAsContext(brandName),
  ]);

  // 2. Learn/update personality
  const persona = personality.learnPersonality(userHandle, conversationHistory);

  // 3. Build enriched prompt context
  const contextLines: string[] = [];

  if (semanticMem.length > 0) {
    contextLines.push('CONTEXTO DE MEMORIA:');
    for (const m of semanticMem) contextLines.push(`  - ${m.entry.content.slice(0, 120)}`);
  }

  if (userEpisodes.length > 0) {
    contextLines.push('\nHISTORIAL CON ESTE USUARIO:');
    for (const e of userEpisodes) {
      contextLines.push(`  - ${e.date}: ${e.event} — ${e.what.slice(0, 80)}`);
    }
  }

  if (brandKnowledge) {
    contextLines.push('\nCONOCIMIENTO DE MARCA:');
    contextLines.push(brandKnowledge);
  }

  const personaCtx = personality.getPersonalityContext(userHandle);
  if (personaCtx) {
    contextLines.push('\n' + personaCtx);
  }

  // 4. Constraints
  const constraints = [
    `Máximo ${maxSentences} oraciones.`,
    `Plataforma: ${platform}.`,
    emotion ? `Emoción detectada: ${emotion}. Ajustar tono.` : '',
    intent ? `Intención: ${intent}.` : '',
    `Nicho: ${niche}.`,
    'No inventar información.',
    'Ser auténtico y humano.',
  ].filter(Boolean);

  const fullContext = [...contextLines, '', 'RESTRICCIONES:', ...constraints.map((c) => `  - ${c}`)].join('\n');

  // 5. Here we would call the LLM with fullContext
  // For now, return a structured response with all context
  // The actual LLM call would be done by the caller using this context

  const sources = [
    ...semanticMem.map((m) => `memory:${m.entry.id}`),
    ...userEpisodes.map((e) => `episode:${e.id}`),
    `persona:${persona.brandOrUser}`,
  ];

  const response: BrainEnrichedResponse = {
    text: fullContext, // This becomes the system prompt/context for the LLM
    confidence: semanticMem.length > 0 && semanticMem[0] ? Math.min(0.95, 0.5 + semanticMem[0].score) : 0.5,
    sources,
    personalityApplied: true,
    similarPast: semanticMem[0]?.entry?.content?.slice(0, 100),
  };

  log.info(`[ResponseActuator] Context built for @${userHandle}: ${sources.length} sources`);
  return response;
};

// Quick reply for common intents using brain memory
export const quickReply = async (intent: string, userHandle: string, niche: string): Promise<string | null> => {
  // Try to find a past good reply for this intent
  const past = await semantic.recall(`respuesta ${intent} ${niche}`, 3, ['conversation']);
  const goodReplies = past.filter((p) => (p?.entry?.importance ?? 0) > 0.6);

  if (goodReplies.length > 0 && goodReplies[0]) {
    const best = goodReplies[0];
    log.info(`[ResponseActuator] Quick reply from memory for ${intent}`);
    return best.entry.content ?? null;
  }

  // Template-based quick replies
  const templates: Record<string, Record<string, string>> = {
    comercial: {
      default: '¡Gracias por tu interés! Te envío toda la info por DM 💬',
    },
    soporte: {
      default: 'Entiendo, vamos a resolverlo. ¿Me cuentas un poco más? 🔧',
    },
    'feedback-positivo': {
      default: '¡Qué bueno leerte! Gracias por el apoyo 🙌',
    },
    'feedback-negativo': {
      default: 'Lamento que te sientas así. Me gustaría entender mejor para ayudarte.',
    },
    informacion: {
      default: 'Claro, con gusto te cuento más. ¿Sobre qué tema específico?',
    },
  };

  return templates[intent]?.[niche] ?? templates[intent]?.default ?? null;
};

// Store successful reply
export const storeReply = async (
  content: string,
  userHandle: string,
  intent: string,
  success = true,
): Promise<void> => {
  await semantic.storeMemory(
    `Respuesta a ${intent}: ${content}`,
    'conversation',
    { userHandle, intent, success },
    success ? 0.8 : 0.3,
  );

  if (success) {
    episodic.recordEpisode('reply-success', content, {
      who: userHandle,
      tags: ['reply', intent, 'success'],
      emotion: 'positive',
    });
  }
};
