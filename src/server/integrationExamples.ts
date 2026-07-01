/**
 * Expert Integration Examples for Sala Endpoints
 *
 * Estos ejemplos muestran cómo integrar Expert Guidance Middleware
 * en cada endpoint de Sala.
 *
 * Copiar + adaptar para cada endpoint real en extendedRoutes.ts
 */

import { log } from '../agent/logger.js';
import { withExpertGuidance, getExpertRecommendations } from './middleware/expertGuidanceMiddleware.js';

// ── Example 1: Home Dashboard ─────────────────────────────────────────

/**
 * GET /api/home/dashboard
 * Current: returns { kpis, activities, recommendations, ... }
 * Enhanced: adds expertGuidance layer
 */
export const homeDashboardWithExperts = async (_brandId: string): Promise<unknown> => {
  // Build normal response
  const normalResponse = {
    kpis: [
      { metric: 'followers', value: 15420, trend: '+3.2%' },
      { metric: 'engagement', value: 4.8, unit: '%' },
      { metric: 'reach', value: 128500, trend: '+12%' },
    ],
    activities: [
      { type: 'post', timestamp: '2h ago', result: '+450 likes' },
      { type: 'story', timestamp: '30m ago', result: 'viewed by 2.3k' },
    ],
    recommendations: ['Post about trending topic X', 'Engage with top 5 followers'],
  };

  // Enrich with expert guidance
  const enriched = await withExpertGuidance('home', normalResponse);

  return enriched;
  // Returns:
  // {
  //   data: { kpis, activities, recommendations },
  //   expertGuidance: {
  //     disciplines: ['Administration', 'Strategy', 'Psychology'],
  //     keyRecommendations: [
  //       'Define clear workflows: input → process → output',
  //       'Automate repetitive tasks (batch operations preferred)',
  //       'Track KPIs: completion time, error rate, user satisfaction'
  //     ],
  //     qualityThresholds: { completion-time: '< 15min', user-satisfaction: '> 4.5/5' }
  //   },
  //   metadata: { enrichedAt: '2026-07-01T...', expertCount: 3 }
  // }
};

// ── Example 2: Calendar Events ────────────────────────────────────────

/**
 * GET /api/calendar/events
 * Enhanced with Marketing + Admin + Data expert guidance
 */
export const calendarEventsWithExperts = async (_brandId: string): Promise<unknown> => {
  const normalResponse = {
    events: [
      { date: '2026-07-05', content: 'Carousel', status: 'scheduled', expectedReach: 15000 },
      { date: '2026-07-07', content: 'Reel', status: 'draft', expectedReach: 25000 },
    ],
    schedule: {
      postsPerWeek: 5,
      optimalTimes: ['9 AM', '2 PM', '6 PM'],
      gaps: ['Tuesday afternoon', 'Saturday'],
    },
  };

  const enriched = await withExpertGuidance('calendar', normalResponse);

  // Extract expert recommendations for calendar specifically
  const recommendations = await getExpertRecommendations('calendar', 3);
  (enriched.data as Record<string, unknown>).expertTips = recommendations;

  return enriched;
  // enriched.data.expertTips will include:
  // - "Audience segmentation: create buyer personas..."
  // - "Channel strategy: where audience spends time (data-driven)..."
  // - "Testing framework: A/B test copy, design, CTAs always..."
};

// ── Example 3: Brújula (Daily Direction) ──────────────────────────────

/**
 * GET /api/brujula/today
 * Enhanced with Strategy + Marketing + Psychology
 */
