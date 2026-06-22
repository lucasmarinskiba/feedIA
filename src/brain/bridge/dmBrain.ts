/**
 * DM Brain Bridge — Inyecta el cerebro en el sistema de DM inbox existente
 * Cada conversación ahora tiene memoria, personalidad evolutiva, y respuestas humanas
 */

import { log } from '../../agent/logger.js';
import * as humanResponse from '../community/humanResponse.js';
import * as community from '../community/communityManager.js';
import * as personality from '../reasoning/personalityEngine.js';
import * as episodic from '../memory/episodicMemory.js';
import * as semantic from '../memory/semanticMemory.js';

export interface DMThread {
  handle: string;
  messages: { role: 'user' | 'bot'; text: string; timestamp: string }[];
  platform: string;
  brandNiche: string;
  brandTone: string[];
}

export interface DMBrainResult {
  reply: string;
  confidence: number;
  strategy: string;
  nextAction?: 'close' | 'follow-up' | 'escalate' | 'convert';
  contextUsed: string[];
}

// ── Process DM thread with full brain ──────────────────────────────────────

export const processDMThread = async (thread: DMThread): Promise<DMBrainResult> => {
  const { handle, messages, brandNiche, brandTone } = thread;
  const lastMessage = messages[messages.length - 1];

  // 1. Learn personality from entire thread
  personality.learnPersonality(handle, messages);

  // 2. Get member context
  const memberCtx = community.getMemberContext(handle);
  const member = community.getEngagementPriority(50).find((m) => m.handle.toLowerCase() === handle.toLowerCase());

  // 3. Recall past conversations
  const pastMemories = await semantic.recall(`@${handle}`, 3, ['conversation']);
  const pastEpisodes = episodic.recallByWho(handle).slice(0, 3);

  // 4. Detect if this is a conversion opportunity
  const isLead =
    member?.sentiment === 'lead' ||
    lastMessage.text.toLowerCase().match(/\b(precio|compr|interesad|info|agenda|consulta)\b/);
  const isComplaint = lastMessage.text.toLowerCase().match(/\b(problema|error|no funciona|malo|peor|decepcionado)\b/);

  let strategy = 'conversación-natural';
  let nextAction: DMBrainResult['nextAction'] = 'follow-up';

  if (isComplaint) {
    strategy = 'empatía-rapida';
    nextAction = 'escalate';
  } else if (isLead) {
    strategy = 'curiosidad-profesional';
    nextAction = 'convert';
  } else if (messages.length > 5) {
    strategy = 'cierre-cálido';
    nextAction = 'close';
  }

  // 5. Generate response
  const response = await humanResponse.craftHumanResponse({
    handle,
    message: lastMessage.text,
    platform: 'instagram',
    type: 'dm',
    brandNiche,
    brandTone,
    maxChars: 1000,
  });

  // 6. Store interaction
  await community.trackInteraction(handle, response.text, 'outbound', 'instagram');

  // 7. Build context log
  const contextUsed: string[] = [];
  if (memberCtx) contextUsed.push('community-profile');
  if (pastMemories.length > 0) contextUsed.push('semantic-memory');
  if (pastEpisodes.length > 0) contextUsed.push('episodic-memory');
  contextUsed.push('personality-engine');

  log.info(`[DMBrain] @${handle}: ${strategy} → ${nextAction} (conf=${response.confidence.toFixed(2)})`);

  return {
    reply: response.text,
    confidence: response.confidence,
    strategy,
    nextAction,
    contextUsed,
  };
};

// ── Suggest follow-up for stale conversations ──────────────────────────────

export const suggestFollowUp = (handle: string): string | null => {
  const member = community.getEngagementPriority(50).find((m) => m.handle.toLowerCase() === handle.toLowerCase());
  if (!member) return null;

  const daysSince = (Date.now() - new Date(member.lastContact).getTime()) / (24 * 3600_000);
  if (daysSince < 2) return null;

  if (member.sentiment === 'lead') {
    return `Hey ${handle.split('@')[0] || handle}! 👋 ¿Tuviste chance de revisar lo que te mandé? Estoy por acá si tenés dudas.`;
  }

  if (member.engagementScore > 0.6) {
    return `¡${handle.split('@')[0] || handle}! Hace un tiempo no charlamos. ¿Cómo va todo? 🙌`;
  }

  return null;
};
