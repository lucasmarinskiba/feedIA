import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';

export interface AdCampaign {
  id: string;
  platform: 'meta' | 'tiktok';
  ad_account_id: string;
  name: string;
  budget: number;
  status: 'active' | 'paused' | 'completed' | 'draft';
  start_date: Date;
  end_date?: Date;
  target_audience?: {
    age_min?: number;
    age_max?: number;
    interests?: string[];
    locations?: string[];
    demographics?: string;
  };
  creatives: AdCreative[];
  performance: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
  lastUpdated: Date;
  createdAt: Date;
}

export interface AdCreative {
  id: string;
  type: 'image' | 'video' | 'carousel';
  content_id: string;
  headline: string;
  description?: string;
  cta: string;
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
}

export interface AdInsight {
  timestamp: Date;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  engagement: number;
}

export const adPerformanceService = {
  async createAdCampaign(data: Omit<AdCampaign, 'id' | 'createdAt' | 'lastUpdated'>): Promise<AdCampaign> {
    const campaign: AdCampaign = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    await this.saveCampaign(campaign);
    return campaign;
  },

  async updateAdCampaign(id: string, updates: Partial<AdCampaign>): Promise<AdCampaign> {
    const campaign = await this.loadCampaign(id);
    if (!campaign) throw new Error(`Ad campaign ${id} not found`);

    const updated: AdCampaign = {
      ...campaign,
      ...updates,
      lastUpdated: new Date(),
    };

    await this.saveCampaign(updated);
    return updated;
  },

  async loadCampaign(id: string): Promise<AdCampaign | null> {
    const path = `/data/ad-campaigns/${id}.json`;

    try {
      const data = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(data) as AdCampaign;
      return {
        ...parsed,
        start_date: new Date(parsed.start_date),
        end_date: parsed.end_date ? new Date(parsed.end_date) : undefined,
        lastUpdated: new Date(parsed.lastUpdated),
        createdAt: new Date(parsed.createdAt),
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  },

  async saveCampaign(campaign: AdCampaign): Promise<void> {
    const dirPath = '/data/ad-campaigns';

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }

    const path = `${dirPath}/${campaign.id}.json`;
    await fs.writeFile(path, JSON.stringify(campaign, null, 2));
  },

  async listCampaigns(accountId: string, status?: AdCampaign['status']): Promise<AdCampaign[]> {
    const dirPath = '/data/ad-campaigns';

    try {
      const files = await fs.readdir(dirPath);
      const campaigns: AdCampaign[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const campaign = await this.loadCampaign(file.replace('.json', ''));
        if (campaign && campaign.ad_account_id === accountId && (!status || campaign.status === status)) {
          campaigns.push(campaign);
        }
      }

      return campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  },

  async addCreative(campaignId: string, creative: Omit<AdCreative, 'id'>): Promise<AdCampaign> {
    const campaign = await this.loadCampaign(campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    campaign.creatives.push({
      ...creative,
      id: uuid(),
    });

    campaign.lastUpdated = new Date();
    await this.saveCampaign(campaign);

    return campaign;
  },

  async updateCreativePerformance(
    campaignId: string,
    creativeId: string,
    performance: AdCreative['performance']
  ): Promise<AdCampaign> {
    const campaign = await this.loadCampaign(campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const creative = campaign.creatives.find((c) => c.id === creativeId);
    if (!creative) throw new Error(`Creative ${creativeId} not found`);

    creative.performance = performance;
    campaign.lastUpdated = new Date();
    await this.saveCampaign(campaign);

    return campaign;
  },

  async recordInsight(campaignId: string, insight: Omit<AdInsight, 'timestamp'>): Promise<void> {
    const path = `/data/ad-insights/${campaignId}.json`;
    let insights: AdInsight[] = [];

    try {
      const data = await fs.readFile(path, 'utf-8');
      insights = JSON.parse(data) as AdInsight[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    insights.push({
      ...insight,
      timestamp: new Date(),
    });

    const dirPath = '/data/ad-insights';
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }

    await fs.writeFile(path, JSON.stringify(insights, null, 2));
  },

  async getInsights(campaignId: string, days: number = 30): Promise<AdInsight[]> {
    const path = `/data/ad-insights/${campaignId}.json`;

    try {
      const data = await fs.readFile(path, 'utf-8');
      let insights = JSON.parse(data) as AdInsight[];
      const now = new Date();
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      insights = insights
        .map((i) => ({
          ...i,
          timestamp: new Date(i.timestamp),
        }))
        .filter((i) => i.timestamp >= cutoff);

      return insights.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  },

  async calculateROAS(campaignId: string): Promise<number> {
    const campaign = await this.loadCampaign(campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const spend = campaign.performance.spend || 0;
    const revenue = (campaign.performance.conversions || 0) * 50; // assuming $50 avg value per conversion

    return spend > 0 ? revenue / spend : 0;
  },

  async getBestPerformer(accountId: string): Promise<AdCampaign | null> {
    const campaigns = await this.listCampaigns(accountId, 'active');
    if (campaigns.length === 0) return null;

    return campaigns.reduce((best, curr) => {
      const bestScore = (best.performance.conversions / (best.performance.spend || 1)) * 100;
      const currScore = (curr.performance.conversions / (curr.performance.spend || 1)) * 100;
      return currScore > bestScore ? curr : best;
    });
  },

  async optimizeAds(campaignId: string): Promise<{
    recommendation: string;
    action: string;
  }> {
    const campaign = await this.loadCampaign(campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const ctr = campaign.performance.ctr || 0;
    const cpc = campaign.performance.cpc || 0;
    const roas = campaign.performance.roas || 0;

    if (ctr < 0.5) {
      return {
        recommendation: 'Low CTR. Improve ad creative or targeting.',
        action: 'test-new-creative',
      };
    }

    if (cpc > 5) {
      return {
        recommendation: 'High CPC. Refine audience targeting.',
        action: 'refine-audience',
      };
    }

    if (roas < 2) {
      return {
        recommendation: 'Low ROAS. Reduce budget or improve conversion path.',
        action: 'reduce-budget-or-improve-conversion',
      };
    }

    return {
      recommendation: 'Campaign performing well. Scale budget gradually.',
      action: 'scale-budget',
    };
  },
};
