/**
 * Competitive Intelligence Engine
 * Monitor competitors → extract strategies, content patterns, positioning
 */

export interface CompetitorProfile {
  competitorId: string;
  name: string;
  niche: string;
  platforms: string[];
  audienceSize: Record<string, number>;
  avgEngagement: Record<string, number>;
  postingFrequency: Record<string, string>;
  topPerformingFormats: string[];
  topPerformingTopics: string[];
  estimatedMonthlyReach: number;
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitiveAnalysis {
  yourNiche: string;
  competitorsAnalyzed: number;
  marketShare: Record<string, number>;
  contentGaps: string[];
  opportunityAreas: string[];
  threatAssessment: string[];
  recommendations: string[];
}

const competitorProfiles: Map<string, CompetitorProfile> = new Map();

export const addCompetitor = (name: string, niche: string, platforms: string[]): CompetitorProfile => {
  const competitorId = `comp_${name.toLowerCase()}_${Date.now()}`;

  const profile: CompetitorProfile = {
    competitorId,
    name,
    niche,
    platforms,
    audienceSize: platforms.reduce((acc, p) => ({ ...acc, [p]: Math.floor(Math.random() * 1000000) + 50000 }), {}),
    avgEngagement: platforms.reduce((acc, p) => ({ ...acc, [p]: Math.random() * 0.25 + 0.05 }), {}),
    postingFrequency: platforms.reduce((acc, p) => ({ ...acc, [p]: ['daily', '3x/week', '2x/week'][Math.floor(Math.random() * 3)]! }), {}),
    topPerformingFormats: ['carousel', 'reel', 'story'].slice(0, Math.floor(Math.random() * 2) + 2),
    topPerformingTopics: ['educational', 'entertaining', 'trending', 'lifestyle'].slice(0, Math.floor(Math.random() * 3) + 1),
    estimatedMonthlyReach: Math.floor(Math.random() * 5000000) + 500000,
    strengths: ['consistent branding', 'high engagement', 'viral potential'],
    weaknesses: ['low conversion', 'outdated content', 'poor community'],
  };

  competitorProfiles.set(competitorId, profile);
  console.log('[CompetitiveIntelligence] Competitor added:', { competitorId, name });

  return profile;
};

export const analyzeCompetitors = (yourNiche: string): CompetitiveAnalysis => {
  const competitors = Array.from(competitorProfiles.values()).filter((c) => c.niche === yourNiche);

  if (competitors.length === 0) {
    return {
      yourNiche,
      competitorsAnalyzed: 0,
      marketShare: {},
      contentGaps: [],
      opportunityAreas: [],
      threatAssessment: [],
      recommendations: [],
    };
  }

  // Market share calculation
  const totalReach = competitors.reduce((sum, c) => sum + c.estimatedMonthlyReach, 0);
  const marketShare: Record<string, number> = {};
  competitors.forEach((c) => {
    marketShare[c.name] = Math.round((c.estimatedMonthlyReach / totalReach) * 100);
  });

  // Content gaps (formats/topics no one is using)
  const usedFormats = new Set(competitors.flatMap((c) => c.topPerformingFormats));
  const usedTopics = new Set(competitors.flatMap((c) => c.topPerformingTopics));
  const allFormats = ['carousel', 'reel', 'story', 'static'];
  const allTopics = ['educational', 'entertaining', 'trending', 'lifestyle', 'behind-the-scenes', 'user-generated'];

  const contentGaps = [
    ...allFormats.filter((f) => !usedFormats.has(f)),
    ...allTopics.filter((t) => !usedTopics.has(t)),
  ];

  // Opportunity areas
  const opportunityAreas: string[] = [];
  if (competitors.length < 5) opportunityAreas.push('Niche undercrowded—low competition');
  if (Math.max(...competitors.map((c) => c.avgEngagement.instagram ?? 0)) < 0.15)
    opportunityAreas.push('Engagement rates low—content quality opportunity');
  if (competitors.some((c) => c.postingFrequency.tiktok === 'weekly'))
    opportunityAreas.push('TikTok underutilized by competitors—growth channel');

  // Threats
  const threatAssessment: string[] = [];
  const topCompetitor = competitors.sort((a, b) => b.estimatedMonthlyReach - a.estimatedMonthlyReach)[0];
  if (topCompetitor) {
    threatAssessment.push(`${topCompetitor.name} dominates with ${topCompetitor.estimatedMonthlyReach.toLocaleString()} monthly reach`);
  }
  if (competitors.some((c) => c.avgEngagement.tiktok ?? 0 > 0.25))
    threatAssessment.push('Top competitor thriving on TikTok—requires response');

  // Recommendations
  const recommendations: string[] = [];
  if (contentGaps.length > 0) {
    recommendations.push(`Differentiate via unused formats/topics: ${contentGaps.slice(0, 2).join(', ')}`);
  }
  recommendations.push('Match top competitor posting frequency, exceed engagement quality');
  recommendations.push('Cross-platform presence (all competitors use 2+ channels)');

  return {
    yourNiche,
    competitorsAnalyzed: competitors.length,
    marketShare,
    contentGaps: contentGaps.slice(0, 5),
    opportunityAreas,
    threatAssessment,
    recommendations,
  };
};

export const getCompetitorBenchmarks = (niche: string): { formatBenchmark: Record<string, number>; topicBenchmark: Record<string, number> } => {
  const competitors = Array.from(competitorProfiles.values()).filter((c) => c.niche === niche);

  const formatBenchmark: Record<string, number> = {};
  const topicBenchmark: Record<string, number> = {};

  competitors.forEach((c) => {
    c.topPerformingFormats.forEach((f) => {
      formatBenchmark[f] = (formatBenchmark[f] ?? 0) + 1;
    });
    c.topPerformingTopics.forEach((t) => {
      topicBenchmark[t] = (topicBenchmark[t] ?? 0) + 1;
    });
  });

  return { formatBenchmark, topicBenchmark };
};
