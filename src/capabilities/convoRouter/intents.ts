/**
 * Conversational Router — Intent Detection
 * ─────────────────────────────────────────────────────────────────────────
 * Deterministic intent classification for incoming DMs and comments. Runs
 * BEFORE the LLM so 80% of conversations are handled with zero token cost
 * and predictable latency. The remaining 20% (low-confidence) get escalated
 * to LLM intent classification.
 *
 * Intents map to downstream policies:
 *   • lead-qualified  → Sales agent + auto-qualify questions
 *   • lead-warm       → Sales agent + nurture sequence
 *   • support         → Customer Support flow, FAQ matcher first
 *   • complaint       → Crisis sub-system + escalate to human
 *   • collab          → Collab Manager flow
 *   • spam            → Drop silently
 *   • compliment      → Quick gracias + boost engagement
 *   • content-ask     → Repurpose/recommend content
 *   • off-topic       → Polite redirect or close
 *   • unknown         → Pass to LLM for fallback handling
 */

export type ConversationIntent =
  | 'lead-qualified'
  | 'lead-warm'
  | 'support'
  | 'complaint'
  | 'collab'
  | 'spam'
  | 'compliment'
  | 'content-ask'
  | 'scheduling'
  | 'off-topic'
  | 'unknown';

export interface IntentDetection {
  intent: ConversationIntent;
  confidence: number; // 0–1
  signals: string[];
  shouldEscalateToHuman: boolean;
  /** If known, the canonical reply policy to apply. */
  policy: ReplyPolicy;
}

export type ReplyPolicy =
  | 'auto-reply-template'
  | 'qualify-via-questions'
  | 'enroll-nurture'
  | 'escalate-to-sales'
  | 'escalate-to-human'
  | 'route-to-collab'
  | 'route-to-calendar'
  | 'drop-silently'
  | 'send-faq-link'
  | 'ack-thank';

interface PatternRule {
  intent: ConversationIntent;
  policy: ReplyPolicy;
  weight: number;
  patterns: RegExp[];
  needsHuman?: boolean;
}

const RULES: PatternRule[] = [
  // ── lead-qualified: ready-to-buy signals ────────────────────────────
  {
    intent: 'lead-qualified',
    policy: 'qualify-via-questions',
    weight: 1.0,
    patterns: [
      /\b(precio|cuánto|cuanto|cotización|cotizar|presupuesto)\b/i,
      /\b(quiero contratar|quiero comprar|me interesa contratar)\b/i,
      /\bpagar\b/i,
      /\bcuota|cuotas|financiación\b/i,
    ],
  },
  // ── lead-warm: curiosity but not yet ready ──────────────────────────
  {
    intent: 'lead-warm',
    policy: 'enroll-nurture',
    weight: 0.7,
    patterns: [
      /\b(cómo funciona|cómo es|qué incluye|me interesa)\b/i,
      /\b(más info|más información|info)\b/i,
      /\b(servicio|servicios|producto)\b/i,
    ],
  },
  // ── collab: brands/creators offering partnership ────────────────────
  {
    intent: 'collab',
    policy: 'route-to-collab',
    weight: 1.0,
    patterns: [
      /\bcolaboración|colaborar|collab\b/i,
      /\b(propuesta|propuesta de marca|partnership)\b/i,
      /\bcanje|intercambio\b/i,
      /\bsponsor|patrocinio\b/i,
      /\bembajador|embajadora\b/i,
    ],
  },
  // ── complaint: anger/frustration ────────────────────────────────────
  {
    intent: 'complaint',
    policy: 'escalate-to-human',
    weight: 1.0,
    needsHuman: true,
    patterns: [
      /\b(reclamo|queja|denuncia|denunciar)\b/i,
      /\b(estafa|fraude|engaño|engañar)\b/i,
      /\b(asco|pésimo|terrible|horrible|nunca más)\b/i,
      /\b(devolver|devolución|reembolso|reembolsar)\b/i,
      /\b(no funciona|no funcionó|no me llegó|no recibí)\b/i,
    ],
  },
  // ── support: how-to questions about existing service ────────────────
  {
    intent: 'support',
    policy: 'send-faq-link',
    weight: 0.8,
    patterns: [
      /\bcómo (uso|accedo|entro|acceso|recupero|cambio)\b/i,
      /\b(contraseña|password|login|sesión)\b/i,
      /\bfactura|comprobante|recibo\b/i,
      /\benvío|envíos|tracking|seguimiento\b/i,
      /\bayuda|soporte|support\b/i,
    ],
  },
  // ── content-ask: requests for more content or repurpose ────────────
  {
    intent: 'content-ask',
    policy: 'auto-reply-template',
    weight: 0.6,
    patterns: [
      /\b(podrías hacer|podes hacer|hacé un|hagan un|harías)\b/i,
      /\b(tutorial|guía|video sobre|carrusel sobre)\b/i,
      /\b(recomendá|recomendame|recomiéndame)\b/i,
    ],
  },
  // ── compliment: positive feedback ───────────────────────────────────
  {
    intent: 'compliment',
    policy: 'ack-thank',
    weight: 0.5,
    patterns: [
      /\b(genial|excelente|crack|grosa|grosso|increíble|me encantó|me encanta)\b/i,
      /\b(gracias|thank you|merci)\b/i,
      /\b(amo|amé|fan)\b/i,
      /❤️|🔥|🙌|👏/,
    ],
  },
  // ── spam: bot-like patterns ─────────────────────────────────────────
  {
    intent: 'spam',
    policy: 'drop-silently',
    weight: 1.0,
    patterns: [
      /\b(invertir|inversión|btc|bitcoin|trading|broker)\b/i,
      /\b(ganá|gana)\s+\$\s*\d{3,}/i,
      /https?:\/\/\S+\.(ru|cn|tk)\b/i,
      /\b(seguidores garantizados|comprar seguidores|likes baratos)\b/i,
      /\b(only fans|onlyfans)\b/i,
    ],
  },
  // ── scheduling: user wants to schedule post, reminder, meeting, call ──
  {
    intent: 'scheduling',
    policy: 'route-to-calendar',
    weight: 0.85,
    patterns: [
      /\b(agendar|programar|schedule|programá|agendá)\b/i,
      /\b(recordatorio|reminder|remind me)\b/i,
      /\b(mañana a las|el próximo|próxima|cuando|que día)\b/i,
      /\b(reunión|meeting|llamada|call|junta)\b/i,
      /\b(visita|encuentro|evento|cita)\b/i,
      /\b(publicar.*mañana|subir.*hoy|postear.*cuando)\b/i,
    ],
  },
  // ── off-topic: clearly not about the brand ──────────────────────────
  {
    intent: 'off-topic',
    policy: 'auto-reply-template',
    weight: 0.3,
    patterns: [/\b(política|elecciones|gobierno|presidente)\b/i, /\b(fútbol|messi|river|boca)\b/i],
  },
];

