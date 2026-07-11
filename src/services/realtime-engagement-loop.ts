/**
 * Real-Time Engagement Loop
 *
 * Monitor post comments/replies → generate contextual responses → track engagement patterns.
 * Boosts algorithm by maintaining active conversation around content.
 *
 * Runs on schedule (cron): every 15-30 min, check new comments → respond → log patterns.
 */

import { log } from '../agent/logger.js';
import type { BrandProfile } from '../config/types.js';

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'question';
  engagementValue: number; // score for priority
}

export interface EngagementResponse {
  commentId: string;
  responseText: string;
  strategy: 'question-hook' | 'validation' | 'value-add' | 'cta-response';
  generatedAt: number;
  posted?: boolean;
}

export interface EngagementPattern {
  date: string;
  totalComments: number;
  respondedComments: number;
  responseRate: number;
  averageTimeToRespond: number; // minutes
  mostCommonSentiment: string;
  mostEffectiveStrategy: string;
  engagementLift: number; // % improvement after response
}

class RealtimeEngagementLoopService {
  private commentHistory: Map<string, Comment[]> = new Map();
  private responseLog: Map<string, EngagementResponse[]> = new Map();
  private engagementPatterns: Map<string, EngagementPattern[]> = new Map();

  /**
   * Analyze comment for sentiment + priority
   */
  private analyzeComment(comment: Comment): void {
    const text = comment.text.toLowerCase();

    // Sentiment
    if (text.includes('?')) {
      comment.sentiment = 'question';
      comment.engagementValue = 9; // Questions get priority (reply = more engagement)
    } else if (text.includes('love') || text.includes('amazing') || text.includes('!')) {
      comment.sentiment = 'positive';
      comment.engagementValue = 6;
    } else if (text.includes('hate') || text.includes('bad') || text.includes('worst')) {
      comment.sentiment = 'negative';
      comment.engagementValue = 10; // Negative needs fast response to prevent spiral
    } else {
      comment.sentiment = 'neutral';
      comment.engagementValue = 4;
    }
  }

  /**
   * Record incoming comments
   */
  recordComments(postId: string, comments: Omit<Comment, 'sentiment' | 'engagementValue'>[]): void {
    const processed: Comment[] = comments.map((c) => {
      const comment: Comment = {
        ...c,
        sentiment: 'neutral',
        engagementValue: 0,
      };
      this.analyzeComment(comment);
      return comment;
    });

    let history = this.commentHistory.get(postId);
    if (!history) {
      history = [];
      this.commentHistory.set(postId, history);
    }

    history.push(...processed);

    log.info('[EngagementLoop] Comments recorded', {
      postId,
      count: processed.length,
      questions: processed.filter((c) => c.sentiment === 'question').length,
    });
  }

  /**
   * Generate response to comment based on sentiment + strategy
   */
  generateResponse(accountHandle: string, comment: Comment, _brand?: BrandProfile): EngagementResponse {
    let strategy: EngagementResponse['strategy'];
    let responseText = '';

    if (comment.sentiment === 'question') {
      strategy = 'question-hook';
      const tone =
        typeof _brand?.voice === 'object' && 'tone' in _brand.voice
          ? (_brand.voice as Record<string, unknown>).tone
          : 'neutral';
      responseText = `Great question! 🤔 ${tone === 'friendly' ? 'Let me help!' : "Here's what we found:"} [CONTEXT FROM BRAND]`;
    } else if (comment.sentiment === 'negative') {
      strategy = 'validation';
      responseText = `Thanks for the feedback 💙. We take this seriously. [BRIEF ACKNOWLEDGMENT]. DM us for details?`;
    } else if (comment.sentiment === 'positive') {
      strategy = 'value-add';
      responseText = `Awesome! 🎉 Glad it resonated. Check out [RELATED RESOURCE] for more ideas like this.`;
    } else {
      strategy = 'cta-response';
      responseText = `Love this energy! Follow for more [CONTENT TYPE]. What topic should we cover next?`;
    }

    const response: EngagementResponse = {
      commentId: comment.id,
      responseText,
      strategy,
      generatedAt: Date.now(),
    };

    let responses = this.responseLog.get(accountHandle);
    if (!responses) {
      responses = [];
      this.responseLog.set(accountHandle, responses);
    }
    responses.push(response);

    log.info('[EngagementLoop] Response generated', {
      accountHandle,
      commentId: comment.id,
      sentiment: comment.sentiment,
      strategy,
    });

    return response;
  }

