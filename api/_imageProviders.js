/**
 * Image Provider Registry — multi-proveedor gratuito + paid.
 *
 * Smart routing por:
 *   - planId (free → solo gratis, paid → premium preferido + fallback)
 *   - useCase (photo / illustration / logo / portrait / abstract / cinematic)
 *   - userPreference (forceProvider / qualityFloor / styleHint)
 *   - currentLoad (si Pollinations saturado → fallback HF)
 *
 * Costo a vos FeedIA dev: $0 para free + paid users que opten por gratis.
 *
 * Proveedores FREE (sin tu wallet):
 *   - Pollinations Flux (sin auth, ilimitado)
 *   - HuggingFace Inference (Flux-Dev/SDXL, free tier 1K req/h)
 *   - Cloudflare Workers AI SDXL (10K req/día free)
 *   - Stable Horde (distributed, kudos system, free)
 *   - Together AI (trial $1)
 *   - Replicate trial (free credits)
 *
 * Proveedores PAID (solo Gold/Premium, opt-in):
 *   - fal.ai Flux-Pro / Flux-Pro-Ultra
 *   - Ideogram v2
 *   - OpenAI DALL-E 3
 */

const HF_KEY = process.env.HUGGINGFACE_API_KEY || '';
const CF_AI_TOKEN = process.env.CLOUDFLARE_AI_TOKEN || '';
const CF_AI_ACCOUNT = process.env.CLOUDFLARE_AI_ACCOUNT_ID || '';
const TOGETHER_KEY = process.env.TOGETHER_API_KEY || '';
const REPLICATE_KEY = process.env.REPLICATE_API_TOKEN || '';
const FAL_KEY = process.env.FAL_API_KEY || '';
const STABILITY_KEY = process.env.STABILITY_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

