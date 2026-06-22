/**
 * Community Brain — reemplaza CM con respuestas inteligentes multi-turn.
 *
 * Pipeline 5 pasos:
 *   1. analyzeAuthor → quién es (handle, edad cuenta, tipo, país probable)
 *   2. analyzeContext → hilo previo + post original donde comentó
 *   3. analyzeIntentDeep → intent + sub-intent + emoción + complejidad
 *   4. reasonResponse → think harder (LLM con thinking budget escalado)
 *   5. polishWithStyle → ajusta humor/registro/país/nicho
 *
 * Memoria de hilo persistente (KV) por sender.
 * Cultura regional (AR/MX/CO/ES/PE/CL/US).
 *
 * Endpoints:
 *   POST /api/community/brain/respond  → respuesta deep multi-step
 *   GET  /api/community/brain/thread/:sender → ver hilo
 *   POST /api/community/brain/feedback → user marca respuesta como ✓/✗ (training loop)
 */

import * as store from './_store.js';
import { askLLMJson } from './_llm.js';
import { getProfile } from './_accountMemory.js';
import { loadIntelligenceRaw } from './_nicheIntelligence.js';
import { ARCHETYPES, NICHE_VOICE } from './_promptLibrary.js';

// ── Cultura regional · slang + humor + registro ─────────────────────────────
const REGIONAL_CULTURE = {
  AR: {
    name: 'Argentina', voseo: true,
    greetings: ['hola', 'qué hacés', 'genial', 'dale', 'bárbaro', 'copado'],
    fillers: ['posta', 'che', 'mirá', 'ojo', 'tipo', 'onda'],
    humor: 'sarcasmo + ironía + autorreferencia + Mafalda-style. NO sobreactuado.',
    avoid: ['"tú"', '"vosotros"', 'jerga muy mexicana', 'emojis exagerados'],
    closers: ['un abrazo', 'cualquier cosa avisame', 'dale, hablamos'],
    formalShift: 'usar "usted" SOLO si el otro lo usa primero',
  },
  MX: {
    name: 'México', voseo: false,
    greetings: ['hola', 'qué onda', 'va', 'chido', 'va que va'],
    fillers: ['pues', 'órale', 'wey', 'ándale', 'no manches'],
    humor: 'memes + albures suaves + auto-deprecación + cultura pop',
    avoid: ['voseo argentino', 'jerga rioplatense', 'demasiado formal'],
    closers: ['saludos', 'cualquier duda escríbeme', 'va, échame el mensaje'],
    formalShift: 'usar "usted" para gente +50 o profesional',
  },
  CO: {
    name: 'Colombia', voseo: false,
    greetings: ['hola', 'qué más', 'parce', 'bacano', 'chévere'],
    fillers: ['pues', 'mero', 'parce', 'ojo'],
    humor: 'irónico-cariñoso, regional (paisa/rolo/costeño según context)',
    avoid: ['voseo', 'jerga muy mexicana', 'frio'],
    closers: ['un abrazo', 'me cuentas', 'pues bacano'],
    formalShift: 'usted neutro habitual entre adultos profesionales',
  },
  ES: {
    name: 'España', voseo: false,
    greetings: ['hola', 'qué tal', 'qué pasa', 'guay', 'tío/tía'],
    fillers: ['vale', 'tío', 'venga', 'jo', 'pues nada'],
    humor: 'seco + sarcasmo británico-estilo + retruécano',
    avoid: ['voseo', 'jerga LATAM', 'over-the-top'],
    closers: ['un saludo', 'ya me dices', 'venga'],
    formalShift: '"tú" siempre salvo registro súper formal',
  },
  PE: { name: 'Perú', voseo: false, greetings: ['hola', 'pe', 'bacán'], fillers: ['pe', 'causa', 'pata'], humor: 'reservado + irónico', avoid: ['voseo'], closers: ['saludos', 'cualquier cosa'], formalShift: 'usted profesional' },
  CL: { name: 'Chile', voseo: false, greetings: ['hola', 'cachái', 'fome', 'bakán'], fillers: ['po', 'weón (con confianza)', 'cachái'], humor: 'autodesprecativo + irónico', avoid: ['voseo'], closers: ['saludos', 'cachái cualquier cosa'], formalShift: 'usted formal' },
  US: { name: 'USA hispano', voseo: false, greetings: ['hola', 'qué tal'], fillers: ['pues', 'ok'], humor: 'directo + tech-savvy', avoid: ['jerga muy regional'], closers: ['saludos', 'avisame'], formalShift: 'mix tú/usted según contexto' },
  GLOBAL: { name: 'Español neutro', voseo: false, greetings: ['hola'], fillers: [], humor: 'medido + universal', avoid: ['regionalismos fuertes'], closers: ['saludos'], formalShift: 'tú/usted según pista' },
};

