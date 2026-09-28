/**
 * CU Recipe Library — /api/cu/recipes
 * Serves the Computer Use recipe library (IG/TikTok/Canva/CapCut/Runway/Pika/Luma/Kling/HeyGen/InVideo/Veed/Ideogram/Freepik/Veed)
 * gated by plan tier, to the CU Toolbox frontend view.
 *
 * Data lives in src/data/cu-recipes.ts (a plain TS module, not JSON — the
 * production build, scripts/build-prod.mjs, transpiles only .ts files under
 * src/ with esbuild and does not copy standalone asset files, so a JSON
 * import here would silently vanish from dist/ and crash the server at
 * startup with ERR_MODULE_NOT_FOUND). Mirrors the separate Vercel serverless
 * copy of this library, api/_cuRecipeLibrary.js.
 */

import { Router, Request, Response } from 'express';
import { CU_RECIPES as RAW_RECIPES, CU_TOOLS as RAW_TOOLS } from '../data/cu-recipes.js';
import { getUserTier } from '../db/user-tiers.js';

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

const CU_RECIPES = RAW_RECIPES as unknown as Record<string, CuRecipe>;
const CU_TOOLS = RAW_TOOLS as unknown as Record<string, CuTool>;

const PLAN_ORDER = ['free', 'starter', 'pro', 'agency'];

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

/**
 * POST /api/cu/execute — the real plan gate.
 *
 * The frontend CU Toolbox already hides locked cards client-side, but that's
 * cosmetic — anyone can still POST here directly. This is the enforcement
 * point: it re-checks the requesting user's ACTUAL billing tier (from
 * user_tiers, the table Stripe/Mercado Pago webhooks write to) against the
 * recipe's minPlan, server-side, before returning the executable steps.
 *
 * This does not drive a browser-automation agent against the user's real
 * Instagram/TikTok/Canva account — that requires separate long-running
 * Computer Use infrastructure this deployment doesn't run yet. What it
 * guarantees is that the recipe steps it hands back are only ever handed to
 * a user whose paid tier actually covers them.
 */
router.post('/execute', async (req: Request, res: Response): Promise<void> => {
  const recipeId = typeof req.body?.recipeId === 'string' ? req.body.recipeId : undefined;
  if (!recipeId) {
    res.status(400).json({ error: 'recipeId required' });
    return;
  }

  const recipe = CU_RECIPES[recipeId];
  if (!recipe) {
    res.status(404).json({ error: 'recipe not found' });
    return;
  }

  const tierRecord = await getUserTier(req.userId);
  const userPlan = tierRecord?.tier ?? 'free';

  if (!isPlanGte(userPlan, recipe.minPlan)) {
    res.status(403).json({
      error: 'plan-insufficient',
      yourPlan: userPlan,
      requiredPlan: recipe.minPlan,
    });
    return;
  }

  res.json({
    ok: true,
    recipe: {
      id: recipe.id,
      label: recipe.label,
      estimatedMin: recipe.estimatedMin,
      rateLimit: recipe.rateLimit,
      steps: recipe.steps,
    },
  });
});

export default router;
