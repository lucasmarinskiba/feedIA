/**
 * Community Engine — DM + comment auto-response.
 *
 * Wirea las templates muertas (`any_dm_response` + `any_comment_reply`) de
 * `_promptLibrary.js` con un clasificador de intent + generador de respuesta
 * personalizada por archetype + voz de la cuenta.
 *
 * Endpoints:
 *   POST /api/community/dm/respond
 *   POST /api/community/comment/respond
 *   POST /api/community/classify (intent only, sin generar respuesta)
 *
 * Output: { intent, reply, suggestedAction, archetype }
 */

import { askLLMJson } from './_llm.js';
import { buildPriming } from './_promptLibrary.js';
import { getProfile, recordPlan } from './_accountMemory.js';

// ── Clasificador de intent (heurístico primero, LLM como fallback) ───────────
const PATTERNS = {
  spam: /promociona|gana \$|click aqui|http[s]?:\/\/[^\s]+\.(ru|cn|tk|ml|ga|cf)|crypto.*urgent|free.*money|whatsapp \+\d{10,}/i,
  troll: /^(jaja|jeje|asco|basura|porqueria|kk|cringe|que mier)/i,
  lead_warm:
    /interes|precio|cuanto|cuándo|cómo lo compro|me anoto|quiero|sumarme|comprar|adquirir|comenzar|info|información|registr|inscrib|cupo/i,
  curiosity: /\?$|cómo|como|por qué|porque |que pasa|qué pasa|alguien sabe|me cuentan|funciona/i,
  support: /no funciona|error|problema|no me anda|ayuda|no entiendo|me confund|bug|falla|no llegó/i,
  compliment: /grosso|crack|genio|excelente|impecable|amo|me encanta|bestial|brillante|wow|gracias por|admiro/i,
};

export const classifyIntent = (text = '') => {
  const t = text.toLowerCase().trim();
  if (!t) return { intent: 'empty', confidence: 1 };
  // Reglas en orden de severidad
  for (const [intent, pattern] of Object.entries(PATTERNS)) {
    if (pattern.test(t)) return { intent, confidence: 0.85, method: 'heuristic' };
  }
  // Si nada matchea → "neutral" (responder amablemente)
  return { intent: 'neutral', confidence: 0.5, method: 'fallback' };
};

// LLM-based classify (más preciso si el heurístico falla)
const classifyIntentLLM = async (text) => {
  if (!text || text.length < 3) return null;
  const prompt = `Clasificá la intención de este mensaje de Instagram/TikTok en UNA categoría:
"${text.slice(0, 400)}"

Categorías: lead_warm (quiere comprar/anotarse) | curiosity (pregunta/curiosidad) | support (necesita ayuda) | spam | troll | compliment (elogio).

SOLO JSON: {"intent":"...","confidence":0.0-1.0,"reasoning":"1 oración"}`;
  return await askLLMJson(prompt).catch(() => null);
};

// ── Generador de respuesta DM ─────────────────────────────────────────────────
export const respondDM = async ({
  scope = 'anon',
  accountId = '',
  message = '',
  senderHandle = '',
  archetypeOverride = null,
} = {}) => {
  if (!message || message.trim().length < 2) return { error: 'empty-message' };

  // 1. Intent (heurístico, opcional LLM si baja confianza)
  let intentResult = classifyIntent(message);
  if (intentResult.confidence < 0.6) {
    const llmIntent = await classifyIntentLLM(message);
    if (llmIntent?.intent) intentResult = { ...llmIntent, method: 'llm' };
  }

  // 2. Si spam/troll → ignorar sin gastar LLM
  if (intentResult.intent === 'spam' || intentResult.intent === 'troll') {
    return {
      intent: intentResult.intent,
      reply: null,
      suggestedAction: 'ignore',
      reasoning: 'Spam/troll detectado, no responder ahorra tiempo y reputación',
    };
  }

  // 3. Cargar profile para archetype + voz
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const archetype = archetypeOverride || profile?.voice || 'cercano';

  // 4. Priming desde la biblioteca
  const { priming } = buildPriming('any_dm_response', {
    context: message.slice(0, 500),
    intent: intentResult.intent,
    archetype,
  });

  // 5. Generar respuesta
  const prompt = `${priming}

${senderHandle ? `Sender handle: ${senderHandle}` : 'Sin handle del sender'}.
Profile de la cuenta: ${profile?.handle ? `@${profile.handle}` : 'sin handle'}. Nicho: ${profile?.niche || 'general'}. Tipo: ${profile?.brandType || 'personal'}.

DEVOLVÉ SOLO JSON:
{
  "reply": "respuesta lista para pegar (max 4 oraciones, voz natural)",
  "suggestedAction": "send|escalate-to-human|tag-as-lead|ask-followup",
  "tone": "cordial|directo|emocional|profesional",
  "personalization_used": "qué del mensaje original usaste para personalizar (1 oración)"
}`;

  const out = await askLLMJson(prompt).catch(() => null);

  // 6. Registrar en memoria
  if (accountId) {
    await recordPlan(scope, accountId, {
      type: 'community-reply',
      channel: 'dm',
      intent: intentResult.intent,
      messageSnippet: message.slice(0, 100),
      at: new Date().toISOString(),
    }).catch(() => {});
  }

  return {
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    method: intentResult.method,
    reply: out?.reply || fallbackReply(intentResult.intent, message),
    suggestedAction: out?.suggestedAction || (intentResult.intent === 'lead_warm' ? 'tag-as-lead' : 'send'),
    tone: out?.tone || 'cordial',
    personalization_used: out?.personalization_used || null,
    archetype,
  };
};

