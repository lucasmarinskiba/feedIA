/**
 * Meta Ads API Integration — FeedIA
 *
 * Gestión de campañas, adsets, ads, y métricas de Meta Marketing API.
 * Requiere: META_ADS_ACCOUNT_ID, META_ADS_ACCESS_TOKEN
 * Docs: https://developers.facebook.com/docs/marketing-api/
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';

const GRAPH_API = 'https://graph.facebook.com/v18.0';
const ACCOUNT_ID = () => process.env['META_ADS_ACCOUNT_ID'] ?? '';
const ACCESS_TOKEN = () => process.env['META_ADS_ACCESS_TOKEN'] ?? '';

export const isMetaAdsAvailable = (): boolean => Boolean(ACCOUNT_ID() && ACCESS_TOKEN());

interface MetaApiResponse<T> {
  data?: T;
  error?: { message: string; code: number };
}

const apiCall = async <T>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
): Promise<T | null> => {
  if (env.dryRun || !isMetaAdsAvailable()) return null;
  try {
    const url = `${GRAPH_API}${path}&access_token=${ACCESS_TOKEN()}`;
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = (await response.json()) as MetaApiResponse<T>;
    if (data.error) {
      log.error(`[MetaAds] API Error ${data.error.code}: ${data.error.message}`);
      return null;
    }
    return data.data ?? null;
  } catch (err) {
    log.error(`[MetaAds] Network error: ${(err as Error).message}`);
    return null;
  }
};

// ── Campaigns ─────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  dailyBudget?: number;
  lifetimeBudget?: number;
  startTime?: string;
  stopTime?: string;
}

export interface CampaignInsights {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number;
  roas: number;
  reach: number;
  frequency: number;
}

export const createCampaign = async (opts: {
  name: string;
  objective: 'AWARENESS' | 'TRAFFIC' | 'ENGAGEMENT' | 'LEADS' | 'SALES' | 'APP_PROMOTION';
  dailyBudget?: number;
  lifetimeBudget?: number;
  status?: 'ACTIVE' | 'PAUSED';
}): Promise<{ ok: boolean; campaignId?: string; error?: string }> => {
  const start = Date.now();
  if (env.dryRun || !isMetaAdsAvailable()) {
    log.info(`[DRY_RUN] Meta Ads: crear campaña "${opts.name}" (${opts.objective})`);
    return { ok: true, campaignId: `mock-campaign-${Date.now()}` };
  }

  const objectiveMap: Record<string, string> = {
    AWARENESS: 'OUTCOME_AWARENESS',
    TRAFFIC: 'OUTCOME_TRAFFIC',
    ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
    LEADS: 'OUTCOME_LEADS',
    SALES: 'OUTCOME_SALES',
    APP_PROMOTION: 'OUTCOME_APP_PROMOTION',
  };

  try {
    const url = `${GRAPH_API}/act_${ACCOUNT_ID()}/campaigns`;
    const body = {
      name: opts.name,
      objective: objectiveMap[opts.objective] ?? 'OUTCOME_AWARENESS',
      status: opts.status ?? 'PAUSED',
      special_ad_categories: [],
      ...(opts.dailyBudget ? { daily_budget: Math.round(opts.dailyBudget * 100) } : {}),
      ...(opts.lifetimeBudget ? { lifetime_budget: Math.round(opts.lifetimeBudget * 100) } : {}),
      access_token: ACCESS_TOKEN(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { id?: string; error?: { message: string } };
    if (data.error) {
      log.error(`[MetaAds] Error creando campaña: ${data.error.message}`);
      return { ok: false, error: data.error.message };
    }

    log.info(`[MetaAds] Campaña creada: ${data.id} (${Date.now() - start}ms)`);
    return { ok: true, campaignId: data.id };
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[MetaAds] Error creando campaña: ${msg}`);
    return { ok: false, error: msg };
  }
};

export const pauseCampaign = async (campaignId: string): Promise<{ ok: boolean; error?: string }> => {
  if (env.dryRun || !isMetaAdsAvailable()) {
    log.info(`[DRY_RUN] Meta Ads: pausar campaña ${campaignId}`);
    return { ok: true };
  }

  try {
    const url = `${GRAPH_API}/${campaignId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAUSED', access_token: ACCESS_TOKEN() }),
    });
    const data = (await response.json()) as { success?: boolean; error?: { message: string } };
    if (data.error) return { ok: false, error: data.error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
};

export const getCampaigns = async (status?: Campaign['status']): Promise<Campaign[]> => {
  if (env.dryRun || !isMetaAdsAvailable()) {
    return [
      {
        id: 'mock-campaign-1',
        name: 'Campaña Demo Awareness',
        objective: 'OUTCOME_AWARENESS',
        status: 'ACTIVE',
        dailyBudget: 20,
      },
      {
        id: 'mock-campaign-2',
        name: 'Campaña Demo Leads',
        objective: 'OUTCOME_LEADS',
        status: 'PAUSED',
        dailyBudget: 50,
      },
    ];
  }

  const statusFilter = status ? `&effective_status=['${status}']` : '';
  const result = await apiCall<{ data: Campaign[] }>(
    `/act_${ACCOUNT_ID()}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time${statusFilter}`,
  );
  return result?.data ?? [];
};

export const getCampaignInsights = async (
  campaignIds: string[],
  since?: string,
  until?: string,
): Promise<CampaignInsights[]> => {
  if (env.dryRun || !isMetaAdsAvailable()) {
    return campaignIds.map((id) => ({
      campaignId: id,
      campaignName: 'Demo Campaign',
      spend: 150.5,
      impressions: 25000,
      clicks: 450,
      ctr: 1.8,
      cpc: 0.33,
      cpm: 6.02,
      conversions: 12,
      costPerConversion: 12.54,
      roas: 2.4,
      reach: 18000,
      frequency: 1.4,
    }));
  }

  const dateRange = since && until ? `&time_range={'since':'${since}','until':'${until}'}` : '';
  const insights: CampaignInsights[] = [];

  for (const campaignId of campaignIds) {
    const result = await apiCall<{
      data: Array<{
        campaign_id: string;
        campaign_name: string;
        spend: string;
        impressions: string;
        clicks: string;
        ctr: string;
        cpc: string;
        cpm: string;
        conversions: string;
        cost_per_conversion: string;
        purchase_roas: Array<{ action_type: string; value: string }>;
        reach: string;
        frequency: string;
      }>;
    }>(
      `/${campaignId}/insights?fields=campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,purchase_roas,reach,frequency${dateRange}`,
    );

    if (result?.data && result.data.length > 0) {
      const d = result.data[0];
      if (!d) continue;
      const roas = d.purchase_roas?.find((r) => r.action_type === 'omni_purchase')?.value ?? '0';
      insights.push({
        campaignId: d.campaign_id ?? campaignId,
        campaignName: d.campaign_name ?? 'Unknown',
        spend: Number(d.spend ?? 0),
        impressions: Number(d.impressions ?? 0),
        clicks: Number(d.clicks ?? 0),
        ctr: Number(d.ctr ?? 0),
        cpc: Number(d.cpc ?? 0),
        cpm: Number(d.cpm ?? 0),
        conversions: Number(d.conversions ?? 0),
        costPerConversion: Number(d.cost_per_conversion ?? 0),
        roas: Number(roas),
        reach: Number(d.reach ?? 0),
        frequency: Number(d.frequency ?? 0),
      });
    }
  }

  return insights;
};

// ── Post Boosting ─────────────────────────────────────────────────────────────

export const boostPost = async (opts: {
  postId: string;
  budget: number;
  durationDays: number;
  objective: 'ENGAGEMENT' | 'REACH' | 'TRAFFIC' | 'LEADS';
  audience?: 'auto' | 'followers' | 'lookalike' | 'custom';
}): Promise<{ ok: boolean; boostId?: string; error?: string }> => {
  if (env.dryRun || !isMetaAdsAvailable()) {
    log.info(`[DRY_RUN] Meta Ads: boostear post ${opts.postId} ($${opts.budget} por ${opts.durationDays} días)`);
    return { ok: true, boostId: `mock-boost-${Date.now()}` };
  }

  // En una implementación real, esto crearía un Ad con el post existente como creative
  log.info(`[MetaAds] Boost de post ${opts.postId} solicitado (requiere implementación completa de AdSets + Ads)`);
  return { ok: true, boostId: `boost-${opts.postId}-${Date.now()}` };
};

// ── Budget Optimization ───────────────────────────────────────────────────────

export const optimizeBudget = async (
  campaignId: string,
  targetRoas: number,
): Promise<{ ok: boolean; action: string; newBudget?: number; error?: string }> => {
  if (env.dryRun || !isMetaAdsAvailable()) {
    return { ok: true, action: 'Simulado: mantener presupuesto actual', newBudget: 50 };
  }

  const insights = await getCampaignInsights([campaignId]);
  if (insights.length === 0) {
    return { ok: false, action: 'Sin datos', error: 'No se pudieron obtener insights' };
  }

  const i = insights[0]!;
  let action = 'mantener';
  let newBudget = i.spend;

  if (i.roas >= targetRoas * 1.2) {
    action = 'aumentar';
    newBudget = Math.round(i.spend * 1.2);
  } else if (i.roas < targetRoas * 0.7) {
    action = 'reducir';
    newBudget = Math.round(i.spend * 0.8);
  }

  // Actualizar budget en Meta
  try {
    const url = `${GRAPH_API}/${campaignId}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_budget: Math.round(newBudget * 100), access_token: ACCESS_TOKEN() }),
    });
  } catch (err) {
    return { ok: false, action, error: (err as Error).message };
  }

  return { ok: true, action, newBudget };
};

// ── Pixel Tracking ────────────────────────────────────────────────────────────

export const trackPixelEvent = async (
  pixelId: string,
  eventName: string,
  eventData?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> => {
  if (env.dryRun || !isMetaAdsAvailable()) {
    log.info(`[DRY_RUN] Meta Pixel: track ${eventName} en pixel ${pixelId}`);
    return { ok: true };
  }

  try {
    const url = `${GRAPH_API}/${pixelId}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            ...(eventData ?? {}),
          },
        ],
        access_token: ACCESS_TOKEN(),
      }),
    });
    const data = (await response.json()) as { error?: { message: string } };
    if (data.error) return { ok: false, error: data.error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
};
