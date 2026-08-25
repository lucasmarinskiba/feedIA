/**
 * Real Video Generation — multi-provider orchestration
 * FREE tier: Pollinations (no auth), HF (with key), Cloudflare (with key)
 * PAID tier: fal.ai (Kling, Runway, Pika) — blocked until billing fixed
 */

import { v4 as uuid } from 'uuid';

const POLLINATIONS_API = 'https://api.pollinations.ai/video';
const HF_API = 'https://api-inference.huggingface.co/models';

const HF_KEY = process.env.HUGGINGFACE_API_KEY || '';
const FAL_KEY = process.env.FAL_KEY || '';

/**
 * Select best provider based on tier + requirements
 */
const selectProvider = (tier = 'free', requiresImage = false) => {
  if (tier === 'free' || !FAL_KEY) {
    if (requiresImage && HF_KEY) return 'hf-stable-video';
    return 'pollinations'; // Fallback: always works
  }
  // Paid: prefer highest quality
  return 'fal-kling';
};

/**
 * Generate video using Pollinations (FREE, no auth required)
 */
export const generateWithPollinations = async (prompt, durationSec = 5, style = 'cinematic') => {
  try {
    const body = {
      prompt,
      duration: Math.min(durationSec, 5), // Max 5sec
      quality: 'sd', // Standard def (free tier)
      style, // 'cinematic', 'animation', 'documentary', etc
    };

    const res = await fetch(POLLINATIONS_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 45000,
    });

    if (!res.ok) {
      throw new Error(`Pollinations: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return {
      provider: 'pollinations',
      videoUrl: data.url || data.video_url,
      duration: durationSec,
      quality: 'sd',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    throw new Error(`Pollinations video gen failed: ${String(err)}`);
  }
};

/**
 * Generate video using HuggingFace (FREE with key, img-to-video)
 */
export const generateWithHuggingFace = async (imageUrl, prompt, style = 'cinematic') => {
  if (!HF_KEY) {
    throw new Error('HuggingFace API key not configured');
  }

  try {
    // Use LTX-Video (free, fast img-to-video)
    const model = 'alimama-creative/LTX-Video';
    const res = await fetch(`${HF_API}/${model}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${HF_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          image_url: imageUrl,
          prompt,
          num_frames: 24, // 1 second @ 24fps
        },
      }),
      timeout: 120000, // HF can take time
    });

    if (!res.ok) {
      throw new Error(`HF: ${res.status}`);
    }

    const data = await res.json();
    return {
      provider: 'hf-ltx-video',
      videoUrl: data.video_url || data.url,
      duration: 1.0, // ~1 second per generation
      quality: 'hd',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    throw new Error(`HuggingFace video gen failed: ${String(err)}`);
  }
};

/**
 * Main video generation handler
 */