export const IMAGE_PROVIDERS = {
  // ─── FREE TIER (developer cost: $0) ──────────────────────────────────────
  'pollinations-flux': {
    id: 'pollinations-flux',
    label: 'Pollinations Flux',
    tier: 'free',
    quality: 70,
    avgLatencyMs: 6000,
    maxResolution: '1024x1024',
    rateLimit: 'unlimited',
    bestFor: ['fast-iteration', 'drafts', 'social-posts'],
    costToDev: 0,
    requiresKey: false,
    enabled: true,
  },
  'huggingface-flux-dev': {
    id: 'huggingface-flux-dev',
    label: 'HuggingFace Flux-Dev',
    tier: 'free',
    quality: 85,
    avgLatencyMs: 12000,
    maxResolution: '1024x1024',
    rateLimit: '1K req/hora',
    bestFor: ['high-quality', 'detailed-illustrations', 'realistic-portraits'],
    costToDev: 0,
    requiresKey: true,
    keyName: 'HUGGINGFACE_API_KEY',
    enabled: Boolean(HF_KEY),
  },
  'huggingface-sdxl': {
    id: 'huggingface-sdxl',
    label: 'HuggingFace SDXL',
    tier: 'free',
    quality: 80,
    avgLatencyMs: 10000,
    maxResolution: '1024x1024',
    rateLimit: '1K req/hora',
    bestFor: ['photorealistic', 'product-shots', 'logos'],
    costToDev: 0,
    requiresKey: true,
    enabled: Boolean(HF_KEY),
  },
  'cloudflare-sdxl': {
    id: 'cloudflare-sdxl',
    label: 'Cloudflare Workers AI SDXL',
    tier: 'free',
    quality: 78,
    avgLatencyMs: 5000,
    maxResolution: '1024x1024',
    rateLimit: '10K req/día (free Workers AI)',
    bestFor: ['fast', 'batch-generation', 'social-posts'],
    costToDev: 0,
    requiresKey: true,
    keyName: 'CLOUDFLARE_AI_TOKEN + CLOUDFLARE_AI_ACCOUNT_ID',
    enabled: Boolean(CF_AI_TOKEN && CF_AI_ACCOUNT),
  },
  'cloudflare-flux-schnell': {
    id: 'cloudflare-flux-schnell',
    label: 'Cloudflare Flux Schnell',
    tier: 'free',
    quality: 82,
    avgLatencyMs: 4000,
    maxResolution: '1024x1024',
    rateLimit: '10K req/día',
    bestFor: ['fast', 'modern-style', 'high-quality-free'],
    costToDev: 0,
    requiresKey: true,
    enabled: Boolean(CF_AI_TOKEN && CF_AI_ACCOUNT),
  },
  'stable-horde': {
    id: 'stable-horde',
    label: 'Stable Horde Distributed',
    tier: 'free',
    quality: 75,
    avgLatencyMs: 20000,
    maxResolution: '1024x1024',
    rateLimit: 'kudos system (free)',
    bestFor: ['niche-styles', 'experimental', 'NSFW-safe-alternatives'],
    costToDev: 0,
    requiresKey: false,
    enabled: true,
  },
  'together-flux-schnell': {
    id: 'together-flux-schnell',
    label: 'Together AI Flux Schnell',
    tier: 'free-trial',
    quality: 82,
    avgLatencyMs: 3500,
    maxResolution: '1024x1024',
    rateLimit: 'trial credits ($1 free)',
    bestFor: ['fast', 'high-quality'],
    costToDev: 0,
    requiresKey: true,
    keyName: 'TOGETHER_API_KEY',
    enabled: Boolean(TOGETHER_KEY),
  },
  'replicate-sdxl': {
    id: 'replicate-sdxl',
    label: 'Replicate SDXL',
    tier: 'free-trial',
    quality: 80,
    avgLatencyMs: 15000,
    maxResolution: '1024x1024',
    rateLimit: 'trial credits',
    bestFor: ['variety-of-models'],
    costToDev: 0,
    requiresKey: true,
    enabled: Boolean(REPLICATE_KEY),
  },

  // ─── PAID TIER (developer cost: $0.02-$0.10/image) ───────────────────────
  'fal-flux-schnell': {
    id: 'fal-flux-schnell',
    label: 'fal.ai Flux Schnell',
    tier: 'paid',
    quality: 85,
    avgLatencyMs: 3000,
    maxResolution: '1024x1024',
    costToDev: 0.0035,
    requiresKey: true,
    keyName: 'FAL_API_KEY',
    bestFor: ['production', 'fast'],
    enabled: Boolean(FAL_KEY),
  },
  'fal-flux-dev': {
    id: 'fal-flux-dev',
    label: 'fal.ai Flux Dev',
    tier: 'paid',
    quality: 90,
    avgLatencyMs: 6000,
    maxResolution: '2048x2048',
    costToDev: 0.025,
    requiresKey: true,
    bestFor: ['high-quality', 'pro-content'],
    enabled: Boolean(FAL_KEY),
  },
  'fal-flux-pro': {
    id: 'fal-flux-pro',
    label: 'fal.ai Flux Pro 1.1',
    tier: 'paid',
    quality: 95,
    avgLatencyMs: 8000,
    maxResolution: '2048x2048',
    costToDev: 0.04,
    requiresKey: true,
    bestFor: ['premium', 'editorial', 'commercial'],
    enabled: Boolean(FAL_KEY),
  },
  'fal-flux-pro-ultra': {
    id: 'fal-flux-pro-ultra',
    label: 'fal.ai Flux Pro 1.1 Ultra',
    tier: 'paid',
    quality: 99,
    avgLatencyMs: 10000,
    maxResolution: '4096x4096',
    costToDev: 0.06,
    requiresKey: true,
    bestFor: ['max-quality', '4K-upscaled-8K', 'brand-hero-shots'],
    enabled: Boolean(FAL_KEY),
  },
  'fal-ideogram-v2': {
    id: 'fal-ideogram-v2',
    label: 'fal.ai Ideogram v2',
    tier: 'paid',
    quality: 93,
    avgLatencyMs: 7000,
    maxResolution: '2048x2048',
    costToDev: 0.08,
    requiresKey: true,
    bestFor: ['typography', 'logos', 'text-in-image'],
    enabled: Boolean(FAL_KEY),
  },
  'openai-dalle3': {
    id: 'openai-dalle3',
    label: 'OpenAI DALL-E 3',
    tier: 'paid',
    quality: 92,
    avgLatencyMs: 12000,
    maxResolution: '1792x1024',
    costToDev: 0.08,
    requiresKey: true,
    keyName: 'OPENAI_API_KEY',
    bestFor: ['conceptual', 'storytelling-illustrations'],
    enabled: Boolean(OPENAI_KEY),
  },
  'stability-sd3': {
    id: 'stability-sd3',
    label: 'Stability AI SD3',
    tier: 'paid',
    quality: 88,
    avgLatencyMs: 8000,
    maxResolution: '2048x2048',
    costToDev: 0.065,
    requiresKey: true,
    keyName: 'STABILITY_API_KEY',
    bestFor: ['photorealistic', 'product'],
    enabled: Boolean(STABILITY_KEY),
  },
};

/**
 * Plan-aware allowed providers.
 */
