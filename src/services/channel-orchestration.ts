/**
 * Channel Orchestration Engine
 * Distribute content across platforms → optimize for channel rules + audience overlap
 */

export interface ChannelConfig {
  channel: 'instagram' | 'tiktok' | 'pinterest' | 'facebook' | 'youtube';
  enabled: boolean;
  audienceSize: number;
  averageEngagement: number;
  postFrequency: 'daily' | '3x/week' | '2x/week' | 'weekly';
  contentFormats: Array<'carousel' | 'reel' | 'story' | 'static'>;
  bestPerformingContent: string;
}

export interface ContentDistribution {
  contentId: string;
  distributions: Array<{
    channel: string;
    format: string;
    scheduledTime: string;
    priority: number;
    expectedReach: number;
    audienceOverlap: number;
  }>;
  totalExpectedReach: number;
  crossChannelStrategy: string;
  contentAdaptations: Record<string, string>;
}

export interface OrchestratedSchedule {
  period: string;
  channelSchedule: Record<string, Array<{ date: string; contentType: string; frequency: number }>>;
  contentGaps: string[];
  channelBalancing: Record<string, number>;
  recommendations: string[];
}

// Channel registry
const channels: Map<string, ChannelConfig> = new Map();

// Initialize default channels
const initializeChannels = (): void => {
  const defaultChannels: ChannelConfig[] = [
    {
      channel: 'instagram',
      enabled: true,
      audienceSize: 500000,
      averageEngagement: 0.15,
      postFrequency: 'daily',
      contentFormats: ['carousel', 'reel', 'story', 'static'],
      bestPerformingContent: 'carousel + reel',
    },
    {
      channel: 'tiktok',
      enabled: true,
      audienceSize: 800000,
      averageEngagement: 0.25,
      postFrequency: '3x/week',
      contentFormats: ['reel'],
      bestPerformingContent: 'trending audio + short-form',
    },
    {
      channel: 'pinterest',
      enabled: false,
      audienceSize: 200000,
      averageEngagement: 0.08,
      postFrequency: 'daily',
      contentFormats: ['carousel', 'static'],
      bestPerformingContent: 'static pins',
    },
  ];

  defaultChannels.forEach((ch) => channels.set(ch.channel, ch));
};

initializeChannels();

export const configureChannel = (config: ChannelConfig): void => {
  channels.set(config.channel, config);
  console.log('[ChannelOrchestration] Channel configured:', { channel: config.channel, enabled: config.enabled });
};

export const distributeContent = (
  contentId: string,
  contentType: 'carousel' | 'reel' | 'story' | 'static',
  topic: string
): ContentDistribution => {
  const activeChannels = Array.from(channels.values()).filter((ch) => ch.enabled);

  const distributions = activeChannels
    .map((channel) => {
      // Determine format for this channel
      let targetFormat = contentType;
      if (!channel.contentFormats.includes(contentType)) {
        targetFormat = channel.contentFormats[0] ?? 'carousel';
      }

      // Calculate priority based on channel performance + content fit
      const baseEngagement = channel.averageEngagement;
      const contentFit = getContentChannelFit(topic, channel.channel);
      const priority = Math.round(baseEngagement * contentFit * 100);

      // Expected reach
      const expectedReach = Math.round(
        (channel.audienceSize * baseEngagement * contentFit) / (activeChannels.length || 1)
      );

      // Audience overlap with first channel (Instagram)
      const audienceOverlap = calculateAudienceOverlap(channel.channel);

      // Schedule timing
      const scheduledTime = generateScheduleTime(channel.channel);

      return {
        channel: channel.channel,
        format: targetFormat,
        scheduledTime,
        priority,
        expectedReach,
        audienceOverlap,
      };
    })
    .sort((a, b) => b.priority - a.priority);

  const totalExpectedReach = distributions.reduce((sum, d) => sum + d.expectedReach, 0);

  // Cross-channel strategy
  const crossChannelStrategy = generateCrossChannelStrategy(distributions, topic);

  // Content adaptations per channel
  const contentAdaptations: Record<string, string> = {};
  distributions.forEach((dist) => {
    contentAdaptations[dist.channel] = `Adapt to ${dist.format} format, optimize caption for ${dist.channel}`;
  });

  return {
    contentId,
    distributions,
    totalExpectedReach,
    crossChannelStrategy,
    contentAdaptations,
  };
};

