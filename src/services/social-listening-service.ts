import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';

export interface Mention {
  id: string;
  accountHandle: string;
  platform: 'instagram' | 'tiktok';
  sourceHandle: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
  mentionedAt: Date;
  url?: string;
}

export interface HashtagMetric {
  hashtag: string;
  platform: 'instagram' | 'tiktok';
  volume: number;
  engagement: number;
  trend: 'rising' | 'stable' | 'declining';
  lastUpdated: Date;
}

export interface CompetitorMention {
  id: string;
  competitorHandle: string;
  sourceHandle: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  mentionedAt: Date;
}

export interface ListeningTopic {
  id: string;
  accountHandle: string;
  keyword: string;
  platform: 'instagram' | 'tiktok';
  mentions: Mention[];
  createdAt: Date;
}

export const socialListeningService = {
  async recordMention(mention: Omit<Mention, 'id'>): Promise<Mention> {
    const newMention: Mention = { ...mention, id: uuid() };

    const path = `/data/mentions/${mention.accountHandle}-${mention.platform}.json`;
    let mentions: Mention[] = [];

    try {
      const data = await fs.readFile(path, 'utf-8');
      mentions = JSON.parse(data) as Mention[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    mentions.push(newMention);
    await this.saveMentions(mention.accountHandle, mention.platform, mentions);

    return newMention;
  },

  async getMentions(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    sentiment?: 'positive' | 'neutral' | 'negative',
    limit: number = 50
  ): Promise<Mention[]> {
    let mentions = await this.loadMentions(accountHandle, platform);

    if (sentiment) {
      mentions = mentions.filter((m) => m.sentiment === sentiment);
    }

    return mentions.sort((a, b) => b.mentionedAt.getTime() - a.mentionedAt.getTime()).slice(0, limit);
  },

  async loadMentions(accountHandle: string, platform: 'instagram' | 'tiktok'): Promise<Mention[]> {
    const path = `/data/mentions/${accountHandle}-${platform}.json`;

    try {
      const data = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(data) as Mention[];
      return parsed.map((m) => ({
        ...m,
        mentionedAt: new Date(m.mentionedAt),
      }));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  },

  async saveMentions(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    mentions: Mention[]
  ): Promise<void> {
    const dirPath = '/data/mentions';

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }

    const path = `${dirPath}/${accountHandle}-${platform}.json`;
    await fs.writeFile(path, JSON.stringify(mentions, null, 2));
  },

  async recordHashtagMetric(metric: HashtagMetric): Promise<void> {
    const path = `/data/hashtags/${metric.platform}-hashtags.json`;
    let metrics: HashtagMetric[] = [];

    try {
      const data = await fs.readFile(path, 'utf-8');
      metrics = JSON.parse(data) as HashtagMetric[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    const existing = metrics.findIndex((m) => m.hashtag === metric.hashtag);
    if (existing >= 0) {
      metrics[existing] = metric;
    } else {
      metrics.push(metric);
    }

    const dirPath = '/data/hashtags';
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }

    await fs.writeFile(path, JSON.stringify(metrics, null, 2));
  },

  async getHashtagMetrics(
    platform: 'instagram' | 'tiktok',
    trend?: 'rising' | 'stable' | 'declining',
    limit: number = 20
  ): Promise<HashtagMetric[]> {
    const path = `/data/hashtags/${platform}-hashtags.json`;

    try {
      const data = await fs.readFile(path, 'utf-8');
      let metrics = JSON.parse(data) as HashtagMetric[];

      if (trend) {
        metrics = metrics.filter((m) => m.trend === trend);
      }

      return metrics.sort((a, b) => b.volume - a.volume).slice(0, limit);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  },

  async recordCompetitorMention(mention: Omit<CompetitorMention, 'id'>): Promise<CompetitorMention> {
    const newMention: CompetitorMention = { ...mention, id: uuid() };

    const path = `/data/competitor-mentions/${mention.competitorHandle}.json`;
    let mentions: CompetitorMention[] = [];

    try {
      const data = await fs.readFile(path, 'utf-8');
      mentions = JSON.parse(data) as CompetitorMention[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    mentions.push(newMention);

    const dirPath = '/data/competitor-mentions';
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }

    await fs.writeFile(path, JSON.stringify(mentions, null, 2));

    return newMention;
  },

  async getCompetitorMentions(
    competitorHandle: string,
    limit: number = 50
  ): Promise<CompetitorMention[]> {
    const path = `/data/competitor-mentions/${competitorHandle}.json`;

    try {
      const data = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(data) as CompetitorMention[];
      return parsed
        .map((m) => ({
          ...m,
          mentionedAt: new Date(m.mentionedAt),
        }))
        .sort((a, b) => b.mentionedAt.getTime() - a.mentionedAt.getTime())
        .slice(0, limit);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  },

  async getSentimentAnalysis(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    days: number = 30
  ): Promise<{
    positive: number;
    neutral: number;
    negative: number;
    overall: number;
  }> {
    const mentions = await this.loadMentions(accountHandle, platform);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recent = mentions.filter((m) => m.mentionedAt >= cutoffDate);

    const positive = recent.filter((m) => m.sentiment === 'positive').length;
    const neutral = recent.filter((m) => m.sentiment === 'neutral').length;
    const negative = recent.filter((m) => m.sentiment === 'negative').length;

    const total = recent.length;
    const overall = total > 0 ? (positive - negative) / total : 0;

    return {
      positive,
      neutral,
      negative,
      overall,
    };
  },
};
