import { log } from '../../agent/logger.js';
import { executeWithRecovery } from './reliableSession.js';
import type { BrandProfile } from '../../config/types.js';

export const publishWithComputerUse = async (
  brand: BrandProfile,
  platform: 'instagram' | 'tiktok',
  caption: string,
  mediaPath: string,
  hashtags: string[],
): Promise<{ ok: boolean; postUrl?: string; durationMs: number; error?: string }> => {
  const startMs = Date.now();

  try {
    const goal = buildPublishGoal(brand, platform, caption, mediaPath, hashtags);
    log.info(`[PostingComputerUse] Publishing to ${platform}`);

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 18,
      operationName: `Publish to ${platform}`,
      maxRetries: 2,
    });

    if (!result.ok) {
      return {
        ok: false,
        durationMs: Date.now() - startMs,
        error: result.summary || 'Publishing failed',
      };
    }

    const postUrl = extractPostUrl(result.summary, platform);

    return {
      ok: true,
      postUrl,
      durationMs: Date.now() - startMs,
    };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

function buildPublishGoal(
  brand: BrandProfile,
  platform: 'instagram' | 'tiktok',
  caption: string,
  mediaPath: string,
  hashtags: string[],
): string {
  const hashtagStr = hashtags.join(' ');

  if (platform === 'instagram') {
    return `Publish to Instagram as @${brand.name}:
1. Open instagram.com
2. Click "Create" or "+" button
3. Upload image/video from: ${mediaPath}
4. Add caption:
   ${caption}
   ${hashtagStr}
5. Set optimal posting time
6. Click "Share"
7. Wait for success and get post URL
Brand voice: ${brand.voice.tone}`;
  }

  return `Publish to TikTok as @${brand.name}:
1. Open tiktok.com
2. Click "Upload" or "+"
3. Select video: ${mediaPath}
4. Add caption:
   ${caption}
   ${hashtagStr}
5. Set to "Public"
6. Click "Post"
7. Get final video URL
Tone: ${brand.voice.tone}`;
}

function extractPostUrl(summary: string, platform: string): string | undefined {
  if (platform === 'instagram') {
    const match = summary.match(/instagram\.com\/p\/([^\s/]+)/i);
    return match ? `https://instagram.com/p/${match[1]}` : undefined;
  }

  if (platform === 'tiktok') {
    const match = summary.match(/tiktok\.com\/@[^\s/]+\/video\/(\d+)/i);
    return match ? `https://tiktok.com/@user/video/${match[1]}` : undefined;
  }

  return undefined;
}
