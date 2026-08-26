/**
 * Strategic Reasoning API Routes
 * /api/strategy/* — competitive analysis, pricing, budget, positioning
 */

import { Router, Request, Response } from 'express';
import {
  analyzeCompetitors,
  recommendPricing,
  allocateBudget,
  positionAgainstCompetitors,
  runFullAnalysis,
  type CompetitorProfile,
  type StrategicContext,
} from '../services/strategic-reasoning.js';

const router = Router();

/**
 * POST /api/strategy/analyze-competitors
 * Competitive analysis: average pricing, threats, gaps
 *
 * Request:
 * {
 *   "competitors": [
 *     { "name": "Stripe", "pricing": 2.9, "features": [...], "positioning": "...", "weaknesses": [...] },
 *     ...
 *   ]
 * }
 *
 * Response:
 * {
 *   "averagePrice": 89,
 *   "priceRange": [29, 299],
 *   "topThreats": [{ name, features, pricing }, ...],
 *   "gapOpportunities": ["feature1", "feature2", ...]
 * }
 */
router.post('/analyze-competitors', async (req: Request, res: Response): Promise<void> => {
  try {
    const { competitors } = req.body as { competitors: CompetitorProfile[] };

    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return res.status(400).json({ error: 'competitors array required (min 1)' });
      return;
    }

    const analysis = analyzeCompetitors(competitors);

    console.log('[StrategicReasoning] Competitive analysis:', {
      averagePrice: analysis.averagePrice,
      threats: analysis.topThreats.length,
      gaps: analysis.gapOpportunities.length,
    });

    return res.json({
      success: true,
      analysis,
      summary: `Market avg: $${analysis.averagePrice}. Range: $${analysis.priceRange[0]}-$${analysis.priceRange[1]}. Top 3 threats identified. ${analysis.gapOpportunities.length} unmet feature opportunities.`,
    });
  } catch (err) {
    console.error('[CompetitiveAnalysis] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/strategy/recommend-pricing
 * Pricing strategy based on context + competitors
 *
 * Request:
 * {
 *   "context": {
 *     "ourPrice": 99,
 *     "ourFeatures": ["feature1", "feature2"],
 *     "competitorCount": 5,
 *     "marketSize": 10000,
 *     "growthRate": 15
 *   },
 *   "competitors": [...]
 * }
 *
 * Response:
 * {
 *   "recommendedPrice": 79,
 *   "competitivePosition": "value",
 *   "pricePoints": [{ price, elasticity }, ...],
 *   "rationale": "..."
 * }
 */
router.post('/recommend-pricing', async (req: Request, res: Response): Promise<void> => {
  try {
    const { context, competitors } = req.body as {
      context: StrategicContext;
      competitors: CompetitorProfile[];
    };

    if (!context || !competitors) {
      return res.status(400).json({ error: 'context and competitors required' });
      return;
    }

    const recommendation = recommendPricing(context, competitors);

    console.log('[StrategicReasoning] Pricing recommendation:', {
      recommended: recommendation.recommendedPrice,
      position: recommendation.competitivePosition,
    });

    return res.json({
      success: true,
      recommendation,
      summary: `${recommendation.competitivePosition.toUpperCase()} positioning. Recommended: $${recommendation.recommendedPrice}/mo. ${recommendation.rationale}`,
    });
  } catch (err) {
    console.error('[PricingRecommendation] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/strategy/allocate-budget
 * Budget allocation based on growth stage
 *
 * Request:
 * {
 *   "monthlyRevenue": 50000,
 *   "growthRate": 25
 * }
 *
 * Response:
 * {
 *   "marketing": 30,
 *   "product": 30,
 *   "ops": 30,
 *   "reserve": 10,
 *   "rationale": "..."
 * }
 */
router.post('/allocate-budget', async (req: Request, res: Response): Promise<void> => {
  try {
    const { monthlyRevenue, growthRate } = req.body as { monthlyRevenue: number; growthRate: number };

    if (monthlyRevenue === undefined || growthRate === undefined) {
      return res.status(400).json({ error: 'monthlyRevenue and growthRate required' });
      return;
    }

    const allocation = allocateBudget(monthlyRevenue, growthRate);

    console.log('[StrategicReasoning] Budget allocation:', {
      revenue: monthlyRevenue,
      growth: growthRate,
      stage: growthRate < 10 ? 'bootstrap' : growthRate < 50 ? 'scaling' : 'hypergrowth',
    });

    const dollarsPercentages = {
      marketing: Math.round((monthlyRevenue * allocation.marketing) / 100),
      product: Math.round((monthlyRevenue * allocation.product) / 100),
      ops: Math.round((monthlyRevenue * allocation.ops) / 100),
      reserve: Math.round((monthlyRevenue * allocation.reserve) / 100),
    };

    return res.json({
      success: true,
      allocation,
      dollars: dollarsPercentages,
      summary: `At ${growthRate}% MoM: Marketing ${allocation.marketing}% ($${dollarsPercentages.marketing}), Product ${allocation.product}% ($${dollarsPercentages.product}), Ops ${allocation.ops}% ($${dollarsPercentages.ops}), Reserve ${allocation.reserve}% ($${dollarsPercentages.reserve}).`,
    });
  } catch (err) {
    console.error('[BudgetAllocation] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/strategy/position
 * Generate positioning statement vs main competitor
 *
 * Request:
 * {
 *   "ourFeatures": ["feature1", "feature2"],
 *   "mainCompetitor": { "name": "Stripe", "features": [...], ... },
 *   "targetSegment": "creator" | "enterprise" | "general"
 * }
 *
 * Response:
 * {
 *   "coreMessage": "Creators first. Built for creators from day 1.",
 *   "targetSegment": "creator",
 *   "defensibleAdvantage": "AI-powered recommendations",
 *   "vs": "Stripe",
 *   "nextSteps": [...]
 * }
 */
router.post('/position', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ourFeatures, mainCompetitor, targetSegment } = req.body as {
      ourFeatures: string[];
      mainCompetitor: CompetitorProfile;
      targetSegment: string;
    };

    if (!ourFeatures || !mainCompetitor || !targetSegment) {
      return res.status(400).json({ error: 'ourFeatures, mainCompetitor, targetSegment required' });
      return;
    }

    const positioning = positionAgainstCompetitors(ourFeatures, mainCompetitor, targetSegment);

    console.log('[StrategicReasoning] Positioning generated:', {
      segment: targetSegment,
      vs: mainCompetitor.name,
      advantage: positioning.defensibleAdvantage,
    });

    return res.json({
      success: true,
      positioning,
      summary: `Message: "${positioning.coreMessage}" (vs ${mainCompetitor.name} for ${targetSegment}s). Defensible on: ${positioning.defensibleAdvantage}.`,
    });
  } catch (err) {
    console.error('[Positioning] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/strategy/full-analysis
 * Complete strategic analysis (all four dimensions)
 *
 * Request:
 * {
 *   "context": { ourPrice, ourFeatures, competitorCount, marketSize, growthRate },
 *   "competitors": [...],
 *   "targetSegment": "creator"
 * }
 *
 * Response:
 * {
 *   "competitiveAnalysis": {...},
 *   "pricingRecommendation": {...},
 *   "budgetAllocation": {...},
 *   "positioning": {...}
 * }
 */
router.post('/full-analysis', async (req: Request, res: Response): Promise<void> => {
  try {
    const { context, competitors, targetSegment } = req.body as {
      context: StrategicContext;
      competitors: CompetitorProfile[];
      targetSegment: string;
    };

    if (!context || !competitors || !targetSegment) {
      return res.status(400).json({ error: 'context, competitors, targetSegment required' });
      return;
    }

    const analysis = runFullAnalysis(context, competitors, targetSegment);

    console.log('[StrategicReasoning] Full analysis complete:', {
      competitors: competitors.length,
      recommendedPrice: analysis.pricingRecommendation.recommendedPrice,
      position: analysis.pricingRecommendation.competitivePosition,
      segment: targetSegment,
    });

    return res.json({
      success: true,
      analysis,
      executive_summary: `
Market: ${competitors.length} competitors, avg price $${analysis.competitiveAnalysis.averagePrice}.
Recommendation: ${analysis.pricingRecommendation.competitivePosition.toUpperCase()} position at $${analysis.pricingRecommendation.recommendedPrice}/mo.
Budget: ${analysis.budgetAllocation.rationale}
Positioning: ${analysis.positioning.coreMessage}
      `.trim(),
    });
  } catch (err) {
    console.error('[FullAnalysis] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
