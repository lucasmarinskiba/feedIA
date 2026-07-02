/**
 * Phase 16: Content Coherence Validator
 *
 * Validates multi-post coherence (carousel + video + story in same week)
 * Ensures feed tells cohesive story, not scattered content
 */

import { log } from '../../agent/logger.js';

export interface ContentPiece {
  type: 'carousel' | 'video' | 'story' | 'reel';
  topic: string;
  narrative?: string; // Story arc description
  emotion: string;
  fonts: string[];
  colors: string[];
  tone: string;
  cta: string;
}

export interface ContentWeek {
  week: string; // "Week of Jan 6"
  posts: ContentPiece[];
  coherence: {
    visualCoherence: number; // 0-100
    narrativeCoherence: number; // 0-100
    emotionalCoherence: number; // 0-100
    coreMessageCoherence: number; // 0-100
    overallCoherence: number; // 0-100
  };
  issues: string[];
  recommendations: string[];
  feedStory: string; // What story does this week tell?
}

export const validateWeeklyCoherence = (posts: ContentPiece[]): ContentWeek => {
  log.info(`[Coherence] Validating ${posts.length} posts for weekly coherence`);

  // ── Visual Coherence ──────────────────────────────────────────

  const uniqueFonts = new Set(posts.flatMap((p) => p.fonts));
  const uniqueColors = new Set(posts.flatMap((p) => p.colors));

  let visualCoherence = 100;
  if (uniqueFonts.size > 3) {
    visualCoherence -= (uniqueFonts.size - 3) * 15; // Penalize extra fonts
  }
  if (uniqueColors.size > 6) {
    visualCoherence -= (uniqueColors.size - 6) * 10; // Penalize extra colors
  }

  // ── Narrative Coherence ──────────────────────────────────────

  const narratives = posts.map((p) => p.narrative || p.topic);
  const uniqueNarratives = new Set(narratives);

  let narrativeCoherence = 100;
  if (uniqueNarratives.size === posts.length) {
    // All posts have different narratives
    narrativeCoherence = 40; // Scattered
  } else if (uniqueNarratives.size <= 2) {
    // All posts share 1-2 narratives
    narrativeCoherence = 95; // Highly coherent
  } else {
    narrativeCoherence = 60 + (1 - uniqueNarratives.size / posts.length) * 40;
  }

  // ── Emotional Coherence ──────────────────────────────────────

  const emotions = new Set(posts.map((p) => p.emotion));
  let emotionalCoherence = 100;

  if (emotions.size === 1) {
    emotionalCoherence = 100; // Perfect: same emotion
  } else if (emotions.size === 2) {
    emotionalCoherence = 85; // Good: primary + secondary emotion
  } else if (emotions.size === 3) {
    emotionalCoherence = 60; // Moderate: multiple emotions
  } else {
    emotionalCoherence = 30; // Poor: too many emotional directions
  }

  // ── Core Message Coherence ──────────────────────────────────

  // Check if posts support a common theme
  const topics = posts.map((p) => p.topic);
  const ctas = posts.map((p) => p.cta);

  let coreMessageCoherence = 100;

  // Bonus if CTAs align
  const uniqueCTAs = new Set(ctas);
  if (uniqueCTAs.size === 1) {
    coreMessageCoherence += 10; // All CTAs same = unified call
  }

  // Deduct if topics scattered
  if (topics.length > 2) {
    const uniqueTopics = new Set(topics);
    if (uniqueTopics.size >= topics.length * 0.8) {
      coreMessageCoherence -= 20; // Too many different topics
    }
  }

  // ── Issue Detection ──────────────────────────────────────────

  const issues: string[] = [];

  if (visualCoherence < 70) {
    issues.push(
      `Visual incoherence: ${uniqueFonts.size} fonts, ${uniqueColors.size} colors. Lock to 2-3 fonts, 3-5 colors.`,
    );
  }

  if (narrativeCoherence < 50) {
    issues.push(`Posts have disconnected narratives. No clear feed story.`);
  }

  if (emotionalCoherence < 40) {
    issues.push(`Emotional whiplash. Posts jump between ${emotions.size} different emotions.`);
  }

  if (posts.length === 1) {
    issues.push(`Only 1 post. Need 2+ for coherence analysis. Build week with related content.`);
  }

  if (posts.some((p) => p.type === 'carousel' && !p.narrative)) {
    issues.push(`Carousel missing narrative. Add story arc to maintain thread.`);
  }

  // ── Recommendations ──────────────────────────────────────────

  const recommendations: string[] = [];

  if (uniqueFonts.size > 3) {
    recommendations.push(`Lock fonts to top 2-3 (currently using ${uniqueFonts.size}).`);
  }

  if (uniqueColors.size > 6) {
    recommendations.push(`Lock color palette to 4-6 (currently using ${uniqueColors.size}).`);
  }

  if (emotions.size > 2) {
    recommendations.push(`Pick 1-2 primary emotions. Current: ${Array.from(emotions).join(', ')}`);
  }

  if (narrativeCoherence < 70) {
    recommendations.push(`Create overarching weekly theme. Connect posts via narrative or topic.`);
  }

  // ── Feed Story ────────────────────────────────────────────────

  let feedStory = '';

  if (narrativeCoherence > 80) {
    feedStory = `Cohesive week. All posts build toward: ${topics[0]}. Emotional arc: ${Array.from(emotions).join(' → ')}.`;
  } else if (narrativeCoherence > 50) {
    feedStory = `Partially coherent. Main theme: ${topics[0]}. Secondary topics: ${topics.slice(1).join(', ')}.`;
  } else {
    feedStory = `Scattered content. No clear weekly narrative. Topics: ${topics.join(', ')}.`;
  }

  // ── Overall Coherence ────────────────────────────────────────

  const overallCoherence = Math.round(
    (visualCoherence + narrativeCoherence + emotionalCoherence + coreMessageCoherence) / 4,
  );

  log.info(
    `[Coherence] Score: ${overallCoherence}/100 (Visual=${visualCoherence}, Narrative=${narrativeCoherence}, Emotion=${emotionalCoherence}, Message=${coreMessageCoherence})`,
  );

  return {
    week: new Date().toISOString().split('T')[0],
    posts,
    coherence: {
      visualCoherence,
      narrativeCoherence,
      emotionalCoherence,
      coreMessageCoherence,
      overallCoherence,
    },
    issues,
    recommendations,
    feedStory,
  };
};

