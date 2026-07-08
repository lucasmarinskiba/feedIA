/**
 * Real Upscale Service
 * Actual AI upscaling via FAL's clarity-upscaler — same real endpoint already
 * proven working in api/_brandStudio.js (refineWithFal), reimplemented natively
 * in TS here so resolution-quality-engine.ts can call it directly without
 * cross-importing a plain-JS file from outside src/ (would break tsconfig
 * rootDir/allowJs constraints).
 *
 * Uses FAL_KEY — same env var already used by the Feed/autopilot pipeline.
 * Degrades gracefully: returns null (never throws) when FAL_KEY is unset or
 * the call fails, so callers fall back to their existing strategy/recommendation.
 */

import { log } from '../agent/logger.js';

const FAL_KEY = process.env.FAL_KEY;

export const isUpscaleConfigured = (): boolean => Boolean(FAL_KEY);

export interface UpscaleResult {
  url: string;
  provider: 'fal-clarity-upscaler';
  scaleFactor: number;
}

/**
 * Run a real AI upscale pass on an image URL (http(s) or data: URL).
 * creativity/resemblance tuned low-creativity/high-resemblance so the
 * upscale preserves facial identity and product details rather than
 * hallucinating new ones — this pairs with facial-identity-preservation.ts's
 * guarantee that real uploaded faces aren't reinvented during enhancement.
 */
export async function performRealUpscale(
  imageUrl: string,
  scaleFactor: 2 | 4 = 2
): Promise<UpscaleResult | null> {
  if (!FAL_KEY || !imageUrl) {
    log.warn('[RealUpscale] FAL_KEY not set or no imageUrl — skipping real upscale', {
      hasKey: Boolean(FAL_KEY),
    });
    return null;
  }

  try {
    const response = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        upscale_factor: scaleFactor,
        creativity: 0.15, // low — prioritize fidelity over invention
        resemblance: 0.95, // high — preserve source identity/detail
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      log.warn('[RealUpscale] FAL call failed', { status: response.status, body: body.slice(0, 200) });
      return null;
    }

    const json = (await response.json()) as { image?: { url?: string }; images?: Array<{ url?: string }> };
    const url = json.image?.url || json.images?.[0]?.url;

    if (!url) {
      log.warn('[RealUpscale] No image URL in FAL response');
      return null;
    }

    log.info('[RealUpscale] Upscale complete', { scaleFactor, url: url.slice(0, 80) });

    return { url, provider: 'fal-clarity-upscaler', scaleFactor };
  } catch (error) {
    log.warn('[RealUpscale] Upscale call threw', { error: String(error) });
    return null;
  }
}

/**
 * Multi-pass upscale for extreme scale factors (>4x) — chains two 2x passes
 * since FAL's clarity-upscaler tops out at reasonable single-pass quality
 * around 2-4x. Each pass re-applies low-creativity/high-resemblance settings.
 */
export async function performMultiPassUpscale(imageUrl: string): Promise<UpscaleResult | null> {
  const firstPass = await performRealUpscale(imageUrl, 4);
  if (!firstPass) return null;

  const secondPass = await performRealUpscale(firstPass.url, 4);
  if (!secondPass) return firstPass; // first pass still valid even if second fails

  return { ...secondPass, scaleFactor: 16 };
}
