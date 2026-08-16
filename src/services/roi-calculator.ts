/**
 * ROI Calculator
 * Estimate cost per result, engagement, conversions based on format + audience
 */

export interface ROIInput {
  format: 'carousel' | 'reel' | 'story' | 'static';
  topic: string;
  targetAudience: string;
  budget: number; // USD
  platform?: 'instagram' | 'tiktok' | 'pinterest';
  niche?: string;
}

export interface ROIOutput {
  format: string;
  topic: string;
  estimatedCPR: number; // cost per result (engagement/conversion)
  expectedEngagementRate: number; // 0-1 (%)
  estimatedImpressions: number;
  estimatedEngagements: number;
  estimatedConversions: number;
  recommendedBudget: number;
  breakeven: number; // engagements needed to break even
  roi: number; // expected return multiplier
  confidence: number; // 0-1, how confident in estimate
  rationale: string;
  recommendations: string[];
}

// Benchmarks by format + niche
const BENCHMARKS: Record<string, Record<string, { engagementRate: number; cpr: number; conversionRate: number }>> = {
  carousel: {
    skincare: { engagementRate: 0.12, cpr: 0.08, conversionRate: 0.045 },
    fashion: { engagementRate: 0.10, cpr: 0.12, conversionRate: 0.035 },
    fitness: { engagementRate: 0.14, cpr: 0.06, conversionRate: 0.055 },
    food: { engagementRate: 0.15, cpr: 0.05, conversionRate: 0.04 },
    business: { engagementRate: 0.08, cpr: 0.15, conversionRate: 0.025 },
    education: { engagementRate: 0.11, cpr: 0.10, conversionRate: 0.03 },
    default: { engagementRate: 0.10, cpr: 0.10, conversionRate: 0.03 },
  },
  reel: {
    skincare: { engagementRate: 0.18, cpr: 0.05, conversionRate: 0.06 },
    fashion: { engagementRate: 0.16, cpr: 0.07, conversionRate: 0.048 },
    fitness: { engagementRate: 0.20, cpr: 0.04, conversionRate: 0.07 },
    food: { engagementRate: 0.22, cpr: 0.03, conversionRate: 0.055 },
    business: { engagementRate: 0.12, cpr: 0.10, conversionRate: 0.035 },
    education: { engagementRate: 0.15, cpr: 0.08, conversionRate: 0.045 },
    default: { engagementRate: 0.16, cpr: 0.06, conversionRate: 0.05 },
  },
  story: {
    skincare: { engagementRate: 0.22, cpr: 0.04, conversionRate: 0.08 },
    fashion: { engagementRate: 0.20, cpr: 0.06, conversionRate: 0.065 },
    fitness: { engagementRate: 0.25, cpr: 0.03, conversionRate: 0.09 },
    food: { engagementRate: 0.28, cpr: 0.025, conversionRate: 0.07 },
    business: { engagementRate: 0.15, cpr: 0.08, conversionRate: 0.045 },
    education: { engagementRate: 0.18, cpr: 0.07, conversionRate: 0.055 },
    default: { engagementRate: 0.20, cpr: 0.05, conversionRate: 0.06 },
  },
  static: {
    skincare: { engagementRate: 0.08, cpr: 0.12, conversionRate: 0.025 },
    fashion: { engagementRate: 0.07, cpr: 0.14, conversionRate: 0.02 },
    fitness: { engagementRate: 0.09, cpr: 0.10, conversionRate: 0.03 },
    food: { engagementRate: 0.10, cpr: 0.08, conversionRate: 0.025 },
    business: { engagementRate: 0.06, cpr: 0.18, conversionRate: 0.015 },
    education: { engagementRate: 0.07, cpr: 0.15, conversionRate: 0.02 },
    default: { engagementRate: 0.08, cpr: 0.12, conversionRate: 0.02 },
  },
};

// Platform multipliers
const PLATFORM_MULTIPLIERS: Record<string, { reach: number; engagement: number }> = {
  instagram: { reach: 1.0, engagement: 1.0 },
  tiktok: { reach: 1.4, engagement: 1.6 }, // TikTok higher reach + engagement
  pinterest: { reach: 1.2, engagement: 0.8 }, // High reach, lower engagement
};