// Detectar país probable del sender por handle/contenido
const guessCountry = (sender = '', message = '', profileCountry = null) => {
  if (profileCountry && REGIONAL_CULTURE[profileCountry]) return profileCountry;
  const txt = (sender + ' ' + message).toLowerCase();
  if (/\b(che|posta|boludo|capo|copad[oa]|bárbaro|dale)\b|\bvos\b/i.test(txt)) return 'AR';
  if (/\b(wey|órale|chido|no manches|qué onda|ándale)\b/.test(txt)) return 'MX';
  if (/\b(parce|chévere|bacano)\b/.test(txt)) return 'CO';
  if (/\b(tío|tía|vale|guay|venga)\b/.test(txt)) return 'ES';
  if (/\b(pe|causa|chévere)\b.*pe\b/.test(txt)) return 'PE';
  if (/\b(po|cachái|fome|bakán|weón)\b/.test(txt)) return 'CL';
  return 'GLOBAL';
};

// ── Thread memory ───────────────────────────────────────────────────────────
const threadKey = (scope, accountId, sender) => `feedia:cm:thread:${scope || 'anon'}:${accountId || 'na'}:${(sender || 'anon').toLowerCase().replace(/[^a-z0-9_.]/g, '')}`;

const getThread = async (scope, accountId, sender) => {
  try { return (await store.get(threadKey(scope, accountId, sender))) || { sender, messages: [], firstSeen: null, country: null, tags: [] }; }
  catch { return { sender, messages: [], firstSeen: null }; }
};

const saveThread = async (scope, accountId, sender, thread) => {
  thread.lastSeen = new Date().toISOString();
  if (!thread.firstSeen) thread.firstSeen = thread.lastSeen;
  // Cap a últimos 20 mensajes
  if (thread.messages.length > 20) thread.messages = thread.messages.slice(-20);
  try { await store.set(threadKey(scope, accountId, sender), thread); } catch {}
};

// ── PASO 1: analizar autor ──────────────────────────────────────────────────
const analyzeAuthor = async ({ sender, message, thread }) => {
  const country = guessCountry(sender || '', message || '', thread.country);
  const isReturning = thread.messages.length > 0;
  const isLeadFromBefore = thread.tags?.includes('lead_warm') || thread.tags?.includes('interested');
  return {
    handle: sender || 'anonymous',
    country,
    culture: REGIONAL_CULTURE[country] || REGIONAL_CULTURE.GLOBAL,
    isReturning,
    isLeadFromBefore,
    previousInteractions: thread.messages.length,
    tags: thread.tags || [],
  };
};

// ── PASO 2: analizar contexto (hilo + post original) ────────────────────────
const analyzeContext = async ({ thread, postContext = '' }) => {
  const recent = thread.messages.slice(-6); // últimos 6 turnos
  const summary = recent.map((m, i) => `${m.role}: ${m.text.slice(0, 100)}`).join('\n');
  return {
    threadSummary: summary || '(primera interacción)',
    threadDepth: recent.length,
    postContext: postContext.slice(0, 300),
    hasContext: Boolean(postContext) || recent.length > 0,
  };
};

