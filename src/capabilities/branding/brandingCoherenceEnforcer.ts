/**
 * Phase 22: Branding Coherence Enforcer
 *
 * Cross-post coherence: fonts/colors/tone/narrative consistency per account
 */

import { log } from '../../agent/logger.js';
import { getUserBrandProfile } from './multiUserBrandingEngine.js';

export interface PostAnalysis {
  postId: string;
  userId: string;
  type: 'carousel' | 'reel' | 'story' | 'tiktok';
  fonts: string[];
  colors: string[];
  tone: string[];
  topic: string;
}

export interface BrandCoherenceReport {
  userId: string;
  postsAnalyzed: number;
  scores: {
    visualCoherence: number;
    messagingCoherence: number;
    narrativeCoherence: number;
    overallCoherence: number;
  };
  issues: string[];
}

export const generateBrandCoherenceReport = (userId: string, posts: PostAnalysis[]): BrandCoherenceReport => {
  log.info(`[Phase 22] Coherence report: ${userId} (${posts.length} posts)`);

  const userBrand = getUserBrandProfile(userId);
  if (!userBrand) {
    return {
      userId,
      postsAnalyzed: 0,
      scores: { visualCoherence: 0, messagingCoherence: 0, narrativeCoherence: 0, overallCoherence: 0 },
      issues: ['No brand profile'],
    };
  }

  const allColors = new Set(posts.flatMap((p) => p.colors));
  let visualCoherence = Math.max(0, 100 - Math.max(0, allColors.size - 5) * 10);

  const allTones = new Set(posts.flatMap((p) => p.tone));
  let messagingCoherence = Math.max(0, 100 - Math.max(0, allTones.size - 3) * 15);

  const topics = new Set(posts.map((p) => p.topic));
  let narrativeCoherence = topics.size <= 2 ? 95 : topics.size >= posts.length * 0.8 ? 40 : 70;

  const overallCoherence = Math.round((visualCoherence + messagingCoherence + narrativeCoherence) / 3);

  const issues: string[] = [];
  if (visualCoherence < 70) issues.push(`Color inconsistency: ${allColors.size} colors`);
  if (messagingCoherence < 70) issues.push(`Tone scattered: ${allTones.size} tones`);

  return { userId, postsAnalyzed: posts.length, scores: { visualCoherence, messagingCoherence, narrativeCoherence, overallCoherence }, issues };
};

log.info('[Phase 22] Branding Coherence Enforcer ✅');
