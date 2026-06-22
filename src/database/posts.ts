import { getDb } from './db.js';

export interface PostRecord {
  id: string;
  accountId: string;
  format: string;
  caption?: string;
  mediaUrls?: string[];
  firstComment?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  metaPostId?: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const insertPost = (post: PostRecord): void => {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO posts (id, account_id, format, caption, media_urls, first_comment, status, meta_post_id, scheduled_at, published_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `,
  ).run(
    post.id,
    post.accountId,
    post.format,
    post.caption ?? null,
    post.mediaUrls ? JSON.stringify(post.mediaUrls) : null,
    post.firstComment ?? null,
    post.status,
    post.metaPostId ?? null,
    post.scheduledAt ?? null,
    post.publishedAt ?? null,
  );
};

export const updatePost = (id: string, updates: Partial<PostRecord>): void => {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.metaPostId !== undefined) {
    fields.push('meta_post_id = ?');
    values.push(updates.metaPostId);
  }
  if (updates.publishedAt !== undefined) {
    fields.push('published_at = ?');
    values.push(updates.publishedAt);
  }
  if (updates.caption !== undefined) {
    fields.push('caption = ?');
    values.push(updates.caption);
  }
  if (updates.mediaUrls !== undefined) {
    fields.push('media_urls = ?');
    values.push(JSON.stringify(updates.mediaUrls));
  }
  if (updates.scheduledAt !== undefined) {
    fields.push('scheduled_at = ?');
    values.push(updates.scheduledAt);
  }

  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
};

export const getPost = (id: string): PostRecord | undefined => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return rowToPost(row);
};

export const listPostsByAccount = (accountId: string, status?: string): PostRecord[] => {
  const db = getDb();
  const sql = status
    ? 'SELECT * FROM posts WHERE account_id = ? AND status = ? ORDER BY created_at DESC'
    : 'SELECT * FROM posts WHERE account_id = ? ORDER BY created_at DESC';
  const rows = status
    ? (db.prepare(sql).all(accountId, status) as Array<Record<string, unknown>>)
    : (db.prepare(sql).all(accountId) as Array<Record<string, unknown>>);
  return rows.map(rowToPost);
};

function rowToPost(row: Record<string, unknown>): PostRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    format: String(row.format),
    caption: row.caption ? String(row.caption) : undefined,
    mediaUrls: row.media_urls ? JSON.parse(String(row.media_urls)) : undefined,
    firstComment: row.first_comment ? String(row.first_comment) : undefined,
    status: String(row.status) as PostRecord['status'],
    metaPostId: row.meta_post_id ? String(row.meta_post_id) : undefined,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : undefined,
    publishedAt: row.published_at ? String(row.published_at) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}
