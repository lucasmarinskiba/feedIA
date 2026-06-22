/**
 * Sales Attribution
 *
 * Rastrea qué post/reel/story generó cada lead y cada venta.
 * Permite calcular ROI por pieza de contenido.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';

const ATTRIBUTION_FILE = resolve('data/runtime/sales-attribution.json');

export interface AttributionRecord {
  leadId: string;
  handle: string;
  contentId: string; // post/reel/story ID
  contentType: 'reel' | 'carrusel' | 'post-imagen' | 'historia' | 'live';
  touchpoint: 'comment' | 'dm' | 'story-reply' | 'profile-visit' | 'link-click';
  attributedRevenue?: number;
  attributedAt: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const loadRecords = (): AttributionRecord[] => {
  if (!existsSync(ATTRIBUTION_FILE)) return [];
  try {
    return JSON.parse(readFileSync(ATTRIBUTION_FILE, 'utf-8')) as AttributionRecord[];
  } catch {
    return [];
  }
};

const saveRecords = (records: AttributionRecord[]): void => {
  ensureDir();
  writeFileSync(ATTRIBUTION_FILE, JSON.stringify(records, null, 2), 'utf-8');
};

export const recordAttribution = (record: Omit<AttributionRecord, 'attributedAt'>): AttributionRecord => {
  const records = loadRecords();
  const fullRecord: AttributionRecord = {
    ...record,
    attributedAt: new Date().toISOString(),
  };
  records.push(fullRecord);
  saveRecords(records);
  log.info(`[Attribution] ${record.handle} → ${record.contentType} ${record.contentId}`);
  return fullRecord;
};

export const attributeRevenue = (leadId: string, revenue: number): void => {
  const records = loadRecords();
  const record = records.find((r) => r.leadId === leadId);
  if (record) {
    record.attributedRevenue = revenue;
    saveRecords(records);
    log.success(`[Attribution] $${revenue} atribuidos a ${record.contentType} ${record.contentId}`);
  }
};

export const getAttributionByContent = (
  contentId: string,
): {
  leads: number;
  revenue: number;
  touchpoints: Record<string, number>;
} => {
  const records = loadRecords().filter((r) => r.contentId === contentId);
  const touchpoints: Record<string, number> = {};
  let revenue = 0;
  for (const r of records) {
    touchpoints[r.touchpoint] = (touchpoints[r.touchpoint] ?? 0) + 1;
    if (r.attributedRevenue) revenue += r.attributedRevenue;
  }
  return { leads: records.length, revenue, touchpoints };
};

export const getTopPerformingContent = (
  limit = 10,
): Array<{
  contentId: string;
  contentType: string;
  leads: number;
  revenue: number;
}> => {
  const records = loadRecords();
  const byContent = new Map<string, { contentType: string; leads: number; revenue: number }>();

  for (const r of records) {
    const existing = byContent.get(r.contentId);
    if (existing) {
      existing.leads += 1;
      if (r.attributedRevenue) existing.revenue += r.attributedRevenue;
    } else {
      byContent.set(r.contentId, {
        contentType: r.contentType,
        leads: 1,
        revenue: r.attributedRevenue ?? 0,
      });
    }
  }

  return Array.from(byContent.entries())
    .map(([contentId, data]) => ({ contentId, ...data }))
    .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads)
    .slice(0, limit);
};

export const getAttributionStats = (): {
  totalLeadsAttributed: number;
  totalRevenue: number;
  avgRevenuePerLead: number;
  topContentType: string;
} => {
  const records = loadRecords();
  const totalLeads = records.length;
  const totalRevenue = records.reduce((s, r) => s + (r.attributedRevenue ?? 0), 0);
  const avgRevenue = totalLeads > 0 ? totalRevenue / totalLeads : 0;

  const byType = new Map<string, number>();
  for (const r of records) {
    byType.set(r.contentType, (byType.get(r.contentType) ?? 0) + 1);
  }
  const topContentType = Array.from(byType.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'ninguno';

  return { totalLeadsAttributed: totalLeads, totalRevenue, avgRevenuePerLead: avgRevenue, topContentType };
};
