import { log } from '../../agent/logger.js';
import { executeWithRecovery } from './reliableSession.js';
import type { BrandProfile } from '../../config/types.js';

export const fetchAnalyticsWithComputerUse = async (
  brand: BrandProfile,
  platform: 'instagram' | 'tiktok',
  action: string,
  accountHandle: string,
): Promise<{ ok: boolean; metrics?: Record<string, unknown>; durationMs: number; error?: string }> => {
  const startMs = Date.now();

  try {
    const goal = buildAnalyticsGoal(brand, platform, action, accountHandle);
    log.info(`[AnalyticsComputerUse] ${platform}: ${action}`);

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 15,
      operationName: `Fetch ${platform} analytics`,
      maxRetries: 2,
    });

    if (!result.ok) {
      return {
        ok: false,
        durationMs: Date.now() - startMs,
        error: result.summary || 'Analytics fetch failed',
      };
    }

    const metrics = parseMetrics(result.summary, platform);

    return {
      ok: true,
      metrics,
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

function buildAnalyticsGoal(
  brand: BrandProfile,
  platform: 'instagram' | 'tiktok',
  action: string,
  accountHandle: string,
): string {
  if (platform === 'instagram') {
    return `Open Instagram Insights for @${accountHandle} (${action}):
1. Go to instagram.com and login
2. Navigate to Insights/Analytics
3. Extract ${action} metrics (followers, reach, engagement, etc.)
4. Screenshot and report metrics found
Brand context: @${brand.name}`;
  }

  return `Open TikTok Analytics for @${accountHandle} (${action}):
1. Go to tiktok.com and login
2. Navigate to Creator Analytics
3. Extract ${action} data (views, followers, engagement)
4. Screenshot and report metrics
Brand: @${brand.name}`;
}

function parseMetrics(summary: string, _platform: string): Record<string, unknown> {
  const metrics: Record<string, unknown> = {};

  const followerMatch = summary.match(/followers?:?\s+(\d+(?:,\d+)*)/i);
  if (followerMatch && followerMatch[1]) {
    metrics.followers = parseInt(followerMatch[1].replace(/,/g, ''), 10);
  }

  const reachMatch = summary.match(/reach:?\s+(\d+(?:,\d+)*)/i);
  if (reachMatch && reachMatch[1]) {
    metrics.reach = parseInt(reachMatch[1].replace(/,/g, ''), 10);
  }

  const engagementMatch = summary.match(/engagement:?\s+([\d.]+)%?/i);
  if (engagementMatch && engagementMatch[1]) {
    metrics.engagement_rate = parseFloat(engagementMatch[1]);
  }

  return Object.keys(metrics).length > 0 ? metrics : { status: 'metrics_extracted' };
}
