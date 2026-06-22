import { getDb } from './db.js';

export interface AnalyticsSnapshot {
  id?: number;
  accountId: string;
  snapshotDate: string;
  followers?: number;
  reach?: number;
  impressions?: number;
  profileViews?: number;
  websiteClicks?: number;
  postsCount?: number;
  dataJson?: string;
}

export const saveAnalyticsSnapshot = (snap: AnalyticsSnapshot): void => {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO analytics_snapshots (account_id, snapshot_date, followers, reach, impressions, profile_views, website_clicks, posts_count, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    snap.accountId,
    snap.snapshotDate,
    snap.followers ?? null,
    snap.reach ?? null,
    snap.impressions ?? null,
    snap.profileViews ?? null,
    snap.websiteClicks ?? null,
    snap.postsCount ?? null,
    snap.dataJson ?? null,
  );
};

export const getLatestAnalytics = (accountId: string): AnalyticsSnapshot | undefined => {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM analytics_snapshots WHERE account_id = ? ORDER BY snapshot_date DESC LIMIT 1')
    .get(accountId) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return rowToSnap(row);
};

export const getAnalyticsRange = (accountId: string, since: string, until: string): AnalyticsSnapshot[] => {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM analytics_snapshots WHERE account_id = ? AND snapshot_date BETWEEN ? AND ? ORDER BY snapshot_date',
    )
    .all(accountId, since, until) as Array<Record<string, unknown>>;
  return rows.map(rowToSnap);
};

function rowToSnap(row: Record<string, unknown>): AnalyticsSnapshot {
  return {
    id: Number(row.id),
    accountId: String(row.account_id),
    snapshotDate: String(row.snapshot_date),
    followers: row.followers ? Number(row.followers) : undefined,
    reach: row.reach ? Number(row.reach) : undefined,
    impressions: row.impressions ? Number(row.impressions) : undefined,
    profileViews: row.profile_views ? Number(row.profile_views) : undefined,
    websiteClicks: row.website_clicks ? Number(row.website_clicks) : undefined,
    postsCount: row.posts_count ? Number(row.posts_count) : undefined,
    dataJson: row.data_json ? String(row.data_json) : undefined,
  };
}

export interface PostMetricRecord {
  postId: string;
  snapshotDate: string;
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  watchTime?: number;
  completionRate?: number;
  profileVisits?: number;
}

export const savePostMetrics = (metric: PostMetricRecord): void => {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO post_metrics (post_id, snapshot_date, impressions, reach, likes, comments, saves, shares, watch_time, completion_rate, profile_visits)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    metric.postId,
    metric.snapshotDate,
    metric.impressions ?? null,
    metric.reach ?? null,
    metric.likes ?? null,
    metric.comments ?? null,
    metric.saves ?? null,
    metric.shares ?? null,
    metric.watchTime ?? null,
    metric.completionRate ?? null,
    metric.profileVisits ?? null,
  );
};

export const getPostMetrics = (postId: string): PostMetricRecord[] => {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM post_metrics WHERE post_id = ? ORDER BY snapshot_date DESC')
    .all(postId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    postId: String(row.post_id),
    snapshotDate: String(row.snapshot_date),
    impressions: row.impressions ? Number(row.impressions) : undefined,
    reach: row.reach ? Number(row.reach) : undefined,
    likes: row.likes ? Number(row.likes) : undefined,
    comments: row.comments ? Number(row.comments) : undefined,
    saves: row.saves ? Number(row.saves) : undefined,
    shares: row.shares ? Number(row.shares) : undefined,
    watchTime: row.watch_time ? Number(row.watch_time) : undefined,
    completionRate: row.completion_rate ? Number(row.completion_rate) : undefined,
    profileVisits: row.profile_visits ? Number(row.profile_visits) : undefined,
  }));
};
