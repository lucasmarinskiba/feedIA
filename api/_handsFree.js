/**
 * Hands-Free — modo "manos libres" / Computer Use real (vía APIs).
 *
 * 1 textarea (voz o texto) → cadena completa AUTO sin que el usuario llene nada:
 *   intent → niche-detect → loadIntel + accountMemory.profile → gstack.decide
 *     → ejecutar (createAutonomousPost / respondDM / etc) → ready o publish
 *
 * Lee TODO del cache:
 *   - brand kit (colores, fonts, fotos) de accountMemory.profile.brandKit
 *   - niche intel cacheado 7 días
 *   - winningPatterns del feedbackLoop
 *   - archetype + mood derivados por gstack
 *
 * Usuario SOLO escribe intención. Cero forms.
 *
 * POST /api/handsfree/run    — ejecuta cadena, devuelve eventos timeline + output
 * POST /api/handsfree/parse  — parsea intent libre → estructura (formato, intent, topic)
 */

import { getProfile } from './_accountMemory.js';
import { loadIntelligenceRaw } from './_nicheIntelligence.js';
import { runGstack } from './_gstack.js';
import { askLLMJson } from './_llm.js';
import { parseIntent as parseIntentRich } from './_intentParser.js';

const TOTAL_BUDGET_MS = 50_000;
const withBudget = (promise, deadline, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), Math.max(1000, deadline - Date.now()))),
  ]);

// ── Parser de intent libre ───────────────────────────────────────────────────
// Mini-LLM call: convierte texto/voz humano → { format, intent, topic, urgency }
const parseIntent = async (raw = '') => {
  const t = raw.trim();
  if (!t) return null;

  // Heurística rápida (sin LLM) — la mayoría de intents caben
  const lower = t.toLowerCase();
  const heuristic = {
    rawInput: t,
    topic: t
      .replace(
        /^(haz|hac[eé]|crea[r]?|generar?|armar?|lanzar?|publicar?|escrib[íi]r?|respond[eé]r?)\s+(un[oa]?\s+)?/i,
        '',
      )
      .replace(/\b(carrusel|reel|story|historia|video|post|dm|coment[ao]|mensaje)s?\b/gi, '')
      .trim(),
    format: /carrusel|carousel|slides?/i.test(lower)
      ? 'carousel'
      : /reel|video|v[ií]deo/i.test(lower)
        ? 'reel'
        : /histor[ií]a|story|stories/i.test(lower)
          ? 'story'
          : null,
    intent: /respond[eé]r|contestar.*dm|mensaje privado/i.test(lower)
      ? 'dm'
      : /respond[eé]r.*coment|reply.*comment/i.test(lower)
        ? 'comment'
        : null,
    urgency: /ya|ahora|urgente|inmediato|publicar?\s*ya/i.test(lower) ? 'now' : 'normal',
  };

  // Si la heurística ya tiene format o intent claro → devolver
  if (heuristic.format || heuristic.intent) return heuristic;

  // Sino, intentar LLM para mejor parseo (1 llamada barata)
  try {
    const llm = await askLLMJson(`Parse la intención del usuario en JSON estricto.
Input: "${t}"
Devolvé SOLO: {"format":"carousel|reel|story|none","intent":"dm|comment|create|none","topic":"el tema principal sin emojis ni verbos","urgency":"now|normal"}`);
    if (llm) return { rawInput: t, ...llm };
  } catch {}
  return { ...heuristic, topic: t };
};

