import { getDb } from './db.js';

export interface AuditLogEntry {
  actor: string;
  action: string;
  target?: string;
  result?: string;
  reason?: string;
  metadata?: string;
}

export const insertAuditLog = (entry: AuditLogEntry): void => {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO audit_log (actor, action, target, result, reason, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    entry.actor,
    entry.action,
    entry.target ?? null,
    entry.result ?? null,
    entry.reason ?? null,
    entry.metadata ?? null,
  );
};

export const listAuditLogs = (
  action?: string,
  limit = 100,
): Array<AuditLogEntry & { id: number; createdAt: string }> => {
  const db = getDb();
  let sql = 'SELECT * FROM audit_log';
  const params: string[] = [];
  if (action) {
    sql += ' WHERE action = ?';
    params.push(action);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(String(limit));

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: Number(row.id),
    actor: String(row.actor),
    action: String(row.action),
    target: row.target ? String(row.target) : undefined,
    result: row.result ? String(row.result) : undefined,
    reason: row.reason ? String(row.reason) : undefined,
    metadata: row.metadata ? String(row.metadata) : undefined,
    createdAt: String(row.created_at),
  }));
};