const PLAN_PROVIDER_POLICY = {
  free: {
    allowedTiers: ['free'],
    preferOrder: [
      'cloudflare-flux-schnell',
      'huggingface-flux-dev',
      'pollinations-flux',
      'cloudflare-sdxl',
      'huggingface-sdxl',
      'stable-horde',
    ],
  },
  starter: {
    allowedTiers: ['free', 'free-trial', 'paid'],
    preferOrder: ['fal-flux-schnell', 'cloudflare-flux-schnell', 'huggingface-flux-dev', 'pollinations-flux'],
    maxPaidCost: 0.005, // capa costo paid (solo Schnell)
  },
  pro: {
    allowedTiers: ['free', 'free-trial', 'paid'],
    preferOrder: [
      'fal-flux-dev',
      'fal-flux-schnell',
      'huggingface-flux-dev',
      'cloudflare-flux-schnell',
      'pollinations-flux',
    ],
    maxPaidCost: 0.03,
  },
  gold: {
    allowedTiers: ['free', 'free-trial', 'paid'],
    preferOrder: ['fal-flux-pro', 'fal-ideogram-v2', 'fal-flux-dev', 'huggingface-flux-dev', 'cloudflare-flux-schnell'],
    maxPaidCost: 0.1,
  },
  premium: {
    allowedTiers: ['free', 'free-trial', 'paid'],
    preferOrder: ['fal-flux-pro-ultra', 'fal-ideogram-v2', 'fal-flux-pro', 'openai-dalle3', 'stability-sd3'],
    maxPaidCost: 0.2,
  },
};

/**
 * USE-CASE → recommended providers ranking
 */
const USE_CASE_PREFERENCE = {
  photo: ['huggingface-sdxl', 'fal-flux-dev', 'stability-sd3'],
  illustration: ['huggingface-flux-dev', 'fal-flux-pro', 'openai-dalle3'],
  logo: ['fal-ideogram-v2', 'huggingface-sdxl'],
  portrait: ['fal-flux-pro', 'huggingface-flux-dev', 'fal-flux-pro-ultra'],
  abstract: ['pollinations-flux', 'stable-horde', 'fal-flux-pro'],
  cinematic: ['fal-flux-pro-ultra', 'fal-flux-pro', 'stability-sd3'],
  'text-in-image': ['fal-ideogram-v2', 'openai-dalle3'],
  'social-post': ['cloudflare-flux-schnell', 'pollinations-flux', 'fal-flux-schnell'],
  'product-shot': ['huggingface-sdxl', 'stability-sd3', 'fal-flux-pro'],
  'fast-iteration': ['pollinations-flux', 'cloudflare-flux-schnell', 'fal-flux-schnell'],
};

/**
 * Smart selector — devuelve lista ordenada de proveedores a probar.
 */
export const selectImageProviders = ({
  planId = 'free',
  useCase = 'social-post',
  forceProvider = null,
  qualityFloor = 0,
}) => {
  if (forceProvider && IMAGE_PROVIDERS[forceProvider]?.enabled) {
    return [IMAGE_PROVIDERS[forceProvider]];
  }
  const policy = PLAN_PROVIDER_POLICY[planId] || PLAN_PROVIDER_POLICY.free;
  const useCaseRanking = USE_CASE_PREFERENCE[useCase] || [];

  // Mergea use-case preference con plan policy + filtra enabled + quality
  const candidates = [...new Set([...useCaseRanking, ...policy.preferOrder])]
    .map((id) => IMAGE_PROVIDERS[id])
    .filter((p) => p && p.enabled)
    .filter((p) => policy.allowedTiers.includes(p.tier))
    .filter((p) => p.quality >= qualityFloor)
    .filter((p) => !policy.maxPaidCost || p.tier !== 'paid' || p.costToDev <= policy.maxPaidCost)
    .sort((a, b) => {
      const useCaseScoreA = useCaseRanking.indexOf(a.id);
      const useCaseScoreB = useCaseRanking.indexOf(b.id);
      const aScore = useCaseScoreA === -1 ? 1000 : useCaseScoreA;
      const bScore = useCaseScoreB === -1 ? 1000 : useCaseScoreB;
      return aScore - bScore;
    });
  return candidates;
};

/**
 * Generate vía provider específico.
 */
