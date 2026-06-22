/**
 * Video Engine Usage Tracker — persistencia mínima de uso y costos de video IA.
 *
 * Guarda cada generación en `data/runtime/videoUsage.json` (append-only).
 * En producción esto debería migrarse a una tabla SQL/KV; por ahora es
 * suficiente para auditar costos reales y controlar presupuesto.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { log } from '../../agent/logger.js';
import { trackCost } from '../consumption/costAttribution.js';

export interface VideoUsageRecord {
  id: string;
  provider: 'runway' | 'heygen' | 'mock' | 'ffmpeg' | 'none';
  format: string;
  durationSec: number;
  costEstimateUsd: number;
  taskId?: string;
  topic: string;
  brandName: string;
  style?: string;
  createdAt: string;
  success: boolean;
  error?: string;
}

const USAGE_FILE = resolve(process.cwd(), 'data/runtime/videoUsage.json');

const loadRecords = (): VideoUsageRecord[] => {
  if (!existsSync(USAGE_FILE)) return [];
  try {
    const raw = readFileSync(USAGE_FILE, 'utf-8');
    return raw ? (JSON.parse(raw) as VideoUsageRecord[]) : [];
  } catch {
    return [];
  }
};

const saveRecords = (records: VideoUsageRecord[]): void => {
  mkdirSync(dirname(USAGE_FILE), { recursive: true });
  writeFileSync(USAGE_FILE, JSON.stringify(records, null, 2));
};

export const recordVideoUsage = (record: Omit<VideoUsageRecord, 'id' | 'createdAt'>): VideoUsageRecord => {
  const full: VideoUsageRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const records = loadRecords();
  records.push(full);
  saveRecords(records);
  log.info(`[VideoUsage] ${full.provider} $${full.costEstimateUsd.toFixed(3)} · ${full.topic.slice(0, 40)}`);
  trackCost({
    model: full.provider,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: full.costEstimateUsd,
    workflow: 'brief-to-publish',
    agent: 'videoProducer',
    feature: 'video-ia',
    metadata: { format: full.format, durationSec: full.durationSec, topic: full.topic, brandName: full.brandName, style: full.style },
  });
  return full;
};

export const getVideoUsage = (filters?: {
  provider?: VideoUsageRecord['provider'];
  since?: string;
  brandName?: string;
}): VideoUsageRecord[] => {
  let records = loadRecords();
  if (filters?.provider) records = records.filter((r) => r.provider === filters.provider);
  if (filters?.brandName) records = records.filter((r) => r.brandName === filters.brandName);
  if (filters?.since) {
    const since = new Date(filters.since).getTime();
    records = records.filter((r) => new Date(r.createdAt).getTime() >= since);
  }
  return records;
};

export const getTotalVideoCostUsd = (filters?: { brandName?: string; since?: string }): number => {
  return getVideoUsage(filters).reduce((sum, r) => sum + r.costEstimateUsd, 0);
};
