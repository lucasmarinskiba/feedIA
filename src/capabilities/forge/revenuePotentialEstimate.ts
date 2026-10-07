/**
 * Revenue Potential Estimate — Phase 12
 * Estima potencial de ingresos por monetización
 */

export interface MonetizationChannel {
  channel: 'sponsorships' | 'affiliate' | 'digital-products' | 'courses' | 'coaching' | 'ads';
  monthlyRevenue: number; // Low estimate
  monthlyRevenuePeak: number; // High estimate
  effort: 'low' | 'medium' | 'high';
  timeToSetup: number; // Weeks
  scalability: 'limited' | 'moderate' | 'unlimited';
  requirements: string[];
}

export interface RevenuePotential {
  followerCount: number;
  avgEngagementRate: number; // %
  estimatedMonthlyImpressions: number;
  cpmEstimate: number; // Cost per 1000 impressions
  monetizationChannels: MonetizationChannel[];
  totalMonthlyPotential: {
    conservative: number; // Low end
    realistic: number; // Most likely
    optimistic: number; // High end
  };
  bestChannel: MonetizationChannel;
  recommendations: string[];
}

const calculateMetrics = (
  followers: number = 10000,
  engagementRate: number = 0.05,
): { impressions: number; cpm: number } => {
  const avgImpressions = followers * 0.3 * 30; // 30% follower reach, 30 days
  const cpm = followers < 50000 ? 2 : followers < 500000 ? 5 : 8; // Higher followers = higher CPM
  return { impressions: Math.floor(avgImpressions), cpm };
};

export const estimateRevenuePotential = (
  followerCount: number = 10000,
  avgEngagementRate: number = 0.05,
): RevenuePotential => {
  const { impressions, cpm } = calculateMetrics(followerCount, avgEngagementRate);

  const sponsorships: MonetizationChannel = {
    channel: 'sponsorships',
    monthlyRevenue: Math.max(500, Math.floor(followerCount / 1000) * 200),
    monthlyRevenuePeak: Math.max(2000, Math.floor(followerCount / 1000) * 800),
    effort: 'medium',
    timeToSetup: 4,
    scalability: 'unlimited',
    requirements: ['5K+ followers', 'Consistent engagement (>3%)', 'Niche audience clarity', 'Media kit + rates'],
  };

  const affiliate: MonetizationChannel = {
    channel: 'affiliate',
    monthlyRevenue: Math.floor((impressions / 1000) * cpm * 0.02), // 2% commission avg
    monthlyRevenuePeak: Math.floor((impressions / 1000) * cpm * 0.08),
    effort: 'low',
    timeToSetup: 1,
    scalability: 'moderate',
    requirements: ['Link in bio', 'Audience trust', 'Relevant products'],
  };

  const digitalProducts: MonetizationChannel = {
    channel: 'digital-products',
    monthlyRevenue: Math.max(200, Math.floor(followerCount / 5000) * 300),
    monthlyRevenuePeak: Math.max(1000, Math.floor(followerCount / 5000) * 1500),
    effort: 'high',
    timeToSetup: 8,
    scalability: 'moderate',
    requirements: ['Template/ebook', 'Sales page', 'Email list'],
  };

  const courses: MonetizationChannel = {
    channel: 'courses',
    monthlyRevenue: Math.max(500, Math.floor(followerCount / 10000) * 500),
    monthlyRevenuePeak: Math.max(3000, Math.floor(followerCount / 10000) * 3000),
    effort: 'high',
    timeToSetup: 12,
    scalability: 'moderate',
    requirements: ['Expertise', 'Video content', 'Community management'],
  };

  const coaching: MonetizationChannel = {
    channel: 'coaching',
    monthlyRevenue: Math.max(1000, Math.floor(followerCount / 5000) * 1000),
    monthlyRevenuePeak: Math.max(5000, Math.floor(followerCount / 5000) * 5000),
    effort: 'high',
    timeToSetup: 4,
    scalability: 'limited',
    requirements: ['1-on-1 availability', 'Proven track record', 'High price point'],
  };

  const ads: MonetizationChannel = {
    channel: 'ads',
    monthlyRevenue: Math.floor((impressions / 1000) * cpm),
    monthlyRevenuePeak: Math.floor((impressions / 1000) * cpm * 1.5),
    effort: 'low',
    timeToSetup: 2,
    scalability: 'unlimited',
    requirements: ['10K+ followers (Instagram)', 'Consistent posting'],
  };

  const channels = [sponsorships, affiliate, digitalProducts, courses, coaching, ads];
  const bestChannel = channels.reduce((max, ch) => (ch.monthlyRevenuePeak > max.monthlyRevenuePeak ? ch : max));

  const conservative = channels.reduce((sum, ch) => sum + ch.monthlyRevenue, 0);
  const optimistic = channels.reduce((sum, ch) => sum + ch.monthlyRevenuePeak, 0);
  const realistic = Math.floor((conservative + optimistic) / 2);

  const recommendations: string[] = [
    `💰 Potencial mensual: $${conservative.toLocaleString()} (bajo) → $${optimistic.toLocaleString()} (alto)`,
    `🎯 Mejor canal: ${bestChannel.channel.replace('-', ' ')} ($${bestChannel.monthlyRevenue.toLocaleString()}-$${bestChannel.monthlyRevenuePeak.toLocaleString()}/mes)`,
    `⚡ Rápido setup: Affiliate (1 semana) + Ads (2 semanas) = ~$${(affiliate.monthlyRevenue + ads.monthlyRevenue).toLocaleString()}/mes al inicio`,
    `🚀 Largo plazo: Cursos/Coaching (12 sem setup) generan $${(courses.monthlyRevenuePeak + coaching.monthlyRevenuePeak).toLocaleString()}-$${(courses.monthlyRevenuePeak + coaching.monthlyRevenuePeak).toLocaleString()}/mes`,
    `📊 CPM actual: $${cpm}/1000 impressions. Aumenta a $${cpm + 2} con niche claro + engagement >8%`,
  ];

  return {
    followerCount,
    avgEngagementRate,
    estimatedMonthlyImpressions: impressions,
    cpmEstimate: cpm,
    monetizationChannels: channels,
    totalMonthlyPotential: { conservative, realistic, optimistic },
    bestChannel,
    recommendations,
  };
};
