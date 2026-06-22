/**
 * Capa LLM multi-proveedor de FeedIA (serverless).
 *
 * Elige proveedor por env, en orden de prioridad, con fallback automático:
 *   1. GROQ_API_KEY        → Llama 3.3 70B (GRATIS, rápido)        console.groq.com
 *   2. GEMINI_API_KEY      → Gemini Flash (free tier)             aistudio.google.com/apikey
 *   3. DEEPSEEK_API_KEY    → deepseek-chat (barato)               platform.deepseek.com
 *   4. OPENROUTER_API_KEY  → modelo configurable                 openrouter.ai
 *   5. ANTHROPIC_API_KEY   → Claude (premium)                     console.anthropic.com
 *
 * askLLM(prompt, {system, maxTokens, temperature}) → string | null
 * Si ningún proveedor responde, devuelve null (los callers usan su fallback).
 */

import * as store from './_store.js';

const ENV = process.env;

// Global hourly LLM call cap (safety net — evita quemar saldo ante abuso).
// LLM_GLOBAL_HOURLY_CAP: número máximo de llamadas LLM por hora en todo el sistema.
// Default 500 ≈ ~$5 en Groq/Gemini a 2k tokens promedio.
const GLOBAL_CAP = Number(ENV.LLM_GLOBAL_HOURLY_CAP || 500);
const _globalCapKey = () => `feedia:obs:llmglobal:${new Date().toISOString().slice(0, 13)}`;

const _isGlobalCapExceeded = async () => {
  if (!store.STORE_REAL) return false; // dev/memoria: nunca bloquear
  try {
    const count = Number(await store.get(_globalCapKey())) || 0;
    return count >= GLOBAL_CAP;
  } catch {
    return false;
  }
};

const _incrGlobalCap = () => {
  const key = _globalCapKey();
  store
    .incr(key)
    .then(() => store.expire(key, 7200))
    .catch(() => {});
};

export const LLM_PROVIDER = (() => {
  if (ENV.GEMINI_API_KEY) return 'gemini';
  if (ENV.CEREBRAS_API_KEY) return 'cerebras';
  if (ENV.GROQ_API_KEY) return 'groq';
  if (ENV.OPENROUTER_API_KEY) return 'openrouter';
  if (ENV.DEEPSEEK_API_KEY) return 'deepseek';
  if (ENV.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
})();

export const HAS_LLM = Boolean(LLM_PROVIDER);

// Cada proveedor: { key, run(prompt, system, maxTokens, temp) -> text|null }
const openaiCompatible = async (
  url,
  key,
  model,
  prompt,
  system,
  maxTokens,
  temp,
  json = false,
  extraHeaders = {},
  extraBody = {},
) => {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json', ...extraHeaders },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: temp,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        ...extraBody,
        messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) {
      const errBody = await r.text().catch(() => '');
      // Surface error in globalThis for debugging (gets attached to plan._debug)
      try {
        globalThis.__lastLLMError = `${url.split('/')[2]} ${r.status}: ${errBody.slice(0, 200)}`;
      } catch {}
      return null;
    }
    const j = await r.json();
    return j?.choices?.[0]?.message?.content || null;
  } catch (e) {
    try {
      globalThis.__lastLLMError = `${url.split('/')[2]} threw: ${String(e?.message || e).slice(0, 200)}`;
    } catch {}
    return null;
  }
};

