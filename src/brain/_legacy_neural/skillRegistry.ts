// @ts-nocheck
/**
 * Skill Registry — catálogo de todas las skills FeedIA con metadata.
 *
 * Cada entry tiene: id, category, capabilities, trigger conditions,
 * estimated cost/duration, module path, y mapping a métricas neurales
 * que esta skill puede mover.
 *
 * Permite al autonomyCore decidir qué skill invocar basado en
 * el estado actual (cuellos de botella, métricas, contexto).
 */

import type { MetricName } from './feedbackLoop.js';
import type { RLAction } from './reinforcementEngine.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type SkillCategory =
  | 'content-generation' // creates content
  | 'content-distribution' // publishes
  | 'audience-analysis' // analyzes
  | 'engagement' // interactions
  | 'optimization' // improvements
  | 'monetization' // sales
  | 'strategy' // planning
  | 'safety' // protection
  | 'meta'; // about skills themselves

export interface SkillMetadata {
  id: string; // 'feedIA-quick-carousel'
  name: string;
  category: SkillCategory;
  capabilities: string[]; // qué hace
  triggers: TriggerCondition[]; // cuándo activar
  movesMetrics: MetricName[]; // qué métricas puede mejorar
  mapsToActions: RLAction[]; // qué acciones RL son equivalentes
  estimatedDurationMs: number;
  estimatedCostUsd: number;
  requiresAuth: boolean;
  requiresPlan: 'free' | 'pro' | 'business' | 'enterprise';
  modulePath?: string; // 'src/capabilities/quickCarousel/quickCarousel.js'
  apiEndpoint?: string;
  dependencies: string[]; // otras skills que invoca internamente
  outputs: string[]; // qué genera
}

export interface TriggerCondition {
  type: 'metric-low' | 'metric-high' | 'bottleneck' | 'time' | 'event' | 'manual';
  metric?: MetricName;
  threshold?: number;
  event?: string;
}

// ── Registry ─────────────────────────────────────────────────────────────────

