/**
 * Interaction Learner — El cerebro APRENDE de cada interacción
 * NO es decorativo. Cada mensaje que entra, cada respuesta que sale,
 * se transforma en memoria permanente del cerebro.
 *
 * Qué guarda:
 *   1. Memoria semántica: contenido del mensaje + respuesta
 *   2. Memoria episódica: evento completo con contexto
 *   3. Grafo de conocimiento: relaciones usuario↔marca
 *   4. Stalker tracker: perfil de comportamiento actualizado
 *   5. Audience lifecycle: etapa del usuario evoluciona
 *   6. Emotional resonance: emociones detectadas en el mensaje
 *   7. Language memory: términos nuevos que usa el usuario
 *   8. Personality engine: aprende el estilo de cada usuario
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as graph from '../memory/knowledgeGraph.js';
import * as stalker from '../community/stalkerTracker.js';
import * as lifecycle from '../community/audienceLifecycle.js';
import * as emotional from '../reasoning/emotionalResonance.js';
import * as lang from '../memory/languageMemory.js';
import * as personality from '../reasoning/personalityEngine.js';
import * as community from '../community/communityManager.js';

export interface InteractionEvent {
  handle: string;
  incoming: string; // mensaje que recibimos
  outgoing: string; // respuesta que enviamos
  channel: 'dm' | 'comment' | 'story_reply';
  intent: string;
  confidence: number;
  brand: BrandProfile;
  metadata: {
    postId?: string;
    postType?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    escalated?: boolean;
    autoReplied?: boolean;
  };
}

// ── Main learning pipeline ─────────────────────────────────────────────────

export const learnFromInteraction = async (event: InteractionEvent): Promise<void> => {
  const { handle, incoming, outgoing, channel, intent, confidence, brand, metadata } = event;
  const now = new Date().toISOString();

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. MEMORIA SEMÁNTICA — Guardar mensaje y respuesta por separado
    // ═══════════════════════════════════════════════════════════════════════

    // Guardar mensaje entrante
    await semantic.storeMemory(
      `[@${handle}] ${incoming}`,
      'conversation',
      {
        handle,
        direction: 'inbound',
        channel,
        intent,
        sentiment: metadata.sentiment ?? 'neutral',
        timestamp: now,
        postId: metadata.postId,
      },
      confidence > 0.7 ? 0.8 : 0.5,
    );

    // Guardar respuesta saliente
    await semantic.storeMemory(
      `[Respuesta a @${handle}] ${outgoing}`,
      'conversation',
      {
        handle,
        direction: 'outbound',
        channel,
        intent,
        autoReplied: metadata.autoReplied ?? false,
        timestamp: now,
      },
      0.6,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // 2. MEMORIA EPISÓDICA — Evento completo con contexto
    // ═══════════════════════════════════════════════════════════════════════

    episodic.recordEpisode(
      `interaccion-${channel}`,
      `${handle}: "${incoming.slice(0, 80)}" → "${outgoing.slice(0, 80)}"`,
      {
        who: handle,
        outcome: metadata.escalated ? 'escalated' : 'replied',
        emotion:
          metadata.sentiment === 'negative' ? 'negative' : metadata.sentiment === 'positive' ? 'positive' : 'neutral',
        tags: [channel, intent, metadata.sentiment ?? 'neutral'],
      },
    );

    // ═══════════════════════════════════════════════════════════════════════
    // 3. GRAFO DE CONOCIMIENTO — Relaciones usuario↔marca
    // ═══════════════════════════════════════════════════════════════════════

    // Usuario interactuó con marca
    graph.addTriple(handle, 'interactuó_con', brand.name);
    // Marca respondió a usuario
    graph.addTriple(brand.name, 'respondió_a', handle);
    // Usuario mostró intención
    if (intent && intent !== 'otro') {
      graph.addTriple(handle, 'mostró_intención', intent);
    }
    // Canal de interacción
    graph.addTriple(handle, 'usa_canal', channel);

    // Si hay post, relacionar
    if (metadata.postId) {
      graph.addTriple(handle, 'comentó_en', metadata.postId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. STALKER TRACKER — Actualizar perfil de comportamiento
    // ═══════════════════════════════════════════════════════════════════════

    // Actualizar perfil de stalker
    stalker.classifyUser({
      handle,
      storyViews: 0,
      postLikes: channel === 'comment' ? 1 : 0,
      comments: channel === 'comment' ? 1 : 0,
      dms: channel === 'dm' ? 1 : 0,
      saves: 0,
      shares: 0,
      profileVisits: 0,
      hoursActive: [new Date().getHours()],
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 5. AUDIENCE LIFECYCLE — Evolucionar etapa del usuario
    // ═══════════════════════════════════════════════════════════════════════

    lifecycle.updateStage(handle, {
      storyViews: 0,
      likes: channel === 'comment' ? 1 : 0,
      comments: channel === 'comment' ? 1 : 0,
      dms: channel === 'dm' ? 1 : 0,
      purchases: 0,
      mentions: 0,
      daysSinceLastInteraction: 0,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 6. EMOTIONAL RESONANCE — Analizar emociones del mensaje entrante
    // ═══════════════════════════════════════════════════════════════════════

    const emotions = emotional.analyzeEmotions(incoming);
    if (emotions.length > 0) {
      // Guardar como registro emocional (engagement placeholder = 1)
      emotional.recordEmotionalImpact(
        `msg-${handle}-${Date.now()}`,
        incoming,
        { engagement: 1, comments: 0, saves: 0, shares: 0 },
        brand.niche,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. LANGUAGE MEMORY — Aprender términos nuevos del usuario
    // ═══════════════════════════════════════════════════════════════════════

    const userWords = incoming.toLowerCase().match(/\b[a-záéíóúñ]{4,}\b/g) ?? [];
    for (const word of userWords) {
      if (!isCommonWord(word)) {
        lang.recordTerm({
          term: word,
          type: 'slang',
          meaning: 'Aprendido de mensaje de usuario',
          niche: brand.niche,
          confidence: 0.3,
          examples: [incoming.slice(0, 100)],
          status: 'emerging',
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. PERSONALITY ENGINE — Aprender estilo del usuario
    // ═══════════════════════════════════════════════════════════════════════

    personality.learnPersonality(handle, [
      { role: 'user', text: incoming },
      { role: 'bot', text: outgoing },
    ]);

    // ═══════════════════════════════════════════════════════════════════════
    // 9. COMMUNITY MANAGER — Track interaction
    // ═══════════════════════════════════════════════════════════════════════

    await community.trackInteraction(handle, incoming, 'inbound', channel);
    await community.trackInteraction(handle, outgoing, 'outbound', channel);

    log.info(`[InteractionLearner] @${handle}: aprendido (${intent}, ${channel}, ${metadata.sentiment ?? 'neutral'})`);
  } catch (err) {
    log.warn(`[InteractionLearner] Error aprendiendo de @${handle}: ${(err as Error).message}`);
  }
};

// ── Helper: detectar si un mensaje usa humor/sarcasmo ──────────────────────

export const detectHumorStyle = (
  text: string,
): {
  hasHumor: boolean;
  hasSarcasm: boolean;
  hasIrony: boolean;
  humorLevel: 'none' | 'mild' | 'strong';
} => {
  const t = text.toLowerCase();

  // Patrones de sarcasmo
  const sarcasmPatterns = [
    /\b(claro que sí|obvio|por supuesto|qué genial|me encanta|fantástico|maravilloso)\b.*[!?.]/i,
    /\b(como no|ya veo|ah claro|muy bien|perfecto)\b.*[.!?]/i,
    /"[^"]*"/,
    /\b(sarcasmo|ironía|estoy bromeando|es broma|naaaah)\b/i,
  ];

  // Patrones de humor
  const humorPatterns = [
    /\b(jaja|jeje|lol|xd|haha|lmao|😂|🤣|😅)\b/i,
    /\b(broma|chiste|gracioso|divertido|morboso|meme)\b/i,
    /plot twist/i,
    /\bnooo*\b/i,
    /\b(te juro|te lo juro|mentira|no puede ser)\b/i,
  ];

  // Patrones de ironía
  const ironyPatterns = [
    /\b(qué coincidencia|qué conveniente|justo lo que necesitaba)\b/i,
    /\b(por fin|al fin|como siempre|nunca falla)\b/i,
  ];

  const hasSarcasm = sarcasmPatterns.some((p) => p.test(t));
  const hasHumor = humorPatterns.some((p) => p.test(t));
  const hasIrony = ironyPatterns.some((p) => p.test(t));

  let humorLevel: 'none' | 'mild' | 'strong' = 'none';
  if (hasSarcasm || hasIrony) humorLevel = 'strong';
  else if (hasHumor) humorLevel = 'mild';

  return { hasHumor, hasSarcasm, hasIrony, humorLevel };
};

// ── Helper: detectar mood del usuario desde historial reciente ─────────────

export const detectUserMood = async (
  handle: string,
): Promise<{
  mood: 'happy' | 'frustrated' | 'curious' | 'angry' | 'neutral';
  trend: 'improving' | 'declining' | 'stable';
  recentTopics: string[];
}> => {
  const recent = await semantic.recall(`@${handle}`, 5, ['conversation']);
  const episodes = episodic.recallByWho(handle).slice(-5);

  if (recent.length === 0 && episodes.length === 0) {
    return { mood: 'neutral', trend: 'stable', recentTopics: [] };
  }

  // Analizar sentimiento de últimas interacciones
  const sentiments: number[] = [];
  for (const r of recent) {
    const meta = r.entry.metadata as Record<string, unknown> | undefined;
    if (meta?.sentiment === 'positive') sentiments.push(1);
    else if (meta?.sentiment === 'negative') sentiments.push(-1);
    else sentiments.push(0);
  }

  const avg = sentiments.reduce((a, b) => a + b, 0) / (sentiments.length || 1);
  const first = sentiments[0] ?? 0;
  const last = sentiments[sentiments.length - 1] ?? 0;

  let mood: 'happy' | 'frustrated' | 'curious' | 'angry' | 'neutral' = 'neutral';
  if (avg > 0.5) mood = 'happy';
  else if (avg < -0.3 && avg > -0.7) mood = 'frustrated';
  else if (avg <= -0.7) mood = 'angry';
  else if (recent.some((r) => r.entry.content.match(/\b(cómo|qué|cuándo|dónde|por qué)\b/i))) mood = 'curious';

  const trend = last > first ? 'improving' : last < first ? 'declining' : 'stable';

  // Extraer temas recientes
  const recentTopics = recent
    .map((r) =>
      r.entry.content.match(/\b(fitness|comida|ropa|precio|calidad|envío|servicio|producto|curso|mentoría)\b/gi),
    )
    .filter(Boolean)
    .flat()
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5) as string[];

  return { mood, trend, recentTopics };
};

// ── Helper: palabras comunes para filtrar ──────────────────────────────────

const COMMON_WORDS = new Set([
  'hola',
  'buenos',
  'buenas',
  'gracias',
  'por favor',
  'muchas',
  'mucho',
  'como',
  'cómo',
  'que',
  'qué',
  'cuando',
  'cuándo',
  'donde',
  'dónde',
  'porque',
  'porqué',
  'este',
  'esta',
  'esto',
  'ese',
  'esa',
  'eso',
  'también',
  'tambien',
  'mismo',
  'misma',
  'mismo',
  'otro',
  'otra',
  'muy',
  'más',
  'mas',
  'menos',
  'tan',
  'tanto',
  'tanta',
  'todo',
  'toda',
  'bien',
  'mal',
  'ahora',
  'antes',
  'después',
  'luego',
  'entonces',
  'aquí',
  'allí',
  'allá',
  'cerca',
  'lejos',
  'siempre',
  'nunca',
  'casi',
  'solo',
  'sólo',
  'solamente',
  'aproximadamente',
  'exactamente',
]);

const isCommonWord = (word: string): boolean => COMMON_WORDS.has(word.toLowerCase());