export const orchestrateSchedule = (period: 'week' | 'month'): OrchestratedSchedule => {
  const activeChannels = Array.from(channels.values()).filter((ch) => ch.enabled);

  const channelSchedule: Record<string, Array<{ date: string; contentType: string; frequency: number }>> = {};

  activeChannels.forEach((channel) => {
    const schedule: Array<{ date: string; contentType: string; frequency: number }> = [];

    // Generate schedule based on post frequency
    const daysInPeriod = period === 'week' ? 7 : 30;
    const postsPerPeriod = getPostsPerPeriod(channel.postFrequency, daysInPeriod);

    for (let i = 0; i < postsPerPeriod; i++) {
      const date = new Date();
      date.setDate(date.getDate() + Math.floor((i * daysInPeriod) / postsPerPeriod));

      const contentType = channel.contentFormats[i % channel.contentFormats.length]!;

      schedule.push({
        date: date.toISOString().split('T')[0]!,
        contentType,
        frequency: postsPerPeriod,
      });
    }

    channelSchedule[channel.channel] = schedule;
  });

  // Detect content gaps
  const contentGaps: string[] = [];
  if (activeChannels.length < 3) contentGaps.push('Consider enabling more channels for broader reach');
  if (activeChannels.some((ch) => ch.postFrequency === 'weekly')) contentGaps.push('Some channels inactive—increase frequency');

  // Channel balancing (% of content per channel)
  const channelBalancing: Record<string, number> = {};
  const totalAudience = activeChannels.reduce((sum, ch) => sum + ch.audienceSize, 0);
  activeChannels.forEach((channel) => {
    channelBalancing[channel.channel] = Math.round((channel.audienceSize / totalAudience) * 100);
  });

  // Recommendations
  const recommendations: string[] = [];
  const topChannel = activeChannels.sort((a, b) => b.averageEngagement - a.averageEngagement)[0];
  if (topChannel) {
    recommendations.push(`Prioritize ${topChannel.channel}—highest engagement (${(topChannel.averageEngagement * 100).toFixed(0)}%)`);
  }

  recommendations.push('Stagger posts 4-6 hours apart to maximize reach');
  recommendations.push('Cross-promote best-performing content across channels');

  return {
    period,
    channelSchedule,
    contentGaps,
    channelBalancing,
    recommendations,
  };
};

export const optimizeChannelMix = (): Record<string, { recommendation: string; expectedROI: number }> => {
  const activeChannels = Array.from(channels.values()).filter((ch) => ch.enabled);

  const optimization: Record<string, { recommendation: string; expectedROI: number }> = {};

  activeChannels.forEach((channel) => {
    const engagement = channel.averageEngagement;
    const audienceSize = channel.audienceSize;
    const expectedROI = Math.round(engagement * (audienceSize / 100000) * 100);

    let recommendation = 'Maintain current strategy';
    if (engagement > 0.2) recommendation = 'High engagement—increase posting frequency';
    if (engagement < 0.1) recommendation = 'Low engagement—test different content types';
    if (audienceSize > 1000000) recommendation = 'Massive audience—allocate more budget';

    optimization[channel.channel] = { recommendation, expectedROI };
  });

  return optimization;
};

export const getChannelMetrics = (): {
  totalChannels: number;
  activeChannels: number;
  totalAudience: number;
  avgEngagementRate: number;
  mostEffectiveChannel: string;
} => {
  const allChannels = Array.from(channels.values());
  const activeChannels = allChannels.filter((ch) => ch.enabled);

  const totalAudience = activeChannels.reduce((sum, ch) => sum + ch.audienceSize, 0);
  const avgEngagementRate = activeChannels.reduce((sum, ch) => sum + ch.averageEngagement, 0) / Math.max(activeChannels.length, 1);

  const mostEffective = activeChannels.sort((a, b) => b.averageEngagement - a.averageEngagement)[0];

  return {
    totalChannels: allChannels.length,
    activeChannels: activeChannels.length,
    totalAudience,
    avgEngagementRate: Math.round(avgEngagementRate * 1000) / 10,
    mostEffectiveChannel: mostEffective?.channel ?? 'none',
  };
};

// ============ HELPERS ============

const getContentChannelFit = (topic: string, channel: string): number => {
  const lower = topic.toLowerCase();

  if (channel === 'tiktok') {
    if (lower.includes('trending') || lower.includes('viral')) return 1.5;
    if (lower.includes('educational')) return 0.8;
    return 1.2;
  }

  if (channel === 'instagram') {
    if (lower.includes('before-after') || lower.includes('lifestyle')) return 1.3;
    return 1.0;
  }

  if (channel === 'pinterest') {
    if (lower.includes('tutorial') || lower.includes('diy')) return 1.4;
    return 0.9;
  }

  return 1.0;
};

const calculateAudienceOverlap = (channel: string): number => {
  // Simplified: assume partial overlap with Instagram as baseline
  const overlaps: Record<string, number> = {
    instagram: 0.9,
    tiktok: 0.4,
    pinterest: 0.3,
    facebook: 0.6,
    youtube: 0.5,
  };

  return overlaps[channel] ?? 0.5;
};

const generateScheduleTime = (channel: string): string => {
  const now = new Date();
  const bestHours: Record<string, number[]> = {
    instagram: [9, 12, 18, 21],
    tiktok: [6, 9, 19, 21],
    pinterest: [8, 14, 20],
    facebook: [10, 14, 20],
    youtube: [17, 19, 21],
  };

  const hours = bestHours[channel] ?? [12, 18];
  const randomHour = hours[Math.floor(Math.random() * hours.length)]!;

  const scheduled = new Date(now);
  scheduled.setHours(randomHour, 0, 0, 0);

  return scheduled.toISOString();
};

const generateCrossChannelStrategy = (
  distributions: Array<{ channel: string; priority: number }>,
  topic: string
): string => {
  const topChannel = distributions[0]?.channel ?? 'instagram';
  const strategy = `Publish first to ${topChannel} (highest priority). Monitor engagement for 2 hours, then amplify to secondary channels. ${topic}-focused content: tailor captions for each platform native audience.`;

  return strategy;
};

const getPostsPerPeriod = (frequency: string, daysInPeriod: number): number => {
  const freqMap: Record<string, number> = {
    daily: daysInPeriod,
    '3x/week': Math.floor((daysInPeriod / 7) * 3),
    '2x/week': Math.floor((daysInPeriod / 7) * 2),
    weekly: Math.floor(daysInPeriod / 7),
  };

  return freqMap[frequency] ?? 1;
};