export const SKILL_REGISTRY: Record<string, SkillMetadata> = {
  // ── Content generation ────────────────────────────────────────────────────
  'feedIA-quick-carousel': {
    id: 'feedIA-quick-carousel',
    name: 'Quick Carousel',
    category: 'content-generation',
    capabilities: ['generate-carousel', 'design-briefs', 'caption-aida', 'hashtag-pyramid'],
    triggers: [
      { type: 'bottleneck', metric: 'engagement_rate' },
      { type: 'bottleneck', metric: 'content_frequency' },
      { type: 'manual' },
    ],
    movesMetrics: ['engagement_rate', 'reach_rate', 'follower_growth', 'caption_performance'],
    mapsToActions: ['post-carousel-educational', 'post-carousel-entertainment'],
    estimatedDurationMs: 45_000,
    estimatedCostUsd: 0.15,
    requiresAuth: true,
    requiresPlan: 'free',
    modulePath: 'capabilities/quickCarousel/quickCarousel.js',
    apiEndpoint: 'POST /api/me/carousel/full',
    dependencies: ['feedIA-aida-copywriter', 'feedIA-humanizer', 'feedIA-hashtag-science'],
    outputs: ['slides', 'caption', 'hashtags', 'cover', 'design-briefs'],
  },

  'feedIA-reel-studio': {
    id: 'feedIA-reel-studio',
    name: 'Reel Studio',
    category: 'content-generation',
    capabilities: ['reel-script', 'storyboard', 'hook-variants', 'series'],
    triggers: [
      { type: 'bottleneck', metric: 'reach_rate' },
      { type: 'metric-low', metric: 'engagement_rate', threshold: 0.3 },
    ],
    movesMetrics: ['reach_rate', 'engagement_rate', 'follower_growth'],
    mapsToActions: ['post-reel-trending', 'post-reel-tutorial'],
    estimatedDurationMs: 60_000,
    estimatedCostUsd: 0.2,
    requiresAuth: true,
    requiresPlan: 'free',
    modulePath: 'capabilities/quickReel/quickReel.js',
    apiEndpoint: 'POST /api/me/reel/full',
    dependencies: ['feedIA-reel-hook-master'],
    outputs: ['script', 'scenes', 'cover', 'caption', 'hashtags'],
  },

  'feedIA-quick-story': {
    id: 'feedIA-quick-story',
    name: 'Quick Story',
    category: 'content-generation',
    capabilities: ['story-series', 'interactive-stickers', 'polls', 'quizzes'],
    triggers: [{ type: 'bottleneck', metric: 'engagement_rate' }, { type: 'manual' }],
    movesMetrics: ['engagement_rate', 'follower_growth', 'caption_performance'],
    mapsToActions: ['post-story-poll', 'post-story-behind-scenes'],
    estimatedDurationMs: 20_000,
    estimatedCostUsd: 0.08,
    requiresAuth: true,
    requiresPlan: 'free',
    modulePath: 'capabilities/quickStory/quickStory.js',
    apiEndpoint: 'POST /api/me/story/full',
    dependencies: ['feedIA-story-engagement-stacker'],
    outputs: ['frames', 'interactive-elements'],
  },

  // ── Content distribution ──────────────────────────────────────────────────
  'feedIA-carousel-pipeline': {
    id: 'feedIA-carousel-pipeline',
    name: 'Carousel Pipeline',
    category: 'content-distribution',
    capabilities: ['render-png', 'render-canva', 'render-fal-ai', 'upload-instagram'],
    triggers: [{ type: 'event', event: 'carousel-package-ready' }],
    movesMetrics: ['content_frequency'],
    mapsToActions: ['post-carousel-educational'],
    estimatedDurationMs: 30_000,
    estimatedCostUsd: 0.05,
    requiresAuth: true,
    requiresPlan: 'free',
    modulePath: 'capabilities/quickCarousel/carouselPipeline.js',
    dependencies: [],
    outputs: ['png-files', 'upload-result', 'published-url'],
  },

  // ── Audience analysis ─────────────────────────────────────────────────────
  'feedIA-buyer-persona': {
    id: 'feedIA-buyer-persona',
    name: 'Buyer Persona',
    category: 'audience-analysis',
    capabilities: ['audit-account', 'build-personas', 'content-ideas'],
    triggers: [
      { type: 'time', event: 'monthly' },
      { type: 'metric-low', metric: 'audience_alignment', threshold: 0.5 },
    ],
    movesMetrics: ['audience_alignment'],
    mapsToActions: [],
    estimatedDurationMs: 45_000,
    estimatedCostUsd: 0.3,
    requiresAuth: true,
    requiresPlan: 'pro',
    modulePath: 'capabilities/buyerPersona/buyerPersonaBuilder.js',
    dependencies: [],
    outputs: ['audit-report', 'personas', 'content-ideas'],
  },

  'feedIA-competitor-profiling': {
    id: 'feedIA-competitor-profiling',
    name: 'Competitor Profiling',
    category: 'audience-analysis',
    capabilities: ['analyze-competitors', 'extract-strategies', 'content-gaps'],
    triggers: [
      { type: 'metric-low', metric: 'reach_rate', threshold: 0.4 },
      { type: 'time', event: 'weekly' },
    ],
    movesMetrics: ['reach_rate', 'hashtag_effectiveness'],
    mapsToActions: [],
    estimatedDurationMs: 60_000,
    estimatedCostUsd: 0.25,
    requiresAuth: true,
    requiresPlan: 'pro',
    modulePath: 'capabilities/computerUse/competitorAdaptation.js',
    dependencies: [],
    outputs: ['report', 'insights', 'content-ideas'],
  },

  // ── Engagement ────────────────────────────────────────────────────────────
  'feedIA-faq': {
    id: 'feedIA-faq',
    name: 'FAQ Agent',
    category: 'engagement',
    capabilities: ['auto-reply', 'knowledge-base'],
    triggers: [
      { type: 'event', event: 'new-comment' },
      { type: 'event', event: 'new-dm' },
    ],
    movesMetrics: ['engagement_rate'],
    mapsToActions: ['engage-reply-comments', 'engage-dm-followup'],
    estimatedDurationMs: 5_000,
    estimatedCostUsd: 0.01,
    requiresAuth: true,
    requiresPlan: 'free',
    modulePath: 'capabilities/faqAgent/faqAgent.js',
    dependencies: [],
    outputs: ['responses'],
  },

  'feedIA-broadcast-channels': {
    id: 'feedIA-broadcast-channels',
    name: 'Broadcast Channels',
    category: 'engagement',
    capabilities: ['channel-broadcasts', 'polls', 'audio-notes'],
    triggers: [{ type: 'time', event: 'daily' }, { type: 'manual' }],
    movesMetrics: ['engagement_rate', 'audience_alignment'],
    mapsToActions: [],
    estimatedDurationMs: 8_000,
    estimatedCostUsd: 0.03,
    requiresAuth: true,
    requiresPlan: 'pro',
    dependencies: [],
    outputs: ['broadcast-message'],
  },

  // ── Optimization ──────────────────────────────────────────────────────────
  'feedIA-bio-optimizer': {
    id: 'feedIA-bio-optimizer',
    name: 'Bio Optimizer',
    category: 'optimization',
    capabilities: ['bio-variants', 'highlights', 'link-in-bio'],
    triggers: [
      { type: 'metric-low', metric: 'audience_alignment', threshold: 0.5 },
      { type: 'time', event: 'monthly' },
    ],
    movesMetrics: ['audience_alignment', 'conversion_rate'],
    mapsToActions: ['update-bio-cta'],
    estimatedDurationMs: 30_000,
    estimatedCostUsd: 0.15,
    requiresAuth: true,
    requiresPlan: 'free',
    modulePath: 'capabilities/bioOptimizer/bioOptimizer.js',
    dependencies: [],
    outputs: ['bio-variants', 'highlight-system', 'link-in-bio'],
  },

  'feedIA-hashtag-science': {
    id: 'feedIA-hashtag-science',
    name: 'Hashtag Scientist',
    category: 'optimization',
    capabilities: ['research-hashtags', 'pyramid', 'shadowban-detect'],
    triggers: [
      { type: 'metric-low', metric: 'hashtag_effectiveness', threshold: 0.4 },
      { type: 'event', event: 'before-post' },
    ],
    movesMetrics: ['hashtag_effectiveness', 'reach_rate'],
    mapsToActions: ['rotate-hashtags'],
    estimatedDurationMs: 30_000,
    estimatedCostUsd: 0.1,
    requiresAuth: true,
    requiresPlan: 'free',
    modulePath: 'capabilities/hashtagScientist/deepResearch.js',
    dependencies: [],
    outputs: ['hashtag-set', 'rotation-strategy'],
  },

  'feedIA-explore-optimizer': {
    id: 'feedIA-explore-optimizer',
    name: 'Explore Page Optimizer',
    category: 'optimization',
    capabilities: ['explore-audit', 'recipe', 'watch-time-boost'],
    triggers: [
      { type: 'metric-low', metric: 'reach_rate', threshold: 0.3 },
      { type: 'event', event: 'goal-viralizar' },
    ],
    movesMetrics: ['reach_rate', 'follower_growth'],
    mapsToActions: ['post-reel-trending'],
    estimatedDurationMs: 20_000,
    estimatedCostUsd: 0.08,
    requiresAuth: true,
    requiresPlan: 'free',
    dependencies: [],
    outputs: ['audit-report', 'post-recipe', 'recommendations'],
  },

  'feedIA-humanizer': {
    id: 'feedIA-humanizer',
    name: 'Text Humanizer',
    category: 'optimization',
    capabilities: ['humanize-text', 'style-guide', 'detect-ai'],
    triggers: [{ type: 'event', event: 'pre-publish' }],
    movesMetrics: ['caption_performance', 'engagement_rate'],
    mapsToActions: [],
    estimatedDurationMs: 8_000,
    estimatedCostUsd: 0.02,
    requiresAuth: true,
    requiresPlan: 'free',
    modulePath: 'capabilities/humanizer/textHumanizer.js',
    dependencies: [],
    outputs: ['humanized-text', 'style-guide'],
  },

  // ── Monetization ──────────────────────────────────────────────────────────
  'feedIA-shopping-tags': {
    id: 'feedIA-shopping-tags',
    name: 'Shopping Tags',
    category: 'monetization',
    capabilities: ['product-tags', 'shop-tab-optimize'],
    triggers: [{ type: 'metric-low', metric: 'conversion_rate', threshold: 0.3 }],
    movesMetrics: ['conversion_rate'],
    mapsToActions: [],
    estimatedDurationMs: 15_000,
    estimatedCostUsd: 0.05,
    requiresAuth: true,
    requiresPlan: 'business',
    dependencies: [],
    outputs: ['tagging-strategy'],
  },

  'feedIA-meta-ads': {
    id: 'feedIA-meta-ads',
    name: 'Meta Ads',
    category: 'monetization',
    capabilities: ['campaigns', 'audiences', 'creatives', 'budget'],
    triggers: [{ type: 'event', event: 'boost-needed' }, { type: 'manual' }],
    movesMetrics: ['reach_rate', 'conversion_rate'],
    mapsToActions: ['boost-post-ads'],
    estimatedDurationMs: 30_000,
    estimatedCostUsd: 0.2,
    requiresAuth: true,
    requiresPlan: 'pro',
    modulePath: 'capabilities/ads/metaAds.js',
    dependencies: [],
    outputs: ['campaigns', 'ad-sets', 'ads'],
  },

  // ── Strategy ──────────────────────────────────────────────────────────────
  'feedIA-content-strategy': {
    id: 'feedIA-content-strategy',
    name: 'Content Strategy',
    category: 'strategy',
    capabilities: ['pillars', 'topic-clusters', 'roadmap'],
    triggers: [
      { type: 'time', event: 'monthly' },
      { type: 'bottleneck', metric: 'brand_coherence' },
    ],
    movesMetrics: ['brand_coherence', 'content_frequency'],
    mapsToActions: [],
    estimatedDurationMs: 60_000,
    estimatedCostUsd: 0.35,
    requiresAuth: true,
    requiresPlan: 'pro',
    dependencies: ['feedIA-buyer-persona'],
    outputs: ['pillars', 'calendar', 'topic-clusters'],
  },

  'feedIA-calendar': {
    id: 'feedIA-calendar',
    name: 'Editorial Calendar',
    category: 'strategy',
    capabilities: ['monthly-calendar', 'auto-distribution'],
    triggers: [{ type: 'time', event: 'monthly' }],
    movesMetrics: ['content_frequency', 'brand_coherence'],
    mapsToActions: [],
    estimatedDurationMs: 90_000,
    estimatedCostUsd: 0.5,
    requiresAuth: true,
    requiresPlan: 'pro',
    modulePath: 'capabilities/editorialCalendar/calendarBuilder.js',
    dependencies: ['feedIA-content-strategy'],
    outputs: ['calendar', 'entries'],
  },

  // ── Safety ────────────────────────────────────────────────────────────────
  'feedIA-crisis': {
    id: 'feedIA-crisis',
    name: 'Crisis Management',
    category: 'safety',
    capabilities: ['crisis-detect', 'response-protocol', 'escalation'],
    triggers: [
      { type: 'event', event: 'negative-sentiment-spike' },
      { type: 'event', event: 'crisis-trigger' },
    ],
    movesMetrics: [],
    mapsToActions: ['pause-publishing'],
    estimatedDurationMs: 10_000,
    estimatedCostUsd: 0.05,
    requiresAuth: true,
    requiresPlan: 'free',
    dependencies: [],
    outputs: ['response-plan', 'statements'],
  },

  // ── Computer Use (Brain-Aware) ────────────────────────────────────────────
  'feedIA-cu-brain-aware': {
    id: 'feedIA-cu-brain-aware',
    name: 'Brain-Aware Computer Use',
    category: 'content-distribution',
    capabilities: ['browser-automation', 'memory-enriched', 'safety-gated', 'rl-feedback'],
    triggers: [{ type: 'event', event: 'cu-task' }, { type: 'manual' }],
    movesMetrics: ['content_frequency', 'engagement_rate'],
    mapsToActions: ['post-carousel-educational', 'post-reel-trending', 'engage-reply-comments'],
    estimatedDurationMs: 120_000,
    estimatedCostUsd: 0.2,
    requiresAuth: true,
    requiresPlan: 'pro',
    modulePath: 'capabilities/computerUse/brainAwareCu.js',
    apiEndpoint: 'POST /api/cu/brain-aware/run',
    dependencies: ['feedIA-cu', 'feedIA-memory'],
    outputs: ['session-events', 'screenshots', 'episodic-memory'],
  },

  // ── Meta ──────────────────────────────────────────────────────────────────
  'feedIA-skill-creator': {
    id: 'feedIA-skill-creator',
    name: 'Skill Creator',
    category: 'meta',
    capabilities: ['create-skill', 'optimize-skill', 'eval'],
    triggers: [{ type: 'manual' }],
    movesMetrics: [],
    mapsToActions: [],
    estimatedDurationMs: 30_000,
    estimatedCostUsd: 0.1,
    requiresAuth: true,
    requiresPlan: 'business',
    dependencies: [],
    outputs: ['new-skill-md', 'eval-results'],
  },
};

