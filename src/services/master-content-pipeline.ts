/**
 * Master Content Pipeline
 * Single entry point chaining ALL FeedIA quality systems in correct order:
 * 1. Quality validation (ortografia/faces/products/environments)
 * 2. Refinement (cinematography + artistic standards + wit/ocurrencia + resolution lock)
 * 3. Facial identity injection (if user photo provided)
 * 4. Consistency lock injection (if carousel series provided)
 * 5. Final validation + score report
 *
 * Without this, users must manually call 6+ separate endpoints in the right
 * order to get a fully-guaranteed piece of content. This collapses it to one call.
 */

import { log } from '../agent/logger.js';
import { qualityValidator } from './quality-validator.js';
import { promptRefinementEngine } from './prompt-refinement-engine.js';
import { creativityWitEngine } from './creativity-wit-engine.js';
import { facialIdentityPreservationService } from './facial-identity-preservation.js';
import { consistencyLockManager } from './consistency-lock.js';
import { resolutionQualityEngine } from './resolution-quality-engine.js';

interface MasterPipelineOptions {
  basePrompt: string;
  platform: 'instagram' | 'tiktok';
  contentType: 'image' | 'video' | 'carousel';
  identityLockId?: string; // from facial-identity-preservation, if generating FROM a user photo
  consistencySeriesId?: string; // from consistency-lock, if part of a carousel series
  frameNumber?: number; // which frame in the series (if applicable)
  frameCount?: number;
}

interface MasterPipelineResult {
  finalPrompt: string;
  stagesApplied: string[];
  qualityScore: number;
  witScore: number;
  identityPreserved: boolean | null; // null if no identity lock used
  consistencyEnforced: boolean; // whether series lock was applied
  resolutionLocked: boolean;
  readyForGeneration: boolean;
  warnings: string[];
}

class MasterContentPipeline {
  /**
   * Run full pipeline: quality + refinement + creativity + identity + consistency + resolution
   */
  async processContent(options: MasterPipelineOptions): Promise<MasterPipelineResult> {
    const {
      basePrompt,
      platform,
      contentType,
      identityLockId,
      consistencySeriesId,
      frameNumber,
      frameCount,
    } = options;

    const stagesApplied: string[] = [];
    const warnings: string[] = [];
    let workingPrompt = basePrompt;

    log.info('[MasterPipeline] Processing started', {
      platform,
      contentType,
      hasIdentityLock: !!identityLockId,
      hasConsistencyLock: !!consistencySeriesId,
    });

    // Stage 1: Initial quality check
    const initialValidation = await qualityValidator.validatePrompt(workingPrompt);
    stagesApplied.push('quality-validation');

    // Stage 2: Refinement (cinematography + artistic + wit + resolution — all built into refinePrompt)
    const refinement = await promptRefinementEngine.refinePrompt(workingPrompt, platform, contentType);
    workingPrompt = refinement.refinedPrompt;
    stagesApplied.push('refinement (cinematography + artistic + ocurrencia + resolution-lock)');

    // Stage 3: Facial identity injection (only if generating from a real user photo)
    let identityPreserved: boolean | null = null;
    if (identityLockId) {
      const identityLock = facialIdentityPreservationService.getIdentityLock(identityLockId);
      if (identityLock) {
        workingPrompt = facialIdentityPreservationService.injectIdentityLock(workingPrompt, identityLockId);
        stagesApplied.push('facial-identity-lock');
        identityPreserved = true; // will be truly validated post-generation via /api/identity/validate
      } else {
        warnings.push(`identityLockId ${identityLockId} not found — skipped identity injection`);
      }
    }

    // Stage 4: Consistency lock injection (only if part of a carousel series)
    let consistencyEnforced = false;
    if (consistencySeriesId) {
      const seriesLock = consistencyLockManager.getSeriesLock(consistencySeriesId);
      if (seriesLock) {
        workingPrompt = consistencyLockManager.injectLockInstructions(workingPrompt, seriesLock);
        if (frameNumber && frameCount) {
          workingPrompt += `\n[FRAME ${frameNumber}/${frameCount}] Maintain ALL locks from Frame 1.`;
        }
        stagesApplied.push('consistency-lock');
        consistencyEnforced = true;
      } else {
        warnings.push(`consistencySeriesId ${consistencySeriesId} not found — skipped consistency injection`);
      }
    }

    // Stage 5: Final validation
    const finalValidation = await qualityValidator.validatePrompt(workingPrompt);
    const finalWitCheck = await creativityWitEngine.analyzeWit(workingPrompt);
    stagesApplied.push('final-validation');

    const combinedWitScore = Math.round((finalWitCheck.witScore + finalWitCheck.originalityScore) / 2);
    const readyForGeneration = finalValidation.passed && combinedWitScore >= 60;

    if (!readyForGeneration) {
      if (!finalValidation.passed) warnings.push(`Quality score ${finalValidation.score}/100 — below threshold`);
      if (combinedWitScore < 60) warnings.push(`Wit score ${combinedWitScore}/100 — content may feel generic`);
    }

    log.info('[MasterPipeline] Processing complete', {
      stagesApplied: stagesApplied.length,
      qualityScore: finalValidation.score,
      witScore: combinedWitScore,
      readyForGeneration,
    });

    return {
      finalPrompt: workingPrompt,
      stagesApplied,
      qualityScore: finalValidation.score,
      witScore: combinedWitScore,
      identityPreserved,
      consistencyEnforced,
      resolutionLocked: true, // always applied in Stage 2 via refinement
      readyForGeneration,
      warnings,
    };
  }

  /**
   * Process entire carousel (multiple frames) through pipeline in one call
   */
  async processCarousel(
    basePrompt: string,
    platform: 'instagram' | 'tiktok',
    frameCount: number,
    identityLockId?: string,
    consistencySeriesId?: string
  ): Promise<MasterPipelineResult[]> {
    const results: MasterPipelineResult[] = [];

    for (let frame = 1; frame <= frameCount; frame++) {
      const result = await this.processContent({
        basePrompt,
        platform,
        contentType: 'carousel',
        identityLockId,
        consistencySeriesId,
        frameNumber: frame,
        frameCount,
      });
      results.push(result);
    }

    log.info('[MasterPipeline] Carousel processed', {
      frameCount,
      allReady: results.every(r => r.readyForGeneration),
    });

    return results;
  }
}

export const masterContentPipeline = new MasterContentPipeline();
