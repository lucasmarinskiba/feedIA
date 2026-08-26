import { Router, Request, Response } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';
import { carouselCreationPipeline } from '../services/carousel-creation-pipeline.js';
import { masterContentPipeline } from '../services/master-content-pipeline.js';
import type { CarouselCreateRequest } from '../db/carousel-schema.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface CarouselGenerationRequest {
  userId: string;
  category: string;
  title?: string;
  slideCount?: number;
  platform?: 'instagram' | 'tiktok';
  enableQualityValidation?: boolean;
  enableWitRefinement?: boolean;
}

interface CarouselGenerationResult {
  status: 'success' | 'partial' | 'failed';
  carousel?: {
    id: string;
    userId: string;
    title: string;
    slides: Array<{ slideNumber: number; headline: string; body: string; cta: string }>;
    platform: string;
    createdAt: string;
  };
  validation?: {
    qualityScore: number;
    witScore: number;
    isValid: boolean;
  };
  generation?: {
    baseCategory: string;
    refinedPrompt?: string;
    stagesApplied?: string[];
  };
  warnings?: string[];
  error?: string;
  timestamp: string;
}

/**
 * POST /api/carousel/generate-complete
 * Single endpoint: Generate carousel → Validate → Create → Track
 *
 * Flow:
 * 1. Claude generates slides from category
 * 2. Master pipeline validates quality + wit
 * 3. Carousel creation pipeline stores with metrics
 * 4. Returns full carousel with validation scores
 */
router.post(
  '/generate-complete',
  async (
    req: Request<Record<string, never>, CarouselGenerationResult, CarouselGenerationRequest>,
    res: Response<CarouselGenerationResult>,
  ): Promise<void> => {
    const timestamp = new Date().toISOString();

    try {
      const {
        userId,
        category,
        title,
        slideCount = 8,
        platform = 'instagram',
        enableQualityValidation = true,
        enableWitRefinement = true,
      } = req.body;

      // Validation
      if (!userId || !category) {
        res.status(400).json({
          status: 'failed',
          error: 'Missing required fields: userId, category',
          timestamp,
        });
        return;
      }

      if (slideCount < 2 || slideCount > 20) {
        res.status(400).json({
          status: 'failed',
          error: 'slideCount must be between 2 and 20',
          timestamp,
        });
        return;
      }

      const warnings: string[] = [];
      const generationPrompt = `Generate ${slideCount} carousel slides about "${category}".
Return ONLY a JSON array with objects having: headline (max 10 words), body (max 30 words), cta (2-5 words).
No markdown, no extra text, just valid JSON array.`;

      // Step 1: Generate slides via Claude
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: generationPrompt,
          },
        ],
        system: 'Return ONLY valid JSON array, no markdown, no explanation.',
      });

      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        res.status(500).json({
          status: 'failed',
          error: 'Failed to parse Claude response as JSON',
          warnings: [text.substring(0, 200)],
          timestamp,
        });
        return;
      }

      let parsed: Array<Record<string, string>>;
      try {
        parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, string>>;
      } catch {
        res.status(500).json({
          status: 'failed',
          error: 'Invalid JSON from Claude generation',
          timestamp,
        });
        return;
      }

      // Step 2: Format slides
      const slides = parsed.map((item, idx) => ({
        slideNumber: idx + 1,
        headline: (item.headline ?? '').substring(0, 100),
        body: (item.body ?? '').substring(0, 500),
        cta: (item.cta ?? '').substring(0, 50),
      }));

      // Step 3: Run through master pipeline for quality/wit validation
      let qualityScore = 100;
      let witScore = 100;
      let refinedPrompt = generationPrompt;
      const stagesApplied: string[] = ['generation'];

      if (enableQualityValidation || enableWitRefinement) {
        try {
          const pipelineResult = await masterContentPipeline.processContent({
            basePrompt: `Carousel about ${category} with ${slideCount} slides`,
            platform,
            contentType: 'carousel',
            frameCount: slideCount,
          });

          qualityScore = pipelineResult.qualityScore;
          witScore = pipelineResult.witScore;
          refinedPrompt = pipelineResult.finalPrompt;
          stagesApplied.push(...pipelineResult.stagesApplied);

          if (pipelineResult.warnings.length > 0) {
            warnings.push(...pipelineResult.warnings);
          }

          if (!pipelineResult.readyForGeneration) {
            warnings.push('Content did not meet ready-for-generation threshold after refinement');
          }
        } catch (err) {
          warnings.push(`Master pipeline validation skipped: ${String(err)}`);
        }
      }

      // Step 4: Create carousel via pipeline
      const carouselRequest: CarouselCreateRequest = {
        userId,
        title: title || `${category} Carousel`,
        format: 'carousel',
        platform,
        slides,
        sourceCategory: category,
        brandIdentity: {
          primaryColor: '#000000',
        },
      };

      const pipelineResult = await carouselCreationPipeline.createWithValidation(carouselRequest, {
        validateBefore: true,
        rejectOnCritical: true,
        trackCreation: true,
      });

      if (!pipelineResult.success || !pipelineResult.carousel) {
        res.status(400).json({
          status: 'failed',
          error: pipelineResult.error || 'Carousel creation failed',
          warnings,
          timestamp,
        });
        return;
      }

      // Step 5: Return complete result
      const carousel = pipelineResult.carousel;
      res.status(201).json({
        status: 'success',
        carousel: {
          id: carousel.id,
          userId: carousel.userId,
          title: carousel.title,
          slides: carousel.slides,
          platform: carousel.metadata.platform,
          createdAt: carousel.metadata.createdAt,
        },
        validation: {
          qualityScore,
          witScore,
          isValid: pipelineResult.validation?.isValid ?? true,
        },
        generation: {
          baseCategory: category,
          refinedPrompt,
          stagesApplied,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
        timestamp,
      });
      return;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        status: 'failed',
        error: `Generation failed: ${error}`,
        timestamp,
      });
      return;
    }
  },
);

