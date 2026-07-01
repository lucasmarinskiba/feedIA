/**
 * Brain AutoPilot — Autopiloto cerebral que conecta con DM/Comment/Post systems
 * El cerebro toma el control de las respuestas automáticas existentes
 * y las enriquece con memoria, personalidad, y respuestas humanas.
 */

import { log } from '../../agent/logger.js';
import * as cortex from './cortex.js';
import * as humanResponse from '../community/humanResponse.js';
import * as community from '../community/communityManager.js';
import * as stalker from '../community/stalkerTracker.js';
import * as personality from '../reasoning/personalityEngine.js';
import * as decision from '../actuators/decisionActuator.js';

export interface AutoPilotMessage {
  id: string;
  handle: string;
  text: string;
  platform: 'instagram' | 'tiktok' | 'twitter';
  type: 'comment' | 'dm' | 'story_reply';
  timestamp: string;
  threadHistory?: { role: 'user' | 'bot'; text: string }[];
}

export interface AutoPilotResult {
  messageId: string;
  action: 'reply' | 'escalate' | 'ignore' | 'store';
  replyText?: string;
  confidence: number;
  reasoning: string[];
  sources: string[];
}

// ── Main autopilot handler ─────────────────────────────────────────────────

export const handleMessage = async (
  msg: AutoPilotMessage,
  brand: { name: string; niche: string; tone: string[] },
): Promise<AutoPilotResult> => {
  const reasoning: string[] = [];

  // 1. Track in community manager
  await community.trackInteraction(msg.handle, msg.text, 'inbound', msg.platform);

  // 2. Classify user
  const stalkerProfile = stalker.getIntelBrief(msg.handle);
  if (stalkerProfile) {
    reasoning.push(`Usuario clasificado: ${stalkerProfile.type}`);
    if (stalkerProfile.type === 'bot') {
      return {
        messageId: msg.id,
        action: 'ignore',
        confidence: 0.9,
        reasoning: [...reasoning, 'Bot detectado, ignorar'],
        sources: ['stalker-tracker'],
      };
    }
    if (stalkerProfile.type === 'troll' && stalkerProfile.riskLevel === 'high') {
      return {
        messageId: msg.id,
        action: 'escalate',
        confidence: 0.85,
        reasoning: [...reasoning, 'Troll de alto riesgo'],
        sources: ['stalker-tracker'],
      };
    }
  }

  // 3. Check escalation rules
  const { shouldEscalate } = await import('../actuators/decisionActuator.js');
  const escalation = await shouldEscalate(msg.text, 'general', 'neutral', msg.handle);
  if (escalation.escalate) {
    reasoning.push(`Escalamiento: ${escalation.reason}`);
    return {
      messageId: msg.id,
      action: 'escalate',
      confidence: escalation.urgency,
      reasoning,
      sources: ['decision-actuator'],
    };
  }

  // 4. Generate human response
  const response = await humanResponse.craftHumanResponse({
    handle: msg.handle,
    message: msg.text,
    platform: msg.platform,
    type: msg.type,
    brandNiche: brand.niche,
    brandTone: brand.voice?.tone,
    maxChars: msg.type === 'comment' ? 300 : 1000,
  });

  reasoning.push(`Respuesta generada: ${response.tone}`);
  reasoning.push(`Confianza: ${(response.confidence * 100).toFixed(0)}%`);

  // 5. Decide if we should reply or store for later
  const { makeDecision } = await import('../actuators/decisionActuator.js');
  const actionDecision = await makeDecision({
    type: 'reply',
    options: ['reply-now', 'reply-later', 'ignore'],
    context: { confidence: response.confidence, sentiment: response.tone },
    niche: brand.niche,
    brandName: brand.name,
  });

  const action =
    actionDecision.chosen === 'reply-now' ? 'reply' : actionDecision.chosen === 'reply-later' ? 'store' : 'ignore';

  if (action === 'reply') {
    // Store the outbound interaction
    await community.trackInteraction(msg.handle, response.text, 'outbound', msg.platform);
  }

  // 6. Learn from this interaction
  personality.learnPersonality(msg.handle, [
    ...(msg.threadHistory ?? []),
    { role: 'user', text: msg.text },
    ...(action === 'reply' ? [{ role: 'bot' as const, text: response.text }] : []),
  ]);

  await cortex.ingest({
    type: 'message',
    content: `${msg.handle}: ${msg.text} → ${action}`,
    importance: response.confidence,
    entity: msg.handle,
    tags: [msg.type, msg.platform, response.tone],
  });

  log.info(`[AutoPilot] ${msg.id}: ${action} to @${msg.handle} (conf=${response.confidence.toFixed(2)})`);

  return {
    messageId: msg.id,
    action,
    replyText: action === 'reply' ? response.text : undefined,
    confidence: response.confidence,
    reasoning,
    sources: ['human-response', 'community-manager', 'decision-actuator'],
  };
};

// ── Batch process messages ─────────────────────────────────────────────────

export const processBatch = async (
  messages: AutoPilotMessage[],
  brand: { name: string; niche: string; tone: string[] },
): Promise<AutoPilotResult[]> => {
  const results: AutoPilotResult[] = [];
  for (const msg of messages) {
    const result = await handleMessage(msg, brand);
    results.push(result);
  }
  return results;
};

// ── Auto-pilot stats ───────────────────────────────────────────────────────

export const getAutoPilotStats = (): {
  totalProcessed: number;
  replies: number;
  escalations: number;
  ignored: number;
  avgConfidence: number;
} => {
  // In a real system, this would query the brain memory
  return { totalProcessed: 0, replies: 0, escalations: 0, ignored: 0, avgConfidence: 0 };
};
