/**
 * FeedIA Video Parameterized Routes
 * Generate cinematic video prompts (Batch 90-91: 1,100 prompts)
 * User input → Template selection → Parameterization → Full prompt output
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { videoPromptEngine } from '../services/video-prompt-engine.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

interface VideoPromptRequest {
  category: 'emotional' | 'narrative' | 'transformation' | 'lifestyle' | 'technical';
  product?: string;
  persona?: string;
  location?: string;
  duration?: number;
  tone?: string;
  culturalContext?: string;
  emotionalArc?: string;
  specs?: string;
  templateId?: string;
}

/**
 * POST /api/video/parameterized-prompt
 * Generate single video prompt with custom parameters
 */
router.post('/parameterized-prompt', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const {
      category,
      product,
      persona,
      location,
      duration = 15,
      tone,
      culturalContext,
      emotionalArc,
      specs,
      templateId,
    } = req.body as VideoPromptRequest;

    if (!category) {
      return res.status(400).json({ error: 'category required: emotional|narrative|transformation|lifestyle|technical' });
    }

    log.info('[VideoParameterizedRoutes] Prompt request', {
      category,
      product,
      persona,
      duration,
    });

    // Get templates by category
    const templates = videoPromptEngine.getTemplatesByCategory(category);
    if (templates.length === 0) {
      return res.status(404).json({ error: `No templates found for category: ${category}` });
    }

    // Select template (use provided or first available)
    const selectedTemplate = templateId
      ? templates.find(t => t.id === templateId) || templates[0]
      : templates[0];

    if (!selectedTemplate) {
      return res.status(404).json({ error: `No templates found for category: ${category}` });
    }

    // Generate prompt
    const generatedPrompt = videoPromptEngine.generatePrompt(selectedTemplate.id, {
      category,
      product,
      persona,
      location,
      duration,
      tone,
      culturalContext,
      emotionalArc,
      specs,
    });

    if (!generatedPrompt) {
      return res.status(400).json({
        error: 'Failed to generate prompt. Check required parameters.',
        template: selectedTemplate,
        requiredParams: selectedTemplate.requiredParams,
      });
    }

    return res.json({
      status: 'success',
      prompt: generatedPrompt,
      template: {
        id: selectedTemplate.id,
        name: selectedTemplate.name,
      },
      brand: brand?.name,
      metadata: {
        generatedAt: new Date().toISOString(),
        category,
      },
    });
  } catch (error) {
    log.error('[VideoParameterizedRoutes] Prompt generation error', error);
    return res.status(500).json({ error: 'Prompt generation failed' });
  }
});

/**
 * POST /api/video/batch-generate
 * Generate multiple video prompts in parallel
 */
router.post('/batch-generate', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { requests } = req.body as { requests: VideoPromptRequest[] };

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'requests array required' });
    }

    if (requests.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 requests per batch' });
    }

    log.info('[VideoParameterizedRoutes] Batch generation', {
      requestCount: requests.length,
    });

    const generatedPrompts = requests
      .map(req => {
        const templates = videoPromptEngine.getTemplatesByCategory(req.category);
        const selectedTemplate = templates[0];
        if (!selectedTemplate) return null;

        return videoPromptEngine.generatePrompt(selectedTemplate.id, {
          category: req.category,
          product: req.product,
          persona: req.persona,
          location: req.location,
          duration: req.duration,
          tone: req.tone,
          culturalContext: req.culturalContext,
          emotionalArc: req.emotionalArc,
          specs: req.specs,
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return res.json({
      status: 'success',
      totalRequested: requests.length,
      totalGenerated: generatedPrompts.length,
      prompts: generatedPrompts,
      brand: brand?.name,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[VideoParameterizedRoutes] Batch generation error', error);
    return res.status(500).json({ error: 'Batch generation failed' });
  }
});

/**
 * GET /api/video/library-status
 * Get video prompt library information
 */
router.get('/library-status', async (req: Request, res: Response) => {
  try {
    const libraryStatus = videoPromptEngine.getLibraryStatus();
    const templates = videoPromptEngine.listTemplates();

    res.json({
      status: 'operational',
      library: libraryStatus,
      templates: {
        total: templates.length,
        byCategory: {
          emotional: templates.filter(t => t.category === 'emotional').length,
          narrative: templates.filter(t => t.category === 'narrative').length,
          transformation: templates.filter(t => t.category === 'transformation').length,
          lifestyle: templates.filter(t => t.category === 'lifestyle').length,
          technical: templates.filter(t => t.category === 'technical').length,
        },
      },
      endpoints: {
        generateSingle: 'POST /api/video/parameterized-prompt',
        generateBatch: 'POST /api/video/batch-generate',
        listTemplates: 'GET /api/video/templates',
      },
    });
  } catch (error) {
    log.error('[VideoParameterizedRoutes] Status error', error);
    res.status(500).json({ error: 'Failed to get library status' });
  }
});

/**
 * GET /api/video/templates
 * List all available templates with details
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category } = req.query as { category?: string };

    let templates = videoPromptEngine.listTemplates();
    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    res.json({
      status: 'success',
      total: templates.length,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        requiredParams: t.requiredParams,
        optionalParams: t.optionalParams,
      })),
    });
  } catch (error) {
    log.error('[VideoParameterizedRoutes] Templates list error', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

/**
 * POST /api/video/batch-expand
 * Expand 1 prompt into 10 variations (different [PERSONA], [PRODUCT], [LOCATION])
 */
router.post('/batch-expand', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { baseParams, personaVariations, productVariations, locationVariations } = req.body as {
      baseParams: VideoPromptRequest;
      personaVariations?: string[];
      productVariations?: string[];
      locationVariations?: string[];
    };

    if (!baseParams) {
      return res.status(400).json({ error: 'baseParams required' });
    }

    const personas = personaVariations || ['Persona 1', 'Persona 2', 'Persona 3'];
    const products = productVariations || ['Producto 1', 'Producto 2', 'Producto 3'];
    const locations = locationVariations || ['Ubicación 1', 'Ubicación 2', 'Ubicación 3'];

    log.info('[VideoParameterizedRoutes] Batch expand', {
      baseCategory: baseParams.category,
      variations: personas.length * products.length,
    });

    const expandedPrompts = [];

    // Generate combinations (limit to 10 total)
    for (let i = 0; i < Math.min(10, personas.length * products.length); i++) {
      const personaIdx = i % personas.length;
      const productIdx = Math.floor(i / personas.length) % products.length;
      const locationIdx = i % locations.length;

      const expandedParams: VideoPromptRequest = {
        ...baseParams,
        persona: personas[personaIdx],
        product: products[productIdx],
        location: locations[locationIdx],
      };

      const templates = videoPromptEngine.getTemplatesByCategory(baseParams.category);
      const selectedTemplate = templates[0];
      const prompt = selectedTemplate ? videoPromptEngine.generatePrompt(selectedTemplate.id, expandedParams) : null;

      if (prompt) {
        expandedPrompts.push(prompt);
      }
    }

    return res.json({
      status: 'success',
      baseParams,
      totalVariations: expandedPrompts.length,
      prompts: expandedPrompts,
      brand: brand?.name,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[VideoParameterizedRoutes] Batch expand error', error);
    return res.status(500).json({ error: 'Batch expand failed' });
  }
});

export default router;