/**
 * POST /api/carousel/generate-batch
 * Generate multiple carousels in one call with error continuity
 */
router.post(
  '/generate-batch',
  async (
    req: Request<Record<string, never>, Record<string, unknown>, { requests: CarouselGenerationRequest[] }>,
    res: Response<Record<string, unknown>>,
  ): Promise<void> => {
    const timestamp = new Date().toISOString();

    try {
      const { requests } = req.body;

      if (!Array.isArray(requests) || requests.length === 0) {
        res.status(400).json({
          status: 'failed',
          error: 'requests must be a non-empty array',
          timestamp,
        });
        return;
      }

      const results: Array<{ request: CarouselGenerationRequest; result: CarouselGenerationResult }> = [];
      let succeeded = 0;
      let failed = 0;

      for (const request of requests) {
        try {
          // Call generate-complete endpoint logic inline
          if (!request.userId || !request.category) {
            results.push({
              request,
              result: {
                status: 'failed',
                error: 'Missing userId or category',
                timestamp,
              },
            });
            failed++;
            continue;
          }

          const slideCount = request.slideCount ?? 8;
          const message = await anthropic.messages.create({
            model: 'claude-opus-4-1-20250805',
            max_tokens: 2048,
            messages: [
              {
                role: 'user',
                content: `Generate ${slideCount} carousel slides about "${request.category}".
Return ONLY a JSON array with headline, body, cta fields.`,
              },
            ],
            system: 'Return ONLY valid JSON array, no explanation.',
          });

          const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
          const jsonMatch = text.match(/\[[\s\S]*\]/);

          if (!jsonMatch) {
            results.push({
              request,
              result: {
                status: 'failed',
                error: 'Failed to parse Claude response',
                timestamp,
              },
            });
            failed++;
            continue;
          }

          const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, string>>;
          const slides = parsed.map((item, idx) => ({
            slideNumber: idx + 1,
            headline: (item.headline ?? '').substring(0, 100),
            body: (item.body ?? '').substring(0, 500),
            cta: (item.cta ?? '').substring(0, 50),
          }));

          const carouselRequest: CarouselCreateRequest = {
            userId: request.userId,
            title: request.title || `${request.category} Carousel`,
            format: 'carousel',
            platform: request.platform || 'instagram',
            slides,
            sourceCategory: request.category,
            brandIdentity: { primaryColor: '#000000' },
          };

          const pipelineResult = await carouselCreationPipeline.createWithValidation(carouselRequest);

          if (pipelineResult.success && pipelineResult.carousel) {
            results.push({
              request,
              result: {
                status: 'success',
                carousel: {
                  id: pipelineResult.carousel.id,
                  userId: pipelineResult.carousel.userId,
                  title: pipelineResult.carousel.title,
                  slides: pipelineResult.carousel.slides,
                  platform: pipelineResult.carousel.metadata.platform,
                  createdAt: pipelineResult.carousel.metadata.createdAt,
                },
                timestamp,
              },
            });
            succeeded++;
          } else {
            results.push({
              request,
              result: {
                status: 'failed',
                error: pipelineResult.error || 'Carousel creation failed',
                timestamp,
              },
            });
            failed++;
          }
        } catch (err) {
          results.push({
            request,
            result: {
              status: 'failed',
              error: `Error: ${String(err)}`,
              timestamp,
            },
          });
          failed++;
        }
      }

      res.status(207).json({
        status: succeeded === requests.length ? 'success' : 'partial',
        total: requests.length,
        succeeded,
        failed,
        results,
        timestamp,
      });
      return;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        status: 'failed',
        error: `Batch generation failed: ${error}`,
        timestamp,
      });
      return;
    }
  },
);

export default router;
