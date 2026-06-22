/**
 * AutoReply Brain Bridge — Inyecta el cerebro en el sistema de auto-reply existente
 * Reemplaza respuestas robóticas por respuestas con memoria, personalidad y contexto
 */

import { log } from '../../agent/logger.js';
import * as humanResponse from '../community/humanResponse.js';
import * as community from '../community/communityManager.js';
import * as stalker from '../community/stalkerTracker.js';
import * as decision from '../actuators/decisionActuator.js';
import * as cortex from '../core/cortex.js';

export interface ExistingAutoReplyContext {
  handle: string;
  message: string;
  platform: 'instagram' | 'tiktok' | 'twitter';
  type: 'comment' | 'dm';
  intent: string;
  brandNiche: string;
  brandTone: string[];
  threadHistory?: { role: 'user' | 'bot'; text: string }[];
}

export interface BrainEnrichedReply {
  text: string;
  shouldReply: boolean;
  confidence: number;
  reasoning: string[];
  personalityApplied: boolean;
  sources: string[];
}

// ── Main bridge function ───────────────────────────────────────────────────

export const enrichAutoReply = async (ctx: ExistingAutoReplyContext): Promise<BrainEnrichedReply | null> => {
  // 1. Skip if user is a bot or troll
  const stalkerProfile = stalker.getIntelBrief(ctx.handle);
  if (stalkerProfile?.type === 'bot') {
    log.info(`[AutoReplyBrain] Ignoring bot @${ctx.handle}`);
    return null;
  }
  if (stalkerProfile?.type === 'troll' && stalkerProfile.riskLevel === 'high') {
    log.info(`[AutoReplyBrain] Escalating troll @${ctx.handle}`);
    return {
      text: '',
      shouldReply: false,
      confidence: 0.9,
      reasoning: ['Troll de alto riesgo'],
      personalityApplied: false,
      sources: ['stalker-tracker'],
    };
  }

  // 2. Track interaction
  await community.trackInteraction(ctx.handle, ctx.message, 'inbound', ctx.platform);

  // 3. Check escalation
  const escalation = await decision.shouldEscalate(ctx.message, ctx.intent, 'neutral', ctx.handle);
  if (escalation.escalate) {
    return {
      text: '',
      shouldReply: false,
      confidence: escalation.urgency,
      reasoning: [escalation.reason],
      personalityApplied: false,
      sources: ['decision-actuator'],
    };
  }

  // 4. Generate human response
  const response = await humanResponse.craftHumanResponse({
    handle: ctx.handle,
    message: ctx.message,
    platform: ctx.platform,
    type: ctx.type,
    brandNiche: ctx.brandNiche,
    brandTone: ctx.brandTone,
    maxChars: ctx.type === 'comment' ? 300 : 1000,
  });

  // 5. Learn from interaction
  await cortex.ingest({
    type: 'message',
    content: `Reply to @${ctx.handle}: ${response.text}`,
    importance: response.confidence,
    entity: ctx.handle,
    tags: [ctx.type, ctx.platform, response.tone],
  });

  return {
    text: response.text,
    shouldReply: true,
    confidence: response.confidence,
    reasoning: response.why,
    personalityApplied: true,
    sources: ['human-response', 'community-manager'],
  };
};

// ── Quick reply for whitelist intents ──────────────────────────────────────

export const quickBrainReply = async (ctx: ExistingAutoReplyContext): Promise<string | null> => {
  const safeIntents = ['saludo', 'pregunta-info', 'feedback-positivo', 'consulta-tecnica'];
  if (!safeIntents.includes(ctx.intent)) return null;

  const result = await enrichAutoReply(ctx);
  return result?.shouldReply ? result.text : null;
};