/**
 * Run the deterministic intent classifier. Returns the highest-scoring
 * intent + signals + recommended policy.
 */
export const detectIntent = (text: string): IntentDetection => {
  if (!text || text.trim().length === 0) {
    return {
      intent: 'unknown',
      confidence: 0,
      signals: ['mensaje vacío'],
      shouldEscalateToHuman: false,
      policy: 'auto-reply-template',
    };
  }

  const scores = new Map<
    ConversationIntent,
    { score: number; signals: string[]; policy: ReplyPolicy; needsHuman?: boolean }
  >();

  for (const rule of RULES) {
    let hits = 0;
    const matched: string[] = [];
    for (const p of rule.patterns) {
      const m = text.match(p);
      if (m) {
        hits += 1;
        matched.push(m[0]);
      }
    }
    if (hits > 0) {
      const prev = scores.get(rule.intent);
      const score = (prev?.score ?? 0) + hits * rule.weight;
      const sigs = [...(prev?.signals ?? []), ...matched.slice(0, 2).map((m) => `match: ${m}`)];
      scores.set(rule.intent, {
        score,
        signals: sigs,
        policy: rule.policy,
        needsHuman: rule.needsHuman || prev?.needsHuman,
      });
    }
  }

  if (scores.size === 0) {
    return {
      intent: 'unknown',
      confidence: 0.2,
      signals: ['sin patrones reconocidos'],
      shouldEscalateToHuman: false,
      policy: 'auto-reply-template',
    };
  }

  // Pick highest score, with deterministic tie-break by priority order.
  const priority: ConversationIntent[] = [
    'complaint',
    'lead-qualified',
    'collab',
    'spam',
    'lead-warm',
    'support',
    'scheduling',
    'content-ask',
    'compliment',
    'off-topic',
    'unknown',
  ];
  let best: {
    intent: ConversationIntent;
    score: number;
    signals: string[];
    policy: ReplyPolicy;
    needsHuman?: boolean;
  } | null = null;
  for (const intent of priority) {
    const r = scores.get(intent);
    if (!r) continue;
    if (!best || r.score > best.score) best = { intent, ...r };
  }

  const confidence = Math.min(1, best!.score / 2.5);

  return {
    intent: best!.intent,
    confidence: +confidence.toFixed(2),
    signals: best!.signals,
    shouldEscalateToHuman: Boolean(best!.needsHuman) || (best!.intent === 'lead-qualified' && confidence < 0.5),
    policy: best!.policy,
  };
};
