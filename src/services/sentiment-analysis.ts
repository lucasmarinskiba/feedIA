/**
 * Sentiment Analysis Engine
 * Analyze comment sentiment → extract themes, predict virality, detect toxicity
 */

export interface SentimentScore {
  positive: number;
  neutral: number;
  negative: number;
  overall: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface CommentAnalysis {
  commentId: string;
  text: string;
  sentiment: SentimentScore;
  themes: string[];
  emotionalTone: string;
  toxicity: number;
  viralityIndicators: string[];
}

export interface ContentSentimentReport {
  contentId: string;
  totalComments: number;
  avgSentiment: SentimentScore;
  topThemes: Array<{ theme: string; frequency: number }>;
  commonEmotions: string[];
  viralityScore: number;
  toxicityLevel: 'safe' | 'caution' | 'dangerous';
  insights: string[];
}

const commentAnalyses: Map<string, CommentAnalysis> = new Map();
const contentReports: Map<string, ContentSentimentReport> = new Map();

export const analyzeComment = (commentId: string, text: string): CommentAnalysis => {
  const sentiment = calculateSentiment(text);
  const themes = extractThemes(text);
  const emotionalTone = inferEmotion(text);
  const toxicity = calculateToxicity(text);
  const viralityIndicators = detectViralPatterns(text);

  const analysis: CommentAnalysis = {
    commentId,
    text,
    sentiment,
    themes,
    emotionalTone,
    toxicity,
    viralityIndicators,
  };

  commentAnalyses.set(commentId, analysis);
  console.log('[SentimentAnalysis] Comment analyzed:', { commentId, sentiment: sentiment.overall });

  return analysis;
};

export const generateSentimentReport = (contentId: string, commentIds: string[]): ContentSentimentReport => {
  const analyses = commentIds.map((id) => commentAnalyses.get(id)).filter((a) => a !== undefined) as CommentAnalysis[];

  if (analyses.length === 0) {
    return {
      contentId,
      totalComments: 0,
      avgSentiment: { positive: 0, neutral: 0.5, negative: 0, overall: 'neutral', confidence: 0 },
      topThemes: [],
      commonEmotions: [],
      viralityScore: 0,
      toxicityLevel: 'safe',
      insights: [],
    };
  }

  // Average sentiment
  const avgSentiment: SentimentScore = {
    positive: analyses.reduce((sum, a) => sum + a.sentiment.positive, 0) / analyses.length,
    neutral: analyses.reduce((sum, a) => sum + a.sentiment.neutral, 0) / analyses.length,
    negative: analyses.reduce((sum, a) => sum + a.sentiment.negative, 0) / analyses.length,
    overall: analyses[0]!.sentiment.overall,
    confidence: analyses.reduce((sum, a) => sum + a.sentiment.confidence, 0) / analyses.length,
  };

  // Top themes
  const themeCounts: Record<string, number> = {};
  analyses.forEach((a) => {
    a.themes.forEach((t) => {
      themeCounts[t] = (themeCounts[t] ?? 0) + 1;
    });
  });
  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, frequency]) => ({ theme, frequency }));

  // Common emotions
  const emotionCounts: Record<string, number> = {};
  analyses.forEach((a) => {
    emotionCounts[a.emotionalTone] = (emotionCounts[a.emotionalTone] ?? 0) + 1;
  });
  const commonEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion);

  // Virality score (positive sentiment + emoji/exclamation usage)
  const viralityScore = avgSentiment.positive * 100 + analyses.filter((a) => a.viralityIndicators.length > 0).length;

  // Toxicity level
  const avgToxicity = analyses.reduce((sum, a) => sum + a.toxicity, 0) / analyses.length;
  let toxicityLevel: 'safe' | 'caution' | 'dangerous' = 'safe';
  if (avgToxicity > 0.3) toxicityLevel = 'caution';
  if (avgToxicity > 0.6) toxicityLevel = 'dangerous';

  // Insights
  const insights: string[] = [];
  if (avgSentiment.positive > 0.7) insights.push('Overwhelmingly positive sentiment—high engagement quality');
  if (avgSentiment.negative > 0.3) insights.push('Negative sentiment detected—review for issues');
  if (topThemes[0] && topThemes[0].frequency > analyses.length * 0.3)
    insights.push(`Strong theme consistency ("${topThemes[0].theme}")—resonates with audience`);

  const report: ContentSentimentReport = {
    contentId,
    totalComments: analyses.length,
    avgSentiment,
    topThemes,
    commonEmotions,
    viralityScore,
    toxicityLevel,
    insights,
  };

  contentReports.set(contentId, report);
  return report;
};

