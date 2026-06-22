/**
 * Free Computer Use — agente de automatización web para plan Free.
 *
 * Stack:
 *   - VISIÓN: Groq Llama 3.2 90B Vision (free, 14.4K req/día compartidos)
 *             ó BYOK Ollama llava/llama3.2-vision (user corre local)
 *   - ACTION DECISION: Llama 3.3 70B (Groq, free)
 *   - EXECUTOR: server-side scripted recipes (deterministas) + browser
 *               operation queue para que user ejecute desde su navegador
 *
 * Free user: 5 min/día de CU automation + 3 autopilot ticks/día.
 * Paid: Claude Computer Use real + 24/7 autopilot.
 *
 * Strategy: en serverless NO ejecutamos browser headless (timeout 60s).
 * En su lugar, generamos PLAN de acciones que cliente ejecuta o agenda.
 */

import * as store from './_store.js';
import { freeLlm } from './_freeAi.js';
import { getSessionFromReq } from './_users.js';

const GROQ_KEY = process.env.GROQ_API_KEY || '';

// Daily caps free — pool protection
const FREE_CU_MIN_PER_DAY = 30; // 30 min/día
const FREE_CU_VISION_CALLS_PER_DAY = 25; // vision (Groq pool) cap separado
const FREE_AUTOPILOT_TICKS_PER_DAY = 6; // cada 4hs

const dayKey = () => new Date().toISOString().slice(0, 10);

/* ───────── Recipe library — deterministas, sin IA ───────── */

export const FREE_RECIPES = {
  'ig-engage-feed': {
    id: 'ig-engage-feed',
    label: '📷 Engagement IG (like + comment 10 posts)',
    estimatedMin: 3,
    steps: [
      { app: 'instagram', action: 'open', detail: 'Abrir instagram.com', timeoutMs: 8000 },
      { app: 'instagram', action: 'scroll-feed', detail: 'Scroll lento 10 posts', timeoutMs: 30000 },
      { app: 'instagram', action: 'like-relevant', detail: 'Like en 5-7 posts del nicho', timeoutMs: 60000 },
      { app: 'instagram', action: 'comment-soft', detail: 'Comentar en 2-3 (template + emoji)', timeoutMs: 90000 },
      { app: 'instagram', action: 'wait', detail: 'Pausa 30-60s entre acciones (anti-bot)', timeoutMs: 60000 },
    ],
    rateLimitNotes: 'Max 30 likes/hora, 10 comments/hora. Respetá pausas.',
  },
  'ig-stories-watch': {
    id: 'ig-stories-watch',
    label: '📷 Ver stories de followers',
    estimatedMin: 2,
    steps: [
      { app: 'instagram', action: 'open', detail: 'Home feed', timeoutMs: 5000 },
      { app: 'instagram', action: 'open-stories', detail: 'Tap bar de stories arriba', timeoutMs: 3000 },
      { app: 'instagram', action: 'watch-all', detail: 'Ver completas 8-12 stories', timeoutMs: 120000 },
    ],
    rateLimitNotes: 'Sin rate limit. Recomendado diario.',
  },
  'ig-dm-greet-leads': {
    id: 'ig-dm-greet-leads',
    label: '💬 Saludar 3 leads nuevos en DM',
    estimatedMin: 3,
    steps: [
      { app: 'instagram', action: 'open-inbox', detail: 'Tap avión arriba', timeoutMs: 5000 },
      { app: 'instagram', action: 'find-unread', detail: 'Buscar 3 chats sin respuesta', timeoutMs: 10000 },
      { app: 'instagram', action: 'send-template', detail: 'Saludo personalizado por chat', timeoutMs: 120000 },
    ],
    rateLimitNotes: 'Max 20 DMs/día sin warming. Personalizá.',
  },
  'tt-scroll-fyp': {
    id: 'tt-scroll-fyp',
    label: '🎵 Scroll For You (5 min)',
    estimatedMin: 5,
    steps: [
      { app: 'tiktok', action: 'open', detail: 'Abrir TikTok web', timeoutMs: 8000 },
      { app: 'tiktok', action: 'fyp', detail: 'Scroll FYP 5 min', timeoutMs: 300000 },
      { app: 'tiktok', action: 'like-relevant', detail: 'Like en 5-10 videos nicho', timeoutMs: 60000 },
      { app: 'tiktok', action: 'follow-creators', detail: 'Follow 2-3 creators del nicho', timeoutMs: 30000 },
    ],
    rateLimitNotes: 'Crucial para algoritmo FYP. Diario.',
  },
  'tt-trending-research': {
    id: 'tt-trending-research',
    label: '🎵 Research sonidos trending',
    estimatedMin: 3,
    steps: [
      { app: 'tiktok', action: 'search', detail: 'Tab Discover', timeoutMs: 5000 },
      { app: 'tiktok', action: 'browse-trending', detail: 'Ver top sonidos 24-72h', timeoutMs: 90000 },
      { app: 'tiktok', action: 'save-sounds', detail: 'Save 3-5 sonidos a colección', timeoutMs: 45000 },
    ],
    rateLimitNotes: 'Sin rate limit.',
  },
  'ig-tt-cross-post-check': {
    id: 'ig-tt-cross-post-check',
    label: '🔄 Verificar cross-posts pendientes',
    estimatedMin: 2,
    steps: [
      { app: 'instagram', action: 'open-profile', detail: 'Ver últimos 3 posts IG', timeoutMs: 10000 },
      { app: 'tiktok', action: 'open-profile', detail: 'Ver últimos 3 videos TT', timeoutMs: 10000 },
      { app: 'system', action: 'compare', detail: 'Identificar posts no cross-posted', timeoutMs: 5000 },
    ],
    rateLimitNotes: 'Sin rate limit.',
  },
};

