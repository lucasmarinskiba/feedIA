// @ts-nocheck
/**
 * Human Response Engine — Respuestas ultra humanas con sarcasmo, humor e ironía
 *
 * NO es un robot educado. Este motor:
 *   - Detecta cuando el usuario bromea, usa sarcasmo o ironía
 *   - Responde con el mismo nivel de humor (pero NUNCA con quejas serias)
 *   - Recuerda bromas internas y referencias previas
 *   - Sabe cuándo ser gracioso y cuándo ser serio
 *   - Tiene timing: no fuerza el humor, lo deja fluir
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as lang from '../memory/languageMemory.js';
import * as personality from '../reasoning/personalityEngine.js';
import * as community from './communityManager.js';

export interface HumanResponseRequest {
  handle: string;
  message: string;
  platform: 'instagram' | 'tiktok' | 'twitter';
  type: 'comment' | 'dm' | 'story_reply';
  brandNiche: string;
  brandTone: string[];
  maxChars?: number;
}

export interface HumanResponse {
  text: string;
  tone: string;
  emojiCount: number;
  slangUsed: string[];
  referencedMeme?: string;
  confidence: number;
  why: string[];
  humorUsed: boolean;
  sarcasmUsed: boolean;
}

// ── Main engine ────────────────────────────────────────────────────────────

export const craftHumanResponse = async (req: HumanResponseRequest): Promise<HumanResponse> => {
  const { handle, message, platform, type, brandNiche, brandTone, maxChars } = req;

  const why: string[] = [];

  // 1. Detectar humor/sarcasmo/ironía en el mensaje del usuario
  const humorDetection = detectHumorInMessage(message);
  why.push(
    `Humor detectado: ${humorDetection.humorLevel} (humor=${humorDetection.hasHumor}, sarcasmo=${humorDetection.hasSarcasm}, ironía=${humorDetection.hasIrony})`,
  );

  // 2. Load user context
  const memberCtx = community.getMemberContext(handle);
  const personaCtx = personality.getPersonalityContext(handle);
  const pastConversations = await semantic.recall(`@${handle}`, 5, ['conversation']);

  // 3. Buscar bromas internas previas
  const insideJokes = findInsideJokes(
    handle,
    pastConversations.map((c) => c.entry.content),
  );
  if (insideJokes.length > 0) {
    why.push(`Bromas internas encontradas: ${insideJokes.length}`);
  }

  // 4. Detectar intent y sentimiento (con contexto de humor)
  const sentiment = detectSentiment(message);
  const intent = detectIntent(message);
  why.push(`Sentimiento: ${sentiment}, Intención: ${intent}`);

  // 5. Decidir si usar humor en la respuesta
  const shouldUseHumor = decideHumorUsage(humorDetection, sentiment, intent, type, brandTone);
  why.push(
    `Usar humor: ${shouldUseHumor ? 'SÍ' : 'NO'} (${shouldUseHumor ? humorDetection.humorLevel : 'contexto no apropiado'})`,
  );

  // 6. Get trending language for niche
  const trendingTerms = lang.getTrendingTerms(brandNiche, 5);
  const slangAvailable = trendingTerms.map((t) => t.term);

  // 7. Build response strategy
  const strategy = buildStrategy(sentiment, intent, type, brandTone, shouldUseHumor, humorDetection);
  why.push(`Estrategia: ${strategy}`);

  // 8. Generate response variations
  const variations = generateVariations(
    message,
    strategy,
    slangAvailable,
    brandNiche,
    type,
    insideJokes,
    shouldUseHumor,
  );

  // 9. Pick best variation
  const best = await pickBestVariation(variations, handle, brandNiche);

  // 10. Apply personality constraints
  let text = personality.applyPersonality(best.text, handle);

  // 11. Add member-specific context if available
  const member = community.getEngagementPriority(50).find((m) => m.handle.toLowerCase() === handle.toLowerCase());
  if (member && member.favoriteTopics.length > 0 && Math.random() > 0.5 && !shouldUseHumor) {
    text += ` Por cierto, ¿seguís con lo de ${member.favoriteTopics[0]}?`;
  }

  // 12. Enforce limits
  const limit = maxChars ?? (type === 'comment' ? 300 : 1000);
  if (text.length > limit) text = text.slice(0, limit - 3) + '...';

  // 13. Ensure not robotic
  text = deRobotize(text);

  // Count emojis
  const emojis =
    text.match(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
    ) ?? [];

  const response: HumanResponse = {
    text,
    tone: strategy,
    emojiCount: emojis.length,
    slangUsed: slangAvailable.filter((s) => text.toLowerCase().includes(s.toLowerCase())),
    confidence: best.confidence,
    why,
    humorUsed: shouldUseHumor,
    sarcasmUsed: shouldUseHumor && humorDetection.hasSarcasm,
  };

  // Store en memoria
  await semantic.storeMemory(
    text,
    'conversation',
    { handle, platform, type, strategy, humorUsed: shouldUseHumor },
    0.7,
  );
  episodic.recordEpisode('human-response', text, {
    who: handle,
    tags: ['response', strategy, shouldUseHumor ? 'humor' : 'serious'],
  });

  log.info(`[HumanResponse] @${handle}: ${text.slice(0, 60)}... (${strategy}, humor=${shouldUseHumor})`);
  return response;
};

// ── Humor detection ────────────────────────────────────────────────────────

interface HumorDetection {
  hasHumor: boolean;
  hasSarcasm: boolean;
  hasIrony: boolean;
  humorLevel: 'none' | 'mild' | 'strong';
}

const detectHumorInMessage = (text: string): HumorDetection => {
  const t = text.toLowerCase();

  // Sarcasmo: frases que suenan positivas pero en contexto negativo
  const sarcasmPatterns = [
    /\b(claro que sí|obvio|por supuesto|qué genial|me encanta|fantástico|maravilloso)\b.*[!?.]/i,
    /\b(como no|ya veo|ah claro|muy bien|perfecto)\b.*[.!?]/i,
    /"[^"]*"/, // comillas pueden indicar sarcasmo
    /\b(sarcasmo|ironía|estoy bromeando|es broma|naaaah|no me digas)\b/i,
    /\b(en serio|de verdad|no puede ser|imposible)\b.*[.!?]/i,
  ];

  // Humor explícito
  const humorPatterns = [
    /\b(jaja|jeje|lol|xd|haha|lmao|jiji|ajaja|ejeje)\b/i,
    /\b(broma|chiste|gracioso|divertido|morboso|meme|momo)\b/i,
    /plot twist/i,
    /\bnooo*\b/i,
    /\b(te juro|te lo juro|mentira|no puede ser|increíble)\b/i,
    /[😂🤣😅🤪😜😝🤡]/u,
  ];

  // Ironía
  const ironyPatterns = [
    /\b(qué coincidencia|qué conveniente|justo lo que necesitaba|qué sorpresa)\b/i,
    /\b(por fin|al fin|como siempre|nunca falla|qué raro)\b/i,
  ];

  const hasSarcasm = sarcasmPatterns.some((p) => p.test(t));
  const hasHumor = humorPatterns.some((p) => p.test(t));
  const hasIrony = ironyPatterns.some((p) => p.test(t));

  let humorLevel: 'none' | 'mild' | 'strong' = 'none';
  if (hasSarcasm || hasIrony) humorLevel = 'strong';
  else if (hasHumor) humorLevel = 'mild';

  return { hasHumor, hasSarcasm, hasIrony, humorLevel };
};

// ── Decidir si usar humor ──────────────────────────────────────────────────

const decideHumorUsage = (
  detection: HumorDetection,
  sentiment: string,
  intent: string,
  type: string,
  brandTone: string[],
): boolean => {
  // NUNCA usar humor en estos casos
  if (sentiment === 'negative' && (intent === 'complaint' || intent === 'support')) return false;
  if (intent === 'complaint') return false;
  if (intent === 'support') return false;
  if (intent === 'price' || intent === 'commercial') return false; // compras = seriedad
  if (type === 'story_reply' && detection.humorLevel === 'none') return false;

  // SI el usuario usa humor fuerte, responder con humor
  if (detection.humorLevel === 'strong') return true;

  // SI el usuario usa humor moderado y la marca lo permite
  if (detection.humorLevel === 'mild' && brandTone.includes('humoristico')) return true;

  // SI la marca es muy humorística, a veces responder con humor
  if (brandTone.includes('humoristico') && Math.random() > 0.7) return true;

  return false;
};

// ── Encontrar bromas internas ──────────────────────────────────────────────

const findInsideJokes = (handle: string, pastMessages: string[]): string[] => {
  const jokes: string[] = [];

  for (const msg of pastMessages) {
    // Buscar referencias a bromas previas
    const jokeMatch = msg.match(/\b(broma|chiste|jajaja|jeje|lol)\b.*\b(sobre|de|sobre)\b\s+([a-záéíóúñ]+)/i);
    if (jokeMatch && jokeMatch[3]) {
      jokes.push(jokeMatch[3]);
    }
  }

  return jokes.slice(-3); // máximo 3 bromas internas
};

// ── Strategy builder ───────────────────────────────────────────────────────

const buildStrategy = (
  sentiment: string,
  intent: string,
  type: string,
  brandTone: string[],
  useHumor: boolean,
  humorDetection: HumorDetection,
): string => {
  // Estrategias con humor
  if (useHumor && humorDetection.hasSarcasm) return 'sarcasmo-respondido';
  if (useHumor && humorDetection.hasIrony) return 'ironía-devuelta';
  if (useHumor) return 'ocurrencia-ligera';

  // Estrategias serias
  if (sentiment === 'negative' && intent === 'complaint') return 'empatía-rapida';
  if (sentiment === 'positive' && intent === 'praise') return 'gratitud-energética';
  if (intent === 'question') return 'respuesta-clara-con-gancho';
  if (intent === 'collab') return 'curiosidad-profesional';
  if (type === 'story_reply') return 'intimidad-corta';
  return 'conversación-natural';
};

// ── Variation generator ────────────────────────────────────────────────────

const generateVariations = (
  message: string,
  strategy: string,
  slang: string[],
  niche: string,
  type: string,
  insideJokes: string[],
  useHumor: boolean,
): { text: string; confidence: number }[] => {
  const variations: { text: string; confidence: number }[] = [];

  // Templates base por estrategia
  const templates: Record<string, string[]> = {
    'empatía-rapida': [
      'Entiendo perfectamente, eso pasa. ¿Qué te parece si lo vemos juntos? 💬',
      'Uf, sí, te leo. Acá estoy para lo que necesites 🙌',
      'Totalmente. Mandame un DM y lo resolvemos al toque 🔧',
    ],
    'gratitud-energética': [
      '¡Gracias! Eso me alegra un montón 🙏✨',
      '¡Vos sí que sos un/a crack! 🔥',
      'Eso me motiva para seguir. Mil gracias 💖',
    ],
    'respuesta-clara-con-gancho': [
      `La respuesta corta: sí. La larga: te la mando por DM porque merece explicación 😏`,
      `Resumiendo: exacto. Si querés profundizar, guardá este post 📌`,
      `Claro que sí. Y si te interesa esto, el próximo reel te va a volar la cabeza 🤯`,
    ],
    'curiosidad-profesional': [
      `Me interesa. Contame más por DM y vemos si hay sinergia 🤝`,
      `Suena interesante. ¿Qué tenías en mente exactamente?`,
      `Dale, me copa la idea. Charlemos 💬`,
    ],
    'intimidad-corta': [`Jajajaja me reí con eso 😂`, `Eso mismo pensé yo 👀`, `Siiii, totalmente 🔥`],
    'ocurrencia-ligera': [
      `Plot twist: ${message.slice(0, 30)}... naaaah, estoy jodiendo 😂`,
      `Eso es tan real que duele 😅`,
      `Si esto fuera un reel, tendría millones de views 🎬`,
      `JAJAJA no puedo con esto 😂`,
      `Me estás cargando... ¿no? 😏`,
    ],
    'sarcasmo-respondido': [
      `Ah, claro, porque eso es EXACTAMENTE lo que quería escuchar hoy 😂`,
      `Mmm, interesante punto de vista. Muy... original 🎭`,
      `Nooo, ¿en serio? No me había dado cuenta 😏`,
      `Bueno, al menos no dijiste "depende"... ah no, pará 😅`,
      `JAJAJA te pasaste. Vení que te doy un abrazo virtual 🤗`,
    ],
    'ironía-devuelta': [
      `Qué coincidencia que justo ahora aparezcas con eso 👀`,
      `Ah, justo lo que necesitaba para terminar el día 🎭`,
      `Nunca falla, siempre en el momento justo 😂`,
    ],
    'conversación-natural': [
      `Me re gusta que pienses eso. Coincido totalmente 👏`,
      `Interesante punto. Yo le agregaría que...`,
      `Eso es oro puro. Guardado mentalmente 🧠`,
    ],
  };

  const base = templates[strategy] ?? templates['conversación-natural'];

  for (const t of base) {
    let modified = t;

    // Inyectar slang si aplica
    if (slang.length > 0 && Math.random() > 0.6 && !useHumor) {
      const term = slang[Math.floor(Math.random() * slang.length)];
      modified = modified.replace(/\.$/, `, re ${term}.`);
    }

    // Referencia a bromas internas
    if (insideJokes.length > 0 && Math.random() > 0.7) {
      const joke = insideJokes[Math.floor(Math.random() * insideJokes.length)];
      modified += ` Y no me hagas acordar de lo de ${joke} 😂`;
    }

    // Ajustar para comentario vs DM
    if (type === 'comment' && modified.length > 120) {
      modified = modified.split('.')[0] + '.';
    }

    variations.push({ text: modified, confidence: 0.7 + Math.random() * 0.2 });
  }

  return variations;
};

// ── Pick best variation ────────────────────────────────────────────────────

const pickBestVariation = async (
  variations: { text: string; confidence: number }[],
  handle: string,
  niche: string,
): Promise<{ text: string; confidence: number }> => {
  const scored = await Promise.all(
    variations.map(async (v) => {
      const similar = await semantic.recall(v.text, 1, ['conversation']);
      const novelty = similar.length > 0 ? 0.5 : 1;
      return { ...v, score: v.confidence * novelty };
    }),
  );

  scored.sort((a, b) => b.score - a.score);
  return scored[0] ?? { text: '¡Gracias por tu mensaje! 🙌', confidence: 0.5 };
};

// ── Sentiment detection ────────────────────────────────────────────────────

const detectSentiment = (text: string): string => {
  const t = text.toLowerCase();
  if (t.match(/\b(odio|malo|peor|horrible|triste|enojado|decepcionado|frustrado|asco|qué pesado)\b/)) return 'negative';
  if (t.match(/\b(amo|me encanta|genial|perfecto|feliz|contento|gracias|hermoso|increíble)\b/)) return 'positive';
  return 'neutral';
};

const detectIntent = (text: string): string => {
  const t = text.toLowerCase();
  if (t.match(/\b(precio|cuánto|cuesta|compr|pedido|pago)\b/)) return 'price';
  if (t.match(/\b(pregunta|cómo|qué|cuándo|dónde|por qué)\b/)) return 'question';
  if (t.match(/\b(colabor|partnership|trabajar)\b/)) return 'collab';
  if (t.match(/\b(gracias|me encanta|genial|perfecto|amo)\b/)) return 'praise';
  if (t.match(/\b(ayuda|problema|no funciona|error|soporte|reclamo)\b/)) return 'complaint';
  if (t.match(/\b(envío|llega|cuándo llega|tracking|correo)\b/)) return 'support';
  return 'general';
};

// ── De-robotize ────────────────────────────────────────────────────────────

const deRobotize = (text: string): string => {
  let t = text;
  t = t.replace(
    /\b(Espero que se encuentre bien\.|Le saludo atentamente\.|Quedo a su disposición\.|Atentamente,)/gi,
    '',
  );
  if (!t.match(/[.!?]$/)) t += '.';
  if (t.match(/^\s*\./)) t = t.replace(/^\s*\./, '');
  return t.trim();
};
