/**
 * FeedIA API Endpoints — Production-Ready Routes
 * Exposes 170+ techniques, carousel generation, prompt optimization
 */

import express, { Router, Request, Response } from 'express';
import { feediaBrain } from '../core/feedia-brain';
import { brujulaIntegration } from './brujula-carousel-integration';

const router = Router();

/**
 * GET /api/feedia/status — System intelligence report
 */
router.get('/status', (req: Request, res: Response): void => {
  const status = feediaBrain.getStatus();
  res.json({
    status: 'ready',
    system: 'FeedIA Omniscient Brain',
    version: '1.0.0',
    domains: status.domains.length,
    techniques: status.totalTechniques,
    prompts: status.totalPrompts,
    variations: status.totalVariations,
    ideas: status.totalIdeas,
    lastUpdated: status.lastUpdated,
  });
});

/**
 * GET /api/feedia/domains — List all covered domains
 */
router.get('/domains', (req: Request, res: Response): void => {
  const domains = feediaBrain.getDomains();
  res.json({ domains, count: domains.length });
});

/**
 * GET /api/feedia/prompt — Get random prompt (optionally filtered by domain)
 */
router.get('/prompt', (req: Request, res: Response): void => {
  const domain = req.query.domain as string | undefined;
  const prompt = feediaBrain.getRandomPrompt(domain);
  res.json({ prompt, domain: domain || 'all' });
});

/**
 * GET /api/feedia/ideas — Get compositional angle ideas
 */
router.get('/ideas', (req: Request, res: Response): void => {
  const domain = req.query.domain as string | undefined;
  const count = parseInt(req.query.count as string) || 5;
  const ideas = feediaBrain.getCompositionIdeas(domain, count);
  res.json({ ideas, count: ideas.length, domain: domain || 'all' });
});

/**
 * POST /api/feedia/carousel — Generate carousel plan
 */
router.post('/carousel', (req: Request, res: Response): void => {
  const { domain, brief, slideCount = 10 } = req.body;

  if (!domain || !brief) {
    res.status(400).json({ error: 'domain and brief required' });
    return;
  }

  const plan = brujulaIntegration.generateCarouselPlan(domain, brief, slideCount);
  res.json(plan);
});

/**
 * POST /api/feedia/carousel/multiformat — Generate multi-platform carousel
 */
router.post('/carousel/multiformat', (req: Request, res: Response): void => {
  const { domain, brief } = req.body;

  if (!domain || !brief) {
    res.status(400).json({ error: 'domain and brief required' });
    return;
  }

  const formats = brujulaIntegration.generateMultiFormatCarousel(domain, brief);
  res.json(formats);
});

/**
 * POST /api/feedia/carousel/optimize — Optimize carousel based on metrics
 */
router.post('/carousel/optimize', (req: Request, res: Response): void => {
  const { plan, feedback } = req.body;

  if (!plan || !feedback) {
    res.status(400).json({ error: 'plan and feedback required' });
    return;
  }

  const optimized = brujulaIntegration.optimizeCarouselPlan(plan, feedback);
  res.json(optimized);
});

export const feediaRouter = router;