// Audience segment multipliers
const AUDIENCE_MULTIPLIERS: Record<string, number> = {
  luxury: 1.3, // Premium audiences engage more, higher conversion
  budget: 0.8, // Price-sensitive, lower engagement
  luxury_budget: 0.9,
  gen_z: 1.1,
  millennial: 1.0,
  boomer: 0.85,
  professional: 1.15,
  default: 1.0,
};

export const calculateROI = (input: ROIInput): ROIOutput => {
  const platform = input.platform ?? 'instagram';
  const niche = extractNiche(input.topic);

  // Get base benchmarks
  const benchmarkData = BENCHMARKS[input.format] ?? BENCHMARKS.carousel!;
  const benchmark = (benchmarkData[niche] ?? benchmarkData.default)!;

  // Platform multiplier
  const platformMult = (PLATFORM_MULTIPLIERS[platform] ?? PLATFORM_MULTIPLIERS.instagram)!;

  // Audience multiplier
  const audienceMult = extractAudienceMultiplier(input.targetAudience);

  // Calculate metrics
  const engagementRate = Math.min(benchmark.engagementRate * platformMult.engagement * audienceMult, 0.5);
  const cpr = Math.max(benchmark.cpr / (platformMult.reach * audienceMult), 0.01);
  const conversionRate = benchmark.conversionRate * audienceMult;

  // From budget, calculate reach
  const estimatedImpressions = Math.round((input.budget / cpr) * (1 / engagementRate));
  const estimatedEngagements = Math.round(estimatedImpressions * engagementRate);
  const estimatedConversions = Math.round(estimatedEngagements * conversionRate);

  // ROI: assume $50 LTV per conversion
  const revenue = estimatedConversions * 50;
  const roi = revenue / input.budget;

  // Breakeven
  const breakeven = Math.ceil(input.budget / (50 * conversionRate));

  // Confidence (higher with common niches, formats)
  const confidence = isCommonNiche(niche) ? 0.85 : 0.65;

  // Recommendations
  const recommendations = generateRecommendations(input, engagementRate, cpr, estimatedConversions);

  // Rationale
  const rationale = `${input.format} for ${niche} audience historically performs at ${(engagementRate * 100).toFixed(1)}% engagement rate on ${platform}. Budget optimized for ~${estimatedConversions} conversions.`;

  return {
    format: input.format,
    topic: input.topic,
    estimatedCPR: Math.round(cpr * 100) / 100,
    expectedEngagementRate: Math.round(engagementRate * 10000) / 100,
    estimatedImpressions,
    estimatedEngagements,
    estimatedConversions,
    recommendedBudget: Math.round(input.budget / 10) * 10, // Round to nearest $10
    breakeven,
    roi: Math.round(roi * 100) / 100,
    confidence,
    rationale,
    recommendations,
  };
};

const extractNiche = (topic: string): string => {
  const lower = topic.toLowerCase();
  if (lower.includes('skin') || lower.includes('beauty') || lower.includes('cosmetic')) return 'skincare';
  if (lower.includes('fashion') || lower.includes('style') || lower.includes('clothing')) return 'fashion';
  if (lower.includes('fitness') || lower.includes('gym') || lower.includes('workout')) return 'fitness';
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('recipe')) return 'food';
  if (lower.includes('business') || lower.includes('saas') || lower.includes('startup')) return 'business';
  if (lower.includes('education') || lower.includes('course') || lower.includes('learning')) return 'education';
  return 'default';
};

const extractAudienceMultiplier = (audience: string): number => {
  const lower = audience.toLowerCase();
  if (lower.includes('luxury') && lower.includes('budget')) return AUDIENCE_MULTIPLIERS.luxury_budget!;
  if (lower.includes('luxury') || lower.includes('premium') || lower.includes('high-income')) return AUDIENCE_MULTIPLIERS.luxury!;
  if (lower.includes('budget') || lower.includes('affordable') || lower.includes('value')) return AUDIENCE_MULTIPLIERS.budget!;
  if (lower.includes('gen z') || lower.includes('gen-z')) return AUDIENCE_MULTIPLIERS.gen_z!;
  if (lower.includes('millennial')) return AUDIENCE_MULTIPLIERS.millennial!;
  if (lower.includes('boomer') || lower.includes('senior')) return AUDIENCE_MULTIPLIERS.boomer!;
  if (lower.includes('professional') || lower.includes('b2b') || lower.includes('enterprise')) return AUDIENCE_MULTIPLIERS.professional!;
  return AUDIENCE_MULTIPLIERS.default!;
};

