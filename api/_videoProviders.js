/**
 * Video Provider Registry — multi-proveedor gratuito + paid 2026.
 *
 * Smart routing por plan + tipo contenido + duración + calidad.
 *
 * Proveedores FREE (sin tu wallet):
 *   - Pollinations video (sin auth)
 *   - HuggingFace Stable Video Diffusion (free Inference)
 *   - Cloudflare Workers AI video (10K/día free)
 *   - Replicate trial credits
 *   - HailuoAI / MiniMax (free tier limitado)
 *   - LeiaPix (image-to-video free)
 *   - LTX-Video (HF, image-to-video, free)
 *   - Vidu trial
 *   - Open-source self-hostable: Wan 2.1, CogVideoX, Mochi
 *
 * Proveedores PAID (Gold/Premium):
 *   - fal.ai Luma Dream Machine
 *   - fal.ai Kling 1.6 Standard/Pro
 *   - fal.ai Runway Gen-3 Alpha
 *   - fal.ai Pika 1.5
 *   - fal.ai Hailuo 02 Pro
 */

const HF_KEY = process.env.HUGGINGFACE_API_KEY || '';
const CF_AI_TOKEN = process.env.CLOUDFLARE_AI_TOKEN || '';
const CF_AI_ACCOUNT = process.env.CLOUDFLARE_AI_ACCOUNT_ID || '';
const REPLICATE_KEY = process.env.REPLICATE_API_TOKEN || '';
const FAL_KEY = process.env.FAL_API_KEY || '';
const POLLINATIONS_VIDEO_TOKEN = process.env.POLLINATIONS_TOKEN || '';

