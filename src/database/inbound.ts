import { getDb } from './db.js';

export interface InboundMessageRecord {
  id: string;
  accountId: string;
  type: 'dm' | 'comentario' | 'mencion';
  sender: string;
  text?: string;
  metaCommentId?: string;
  metaPostId?: string;
  replied?: number;
  replyText?: string;
  receivedAt?: string;
}

export const insertInbound = (msg: InboundMessageRecord): void => {
  const db = getDb();
  db.prepare(
    `
    INSERT OR IGNORE INTO inbound_messages (id, account_id, type, sender, text, meta_comment_id, meta_post_id, replied, reply_text, received_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `,
  ).run(
    msg.id,
    msg.accountId,
    msg.type,
    msg.sender,
    msg.text ?? null,
    msg.metaCommentId ?? null,
    msg.metaPostId ?? null,
    msg.replied ?? 0,
    msg.replyText ?? null,
    msg.receivedAt ?? null,
  );
};

export const markReplied = (id: string, replyText: string): void => {
  const db = getDb();
  db.prepare('UPDATE inbound_messages SET replied = 1, reply_text = ? WHERE id = ?').run(replyText, id);
};

export const listInbound = (accountId: string, type?: string, since?: string): InboundMessageRecord[] => {
  const db = getDb();
  let sql = 'SELECT * FROM inbound_messages WHERE account_id = ?';
  const params: (string | number)[] = [accountId];
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (since) {
    sql += ' AND received_at >= ?';
    params.push(since);
  }
  sql += ' ORDER BY received_at DESC';
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    accountId: String(row.account_id),
    type: String(row.type) as InboundMessageRecord['type'],
    sender: String(row.sender),
    text: row.text ? String(row.text) : undefined,
    metaCommentId: row.meta_comment_id ? String(row.meta_comment_id) : undefined,
    metaPostId: row.meta_post_id ? String(row.meta_post_id) : undefined,
    replied: row.replied ? Number(row.replied) : 0,
    replyText: row.reply_text ? String(row.reply_text) : undefined,
    receivedAt: row.received_at ? String(row.received_at) : undefined,
  }));
};
