/**
 * AI Router — central decisión: qué modelo usar para este user/task.
 *
 * Política:
 *   - Free + sin BYOK → Groq Llama (pool compartido, cap por user)
 *   - Free + BYOK → tu key (sin tocar pool del sistema)
 *   - Starter → Sonnet
 *   - Pro → Sonnet
 *   - Gold → Opus + thinking
 *   - Premium → Opus + thinking + effort=max
 *
 * Si el sistema saturado y user free sin BYOK → friendly throttle (no error).
 */

import { freeLlm, freeImage } from './_freeAi.js';
import { getCapabilities } from './_capabilities.js';
import * as store from './_store.js';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const FAL_KEY = process.env.FAL_API_KEY || '';

// Per-user daily cap para free users sin BYOK (protege pool compartido Groq)
const FREE_NO_BYOK_DAILY_CAP = 20;

const dayKey = () => new Date().toISOString().slice(0, 10);

const checkFreeUserDailyCap = async (userId) => {
  if (!userId) return { allowed: true, used: 0, cap: FREE_NO_BYOK_DAILY_CAP };
  const key = `feedia:freeuser:dailycount:${userId}:${dayKey()}`;
  const used = Number((await store.get(key)) || 0);
  return { allowed: used < FREE_NO_BYOK_DAILY_CAP, used, cap: FREE_NO_BYOK_DAILY_CAP, key };
};

const bumpFreeUserDailyCount = async (userId) => {
  if (!userId) return;
  const key = `feedia:freeuser:dailycount:${userId}:${dayKey()}`;
  const current = Number((await store.get(key)) || 0);
  await store.set(key, current + 1);
};

const getUserByokKey = async (userId, provider) => {
  if (!userId) return null;
  const byok = await store.get(`feedia:user:${userId}:byok`);
  return byok?.[provider] || null;
};

/* ───────── Anthropic call ───────── */

const callAnthropic = async ({ model, system, prompt, maxTokens = 2000, thinking = false, effort = 'high' }) => {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY no configurado para planes pagos');
  const body = {
    model,
    max_tokens: maxTokens,
    system: system || undefined,
    messages: [{ role: 'user', content: prompt }],
  };
  if (thinking) body.thinking = { type: 'adaptive' };
  if (effort && model.startsWith('claude-opus')) body.output_config = { effort };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { text, provider: 'anthropic', model, usage: data.usage };
};

/* ───────── Main LLM router ───────── */

export const routeLlm = async ({ userId, planId = 'free', system, prompt, maxTokens = 2000, preferLlama = false }) => {
  const caps = getCapabilities(planId);

  // ─── Paid user con preferLlama (drafts, fallback, cost-saver) ────────
  // Llama 3.3 70B via Groq disponible para TODOS los planes, gratis ($0 a vos).
  // Útil para: drafts iniciales, ideación rápida, fallback si Anthropic falla,
  // tasks no-críticos (titles, hashtags, summaries).
  if (preferLlama && planId !== 'free') {
    const byokGroq = await getUserByokKey(userId, 'groq');
    if (byokGroq) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${byokGroq}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        });
        if (res.ok) {
          const j = await res.json();
          return {
            text: j.choices?.[0]?.message?.content || '',
            provider: 'groq-byok',
            model: 'llama-3.3-70b',
            tier: `${planId}-llama-byok`,
          };
        }
      } catch {
        /* fallback to free pool */
      }
    }
    // Sin BYOK → usa pool compartido (con cap suave por usuario paid)
    const result = await freeLlm({ system, prompt, maxTokens, temperature: 0.7 });
    return { ...result, tier: `${planId}-llama-shared` };
  }

  // Free tier: Groq con cap diario, BYOK ilimitado
  if (planId === 'free') {
    const byokGroq = await getUserByokKey(userId, 'groq');
    if (byokGroq) {
      // User puso su propia key → llama Groq con esa key
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${byokGroq}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        });
        if (res.ok) {
          const j = await res.json();
          return {
            text: j.choices?.[0]?.message?.content || '',
            provider: 'groq-byok',
            model: 'llama-3.3-70b',
            tier: 'free-byok',
          };
        }
      } catch {
        /* fallback to shared */
      }
    }

    // Sin BYOK: usa pool compartido con cap diario
    const cap = await checkFreeUserDailyCap(userId);
    if (!cap.allowed) {
      return {
        text: '',
        provider: 'capped',
        model: 'none',
        tier: 'free-capped',
        error: 'daily-cap-reached',
        message: `Llegaste al límite diario gratuito (${cap.cap} requests). Opciones: (1) Pegá tu propia Groq API key gratis en /settings, (2) Esperá hasta mañana, (3) Upgrade a Starter ($7) para Sonnet sin caps.`,
        used: cap.used,
        cap: cap.cap,
      };
    }
    const result = await freeLlm({ system, prompt, maxTokens, temperature: 0.7 });
    await bumpFreeUserDailyCount(userId);
    return { ...result, tier: 'free-shared' };
  }

  // Paid tiers: Anthropic
  if (planId === 'starter' || planId === 'pro') {
    return await callAnthropic({ model: 'claude-sonnet-4-6', system, prompt, maxTokens, thinking: false });
  }
  if (planId === 'gold') {
    return await callAnthropic({ model: 'claude-opus-4-7', system, prompt, maxTokens, thinking: true, effort: 'high' });
  }
  if (planId === 'premium') {
    return await callAnthropic({ model: 'claude-opus-4-7', system, prompt, maxTokens, thinking: true, effort: 'max' });
  }
  // Fallback
  return await freeLlm({ system, prompt, maxTokens });
};