export const VIDEO_PROVIDERS = {
  // ─── FREE TIER ───────────────────────────────────────────────────────────
  'pollinations-video': {
    id: 'pollinations-video',
    label: 'Pollinations Video',
    tier: 'free',
    quality: 60,
    maxDurationSec: 4,
    maxResolution: '720p',
    rateLimit: 'free unlimited (watermark)',
    bestFor: ['drafts', 'iteration', 'fast-test'],
    costToDev: 0,
    requiresKey: false,
    enabled: true,
  },
  'hf-stable-video-diffusion': {
    id: 'hf-stable-video-diffusion',
    label: 'HF Stable Video Diffusion (img-to-video)',
    tier: 'free',
    quality: 72,
    maxDurationSec: 4,
    maxResolution: '1024x576',
    rateLimit: '1K req/h',
    bestFor: ['image-animation', 'still-to-motion'],
    costToDev: 0,
    requiresKey: true,
    keyName: 'HUGGINGFACE_API_KEY',
    enabled: Boolean(HF_KEY),
    requiresInputImage: true,
  },
  'hf-ltx-video': {
    id: 'hf-ltx-video',
    label: 'HF LTX-Video (free, fast)',
    tier: 'free',
    quality: 78,
    maxDurationSec: 5,
    maxResolution: '768x512',
    rateLimit: '1K req/h',
    bestFor: ['fast-generation', 'social-clips'],
    costToDev: 0,
    requiresKey: true,
    enabled: Boolean(HF_KEY),
  },
  'hf-cogvideo': {
    id: 'hf-cogvideo',
    label: 'HF CogVideoX (text-to-video)',
    tier: 'free',
    quality: 75,
    maxDurationSec: 6,
    maxResolution: '720x480',
    rateLimit: '500 req/h',
    bestFor: ['text-to-video', 'narrative'],
    costToDev: 0,
    requiresKey: true,
    enabled: Boolean(HF_KEY),
  },
  'cloudflare-video': {
    id: 'cloudflare-video',
    label: 'Cloudflare Workers AI Video',
    tier: 'free',
    quality: 70,
    maxDurationSec: 4,
    maxResolution: '1024x576',
    rateLimit: '10K req/día',
    bestFor: ['fast-batch', 'social-posts'],
    costToDev: 0,
    requiresKey: true,
    keyName: 'CLOUDFLARE_AI_TOKEN + ACCOUNT_ID',
    enabled: Boolean(CF_AI_TOKEN && CF_AI_ACCOUNT),
  },
  'replicate-zeroscope': {
    id: 'replicate-zeroscope',
    label: 'Replicate Zeroscope V2',
    tier: 'free-trial',
    quality: 68,
    maxDurationSec: 3,
    maxResolution: '576x320',
    rateLimit: 'trial credits',
    bestFor: ['quick-drafts'],
    costToDev: 0,
    requiresKey: true,
    keyName: 'REPLICATE_API_TOKEN',
    enabled: Boolean(REPLICATE_KEY),
  },
  'leiapix-3d': {
    id: 'leiapix-3d',
    label: 'LeiaPix 3D Parallax',
    tier: 'free',
    quality: 65,
    maxDurationSec: 5,
    maxResolution: '1080x1920',
    rateLimit: 'free with attribution',
    bestFor: ['parallax-effect', 'still-image-animation', 'stories'],
    costToDev: 0,
    requiresKey: false,
    enabled: true,
    requiresInputImage: true,
  },

  // ─── PAID TIER (Gold/Premium) ────────────────────────────────────────────
  'fal-luma-dream-machine': {
    id: 'fal-luma-dream-machine',
    label: 'fal.ai Luma Dream Machine',
    tier: 'paid',
    quality: 88,
    maxDurationSec: 9,
    maxResolution: '1280x720',
    costToDevPerSec: 0.1,
    bestFor: ['cinematic', 'storytelling', 'pro-content'],
    requiresKey: true,
    keyName: 'FAL_API_KEY',
    enabled: Boolean(FAL_KEY),
  },
  'fal-kling-1.6-standard': {
    id: 'fal-kling-1.6-standard',
    label: 'fal.ai Kling 1.6 Standard',
    tier: 'paid',
    quality: 85,
    maxDurationSec: 10,
    maxResolution: '1280x720',
    costToDevPerSec: 0.07,
    bestFor: ['versatile', 'social-content', 'product-demos'],
    requiresKey: true,
    enabled: Boolean(FAL_KEY),
  },
  'fal-kling-1.6-pro': {
    id: 'fal-kling-1.6-pro',
    label: 'fal.ai Kling 1.6 Pro',
    tier: 'paid',
    quality: 92,
    maxDurationSec: 10,
    maxResolution: '1920x1080',
    costToDevPerSec: 0.15,
    bestFor: ['high-quality', '4K-ready', 'campaign-content'],
    requiresKey: true,
    enabled: Boolean(FAL_KEY),
  },
  'fal-runway-gen3': {
    id: 'fal-runway-gen3',
    label: 'fal.ai Runway Gen-3 Alpha Turbo',
    tier: 'paid',
    quality: 90,
    maxDurationSec: 10,
    maxResolution: '1280x768',
    costToDevPerSec: 0.05,
    bestFor: ['fast', 'cinematic'],
    requiresKey: true,
    enabled: Boolean(FAL_KEY),
  },
  'fal-hailuo-02-pro': {
    id: 'fal-hailuo-02-pro',
    label: 'fal.ai Hailuo 02 Pro',
    tier: 'paid',
    quality: 89,
    maxDurationSec: 10,
    maxResolution: '1920x1080',
    costToDevPerSec: 0.08,
    bestFor: ['physics-realistic', 'character-motion'],
    requiresKey: true,
    enabled: Boolean(FAL_KEY),
  },
  'fal-pika-1.5': {
    id: 'fal-pika-1.5',
    label: 'fal.ai Pika 1.5',
    tier: 'paid',
    quality: 86,
    maxDurationSec: 5,
    maxResolution: '1280x720',
    costToDevPerSec: 0.09,
    bestFor: ['stylized', 'fun-effects'],
    requiresKey: true,
    enabled: Boolean(FAL_KEY),
  },
};