// ── Query helpers ────────────────────────────────────────────────────────────

export const findSkillsByCategory = (category: SkillCategory): SkillMetadata[] =>
  Object.values(SKILL_REGISTRY).filter((s) => s.category === category);

export const findSkillsForMetric = (metric: MetricName): SkillMetadata[] =>
  Object.values(SKILL_REGISTRY).filter((s) => s.movesMetrics.includes(metric));

export const findSkillsForAction = (action: RLAction): SkillMetadata[] =>
  Object.values(SKILL_REGISTRY).filter((s) => s.mapsToActions.includes(action));

export const findSkillsByTrigger = (
  type: TriggerCondition['type'],
  context?: { metric?: MetricName; event?: string },
): SkillMetadata[] =>
  Object.values(SKILL_REGISTRY).filter((s) =>
    s.triggers.some((t) => {
      if (t.type !== type) return false;
      if (context?.metric && t.metric !== context.metric) return false;
      if (context?.event && t.event !== context.event) return false;
      return true;
    }),
  );

export const getSkill = (id: string): SkillMetadata | undefined => SKILL_REGISTRY[id];

export const allSkillIds = (): string[] => Object.keys(SKILL_REGISTRY);

export const skillsByPlan = (plan: SkillMetadata['requiresPlan']): SkillMetadata[] => {
  const order = ['free', 'pro', 'business', 'enterprise'];
  const userIdx = order.indexOf(plan);
  return Object.values(SKILL_REGISTRY).filter((s) => order.indexOf(s.requiresPlan) <= userIdx);
};