/* ───────── Caps ───────── */

const checkCuCap = async (userId) => {
  const k = `feedia:freecu:${userId}:${dayKey()}`;
  const usedMin = Number((await store.get(k)) || 0);
  return { allowed: usedMin < FREE_CU_MIN_PER_DAY, usedMin, capMin: FREE_CU_MIN_PER_DAY };
};

const checkVisionCallCap = async (userId) => {
  const k = `feedia:freecuvis:${userId}:${dayKey()}`;
  const used = Number((await store.get(k)) || 0);
  return { allowed: used < FREE_CU_VISION_CALLS_PER_DAY, used, cap: FREE_CU_VISION_CALLS_PER_DAY };
};

const bumpVisionCallCount = async (userId) => {
  const k = `feedia:freecuvis:${userId}:${dayKey()}`;
  const current = Number((await store.get(k)) || 0);
  await store.set(k, current + 1);
};

const bumpCuUsage = async (userId, minutes) => {
  const k = `feedia:freecu:${userId}:${dayKey()}`;
  const current = Number((await store.get(k)) || 0);
  await store.set(k, current + minutes);
};

const checkAutopilotCap = async (userId) => {
  const k = `feedia:freeautopilot:${userId}:${dayKey()}`;
  const ticks = Number((await store.get(k)) || 0);
  return { allowed: ticks < FREE_AUTOPILOT_TICKS_PER_DAY, ticks, cap: FREE_AUTOPILOT_TICKS_PER_DAY };
};

const bumpAutopilotTick = async (userId) => {
  const k = `feedia:freeautopilot:${userId}:${dayKey()}`;
  const current = Number((await store.get(k)) || 0);
  await store.set(k, current + 1);
};

/* ───────── Vision via Groq Llama 3.2 90B (free) ───────── */

export const analyzeScreenshot = async ({ imageBase64, question, userId }) => {
  const byok = userId ? await store.get(`feedia:user:${userId}:byok`) : null;
  const ollamaUrl = byok?.ollama;

  // Path A: BYOK Ollama (user runs local) — privacy + unlimited
  if (ollamaUrl) {
    try {
      const r = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2-vision',
          prompt: question,
          images: [imageBase64.replace(/^data:image\/\w+;base64,/, '')],
          stream: false,
        }),
      });
      if (r.ok) {
        const j = await r.json();
        return { text: j.response || '', provider: 'ollama-local', model: 'llama3.2-vision' };
      }
    } catch {
      /* fallback */
    }
  }

  // Path B: Groq Llama 3.2 90B Vision (free shared)
  if (GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.2-90b-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: question },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1024,
          temperature: 0.4,
        }),
      });
      if (r.ok) {
        const j = await r.json();
        return { text: j.choices?.[0]?.message?.content || '', provider: 'groq-vision', model: 'llama-3.2-90b-vision' };
      }
    } catch {
      /* noop */
    }
  }

  return { text: '', provider: 'none', model: 'none', error: 'No vision provider available' };
};

/* ───────── Free CU planner ───────── */

/** Heurística para matchear instrucción → recipe (sin LLM). */
const matchRecipeByKeywords = (instruction) => {
  const t = instruction.toLowerCase();
  if (/engage|like|comment.*feed|interact.*posts?/.test(t)) return FREE_RECIPES['ig-engage-feed'];
  if (/stor(y|ies).*watch|ver stor|seguidor.*story/.test(t)) return FREE_RECIPES['ig-stories-watch'];
  if (/dm|mensaj|inbox|lead/.test(t)) return FREE_RECIPES['ig-dm-greet-leads'];
  if (/(fyp|for you|tiktok.*scroll)/.test(t)) return FREE_RECIPES['tt-scroll-fyp'];
  if (/(trending|sound|sonido).*(tiktok|tt)/.test(t)) return FREE_RECIPES['tt-trending-research'];
  if (/cross[\s-]?post/.test(t)) return FREE_RECIPES['ig-tt-cross-post-check'];
  return null;
};

