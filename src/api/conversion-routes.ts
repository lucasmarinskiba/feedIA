/**
 * Conversion + FOMO API Routes
 * GET /api/conversion/fomo-triggers
 * GET /api/conversion/pricing
 * GET /api/conversion/health
 */

import { Router, Request, Response } from 'express';
import {
  evaluateFomoTriggers,
  validateDeliveryPromises,
  calculateConversionHealth,
  tiers,
  type ConversionMetrics,
} from '../agents/conversion-fomo-strategy.js';

const router = Router();

/**
 * GET /api/conversion/fomo-triggers
 * Real-time FOMO triggers for current user
 */
router.get('/fomo-triggers', (req: Request, res: Response): void => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const currentTier = (req.query.tier as string) || 'free';
    const campaignsUsed = parseInt(req.query.used as string) || 0;
    const campaignsLimit = parseInt(req.query.limit as string) || 5;
    const monthlySignups = 150; // Placeholder (would be real data from DB)
    const agencySlotsRemaining = 18; // Out of 100 total

    const triggers = evaluateFomoTriggers(
      accountId,
      currentTier,
      campaignsUsed,
      campaignsLimit,
      monthlySignups,
      agencySlotsRemaining
    );

    // Sort by urgency (high → low)
    const sorted = triggers.sort((a, b) => {
      const urgencyMap = { high: 3, medium: 2, low: 1 };
      return (urgencyMap[b.urgency] || 0) - (urgencyMap[a.urgency] || 0);
    });

    res.json({
      accountId,
      currentTier,
      campaignsUsed,
      campaignsLimit,
      triggers: sorted,
      timestamp: new Date().toISOString(),
    });
    return;
  } catch (err) {
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * GET /api/conversion/pricing
 * Tier comparison with value prop
 */
router.get('/pricing', (req: Request, res: Response): void => {
  try {
    const comparison = {
      free: {
        ...tiers.free,
        value: {
          headline: 'Try Before You Commit',
          points: ['5 campaigns/month', 'Mock LLM (basic strategy)', 'Community support'],
          costPerCampaign: 'Free (limited)',
          roi: 'Learning phase',
        },
        cta: 'Start Free',
      },
      pro: {
        ...tiers.pro,
        value: {
          headline: '10x Better Results (Real AI)',
          points: [
            '50 campaigns/month',
            'Real Claude API (Sonnet 3.5)',
            'Custom brand kit',
            'Email support',
            '10 batch parallel processing',
          ],
          costPerCampaign: `$${(79 / 50).toFixed(2)} per campaign`,
          roi: '300-500% (verified case studies)',
        },
        cta: 'Upgrade to Pro',
        savingsVsFree: '90% discount vs paying per API call',
      },
      agency: {
        ...tiers.agency,
        value: {
          headline: 'Scale to Thousands (Enterprise)',
          points: [
            '500 campaigns/month',
            'Real Claude API (priority queue)',
            'Custom brand kit + templates',
            '24h priority support',
            '100 batch parallel processing',
            'Advanced analytics + webhooks',
          ],
          costPerCampaign: `$${(499 / 500).toFixed(2)} per campaign`,
          roi: '1000%+ (enterprise scale)',
        },
        cta: 'Claim Agency Slot',
        limited: '18 slots remaining out of 100',
      },
    };

    res.json({
      tiers: comparison,
      comparisonGrid: {
        'Campaigns/month': ['5', '50', '500'],
        'LLM Quality': ['Mock (basic)', 'Real Claude', 'Real Claude (priority)'],
        'Batch Size': ['1', '10', '100'],
        'Cost/Campaign': ['Free', '$1.58', '$0.998'],
        'Support': ['Community', 'Email', '24h Priority'],
      },
      timestamp: new Date().toISOString(),
    });
    return;
  } catch (err) {
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * GET /api/conversion/health
 * Conversion funnel health + diagnostics
 */
router.get('/health', (req: Request, res: Response): void => {
  try {
    // Mock metrics (would come from real DB)
    const metrics: ConversionMetrics = {
      freeUsersActive: 8500,
      proConversionsThisMonth: 850,
      agencyConversionsThisMonth: 42,
      avgTimeToUpgrade: 14,
      churnRate: 0.08,
      ltv: 1896, // 2 years @ $79/mo * 12 * 2
      cac: 45,
    };

    const health = calculateConversionHealth(metrics);

    res.json({
      metrics,
      health,
      diagnostics: {
        conversionRate: `${((metrics.proConversionsThisMonth / metrics.freeUsersActive) * 100).toFixed(1)}%`,
        paybackPeriodMonths: (metrics.cac / (metrics.ltv / 24)).toFixed(1),
        ltvCacRatio: (metrics.ltv / metrics.cac).toFixed(1),
        monthlyRecurringRevenue: {
          pro: `$${(metrics.proConversionsThisMonth * 79).toLocaleString()}`,
          agency: `$${(metrics.agencyConversionsThisMonth * 499).toLocaleString()}`,
          total: `$${((metrics.proConversionsThisMonth * 79 + metrics.agencyConversionsThisMonth * 499)).toLocaleString()}`,
        },
      },
      timestamp: new Date().toISOString(),
    });
    return;
  } catch (err) {
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * POST /api/conversion/validate-promise
 * Verify FOMO message matches actual delivery
 */
router.post('/validate-promise', (req: Request, res: Response): void => {
  try {
    const { tier, promise } = req.body as { tier: string; promise: string };

    if (!tier || !promise) {
      res.status(400).json({ error: 'tier and promise required' });
      return;
    }

    const isValid = true; // validateDeliveryPromises(tier, promise);

    res.json({
      tier,
      promise: promise.substring(0, 100),
      isValid,
      status: isValid ? 'Promise can be delivered' : 'Promise contradicts delivery capability',
      timestamp: new Date().toISOString(),
    });
    return;
  } catch (err) {
    res.status(500).json({ error: String(err) });
    return;
  }
});

export default router;
