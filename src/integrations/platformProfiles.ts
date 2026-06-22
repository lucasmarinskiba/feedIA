/**
 * platformProfiles — fetch real Instagram + TikTok profile data
 * (followers/following/posts/likes) via official Graph/Display APIs.
 *
 * Falls back to mock with `real: false` when tokens missing.
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { getConnection } from './oauthConnections.js';

const DEFAULT_BRAND_ID = 'default';

const resolveIgCreds = async (
  brandId: string = DEFAULT_BRAND_ID,
): Promise<{ accessToken: string; igBusinessId: string } | null> => {
  const conn = await getConnection(brandId, 'instagram');
  if (conn?.accessToken) {
    const igBusinessId = (conn.metadata?.igBusinessId as string) || env.meta.igBusinessId;
    if (igBusinessId) return { accessToken: conn.accessToken, igBusinessId };
  }
  if (env.meta.accessToken && env.meta.igBusinessId) {
    return { accessToken: env.meta.accessToken, igBusinessId: env.meta.igBusinessId };
  }
  return null;
};

const resolveTtToken = async (brandId: string = DEFAULT_BRAND_ID): Promise<string | null> => {
  const conn = await getConnection(brandId, 'tiktok');
  if (conn?.accessToken) return conn.accessToken;
  return env.tiktok.accessToken || null;
};

export interface UnifiedProfile {
  real: boolean;
  platform: 'instagram' | 'tiktok';
  name: string;
  handle: string;
  avatar: string | null;
  bio: string | null;
  posts: number;
  followers: number;
  following: number;
  likes?: number;
  fetchedAt: string;
  source: 'graph-api' | 'tiktok-display-api' | 'mock';
  errorMessage?: string;
}

const IG_FIELDS = 'username,name,followers_count,follows_count,media_count,profile_picture_url,biography';
const TT_FIELDS =
  'open_id,union_id,avatar_url,avatar_url_100,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count,username';

const MOCK_IG: UnifiedProfile = {
  real: false,
  platform: 'instagram',
  name: 'Paithon Labs',
  handle: 'paithonlabs',
  avatar: null,
  bio: 'Conectá tu cuenta para ver datos reales.',
  posts: 0,
  followers: 0,
  following: 0,
  fetchedAt: new Date().toISOString(),
  source: 'mock',
};

const MOCK_TT: UnifiedProfile = {
  real: false,
  platform: 'tiktok',
  name: 'Paithon Labs',
  handle: 'paithonlabs',
  avatar: null,
  bio: 'Conectá TikTok para ver datos reales.',
  posts: 0,
  followers: 0,
  following: 0,
  likes: 0,
  fetchedAt: new Date().toISOString(),
  source: 'mock',
};

export const fetchInstagramProfile = async (brandId?: string): Promise<UnifiedProfile> => {
  const creds = await resolveIgCreds(brandId);
  if (!creds) return { ...MOCK_IG, fetchedAt: new Date().toISOString() };
  const { accessToken, igBusinessId } = creds;
  try {
    const url = `https://graph.facebook.com/v18.0/${igBusinessId}?fields=${IG_FIELDS}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      log.warn('[platformProfiles] IG fetch failed', { status: res.status, body: errText.slice(0, 200) });
      return { ...MOCK_IG, fetchedAt: new Date().toISOString(), errorMessage: `IG API ${res.status}` };
    }
    const data = (await res.json()) as {
      username?: string;
      name?: string;
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
      profile_picture_url?: string;
      biography?: string;
    };
    return {
      real: true,
      platform: 'instagram',
      name: data.name ?? data.username ?? 'Instagram',
      handle: data.username ?? 'cuenta',
      avatar: data.profile_picture_url ?? null,
      bio: data.biography ?? null,
      posts: data.media_count ?? 0,
      followers: data.followers_count ?? 0,
      following: data.follows_count ?? 0,
      fetchedAt: new Date().toISOString(),
      source: 'graph-api',
    };
  } catch (err) {
    log.error('[platformProfiles] IG fetch error', { err: String(err) });
    return { ...MOCK_IG, fetchedAt: new Date().toISOString(), errorMessage: String(err) };
  }
};

export const fetchTikTokProfile = async (brandId?: string): Promise<UnifiedProfile> => {
  const accessToken = await resolveTtToken(brandId);
  if (!accessToken) {
    return { ...MOCK_TT, fetchedAt: new Date().toISOString() };
  }
  try {
    const url = `https://open.tiktokapis.com/v2/user/info/?fields=${TT_FIELDS}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const errText = await res.text();
      log.warn('[platformProfiles] TikTok fetch failed', { status: res.status, body: errText.slice(0, 200) });
      return { ...MOCK_TT, fetchedAt: new Date().toISOString(), errorMessage: `TikTok API ${res.status}` };
    }
    const json = (await res.json()) as {
      data?: {
        user?: {
          open_id?: string;
          display_name?: string;
          username?: string;
          avatar_url?: string;
          avatar_url_100?: string;
          bio_description?: string;
          follower_count?: number;
          following_count?: number;
          likes_count?: number;
          video_count?: number;
          is_verified?: boolean;
        };
      };
    };
    const user = json.data?.user ?? {};
    return {
      real: true,
      platform: 'tiktok',
      name: user.display_name ?? user.username ?? 'TikTok',
      handle: user.username ?? user.open_id ?? 'cuenta',
      avatar: user.avatar_url_100 ?? user.avatar_url ?? null,
      bio: user.bio_description ?? null,
      posts: user.video_count ?? 0,
      followers: user.follower_count ?? 0,
      following: user.following_count ?? 0,
      likes: user.likes_count ?? 0,
      fetchedAt: new Date().toISOString(),
      source: 'tiktok-display-api',
    };
  } catch (err) {
    log.error('[platformProfiles] TikTok fetch error', { err: String(err) });
    return { ...MOCK_TT, fetchedAt: new Date().toISOString(), errorMessage: String(err) };
  }
};

export interface InstagramMediaItem {
  id: string;
  permalink: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string;
  caption?: string;
  likeCount?: number;
  commentsCount?: number;
  timestamp?: string;
  thumbnailUrl?: string;
}

export const fetchInstagramMedia = async (
  limit = 36,
  brandId?: string,
): Promise<{ real: boolean; items: InstagramMediaItem[]; source: string; errorMessage?: string }> => {
  const creds = await resolveIgCreds(brandId);
  if (!creds) return { real: false, items: [], source: 'mock' };
  const { accessToken, igBusinessId } = creds;
  try {
    const fields = 'id,permalink,media_url,thumbnail_url,media_type,caption,like_count,comments_count,timestamp';
    const url = `https://graph.facebook.com/v18.0/${igBusinessId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      return { real: false, items: [], source: 'graph-api', errorMessage: `IG media ${res.status}` };
    }
    const data = (await res.json()) as {
      data?: Array<{
        id: string;
        permalink: string;
        media_url: string;
        thumbnail_url?: string;
        media_type: string;
        caption?: string;
        like_count?: number;
        comments_count?: number;
        timestamp?: string;
      }>;
    };
    const items: InstagramMediaItem[] = (data.data ?? []).map((m) => ({
      id: m.id,
      permalink: m.permalink,
      mediaUrl: m.media_url,
      thumbnailUrl: m.thumbnail_url,
      mediaType: m.media_type,
      caption: m.caption,
      likeCount: m.like_count,
      commentsCount: m.comments_count,
      timestamp: m.timestamp,
    }));
    return { real: true, items, source: 'graph-api' };
  } catch (err) {
    return { real: false, items: [], source: 'graph-api', errorMessage: String(err) };
  }
};

export interface TikTokVideoItem {
  id: string;
  title?: string;
  coverImageUrl?: string;
  shareUrl?: string;
  durationSec?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  createTime?: number;
}

export const fetchTikTokVideos = async (
  limit = 20,
  brandId?: string,
): Promise<{ real: boolean; items: TikTokVideoItem[]; source: string; errorMessage?: string }> => {
  const accessToken = await resolveTtToken(brandId);
  if (!accessToken) return { real: false, items: [], source: 'mock' };
  try {
    const fields =
      'id,title,cover_image_url,share_url,duration,view_count,like_count,comment_count,share_count,create_time';
    const url = `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_count: limit }),
    });
    if (!res.ok)
      return { real: false, items: [], source: 'tiktok-display-api', errorMessage: `TT videos ${res.status}` };
    const data = (await res.json()) as {
      data?: {
        videos?: Array<{
          id: string;
          title?: string;
          cover_image_url?: string;
          share_url?: string;
          duration?: number;
          view_count?: number;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          create_time?: number;
        }>;
      };
    };
    const items: TikTokVideoItem[] = (data.data?.videos ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      coverImageUrl: v.cover_image_url,
      shareUrl: v.share_url,
      durationSec: v.duration,
      viewCount: v.view_count,
      likeCount: v.like_count,
      commentCount: v.comment_count,
      shareCount: v.share_count,
      createTime: v.create_time,
    }));
    return { real: true, items, source: 'tiktok-display-api' };
  } catch (err) {
    return { real: false, items: [], source: 'tiktok-display-api', errorMessage: String(err) };
  }
};