export const handleVideoGeneration = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  // ─── POST /api/video/generate ─────────────────────────────────
  if (path === '/api/video/generate' && m === 'POST') {
    const { prompt, durationSec = 5, style = 'cinematic', tier = 'free', imageUrl } = body || {};

    if (!prompt) {
      return json(400, { error: 'prompt required' });
    }

    try {
      const generationId = `vid_${uuid()}`;
      let result;

      // Choose provider
      const provider = selectProvider(tier, Boolean(imageUrl));

      if (provider === 'pollinations') {
        result = await generateWithPollinations(prompt, durationSec, style);
      } else if (provider === 'hf-stable-video' || provider === 'hf-ltx-video') {
        if (!imageUrl) {
          return json(400, { error: `${provider} requires imageUrl` });
        }
        result = await generateWithHuggingFace(imageUrl, prompt, style);
      } else if (provider === 'fal-kling') {
        return json(503, { error: 'fal.ai video gen temporarily blocked (billing issue). Use free tier.' });
      }

      return json(200, {
        generationId,
        ...result,
        provider,
        status: 'completed',
      });
    } catch (err) {
      return json(500, { error: 'video-generation-failed' });
    }
  }

  // ─── POST /api/video/batch-generate ──────────────────────────
  if (path === '/api/video/batch-generate' && m === 'POST') {
    const { prompts, durationSec = 5, style = 'cinematic', tier = 'free' } = body || {};

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return json(400, { error: 'prompts array required' });
    }

    // Limit batch size per tier
    const maxBatch = tier === 'free' ? 3 : tier === 'starter' ? 5 : 10;
    if (prompts.length > maxBatch) {
      return json(400, { error: `max ${maxBatch} videos per batch for ${tier} tier` });
    }

    try {
      const results = [];
      for (const prompt of prompts) {
        try {
          const result = await generateWithPollinations(prompt, durationSec, style);
          results.push({
            generationId: `vid_${uuid()}`,
            prompt,
            ...result,
            status: 'completed',
          });
        } catch (err) {
          results.push({
            generationId: `vid_${uuid()}`,
            prompt,
            status: 'failed',
            error: String(err).slice(0, 100),
          });
        }
      }

      return json(200, {
        batchId: `batch_${uuid()}`,
        totalRequested: prompts.length,
        totalGenerated: results.filter((r) => r.status === 'completed').length,
        results,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      return json(500, { error: 'batch-generation-failed' });
    }
  }

  // ─── GET /api/video/providers ────────────────────────────────
  if (path === '/api/video/providers' && m === 'GET') {
    return json(200, {
      free: [
        {
          id: 'pollinations',
          label: 'Pollinations Video',
          quality: 'sd',
          maxDuration: 5,
          auth: 'none',
          available: true,
        },
        {
          id: 'hf-ltx-video',
          label: 'HuggingFace LTX-Video',
          quality: 'hd',
          maxDuration: 5,
          auth: 'HUGGINGFACE_API_KEY',
          available: Boolean(HF_KEY),
        },
      ],
      paid: [
        {
          id: 'fal-kling',
          label: 'fal.ai Kling 1.6',
          quality: '4k',
          maxDuration: 30,
          auth: 'FAL_KEY',
          available: Boolean(FAL_KEY),
          status: FAL_KEY ? 'ready' : 'blocked-no-key',
        },
      ],
    });
  }

  return false;
};

export const handleVideoPublishing = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  // ─── POST /api/publish/instagram ─────────────────────────────
  if (path === '/api/publish/instagram' && m === 'POST') {
    const { videoUrl, caption, igBusinessAccountId, accessToken } = body || {};

    if (!videoUrl || !igBusinessAccountId || !accessToken) {
      return json(400, { error: 'videoUrl, igBusinessAccountId, accessToken required' });
    }

    try {
      // Real IG Graph API call
      const igRes = await fetch(
        `https://graph.instagram.com/v18.0/${igBusinessAccountId}/media`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            media_type: 'VIDEO',
            video_url: videoUrl,
            caption,
            access_token: accessToken,
          }),
          timeout: 30000,
        }
      );

      if (!igRes.ok) {
        const err = await igRes.json();
        return json(400, { error: err.error?.message || 'Instagram API error' });
      }

      const result = await igRes.json();
      return json(200, {
        published: true,
        mediaId: result.id,
        platform: 'instagram',
        publishedAt: new Date().toISOString(),
      });
    } catch (err) {
      return json(500, { error: 'instagram-publish-failed' });
    }
  }

  // ─── POST /api/publish/tiktok ───────────────────────────────
  if (path === '/api/publish/tiktok' && m === 'POST') {
    const { videoUrl, caption, accessToken } = body || {};

    if (!videoUrl || !accessToken) {
      return json(400, { error: 'videoUrl, accessToken required' });
    }

    try {
      // Real TikTok API call
      const ttRes = await fetch('https://open.tiktokapis.com/v1/post/publish/action/submit/', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          source_info: {
            source: 'EXTERNAL_URL',
            video_url: videoUrl,
          },
          post_info: {
            caption,
            privacy_level: 'PUBLIC',
            disable_comment: false,
            disable_duet: false,
            disable_stitch: false,
          },
        }),
        timeout: 30000,
      });

      if (!ttRes.ok) {
        const err = await ttRes.json();
        return json(400, { error: err.message || 'TikTok API error' });
      }

      const result = await ttRes.json();
      return json(200, {
        published: true,
        videoId: result.data?.video_id,
        platform: 'tiktok',
        publishedAt: new Date().toISOString(),
      });
    } catch (err) {
      return json(500, { error: 'tiktok-publish-failed' });
    }
  }

  return false;
};