const isCommonNiche = (niche: string): boolean => {
  return ['skincare', 'fashion', 'fitness', 'food', 'business', 'education'].includes(niche);
};

const generateRecommendations = (
  input: ROIInput,
  engagementRate: number,
  cpr: number,
  conversions: number
): string[] => {
  const recs: string[] = [];

  // Format recommendation
  if (input.format === 'carousel' && engagementRate > 0.15) {
    recs.push('Carousel performing above average—consider allocating more budget here');
  }
  if (input.format === 'reel' && engagementRate < 0.12) {
    recs.push('Reels underperforming for this topic—test different hooks or trending audio');
  }

  // Budget recommendation
  if (conversions < 10) {
    recs.push(`Budget low ($${input.budget})—increase to $500+ for statistical significance`);
  }
  if (conversions > 100) {
    recs.push(`High conversion potential—scale budget by 50% to capture more market`);
  }

  // Audience recommendation
  if (input.targetAudience.toLowerCase().includes('luxury')) {
    recs.push('Premium audience detected—emphasize exclusivity and quality over price');
  }
  if (input.targetAudience.toLowerCase().includes('budget')) {
    recs.push('Price-sensitive audience—highlight value proposition and ROI');
  }

  // Platform recommendation
  if (input.platform === 'tiktok') {
    recs.push('TikTok: Prioritize trending audio and native vertical format');
  }
  if (input.platform === 'pinterest') {
    recs.push('Pinterest: Long pin descriptions with keywords improve discoverability');
  }

  // Fallback
  if (recs.length === 0) {
    recs.push('Standard performance—consider A/B testing format or audience targeting');
  }

  return recs.slice(0, 3); // Top 3 recommendations
};

/**
 * Compare multiple formats for same budget
 */
export const compareFormats = (
  formats: Array<'carousel' | 'reel' | 'story' | 'static'>,
  topic: string,
  targetAudience: string,
  budget: number,
  platform?: 'instagram' | 'tiktok' | 'pinterest'
): ROIOutput[] => {
  return formats.map((format) =>
    calculateROI({
      format,
      topic,
      targetAudience,
      budget,
      platform,
    })
  );
};

/**
 * Recommend optimal budget split across formats
 */
export const optimizeBudgetAllocation = (
  totalBudget: number,
  topic: string,
  targetAudience: string,
  platform?: 'instagram' | 'tiktok' | 'pinterest'
): Record<string, { budget: number; conversions: number; roi: number }> => {
  const formats: Array<'carousel' | 'reel' | 'story' | 'static'> = ['carousel', 'reel', 'story'];

  // Score each format
  const scores = formats.map((format) => {
    const roi = calculateROI({
      format,
      topic,
      targetAudience,
      budget: totalBudget / 3, // Equal split for scoring
      platform,
    });
    return { format, roi: roi.roi, conversions: roi.estimatedConversions };
  });

  // Sort by ROI
  scores.sort((a, b) => b.roi - a.roi);

  // Allocate 50% to top, 35% to 2nd, 15% to 3rd
  const topFormat = scores[0]?.format ?? 'carousel';
  const midFormat = scores[1]?.format ?? 'reel';
  const lowFormat = scores[2]?.format ?? 'story';
  const allocation = {
    [topFormat]: totalBudget * 0.5,
    [midFormat]: totalBudget * 0.35,
    [lowFormat]: totalBudget * 0.15,
  };

  // Calculate results for each allocation
  const result: Record<string, { budget: number; conversions: number; roi: number }> = {};
  Object.entries(allocation).forEach(([format, budget]) => {
    const roi = calculateROI({
      format: format as 'carousel' | 'reel' | 'story' | 'static',
      topic,
      targetAudience,
      budget,
      platform,
    });
    result[format] = {
      budget: Math.round(budget),
      conversions: roi.estimatedConversions,
      roi: roi.roi,
    };
  });

  return result;
};