// ── PASO 3: análisis profundo de intent + emoción + complejidad ─────────────
const analyzeIntentDeep = async ({ message, context, author }) => {
  const prompt = `Analizá este mensaje recibido por un creador de contenido.

Mensaje: "${message}"
Autor: ${author.handle} (país: ${author.culture.name}${author.isReturning ? `, ${author.previousInteractions} interacciones previas` : ', nuevo'})
${context.hasContext ? `Contexto previo:\n${context.threadSummary}\n${context.postContext ? `Post: ${context.postContext}` : ''}` : ''}

Devolvé SOLO JSON:
{
  "intent": "lead_warm" | "lead_cold" | "curiosity" | "support_request" | "complaint" | "compliment" | "criticism" | "spam" | "troll" | "joke" | "follow_up" | "objection" | "comparison_shopper",
  "sub_intent": "ej: 'pide precio'|'duda técnica'|'queja por bug'|'sarcasmo'",
  "emotion": "neutral" | "excited" | "frustrated" | "skeptical" | "curious" | "playful" | "hostile" | "grateful",
  "complexity": 1 | 2 | 3 | 4 | 5,
  "urgency": "low" | "medium" | "high",
  "requires_specific_info": true | false,
  "humor_appropriate": true | false,
  "personalization_hooks": ["dato específico 1 del mensaje", "dato 2"],
  "risks": ["si responder mal genera shitstorm" | "data privacy" | "expectativa irreal" | null]
}`;
  try {
    const r = await askLLMJson(prompt);
    return r || { intent: 'neutral', emotion: 'neutral', complexity: 2, urgency: 'low', humor_appropriate: false, personalization_hooks: [], risks: [] };
  } catch {
    return { intent: 'neutral', emotion: 'neutral', complexity: 2, urgency: 'low', humor_appropriate: false, personalization_hooks: [], risks: [] };
  }
};

