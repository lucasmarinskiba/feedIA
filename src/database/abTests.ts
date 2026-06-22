import { getDb } from './db.js';

export interface ABTestRecord {
  id: string;
  accountId: string;
  name: string;
  hypothesis?: string;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  variants?: Array<{
    id: string;
    name: string;
    contentId?: string;
    postId?: string;
    impressions: number;
    engagements: number;
    conversions: number;
  }>;
  winner?: string;
  confidence?: number;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const insertABTest = (test: ABTestRecord): void => {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO ab_tests (id, account_id, name, hypothesis, status, variants, winner, confidence, started_at, ended_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `,
  ).run(
    test.id,
    test.accountId,
    test.name,
    test.hypothesis ?? null,
    test.status,
    test.variants ? JSON.stringify(test.variants) : null,
    test.winner ?? null,
    test.confidence ?? null,
    test.startedAt ?? null,
    test.endedAt ?? null,
  );
};

export const updateABTest = (id: string, updates: Partial<ABTestRecord>): void => {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.variants !== undefined) {
    fields.push('variants = ?');
    values.push(JSON.stringify(updates.variants));
  }
  if (updates.winner !== undefined) {
    fields.push('winner = ?');
    values.push(updates.winner);
  }
  if (updates.confidence !== undefined) {
    fields.push('confidence = ?');
    values.push(updates.confidence);
  }
  if (updates.endedAt !== undefined) {
    fields.push('ended_at = ?');
    values.push(updates.endedAt);
  }

  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE ab_tests SET ${fields.join(', ')} WHERE id = ?`).run(...values);
};

export const getABTest = (id: string): ABTestRecord | undefined => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM ab_tests WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return rowToTest(row);
};

export const listABTestsByAccount = (accountId: string): ABTestRecord[] => {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM ab_tests WHERE account_id = ? ORDER BY created_at DESC')
    .all(accountId) as Array<Record<string, unknown>>;
  return rows.map(rowToTest);
};

function rowToTest(row: Record<string, unknown>): ABTestRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    name: String(row.name),
    hypothesis: row.hypothesis ? String(row.hypothesis) : undefined,
    status: String(row.status) as ABTestRecord['status'],
    variants: row.variants ? JSON.parse(String(row.variants)) : undefined,
    winner: row.winner ? String(row.winner) : undefined,
    confidence: row.confidence ? Number(row.confidence) : undefined,
    startedAt: row.started_at ? String(row.started_at) : undefined,
    endedAt: row.ended_at ? String(row.ended_at) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}