export const generateWithProvider = async ({ providerId, prompt, width = 1080, height = 1350, style }) => {
  const provider = IMAGE_PROVIDERS[providerId];
  if (!provider || !provider.enabled) return null;
  const fullPrompt = style ? `${prompt}, style: ${style}` : prompt;

  try {
    if (providerId === 'pollinations-flux') {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 1e9)}&model=flux&nologo=true&enhance=true`;
      return { url, provider: provider.id, model: 'flux-schnell' };
    }

    if (providerId === 'huggingface-flux-dev' || providerId === 'huggingface-sdxl') {
      const model =
        providerId === 'huggingface-flux-dev'
          ? 'black-forest-labs/FLUX.1-dev'
          : 'stabilityai/stable-diffusion-xl-base-1.0';
      const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: fullPrompt, parameters: { width, height } }),
      });
      if (r.ok) {
        const blob = await r.arrayBuffer();
        const b64 = Buffer.from(blob).toString('base64');
        return { url: `data:image/png;base64,${b64}`, provider: provider.id, model };
      }
    }

    if (providerId === 'cloudflare-sdxl' || providerId === 'cloudflare-flux-schnell') {
      const model =
        providerId === 'cloudflare-flux-schnell'
          ? '@cf/black-forest-labs/flux-1-schnell'
          : '@cf/stabilityai/stable-diffusion-xl-base-1.0';
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_AI_ACCOUNT}/ai/run/${model}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${CF_AI_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, width, height }),
      });
      if (r.ok) {
        const data = await r.json();
        const b64 = data.result?.image || data.image || '';
        if (b64) return { url: `data:image/png;base64,${b64}`, provider: provider.id, model };
      }
    }

    if (providerId === 'stable-horde') {
      const r = await fetch('https://stablehorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: '0000000000' }, // anonymous
        body: JSON.stringify({ prompt: fullPrompt, params: { width, height, steps: 20 } }),
      });
      if (r.ok) {
        const data = await r.json();
        return { url: '', provider: provider.id, model: 'stable-horde', requestId: data.id, async: true };
      }
    }

    if (providerId === 'together-flux-schnell') {
      const r = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOGETHER_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'black-forest-labs/FLUX.1-schnell-Free',
          prompt: fullPrompt,
          width,
          height,
          steps: 4,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        return { url: data.data?.[0]?.url || '', provider: provider.id, model: 'flux-schnell-free' };
      }
    }

    if (providerId.startsWith('fal-')) {
      const modelMap = {
        'fal-flux-schnell': 'fal-ai/flux/schnell',
        'fal-flux-dev': 'fal-ai/flux/dev',
        'fal-flux-pro': 'fal-ai/flux-pro/v1.1',
        'fal-flux-pro-ultra': 'fal-ai/flux-pro/v1.1-ultra',
        'fal-ideogram-v2': 'fal-ai/ideogram/v2',
      };
      const model = modelMap[providerId];
      const r = await fetch(`https://fal.run/${model}`, {
        method: 'POST',
        headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, image_size: { width, height } }),
      });
      if (r.ok) {
        const data = await r.json();
        return { url: data.images?.[0]?.url || '', provider: provider.id, model };
      }
    }

    if (providerId === 'openai-dalle3') {
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt: fullPrompt, size: '1024x1024', quality: 'standard' }),
      });
      if (r.ok) {
        const data = await r.json();
        return { url: data.data?.[0]?.url || '', provider: provider.id, model: 'dall-e-3' };
      }
    }
  } catch {
    /* fallback siguiente */
  }

  return null;
};

/**
 * Smart router con cascading fallback.
 */
export const smartGenerateImage = async ({
  planId,
  prompt,
  width = 1080,
  height = 1350,
  useCase = 'social-post',
  forceProvider = null,
  qualityFloor = 0,
  style,
}) => {
  const candidates = selectImageProviders({ planId, useCase, forceProvider, qualityFloor });
  for (const p of candidates) {
    const result = await generateWithProvider({ providerId: p.id, prompt, width, height, style });
    if (result && result.url) return { ...result, qualityScore: p.quality, attempted: candidates.map((c) => c.id) };
  }
  // Fallback final: Pollinations siempre disponible
  return await generateWithProvider({ providerId: 'pollinations-flux', prompt, width, height });
};

export const handleImageProviders = async (req, res, path, m) => {
  const json = (code, body) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };
  if (path === '/api/providers/images' && m === 'GET') {
    const url = new URL(req.url, 'http://x');
    const planId = url.searchParams.get('planId') || 'free';
    const useCase = url.searchParams.get('useCase') || 'social-post';
    json(200, {
      planId,
      useCase,
      recommended: selectImageProviders({ planId, useCase }),
      all: IMAGE_PROVIDERS,
      policy: PLAN_PROVIDER_POLICY[planId],
    });
    return true;
  }
  return false;
};
