import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';

export interface Influencer {
  id: string;
  handle: string;
  platform: 'instagram' | 'tiktok';
  name?: string;
  bio?: string;
  followers: number;
  engagement_rate: number;
  niche: string;
  audience_demographics?: {
    age_range?: string;
    gender?: string;
    location?: string;
  };
  contact_email?: string;
  contact_phone?: string;
  average_post_price?: number;
  status: 'prospect' | 'contacted' | 'negotiating' | 'partner' | 'past';
  notes?: string;
  collaborations: Collaboration[];
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Collaboration {
  id: string;
  campaign_id: string;
  content_type: 'post' | 'reel' | 'story' | 'takeover';
  post_date: Date;
  deliverables: string[];
  payment: number;
  performance: {
    reach?: number;
    engagement?: number;
    clicks?: number;
    conversions?: number;
  };
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
}

export const influencerService = {
  async createInfluencer(data: Omit<Influencer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Influencer> {
    const influencer: Influencer = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveInfluencer(influencer);
    return influencer;
  },

  async updateInfluencer(id: string, updates: Partial<Influencer>): Promise<Influencer> {
    const influencer = await this.loadInfluencer(id);
    if (!influencer) throw new Error(`Influencer ${id} not found`);

    const updated: Influencer = {
      ...influencer,
      ...updates,
      updatedAt: new Date(),
    };

    await this.saveInfluencer(updated);
    return updated;
  },

  async deleteInfluencer(id: string): Promise<void> {
    const path = `/data/influencers/${id}.json`;
    try {
      await fs.unlink(path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  },

  async loadInfluencer(id: string): Promise<Influencer | null> {
    const path = `/data/influencers/${id}.json`;

    try {
      const data = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(data) as Influencer;
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        collaborations: parsed.collaborations.map((c) => ({
          ...c,
          post_date: new Date(c.post_date),
        })),
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  },

  async saveInfluencer(influencer: Influencer): Promise<void> {
    const dirPath = '/data/influencers';

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }

    const path = `${dirPath}/${influencer.id}.json`;
    await fs.writeFile(path, JSON.stringify(influencer, null, 2));
  },

  async listInfluencers(status?: Influencer['status'], niche?: string): Promise<Influencer[]> {
    const dirPath = '/data/influencers';

    try {
      const files = await fs.readdir(dirPath);
      const influencers: Influencer[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const inf = await this.loadInfluencer(file.replace('.json', ''));
        if (inf && (!status || inf.status === status) && (!niche || inf.niche === niche)) {
          influencers.push(inf);
        }
      }

      return influencers.sort((a, b) => b.engagement_rate - a.engagement_rate);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  },

  async addCollaboration(influencerId: string, collab: Omit<Collaboration, 'id'>): Promise<Influencer> {
    const influencer = await this.loadInfluencer(influencerId);
    if (!influencer) throw new Error(`Influencer ${influencerId} not found`);

    influencer.collaborations.push({
      ...collab,
      id: uuid(),
    });

    influencer.updatedAt = new Date();
    await this.saveInfluencer(influencer);

    return influencer;
  },

  async updateCollaborationStatus(
    influencerId: string,
    collabId: string,
    status: Collaboration['status']
  ): Promise<Influencer> {
    const influencer = await this.loadInfluencer(influencerId);
    if (!influencer) throw new Error(`Influencer ${influencerId} not found`);

    const collab = influencer.collaborations.find((c) => c.id === collabId);
    if (!collab) throw new Error(`Collaboration ${collabId} not found`);

    collab.status = status;
    influencer.updatedAt = new Date();
    await this.saveInfluencer(influencer);

    return influencer;
  },

  async getInfluencersByNiche(niche: string, minEngagement: number = 1): Promise<Influencer[]> {
    const influencers = await this.listInfluencers(undefined, niche);
    return influencers.filter((i) => i.engagement_rate >= minEngagement);
  },

  async getTopPerformers(limit: number = 10): Promise<Influencer[]> {
    const influencers = await this.listInfluencers('partner');
    return influencers
      .sort((a, b) => {
        const scoreA = a.rating * a.engagement_rate * a.followers;
        const scoreB = b.rating * b.engagement_rate * b.followers;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  },
};
