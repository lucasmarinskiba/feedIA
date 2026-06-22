/**
 * Free AI Stack — proveedores 100% gratuitos para Free plan.
 *
 * Routing inteligente:
 *   - LLM text → Groq (Llama 3.3 70B, ultra-rápido, free) → fallback HF Inference
 *   - Imágenes → Pollinations.ai (free, sin key) → fallback Stable Horde
 *   - Embeddings → HF sentence-transformers free tier
 *
 * Paid plans (starter+) usan Anthropic + fal.ai vía _usage.js routing.
 */

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const HF_KEY = process.env.HUGGINGFACE_API_KEY || '';

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const HF_BASE = 'https://api-inference.huggingface.co/models';
const STABLE_HORDE_BASE = 'https://stablehorde.net/api/v2';

/* ───────── LLM (texto) ───────── */

export const freeLlm = async ({ prompt, system, maxTokens = 1024, temperature = 0.7 }) => {
  // Intento 1: Groq (rápido, free tier generoso)
  if (GROQ_KEY) {
    try {
      const res = await fetch(GROQ_BASE, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (res.ok) {
        const j = await res.json();
        return { text: j.choices?.[0]?.message?.content || '', provider: 'groq', model: 'llama-3.3-70b' };
      }
    } catch {
      /* fallback */
    }
  }

  // Intento 2: HF Inference (Llama free)
  if (HF_KEY) {
    try {
      const res = await fetch(`${HF_BASE}/meta-llama/Llama-3.2-3B-Instruct`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: system ? `<|system|>${system}\n<|user|>${prompt}\n<|assistant|>` : prompt,
          parameters: { max_new_tokens: maxTokens, temperature, return_full_text: false },
        }),
      });
      if (res.ok) {
        const j = await res.json();
        const text = Array.isArray(j) ? j[0]?.generated_text || '' : j.generated_text || '';
        return { text, provider: 'huggingface', model: 'llama-3.2-3b' };
      }
    } catch {
      /* fallback */
    }
  }

  // Fallback: respuesta determinística de plantilla
  return {
    text: '[Free AI sin proveedor configurado. Agregá GROQ_API_KEY o HUGGINGFACE_API_KEY en env.]',
    provider: 'fallback',
    model: 'none',
  };
};

/* ───────── Imágenes ───────── */

export const freeImage = async ({ prompt, width = 1080, height = 1350, seed = Math.floor(Math.random() * 1e9) }) => {
  // Pollinations.ai — GET sin auth, devuelve URL directa
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true&enhance=true`;
  return {
    url,
    provider: 'pollinations',
    model: 'flux-schnell-free',
    width,
    height,
    seed,
    // Pollinations renderiza on-demand cuando la URL se accede — instantáneo
  };
};

/* ───────── Embeddings (semantic search) ───────── */

export const freeEmbed = async (text) => {
  if (HF_KEY) {
    try {
      const res = await fetch(`${HF_BASE}/sentence-transformers/all-MiniLM-L6-v2`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: text }),
      });
      if (res.ok) {
        const vector = await res.json();
        return { vector: Array.isArray(vector) ? vector : [], provider: 'huggingface', dims: 384 };
      }
    } catch {
      /* fallback */
    }
  }
  return { vector: [], provider: 'fallback', dims: 0 };
};

/* ───────── Provider info para UI ───────── */

export const getFreeProviderStatus = () => ({
  groq: { configured: Boolean(GROQ_KEY), tier: 'free', limits: '14.4K req/día (Llama 3.3 70B)' },
  huggingface: { configured: Boolean(HF_KEY), tier: 'free', limits: '1K req/hora (inference API)' },
  pollinations: { configured: true, tier: 'free', limits: 'sin límite documentado' },
  stableHorde: { configured: true, tier: 'free', limits: 'cola compartida (kudos system)' },
});