export const getPredominantSentiment = (contentId: string): 'positive' | 'neutral' | 'negative' => {
  const report = contentReports.get(contentId);
  if (!report) return 'neutral';

  const sentiments = [
    { type: 'positive', score: report.avgSentiment.positive },
    { type: 'neutral', score: report.avgSentiment.neutral },
    { type: 'negative', score: report.avgSentiment.negative },
  ];

  return sentiments.sort((a, b) => b.score - a.score)[0]?.type as 'positive' | 'neutral' | 'negative';
};

// ============ HELPERS ============

const calculateSentiment = (text: string): SentimentScore => {
  const lower = text.toLowerCase();

  let positive = 0.3;
  let negative = 0.1;

  // Positive signals
  if (lower.includes('love') || lower.includes('amazing') || lower.includes('great')) positive += 0.3;
  if (lower.includes('!!') || lower.includes('😍') || lower.includes('🔥')) positive += 0.2;

  // Negative signals
  if (lower.includes('hate') || lower.includes('awful') || lower.includes('terrible')) negative += 0.3;
  if (lower.includes('...') && text.length < 50) negative += 0.2;

  const neutral = Math.max(0, 1 - positive - negative);
  const overall: 'positive' | 'neutral' | 'negative' = positive > 0.5 ? 'positive' : negative > 0.5 ? 'negative' : 'neutral';

  return {
    positive: Math.min(1, positive),
    neutral,
    negative: Math.min(1, negative),
    overall,
    confidence: 0.75,
  };
};

const extractThemes = (text: string): string[] => {
  const lower = text.toLowerCase();
  const themes: string[] = [];

  if (lower.includes('product') || lower.includes('quality')) themes.push('product-quality');
  if (lower.includes('delivery') || lower.includes('fast')) themes.push('shipping-speed');
  if (lower.includes('price') || lower.includes('cost')) themes.push('pricing');
  if (lower.includes('customer') || lower.includes('service')) themes.push('customer-service');
  if (lower.includes('inspiring') || lower.includes('motivation')) themes.push('inspiration');

  return themes.length > 0 ? themes : ['general'];
};

const inferEmotion = (text: string): string => {
  const lower = text.toLowerCase();

  if (lower.includes('wow') || lower.includes('amazing')) return 'amazement';
  if (lower.includes('sad') || lower.includes('disappointed')) return 'disappointment';
  if (lower.includes('angry') || lower.includes('frustrated')) return 'frustration';
  if (lower.includes('grateful') || lower.includes('thank')) return 'gratitude';

  return 'neutral';
};

const calculateToxicity = (text: string): number => {
  const lower = text.toLowerCase();
  let toxicity = 0;

  if (lower.includes('hate') || lower.includes('kill')) toxicity += 0.5;
  if (lower.includes('stupid') || lower.includes('idiot')) toxicity += 0.3;
  if (lower.match(/[A-Z]{3,}/)) toxicity += 0.1; // ALL CAPS

  return Math.min(1, toxicity);
};

const detectViralPatterns = (text: string): string[] => {
  const patterns: string[] = [];

  if (text.includes('!!') || text.includes('🔥')) patterns.push('high-energy');
  if (text.length > 100) patterns.push('detailed-feedback');
  if (text.includes('@')) patterns.push('tag-mention');
  if (text.includes('http')) patterns.push('link-share');

  return patterns;
};