const PROVIDERS = {
  groq: (p, s, mt, t, json) =>
    openaiCompatible(
      'https://api.groq.com/openai/v1/chat/completions',
      ENV.GROQ_API_KEY,
      ENV.GROQ_MODEL || 'llama-3.3-70b-versatile',
      p,
      s,
      mt,
      t,
      json,
    ),

  cerebras: (p, s, mt, t, json) =>
    openaiCompatible(
      'https://api.cerebras.ai/v1/chat/completions',
      ENV.CEREBRAS_API_KEY,
      ENV.CEREBRAS_MODEL || 'gpt-oss-120b',
      p,
      s,
      mt,
      t,
      json,
      {},
      { reasoning_effort: 'low' },
    ), // gpt-oss es reasoning model: low evita que el reasoning consuma el budget de output

  deepseek: (p, s, mt, t, json) =>
    openaiCompatible(
      'https://api.deepseek.com/chat/completions',
      ENV.DEEPSEEK_API_KEY,
      ENV.DEEPSEEK_MODEL || 'deepseek-chat',
      p,
      s,
      mt,
      t,
      json,
    ),

  openrouter: (p, s, mt, t, json) =>
    openaiCompatible(
      'https://openrouter.ai/api/v1/chat/completions',
      ENV.OPENROUTER_API_KEY,
      ENV.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
      p,
      s,
      mt,
      t,
      json,
    ),

  gemini: async (p, s, mt, t, json) => {
    try {
      const model = ENV.GEMINI_MODEL || 'gemini-2.0-flash';
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...(s ? { system_instruction: { parts: [{ text: s }] } } : {}),
            contents: [{ role: 'user', parts: [{ text: p }] }],
            generationConfig: {
              maxOutputTokens: mt,
              temperature: t,
              ...(json ? { responseMimeType: 'application/json' } : {}),
            },
          }),
        },
      );
      if (!r.ok) {
        const errBody = await r.text().catch(() => '');
        try {
          globalThis.__lastLLMError = `gemini ${r.status}: ${errBody.slice(0, 200)}`;
          globalThis.__geminiError = `${r.status}: ${errBody.slice(0, 300)}`;
        } catch {}
        return null;
      }
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      if (!text) {
        try {
          globalThis.__lastLLMError = `gemini empty: ${JSON.stringify(j).slice(0, 200)}`;
          globalThis.__geminiError = `empty: ${JSON.stringify(j).slice(0, 300)}`;
        } catch {}
      }
      return text;
    } catch (e) {
      try {
        globalThis.__lastLLMError = `gemini threw: ${String(e?.message || e).slice(0, 200)}`;
        globalThis.__geminiError = `threw: ${String(e?.message || e).slice(0, 300)}`;
      } catch {}
      return null;
    }
  },

  anthropic: async (p, s, mt, t) => {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ENV.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: ENV.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
          max_tokens: mt,
          temperature: t,
          ...(s ? { system: s } : {}),
          messages: [{ role: 'user', content: p }],
        }),
      });
      if (!r.ok) return null;
      const j = await r.json();
      return j?.content?.[0]?.text || null;
    } catch {
      return null;
    }
  },
};

// Orden: free providers first (gemini, cerebras, groq, openrouter:free), paid last (deepseek, anthropic).
// cerebras + gemini + groq: free tier generoso, resetean a diario → $0/mes en uso normal.
// openrouter usa OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free → $0.
export const ORDER = ['gemini', 'cerebras', 'groq', 'openrouter', 'deepseek', 'anthropic'];

export const askLLM = async (
  prompt,
  { system = '', maxTokens = 2000, temperature = 0.6, json = false, user = null } = {},
) => {
  // Global hourly cap — owner bypass, bloquea todos los demás si se excede.
  const isOwner = user && (user.role === 'owner' || user.plan === 'owner');
  if (!isOwner && (await _isGlobalCapExceeded())) return null;
  _incrGlobalCap();

  const available = ORDER.filter((name) => {
    if (name === 'groq') return ENV.GROQ_API_KEY;
    if (name === 'cerebras') return ENV.CEREBRAS_API_KEY;
    if (name === 'gemini') return ENV.GEMINI_API_KEY;
    if (name === 'deepseek') return ENV.DEEPSEEK_API_KEY;
    if (name === 'openrouter') return ENV.OPENROUTER_API_KEY;
    if (name === 'anthropic') return ENV.ANTHROPIC_API_KEY;
    return false;
  });
  for (const name of available) {
    const text = await PROVIDERS[name](prompt, system, maxTokens, temperature, json);
    if (text) {
      try {
        globalThis.__lastLLMProvider = name;
      } catch {}
      return text;
    }
  }
  return null;
};