export const planFreeCu = async ({ userId, instruction, screenshotBase64, currentUrl }) => {
  // 1) Recipe match → instant, $0
  const recipeMatch = matchRecipeByKeywords(instruction);

  if (recipeMatch) {
    return {
      kind: 'recipe',
      recipe: recipeMatch,
      steps: recipeMatch.steps,
      estimatedMin: recipeMatch.estimatedMin,
      provider: 'deterministic',
      reasoning: `Recipe matched: ${recipeMatch.label}. Sin gastar tokens.`,
      visionCallUsed: false,
    };
  }

  // 2) Vision SOLO si hay screenshot Y cap disponible
  let visionAnalysis = null;
  let visionCallUsed = false;
  if (screenshotBase64) {
    const visionCap = await checkVisionCallCap(userId);
    if (visionCap.allowed) {
      visionAnalysis = await analyzeScreenshot({
        imageBase64: screenshotBase64,
        question: `Analyze this Instagram/TikTok screenshot. Goal: "${instruction}". Identify: (1) what's on screen, (2) clickable elements with approximate positions, (3) next 3 actions to achieve goal. Be concise, bullet format.`,
        userId,
      });
      visionCallUsed = true;
      await bumpVisionCallCount(userId);
    } else {
      visionAnalysis = {
        text: `Vision cap reached (${visionCap.used}/${visionCap.cap} hoy). Planeando sin screenshot.`,
        provider: 'capped',
      };
    }
  }

  // Plan acciones con Llama 3.3 70B
  const planPrompt = `Eres un agente que automatiza Instagram/TikTok web. Plan de acciones para: "${instruction}".
${visionAnalysis?.text ? `\nScreenshot analysis:\n${visionAnalysis.text}\n` : ''}
${currentUrl ? `URL actual: ${currentUrl}\n` : ''}

Genera JSON con plan de máximo 5 pasos. Cada paso:
{ "step": N, "action": "click|type|scroll|wait|screenshot|navigate", "selector": "...", "value": "...", "reason": "..." }

Considera rate limits: max 30 likes/hora, 10 comments/hora, 20 DMs/día.
Si la acción es riesgosa (>20 acciones rápidas, mass follow, etc), avisá en "warning".

JSON:`;

  const { text, provider, model } = await freeLlm({
    prompt: planPrompt,
    system: 'Sos un agente experto en automatización segura de IG/TikTok. Respondés JSON válido sin markdown.',
    maxTokens: 1200,
    temperature: 0.3,
  });

  let parsed = null;
  try {
    parsed = JSON.parse(text.replace(/```json\s*|\s*```/g, '').trim());
  } catch {
    /* fallback */
  }

  if (!parsed || !parsed.steps) {
    parsed = {
      steps: [
        {
          step: 1,
          action: 'screenshot',
          selector: 'viewport',
          value: '',
          reason: 'Capturar estado actual para analizar',
        },
        { step: 2, action: 'wait', selector: '', value: '2000', reason: 'Esperar página estable' },
      ],
      warning: 'Plan fallback (LLM no devolvió JSON válido). Ejecutá pasos manualmente.',
    };
  }

  return {
    kind: 'planned',
    instruction,
    visionAnalysis,
    visionCallUsed,
    plan: parsed,
    estimatedMin: Math.min(FREE_CU_MIN_PER_DAY, Math.max(1, (parsed.steps || []).length * 2)),
    provider,
    model,
  };
};

/* ───────── Autopilot tick (free) ───────── */

