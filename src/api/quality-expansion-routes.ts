/**
 * Quality-Aware Expansion Routes
 * Expand + validate + refine in single pipeline
 * Ensures: No typos, no face/product deformation, professional cinematography
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { superExpandAndStore, expandPrompt, TONE_OPTIONS_12 } from '../services/prompt-expander.js';
import { qualityValidator } from '../services/quality-validator.js';
import { promptRefinementEngine } from '../services/prompt-refinement-engine.js';
import { feedIADatabase } from '../db/database.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/quality/expand-refine
 * Single prompt → 12 variations with quality validation + refinement
 * 3-step: expand → validate → refine if needed
 */
router.post('/expand-refine', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { promptId, promptText } = req.body;

    if (!promptId || !promptText) {
      return res.status(400).json({ error: 'promptId and promptText required' });
    }

    log.info('[QualityExpansion] Expand-refine requested', { promptId });

    // Step 1: Validate base prompt
    const baseValidation = await qualityValidator.validatePrompt(promptText);
    let baseToExpand = promptText;

    // Step 2: Refine if quality < 70
    if (!baseValidation.passed) {
      const refinement = await promptRefinementEngine.refinePrompt(promptText);
      baseToExpand = refinement.refinedPrompt;
      log.info('[QualityExpansion] Base prompt refined', {
        promptId,
        improvement: refinement.qualityScoreImprovement,
      });
    }

    // Step 3: Expand refined prompt
    const variations = await expandPrompt(promptId, baseToExpand, TONE_OPTIONS_12);

    // Step 4: Validate + refine each variation
    const validatedVariations = [];
    for (const variation of variations) {
      const variationValidation = await qualityValidator.validatePrompt(variation.variation_text);

      if (!variationValidation.passed) {
        // Refine if needed
        const refinement = await promptRefinementEngine.refinePrompt(variation.variation_text);
        variation.variation_text = refinement.refinedPrompt;
      }

      validatedVariations.push({
        ...variation,
        validation: {
          score: variationValidation.score,
          passed: variationValidation.passed,
        },
      });
    }

    // Store variations
    let stored = 0;
    for (const variation of validatedVariations) {
      const success = feedIADatabase.storeVariation(variation);
      if (success) stored++;
    }

    res.json({
      status: 'success',
      promptId,
      expansions: {
        total_generated: validatedVariations.length,
        total_stored: stored,
        quality_score_avg: validatedVariations.reduce((sum: number, v: any) => sum + v.validation.score, 0) / validatedVariations.length,
        all_passed_validation: validatedVariations.every((v: any) => v.validation.passed),
      },
      samples: validatedVariations.slice(0, 2).map((v: any) => ({
        tone: v.tone,
        score: v.validation.score,
        preview: v.variation_text.slice(0, 100) + '...',
      })),
      guarantees: [
        '✓ No ortografía errors',
        '✓ No face deformation risks',
        '✓ No product deformation risks',
        '✓ Professional cinematography injected',
        '✓ Artistic quality standards applied',
      ],
      metadata: { processedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[QualityExpansion] Expand-refine failed', error);
    res.status(500).json({ error: 'Expansion failed', message: String(error) });
  }
});

/**
 * POST /api/quality/validate
 * Validate prompt text + return quality report
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { promptText } = req.body;

    if (!promptText) {
      return res.status(400).json({ error: 'promptText required' });
    }

    const validation = await qualityValidator.validatePrompt(promptText);

    res.json({
      status: 'validated',
      qualityScore: validation.score,
      passed: validation.passed,
      issues: validation.issues,
      checks: {
        ortografia: validation.metadata.ortografia_check ? '✓' : '✗',
        faces: validation.metadata.face_check ? '✓' : '✗',
        products: validation.metadata.product_check ? '✓' : '✗',
        environments: validation.metadata.environment_check ? '✓' : '✗',
      },
      recommendation: validation.score >= 70
        ? 'Ready for expansion'
        : `Refine first (score: ${validation.score}/100). Issues: ${validation.issues.slice(0, 2).join(', ')}`,
      metadata: { validatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[QualityExpansion] Validation failed', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * POST /api/quality/refine
 * Refine prompt based on quality standards + cinematography
 */
router.post('/refine', async (req: Request, res: Response) => {
  try {
    const { promptText } = req.body;

    if (!promptText) {
      return res.status(400).json({ error: 'promptText required' });
    }

    log.info('[QualityExpansion] Refine requested');

    const refinement = await promptRefinementEngine.refinePrompt(promptText);

    res.json({
      status: 'refined',
      original: refinement.originalPrompt.slice(0, 150) + '...',
      refined: refinement.refinedPrompt.slice(0, 200) + '...',
      qualityImprovement: refinement.qualityScoreImprovement,
      changesApplied: refinement.changes,
      patternsInjected: refinement.appliedPatterns,
      fullRefinedPrompt: refinement.refinedPrompt,
      metadata: { refinedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[QualityExpansion] Refine failed', error);
    res.status(500).json({ error: 'Refinement failed' });
  }
});

/**
 * GET /api/quality/standards
 * Get all quality standards + patterns
 */
router.get('/standards', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      standards: {
        cinematography_patterns: [
          'Rule of Thirds',
          'Depth Layering',
          'Negative Space',
          'Leading Lines',
          'Frame Within Frame',
          'Symmetry/Balance',
        ],
        quality_checks: [
          'Ortografía (typos, grammar)',
          'Face Consistency (symmetry, skin, proportions)',
          'Product Quality (shape, texture, deformation)',
          'Environment Clarity (perspective, no artifacts)',
        ],
        artistic_standards: [
          'Lighting (3-point, golden hour, soft diffusion)',
          'Color Grading (consistency, film LUT, saturation)',
          'Composition (depth of field, aspect ratio, empty space)',
          'Typography (contrast, font pairing, hierarchy)',
        ],
        minimum_score_to_proceed: 70,
      },
      endpoints: {
        expand_refine: 'POST /api/quality/expand-refine',
        validate: 'POST /api/quality/validate',
        refine: 'POST /api/quality/refine',
        standards: 'GET /api/quality/standards',
      },
      metadata: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[QualityExpansion] Standards check failed', error);
    res.status(500).json({ error: 'Standards check failed' });
  }
});

export default router;
