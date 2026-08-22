/**
 * Smart Batching Service
 * Parse strategy goal → auto-calculate optimal format/topic mix → batch generate all assets
 */

export interface StrategyGoal {
  brand: string;
  niche: string;
  quarterGoal: string; // e.g., "Q3 skincare brand awareness"
  duration: number; // weeks
  budget: number; // USD
  targetAudience: string;
  platform: 'instagram' | 'tiktok' | 'pinterest';
}

export interface BatchPlan {
  week: number;
  format: 'carousel' | 'reel' | 'story';
  topic: string;
  quantity: number;
  expectedResult: 'awareness' | 'engagement' | 'conversion' | 'retention';
  rationale: string;
}

export interface BatchResult {
  roadmap: BatchPlan[];
  totalAssets: number;
  totalWeeks: number;
  estimatedBudget: number;
  estimatedImpressions: number;
  estimatedConversions: number;
  timeToProduction: string;
  status: 'planning' | 'generating' | 'complete';
}

// Strategy templates by goal type
const GOAL_TEMPLATES: Record<string, { formats: string[]; topics: string[]; cadence: string }> = {
  awareness: {
    formats: ['carousel', 'reel', 'story'],
    topics: ['educational', 'lifestyle', 'behind-the-scenes', 'user-story'],
    cadence: '3x/week carousel, 2x/week reel, daily story',
  },
  engagement: {
    formats: ['reel', 'story', 'carousel'],
    topics: ['trending-audio', 'challenge', 'user-generated', 'tutorial'],
    cadence: '4x/week reel, 2x/day story, 2x/week carousel',
  },
  conversion: {
    formats: ['carousel', 'reel', 'story'],
    topics: ['product-benefits', 'testimonial', 'limited-offer', 'urgency'],
    cadence: '2x/week carousel, 3x/week reel, 3x/day story',
  },
  retention: {
    formats: ['story', 'reel', 'carousel'],
    topics: ['exclusive-content', 'community', 'loyalty-reward', 'educational'],
    cadence: '5x/day story, 2x/week reel, 1x/week carousel',
  },
};

// Format distribution by goal
const FORMAT_DISTRIBUTION: Record<string, Record<'carousel' | 'reel' | 'story', number>> = {
  awareness: { carousel: 0.4, reel: 0.35, story: 0.25 },
  engagement: { carousel: 0.25, reel: 0.5, story: 0.25 },
  conversion: { carousel: 0.45, reel: 0.3, story: 0.25 },
  retention: { carousel: 0.2, reel: 0.3, story: 0.5 },
};

// Topics by niche
const NICHE_TOPICS: Record<string, string[]> = {
  skincare: [
    'morning-routine',
    'ingredients-explained',
    'before-after',
    'skin-type-guide',
    'acne-solutions',
    'anti-aging',
    'natural-beauty',
    'dermatologist-tips',
  ],
  fashion: [
    'outfit-styling',
    'seasonal-trends',
    'thrifting-haul',
    'styling-tips',
    'confidence-fashion',
    'luxury-vs-affordable',
    'wardrobe-basics',
    'fashion-fails',
  ],
  fitness: [
    'workout-routine',
    'nutrition-tips',
    'transformation-story',
    'home-workout',
    'gym-tips',
    'recovery-methods',
    'meal-prep',
    'motivation',
  ],
  food: [
    'recipe-tutorial',
    'food-hack',
    'restaurant-review',
    'cooking-fail',
    'dietary-lifestyle',
    'quick-meals',
    'food-pairing',
    'dessert-ideas',
  ],
  business: [
    'productivity-tip',
    'business-story',
    'market-trend',
    'founder-advice',
    'automation-tool',
    'scaling-strategy',
    'pitfall-avoid',
    'growth-hack',
  ],
};

export const generateSmartBatch = (goal: StrategyGoal): BatchResult => {
  // Parse goal to extract strategy type
  const goalType = extractGoalType(goal.quarterGoal);
  const template = GOAL_TEMPLATES[goalType] || GOAL_TEMPLATES.awareness;
  const formatDist = FORMAT_DISTRIBUTION[goalType] || FORMAT_DISTRIBUTION.awareness;

  // Get topics for niche
  const availableTopics = (NICHE_TOPICS[goal.niche] ?? NICHE_TOPICS.business)!;
  const selectedTopics = availableTopics.slice(0, Math.ceil(availableTopics.length * 0.6));

  // Calculate assets needed
  const assetsPerWeek = calculateAssetsPerWeek(goal.duration, goal.budget, goalType);
  const totalAssets = assetsPerWeek * goal.duration;

  // Generate weekly plan
  const roadmap: BatchPlan[] = [];
  let assetCounter = 0;

  for (let week = 1; week <= goal.duration; week++) {
    const formats: Array<'carousel' | 'reel' | 'story'> = ['carousel', 'reel', 'story'];

    formats.forEach((format) => {
      const quantity = Math.ceil(assetsPerWeek * ((formatDist[format] ?? 0.33)!));

      if (quantity > 0) {
        // Rotate topics
        const topicIndex = (assetCounter + week) % selectedTopics.length;
        const topic = selectedTopics[topicIndex]!;

        roadmap.push({
          week,
          format,
          topic,
          quantity,
          expectedResult: goalType as 'awareness' | 'engagement' | 'conversion' | 'retention',
          rationale: `Week ${week}: ${quantity}x ${format} on "${topic}" for ${goalType}`,
        });

        assetCounter += quantity;
      }
    });
  }

  // Estimate results (using ROI calculator baseline)
  const estimatedMetrics = estimateBatchResults(roadmap, goal);

  return {
    roadmap,
    totalAssets: roadmap.reduce((sum, p) => sum + p.quantity, 0),
    totalWeeks: goal.duration,
    estimatedBudget: Math.round(goal.budget),
    estimatedImpressions: estimatedMetrics.impressions,
    estimatedConversions: estimatedMetrics.conversions,
    timeToProduction: calculateProductionTime(roadmap),
    status: 'planning',
  };
};

