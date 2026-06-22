/**
 * Playbook execution log for audit and replay.
 */
import { getDb } from './db.js';

export interface PlaybookRun {
  id: number;
  playbook_id: string;
  playbook_type: string;
  brand_id: string | null;
  status: string;
  results: string | null;
  started_at: string;
  ended_at: string | null;
}

export function startPlaybookRun(playbookId: string, playbookType: string, brandId?: string): number {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO playbook_runs (playbook_id, playbook_type, brand_id, status) VALUES (?, ?, ?, 'running')`,
  );
  const res = stmt.run(playbookId, playbookType, brandId ?? null);
  return Number(res.lastInsertRowid);
}

export function finishPlaybookRun(id: number, status: 'completed' | 'failed' | 'partial', results?: unknown): void {
  const db = getDb();
  const stmt = db.prepare(`UPDATE playbook_runs SET status = ?, results = ?, ended_at = datetime('now') WHERE id = ?`);
  stmt.run(status, results ? JSON.stringify(results) : null, id);
}

export function listPlaybookRuns(playbookId?: string, brandId?: string, limit = 20): PlaybookRun[] {
  const db = getDb();
  let sql = `SELECT * FROM playbook_runs WHERE 1=1`;
  const params: (string | number)[] = [];
  if (playbookId) {
    sql += ` AND playbook_id = ?`;
    params.push(playbookId);
  }
  if (brandId) {
    sql += ` AND brand_id = ?`;
    params.push(brandId);
  }
  sql += ` ORDER BY started_at DESC LIMIT ?`;
  params.push(limit);
  return db.prepare(sql).all(...params) as PlaybookRun[];
}
