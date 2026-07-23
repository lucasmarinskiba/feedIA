import express, { type Request, type Response } from 'express';
import { getOrchestrationService } from '../../services/orchestration-service';

const router = express.Router();

/**
 * POST /api/generators/offer
 * Generate 10 complete offer angles
 */
router.post('/offer', async (req: Request, res: Response) => {
  try {
    const { product, targetCustomer, uniqueAdvantage, painPoints, priceRange } = req.body;

    if (!product || !targetCustomer || !uniqueAdvantage || !painPoints || !priceRange) {
      return res.status(400).json({
        error: 'Missing required fields: product, targetCustomer, uniqueAdvantage, painPoints, priceRange',
      });
    }

    const service = getOrchestrationService();
    const result = await service.generateOffer({
      product,
      targetCustomer,
      uniqueAdvantage,
      painPoints,
      priceRange,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[/api/generators/offer] Error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * POST /api/generators/growth-plan
 * Generate 90-day growth strategy
 */
router.post('/growth-plan', async (req: Request, res: Response) => {
  try {
    const { growthTarget, currentState, product, targetCustomer, positioning } = req.body;

    if (!growthTarget || !currentState || !product || !targetCustomer || !positioning) {
      return res.status(400).json({
        error: 'Missing required fields: growthTarget, currentState, product, targetCustomer, positioning',
      });
    }

    const service = getOrchestrationService();
    const result = await service.generateGrowthPlan({
      growthTarget,
      currentState,
      product,
      targetCustomer,
      positioning,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[/api/generators/growth-plan] Error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * POST /api/generators/sales-system
 * Generate 7-touch sales system
 */
router.post('/sales-system', async (req: Request, res: Response) => {
  try {
    const { prospectProfile, offer, prospectList } = req.body;

    if (!prospectProfile || !offer || !prospectList || !Array.isArray(prospectList)) {
      return res.status(400).json({
        error: 'Missing required fields: prospectProfile (object), offer (object), prospectList (array)',
      });
    }

    const service = getOrchestrationService();
    const result = await service.generateSalesSystem({
      prospectProfile,
      offer,
      prospectList,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[/api/generators/sales-system] Error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * POST /api/generators/community-charter
 * Generate 12-month community blueprint
 */
router.post('/community-charter', async (req: Request, res: Response) => {
  try {
    const { purpose, targetMember, identity, growthGoal } = req.body;

    if (!purpose || !targetMember || !identity || !growthGoal) {
      return res.status(400).json({
        error: 'Missing required fields: purpose, targetMember, identity, growthGoal',
      });
    }

    const service = getOrchestrationService();
    const result = await service.generateCommunityCharter({
      purpose,
      targetMember,
      identity,
      growthGoal,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[/api/generators/community-charter] Error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * POST /api/generators/product-roadmap
 * Generate 90-day PMF validation roadmap
 */
router.post('/product-roadmap', async (req: Request, res: Response) => {
  try {
    const { hedgehog, customerInsights, positioning } = req.body;

    if (!hedgehog || !customerInsights || !positioning) {
      return res.status(400).json({
        error: 'Missing required fields: hedgehog, customerInsights, positioning',
      });
    }

    const service = getOrchestrationService();
    const result = await service.generateProductRoadmap({
      hedgehog,
      customerInsights,
      positioning,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[/api/generators/product-roadmap] Error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