export const brujujaWithExperts = async (_brandId: string): Promise<unknown> => {
  const normalResponse = {
    priority: 'Publish carousel on productivity (planned)',
    actions: [
      { order: 1, action: 'Review analytics from yesterday', time: '10 min' },
      { order: 2, action: 'Engage with 10 followers in DMs', time: '20 min' },
      { order: 3, action: 'Publish prepared carousel', time: '5 min' },
    ],
    focus: 'Boost engagement + consistency',
    expectedImpact: '+500 reach, +3% engagement',
  };

  const enriched = await withExpertGuidance('brujula', normalResponse);

  return enriched;
  // enriched.expertGuidance.keyRecommendations from Strategy + Psychology experts:
  // - "Long-term vision: 3-year roadmap (milestones, metrics)"
  // - "Pattern interrupt: break monotony to grab attention"
  // - "Loss aversion: fear of loss stronger than hope of gain (use scarcity)"
};

// ── Example 4: Intelligence (Analytics) ───────────────────────────────

/**
 * GET /api/intelligence/insights
 * Enhanced with Data + Strategy + Branding
 */
export const intelligenceWithExperts = async (_brandId: string): Promise<unknown> => {
  const normalResponse = {
    insights: [
      { finding: 'Carousel posts get 3.2x more saves than Reels', actionable: true },
      { finding: 'Peak engagement at 6 PM (Friday)', actionable: true },
      { finding: 'Video content from competitors trending', actionable: true },
    ],
    anomalies: [{ metric: 'reach', change: '+25%', explanation: 'Viral post from influencer share' }],
    recommendations: ['Double down on carousel format', 'Test 6 PM posting time', 'Create video response'],
  };

  const enriched = await withExpertGuidance('inteligencia', normalResponse);

  return enriched;
  // enriched.expertGuidance from Data + Strategy experts:
  // - "Metrics hierarchy: 1 north star metric (growth/revenue/engagement)"
  // - "SWOT analysis: quarterly review (Strengths, Weaknesses, Opportunities, Threats)"
};

// ── Example 5: Forge (Creative Creation) ──────────────────────────────

/**
 * POST /api/forge/create
 * Enhanced with Design + Visual + Branding + Psychology
 */
export const forgeWithExperts = async (_brandId: string, _briefData: unknown): Promise<unknown> => {
  const normalResponse = {
    designPath: 'Carousel 10-slide',
    recommendations: {
      colorPalette: ['#E91E8C', '#22D3EE'],
      typography: 'Poppins Bold + Inter Regular',
      layout: 'Full-bleed with centered text',
      imagery: 'Silueta + abstract',
    },
    estimatedTime: '45 min to design + export',
  };

  const enriched = await withExpertGuidance('forge', normalResponse);

  return enriched;
  // enriched.expertGuidance from Design + Visual + Branding + Psychology:
  // - "Form follows function: design solves problems (never decoration-first)"
  // - "Hierarchy: guide eye from primary → secondary → tertiary"
  // - "Brand essence: one sentence core identity (mission + personality)"
  // - "Emotional hooks: fear, hope, joy, anger (pick ONE emotion per message)"
};

log.info('[Integration Examples] Expert guidance integration examples ready for copy-paste into endpoints');

/**
 * Implementation checklist for each Sala endpoint:
 *
 * 1. Import: import { withExpertGuidance } from './middleware/expertGuidanceMiddleware.js';
 * 2. Build normal response (existing logic)
 * 3. Enrich: const enriched = await withExpertGuidance('toolName', response);
 * 4. Return: json(res, 200, enriched);
 * 5. Test: verify expertGuidance object appears in response
 *
 * Tools and their expert assignments:
 * - home: ['admin', 'strategy', 'psychology']
 * - calendar: ['admin', 'marketing', 'data']
 * - brujula: ['strategy', 'marketing', 'psychology']
 * - inteligencia: ['data', 'strategy', 'branding']
 * - imperio: ['admin', 'strategy', 'sales', 'data']
 * - forge: ['design', 'visual', 'branding', 'psychology']
 * - pizarra: ['design', 'strategy', 'visual', 'admin']
 * - assistant: ['marketing', 'psychology', 'admin']
 * - workspace: ['admin', 'strategy', 'data']
 * - cuToolbox: ['design', 'psychology', 'sales']
 */
