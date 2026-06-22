/**
 * competitiveIntelligenceVoice.ts — Inteligencia Competitiva Automatizada
 * ─────────────────────────────────────────────────────────────────────────
 * Un único comando de voz: "analizá mi competencia".
 * Orquesta tracking, SWOT, posting patterns, content gap y genera un
 * reporte ejecutivo hablado con acciones prioritarias.
 */

import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';
import type { VoiceActionResult } from './voiceActionRouter.js';
import type { CompetitorSnapshot } from '../integrations/competitors.js';

const ok = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: true,
  spokenResponse: es,
  actionType,
  executed: true,
  detail,
});

const fail = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: false,
  spokenResponse: es,
  actionType,
  executed: false,
  detail,
});

const lang = (): 'es' | 'en' => {
  const l = process.env['TTS_LANGUAGE'] ?? 'es-AR';
  return l.startsWith('en') ? 'en' : 'es';
};

/* ── Full Competitive Analysis ───────────────────────────────────────────── */

export const runFullCompetitiveAnalysis = async (): Promise<VoiceActionResult> => {
  const actionType = 'competitor.fullAnalysis';
  const locale = lang();
  log.info('[competitiveIntelligenceVoice] runFullCompetitiveAnalysis');

  try {
    const brand = loadBrandProfile();
    const competitors = brand.competitors ?? [];

    if (competitors.length === 0) {
      return fail(
        'No tenés competidores configurados. Agregalos en brand.json bajo el campo "competitors".',
        'No competitors configured. Add them to brand.json under the "competitors" field.',
        actionType,
      );
    }

    // 1. Traer snapshots frescos
    const { trackCompetitors } = await import('../integrations/competitors.js');
    const snapshots = await trackCompetitors(competitors);

    // 2. Cargar historial previo para alertas proactivas
    const previous = loadPreviousSnapshots();

    // 3. Persistir snapshots para historial
    persistSnapshots(snapshots);

    // 4. Ejecutar análisis en paralelo
    const [swots, gaps, collabs, sentiments] = await Promise.all([
      runSwotAnalysis(brand, snapshots),
      runContentGapAnalysis(brand, snapshots),
      runCollabDetection(snapshots),
      runSentimentAnalysis(snapshots),
    ]);

    // 5. Detectar posting patterns
    const patterns = await runPostingPatterns(snapshots);

    // 6. Detectar virales
    const { detectarVirales } = await import('../capabilities/competitors/monitor.js');
    const viralPosts = detectarVirales(
      snapshots.flatMap((s) =>
        (s.topPosts ?? []).map((p) => ({
          cuenta: s.handle,
          resumenContenido: p.caption,
          metricsAprox: { likes: p.likes },
          publicadoHaceHoras: 0,
          formato: 'post-imagen' as const,
        })),
      ),
    );

    // 7. Generar alertas proactivas (comparación con historial)
    const alerts = generateAlerts(previous, snapshots, sentiments);

    // 8. Generar reporte ejecutivo hablado
    const topRival = snapshots.reduce((best, s) => ((s.engagementRate ?? 0) > (best.engagementRate ?? 0) ? s : best));

    const topGap = gaps.recomendacionPrioritaria;
    const topCollab = collabs.find((c) => c.handle === topRival.handle);
    const topSentiment = sentiments.find((s) => s.handle === topRival.handle);

    const alertText = alerts.length > 0 ? ` Alertas: ${alerts[0]}.` : '';

    const esSummary = `Análisis de ${competitors.length} competidores completado. @${topRival.handle} lidera con ${topRival.engagementRate?.toFixed(1) ?? 'N/A'}% engagement. ${viralPosts.length > 0 ? `${viralPosts.length} post viral detectado.` : ''}${alertText} Oportunidad clave: ${topGap}. Revisá el dashboard para el reporte completo.`;

    const enSummary = `Analysis of ${competitors.length} competitors complete. @${topRival.handle} leads with ${topRival.engagementRate?.toFixed(1) ?? 'N/A'}% engagement. ${viralPosts.length > 0 ? `${viralPosts.length} viral post detected.` : ''}${alertText} Key opportunity: ${topGap}. Check the dashboard for the full report.`;

    const spoken = locale === 'es' ? esSummary : enSummary;

    return ok(spoken, spoken, actionType, {
      competitors: competitors.length,
      snapshots,
      swots,
      contentGap: gaps,
      patterns,
      collabs,
      sentiments,
      viralPosts,
      alerts,
      topRival: topRival.handle,
      topCollabInsight: topCollab?.insights[0] ?? '',
      topSentimentRisk: topSentiment?.crisisRisk ?? 'bajo',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[competitiveIntelligenceVoice] Error: ${msg}`);
    return fail(
      `Error en análisis competitivo. ${msg.slice(0, 120)}`,
      `Competitive analysis error. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── SWOT Analysis ───────────────────────────────────────────────────────── */

const runSwotAnalysis = async (
  brand: ReturnType<typeof loadBrandProfile>,
  snapshots: CompetitorSnapshot[],
): Promise<import('../capabilities/competitors/swot.js').CompetitorSwot[]> => {
  const { analyzeSwot } = await import('../capabilities/competitors/swot.js');
  const results = [];
  for (const snap of snapshots) {
    try {
      const swot = await analyzeSwot(brand, snap);
      results.push(swot);
    } catch (e) {
      log.warn(`[competitiveIntelligenceVoice] SWOT failed for ${snap.handle}: ${(e as Error).message}`);
    }
  }
  return results;
};

/* ── Content Gap Analysis ────────────────────────────────────────────────── */

const runContentGapAnalysis = async (
  brand: ReturnType<typeof loadBrandProfile>,
  snapshots: CompetitorSnapshot[],
): Promise<import('../capabilities/competitors/contentGap.js').ContentGapResult> => {
  const { analyzeContentGap } = await import('../capabilities/competitors/contentGap.js');
  const competitorCaptions = snapshots.flatMap((s) =>
    (s.topPosts ?? []).map((p) => ({
      handle: s.handle,
      caption: p.caption,
      likes: p.likes,
    })),
  );
  // Nuestros temas recientes — simulados por ahora, en producción vendrían del content calendar
  const ourTopics = [brand.niche, brand.goals.primary];
  return analyzeContentGap(brand, competitorCaptions, ourTopics);
};

/* ── Posting Patterns ────────────────────────────────────────────────────── */

const runPostingPatterns = async (
  snapshots: CompetitorSnapshot[],
): Promise<import('../capabilities/competitors/postingPatterns.js').PostingPattern[]> => {
  const { analyzePostingPatterns } = await import('../capabilities/competitors/postingPatterns.js');
  const results = [];
  for (const snap of snapshots) {
    try {
      const posts = (snap.topPosts ?? []).map((p) => ({
        caption: p.caption,
        timestamp: snap.snapshotDate,
        format: 'post-imagen' as const,
      }));
      const pattern = await analyzePostingPatterns(snap.handle, posts);
      results.push(pattern);
    } catch (e) {
      log.warn(`[competitiveIntelligenceVoice] Patterns failed for ${snap.handle}: ${(e as Error).message}`);
    }
  }
  return results;
};

/* ── Collab Detection ────────────────────────────────────────────────────── */

const runCollabDetection = async (
  snapshots: CompetitorSnapshot[],
): Promise<import('../capabilities/competitors/collabMap.js').CollabDetection[]> => {
  const { detectCollaborators } = await import('../capabilities/competitors/collabMap.js');
  const results = [];
  for (const snap of snapshots) {
    try {
      const posts = (snap.topPosts ?? []).map((p) => ({ caption: p.caption, likes: p.likes }));
      if (posts.length > 0) {
        const collab = await detectCollaborators(snap.handle, posts);
        results.push(collab);
      }
    } catch (e) {
      log.warn(`[competitiveIntelligenceVoice] Collab detection failed for ${snap.handle}: ${(e as Error).message}`);
    }
  }
  return results;
};

/* ── Sentiment Analysis ──────────────────────────────────────────────────── */

const runSentimentAnalysis = async (
  snapshots: CompetitorSnapshot[],
): Promise<import('../capabilities/competitors/sentiment.js').CompetitorSentiment[]> => {
  const { analyzeCompetitorSentiment } = await import('../capabilities/competitors/sentiment.js');
  const results = [];
  for (const snap of snapshots) {
    try {
      // Simulamos comentarios a partir de captions como proxy (en producción vendrían de API)
      const comments = (snap.topPosts ?? []).map((p) => ({
        text: p.caption,
        likes: p.likes,
      }));
      if (comments.length > 0) {
        const sentiment = await analyzeCompetitorSentiment(snap.handle, comments);
        results.push(sentiment);
      }
    } catch (e) {
      log.warn(`[competitiveIntelligenceVoice] Sentiment failed for ${snap.handle}: ${(e as Error).message}`);
    }
  }
  return results;
};

/* ── Proactive Alerts ────────────────────────────────────────────────────── */

const generateAlerts = (
  previous: Record<string, CompetitorSnapshot>,
  current: CompetitorSnapshot[],
  sentiments: import('../capabilities/competitors/sentiment.js').CompetitorSentiment[],
): string[] => {
  const alerts: string[] = [];
  for (const snap of current) {
    const prev = previous[snap.handle];
    if (prev) {
      const prevEr = prev.engagementRate ?? 0;
      const currEr = snap.engagementRate ?? 0;
      if (currEr > prevEr * 1.3) {
        alerts.push(`@${snap.handle} subió ${((currEr / prevEr - 1) * 100).toFixed(0)}% en engagement`);
      }
      const prevFollowers = prev.followers ?? 0;
      const currFollowers = snap.followers ?? 0;
      if (currFollowers > prevFollowers * 1.1) {
        alerts.push(`@${snap.handle} creció ${currFollowers - prevFollowers} seguidores`);
      }
    }
    const sentiment = sentiments.find((s) => s.handle === snap.handle);
    if (sentiment?.crisisRisk === 'alto') {
      alerts.push(`@${snap.handle} tiene riesgo de crisis en comunidad`);
    }
  }
  return alerts.slice(0, 3); // Máx 3 alertas para no saturar
};

/* ── Persistence ─────────────────────────────────────────────────────────── */

const persistSnapshots = (snapshots: CompetitorSnapshot[]): void => {
  try {
    const { writeFileSync, mkdirSync } = require('node:fs');
    const { resolve } = require('node:path');
    const dir = resolve('data/runtime/competitor-history');
    mkdirSync(dir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    writeFileSync(resolve(dir, `snapshots-${date}.json`), JSON.stringify({ date, snapshots }, null, 2), 'utf-8');
  } catch (e) {
    log.warn(`[competitiveIntelligenceVoice] Could not persist: ${(e as Error).message}`);
  }
};

const loadPreviousSnapshots = (): Record<string, CompetitorSnapshot> => {
  try {
    const { readFileSync, existsSync } = require('node:fs');
    const { resolve } = require('node:path');
    const dir = resolve('data/runtime/competitor-history');
    if (!existsSync(dir)) return {};
    const files = require('node:fs').readdirSync(dir).sort().reverse();
    if (files.length < 2) return {}; // Necesitamos al menos un snapshot anterior
    const prevFile = resolve(dir, files[1]);
    const data = JSON.parse(readFileSync(prevFile, 'utf-8')) as { snapshots?: CompetitorSnapshot[] };
    const map: Record<string, CompetitorSnapshot> = {};
    for (const s of data.snapshots ?? []) map[s.handle] = s;
    return map;
  } catch (e) {
    log.warn(`[competitiveIntelligenceVoice] Could not load previous: ${(e as Error).message}`);
    return {};
  }
};

/* ── Quick Competitor Check (individual) ─────────────────────────────────── */

export const quickCompetitorCheck = async (handle: string): Promise<VoiceActionResult> => {
  const actionType = 'competitor.quickCheck';
  log.info(`[competitiveIntelligenceVoice] quickCompetitorCheck: ${handle}`);
  try {
    const { trackCompetitor } = await import('../integrations/competitors.js');
    const snap = await trackCompetitor(handle);
    return ok(
      `@${handle}: ${snap.followers ?? '?'} seguidores, engagement ${snap.engagementRate?.toFixed(2) ?? '?'}%, ${snap.postsCount ?? '?'} posts. Top hashtags: ${snap.topHashtags?.slice(0, 3).join(', ') ?? 'N/A'}.`,
      `@${handle}: ${snap.followers ?? '?'} followers, engagement ${snap.engagementRate?.toFixed(2) ?? '?'}%, ${snap.postsCount ?? '?'} posts. Top hashtags: ${snap.topHashtags?.slice(0, 3).join(', ') ?? 'N/A'}.`,
      actionType,
      snap,
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error analizando @${handle}. ${msg.slice(0, 120)}`,
      `Error analyzing @${handle}. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
