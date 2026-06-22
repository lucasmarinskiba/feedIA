/**
 * Revenue Attribution — Atribución de ingresos por canal, campaña y contenido
 * Identifica qué contenido y qué canal generan más ingresos.
 */

import { log } from '../agent/logger.js';

export interface ContentAttribution {
  contentId: string;
  contentType: string;
  platform: string;
  revenue: number;
  spend: number;
  roas: number;
  conversions: number;
  touchpoints: number;
}

export interface ChannelAttribution {
  channel: string;
  revenue: number;
  spend: number;
  roas: number;
  conversions: number;
  ltv: number;
  cac: number;
}

export interface AttributionReport {
  periodDays: number;
  totalRevenue: number;
  totalSpend: number;
  overallRoas: number;
  totalConversions: number;
  channels: ChannelAttribution[];
  topContent: ContentAttribution[];
  funnelStages: Array<{ stage: string; attributedRevenue: number; conversionRate: number }>;
}

const STORAGE_KEY = 'revenue_attribution';

interface StoredRecord {
  contentId: string;
  contentType: string;
  platform: string;
  channel: string;
  revenue: number;
  spend: number;
  conversions: number;
  touchpoints: number;
  timestamp: string;
  funnelStage: string;
}

const loadRecords = (): StoredRecord[] => {
  try {
    const raw = process.env[STORAGE_KEY];
    return raw ? (JSON.parse(raw) as StoredRecord[]) : [];
  } catch {
    return [];
  }
};

const saveRecords = (records: StoredRecord[]): void => {
  process.env[STORAGE_KEY] = JSON.stringify(records);
};

let cache: StoredRecord[] | null = null;
const getRecords = (): StoredRecord[] => {
  if (!cache) cache = loadRecords();
  return cache;
};
const setRecords = (records: StoredRecord[]): void => {
  cache = records;
  saveRecords(records);
};

export const recordAttribution = (opts: {
  contentId: string;
  contentType: string;
  platform: string;
  channel: string;
  revenue?: number;
  spend?: number;
  conversions?: number;
  touchpoints?: number;
  funnelStage?: string;
}): void => {
  const record: StoredRecord = {
    contentId: opts.contentId,
    contentType: opts.contentType,
    platform: opts.platform,
    channel: opts.channel,
    revenue: opts.revenue ?? 0,
    spend: opts.spend ?? 0,
    conversions: opts.conversions ?? 0,
    touchpoints: opts.touchpoints ?? 1,
    timestamp: new Date().toISOString(),
    funnelStage: opts.funnelStage ?? 'awareness',
  };
  const records = getRecords();
  records.push(record);
  setRecords(records);
  log.info(`[Attribution] ${opts.contentId} → $${record.revenue} (${opts.channel})`);
};

export const getAttributionReport = (periodDays = 7): AttributionReport => {
  const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const records = getRecords().filter((r) => r.timestamp >= cutoff);

  const totalRevenue = records.reduce((s, r) => s + r.revenue, 0);
  const totalSpend = records.reduce((s, r) => s + r.spend, 0);
  const totalConversions = records.reduce((s, r) => s + r.conversions, 0);

  // Agrupar por canal
  const channelMap = new Map<string, StoredRecord[]>();
  for (const r of records) {
    const arr = channelMap.get(r.channel) ?? [];
    arr.push(r);
    channelMap.set(r.channel, arr);
  }

  const channels: ChannelAttribution[] = Array.from(channelMap.entries()).map(([channel, rs]) => {
    const rev = rs.reduce((s, r) => s + r.revenue, 0);
    const sp = rs.reduce((s, r) => s + r.spend, 0);
    const conv = rs.reduce((s, r) => s + r.conversions, 0);
    return {
      channel,
      revenue: rev,
      spend: sp,
      roas: sp > 0 ? rev / sp : 0,
      conversions: conv,
      ltv: conv > 0 ? rev / conv : 0,
      cac: conv > 0 ? sp / conv : 0,
    };
  });

  // Agrupar por contenido
  const contentMap = new Map<string, StoredRecord[]>();
  for (const r of records) {
    const key = `${r.contentId}|${r.platform}`;
    const arr = contentMap.get(key) ?? [];
    arr.push(r);
    contentMap.set(key, arr);
  }

  const topContent: ContentAttribution[] = Array.from(contentMap.entries())
    .map(([key, rs]) => {
      const [contentId, platform] = key.split('|');
      const rev = rs.reduce((s, r) => s + r.revenue, 0);
      const sp = rs.reduce((s, r) => s + r.spend, 0);
      const conv = rs.reduce((s, r) => s + r.conversions, 0);
      const touch = rs.reduce((s, r) => s + r.touchpoints, 0);
      return {
        contentId: contentId!,
        contentType: rs[0]?.contentType ?? 'unknown',
        platform: platform!,
        revenue: rev,
        spend: sp,
        roas: sp > 0 ? rev / sp : 0,
        conversions: conv,
        touchpoints: touch,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Funnel stages
  const funnelStages = ['awareness', 'interest', 'decision', 'action', 'retention'];
  const funnel = funnelStages.map((stage) => {
    const rs = records.filter((r) => r.funnelStage === stage);
    const rev = rs.reduce((s, r) => s + r.revenue, 0);
    return {
      stage,
      attributedRevenue: rev,
      conversionRate: records.filter((r) => r.funnelStage === stage).length / (records.length || 1),
    };
  });

  return {
    periodDays,
    totalRevenue,
    totalSpend,
    overallRoas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    totalConversions,
    channels,
    topContent,
    funnelStages: funnel,
  };
};

export const getContentAttribution = (limit = 10): ContentAttribution[] => {
  const report = getAttributionReport(30);
  return report.topContent.slice(0, limit);
};

export const getChannelComparison = (): ChannelAttribution[] => {
  const report = getAttributionReport(30);
  return report.channels.sort((a, b) => b.roas - a.roas);
};

export const getLTVByChannel = (): Array<{ channel: string; ltv: number; cac: number; ratio: number }> => {
  const report = getAttributionReport(90);
  return report.channels
    .map((c) => ({
      channel: c.channel,
      ltv: c.ltv,
      cac: c.cac,
      ratio: c.cac > 0 ? c.ltv / c.cac : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio);
};