// ── Ejecutor: corre la cadena con timeline de eventos ───────────────────────
export const runHandsFree = async ({
  rawInput = '',
  accountId = '',
  scope = 'anon',
  platform = 'instagram',
  goal = 'engagement',
  autoPublish = false,
} = {}) => {
  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_BUDGET_MS;
  const timeline = [];
  const tick = (icon, text, status = 'done') =>
    timeline.push({
      at: Date.now() - startedAt,
      icon,
      text,
      status,
    });

  // 1. Parsear intent ENRIQUECIDO (extrae colores, slideCount, hook, mood, plantilla)
  tick('🧠', 'Entendiendo tu pedido…');
  const parsed = await withBudget(parseIntentRich(rawInput, { useLLM: true }), Date.now() + 8000, null);
  if (!parsed?.topic && !parsed?.format && !parsed?.action) {
    return {
      ok: false,
      error: 'no-intent',
      message: 'No entendí qué querés. Decime algo como: "creá un carrusel sobre IA con 5 slides azul y negro".',
      timeline,
    };
  }

  // Narrar constraints detectados (user confirma que entendí bien)
  const cs = parsed.constraints || {};
  const detected = [];
  if (parsed.format) detected.push(`formato ${parsed.format}`);
  if (parsed.platform) detected.push(`para ${parsed.platform}`);
  if (cs.slideCount) detected.push(`${cs.slideCount} slides`);
  if (cs.bgColor) detected.push(`fondo ${cs.bgColor}`);
  if (cs.accentColor) detected.push(`acento ${cs.accentColor}`);
  if (cs.mood) detected.push(`estética ${cs.mood}`);
  if (cs.hookOverride) detected.push(`hook: "${cs.hookOverride.slice(0, 40)}…"`);
  if (parsed.useCanva) detected.push('plantilla Canva');
  if (parsed.useCapCut) detected.push('spec CapCut');
  tick('✓', `Entendí: ${detected.length ? detected.join(' · ') : (parsed.topic || rawInput).slice(0, 70)}${parsed.literal ? ' (instrucciones precisas → respeto literal)' : ''}`);

  // 2. Cargar contexto auto (NO pide al usuario)
  tick('📂', 'Cargando tu marca + memoria…');
  const [profile, intel] = await Promise.all([
    getProfile(scope, accountId).catch(() => ({})),
    loadIntelligenceRaw({ scope, accountId, accountHandle: accountId }).catch(() => null),
  ]);
  const brandKit = profile?.brandKit || {};
  const niche = profile?.niche || intel?.niche?.primaryNiche || '';
  tick(
    '✓',
    `Marca: ${profile?.handle || accountId || 'sin handle'} · nicho: ${niche || 'sin definir'}${intel ? ' · inteligencia cacheada' : ''}`,
  );

  // 3. Delegar a Gstack — pasa TODOS los constraints del intent literal
  tick('🎯', parsed.literal ? 'Aplicando tus indicaciones precisas…' : 'Eligiendo voz, estética y roles…');
  const cs2 = parsed.constraints || {};
  // Constraints literales TIENEN precedencia sobre brand kit
  const finalColors = [cs2.bgColor, cs2.accentColor, cs2.textColor].filter(Boolean);
  const brandColors = finalColors.length ? finalColors : (brandKit.colors || []);
  const gstackResult = await withBudget(
    runGstack({
      task: rawInput,
      topic: parsed.topic || rawInput,
      format: parsed.format || (platform === 'tiktok' ? 'reel' : 'carousel'),
      intent: parsed.action === 'respond' ? (parsed.format === 'comment' ? 'comment' : 'dm') : null,
      niche,
      goal,
      accountId,
      scope,
      platform: parsed.platform || platform,
      brandColors,
      extraElements: brandKit.elements || [],
      images: brandKit.photo ? [brandKit.photo] : [],
      // Constraints literales del user
      mood: cs2.mood || brandKit.mood || 'premium',
      textColor: cs2.textColor || brandKit.textColor || null,
      bgColor: cs2.bgColor || brandKit.bgColor || null,
      accentColor: cs2.accentColor || brandKit.accentColor || null,
      hookOverride: cs2.hookOverride || '',
      slideCount: cs2.slideCount || 5,
    }).catch((e) => ({ error: String(e?.message || e).slice(0, 200) })),
    deadline,
    { error: 'budget' },
  );

  if (gstackResult?.error) {
    tick('⚠️', `Falló: ${gstackResult.error}`, 'fail');
    return { ok: false, error: gstackResult.error, timeline, durationMs: Date.now() - startedAt };
  }

  const d = gstackResult.decision || {};
  tick('✓', `Voz: ${d.archetype} · estética: ${d.mood} · ${(d.roles || []).length} roles activos`);

  const o = gstackResult.output || {};
  if (o.pending) {
    tick('⏳', o.reason || 'Pendiente', 'pending');
  } else if (o.error) {
    tick('⚠️', `Output error: ${o.error}`, 'fail');
  } else {
    if (o.content?.hook) tick('✍️', `Hook: "${o.content.hook}"`);
    if (Array.isArray(o.carouselSlides)) tick('🖼️', `${o.carouselSlides.length} slides generados`);
    if (o.image?.url) tick('🖼️', 'Imagen generada');
    if (o.publish?.ok) tick('📤', `Publicado: ${o.publish.mediaId || 'OK'}`);
    else if (autoPublish && o.status === 'not-connected')
      tick('🔌', 'Conectá tu cuenta IG/TT para publicar automáticamente', 'warn');
    else tick('✅', 'Listo para revisión + publicar con 1 click');
  }

  return {
    ok: true,
    durationMs: Date.now() - startedAt,
    timeline,
    decision: d,
    output: o,
    parsed,
  };
};

// ── HTTP handler ─────────────────────────────────────────────────────────────
export const handleHandsFree = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/handsfree/parse' && m === 'POST') {
    try {
      const parsed = await parseIntent(body?.input || '');
      return json(200, { ok: true, parsed });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }

  if (path === '/api/handsfree/run' && m === 'POST') {
    try {
      const result = await runHandsFree({
        rawInput: body?.input || '',
        accountId: body?.accountId || '',
        scope: ctx.userId || 'anon',
        platform: body?.platform || 'instagram',
        goal: body?.goal || 'engagement',
        autoPublish: Boolean(body?.autoPublish),
      });
      return json(200, result);
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }

  return false;
};