// ── VISION (computer vision vía modelos multimodales pre-entrenados, $0) ──
// Convierte una URL de imagen a data URL base64 (para proveedores que requieren inline).
const imageToDataUrl = async (url) => {
  if (typeof url === 'string' && url.startsWith('data:')) return url;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const mime = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
};

// OpenRouter visión (OpenAI-compatible content parts). Prueba varios modelos free.
const OPENROUTER_VISION_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'google/gemma-4-26b-a4b-it:free',
];
const openrouterVision = async (prompt, images, maxTokens, temp) => {
  if (!ENV.OPENROUTER_API_KEY) return null;
  const content = [{ type: 'text', text: prompt }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))];
  const models = ENV.OPENROUTER_VISION_MODEL
    ? [ENV.OPENROUTER_VISION_MODEL, ...OPENROUTER_VISION_MODELS]
    : OPENROUTER_VISION_MODELS;
  for (const model of models) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: temp,
          messages: [{ role: 'user', content }],
        }),
      });
      if (!r.ok) {
        try {
          globalThis.__lastVisionError = `openrouter ${model} ${r.status}: ${(await r.text()).slice(0, 120)}`;
        } catch {}
        continue;
      }
      const j = await r.json();
      const text = j?.choices?.[0]?.message?.content;
      if (text) {
        try {
          globalThis.__lastVisionProvider = `openrouter:${model}`;
        } catch {}
        return text;
      }
    } catch (e) {
      try {
        globalThis.__lastVisionError = `openrouter ${model} threw: ${String(e?.message || e).slice(0, 100)}`;
      } catch {}
    }
  }
  return null;
};

// Gemini visión directo (inline_data base64). Free tier generoso.
const geminiVision = async (prompt, images, maxTokens, temp) => {
  if (!ENV.GEMINI_API_KEY) return null;
  const parts = [{ text: prompt }];
  for (const url of images) {
    const dataUrl = await imageToDataUrl(url);
    if (!dataUrl) continue;
    const mEx = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (mEx) parts.push({ inline_data: { mime_type: mEx[1], data: mEx[2] } });
  }
  if (parts.length === 1) return null; // sin imágenes válidas
  try {
    const model = ENV.GEMINI_VISION_MODEL || 'gemini-2.0-flash';
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: temp },
        }),
      },
    );
    if (!r.ok) {
      try {
        globalThis.__lastVisionError = `gemini ${r.status}: ${(await r.text()).slice(0, 120)}`;
      } catch {}
      return null;
    }
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      try {
        globalThis.__lastVisionProvider = 'gemini';
      } catch {}
      return text;
    }
    return null;
  } catch (e) {
    try {
      globalThis.__lastVisionError = `gemini threw: ${String(e?.message || e).slice(0, 100)}`;
    } catch {}
    return null;
  }
};

export const HAS_VISION = Boolean(ENV.GEMINI_API_KEY || ENV.OPENROUTER_API_KEY);

/**
 * askVision — analiza imágenes con modelo multimodal pre-entrenado ($0).
 * @param {string} prompt
 * @param {string[]} images - URLs http(s) o data URLs base64
 * @param {object} opts - { maxTokens, temperature }
 * @returns {Promise<string|null>}
 */
export const askVision = async (prompt, images = [], { maxTokens = 1200, temperature = 0.4 } = {}) => {
  if (!images.length) return null;
  // Gemini primero (free tier amplio); openrouter vision como fallback.
  const viaGemini = await geminiVision(prompt, images, maxTokens, temperature);
  if (viaGemini) return viaGemini;
  return openrouterVision(prompt, images, maxTokens, temperature);
};

// Helper JSON: pide al LLM en modo JSON y parsea (limpia fences). null si falla.
export const askLLMJson = async (prompt, opts = {}) => {
  const txt = await askLLM(prompt, { ...opts, json: true });
  if (!txt) return null;
  try {
    return JSON.parse(
      txt
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, ''),
    );
  } catch {
    return null;
  }
};
