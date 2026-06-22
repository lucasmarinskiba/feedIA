/**
 * Conversational Router — Decision Engine
 * ─────────────────────────────────────────────────────────────────────────
 * The "router" sits between the bot's incoming DM/comment ingestion and
 * the response generation. For every message it returns a structured
 * RoutingDecision that downstream code (bot/index.ts, inbox UI, nurture
 * enrollment) can act on without re-doing classification.
 *
 * Decision flow:
 *   1. Intent detection (deterministic, sub-ms)
 *   2. If FAQ match exists with high similarity → return FAQ answer
 *   3. Otherwise build a structured decision based on the intent's policy
 *
 * This is the "Automatización de Conversión de Comunidad" core.
 */

import { detectIntent, type IntentDetection, type ConversationIntent, type ReplyPolicy } from './intents.js';
import { matchFaq, type FaqEntry } from './faqStore.js';

export type ResponseAction =
  | 'faq-answer'
  | 'qualify-prospect'
  | 'enroll-nurture'
  | 'escalate-to-sales'
  | 'escalate-to-human'
  | 'route-to-collab'
  | 'drop-silently'
  | 'thank-quick'
  | 'llm-fallback';

export interface RoutingDecision {
  detectedIntent: ConversationIntent;
  intentConfidence: number;
  policy: ReplyPolicy;
  action: ResponseAction;
  /** Pre-built answer if FAQ matched — otherwise null and LLM/template must fill. */
  suggestedReply: string | null;
  /** Source of the suggested reply if any. */
  source: 'faq' | 'template' | 'llm-pending' | 'none';
  /** Useful debug info for the dashboard. */
  signals: string[];
  faqMatch?: { entryId: string; topic: string; similarity: number };
  /** Whether this should produce a checkpoint for human review before sending. */
  requiresApproval: boolean;
}

/* ──────────────────────────────────────────────────────────────────────── */

const TEMPLATE_REPLIES: Partial<Record<ResponseAction, string>> = {
  'thank-quick':
    '¡Gracias por escribir! 🙌 Si te interesa profundizar en algo del contenido, contame y te paso recursos.',
  'drop-silently': '',
};

const actionFromPolicy = (policy: ReplyPolicy): ResponseAction => {
  switch (policy) {
    case 'qualify-via-questions':
      return 'qualify-prospect';
    case 'enroll-nurture':
      return 'enroll-nurture';
    case 'escalate-to-sales':
      return 'escalate-to-sales';
    case 'escalate-to-human':
      return 'escalate-to-human';
    case 'route-to-collab':
      return 'route-to-collab';
    case 'drop-silently':
      return 'drop-silently';
    case 'send-faq-link':
      return 'faq-answer';
    case 'ack-thank':
      return 'thank-quick';
    case 'auto-reply-template':
      return 'llm-fallback';
    default:
      return 'llm-fallback';
  }
};

/**
 * Run the router. Pure function — does NOT call the LLM, does NOT mutate
 * external state besides incrementing FAQ hits via matchFaq.
 */
export const routeMessage = (text: string): RoutingDecision => {
  const detection: IntentDetection = detectIntent(text);

  // Step 1: try FAQ match first if the intent is one that FAQs serve well.
  const faqEligible: ConversationIntent[] = ['support', 'content-ask', 'lead-warm', 'unknown'];
  const faqHit = faqEligible.includes(detection.intent) ? matchFaq(text, 0.4) : null;

  if (faqHit) {
    return {
      detectedIntent: detection.intent,
      intentConfidence: detection.confidence,
      policy: detection.policy,
      action: 'faq-answer',
      suggestedReply: faqHit.entry.answer,
      source: 'faq',
      signals: [...detection.signals, `FAQ match: ${faqHit.entry.topic} (sim=${faqHit.similarity})`],
      faqMatch: {
        entryId: faqHit.entry.id,
        topic: faqHit.entry.topic,
        similarity: faqHit.similarity,
      },
      requiresApproval: false,
    };
  }

  // Step 2: policy → action mapping.
  const action = actionFromPolicy(detection.policy);
  const templateReply = TEMPLATE_REPLIES[action] ?? null;

  // Step 3: decide whether human approval is required.
  const requiresApproval =
    detection.shouldEscalateToHuman ||
    detection.intent === 'complaint' ||
    detection.intent === 'collab' ||
    (detection.intent === 'lead-qualified' && detection.confidence < 0.7);

  return {
    detectedIntent: detection.intent,
    intentConfidence: detection.confidence,
    policy: detection.policy,
    action,
    suggestedReply: templateReply,
    source: templateReply !== null ? 'template' : 'llm-pending',
    signals: detection.signals,
    requiresApproval,
  };
};

/* ──────────────────────────────────────────────────────────────────────── */

export interface RouterMetrics {
  totalRouted: number;
  byIntent: Record<ConversationIntent, number>;
  byAction: Record<ResponseAction, number>;
  faqHitRate: number;
  escalationRate: number;
}

/** Aggregate metrics for a batch of decisions — useful for the dashboard. */
export const aggregateMetrics = (decisions: RoutingDecision[]): RouterMetrics => {
  const byIntent = Object.fromEntries(
    [
      'lead-qualified',
      'lead-warm',
      'support',
      'complaint',
      'collab',
      'spam',
      'compliment',
      'content-ask',
      'off-topic',
      'unknown',
    ].map((k) => [k, 0]),
  ) as Record<ConversationIntent, number>;
  const byAction = Object.fromEntries(
    [
      'faq-answer',
      'qualify-prospect',
      'enroll-nurture',
      'escalate-to-sales',
      'escalate-to-human',
      'route-to-collab',
      'drop-silently',
      'thank-quick',
      'llm-fallback',
    ].map((k) => [k, 0]),
  ) as Record<ResponseAction, number>;

  let faqHits = 0;
  let escalations = 0;
  for (const d of decisions) {
    byIntent[d.detectedIntent] = (byIntent[d.detectedIntent] ?? 0) + 1;
    byAction[d.action] = (byAction[d.action] ?? 0) + 1;
    if (d.action === 'faq-answer') faqHits += 1;
    if (d.action === 'escalate-to-human' || d.requiresApproval) escalations += 1;
  }

  const total = decisions.length || 1;
  return {
    totalRouted: decisions.length,
    byIntent,
    byAction,
    faqHitRate: +(faqHits / total).toFixed(3),
    escalationRate: +(escalations / total).toFixed(3),
  };
};

export type { FaqEntry };
