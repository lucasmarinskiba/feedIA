/**
 * Durable event queue backed by SQLite.
 * Used by the trigger system for production-grade event processing.
 */
import { getDb } from './db.js';

export interface EventQueueEntry {
  id: number;
  event_type: string;
  payload: string;
  brand_id: string | null;
  processed: number;
  processed_at: string | null;
  handler_result: string | null;
  error: string | null;
  created_at: string;
}

export function enqueueEvent(eventType: string, payload: unknown, brandId?: string): number {
  const db = getDb();
  const stmt = db.prepare(`INSERT INTO event_queue (event_type, payload, brand_id) VALUES (?, ?, ?)`);
  const res = stmt.run(eventType, JSON.stringify(payload), brandId ?? null);
  return Number(res.lastInsertRowid);
}

export function dequeueEvents(limit = 50): EventQueueEntry[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM event_queue WHERE processed = 0 ORDER BY created_at ASC LIMIT ?`);
  return stmt.all(limit) as EventQueueEntry[];
}

export function markEventProcessed(id: number, result?: string, error?: string): void {
  const db = getDb();
  const stmt = db.prepare(
    `UPDATE event_queue SET processed = 1, processed_at = datetime('now'), handler_result = ?, error = ? WHERE id = ?`,
  );
  stmt.run(result ?? null, error ?? null, id);
}

export function getUnprocessedCount(): number {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) as c FROM event_queue WHERE processed = 0`).get() as { c: number };
  return row.c;
}

export function pruneProcessedEvents(olderThanHours = 48): number {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM event_queue WHERE processed = 1 AND created_at < datetime('now', ?)`);
  const res = stmt.run(`-${olderThanHours} hours`);
  return res.changes;
}
