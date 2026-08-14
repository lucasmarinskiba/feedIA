/**
 * Prompt Index & Selection Engine
 * Intelligent prompt matching based on user intent + format
 * Indexes 30K+ prompts from all batches (28-98)
 */

export type ContentFormat = 'carousel' | 'story' | 'reel' | 'tiktok' | 'any';
export type ContentCategory =
  | 'product'
  | 'lifestyle'
  | 'educational'
  | 'entertainment'
  | 'viral'
  | 'brand'
  | 'personal'
  | 'food'
  | 'sports'
  | 'any';

export interface PromptMetadata {
  batchId: number;
  format: ContentFormat;
  category: ContentCategory;
  description: string;
  keywordTags: string[];
  audienceType?: string;
}

export interface PromptRecord {
  id: string;
  prompt: string;
  metadata: PromptMetadata;
  relevanceScore?: number;
}

export interface UserIntent {
  format: ContentFormat;
  category: ContentCategory;
  topic: string;
  brandVoice?: string;
  targetAudience?: string;
  style?: string;
}

// Batch metadata (from memory docs)
const batchMetadata: Record<number, Partial<PromptMetadata>> = {
  28: { category: 'product', description: 'Construction, nano-banana, branding' },
  29: { category: 'product', description: 'Logo design, premium products' },
  30: { category: 'viral', description: 'Viral content, celebrity' },
  58: { category: 'food', description: 'Culinary macro, character' },
  59: { category: 'food', description: 'Fantasy, beverage, hands' },
  60: { category: 'lifestyle', description: 'Lifestyle, beauty' },
  65: { category: 'product', description: 'Tech macro, packaging' },
  72: { category: 'entertainment', description: 'Personified objects, video reels' },
  76: { category: 'brand', description: 'Premium branding, 3D' },
  82: { category: 'brand', description: 'Identity systems, color palettes' },
  88: { category: 'product', description: 'Product photography, commercial' },
  90: { category: 'any', description: 'Parameterized video - FACS, narrative' },
  91: { category: 'any', description: 'Advanced video - emotional, cultural' },
  92: { category: 'entertainment', description: 'Vertical engagement 15sec' },
  93: { category: 'lifestyle', description: 'Reference patterns - documentary, travel' },
  94: { category: 'sports', description: 'FIFA sports, celebrations' },
  95: { category: 'lifestyle', description: 'UGC + location content' },
  96: { category: 'lifestyle', description: 'Soft-sell marketing' },
  97: { category: 'entertainment', description: 'Stories 15-30sec' },
  98: { category: 'sports', description: 'Football memes, post-goal' },
};

// Format-to-batch mapping
const formatBatchMap: Record<ContentFormat, number[]> = {
  carousel: [28, 29, 30, 65, 76, 82, 88],
  story: [97],
  reel: [72, 90, 91, 92, 93, 94, 95, 96],
  tiktok: [92, 93, 94, 95, 96, 98],
  any: Object.keys(batchMetadata).map(Number),
};

// Category-to-batch mapping
const categoryBatchMap: Record<ContentCategory, number[]> = {
  product: [28, 29, 65, 88],
  lifestyle: [60, 93, 95, 96],
  educational: [93],
  entertainment: [72, 92, 97],
  viral: [30, 92, 98],
  brand: [29, 76, 82],
  personal: [60, 95],
  food: [58, 59],
  sports: [94, 98],
  any: Object.keys(batchMetadata).map(Number),
};

/**
 * Score relevance of batch to user intent (0-1)
 * Now includes quality boost from feedback ratings
 */
async function scoreBatch(batchId: number, intent: UserIntent): Promise<number> {
  let score = 0;

  // Format match (50% weight)
  const formatBatches = formatBatchMap[intent.format] || [];
  const formatScore = formatBatches.includes(batchId) ? 1 : 0.3;
  score += formatScore * 0.5;

  // Category match (30% weight)
  const categoryBatches = categoryBatchMap[intent.category] || [];
  const categoryScore = categoryBatches.includes(batchId) ? 1 : 0.2;
  score += categoryScore * 0.3;

  // Topic keywords (20% weight)
  const metadata = batchMetadata[batchId];
  if (metadata?.description) {
    const desc = metadata.description.toLowerCase();
    const topicWords = intent.topic.toLowerCase().split(' ');
    const keywordMatches = topicWords.filter((word) => desc.includes(word)).length;
    const topicScore = Math.min(1, keywordMatches / Math.max(1, topicWords.length));
    score += topicScore * 0.2;
  }

  // Apply quality boost from user feedback (dynamic weight)
  try {
    const { getQualityWeightBoost } = await import('./feedback-service.js');
    const qualityBoost = await getQualityWeightBoost(batchId);
    score *= qualityBoost;
  } catch (err) {
    // Fallback to unmodified score if feedback service unavailable
    console.warn('[PromptIndex] Quality boost unavailable:', err);
  }

  return score;
}

/**
 * Select best batches for user intent (now async due to quality boost)
 */
export async function selectPromptBatches(intent: UserIntent, topN: number = 3): Promise<number[]> {
  const allBatches = Object.keys(batchMetadata).map(Number);

  const scored = await Promise.all(
    allBatches.map(async (batchId) => ({
      batchId,
      score: await scoreBatch(batchId, intent),
    })),
  );

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.batchId);
}

/**
 * Parse user intent from natural language
 */
export function parseUserIntent(userMessage: string): UserIntent {
  const msg = userMessage.toLowerCase();

  // Detect format
  let format: ContentFormat = 'any';
  if (msg.includes('carousel') || msg.includes('carrusel')) format = 'carousel';
  else if (msg.includes('story') || msg.includes('historia')) format = 'story';
  else if (msg.includes('reel') || msg.includes('video')) format = 'reel';
  else if (msg.includes('tiktok') || msg.includes('tik')) format = 'tiktok';

  // Detect category
  let category: ContentCategory = 'any';
  if (msg.includes('product') || msg.includes('producto')) category = 'product';
  else if (msg.includes('lifestyle') || msg.includes('estilo de vida')) category = 'lifestyle';
  else if (msg.includes('educat') || msg.includes('tutorial')) category = 'educational';
  else if (msg.includes('entert') || msg.includes('divert')) category = 'entertainment';
  else if (msg.includes('viral')) category = 'viral';
  else if (msg.includes('brand') || msg.includes('marca')) category = 'brand';
  else if (msg.includes('personal')) category = 'personal';
  else if (msg.includes('food') || msg.includes('comida')) category = 'food';
  else if (msg.includes('sport') || msg.includes('futbol')) category = 'sports';

  return {
    format,
    category,
    topic: userMessage,
    brandVoice: msg.includes('premium') ? 'premium' : 'casual',
    targetAudience: msg.includes('B2B') ? 'business' : 'consumer',
  };
}

/**
 * Get prompt selection for user request (now async with quality boost)
 */
export async function selectPromptsForUser(
  userMessage: string,
  topN: number = 3,
): Promise<{
  intent: UserIntent;
  selectedBatches: number[];
  description: string;
}> {
  const intent = parseUserIntent(userMessage);
  const selectedBatches = await selectPromptBatches(intent, topN);

  const descriptions = selectedBatches
    .map((batchId) => `Batch ${batchId}: ${batchMetadata[batchId]?.description || 'General'}`)
    .join(' + ');

  return {
    intent,
    selectedBatches,
    description: descriptions,
  };
}