// ── Generador de respuesta a comentario ──────────────────────────────────────
export const respondComment = async ({
  scope = 'anon',
  accountId = '',
  comment = '',
  postContext = '',
  archetypeOverride = null,
} = {}) => {
  if (!comment || comment.trim().length < 2) return { error: 'empty-comment' };

  let intentResult = classifyIntent(comment);
  if (intentResult.confidence < 0.6) {
    const llmIntent = await classifyIntentLLM(comment);
    if (llmIntent?.intent) intentResult = { ...llmIntent, method: 'llm' };
  }

  if (intentResult.intent === 'spam' || intentResult.intent === 'troll') {
    return {
      intent: intentResult.intent,
      reply: null,
      suggestedAction: intentResult.intent === 'spam' ? 'delete-and-block' : 'ignore-or-delete',
    };
  }

  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const archetype = archetypeOverride || profile?.voice || 'cercano';

  const { priming } = buildPriming('any_comment_reply', {
    comment: comment.slice(0, 300),
    archetype,
  });

  const prompt = `${priming}

${postContext ? `Contexto del post: ${postContext.slice(0, 300)}` : ''}
Intent detectado: ${intentResult.intent}.

SOLO JSON:
{
  "reply": "respuesta listo para pegar (max 2 oraciones, generá conversación)",
  "suggestedAction": "send|pin|like-only|hide",
  "shouldTagPersonalDM": false
}`;

  const out = await askLLMJson(prompt).catch(() => null);

  if (accountId) {
    await recordPlan(scope, accountId, {
      type: 'community-reply',
      channel: 'comment',
      intent: intentResult.intent,
      commentSnippet: comment.slice(0, 100),
      at: new Date().toISOString(),
    }).catch(() => {});
  }

  return {
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    reply: out?.reply || fallbackReply(intentResult.intent, comment, 'comment'),
    suggestedAction: out?.suggestedAction || 'send',
    shouldTagPersonalDM: Boolean(out?.shouldTagPersonalDM),
    archetype,
  };
};

// ── Fallback determinista (si LLM falla) ─────────────────────────────────────
const fallbackReply = (intent, original, channel = 'dm') => {
  const snippet = original.slice(0, 30);
  const map = {
    lead_warm:
      channel === 'dm'
        ? '¡Genial que te interese! Mandame "INFO" por DM y te paso todos los detalles, sin compromiso.'
        : 'Buenísimo que te interese. Te escribo por DM con los detalles 💜',
    curiosity:
      channel === 'dm'
        ? 'Buena pregunta. Te respondo: depende un poco de tu caso, ¿me contás más para responderte específico?'
        : '¡Buena pregunta! Quedate atento al próximo post que ahí lo desarrollo 👀',
    support: 'Lamento que te haya pasado. Contame qué exactamente está fallando y lo resolvemos juntos 🙏',
    compliment: '¡Gracias! Significa mucho 💜 ¿Qué fue lo que más te sirvió?',
    neutral: '¡Gracias por escribir! ¿En qué te puedo ayudar específicamente?',
  };
  return map[intent] || map.neutral;
};

// ── HTTP handler ──────────────────────────────────────────────────────────────
export const handleCommunityEngine = async (req, res, path, m, body, ctx = {}) => {
  const scope = ctx.userId || 'anon';
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/community/dm/respond' && m === 'POST') {
    try {
      const result = await respondDM({
        scope,
        accountId: body?.accountId || '',
        message: body?.message || '',
        senderHandle: body?.senderHandle || '',
        archetypeOverride: body?.archetype || null,
      });
      if (ctx.userId) {
        import('./_achievements.js').then(a => a.onDmReplied(ctx.userId)).catch(() => {});
      }
      return json(200, { ok: true, ...result });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }

  if (path === '/api/community/comment/respond' && m === 'POST') {
    try {
      const result = await respondComment({
        scope,
        accountId: body?.accountId || '',
        comment: body?.comment || '',
        postContext: body?.postContext || '',
        archetypeOverride: body?.archetype || null,
      });
      return json(200, { ok: true, ...result });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }

  if (path === '/api/community/classify' && m === 'POST') {
    const result = classifyIntent(body?.text || '');
    return json(200, { ok: true, ...result });
  }

  return false;
};