export const executeBatch = async (batch: BatchResult): Promise<BatchResult> => {
  // Simulate batch generation (in production: call actual generation API)
  batch.status = 'generating';

  // Group by format for parallel generation
  const byFormat = groupBy(batch.roadmap, 'format');

  // Simulate parallel generation
  const promises = Object.entries(byFormat).map(([format, plans]) => new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[SmartBatch] Generated ${plans.reduce((s, p) => s + p.quantity, 0)} ${format}s`);
        resolve(true);
      }, Math.random() * 2000); // Simulate generation time
    }));

  await Promise.all(promises);

  batch.status = 'complete';
  return batch;
};

/**
 * Advanced: Auto-generate batches for multiple quarters with carry-over
 */
export const generateMultiQuarterStrategy = (
  goal: Omit<StrategyGoal, 'quarterGoal'> & { year: number },
  quarters: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4']
): Record<string, BatchResult> => {
  const results: Record<string, BatchResult> = {};
  let carryoverTopics: string[] = [];

  quarters.forEach((quarter) => {
    const quarterGoal =
      quarter === 'Q1'
        ? 'awareness'
        : quarter === 'Q2'
          ? 'engagement'
          : quarter === 'Q3'
            ? 'conversion'
            : 'retention';

    const batch = generateSmartBatch({
      ...goal,
      quarterGoal,
    });

    // Mix new topics with carryover for consistency
    const newTopics = batch.roadmap.map((p) => p.topic).filter((t) => !carryoverTopics.includes(t));
    carryoverTopics = [...carryoverTopics.slice(0, 2), ...newTopics.slice(0, 2)];

    results[quarter] = batch;
  });

  return results;
};

// ============ HELPERS ============

const extractGoalType = (quarterGoal: string): string => {
  const lower = quarterGoal.toLowerCase();
  if (lower.includes('awareness') || lower.includes('reach')) return 'awareness';
  if (lower.includes('engagement') || lower.includes('interaction')) return 'engagement';
  if (lower.includes('conversion') || lower.includes('sale')) return 'conversion';
  if (lower.includes('retention') || lower.includes('loyalty')) return 'retention';
  return 'awareness';
};

const calculateAssetsPerWeek = (duration: number, budget: number, goalType: string): number => {
  // Higher engagement goals need more assets
  const assetMultiplier = { awareness: 1, engagement: 1.3, conversion: 0.9, retention: 1.5 }[goalType] || 1;

  // Budget scales assets: $500/week = ~3 assets
  const budgetPerWeek = budget / Math.max(duration, 1);
  const baseAssets = Math.ceil((budgetPerWeek / 500) * 3);

  return Math.ceil(baseAssets * assetMultiplier);
};

const estimateBatchResults = (roadmap: BatchPlan[], goal: StrategyGoal) => {
  // Simplified estimation (would use ROI calculator in production)
  const benchmarks: Record<string, Record<string, { engagement: number; conversion: number }>> = {
    carousel: {
      awareness: { engagement: 0.10, conversion: 0.02 },
      engagement: { engagement: 0.12, conversion: 0.025 },
      conversion: { engagement: 0.08, conversion: 0.04 },
      retention: { engagement: 0.06, conversion: 0.03 },
    },
    reel: {
      awareness: { engagement: 0.16, conversion: 0.03 },
      engagement: { engagement: 0.20, conversion: 0.04 },
      conversion: { engagement: 0.14, conversion: 0.06 },
      retention: { engagement: 0.12, conversion: 0.04 },
    },
    story: {
      awareness: { engagement: 0.20, conversion: 0.04 },
      engagement: { engagement: 0.25, conversion: 0.05 },
      conversion: { engagement: 0.18, conversion: 0.08 },
      retention: { engagement: 0.28, conversion: 0.06 },
    },
  };

  let totalImpressions = 0;
  let totalConversions = 0;

  roadmap.forEach((plan) => {
    const benchmark = benchmarks[plan.format]?.[plan.expectedResult] || { engagement: 0.1, conversion: 0.02 };
    const costPerAsset = goal.budget / roadmap.reduce((s, p) => s + p.quantity, 0);
    const impressionsPerAsset = (costPerAsset / 0.05) * plan.quantity; // CPM $0.05

    totalImpressions += impressionsPerAsset;
    totalConversions += Math.ceil(impressionsPerAsset * benchmark.engagement * benchmark.conversion);
  });

  return {
    impressions: Math.round(totalImpressions),
    conversions: Math.round(totalConversions),
  };
};

const calculateProductionTime = (roadmap: BatchPlan[]): string => {
  const totalAssets = roadmap.reduce((sum, p) => sum + p.quantity, 0);
  // Assume 5 min generation + 2 min review per asset
  const minutesNeeded = totalAssets * 7;
  const hours = Math.ceil(minutesNeeded / 60);

  if (hours < 1) return `${minutesNeeded} minutes`;
  if (hours < 24) return `${hours} hours`;
  return `${Math.ceil(hours / 24)} days`;
};

const groupBy = <T extends object>(arr: T[], key: keyof T): Record<string, T[]> => arr.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
