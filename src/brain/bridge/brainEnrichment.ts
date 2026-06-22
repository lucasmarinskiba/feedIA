/**
 * Brain Enrichment — Conecta el cerebro con autoReply y DM inbox
 * Inyecta contexto cerebral REAL en los prompts de respuesta.
 * No solo datos: emociones, humor, mood, bromas internas, historial completo.
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as personality from '../reasoning/personalityEngine.js';
import * as stalker from '../community/stalkerTracker.js';
import * as lifecycle from '../community/audienceLifecycle.js';
import * as human from '../community/humanResponse.js';
import { detectHumorStyle, detectUserMood } from './interactionLearner.js';

interface UserContext {
  handle: string;
  mensajesTotales?: number;
  autoRepliesPorDia?: Record<string, number>;
  lastInteraction?: string;
  platform?: string;
}

export interface BrainEnrichedContext {
  pastInteractions: string[];
  relevantMemories: string[];
  userClassification: string;
  lifecycleStage: string;
  personalityHint: string;
  toneAdjustment: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedApproach: string;
  warningFlags: string[];
  // NUEVO: contexto emocional y de humor
  userMood: string;
  moodTrend: string;
  humorLevel: string;
  hasSarcasm: boolean;
  insideJokes: string[];
  recentTopics: string[];
  userStyle: string; // 'formal', 'casual', 'joker', 'direct'
}

// ── Build enriched context ─────────────────────────────────────────────────

export const buildEnrichedContext = async (
  brand: BrandProfile,
  userContext: UserContext,
  message: string,
): Promise<BrainEnrichedContext> => {
  try {
    const handle = userContext.handle;

    // 1. Recall past interactions
    const pastQuery = `${handle} ${brand.name}`;
    const pastMemories = await semantic.recall(pastQuery, 5, ['conversation']);
    const pastInteractions = pastMemories.map((m) => m.entry.content.slice(0, 120));

    // 2. Get episodic memory
    const episodes = episodic.recallByWho(handle);
    const recentEpisodes = episodes.slice(-3).map((e) => e.what.slice(0, 120));

    // 3. Classify user
    const stalkerProfile = stalker.getIntelBrief(handle);
    const classification = stalkerProfile?.type ?? 'unknown';

    // 4. Get lifecycle stage
    const stageRecord = lifecycle.getRecord(handle);
    const stage = stageRecord?.currentStage ?? 'unknown';

    // 5. Get personality context
    const persona = personality.getPersonalityContext(handle);

    // 6. Detect mood and emotional trend
    const moodData = await detectUserMood(handle);

    // 7. Detect humor/sarcasm in current message
    const humor = detectHumorStyle(message);

    // 8. Find inside jokes
    const insideJokes = pastInteractions.filter((p) => p.match(/\b(jaja|jeje|lol|broma|chiste)\b/i)).slice(-2);

    // 9. Detect user style from past messages
    const userStyle = detectUserStyle(pastMemories.map((m) => m.entry.content));

    // 10. Determine priority
    let priority: BrainEnrichedContext['priority'] = 'low';
    if (classification === 'superfan' || classification === 'potential_partner') priority = 'critical';
    else if (stage === 'lead' || stage === 'engager') priority = 'high';
    else if (classification === 'hater') priority = 'high';
    else if (moodData.mood === 'angry') priority = 'high';

    // 11. Build warning flags
    const warningFlags: string[] = [];
    if (classification === 'hater') warningFlags.push('Usuario clasificado como negativo');
    if (classification === 'bot') warningFlags.push('Posible bot — verificar antes de responder');
    if (stage === 'lead' || stage === 'engager') warningFlags.push('Lead en pipeline — no perder oportunidad');
    if (moodData.mood === 'angry') warningFlags.push('Usuario enfadado — máxima empatía');
    if (moodData.trend === 'declining') warningFlags.push('Tendencia emocional a la baja');

    return {
      pastInteractions,
      relevantMemories: recentEpisodes,
      userClassification: classification,
      lifecycleStage: stage,
      personalityHint: persona,
      toneAdjustment:
        stage === 'stalker'
          ? 'Muy cálido, invitar a interactuar más'
          : moodData.mood === 'happy'
            ? 'Entusiasta, celebrar con el usuario'
            : moodData.mood === 'angry'
              ? 'Calmado, empático, sin excusas'
              : 'Natural y profesional',
      priority,
      suggestedApproach:
        classification === 'superfan'
          ? 'Reconocer su apoyo, hacerlos sentir especiales'
          : stage === 'lead'
            ? 'Acompañar con valor, sin presionar'
            : classification === 'hater'
              ? 'Mantener calma, no caer en provocación'
              : moodData.mood === 'curious'
                ? 'Satisfacer curiosidad + gancho para seguir'
                : moodData.mood === 'angry'
                  ? 'Escuchar, validar, resolver'
                  : 'Responder de forma natural y útil',
      warningFlags,
      // NUEVO
      userMood: moodData.mood,
      moodTrend: moodData.trend,
      humorLevel: humor.humorLevel,
      hasSarcasm: humor.hasSarcasm,
      insideJokes,
      recentTopics: moodData.recentTopics,
      userStyle,
    };
  } catch (err) {
    log.warn(`[BrainEnrichment] Error: ${(err as Error).message}`);
    return {
      pastInteractions: [],
      relevantMemories: [],
      userClassification: 'unknown',
      lifecycleStage: 'unknown',
      personalityHint: '',
      toneAdjustment: '',
      priority: 'low',
      suggestedApproach: 'Responder de forma natural',
      warningFlags: [],
      userMood: 'neutral',
      moodTrend: 'stable',
      humorLevel: 'none',
      hasSarcasm: false,
      insideJokes: [],
      recentTopics: [],
      userStyle: 'casual',
    };
  }
};

// ─- Inject brain context into auto-reply prompt ────────────────────────────

export const injectIntoAutoReply = async (
  brand: BrandProfile,
  userContext: UserContext,
  message: string,
  basePrompt: string,
): Promise<string> => {
  const ctx = await buildEnrichedContext(brand, userContext, message);

  if (ctx.pastInteractions.length === 0 && ctx.userClassification === 'unknown') {
    return basePrompt;
  }

  const brainContext = `

━━━━━━━━━━━━━━━━━━━━━━
🧠 CONTEXTO CEREBRAL (FeedIA Brain)
━━━━━━━━━━━━━━━━━━━━━━
${ctx.userClassification !== 'unknown' ? `Clasificación: ${ctx.userClassification}${ctx.userClassification === 'superfan' ? ' ⭐' : ctx.userClassification === 'lead' ? ' 💰' : ctx.userClassification === 'hater' ? ' ⚠️' : ''}` : ''}
${ctx.lifecycleStage !== 'unknown' ? `Fase: ${ctx.lifecycleStage}` : ''}
${ctx.priority !== 'low' ? `Prioridad: ${ctx.priority.toUpperCase()}` : ''}
${ctx.userMood !== 'neutral' ? `Mood actual: ${ctx.userMood} (${ctx.moodTrend})` : ''}
${ctx.humorLevel !== 'none' ? `Estilo de humor: ${ctx.humorLevel}${ctx.hasSarcasm ? ' + sarcasmo' : ''}` : ''}
${ctx.userStyle !== 'casual' ? `Estilo del usuario: ${ctx.userStyle}` : ''}
${ctx.personalityHint ? `Personalidad: ${ctx.personalityHint}` : ''}
${ctx.toneAdjustment ? `Tono sugerido: ${ctx.toneAdjustment}` : ''}
${ctx.suggestedApproach ? `Enfoque: ${ctx.suggestedApproach}` : ''}
${ctx.recentTopics.length > 0 ? `Temas recientes: ${ctx.recentTopics.join(', ')}` : ''}
${ctx.insideJokes.length > 0 ? `Bromas previas: ${ctx.insideJokes.map((j) => j.slice(0, 60)).join('; ')}` : ''}
${ctx.pastInteractions.length > 0 ? `\nHistorial:\n${ctx.pastInteractions.map((i) => `  - ${i}`).join('\n')}` : ''}
${ctx.warningFlags.length > 0 ? `\n⚠️ ALERTAS:\n${ctx.warningFlags.map((f) => `  - ${f}`).join('\n')}` : ''}
━━━━━━━━━━━━━━━━━━━━━━`;

  return basePrompt + brainContext;
};

// ─- Enhance DM reply ───────────────────────────────────────────────────────

export const enhanceDMReply = async (
  brand: BrandProfile,
  handle: string,
  message: string,
  platform: string,
): Promise<{ text: string; confidence: number; source: 'brain' | 'fallback' } | null> => {
  try {
    const result = await human.craftHumanResponse({
      handle,
      message,
      platform: platform as 'instagram' | 'tiktok' | 'twitter',
      type: 'dm',
      brandNiche: brand.niche,
      brandTone: brand.voice.tone,
    });

    if (result.confidence > 0.6) {
      return { text: result.text, confidence: result.confidence, source: 'brain' };
    }
    return null;
  } catch (err) {
    log.warn(`[BrainEnrichment] humanResponse failed: ${(err as Error).message}`);
    return null;
  }
};

// ─- Inject brain context into DM prompt ────────────────────────────────────

export const injectIntoDMPrompt = async (brand: BrandProfile, handle: string, basePrompt: string): Promise<string> => {
  const ctx = await buildEnrichedContext(brand, { handle, lastInteraction: '', platform: 'instagram' }, '');

  if (ctx.pastInteractions.length === 0 && ctx.userClassification === 'unknown') {
    return basePrompt;
  }

  const brainContext = `

━━━━━━━━━━━━━━━━━━━━━━
🧠 CONTEXTO CEREBRAL
━━━━━━━━━━━━━━━━━━━━━━
Usuario: @${handle}
${ctx.userClassification !== 'unknown' ? `Tipo: ${ctx.userClassification}` : ''}
${ctx.lifecycleStage !== 'unknown' ? `Fase: ${ctx.lifecycleStage}` : ''}
${ctx.priority !== 'low' ? `Prioridad: ${ctx.priority.toUpperCase()}` : ''}
${ctx.userMood !== 'neutral' ? `Mood: ${ctx.userMood}` : ''}
${ctx.humorLevel !== 'none' ? `Humor: ${ctx.humorLevel}` : ''}
${ctx.userStyle !== 'casual' ? `Estilo: ${ctx.userStyle}` : ''}
${ctx.pastInteractions.length > 0 ? `\nHistorial:\n${ctx.pastInteractions.map((i) => `  - ${i}`).join('\n')}` : ''}
${ctx.warningFlags.length > 0 ? `\n⚠️ ${ctx.warningFlags.join(', ')}` : ''}
━━━━━━━━━━━━━━━━━━━━━━`;

  return basePrompt + brainContext;
};

// ─- Helper: detectar estilo del usuario ────────────────────────────────────

const detectUserStyle = (pastMessages: string[]): string => {
  if (pastMessages.length === 0) return 'casual';

  let formal = 0;
  let joker = 0;
  let direct = 0;

  for (const msg of pastMessages) {
    const t = msg.toLowerCase();
    if (t.match(/\b(estimado|saludos|atte|quedo atentamente|cordialmente)\b/)) formal++;
    if (t.match(/\b(jaja|jeje|lol|broma|chiste|😂|🤣)\b/)) joker++;
    if (t.match(/\b(quiero|necesito|dame|mandame|pasame)\b/)) direct++;
  }

  if (joker > formal && joker > direct) return 'joker';
  if (formal > joker && formal > direct) return 'formal';
  if (direct > joker && direct > formal) return 'direct';
  return 'casual';
};
