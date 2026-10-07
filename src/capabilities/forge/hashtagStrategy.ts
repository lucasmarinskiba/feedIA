/**
 * Hashtag Strategy — Phase 10
 * Analiza y optimiza estrategia de hashtags
 */

export interface HashtagMetrics {
  hashtag: string;
  volume: number; // Searches/day in niche
  engagement: number; // Avg engagement per post using this tag
  competition: 'low' | 'medium' | 'high';
  trend: 'rising' | 'stable' | 'declining';
  usageFrequency: number; // How often user has used it
}

export interface HashtagRecommendation {
  hashtag: string;
  reason: string; // Why this hashtag
  category: 'primary' | 'secondary' | 'niche' | 'trending';
  expectedReach: number; // 0-100 score
  difficulty: number; // 0-100 (how hard to rank)
  searchVolume: number;
}

export interface HashtagStrategyResult {
  currentHashtagMix: HashtagMetrics[];
  recommendations: HashtagRecommendation[];
  optimalHashtagCount: number; // Recommended # of hashtags
  mixBreakdown: {
    primary: string[]; // 3-5 broad hashtags (500K+ volume)
    secondary: string[]; // 5-7 medium hashtags (50K-500K)
    niche: string[]; // 5-7 specific hashtags (<50K)
    trending: string[]; // 1-2 trending (rising)
  };
  hashtagRotationStrategy: string[];
  recommendations_text: string[];
}

const generateHashtagPool = (niche: string = 'general'): HashtagRecommendation[] => {
  const pools: Record<string, HashtagRecommendation[]> = {
    general: [
      {
        hashtag: '#contentcreator',
        reason: 'Broad reach, high volume',
        category: 'primary',
        expectedReach: 85,
        difficulty: 92,
        searchVolume: 2500000,
      },
      {
        hashtag: '#socialmediamarketing',
        reason: 'Professional audience, moderate competition',
        category: 'secondary',
        expectedReach: 72,
        difficulty: 78,
        searchVolume: 450000,
      },
      {
        hashtag: '#instadaily',
        reason: 'Daily engagement booster',
        category: 'secondary',
        expectedReach: 68,
        difficulty: 88,
        searchVolume: 1800000,
      },
      {
        hashtag: '#foryou',
        reason: 'Algorithm-friendly, broad',
        category: 'primary',
        expectedReach: 80,
        difficulty: 95,
        searchVolume: 3200000,
      },
      {
        hashtag: '#contentmarketing',
        reason: 'B2B/creator focused',
        category: 'secondary',
        expectedReach: 70,
        difficulty: 75,
        searchVolume: 320000,
      },
      {
        hashtag: '#growthhacking',
        reason: 'Trending in creator niche',
        category: 'trending',
        expectedReach: 65,
        difficulty: 60,
        searchVolume: 180000,
      },
      {
        hashtag: '#digitalmarketing',
        reason: 'Medium volume, quality audience',
        category: 'secondary',
        expectedReach: 75,
        difficulty: 82,
        searchVolume: 620000,
      },
      {
        hashtag: '#instamarketing',
        reason: 'Platform-specific, niche',
        category: 'niche',
        expectedReach: 62,
        difficulty: 65,
        searchVolume: 95000,
      },
      {
        hashtag: '#creatoreconomy',
        reason: 'Rising trend, engaged community',
        category: 'trending',
        expectedReach: 68,
        difficulty: 55,
        searchVolume: 145000,
      },
      {
        hashtag: '#marketingtips',
        reason: 'Educational, help-seeking audience',
        category: 'niche',
        expectedReach: 60,
        difficulty: 70,
        searchVolume: 52000,
      },
    ],
  };

  return pools[niche] || pools.general;
};

export const analyzeHashtagStrategy = (usedHashtags: string[] = []): HashtagStrategyResult => {
  const allRecommendations = generateHashtagPool('general');

  // Simulate current usage metrics
  const currentHashtagMix: HashtagMetrics[] = usedHashtags.slice(0, 5).map((tag, idx) => ({
    hashtag: tag,
    volume: Math.floor(Math.random() * 2000000) + 10000,
    engagement: Math.floor(Math.random() * 80) + 20,
    competition: idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low',
    trend: idx % 3 === 0 ? 'stable' : idx % 3 === 1 ? 'rising' : 'declining',
    usageFrequency: Math.floor(Math.random() * 20) + 1,
  }));

  // Categorize recommendations
  const primary = allRecommendations.filter((r) => r.category === 'primary').slice(0, 3);
  const secondary = allRecommendations.filter((r) => r.category === 'secondary').slice(0, 5);
  const niche = allRecommendations.filter((r) => r.category === 'niche').slice(0, 5);
  const trending = allRecommendations.filter((r) => r.category === 'trending').slice(0, 2);

  const optimalHashtagCount = primary.length + secondary.length + niche.length + trending.length;

  const mixBreakdown = {
    primary: primary.map((r) => r.hashtag),
    secondary: secondary.map((r) => r.hashtag),
    niche: niche.map((r) => r.hashtag),
    trending: trending.map((r) => r.hashtag),
  };

  // Rotation strategy (vary hashtags weekly to avoid spam signals)
  const hashtagRotationStrategy = [
    'Week 1: Primary + Secondary (group 1)',
    'Week 2: Primary + Secondary (group 2)',
    'Week 3: Primary + Niche (group 1)',
    'Week 4: Primary + Trending + Niche (group 2)',
  ];

  const recommendations_text: string[] = [
    `📊 Mezcla óptima: ${optimalHashtagCount} hashtags (${primary.length} primary + ${secondary.length} secondary + ${niche.length} niche + ${trending.length} trending).`,
    `🔄 Rota hashtags semanalmente para evitar señales de spam.`,
    `📈 Trending: ${trending.map((t) => t.hashtag).join(', ')} — úsalos mientras suban.`,
    `🎯 Posiciona 3-5 posts/mes en hashtags nicho (<50K) para ranking rápido.`,
    `✅ Test: compara 3 posts con primary mix vs 3 posts con secondary+niche mix. Mide conversion.`,
  ];

  return {
    currentHashtagMix,
    recommendations: allRecommendations,
    optimalHashtagCount,
    mixBreakdown,
    hashtagRotationStrategy,
    recommendations_text,
  };
};
