import { env } from '../config/index.js';
import { log } from '../agent/logger.js';

export interface PostInsights {
  postId: string;
  publishedAt: string;
  format: string;
  caption?: string;
  metrics: {
    impresiones: number;
    alcance: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    watchTimeProm?: number;
    completionRate?: number;
    profileVisits?: number;
    reachFromHashtags?: number;
    reachFromExplore?: number;
  };
}

export interface AccountInsights {
  followers: number;
  followersDelta: number;
  reach: number;
  impressions: number;
  profileViews: number;
  websiteClicks: number;
  topCountries: Array<{ country: string; pct: number }>;
  topAgeGroups: Array<{ range: string; pct: number }>;
  topGender: Array<{ gender: string; pct: number }>;
  bestHours: Array<{ hour: number; engagementScore: number }>;
}

const guard = (): boolean => {
  if (!env.meta.accessToken || !env.meta.igBusinessId) {
    log.warn('Meta Insights: faltan META_ACCESS_TOKEN o META_IG_BUSINESS_ID. Modo simulado.');
    return false;
  }
  return true;
};

const BASE = 'https://graph.facebook.com/v18.0';

export const fetchPostInsights = async (sinceIso: string, untilIso?: string): Promise<PostInsights[]> => {
  if (env.dryRun || !guard()) {
    log.debug(`[DRY RUN] insights desde ${sinceIso} a ${untilIso ?? 'ahora'}`);
    return [];
  }

  try {
    const igId = env.meta.igBusinessId;
    const token = env.meta.accessToken;
    const sinceUnix = Math.floor(new Date(sinceIso).getTime() / 1000);
    const untilUnix = untilIso ? Math.floor(new Date(untilIso).getTime() / 1000) : Math.floor(Date.now() / 1000);

    // Fetch media list with basic fields
    const mediaUrl = `${BASE}/${igId}/media?fields=id,timestamp,caption,media_type,like_count,comments_count&since=${sinceUnix}&until=${untilUnix}&limit=100&access_token=${token}`;
    const mediaRes = await fetch(mediaUrl);
    if (!mediaRes.ok) {
      log.error(`fetchPostInsights media error: ${await mediaRes.text()}`);
      return [];
    }

    const mediaData = (await mediaRes.json()) as {
      data?: Array<{
        id: string;
        timestamp: string;
        caption?: string;
        media_type?: string;
        like_count?: number;
        comments_count?: number;
      }>;
    };

    const posts: PostInsights[] = [];

    for (const m of mediaData.data ?? []) {
      // Fetch insights per media
      const metrics = [
        'impressions',
        'reach',
        'saved',
        'shares',
        'total_interactions',
        'video_views',
        'plays',
        'profile_visits',
        'ig_reels_aggregated_all_plays_count',
      ];
      const insightsUrl = `${BASE}/${m.id}/insights?metric=${metrics.join(',')}&access_token=${token}`;
      const insightsRes = await fetch(insightsUrl);

      let impresiones = 0;
      let alcance = 0;
      let saves = 0;
      let shares = 0;
      let watchTimeProm: number | undefined;
      let completionRate: number | undefined;
      let profileVisits = 0;
      let reachFromHashtags: number | undefined;
      let reachFromExplore: number | undefined;

      if (insightsRes.ok) {
        const insightsData = (await insightsRes.json()) as {
          data?: Array<{ name: string; values: Array<{ value: number }> }>;
        };
        for (const insight of insightsData.data ?? []) {
          const value = insight.values[0]?.value ?? 0;
          switch (insight.name) {
            case 'impressions':
              impresiones = value;
              break;
            case 'reach':
              alcance = value;
              break;
            case 'saved':
              saves = value;
              break;
            case 'shares':
              shares = value;
              break;
            case 'video_views':
            case 'ig_reels_aggregated_all_plays_count':
              watchTimeProm = value;
              break;
            case 'plays':
              completionRate = value;
              break;
            case 'profile_visits':
              profileVisits = value;
              break;
          }
        }
      }

      posts.push({
        postId: m.id,
        publishedAt: m.timestamp,
        format: m.media_type ?? 'unknown',
        caption: m.caption,
        metrics: {
          impresiones,
          alcance,
          likes: m.like_count ?? 0,
          comments: m.comments_count ?? 0,
          saves,
          shares,
          watchTimeProm,
          completionRate,
          profileVisits: profileVisits || undefined,
          reachFromHashtags,
          reachFromExplore,
        },
      });
    }

    log.info(`fetchPostInsights: ${posts.length} posts con métricas reales`);
    return posts;
  } catch (err) {
    log.error(`fetchPostInsights error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
};

export const fetchAccountInsights = async (sinceIso: string, untilIso?: string): Promise<AccountInsights | null> => {
  if (env.dryRun || !guard()) {
    log.debug(`[DRY RUN] account insights ${sinceIso} → ${untilIso ?? 'ahora'}`);
    return null;
  }

  try {
    const igId = env.meta.igBusinessId;
    const token = env.meta.accessToken;
    const sinceUnix = Math.floor(new Date(sinceIso).getTime() / 1000);
    const untilUnix = untilIso ? Math.floor(new Date(untilIso).getTime() / 1000) : Math.floor(Date.now() / 1000);

    // Basic account metrics (daily aggregation)
    const metrics = [
      'follower_count',
      'impressions',
      'reach',
      'profile_views',
      'website_clicks',
      'email_contacts',
      'get_directions_clicks',
    ];
    const url = `${BASE}/${igId}/insights?metric=${metrics.join(',')}&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) {
      log.error(`fetchAccountInsights error: ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as {
      data?: Array<{ name: string; values: Array<{ value: number }> }>;
    };

    let followers = 0;
    let impressions = 0;
    let reach = 0;
    let profileViews = 0;
    let websiteClicks = 0;

    for (const insight of data.data ?? []) {
      const total = insight.values.reduce((sum, v) => sum + (v.value ?? 0), 0);
      switch (insight.name) {
        case 'follower_count':
          followers = insight.values[insight.values.length - 1]?.value ?? 0;
          break;
        case 'impressions':
          impressions = total;
          break;
        case 'reach':
          reach = total;
          break;
        case 'profile_views':
          profileViews = total;
          break;
        case 'website_clicks':
          websiteClicks = total;
          break;
      }
    }

    // Audience demographics (lifetime)
    const audienceUrl = `${BASE}/${igId}/insights?metric=audience_city,audience_country,audience_gender_age,audience_locale&period=lifetime&access_token=${token}`;
    const audRes = await fetch(audienceUrl);

    let topCountries: Array<{ country: string; pct: number }> = [];
    let topAgeGroups: Array<{ range: string; pct: number }> = [];
    let topGender: Array<{ gender: string; pct: number }> = [];

    if (audRes.ok) {
      const audData = (await audRes.json()) as {
        data?: Array<{ name: string; values: Array<{ value: Record<string, number> }> }>;
      };
      for (const insight of audData.data ?? []) {
        const valueMap = insight.values[0]?.value ?? {};
        const entries = Object.entries(valueMap).sort((a, b) => b[1] - a[1]);

        if (insight.name === 'audience_country') {
          const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
          topCountries = entries.slice(0, 5).map(([country, count]) => ({
            country,
            pct: Math.round((count / total) * 1000) / 10,
          }));
        }
        if (insight.name === 'audience_gender_age') {
          const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
          topAgeGroups = entries.slice(0, 5).map(([range, count]) => ({
            range,
            pct: Math.round((count / total) * 1000) / 10,
          }));
          const genderMap: Record<string, number> = {};
          for (const [key, count] of entries) {
            const gender = key.split('.')[0] ?? 'unknown';
            genderMap[gender] = (genderMap[gender] ?? 0) + count;
          }
          const genderTotal = Object.values(genderMap).reduce((s, v) => s + v, 0) || 1;
          topGender = Object.entries(genderMap).map(([gender, count]) => ({
            gender,
            pct: Math.round((count / genderTotal) * 1000) / 10,
          }));
        }
      }
    }

    // Best hours approximation using online followers (if available)
    let bestHours: Array<{ hour: number; engagementScore: number }> = [];
    const onlineUrl = `${BASE}/${igId}/insights?metric=online_followers&period=lifetime&access_token=${token}`;
    const onlineRes = await fetch(onlineUrl);
    if (onlineRes.ok) {
      const onlineData = (await onlineRes.json()) as {
        data?: Array<{ values: Array<{ value: Record<string, number> }> }>;
      };
      const hourMap = onlineData.data?.[0]?.values?.[0]?.value ?? {};
      bestHours = Object.entries(hourMap)
        .map(([hour, count]) => ({ hour: Number(hour), engagementScore: count }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 6);
    }

    // Calculate followers delta by comparing first vs last day
    const followersDelta = 0; // Would need historical data from DB

    log.info(`fetchAccountInsights: followers=${followers}, impressions=${impressions}, reach=${reach}`);

    return {
      followers,
      followersDelta,
      reach,
      impressions,
      profileViews,
      websiteClicks,
      topCountries,
      topAgeGroups,
      topGender,
      bestHours,
    };
  } catch (err) {
    log.error(`fetchAccountInsights error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
};
