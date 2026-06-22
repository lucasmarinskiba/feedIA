/**
 * Run All — orquestador "Trabajar mi cuenta esta semana".
 *
 * 1 botón → corre cadena completa:
 *   1. nicheIntelligence (si no hay cache <7d)
 *   2. feedbackLoop (auto-sync IG + extraer winning patterns)
 *   3. generar N carruseles (1 por día de la semana objetivo)
 *   4. draft de DM replies templates (lead_warm / curiosity / support)
 *
 * Devuelve timeline + outputs agrupados. $0/mes (usa todo cacheado).
 *
 * POST /api/runall/week
 */

import { runNicheIntelligence, loadIntelligenceRaw } from './_nicheIntelligence.js';
import { analyzeAccount } from './_feedbackLoop.js';
import { createAutonomousPost } from './_autopilotCreate.js';
import { respondDM } from './_communityEngine.js';
import { getProfile } from './_accountMemory.js';

const TOTAL_BUDGET_MS = 55_000;

const withBudget = (promise, deadline, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), Math.max(1000, deadline - Date.now()))),
  ]);

// Días de la semana para el plan
const WEEK_THEMES = [
  { day: 'Lunes', theme: 'arranque + autoridad', format: 'carousel' },
  { day: 'Miércoles', theme: 'caso real o storytelling', format: 'carousel' },
  { day: 'Viernes', theme: 'hack práctico + CTA', format: 'carousel' },
];

const DM_TEMPLATES = [
  { intent: 'lead_warm', sample: 'hola, me interesa tu curso, cuánto sale?' },
  { intent: 'curiosity', sample: '¿cómo aprendiste esto?' },
  { intent: 'support', sample: 'probé tu método pero no me funcionó, qué hago?' },
];

export const runAll = async ({
  scope = 'anon',
  accountId = '',
  topic = '',
  platform = 'instagram',
  goal = 'engagement',
  carouselCount = 3,
} = {}) => {
  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_BUDGET_MS;
  const timeline = [];
  const tick = (icon, text, status = 'done') => timeline.push({ at: Date.now() - startedAt, icon, text, status });

  // 1) Cargar profile
  tick('📂', 'Cargando perfil + brand kit…');
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const bk = profile?.brandKit || profile || {};
  const niche = bk.niche || profile?.niche || '';
  const handle = bk.handle || accountId;
  if (!niche) {
    tick('⚠️', 'Sin nicho definido en Brand Kit. Configurá uno en /brandkit primero.', 'warn');
  }

  // 2) Niche Intelligence (si no hay cache fresco)
  tick('🧬', 'Cargando inteligencia del nicho…');
  let intel = await loadIntelligenceRaw({ scope, accountId, accountHandle: handle }).catch(() => null);
  const cacheStale = !intel?.builtAt || Date.now() - new Date(intel.builtAt).getTime() > 7 * 24 * 3600 * 1000;
  if (cacheStale) {
    tick('🔬', 'Corriendo análisis profundo (5 pasos)…');
    intel = await withBudget(
      runNicheIntelligence({
        topic: topic || niche,
        accountId,
        accountHandle: handle,
        brandNiche: niche,
        goal,
        scope,
        force: false,
      }).catch((e) => ({ error: String(e?.message || e) })),
      Date.now() + 25_000,
      null,
    );
    if (intel?.summary?.mainAngle) tick('✓', `Posicionamiento: ${intel.summary.mainAngle.slice(0, 100)}`);
    else tick('⚠️', 'Intelligence no se completó a tiempo (budget). Reintentá en /intelligence.', 'warn');
  } else {
    tick('✓', `Intelligence cacheada (${new Date(intel.builtAt).toLocaleDateString()})`);
  }

  // 3) Feedback loop (sync IG si conectado + winning patterns)
  tick('🧠', 'Aprendiendo de tus métricas…');
  const feedback = await withBudget(
    analyzeAccount({ scope, accountId: handle, niche, autoSync: true }).catch((e) => ({
      error: String(e?.message || e),
    })),
    Date.now() + 12_000,
    null,
  );
  if (feedback?.hasData)
    tick(
      '✓',
      `${feedback.patterns?.totalAnalyzed || 0} posts analizados · mejor formato: ${feedback.patterns?.bestFormat || '-'}`,
    );
  else if (feedback?.message) tick('ℹ️', feedback.message, 'warn');

  // 4) Generar N carruseles para los días planificados (paralelos sin imágenes para velocidad)
  tick('🎨', `Generando ${carouselCount} carrusel(es) para la semana…`);
  const carouselPromises = WEEK_THEMES.slice(0, carouselCount).map((slot) =>
    withBudget(
      createAutonomousPost({
        topic: topic || `${niche}: ${slot.theme}`,
        niche,
        goal,
        platform,
        format: slot.format,
        accountId: handle,
        images: [],
        brandColors: bk.colors || (bk.bgColor && bk.accentColor ? [bk.bgColor, bk.accentColor] : []),
        extraElements: bk.elements || [],
        brandVoice: bk.archetype || '',
        autoPublish: false,
        scope,
      }).catch((e) => ({ error: String(e?.message || e) })),
      deadline,
      { error: 'budget' },
    ).then((r) => ({ ...r, day: slot.day, theme: slot.theme })),
  );

  // 5) Generar drafts de respuesta DM (1 por intent)
  tick('💬', 'Preparando templates de respuesta DM…');
  const dmPromises = DM_TEMPLATES.map((t) =>
    withBudget(
      respondDM({ scope, accountId: handle, message: t.sample }).catch((e) => ({
        error: String(e?.message || e),
        intent: t.intent,
      })),
      deadline,
      { intent: t.intent, error: 'budget' },
    ),
  );

  const [carousels, dms] = await Promise.all([Promise.all(carouselPromises), Promise.all(dmPromises)]);

  const okCarousels = carousels.filter((c) => !c.error);
  const okDms = dms.filter((d) => !d.error && d.reply);

  tick('✓', `Listo: ${okCarousels.length} carruseles + ${okDms.length} templates DM`);

  return {
    ok: true,
    durationMs: Date.now() - startedAt,
    timeline,
    profile: { handle, niche, hasBrandKit: Boolean(bk.bgColor || bk.font) },
    intel: intel?.summary || null,
    feedback: feedback?.hasData ? { patterns: feedback.patterns, learnings: feedback.learnings } : null,
    carousels: okCarousels.map((c) => ({
      day: c.day,
      theme: c.theme,
      status: c.status,
      hook: c.content?.hook || '',
      caption: c.content?.caption || '',
      slides: c.carouselSlides || [],
      score: c.validation?.prediction?.viralScore,
    })),
    dmTemplates: okDms.map((d) => ({ intent: d.intent, reply: d.reply, action: d.suggestedAction })),
  };
};

// ── HTTP handler ─────────────────────────────────────────────────────────────
export const handleRunAll = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/runall/week' && m === 'POST') {
    try {
      const result = await runAll({
        scope: ctx.userId || 'anon',
        accountId: body?.accountId || '',
        topic: body?.topic || '',
        platform: body?.platform || 'instagram',
        goal: body?.goal || 'engagement',
        carouselCount: Math.max(1, Math.min(3, body?.carouselCount || 3)),
      });
      return json(200, result);
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 300) });
    }
  }
  return false;
};