export const runFreeAutopilotTick = async ({ userId, metrics }) => {
  // Free autopilot = análisis ligero + recomendaciones, NO ejecución autónoma
  const m = metrics || {};
  const flags = [];
  const actions = [];

  if (m.reach && m.reachPrev && m.reach < m.reachPrev * 0.7) {
    flags.push('Reach cayó >30% vs último período');
    actions.push({ recipe: 'ig-engage-feed', why: 'Algoritmo necesita señal de engagement activo' });
  }

  if (m.followers && m.followers < 1000 && m.daysSinceLastPost > 3) {
    flags.push('Cuenta chica + cadencia baja');
    actions.push({ recipe: 'ig-stories-watch', why: 'Stories diarias = retention de followers actuales' });
  }

  if (m.tiktokFypReach && m.tiktokFypReach < 0.3) {
    flags.push('FYP push bajo en TikTok');
    actions.push({ recipe: 'tt-scroll-fyp', why: 'Engagement en FYP enseña al algo qué te interesa' });
  }

  if (m.unreadDms && m.unreadDms > 5) {
    flags.push(`${m.unreadDms} DMs sin responder`);
    actions.push({ recipe: 'ig-dm-greet-leads', why: 'DMs sin responder >24h = leads perdidos' });
  }

  // Recomendación general
  if (actions.length === 0) {
    actions.push({ recipe: 'ig-tt-cross-post-check', why: 'Mantenimiento diario sin presión' });
  }

  return {
    timestamp: new Date().toISOString(),
    flags,
    recommendedActions: actions,
    capInfo: { tier: 'free', maxTicksPerDay: FREE_AUTOPILOT_TICKS_PER_DAY },
    nextTickIn: '8 horas (free: 3 ticks/día)',
  };
};

/* ───────── Handler ───────── */

export const handleFreeCu = async (req, res, path, m, body) => {
  // GET /api/free-cu/status
  if (path === '/api/free-cu/status' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'no session' }));
      return true;
    }
    const cu = await checkCuCap(ctx.user.id);
    const vc = await checkVisionCallCap(ctx.user.id);
    const ap = await checkAutopilotCap(ctx.user.id);
    const byok = (await store.get(`feedia:user:${ctx.user.id}:byok`)) || {};
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        planId: ctx.user.plan || 'free',
        computerUse: {
          usedMinutes: cu.usedMin,
          capMinutes: cu.capMin,
          remaining: cu.capMin - cu.usedMin,
          visionCallsUsed: vc.used,
          visionCallsCap: vc.cap,
          visionRemaining: vc.cap - vc.used,
          visionProvider: byok.ollama ? 'ollama-local-byok-unlimited' : GROQ_KEY ? 'groq-llama-3.2-vision' : 'none',
          recipes: Object.values(FREE_RECIPES).map((r) => ({ id: r.id, label: r.label, estimatedMin: r.estimatedMin })),
          tip: 'Recipes deterministas (sin gastar vision). Vision sólo cuando subís screenshot.',
        },
        autopilot: {
          ticksUsed: ap.ticks,
          ticksCap: ap.cap,
          remaining: ap.cap - ap.ticks,
          intervalHours: 4,
          nextTickEstimate: ap.ticks < ap.cap ? '~4h o cuando lo dispares manual' : 'mañana',
        },
        paidUpgrade: 'Starter $7 → 90min CU + 12 ticks. Pro $19 → 4hs CU + 48 ticks. Gold $39 → 8hs + council.',
      }),
    );
    return true;
  }

  // POST /api/free-cu/plan
  if (path === '/api/free-cu/plan' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'no session' }));
      return true;
    }
    const cu = await checkCuCap(ctx.user.id);
    if (!cu.allowed) {
      res.statusCode = 402;
      res.end(
        JSON.stringify({
          error: 'cu-cap-reached',
          message: `Llegaste a ${cu.capMin}min/día gratis.`,
          usedMin: cu.usedMin,
          capMin: cu.capMin,
          upgradeUrl: '/pricing.html',
        }),
      );
      return true;
    }
    const b = body || {};
    const plan = await planFreeCu({
      userId: ctx.user.id,
      instruction: b.instruction || 'engage feed',
      screenshotBase64: b.screenshotBase64 || null,
      currentUrl: b.currentUrl || null,
    });
    await bumpCuUsage(ctx.user.id, plan.estimatedMin || 1);
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(plan));
    return true;
  }

  // POST /api/free-cu/autopilot/tick
  if (path === '/api/free-cu/autopilot/tick' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'no session' }));
      return true;
    }
    const ap = await checkAutopilotCap(ctx.user.id);
    if (!ap.allowed) {
      res.statusCode = 402;
      res.end(
        JSON.stringify({
          error: 'autopilot-cap-reached',
          message: `Free: ${ap.cap} ticks/día. Volvé mañana o upgrade a Pro.`,
          upgradeUrl: '/pricing.html',
        }),
      );
      return true;
    }
    const result = await runFreeAutopilotTick({ userId: ctx.user.id, metrics: body?.metrics || {} });
    await bumpAutopilotTick(ctx.user.id);
    await store.set(`feedia:user:${ctx.user.id}:autopilot:lasttick`, result);
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(result));
    return true;
  }

  // GET /api/free-cu/recipes
  if (path === '/api/free-cu/recipes' && m === 'GET') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ recipes: Object.values(FREE_RECIPES) }));
    return true;
  }

  return false;
};
