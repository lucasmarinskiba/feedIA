import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  accountHandle: string;
  platform: 'instagram' | 'tiktok' | 'both';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';
  contentType: 'carousel' | 'reel' | 'story' | 'post' | 'mixed';
  targetAudience?: string;
  hashtags?: string[];
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  scheduleType?: 'once' | 'daily' | 'weekly' | 'monthly';
  contentIds?: string[];
  metrics?: {
    impressions?: number;
    reaches?: number;
    engagement?: number;
    clicks?: number;
    saves?: number;
    shares?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignCreateRequest {
  name: string;
  description?: string;
  accountHandle: string;
  platform: 'instagram' | 'tiktok' | 'both';
  contentType: 'carousel' | 'reel' | 'story' | 'post' | 'mixed';
  targetAudience?: string;
  hashtags?: string[];
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  scheduleType?: 'once' | 'daily' | 'weekly' | 'monthly';
}

export interface CampaignUpdateRequest {
  name?: string;
  description?: string;
  status?: Campaign['status'];
  targetAudience?: string;
  hashtags?: string[];
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  scheduleType?: 'once' | 'daily' | 'weekly' | 'monthly';
}

export const campaignService = {
  async createCampaign(req: CampaignCreateRequest): Promise<Campaign> {
    const campaign: Campaign = {
      id: uuid(),
      name: req.name,
      description: req.description,
      accountHandle: req.accountHandle,
      platform: req.platform,
      status: 'draft',
      contentType: req.contentType,
      targetAudience: req.targetAudience,
      hashtags: req.hashtags || [],
      budget: req.budget,
      startDate: req.startDate,
      endDate: req.endDate,
      scheduleType: req.scheduleType || 'once',
      contentIds: [],
      metrics: {
        impressions: 0,
        reaches: 0,
        engagement: 0,
        clicks: 0,
        saves: 0,
        shares: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveCampaign(campaign);
    return campaign;
  },

  async updateCampaign(campaignId: string, updates: CampaignUpdateRequest): Promise<Campaign> {
    const campaign = await this.loadCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const updated: Campaign = {
      ...campaign,
      ...updates,
      updatedAt: new Date(),
    };

    await this.saveCampaign(updated);
    return updated;
  },

  async deleteCampaign(campaignId: string): Promise<void> {
    const path = `/data/campaigns/${campaignId}.json`;
    try {
      await fs.unlink(path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  },

  async listCampaigns(accountHandle?: string): Promise<Campaign[]> {
    const dirPath = '/data/campaigns';
    try {
      const files = await fs.readdir(dirPath);
      const campaigns: Campaign[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const campaign = await this.loadCampaign(file.replace('.json', ''));
        if (campaign && (!accountHandle || campaign.accountHandle === accountHandle)) {
          campaigns.push(campaign);
        }
      }

      return campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  },

  async loadCampaign(campaignId: string): Promise<Campaign | null> {
    const path = `/data/campaigns/${campaignId}.json`;
    try {
      const data = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(data) as Campaign;
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  },

  async saveCampaign(campaign: Campaign): Promise<void> {
    const dirPath = '/data/campaigns';
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }

    const path = `${dirPath}/${campaign.id}.json`;
    await fs.writeFile(path, JSON.stringify(campaign, null, 2));
  },

  async addContentToCampaign(campaignId: string, contentId: string): Promise<Campaign> {
    const campaign = await this.loadCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (!campaign.contentIds) {
      campaign.contentIds = [];
    }

    if (!campaign.contentIds.includes(contentId)) {
      campaign.contentIds.push(contentId);
      campaign.updatedAt = new Date();
      await this.saveCampaign(campaign);
    }

    return campaign;
  },

  async removeContentFromCampaign(campaignId: string, contentId: string): Promise<Campaign> {
    const campaign = await this.loadCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.contentIds) {
      campaign.contentIds = campaign.contentIds.filter((id) => id !== contentId);
      campaign.updatedAt = new Date();
      await this.saveCampaign(campaign);
    }

    return campaign;
  },

  async updateMetrics(
    campaignId: string,
    metrics: Partial<Campaign['metrics']>
  ): Promise<Campaign> {
    const campaign = await this.loadCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (!campaign.metrics) {
      campaign.metrics = {};
    }

    campaign.metrics = { ...campaign.metrics, ...metrics };
    campaign.updatedAt = new Date();
    await this.saveCampaign(campaign);

    return campaign;
  },

  async scheduleCampaign(
    campaignId: string,
    startDate: Date,
    endDate?: Date
  ): Promise<Campaign> {
    const campaign = await this.loadCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    campaign.status = 'scheduled';
    campaign.startDate = startDate;
    campaign.endDate = endDate;
    campaign.updatedAt = new Date();
    await this.saveCampaign(campaign);

    return campaign;
  },
};