// ── Feed-Level Coherence (30+ posts) ──────────────────────────────

export interface AccountCoherence {
  postsAnalyzed: number;
  timeframe: string; // "Past 30 days"
  coherence: {
    brandConsistency: number;
    audienceResonance: number;
    contentDiversity: number;
    narrativeArc: number;
    overallAccountCoherence: number;
  };
  visualIdentity: {
    primaryFonts: string[];
    primaryColors: string[];
    dominantLayout: string;
  };
  topicClusters: Array<{topic: string; frequency: number; posts: number}>;
  issues: string[];
  recommendations: string[];
}

export const validateAccountCoherence = (weeklyScores: ContentWeek[]): AccountCoherence => {
  log.info(`[Account Coherence] Analyzing ${weeklyScores.length} weeks`);

  const allPosts = weeklyScores.flatMap((w) => w.posts);

  // Brand consistency: average visual coherence
  const brandConsistency = Math.round(
    weeklyScores.reduce((sum, w) => sum + w.coherence.visualCoherence, 0) / weeklyScores.length,
  );

  // Audience resonance: average emotional coherence
  const audienceResonance = Math.round(
    weeklyScores.reduce((sum, w) => sum + w.coherence.emotionalCoherence, 0) / weeklyScores.length,
  );

  // Content diversity: variety of post types
  const postTypes = new Set(allPosts.map((p) => p.type));
  const contentDiversity = Math.min(100, postTypes.size * 25); // 4 types = 100

  // Narrative arc: narrative consistency over time
  const narrativeArc = Math.round(
    weeklyScores.reduce((sum, w) => sum + w.coherence.narrativeCoherence, 0) / weeklyScores.length,
  );

  // Overall
  const overallAccountCoherence = Math.round(
    (brandConsistency + audienceResonance + contentDiversity + narrativeArc) / 4,
  );

  // Visual identity
  const allFonts = allPosts.flatMap((p) => p.fonts);
  const fontFreq = new Map<string, number>();
  allFonts.forEach((f) => fontFreq.set(f, (fontFreq.get(f) || 0) + 1));
  const primaryFonts = Array.from(fontFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([f]) => f);

  const allColors = allPosts.flatMap((p) => p.colors);
  const colorFreq = new Map<string, number>();
  allColors.forEach((c) => colorFreq.set(c, (colorFreq.get(c) || 0) + 1));
  const primaryColors = Array.from(colorFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  // Topic clusters
  const topicFreq = new Map<string, number>();
  allPosts.forEach((p) => {
    topicFreq.set(p.topic, (topicFreq.get(p.topic) || 0) + 1);
  });
  const topicClusters = Array.from(topicFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic, frequency]) => ({
      topic,
      frequency,
      posts: allPosts.filter((p) => p.topic === topic).length,
    }));

  // Issues
  const issues: string[] = [];
  if (brandConsistency < 70) issues.push(`Brand inconsistency. Fonts/colors vary too much.`);
  if (audienceResonance < 60) issues.push(`Emotional messaging scattered. Pick 1-2 primary emotions.`);
  if (contentDiversity < 50) issues.push(`Content limited to ${postTypes.size} type(s). Diversify.`);
  if (narrativeArc < 60) issues.push(`No clear account narrative. Topics jump around.`);

  // Recommendations
  const recommendations: string[] = [];
  if (primaryFonts.length >= 1)
    recommendations.push(`Lock fonts: ${primaryFonts.slice(0, 2).join(', ')}`);
  if (primaryColors.length >= 1)
    recommendations.push(`Lock colors: ${primaryColors.slice(0, 3).join(', ')}`);
  if (topicClusters.length > 3) recommendations.push(`Focus on top 2-3 topics. Current: ${topicClusters.map((t) => t.topic).join(', ')}`);

  return {
    postsAnalyzed: allPosts.length,
    timeframe: `Past ${weeklyScores.length} weeks`,
    coherence: {
      brandConsistency,
      audienceResonance,
      contentDiversity,
      narrativeArc,
      overallAccountCoherence,
    },
    visualIdentity: {
      primaryFonts,
      primaryColors,
      dominantLayout: 'image-text-overlay', // Could analyze deeper
    },
    topicClusters,
    issues,
    recommendations,
  };
};
