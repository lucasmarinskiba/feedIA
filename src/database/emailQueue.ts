import { getDb } from './db.js';

export interface EmailQueueRecord {
  id?: number;
  toAddress: string;
  subject: string;
  body: string;
  sent?: number;
  error?: string;
  createdAt?: string;
  sentAt?: string;
}

export const enqueueEmail = (email: Omit<EmailQueueRecord, 'id' | 'createdAt'>): number => {
  const db = getDb();
  const result = db
    .prepare(
      `
    INSERT INTO email_queue (to_address, subject, body, sent, error, created_at)
    VALUES (?, ?, ?, 0, ?, datetime('now'))
  `,
    )
    .run(email.toAddress, email.subject, email.body, email.error ?? null);
  return Number(result.lastInsertRowid);
};

export const markEmailSent = (id: number, error?: string): void => {
  const db = getDb();
  db.prepare("UPDATE email_queue SET sent = ?, error = ?, sent_at = datetime('now') WHERE id = ?").run(
    error ? 0 : 1,
    error ?? null,
    id,
  );
};

export const getPendingEmails = (limit = 50): EmailQueueRecord[] => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM email_queue WHERE sent = 0 ORDER BY created_at LIMIT ?').all(limit) as Array<
    Record<string, unknown>
  >;
  return rows.map((row) => ({
    id: Number(row.id),
    toAddress: String(row.to_address),
    subject: String(row.subject),
    body: String(row.body),
    sent: row.sent ? Number(row.sent) : 0,
    error: row.error ? String(row.error) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
  }));
};