  /**
   * Analyze daily engagement patterns
   */
  analyzeEngagementPattern(postId: string, _brand?: BrandProfile): EngagementPattern | null {
    const comments = this.commentHistory.get(postId) ?? [];
    if (comments.length === 0) return null;

    const responses = Array.from(this.responseLog.values()).flat();
    const respondedCommentIds = new Set(responses.map((r) => r.commentId));

    const sentiments = comments.map((c) => c.sentiment);
    const sentimentCounts: Record<string, number> = { positive: 0, negative: 0, question: 0, neutral: 0 };
    sentiments.forEach((s) => {
      sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
    });

    const mostCommonSentiment = Object.entries(sentimentCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'neutral';

    // Strategy effectiveness (rough estimate)
    const strategyPerformance: Record<EngagementResponse['strategy'], number> = {
      'question-hook': 0,
      validation: 0,
      'value-add': 0,
      'cta-response': 0,
    };
    responses.forEach((r) => {
      strategyPerformance[r.strategy] = (strategyPerformance[r.strategy] || 0) + 1;
    });
    const mostEffectiveStrategy =
      Object.entries(strategyPerformance).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'value-add';

    // Engagement lift: assume 15-25% more reach per responded comment
    const responseRate = respondedCommentIds.size / Math.max(comments.length, 1);
    const engagementLift = responseRate * 20; // rough estimate

    const date = new Date().toISOString().split('T')[0]!;

    const pattern: EngagementPattern = {
      date,
      totalComments: comments.length,
      respondedComments: respondedCommentIds.size,
      responseRate,
      averageTimeToRespond: 15, // placeholder (would track actual times from Instagram API)
      mostCommonSentiment,
      mostEffectiveStrategy,
      engagementLift,
    };

    let patterns = this.engagementPatterns.get(postId);
    if (!patterns) {
      patterns = [];
      this.engagementPatterns.set(postId, patterns);
    }
    patterns.push(pattern);

    log.info('[EngagementLoop] Pattern analyzed', {
      postId,
      responseRate: Math.round(responseRate * 100),
      mostCommonSentiment,
      engagementLift: Math.round(engagementLift),
    });

    return pattern;
  }

  /**
   * Get recommended engagement strategy for account
   */
  getEngagementStrategy(_accountId: string): {
    priority: 'high' | 'medium' | 'low';
    recommendedAction: string;
    nextCheckIn: number; // minutes
  } {
    const allPatterns = Array.from(this.engagementPatterns.values()).flat();
    if (allPatterns.length === 0) {
      return {
        priority: 'low',
        recommendedAction: 'Start engaging with comments to boost algorithm. Target: 60% response rate.',
        nextCheckIn: 30,
      };
    }

    const avgResponseRate = allPatterns.reduce((sum, p) => sum + p.responseRate, 0) / allPatterns.length;

    if (avgResponseRate < 0.4) {
      return {
        priority: 'high',
        recommendedAction: 'Response rate too low (< 40%). Set reminder to reply within 2h of comments.',
        nextCheckIn: 15,
      };
    }

    if (avgResponseRate > 0.7) {
      return {
        priority: 'low',
        recommendedAction: 'Excellent engagement rate. Maintain current strategy.',
        nextCheckIn: 60,
      };
    }

    return {
      priority: 'medium',
      recommendedAction: 'Response rate acceptable. Focus on responding to questions (highest engagement value).',
      nextCheckIn: 30,
    };
  }

  /**
   * Get comment summary for posting window (last N hours)
   */
  getRecentCommentSummary(
    postId: string,
    hoursBack: number = 4,
  ): {
    totalComments: number;
    unrepliedComments: number;
    topSentiment: string;
    urgentComments: Comment[];
  } {
    const comments = this.commentHistory.get(postId) ?? [];
    const responses = Array.from(this.responseLog.values()).flat();
    const respondedIds = new Set(responses.map((r) => r.commentId));

    const recentThreshold = Date.now() - hoursBack * 60 * 60 * 1000;
    const recentComments = comments.filter((c) => c.timestamp > recentThreshold);

    const sentiments = recentComments.map((c) => c.sentiment);
    const sentimentCounts: Record<string, number> = { positive: 0, negative: 0, question: 0, neutral: 0 };
    sentiments.forEach((s) => {
      sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
    });

    const topSentiment = Object.entries(sentimentCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'neutral';

    const urgentComments = recentComments
      .filter((c) => c.engagementValue >= 8 && !respondedIds.has(c.id))
      .sort((a, b) => b.engagementValue - a.engagementValue);

    return {
      totalComments: recentComments.length,
      unrepliedComments: recentComments.filter((c) => !respondedIds.has(c.id)).length,
      topSentiment,
      urgentComments,
    };
  }
}

export const realtimeEngagementLoopService = new RealtimeEngagementLoopService();