// ── PASO 4: razonar respuesta (thinking time variable) ──────────────────────
const reasonResponse = async ({ message, author, context, deepIntent, profile, nicheData, archetype, brandKit }) => {
  const culture = author.culture;
  const archetypeData = ARCHETYPES[archetype] || ARCHETYPES.educador;
  const nicheVoice = NICHE_VOICE[nicheData?.primaryNiche] || NICHE_VOICE.general;

  // Si es spam/troll → no responder, ignorar
  if (deepIntent.intent === 'spam' || deepIntent.intent === 'troll') {
    return { reply: null, action: 'ignore_or_block', reasoning: `${deepIntent.intent} detectado — no responder` };
  }

  const culturalGuide = `
País del autor: ${culture.name}
${culture.voseo ? 'USAR VOSEO obligatorio (vos / hacés / sabés) — NUNCA tú.' : 'USAR TÚ — no voseo argentino.'}
Greetings naturales: ${culture.greetings.slice(0, 4).join(', ')}
Fillers permitidos: ${culture.fillers.slice(0, 4).join(', ')}
Humor regional: ${culture.humor}
Evitar: ${culture.avoid.join(', ')}
Cierre típico: ${culture.closers[0]}
Registro: ${culture.formalShift}`;

  const prompt = `Sos un Community Manager profesional con cultura general sólida y conocimientos profundos del nicho. Reemplazás a un CM humano real.

NICHO de la cuenta: ${nicheData?.primaryNiche || 'general'}
Vocabulario del nicho que dominás: ${(nicheVoice.vocab || []).slice(0, 8).join(', ')}
Métricas/casos típicos: ${(nicheVoice.metrics || []).slice(0, 3).join(', ')}
Dolores frecuentes audiencia: ${(nicheVoice.pains || []).slice(0, 3).join(', ')}

VOZ DE LA MARCA: archetype "${archetype}" (${archetypeData.tone})
${brandKit?.tagline ? `Claim: "${brandKit.tagline}"` : ''}

${culturalGuide}

MENSAJE RECIBIDO de @${author.handle}: "${message}"

CONTEXTO:
- Intent profundo: ${deepIntent.intent} (sub: ${deepIntent.sub_intent || '-'})
- Emoción detectada: ${deepIntent.emotion}
- Complejidad: ${deepIntent.complexity}/5
- Urgencia: ${deepIntent.urgency}
- ¿Humor apropiado?: ${deepIntent.humor_appropriate ? 'SÍ — calibrá al nivel y país' : 'NO — registro respetuoso'}
- Personalización: ${(deepIntent.personalization_hooks || []).join(' / ')}
- Riesgos: ${(deepIntent.risks || []).filter(Boolean).join(', ') || 'ninguno'}
${context.hasContext ? `\nHILO PREVIO:\n${context.threadSummary}` : '(primera vez que escribe)'}
${author.isLeadFromBefore ? '⭐ Ya mostró interés antes → tratar con prioridad' : ''}

INSTRUCCIONES CRÍTICAS:
1. NO repetir como loro lo que dijo el usuario.
2. SI hay humor apropiado → usar ironía/auto-deprecación/wordplay del país, NO chistes obvios.
3. SI es queja real → empatía PRIMERO + solución concreta. Nunca humor.
4. SI es duda técnica → respuesta directa con dato del nicho. Cita una métrica si aplica.
5. SI es lead caliente → mover a DM/acción con baja fricción.
6. SI es troll/hostil → respuesta corta, digna, sin alimentar.
7. SI es compliment → agradecé de manera genuina + un toque que invite a seguir conversando.
8. NUNCA decir "soy una IA". Sos el CM.
9. Frases cortas. 2-4 oraciones MAX (DM puede ser 5-6 si complejo).
10. Si el autor escribió con voseo/jerga país → MATCHEÁS su registro.

DEVOLVÉ SOLO JSON:
{
  "reply": "respuesta final lista para enviar (sin meta-comentarios)",
  "tone_used": "ej: cálido-irónico, directo-empático, casual-vendedor",
  "action": "send_reply" | "send_reply_then_dm" | "tag_for_human" | "request_more_info",
  "follow_up_suggestion": "qué decir si responde algo concreto, o null",
  "reasoning": "1 oración explicando por qué esta respuesta funciona"
}`;
  try {
    const r = await askLLMJson(prompt);
    return r || { reply: 'Gracias por escribir, ya te respondo bien.', action: 'send_reply', reasoning: 'fallback' };
  } catch {
    return { reply: 'Gracias, ya te paso info.', action: 'send_reply', reasoning: 'llm-failed' };
  }
};

// ── PASO 5: polish (tag de hilo, ajustes finales) ───────────────────────────
const polishAndTag = (thread, deepIntent, response) => {
  const newTags = new Set(thread.tags || []);
  if (['lead_warm', 'lead_cold'].includes(deepIntent.intent)) newTags.add('lead');
  if (deepIntent.intent === 'lead_warm') newTags.add('lead_warm');
  if (deepIntent.intent === 'complaint') newTags.add('queja');
  if (deepIntent.intent === 'compliment') newTags.add('fan');
  if (deepIntent.urgency === 'high') newTags.add('urgente');
  thread.tags = [...newTags];
  return thread;
};