const PLAN_VIDEO_POLICY = {
  free: {
    allowedTiers: ['free'],
    preferOrder: ['hf-ltx-video', 'cloudflare-video', 'pollinations-video', 'hf-stable-video-diffusion', 'leiapix-3d'],
    maxClipSec: 4,
  },
  starter: {
    allowedTiers: ['free', 'free-trial', 'paid'],
    preferOrder: ['hf-ltx-video', 'cloudflare-video', 'fal-kling-1.6-standard', 'pollinations-video'],
    maxClipSec: 8,
    maxPaidCostPerClip: 0.3,
  },
  pro: {
    allowedTiers: ['free', 'free-trial', 'paid'],
    preferOrder: ['fal-runway-gen3', 'fal-kling-1.6-standard', 'hf-ltx-video', 'cloudflare-video'],
    maxClipSec: 10,
    maxPaidCostPerClip: 0.7,
  },
  gold: {
    allowedTiers: ['free', 'free-trial', 'paid'],
    preferOrder: [
      'fal-kling-1.6-pro',
      'fal-luma-dream-machine',
      'fal-hailuo-02-pro',
      'fal-runway-gen3',
      'hf-ltx-video',
    ],
    maxClipSec: 10,
    maxPaidCostPerClip: 1.5,
  },
  premium: {
    allowedTiers: ['free', 'free-trial', 'paid'],
    preferOrder: [
      'fal-kling-1.6-pro',
      'fal-luma-dream-machine',
      'fal-hailuo-02-pro',
      'fal-pika-1.5',
      'fal-runway-gen3',
    ],
    maxClipSec: 10,
    maxPaidCostPerClip: 2.0,
  },
};

const USE_CASE_VIDEO_PREFERENCE = {
  cinematic: ['fal-luma-dream-machine', 'fal-runway-gen3', 'fal-kling-1.6-pro'],
  'story-animation': ['leiapix-3d', 'hf-stable-video-diffusion', 'fal-luma-dream-machine'],
  'product-demo': ['fal-kling-1.6-pro', 'fal-hailuo-02-pro', 'hf-ltx-video'],
  'social-clip': ['cloudflare-video', 'hf-ltx-video', 'pollinations-video', 'fal-kling-1.6-standard'],
  'character-motion': ['fal-hailuo-02-pro', 'fal-kling-1.6-pro'],
  stylized: ['fal-pika-1.5', 'fal-runway-gen3'],
  'fast-iteration': ['pollinations-video', 'cloudflare-video', 'hf-ltx-video'],
  'image-to-video': ['hf-stable-video-diffusion', 'leiapix-3d', 'fal-luma-dream-machine'],
};

export const selectVideoProviders = ({
  planId = 'free',
  useCase = 'social-clip',
  requestedDurationSec = 5,
  forceProvider = null,
  qualityFloor = 0,
}) => {
  if (forceProvider && VIDEO_PROVIDERS[forceProvider]?.enabled) {
    return [VIDEO_PROVIDERS[forceProvider]];
  }
  const policy = PLAN_VIDEO_POLICY[planId] || PLAN_VIDEO_POLICY.free;
  const useCaseRanking = USE_CASE_VIDEO_PREFERENCE[useCase] || [];

  const candidates = [...new Set([...useCaseRanking, ...policy.preferOrder])]
    .map((id) => VIDEO_PROVIDERS[id])
    .filter((p) => p && p.enabled)
    .filter((p) => policy.allowedTiers.includes(p.tier))
    .filter((p) => p.quality >= qualityFloor)
    .filter((p) => p.maxDurationSec >= Math.min(requestedDurationSec, 3))
    .filter((p) => {
      if (p.tier !== 'paid' || !policy.maxPaidCostPerClip) return true;
      const clipCost = (p.costToDevPerSec || 0) * Math.min(requestedDurationSec, p.maxDurationSec);
      return clipCost <= policy.maxPaidCostPerClip;
    })
    .sort((a, b) => {
      const aIdx = useCaseRanking.indexOf(a.id);
      const bIdx = useCaseRanking.indexOf(b.id);
      return (aIdx === -1 ? 1000 : aIdx) - (bIdx === -1 ? 1000 : bIdx);
    });
  return candidates;
};

