import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';

export interface GrowthStrategy {
  id: string;
  accountHandle: string;
  platform: 'instagram' | 'tiktok';
  status: 'draft' | 'active' | 'paused' | 'completed';
  strategies: StrategyItem[];
  metrics: {
    projectedGrowth?: number;
    projectedEngagementRate?: number;
    expectedContentPerformance?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyItem {
  id: string;
  type:
    | 'content-focus'
    | 'posting-schedule'
    | 'hashtag-strategy'
    | 'engagement-loop'
    | 'collab-opportunity'
    | 'niche-pivot';
  priority: 'high' | 'medium' | 'low';
  description: string;
  actionItems: string[];
  expectedImpact?: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface GrowthRecommendation {
  category: string;
  recommendation: string;
  rationale: string;
  expectedImpact: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
}

export const growthStrategyService = {
  async createStrategy(
    accountHandle: string,
    platform: 'instagram' | 'tiktok'
  ): Promise<GrowthStrategy> {
    const strategy: GrowthStrategy = {
      id: uuid(),
      accountHandle,
      platform,
      status: 'draft',
      strategies: [],
      metrics: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveStrategy(strategy);
    return strategy;
  },

  async addStrategyItem(
    strategyId: string,
    item: Omit<StrategyItem, 'id' | 'status'>
  ): Promise<GrowthStrategy> {
    const strategy = await this.loadStrategy(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    strategy.strategies.push({
      ...item,
      id: uuid(),
      status: 'pending',
    });

    strategy.updatedAt = new Date();
    await this.saveStrategy(strategy);

    return strategy;
  },

  async updateStrategyItem(
    strategyId: string,
    itemId: string,
    updates: Partial<StrategyItem>
  ): Promise<GrowthStrategy> {
    const strategy = await this.loadStrategy(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    const item = strategy.strategies.find((s) => s.id === itemId);
    if (!item) {
      throw new Error(`Strategy item ${itemId} not found`);
    }

    Object.assign(item, updates);
    strategy.updatedAt = new Date();
    await this.saveStrategy(strategy);

    return strategy;
  },

  async activateStrategy(strategyId: string): Promise<GrowthStrategy> {
    const strategy = await this.loadStrategy(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    strategy.status = 'active';
    strategy.updatedAt = new Date();
    await this.saveStrategy(strategy);

    return strategy;
  },

  async pauseStrategy(strategyId: string): Promise<GrowthStrategy> {
    const strategy = await this.loadStrategy(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    strategy.status = 'paused';
    strategy.updatedAt = new Date();
    await this.saveStrategy(strategy);

    return strategy;
  },

  async loadStrategy(strategyId: string): Promise<GrowthStrategy | null> {
    const path = `/data/strategies/${strategyId}.json`;

    try {
      const data = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(data) as GrowthStrategy;
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  },

  async saveStrategy(strategy: GrowthStrategy): Promise<void> {
    const dirPath = '/data/strategies';

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }

    const path = `${dirPath}/${strategy.id}.json`;
    await fs.writeFile(path, JSON.stringify(strategy, null, 2));
  },

  async listStrategies(accountHandle: string): Promise<GrowthStrategy[]> {
    const dirPath = '/data/strategies';

    try {
      const files = await fs.readdir(dirPath);
      const strategies: GrowthStrategy[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const strategy = await this.loadStrategy(file.replace('.json', ''));
        if (strategy && strategy.accountHandle === accountHandle) {
          strategies.push(strategy);
        }
      }

      return strategies.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  },

  async generateRecommendations(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    currentMetrics?: {
      engagement?: number;
      followers?: number;
      reach?: number;
      contentType?: string;
    }
  ): Promise<GrowthRecommendation[]> {
    const recommendations: GrowthRecommendation[] = [];

    // Content focus recommendation
    if (!currentMetrics?.contentType || currentMetrics.contentType === 'mixed') {
      recommendations.push({
        category: 'content-focus',
        recommendation: 'Focus on a single content format (Reels for IG, Shorts for TikTok)',
        rationale:
          'Algorithm favors consistency. Single format = higher engagement velocity.',
        expectedImpact: '+20-35% engagement rate',
        priority: 'high',
        actionItems: [
          'Audit top 10 performing pieces',
          'Identify content format patterns',
          'Commit to 70/20/10 format split (main/secondary/experimental)',
        ],
      });
    }

    // Posting schedule recommendation
    recommendations.push({
      category: 'posting-schedule',
      recommendation: 'Post 5-7 times weekly at peak engagement times',
      rationale:
        'Consistency signals algorithm, peak times maximize reach.',
      expectedImpact: '+15-25% reach',
      priority: 'high',
      actionItems: [
        'Analyze existing posting times',
        'Identify 3 peak time windows',
        'Set calendar reminder',
      ],
    });

    // Hashtag strategy
    recommendations.push({
      category: 'hashtag-strategy',
      recommendation: 'Use 20-30 mix of trending (10%), moderate (50%), niche (40%)',
      rationale:
        'Algorithm mix prevents shadowban, reaches right audience.',
      expectedImpact: '+30-50% reach per post',
      priority: 'high',
      actionItems: [
        'Research 50 niche hashtags',
        'Track 10 trending hashtags',
        'Create 3 hashtag templates',
      ],
    });

    // Engagement loop
    recommendations.push({
      category: 'engagement-loop',
      recommendation:
        'Respond to all comments in first hour, engage with 50 creator accounts daily',
      rationale: 'Algorithm rewards engagement. Reciprocal follows create growth loop.',
      expectedImpact: '+2-5% follower growth weekly',
      priority: 'medium',
      actionItems: [
        'Set engagement schedule (9-10am, 12-1pm, 6-7pm)',
        'Follow 50 creators in niche daily',
        'Reply to 100% comments first 60min',
      ],
    });

    // Collaboration opportunity
    recommendations.push({
      category: 'collab-opportunity',
      recommendation: 'Collaborate with 5-10 accounts 2-3x per month (similar size)',
      rationale:
        'Cross-promotions introduce you to warm audience, algorithm boosts collab content.',
      expectedImpact: '+10-15% follower growth per collab',
      priority: 'medium',
      actionItems: [
        'Identify 20 collab-worthy creators',
        'Reach out with specific proposal',
        'Schedule monthly collab calendar',
      ],
    });

    // Niche pivot (if engagement low)
    if ((currentMetrics?.engagement || 0) < 2) {
      recommendations.push({
        category: 'niche-pivot',
        recommendation:
          'Consider niche shift if current niche has <2% engagement after 3 months',
        rationale:
          'Low engagement = wrong niche or saturation. Early pivot saves time.',
        expectedImpact: '+50-100% engagement if successful',
        priority: 'low',
        actionItems: [
          'Research 5 adjacent niches',
          'Test content in new niche (10 posts)',
          'Compare engagement metrics',
        ],
      });
    }

    return recommendations;
  },
};