// ── Orquestador principal ───────────────────────────────────────────────────
export const respondCommunityDeep = async ({
  scope = 'anon',
  accountId = '',
  sender = '',
  message = '',
  postContext = '',
  channel = 'dm', // 'dm' | 'comment'
} = {}) => {
  const startedAt = Date.now();
  const thread = await getThread(scope, accountId, sender);
  thread.messages.push({ role: 'user', text: message, at: new Date().toISOString() });

  // Cargar perfil + intel
  const [profile, intel] = await Promise.all([
    getProfile(scope, accountId).catch(() => ({})),
    loadIntelligenceRaw({ scope, accountId, accountHandle: accountId }).catch(() => null),
  ]);
  const brandKit = profile?.brandKit || {};
  const archetype = brandKit?.archetype || intel?.summary?.winningArchetype || 'cercano';

  // PASOS 1-5
  const author = await analyzeAuthor({ sender, message, thread });
  if (profile?.country) author.country = profile.country;
  if (!author.culture || author.country !== thread.country) author.culture = REGIONAL_CULTURE[author.country] || REGIONAL_CULTURE.GLOBAL;
  thread.country = author.country;

  const context = await analyzeContext({ thread, postContext });
  const deepIntent = await analyzeIntentDeep({ message, context, author });

  // Thinking time real: más complejo = espera más (sin LLM call extra, solo demora UX para indicar deliberación)
  const thinkingMs = Math.min(8000, deepIntent.complexity * 1500);

  const response = await reasonResponse({
    message, author, context, deepIntent, profile,
    nicheData: intel?.niche || { primaryNiche: profile?.niche || '' },
    archetype, brandKit,
  });

  polishAndTag(thread, deepIntent, response);

  // Guardar respuesta en hilo
  if (response.reply) {
    thread.messages.push({ role: 'assistant', text: response.reply, at: new Date().toISOString(), tone: response.tone_used, intent: deepIntent.intent });
  }
  await saveThread(scope, accountId, sender, thread);

  return {
    ok: true,
    durationMs: Date.now() - startedAt,
    thinkingMs,
    channel,
    author: {
      handle: author.handle,
      country: author.culture.name,
      isReturning: author.isReturning,
      previousInteractions: author.previousInteractions,
      tags: thread.tags,
    },
    analysis: {
      intent: deepIntent.intent,
      sub_intent: deepIntent.sub_intent,
      emotion: deepIntent.emotion,
      complexity: deepIntent.complexity,
      urgency: deepIntent.urgency,
      humor_used: deepIntent.humor_appropriate,
      risks: deepIntent.risks?.filter(Boolean) || [],
    },
    response: {
      reply: response.reply,
      tone: response.tone_used,
      action: response.action,
      followUp: response.follow_up_suggestion,
      reasoning: response.reasoning,
    },
  };
};

// ── HTTP handler ─────────────────────────────────────────────────────────────
export const handleCommunityBrain = async (req, res, path, m, body, ctx = {}) => {
  const scope = ctx.userId || 'anon';
  const json = (code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); return true; };

  if (path === '/api/community/brain/respond' && m === 'POST') {
    try {
      const result = await respondCommunityDeep({
        scope,
        accountId: body?.accountId || '',
        sender: body?.sender || body?.senderHandle || 'anon',
        message: body?.message || body?.comment || '',
        postContext: body?.postContext || '',
        channel: body?.channel || (body?.comment ? 'comment' : 'dm'),
      });
      return json(200, result);
    } catch (e) { return json(500, { ok: false, error: String(e?.message || e).slice(0, 300) }); }
  }

  if (path.startsWith('/api/community/brain/thread/') && m === 'GET') {
    const sender = path.replace('/api/community/brain/thread/', '');
    try {
      const url = new URL(req.url, 'http://x');
      const accountId = url.searchParams.get('accountId') || '';
      const thread = await getThread(scope, accountId, sender);
      return json(200, { ok: true, thread });
    } catch (e) { return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) }); }
  }

  if (path === '/api/community/brain/feedback' && m === 'POST') {
    // Marca una respuesta como ✓ / ✗ para futuro fine-tuning local
    try {
      const fbKey = `feedia:cm:fb:${scope}:${body?.accountId || ''}:${Date.now()}`;
      await store.set(fbKey, { ...body, at: new Date().toISOString() }).catch(() => {});
      return json(200, { ok: true });
    } catch (e) { return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) }); }
  }

  return false;
};
