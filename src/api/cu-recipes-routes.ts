/**
 * CU Recipe Library — /api/cu/recipes
 * Serves the Computer Use recipe library (IG/TikTok/Canva/CapCut/Runway/Pika/Luma/Kling/HeyGen/InVideo/Veed/Ideogram/Freepik/Veed)
 * gated by plan tier, to the CU Toolbox frontend view.
 *
 * Data lives in src/data/cu-recipes.json, shared with the Vercel serverless
 * copy of this library (api/_cuRecipeLibrary.js) so both deployments stay in sync.
 */

import { Router, Request, Response } from 'express';
import cuRecipeData from '../data/cu-recipes.json' with { type: 'json' };

interface CuRecipeStep {
  n: number;
  action: string;
  target?: string;
  detail?: string;
  icon?: string;
}

interface CuRecipe {
  id: string;
  tool: string;
  category: string;
  label: string;
  estimatedMin: number;
  minPlan: string;
  riskLevel?: string;
  rateLimit?: string;
  steps: CuRecipeStep[];
}

interface CuTool {
  id: string;
  label: string;
  icon: string;
  baseUrl: string;
  authRequired?: boolean;
  freeAccountOk?: boolean;
  freeTier?: string;
}

const CU_RECIPES = cuRecipeData.recipes as unknown as Record<string, CuRecipe>;
const CU_TOOLS = cuRecipeData.tools as unknown as Record<string, CuTool>;

const PLAN_ORDER = ['free', 'starter', 'pro', 'gold', 'premium'];

const isPlanGte = (userPlan: string, minPlan: string): boolean =>
  PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(minPlan);

const listRecipesForPlan = (planId: string, opts: { tool?: string; category?: string } = {}): CuRecipe[] => {
  let filtered = Object.values(CU_RECIPES).filter((r) => isPlanGte(planId, r.minPlan));
  if (opts.tool) filtered = filtered.filter((r) => r.tool === opts.tool);
  if (opts.category) filtered = filtered.filter((r) => r.category === opts.category);
  return filtered;
};

const router = Router();

router.get('/recipes', (req: Request, res: Response): void => {
  const planId = typeof req.query.planId === 'string' ? req.query.planId : 'free';
  const tool = typeof req.query.tool === 'string' ? req.query.tool : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  res.json({
    planId,
    tools: CU_TOOLS,
    recipes: listRecipesForPlan(planId, { tool, category }),
    totalAvailable: listRecipesForPlan(planId).length,
    totalLibrary: Object.keys(CU_RECIPES).length,
  });
});

router.get('/recipes/:id', (req: Request<{ id: string }>, res: Response): void => {
  const recipe = CU_RECIPES[req.params.id];
  if (!recipe) {
    res.status(404).json({ error: 'recipe not found' });
    return;
  }
  res.json(recipe);
});

export default router;
