// @ts-nocheck
/**
 * Voice Brain — Comandos de voz para el Cerebro FeedIA
 * Consulta memoria, toma decisiones, genera contenido enriquecido
 */

// import { log } from '../agent/logger.js'; // reserved for future voice debug logging
import { loadBrandProfile } from '../config/index.js';
import type { VoiceActionResult } from '../voice/voiceActionRouter.js';

const response = (esMsg: string, enMsg: string): string => {
  const brand = loadBrandProfile();
  const locale = brand.audience.locale ?? 'es-AR';
  return locale.startsWith('es') ? esMsg : enMsg;
};

/* ── Memoria Semántica ───────────────────────────────────────────────────── */

export const recallMemory = async (query: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.recall';
  try {
    const { recall } = await import('./core/cortex.js');
    const result = await recall(query);
    const memCount = result.semantic.length;
    const epCount = result.episodes.length;
    return {
      ok: true,
      spokenResponse: response(
        `Recordé ${memCount} memorias y ${epCount} eventos sobre "${query}".`,
        `Recalled ${memCount} memories and ${epCount} events about "${query}".`,
      ),
      actionType,
      executed: true,
      detail: { memories: memCount, episodes: epCount, context: result.context.slice(0, 500) },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error consultando memoria.', 'Error recalling memory.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Estadísticas del Cerebro ────────────────────────────────────────────── */

export const getBrainStats = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.stats';
  try {
    const { getBrainStats } = await import('./core/cortex.js');
    const stats = getBrainStats();
    return {
      ok: true,
      spokenResponse: response(
        `Cerebro activo. Memoria: ${stats.semantic.total} entradas. Grafo: ${stats.graph.triples} triples. Episodios: ${stats.episodes}. Términos: ${stats.language}.`,
        `Brain active. Memory: ${stats.semantic.total} entries. Graph: ${stats.graph.triples} triples. Episodes: ${stats.episodes}. Terms: ${stats.language}.`,
      ),
      actionType,
      executed: true,
      detail: stats,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error obteniendo estadísticas.', 'Error getting stats.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Predicción Viral ────────────────────────────────────────────────────── */

export const predictViral = async (content: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.viral';
  try {
    const brand = loadBrandProfile();
    const { predictViralPotential } = await import('./reasoning/viralScoring.js');
    const pred = await predictViralPotential(content, brand.niche);
    return {
      ok: true,
      spokenResponse: response(
        `Potencial viral: ${(pred.score * 100).toFixed(0)}%. ${pred.reasoning.join('. ')}. ${pred.suggestions.slice(0, 2).join('. ')}.`,
        `Viral potential: ${(pred.score * 100).toFixed(0)}%. ${pred.reasoning.join('. ')}. ${pred.suggestions.slice(0, 2).join('. ')}.`,
      ),
      actionType,
      executed: true,
      detail: pred,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error prediciendo viralidad.', 'Error predicting virality.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Contexto de Personalidad ────────────────────────────────────────────── */

export const getPersonality = async (userHandle?: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.personality';
  try {
    const brand = loadBrandProfile();
    const target = userHandle ?? brand.name;
    const { getPersonalityContext, getAllPersonalities } = await import('./reasoning/personalityEngine.js');
    const ctx = getPersonalityContext(target);
    const all = getAllPersonalities();
    return {
      ok: true,
      spokenResponse: response(
        ctx ? `Personalidad de ${target} cargada. ${all.length} perfiles registrados.` : `Sin perfil para ${target}.`,
        ctx ? `Personality for ${target} loaded. ${all.length} profiles registered.` : `No profile for ${target}.`,
      ),
      actionType,
      executed: true,
      detail: { target, context: ctx, totalProfiles: all.length },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error obteniendo personalidad.', 'Error getting personality.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Generar Contenido Enriquecido ───────────────────────────────────────── */

export const generateBrainContent = async (topic?: string, format?: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.content';
  try {
    const brand = loadBrandProfile();
    const { generateContent } = await import('./actuators/contentActuator.js');
    const result = await generateContent({
      topic: topic ?? brand.niche,
      niche: brand.niche,
      brandName: brand.name,
      format: (format as 'carousel' | 'reel' | 'story' | 'post' | 'caption') ?? 'post',
    });
    return {
      ok: true,
      spokenResponse: response(
        `Contenido enriquecido generado. Score viral predicho: ${(result.predictedScore * 100).toFixed(0)}%. Hook sugerido: ${result.hookSuggestion.slice(0, 60)}...`,
        `Enriched content generated. Predicted viral score: ${(result.predictedScore * 100).toFixed(0)}%. Suggested hook: ${result.hookSuggestion.slice(0, 60)}...`,
      ),
      actionType,
      executed: true,
      detail: result,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando contenido.', 'Error generating content.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Decisión Estratégica ────────────────────────────────────────────────── */

export const makeBrainDecision = async (type: string, options: string[]): Promise<VoiceActionResult> => {
  const actionType = 'brain.decision';
  try {
    const brand = loadBrandProfile();
    const { makeDecision } = await import('./actuators/decisionActuator.js');
    const decision = await makeDecision({
      type: type as 'post' | 'reply' | 'campaign' | 'strategy' | 'escalation',
      options,
      context: {},
      niche: brand.niche,
      brandName: brand.name,
    });
    return {
      ok: true,
      spokenResponse: response(
        `Decisión: ${decision.chosen} (confianza ${(decision.confidence * 100).toFixed(0)}%). ${decision.risks.length > 0 ? 'Riesgos: ' + decision.risks[0] : ''}`,
        `Decision: ${decision.chosen} (confidence ${(decision.confidence * 100).toFixed(0)}%). ${decision.risks.length > 0 ? 'Risks: ' + decision.risks[0] : ''}`,
      ),
      actionType,
      executed: true,
      detail: decision,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error tomando decisión.', 'Error making decision.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Ingesta Manual ──────────────────────────────────────────────────────── */

export const ingestToBrain = async (content: string, source?: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.ingest';
  try {
    const { ingest } = await import('./core/cortex.js');
    await ingest({
      type: (source as 'message' | 'post' | 'trend' | 'insight' | 'feedback' | 'decision' | 'system') ?? 'system',
      content,
      importance: 0.7,
    });
    return {
      ok: true,
      spokenResponse: response(
        `Información guardada en el cerebro: ${content.slice(0, 60)}...`,
        `Information stored in brain: ${content.slice(0, 60)}...`,
      ),
      actionType,
      executed: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error guardando en memoria.', 'Error storing in memory.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Tendencias del Nicho ────────────────────────────────────────────────── */

export const getNicheTrends = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.trends';
  try {
    const brand = loadBrandProfile();
    const { getTrendingTopics } = await import('./sensors/trendSensor.js');
    const trends = await getTrendingTopics(brand.niche, 5);
    return {
      ok: true,
      spokenResponse: response(
        `${trends.length} tendencias en ${brand.niche}: ${trends.map((t) => t.topic).join(', ')}.`,
        `${trends.length} trends in ${brand.niche}: ${trends.map((t) => t.topic).join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: trends,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error obteniendo tendencias.', 'Error getting trends.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Community Manager ───────────────────────────────────────────────────── */

export const communityGreeting = async (handle: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.community.greeting';
  try {
    const { getGreeting } = await import('./community/communityManager.js');
    const text = getGreeting(handle);
    return {
      ok: true,
      spokenResponse: text,
      actionType,
      executed: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando saludo.', 'Error generating greeting.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const communityAudit = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.community.audit';
  try {
    const { auditCommunity, getStats } = await import('./community/communityManager.js');
    auditCommunity();
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `Auditoría de comunidad: ${stats.totalMembers} miembros, ${stats.fans} fans, ${stats.leads} leads. Salud: ${(stats.health * 100).toFixed(0)}%.`,
        `Community audit: ${stats.totalMembers} members, ${stats.fans} fans, ${stats.leads} leads. Health: ${(stats.health * 100).toFixed(0)}%.`,
      ),
      actionType,
      executed: true,
      detail: stats,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error auditando comunidad.', 'Error auditing community.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Stalker Tracker ─────────────────────────────────────────────────────── */

export const stalkerIntel = async (handle?: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.stalker.intel';
  try {
    const { assessAccountRisk, getPotentialPartners } = await import('./community/stalkerTracker.js');
    if (handle) {
      const { getIntelBrief } = await import('./community/stalkerTracker.js');
      const intel = getIntelBrief(handle);
      return {
        ok: true,
        spokenResponse: response(
          intel
            ? `@${handle}: tipo ${intel.type} (conf=${(intel.confidence * 100).toFixed(0)}%). ${intel.behaviors.join('. ')}.`
            : `Sin inteligencia sobre @${handle}.`,
          intel
            ? `@${handle}: type ${intel.type} (conf=${(intel.confidence * 100).toFixed(0)}%). ${intel.behaviors.join('. ')}.`
            : `No intel on @${handle}.`,
        ),
        actionType,
        executed: true,
        detail: intel,
      };
    }
    const risk = assessAccountRisk();
    const partners = getPotentialPartners();
    return {
      ok: true,
      spokenResponse: response(
        `Inteligencia general: ${risk.total} perfiles. ${partners.length} potenciales socios. ${risk.flagged} flagged.`,
        `General intel: ${risk.total} profiles. ${partners.length} potential partners. ${risk.flagged} flagged.`,
      ),
      actionType,
      executed: true,
      detail: { risk, partners: partners.length },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error de inteligencia.', 'Error getting intel.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Human Reply ─────────────────────────────────────────────────────────── */

export const craftHumanReply = async (
  handle: string,
  message: string,
  type: 'comment' | 'dm' | 'story_reply',
): Promise<VoiceActionResult> => {
  const actionType = 'brain.human.reply';
  try {
    const brand = loadBrandProfile();
    const { craftHumanResponse } = await import('./community/humanResponse.js');
    const result = await craftHumanResponse({
      handle,
      message,
      platform: 'instagram',
      type,
      brandNiche: brand.niche,
      brandTone: brand.voice.tone,
    });
    return {
      ok: true,
      spokenResponse: response(result.text, result.text),
      actionType,
      executed: true,
      detail: result,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error crafteando respuesta.', 'Error crafting reply.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Profile Optimizer ───────────────────────────────────────────────────── */

export const optimizeProfile = async (bio?: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.profile.optimize';
  try {
    const brand = loadBrandProfile();
    const { auditProfile, generateOptimizedBio } = await import('./aesthetic/profileOptimizer.js');
    const result = await auditProfile(brand.name, bio ?? '', [], [], brand.niche);
    const optimized = generateOptimizedBio(
      brand.niche,
      result.bio.keywords,
      result.bio.ctaPresent ? 'Link en bio' : 'DM info',
      'Ayudando a cientos',
    );
    return {
      ok: true,
      spokenResponse: response(
        `Perfil auditado: Nota ${result.overall.grade}. ${result.overall.topIssues[0] ?? 'Todo bien'}. Bio sugerida: ${optimized.slice(0, 60)}...`,
        `Profile audited: Grade ${result.overall.grade}. ${result.overall.topIssues[0] ?? 'All good'}. Suggested bio: ${optimized.slice(0, 60)}...`,
      ),
      actionType,
      executed: true,
      detail: { audit: result, optimizedBio: optimized },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error auditando perfil.', 'Error auditing profile.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Aesthetic Engine ────────────────────────────────────────────────────── */

export const aestheticReport = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.aesthetic';
  try {
    const brand = loadBrandProfile();
    const { analyzeCohesion, getContentDirection } = await import('./aesthetic/aestheticEngine.js');
    const result = await analyzeCohesion(brand.name, [], []);
    const direction = getContentDirection(brand.name);
    return {
      ok: true,
      spokenResponse: response(
        `Cohesión visual: ${(result.overallScore * 100).toFixed(0)}%. Dirección: ${direction.captions[0] ?? 'General'}.`,
        `Visual cohesion: ${(result.overallScore * 100).toFixed(0)}%. Direction: ${direction.captions[0] ?? 'General'}.`,
      ),
      actionType,
      executed: true,
      detail: { cohesion: result, direction },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error análisis estético.', 'Error aesthetic analysis.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Partnership Engine ──────────────────────────────────────────────────── */

export const findPartners = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.partners';
  try {
    const brand = loadBrandProfile();
    const { getTopCandidates } = await import('./growth/partnershipEngine.js');
    const candidates = getTopCandidates(10, 0.4);
    return {
      ok: true,
      spokenResponse: response(
        `${candidates.length} socios potenciales en ${brand.niche}: ${candidates
          .slice(0, 3)
          .map((c) => `@${c.handle}`)
          .join(', ')}.`,
        `${candidates.length} potential partners in ${brand.niche}: ${candidates
          .slice(0, 3)
          .map((c) => `@${c.handle}`)
          .join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: candidates,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error buscando socios.', 'Error finding partners.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Niche Mastery ───────────────────────────────────────────────────────── */

export const nicheIntel = async (nicheName?: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.niche';
  try {
    const brand = loadBrandProfile();
    const niche = nicheName ?? brand.niche;
    const { getNiche, getOpportunities, getBestSegment } = await import('./growth/nicheMastery.js');
    const profile = getNiche(niche);
    const ops = getOpportunities(niche);
    const segment = getBestSegment(niche, 'conversion');
    return {
      ok: true,
      spokenResponse: response(
        `Nicho ${niche}: ${profile.audienceSegments.length} segmentos. ${ops.length} oportunidades. Mejor segmento: ${segment.segment}.`,
        `Niche ${niche}: ${profile.audienceSegments.length} segments. ${ops.length} opportunities. Best segment: ${segment.segment}.`,
      ),
      actionType,
      executed: true,
      detail: { profile, opportunities: ops, segment },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error nicho.', 'Error niche.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Trend Sync ──────────────────────────────────────────────────────────── */

export const syncTrends = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.trend.sync';
  try {
    const brand = loadBrandProfile();
    const { getTrendsForNiche, getTrendContentIdeas } = await import('./growth/trendSync.js');
    const trends = getTrendsForNiche(brand.niche, 0.3);
    const ideas = getTrendContentIdeas(brand.niche);
    return {
      ok: true,
      spokenResponse: response(
        `${trends.length} trends sincronizados. ${ideas.length} ideas generadas.`,
        `${trends.length} trends synced. ${ideas.length} ideas generated.`,
      ),
      actionType,
      executed: true,
      detail: { trends, ideas },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error sync trends.', 'Error syncing trends.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Orchestrator ────────────────────────────────────────────────────────── */

export const runOrchestrator = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.orchestrator';
  try {
    const brand = loadBrandProfile();
    const { think } = await import('./core/orchestrator.js');
    const decisions = await think({ name: brand.name, niche: brand.niche, handle: brand.name, tone: brand.voice.tone });
    return {
      ok: true,
      spokenResponse: response(
        `Orquestador: ${decisions.length} decisiones. Prioridad: ${decisions[0]?.action ?? 'ninguna'}.`,
        `Orchestrator: ${decisions.length} decisions. Priority: ${decisions[0]?.action ?? 'none'}.`,
      ),
      actionType,
      executed: true,
      detail: decisions,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error orquestador.', 'Orchestrator error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Competitor Brain ────────────────────────────────────────────────────── */

export const competitorIntel = async (handle?: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.competitor';
  try {
    const brand = loadBrandProfile();
    if (handle) {
      const { getCompetitorIntel } = await import('./growth/competitorBrain.js');
      const intel = getCompetitorIntel(handle);
      return {
        ok: true,
        spokenResponse: response(
          intel
            ? `Competidor @${handle}: ${intel.strategy} (fortaleza: ${intel.strengthScore}/10).`
            : `Sin datos de @${handle}.`,
          intel
            ? `Competitor @${handle}: ${intel.strategy} (strength: ${intel.strengthScore}/10).`
            : `No data for @${handle}.`,
        ),
        actionType,
        executed: true,
        detail: intel,
      };
    }
    const { getMarketGaps } = await import('./growth/competitorBrain.js');
    const gaps = getMarketGaps(brand.niche);
    return {
      ok: true,
      spokenResponse: response(
        `${gaps.length} gaps de mercado en ${brand.niche}.`,
        `${gaps.length} market gaps in ${brand.niche}.`,
      ),
      actionType,
      executed: true,
      detail: gaps,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error competidor.', 'Error competitor.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Revenue Engine ──────────────────────────────────────────────────────── */

export const revenuePrediction = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.revenue';
  try {
    const brand = loadBrandProfile();
    const { predictContentRevenue } = await import('./growth/revenueEngine.js');
    const pred = predictContentRevenue(
      { format: 'reel', predictedReach: 5000, predictedEngagement: 500, goal: 'conversion' },
      brand.niche,
    );
    return {
      ok: true,
      spokenResponse: response(
        `Revenue predicho: $${pred.predictedRevenue} por reel. Margen: ${(pred.profitMargin * 100).toFixed(0)}%.`,
        `Predicted revenue: $${pred.predictedRevenue} per reel. Margin: ${(pred.profitMargin * 100).toFixed(0)}%.`,
      ),
      actionType,
      executed: true,
      detail: pred,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error revenue.', 'Revenue error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Content Recycler ────────────────────────────────────────────────────── */

export const recyclerCheck = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.recycler';
  try {
    const brand = loadBrandProfile();
    const { getRecycleCandidates, getStats } = await import('./memory/contentRecycler.js');
    const candidates = getRecycleCandidates(brand.niche, 5);
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `${stats.readyToRecycle} contenidos listos para reciclar. Top candidato: ${candidates[0]?.content.slice(0, 60) ?? 'ninguno'}...`,
        `${stats.readyToRecycle} contents ready to recycle. Top candidate: ${candidates[0]?.content.slice(0, 60) ?? 'none'}...`,
      ),
      actionType,
      executed: true,
      detail: { candidates, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error recycler.', 'Recycler error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Crisis Predictor ────────────────────────────────────────────────────── */

export const crisisScan = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.crisis';
  try {
    const brand = loadBrandProfile();
    const { scan, getStats } = await import('./reasoning/crisisPredictor.js');
    const signals = scan(
      {
        avgSentiment: 0.5,
        commentVelocity: 5,
        engagementRate: 0.03,
        negativeMentions: 2,
        competitorMentions: 0,
        unfollowRate: 0.5,
      },
      brand.name,
    );
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `Escaneo de crisis: ${signals.length} señales. ${stats.critical} críticas, ${stats.active} activas.`,
        `Crisis scan: ${signals.length} signals. ${stats.critical} critical, ${stats.active} active.`,
      ),
      actionType,
      executed: true,
      detail: { signals, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error crisis.', 'Crisis error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Cross-Brand Learning ────────────────────────────────────────────────── */

export const crossBrandInsights = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.crossbrand';
  try {
    const { getUniversalPatterns, getStats } = await import('./growth/crossBrandLearning.js');
    const patterns = getUniversalPatterns(undefined, 5);
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `${stats.insights} insights de ${stats.brands} marcas. Top: ${patterns[0]?.pattern ?? 'ninguno'}.`,
        `${stats.insights} insights from ${stats.brands} brands. Top: ${patterns[0]?.pattern ?? 'none'}.`,
      ),
      actionType,
      executed: true,
      detail: { patterns, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error cross-brand.', 'Cross-brand error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Audience Lifecycle ──────────────────────────────────────────────────── */

export const lifecycleMap = async (handle?: string): Promise<VoiceActionResult> => {
  const actionType = 'brain.lifecycle';
  try {
    if (handle) {
      const { getRecord } = await import('./community/audienceLifecycle.js');
      const record = getRecord(handle);
      return {
        ok: true,
        spokenResponse: response(
          record
            ? `@${handle}: etapa ${record.currentStage} → próxima: ${record.nextLikelyStage} (${(record.probability * 100).toFixed(0)}%). LTV: $${record.lifetimeValue}.`
            : `Sin ciclo de vida para @${handle}.`,
          record
            ? `@${handle}: stage ${record.currentStage} → next: ${record.nextLikelyStage} (${(record.probability * 100).toFixed(0)}%). LTV: $${record.lifetimeValue}.`
            : `No lifecycle for @${handle}.`,
        ),
        actionType,
        executed: true,
        detail: record,
      };
    }
    const { getFunnelStats, getAtRiskUsers } = await import('./community/audienceLifecycle.js');
    const funnel = getFunnelStats();
    const atRisk = getAtRiskUsers(5);
    return {
      ok: true,
      spokenResponse: response(
        `Funnel: ${JSON.stringify(funnel)}. ${atRisk.length} usuarios en riesgo.`,
        `Funnel: ${JSON.stringify(funnel)}. ${atRisk.length} users at risk.`,
      ),
      actionType,
      executed: true,
      detail: { funnel, atRisk: atRisk.length },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error lifecycle.', 'Lifecycle error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Social Listening ────────────────────────────────────────────────────── */

export const socialListen = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.listening';
  try {
    const brand = loadBrandProfile();
    const { getContentOpportunities, getPainPoints, getStats } = await import('./sensors/socialListening.js');
    const ops = getContentOpportunities(brand.niche);
    const pains = getPainPoints(brand.niche);
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `${stats.totalSignals} señales. ${pains.length} pain points. Top: ${pains[0]?.pain ?? 'ninguno'}.`,
        `${stats.totalSignals} signals. ${pains.length} pain points. Top: ${pains[0]?.pain ?? 'none'}.`,
      ),
      actionType,
      executed: true,
      detail: { opportunities: ops, painPoints: pains, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error social listening.', 'Social listening error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Content Sequencing ──────────────────────────────────────────────────── */

export const createSequence = async (title?: string, episodes?: number): Promise<VoiceActionResult> => {
  const actionType = 'brain.sequence';
  try {
    const brand = loadBrandProfile();
    const { createSequence: create, getStats } = await import('./actuators/sequencingEngine.js');
    const seq = create(
      title ?? `Serie ${brand.niche}`,
      brand.niche,
      brand.niche,
      episodes ?? 5,
      'engagement',
      'general',
    );
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `Secuencia "${seq.title}" creada: ${seq.episodes.length} episodios.`,
        `Sequence "${seq.title}" created: ${seq.episodes.length} episodes.`,
      ),
      actionType,
      executed: true,
      detail: { sequence: seq, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error en secuencia.', 'Sequence error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// NUEVOS MÓDULOS SPRINT 5-7 (Vision, Video, Dream, Emotional, Forecaster,
// Brand Evolution, Engagement Loop, Hashtag Ecosystem)
// ═════════════════════════════════════════════════════════════════════════════

/* ── Vision Brain ────────────────────────────────────────────────────────── */

export const visionRecommendations = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.vision';
  try {
    const brand = loadBrandProfile();
    const { getVisualRecommendations, getStats } = await import('./sensors/visionBrain.js');
    const recs = getVisualRecommendations(brand.niche);
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `Visual: ${recs.bestStyles.join(', ')}. Colores: ${recs.bestColors.slice(0, 3).join(', ')}. Tips: ${recs.tips[0] ?? 'N/A'}.`,
        `Visual: ${recs.bestStyles.join(', ')}. Colors: ${recs.bestColors.slice(0, 3).join(', ')}. Tips: ${recs.tips[0] ?? 'N/A'}.`,
      ),
      actionType,
      executed: true,
      detail: { recommendations: recs, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error visual brain.', 'Vision brain error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Video Brain ─────────────────────────────────────────────────────────── */

export const videoFormula = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.video';
  try {
    const brand = loadBrandProfile();
    const { getVideoFormula, getStats } = await import('./sensors/videoBrain.js');
    const formula = getVideoFormula(brand.niche);
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `Video formula: ${formula.optimalDuration}s, hook ${formula.bestHook}, transición ${formula.bestTransition}. ${formula.tips[0] ?? ''}.`,
        `Video formula: ${formula.optimalDuration}s, hook ${formula.bestHook}, transition ${formula.bestTransition}. ${formula.tips[0] ?? ''}.`,
      ),
      actionType,
      executed: true,
      detail: { formula, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error video brain.', 'Video brain error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Dream Engine ────────────────────────────────────────────────────────── */

export const dreamInsights = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.dream';
  try {
    const brand = loadBrandProfile();
    const { dream, getRecentDreams } = await import('./reasoning/dreamEngine.js');
    const insights = await dream(brand.niche);
    return {
      ok: true,
      spokenResponse: response(
        `${insights.length} insights soñados. Top: ${insights[0]?.insight.slice(0, 80) ?? 'Ninguno'}...`,
        `${insights.length} dream insights. Top: ${insights[0]?.insight.slice(0, 80) ?? 'None'}...`,
      ),
      actionType,
      executed: true,
      detail: insights,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error dream engine.', 'Dream engine error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Emotional Resonance ─────────────────────────────────────────────────── */

export const emotionalFormula = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.emotional';
  try {
    const brand = loadBrandProfile();
    const { getEmotionalFormula, getStats } = await import('./reasoning/emotionalResonance.js');
    const formula = getEmotionalFormula(brand.niche);
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `Emociones top: ${formula.topEmotions.join(', ')}. Recomendación: ${formula.recommendation}.`,
        `Top emotions: ${formula.topEmotions.join(', ')}. Recommendation: ${formula.recommendation}.`,
      ),
      actionType,
      executed: true,
      detail: { formula, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error emotional resonance.', 'Emotional resonance error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Content Forecaster ──────────────────────────────────────────────────── */

export const forecastContent = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.forecast';
  try {
    const brand = loadBrandProfile();
    const { forecast } = await import('./reasoning/contentForecaster.js');
    const result = await forecast(brand.niche, brand.voice.tone);
    return {
      ok: true,
      spokenResponse: response(
        `Forecast: ${result.predictions.length} predicciones. Gaps: ${result.gaps.length}. ${result.opportunities[0] ?? ''}.`,
        `Forecast: ${result.predictions.length} predictions. Gaps: ${result.gaps.length}. ${result.opportunities[0] ?? ''}.`,
      ),
      actionType,
      executed: true,
      detail: result,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error forecaster.', 'Forecaster error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Brand Evolution ─────────────────────────────────────────────────────── */

export const brandEvolutionReport = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.evolution';
  try {
    const brand = loadBrandProfile();
    const { analyzeEvolution, getEvolutionReport } = await import('./growth/brandEvolution.js');
    const suggestions = analyzeEvolution(brand.niche);
    const report = getEvolutionReport(brand.niche);
    return {
      ok: true,
      spokenResponse: response(
        `Evolución: ${report.snapshots} snapshots. Tendencia: ${report.recentTrend}. ${suggestions.length} sugerencias.`,
        `Evolution: ${report.snapshots} snapshots. Trend: ${report.recentTrend}. ${suggestions.length} suggestions.`,
      ),
      actionType,
      executed: true,
      detail: { report, suggestions },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error brand evolution.', 'Brand evolution error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Engagement Loop ─────────────────────────────────────────────────────── */

export const engagementLoopReport = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.loop';
  try {
    const brand = loadBrandProfile();
    const { getOptimalLoop, getPeakHours, getStats } = await import('./growth/engagementLoop.js');
    const loop = getOptimalLoop(brand.niche, 'reel');
    const peaks = getPeakHours(brand.niche);
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `Loop óptimo: ${loop.nextAction} en ${loop.waitHours}h (${loop.urgency}). Peak hours: ${peaks.join(', ')}.`,
        `Optimal loop: ${loop.nextAction} in ${loop.waitHours}h (${loop.urgency}). Peak hours: ${peaks.join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: { loop, peaks, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error engagement loop.', 'Engagement loop error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Hashtag Ecosystem ───────────────────────────────────────────────────── */

export const hashtagStrategy = async (): Promise<VoiceActionResult> => {
  const actionType = 'brain.hashtags';
  try {
    const brand = loadBrandProfile();
    const { getHashtagStrategy, findEmergingHashtags, getStats } = await import('./growth/hashtagEcosystem.js');
    const strategy = getHashtagStrategy(brand.niche);
    const emerging = findEmergingHashtags(brand.niche);
    const stats = getStats();
    return {
      ok: true,
      spokenResponse: response(
        `Hashtags: ${strategy.tags
          .slice(0, 5)
          .map((t) => `#${t.tag}`)
          .join(', ')}. Emergentes: ${emerging.slice(0, 3).join(', ')}.`,
        `Hashtags: ${strategy.tags
          .slice(0, 5)
          .map((t) => `#${t.tag}`)
          .join(', ')}. Emerging: ${emerging.slice(0, 3).join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: { strategy, emerging, stats },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error hashtag ecosystem.', 'Hashtag ecosystem error.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