/* ───────── Image router (multi-proveedor smart routing) ───────── */

export const routeImage = async ({
  userId,
  planId = 'free',
  prompt,
  width = 1080,
  height = 1350,
  style,
  useCase = 'social-post',
  forceProvider = null,
  qualityFloor = 0,
}) => {
  const { smartGenerateImage } = await import('./_imageProviders.js');
  const result = await smartGenerateImage({
    planId,
    prompt,
    width,
    height,
    useCase,
    forceProvider,
    qualityFloor,
    style,
  });
  if (result && result.url) return result;
  return await freeImage({ prompt, width, height });
};

/* ───────── Video router (multi-proveedor smart routing) ───────── */

export const routeVideo = async ({
  userId,
  planId = 'free',
  prompt,
  durationSec = 5,
  width = 1080,
  height = 1920,
  useCase = 'social-clip',
  forceProvider = null,
  qualityFloor = 0,
  imageUrl,
}) => {
  const { smartGenerateVideo } = await import('./_videoProviders.js');
  return await smartGenerateVideo({
    planId,
    prompt,
    durationSec,
    width,
    height,
    useCase,
    forceProvider,
    qualityFloor,
    imageUrl,
  });
};

/* ───────── BYOK management ───────── */

export const handleByok = async (req, res, path, m, body) => {
  const { getSessionFromReq } = await import('./_users.js');

  if (path === '/api/byok/keys' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'no session' }));
      return true;
    }
    const byok = (await store.get(`feedia:user:${ctx.user.id}:byok`)) || {};
    const masked = {};
    for (const [k, v] of Object.entries(byok)) {
      masked[k] = v ? `${String(v).slice(0, 6)}...${String(v).slice(-4)}` : null;
    }
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ providers: masked, available: ['groq', 'huggingface', 'anthropic', 'openai', 'fal'] }));
    return true;
  }

  if (path === '/api/byok/keys' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'no session' }));
      return true;
    }
    const b = body || {};
    if (!b.provider || !b.apiKey) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'provider y apiKey requeridos' }));
      return true;
    }
    const allowed = ['groq', 'huggingface', 'anthropic', 'openai', 'fal'];
    if (!allowed.includes(b.provider)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'provider no soportado' }));
      return true;
    }
    const byok = (await store.get(`feedia:user:${ctx.user.id}:byok`)) || {};
    byok[b.provider] = String(b.apiKey).trim();
    await store.set(`feedia:user:${ctx.user.id}:byok`, byok);
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, provider: b.provider, saved: true }));
    return true;
  }

  if (path === '/api/byok/keys' && m === 'DELETE') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'no session' }));
      return true;
    }
    const b = body || {};
    const byok = (await store.get(`feedia:user:${ctx.user.id}:byok`)) || {};
    if (b.provider) {
      delete byok[b.provider];
      await store.set(`feedia:user:${ctx.user.id}:byok`, byok);
    }
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (path === '/api/byok/status' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'no session' }));
      return true;
    }
    const cap = await checkFreeUserDailyCap(ctx.user.id);
    const byok = (await store.get(`feedia:user:${ctx.user.id}:byok`)) || {};
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        planId: ctx.user.plan || 'free',
        dailyCap: cap.cap,
        dailyUsed: cap.used,
        dailyRemaining: Math.max(0, cap.cap - cap.used),
        byokConfigured: Object.keys(byok).length > 0,
        byokProviders: Object.keys(byok),
        recommendBYOK: (ctx.user.plan || 'free') === 'free' && cap.used >= cap.cap * 0.7,
      }),
    );
    return true;
  }

  return false;
};

export const handleCapabilities = async (req, res, path, m) => {
  if (path === '/api/capabilities' && m === 'GET') {
    const { CAPABILITY_MATRIX, compareCapabilities } = await import('./_capabilities.js');
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        matrix: CAPABILITY_MATRIX,
        compareFreeVsPro: compareCapabilities('free', 'pro'),
        compareProVsGold: compareCapabilities('pro', 'gold'),
        compareGoldVsPremium: compareCapabilities('gold', 'premium'),
      }),
    );
    return true;
  }
  return false;
};
