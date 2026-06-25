/**
 * Platform Health Check — verify API credentials are valid and endpoints accessible.
 * Used for debugging integration issues.
 */

import { log } from '../agent/logger.js';
import { env } from '../config/index.js';
import { getConnection } from './oauthConnections.js';
import { fetchInstagramProfile, fetchTikTokProfile } from './platformProfiles.js';

export interface HealthCheckResult {
  platform: 'instagram' | 'tiktok';
  status: 'ok' | 'no-credentials' | 'api-error' | 'invalid-data';
  message: string;
  followerCount?: number;
  errorDetails?: string;
}

export const checkInstagramHealth = async (brandId?: string): Promise<HealthCheckResult> => {
  try {
    const conn = await getConnection(brandId ?? 'default', 'instagram');
    const hasEnvToken = !!env.meta.accessToken && !!env.meta.igBusinessId;

    if (!conn && !hasEnvToken) {
      return {
        platform: 'instagram',
        status: 'no-credentials',
        message: 'META_ACCESS_TOKEN and META_IG_BUSINESS_ID not configured',
      };
    }

    const profile = await fetchInstagramProfile(brandId);

    if (!profile.real) {
      return {
        platform: 'instagram',
        status: 'no-credentials',
        message: 'Using mock data (no real credentials)',
      };
    }

    if (profile.errorMessage) {
      return {
        platform: 'instagram',
        status: 'api-error',
        message: `API error: ${profile.errorMessage}`,
        errorDetails: profile.errorMessage,
      };
    }

    if (!profile.followers && profile.followers !== 0) {
      return {
        platform: 'instagram',
        status: 'invalid-data',
        message: 'API returned invalid data (missing followers_count)',
        errorDetails: JSON.stringify(profile),
      };
    }

    return {
      platform: 'instagram',
      status: 'ok',
      message: `✅ Connected. ${profile.followers} followers, ${profile.posts} posts`,
      followerCount: profile.followers,
    };
  } catch (err) {
    return {
      platform: 'instagram',
      status: 'api-error',
      message: `Exception: ${String(err)}`,
      errorDetails: String(err),
    };
  }
};

export const checkTikTokHealth = async (brandId?: string): Promise<HealthCheckResult> => {
  try {
    const conn = await getConnection(brandId ?? 'default', 'tiktok');
    const hasEnvToken = !!env.tiktok.accessToken;

    if (!conn && !hasEnvToken) {
      return {
        platform: 'tiktok',
        status: 'no-credentials',
        message: 'TIKTOK_ACCESS_TOKEN not configured',
      };
    }

    const profile = await fetchTikTokProfile(brandId);

    if (!profile.real) {
      return {
        platform: 'tiktok',
        status: 'no-credentials',
        message: 'Using mock data (no real credentials)',
      };
    }

    if (profile.errorMessage) {
      return {
        platform: 'tiktok',
        status: 'api-error',
        message: `API error: ${profile.errorMessage}`,
        errorDetails: profile.errorMessage,
      };
    }

    if (!profile.followers && profile.followers !== 0) {
      return {
        platform: 'tiktok',
        status: 'invalid-data',
        message: 'API returned invalid data (missing follower_count)',
        errorDetails: JSON.stringify(profile),
      };
    }

    return {
      platform: 'tiktok',
      status: 'ok',
      message: `✅ Connected. ${profile.followers} followers, ${profile.posts} videos, ${profile.likes} total likes`,
      followerCount: profile.followers,
    };
  } catch (err) {
    return {
      platform: 'tiktok',
      status: 'api-error',
      message: `Exception: ${String(err)}`,
      errorDetails: String(err),
    };
  }
};

export const checkAllPlatforms = async (brandId?: string): Promise<HealthCheckResult[]> => {
  log.info('[platformHealthCheck] Checking all platforms...');

  const [ig, tt] = await Promise.all([
    checkInstagramHealth(brandId),
    checkTikTokHealth(brandId),
  ]);

  const results = [ig, tt];

  results.forEach((r) => {
    const icon = r.status === 'ok' ? '✅' : r.status === 'no-credentials' ? '⚠️' : '❌';
    log.info(`[platformHealthCheck] ${icon} ${r.platform}: ${r.message}`);
  });

  return results;
};