export const generateWithVideoProvider = async ({
  providerId,
  prompt,
  durationSec = 5,
  width = 1080,
  height = 1920,
  imageUrl,
}) => {
  const provider = VIDEO_PROVIDERS[providerId];
  if (!provider || !provider.enabled) return null;

  try {
    if (providerId === 'pollinations-video') {
      const url = `https://text.pollinations.ai/?prompt=${encodeURIComponent(prompt)}&model=openai-video&seed=${Math.floor(Math.random() * 1e9)}`;
      return { url, provider: provider.id, model: 'pollinations-video', durationSec: Math.min(durationSec, 4) };
    }

    if (providerId === 'hf-ltx-video' || providerId === 'hf-cogvideo' || providerId === 'hf-stable-video-diffusion') {
      const modelMap = {
        'hf-ltx-video': 'Lightricks/LTX-Video',
        'hf-cogvideo': 'THUDM/CogVideoX-5b',
        'hf-stable-video-diffusion': 'stabilityai/stable-video-diffusion-img2vid-xt',
      };
      const r = await fetch(`https://api-inference.huggingface.co/models/${modelMap[providerId]}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { num_frames: Math.min(durationSec * 8, 48), width, height },
        }),
      });
      if (r.ok) {
        const blob = await r.arrayBuffer();
        const b64 = Buffer.from(blob).toString('base64');
        return {
          url: `data:video/mp4;base64,${b64}`,
          provider: provider.id,
          model: modelMap[providerId],
          durationSec: Math.min(durationSec, provider.maxDurationSec),
        };
      }
    }

    if (providerId === 'cloudflare-video') {
      const r = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_AI_ACCOUNT}/ai/run/@cf/lightricks/ltx-video`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${CF_AI_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, num_frames: Math.min(durationSec * 8, 32) }),
        },
      );
      if (r.ok) {
        const data = await r.json();
        return { url: data.result?.video || '', provider: provider.id, durationSec };
      }
    }

    if (providerId === 'leiapix-3d') {
      if (!imageUrl) return null;
      return {
        url: 'pending-leiapix-job',
        provider: provider.id,
        instructions:
          'LeiaPix requires user to manually upload static image. Use API: POST https://api.leiapix.com/api/v1/animations',
        durationSec: 5,
      };
    }

    if (providerId.startsWith('fal-')) {
      const modelMap = {
        'fal-luma-dream-machine': 'fal-ai/luma-dream-machine',
        'fal-kling-1.6-standard': 'fal-ai/kling-video/v1.6/standard/text-to-video',
        'fal-kling-1.6-pro': 'fal-ai/kling-video/v1.6/pro/text-to-video',
        'fal-runway-gen3': 'fal-ai/runway-gen3/turbo/image-to-video',
        'fal-hailuo-02-pro': 'fal-ai/minimax/hailuo-02/standard/text-to-video',
        'fal-pika-1.5': 'fal-ai/pika/v1.5/pikaffects',
      };
      const model = modelMap[providerId];
      const body = imageUrl
        ? { prompt, image_url: imageUrl, duration: Math.min(durationSec, provider.maxDurationSec) }
        : { prompt, duration: Math.min(durationSec, provider.maxDurationSec) };
      const r = await fetch(`https://fal.run/${model}`, {
        method: 'POST',
        headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const data = await r.json();
        return { url: data.video?.url || data.url || '', provider: provider.id, model, durationSec };
      }
    }
  } catch {
    /* fallback */
  }
  return null;
};

export const smartGenerateVideo = async ({
  planId,
  prompt,
  durationSec = 5,
  width = 1080,
  height = 1920,
  useCase = 'social-clip',
  forceProvider = null,
  qualityFloor = 0,
  imageUrl,
}) => {
  const candidates = selectVideoProviders({
    planId,
    useCase,
    requestedDurationSec: durationSec,
    forceProvider,
    qualityFloor,
  });
  for (const p of candidates) {
    const result = await generateWithVideoProvider({ providerId: p.id, prompt, durationSec, width, height, imageUrl });
    if (result && result.url) return { ...result, qualityScore: p.quality, attempted: candidates.map((c) => c.id) };
  }
  return null;
};

export const handleVideoProviders = async (req, res, path, m) => {
  const json = (code, body) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };
  if (path === '/api/providers/videos' && m === 'GET') {
    const url = new URL(req.url, 'http://x');
    const planId = url.searchParams.get('planId') || 'free';
    const useCase = url.searchParams.get('useCase') || 'social-clip';
    const durationSec = Number(url.searchParams.get('durationSec') || 5);
    json(200, {
      planId,
      useCase,
      durationSec,
      recommended: selectVideoProviders({ planId, useCase, requestedDurationSec: durationSec }),
      all: VIDEO_PROVIDERS,
      policy: PLAN_VIDEO_POLICY[planId],
    });
    return true;
  }
  return false;
};
