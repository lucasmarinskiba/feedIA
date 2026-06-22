/**
 * Calendar Queue — posts programados/publicados para Instagram.
 *
 * Abstracción sobre Supabase (producción) y SQLite (local/dev).
 * Usada por workers, scheduler y API REST.
 */

import { randomUUID } from 'node:crypto';
import {
  isSupabaseAvailable,
  isSupabaseServiceRoleAvailable,
  supabaseInsert,
  supabaseQuery,
  supabaseUpdate,
  type Json,
  type QueryFilter,
} from '../integrations/providers/supabase.js';
import { getDb } from './db.js';
import { log } from '../agent/logger.js';

export type CalendarPostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export interface CalendarPost {
  id: string;
  accountId: string;
  format: 'reel' | 'carrusel' | 'imagen' | 'historia';
  caption?: string;
  mediaUrls: string[];
  firstComment?: string;
  status: CalendarPostStatus;
  metaPostId?: string;
  scheduledAt?: string; // ISO
  publishedAt?: string; // ISO
  errorLog?: string;
  attempts: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

const statusValues: CalendarPostStatus[] = ['draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'];

const isValidStatus = (s: string): s is CalendarPostStatus => statusValues.includes(s as CalendarPostStatus);

const mapSupabaseRow = (row: Record<string, unknown>): CalendarPost => ({
  id: String(row.id),
  accountId: String(row.account_id),
  format: String(row.format) as CalendarPost['format'],
  caption: row.caption ? String(row.caption) : undefined,
  mediaUrls: Array.isArray(row.media_urls)
    ? row.media_urls.map(String)
    : row.media_urls
      ? JSON.parse(String(row.media_urls))
      : [],
  firstComment: row.first_comment ? String(row.first_comment) : undefined,
  status: isValidStatus(String(row.status)) ? (String(row.status) as CalendarPostStatus) : 'draft',
  metaPostId: row.meta_post_id ? String(row.meta_post_id) : undefined,
  scheduledAt: row.scheduled_at ? String(row.scheduled_at) : undefined,
  publishedAt: row.published_at ? String(row.published_at) : undefined,
  errorLog: row.error_log ? String(row.error_log) : undefined,
  attempts: Number(row.attempts ?? 0),
  metadata: row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : undefined,
  createdAt: row.created_at ? String(row.created_at) : undefined,
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
});

const mapSQLiteRow = (row: Record<string, unknown>): CalendarPost => ({
  id: String(row.id),
  accountId: String(row.account_id),
  format: String(row.format) as CalendarPost['format'],
  caption: row.caption ? String(row.caption) : undefined,
  mediaUrls: row.media_urls ? JSON.parse(String(row.media_urls)) : [],
  firstComment: row.first_comment ? String(row.first_comment) : undefined,
  status: isValidStatus(String(row.status)) ? (String(row.status) as CalendarPostStatus) : 'draft',
  metaPostId: row.meta_post_id ? String(row.meta_post_id) : undefined,
  scheduledAt: row.scheduled_at ? String(row.scheduled_at) : undefined,
  publishedAt: row.published_at ? String(row.published_at) : undefined,
  errorLog: row.error_log ? String(row.error_log) : undefined,
  attempts: Number(row.attempts ?? 0),
  metadata: row.metadata ? JSON.parse(String(row.metadata)) : undefined,
  createdAt: row.created_at ? String(row.created_at) : undefined,
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
});

const useSupabase = (): boolean => isSupabaseAvailable() && isSupabaseServiceRoleAvailable();

export const insertCalendarPost = async (
  post: Omit<CalendarPost, 'id' | 'createdAt' | 'updatedAt' | 'attempts'> & { id?: string },
): Promise<CalendarPost> => {
  const id = post.id ?? randomUUID();
  const now = new Date().toISOString();
  const record: CalendarPost = {
    ...post,
    id,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (useSupabase()) {
    const res = await supabaseInsert(
      'posts',
      {
        id: record.id,
        account_id: record.accountId,
        format: record.format,
        caption: record.caption ?? null,
        media_urls: record.mediaUrls,
        first_comment: record.firstComment ?? null,
        status: record.status,
        meta_post_id: record.metaPostId ?? null,
        scheduled_at: record.scheduledAt ?? null,
        published_at: record.publishedAt ?? null,
        error_log: record.errorLog ?? null,
        attempts: record.attempts,
      },
      true,
    );
    if (!res.ok) {
      throw new Error(`[calendarQueue] insert failed: ${res.error}`);
    }
    return record;
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO posts (id, account_id, format, caption, media_urls, first_comment, status, meta_post_id, scheduled_at, published_at, error_log, attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    record.id,
    record.accountId,
    record.format,
    record.caption ?? null,
    JSON.stringify(record.mediaUrls),
    record.firstComment ?? null,
    record.status,
    record.metaPostId ?? null,
    record.scheduledAt ?? null,
    record.publishedAt ?? null,
    record.errorLog ?? null,
    record.attempts,
    record.createdAt,
    record.updatedAt,
  );
  return record;
};

export const getCalendarPost = async (id: string): Promise<CalendarPost | undefined> => {
  if (useSupabase()) {
    const res = await supabaseQuery<Record<string, unknown>>('posts', {
      filters: [{ column: 'id', op: 'eq', value: id }],
      limit: 1,
      useServiceRole: true,
    });
    if (!res.ok || !res.data?.[0]) return undefined;
    return mapSupabaseRow(res.data[0]);
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return mapSQLiteRow(row);
};

export const listCalendarPostsByAccount = async (
  accountId: string,
  options?: { status?: CalendarPostStatus; from?: string; to?: string; limit?: number },
): Promise<CalendarPost[]> => {
  if (useSupabase()) {
    const filters: QueryFilter[] = [{ column: 'account_id', op: 'eq', value: accountId }];
    if (options?.status) filters.push({ column: 'status', op: 'eq', value: options.status });
    if (options?.from) filters.push({ column: 'scheduled_at', op: 'gte', value: options.from });
    if (options?.to) filters.push({ column: 'scheduled_at', op: 'lte', value: options.to });

    const res = await supabaseQuery<Record<string, unknown>>('posts', {
      filters,
      orderBy: 'scheduled_at',
      orderAsc: true,
      limit: options?.limit ?? 100,
      useServiceRole: true,
    });
    if (!res.ok || !res.data) return [];
    return res.data.map(mapSupabaseRow);
  }

  const db = getDb();
  const conditions = ['account_id = ?'];
  const values: (string | number)[] = [accountId];
  if (options?.status) {
    conditions.push('status = ?');
    values.push(options.status);
  }
  if (options?.from) {
    conditions.push('scheduled_at >= ?');
    values.push(options.from);
  }
  if (options?.to) {
    conditions.push('scheduled_at <= ?');
    values.push(options.to);
  }
  const sql = `SELECT * FROM posts WHERE ${conditions.join(' AND ')} ORDER BY scheduled_at ASC LIMIT ?`;
  values.push(options?.limit ?? 100);
  const rows = db.prepare(sql).all(...values) as Array<Record<string, unknown>>;
  return rows.map(mapSQLiteRow);
};

export const listDueScheduledPosts = async (limit = 50): Promise<CalendarPost[]> => {
  const now = new Date().toISOString();
  if (useSupabase()) {
    const res = await supabaseQuery<Record<string, unknown>>('posts', {
      filters: [
        { column: 'status', op: 'eq', value: 'scheduled' },
        { column: 'scheduled_at', op: 'lte', value: now },
      ],
      orderBy: 'scheduled_at',
      orderAsc: true,
      limit,
      useServiceRole: true,
    });
    if (!res.ok || !res.data) return [];
    return res.data.map(mapSupabaseRow);
  }

  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM posts WHERE status = 'scheduled' AND (scheduled_at IS NULL OR scheduled_at <= ?) ORDER BY scheduled_at ASC LIMIT ?",
    )
    .all(now, limit) as Array<Record<string, unknown>>;
  return rows.map(mapSQLiteRow);
};

export const updateCalendarPost = async (id: string, updates: Partial<CalendarPost>): Promise<void> => {
  const now = new Date().toISOString();

  if (useSupabase()) {
    const payload: Record<string, Json> = { updated_at: now };
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.metaPostId !== undefined) payload.meta_post_id = updates.metaPostId ?? null;
    if (updates.publishedAt !== undefined) payload.published_at = updates.publishedAt ?? null;
    if (updates.caption !== undefined) payload.caption = updates.caption ?? null;
    if (updates.mediaUrls !== undefined) payload.media_urls = updates.mediaUrls;
    if (updates.scheduledAt !== undefined) payload.scheduled_at = updates.scheduledAt ?? null;
    if (updates.errorLog !== undefined) payload.error_log = updates.errorLog ?? null;
    if (updates.attempts !== undefined) payload.attempts = updates.attempts;

    const res = await supabaseUpdate('posts', { id }, payload, true);
    if (!res.ok) {
      throw new Error(`[calendarQueue] update failed: ${res.error}`);
    }
    return;
  }

  const db = getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.metaPostId !== undefined) {
    fields.push('meta_post_id = ?');
    values.push(updates.metaPostId ?? null);
  }
  if (updates.publishedAt !== undefined) {
    fields.push('published_at = ?');
    values.push(updates.publishedAt ?? null);
  }
  if (updates.caption !== undefined) {
    fields.push('caption = ?');
    values.push(updates.caption ?? null);
  }
  if (updates.mediaUrls !== undefined) {
    fields.push('media_urls = ?');
    values.push(JSON.stringify(updates.mediaUrls));
  }
  if (updates.scheduledAt !== undefined) {
    fields.push('scheduled_at = ?');
    values.push(updates.scheduledAt ?? null);
  }
  if (updates.errorLog !== undefined) {
    fields.push('error_log = ?');
    values.push(updates.errorLog ?? null);
  }
  if (updates.attempts !== undefined) {
    fields.push('attempts = ?');
    values.push(updates.attempts);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
};

export const markPublishing = async (id: string): Promise<void> => {
  await updateCalendarPost(id, { status: 'publishing' });
};

export const markPublished = async (id: string, metaPostId: string): Promise<void> => {
  await updateCalendarPost(id, {
    status: 'published',
    metaPostId,
    publishedAt: new Date().toISOString(),
  });
};

export const markFailed = async (id: string, error: string): Promise<void> => {
  const post = await getCalendarPost(id);
  const attempts = (post?.attempts ?? 0) + 1;
  await updateCalendarPost(id, {
    status: attempts >= 3 ? 'failed' : 'scheduled',
    errorLog: error.slice(0, 2000),
    attempts,
  });
  log.warn(`[calendarQueue] Post ${id} falló (intentos=${attempts}): ${error}`);
};

export const cancelCalendarPost = async (id: string): Promise<void> => {
  await updateCalendarPost(id, { status: 'cancelled' });
};
