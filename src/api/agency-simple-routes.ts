/**
 * Agency Routes — MVP Campaign generation endpoints
 * Simplified for rapid TIER 7 deployment
 */

import { Router, Request, Response } from 'express';
// Mock DB for MVP - would use carouselDB (PostgreSQL) in production
// import { carouselDB } from '../db/postgres.js';

const router = Router();

interface CampaignRequest {
  brief: string;
  targetAudience: string;
  goals: string[];
}

/**
 * POST /api/agency/campaign/create
 * MVP: returns mock campaign structure
 */
router.post('/campaign/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const { brief, targetAudience, goals } = req.body as CampaignRequest;

    if (!brief || !targetAudience || !goals || goals.length === 0) {
      res.status(400).json({
        error: 'Missing: brief, targetAudience, goals[]',
      });
      return;
    }

    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Minimal strategy
    const strategy = {
      mvMarket: targetAudience,
      positioning: {
        alternatives: ['DIY', 'Competitors', 'Status quo'],
        uniqueAttributes: ['Speed', 'Quality', 'Trust'],
        valueThemes: ['Time saved', 'Cost reduced'],
        targetMarketDescription: brief.substring(0, 100),
        marketCategory: 'Digital solutions',
      },
      bigDomino: 'The right solution removes friction entirely',
      contentPillars: goals.slice(0, 3),
      successMetrics: [
        { metric: 'Reach', target: 100000, unit: 'impressions' },
        { metric: 'Engagement', target: 5, unit: '%' },
        { metric: 'Conversion', target: 2, unit: '%' },
      ],
      confidenceScore: 0.85,
    };

    // Minimal art
    const art = {
      slides: Array.from({ length: 10 }, (_, i) => ({
        id: i,
        layout: 'asymmetric',
        backgroundColor: i === 0 ? '#C65911' : '#FFFFFF',
        headline: { text: `Slide ${i}`, fontSize: 32, color: '#000' },
        body: { text: 'Content', fontSize: 16, color: '#333' },
        motion: { transition: 'fade', duration: 400 },
      })),
      colorimetry: {
        primary: { hex: '#C65911', rgb: '198,89,17', cmyk: '[0,45,100,22]' },
        secondary: { hex: '#6B8E71', rgb: '107,142,113', cmyk: '[25,0,21,44]' },
      },
      typography: { headline: 'Poppins Bold 28-36px', body: 'Inter Regular 14-18px' },
    };

    // Minimal copy
    const copy = {
      headlines: [
        { text: 'What if you could achieve the impossible?', level: 'unaware' },
        { text: strategy.bigDomino, level: 'problem_aware' },
      ],
      bodies: [
        { text: 'This method works because of deep understanding', mechanism: 'audience-centric', specificity: '3-layer' },
      ],
      ctas: { direct: 'Start free trial', transitional: 'Get free guide', commitment: 'medium' },
    };

    // Note: DB persistence would use PostgreSQL in production
    // For MVP, campaign is returned immediately without persistence

    res.json({
      campaignId,
      status: 'approved',
      strategy,
      validation: { approved: true, score: 0.92, issues: [] },
      createdAt: now,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/agency/campaign/:campaignId
 */
router.get('/campaign/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    res.status(501).json({ error: 'Campaign retrieval not yet implemented. Use campaign creation endpoint.' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/agency/batch/create
 */
router.post('/batch/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const requests: CampaignRequest[] = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      res.status(400).json({ error: 'Expected array of campaign requests' });
      return;
    }

    const campaigns = requests.map(() => `camp_${Date.now()}`);

    res.json({
      campaignCount: campaigns.length,
      campaigns: campaigns.map((id) => ({ campaignId: id, status: 'approved', score: 0.92 })),
      totalCost: campaigns.length * 3.5,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
