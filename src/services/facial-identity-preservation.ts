/**
 * Facial Identity Preservation Service
 * Extracts precise facial landmarks/features from user-uploaded photos
 * Locks EXACT features (not generic description) to guarantee generated
 * content preserves the real person's facial identity
 *
 * Different from consistency-lock.ts: that locks a DESCRIBED character
 * ("Sarah, blonde, professional"). This locks REAL extracted features
 * from an actual uploaded source photo — bone structure, proportions,
 * distinguishing marks — so generated content looks like the SAME person.
 */

import { log } from '../agent/logger.js';
import { analyzeFacialFeatures, isGeminiConfigured } from './gemini-vision-client.js';

interface FacialLandmarks {
  faceShape: string; // oval, round, square, heart, diamond, oblong
  eyeShape: string; // almond, round, monolid, hooded, downturned, upturned
  eyeColor: string;
  eyeSpacing: string; // close-set, average, wide-set
  eyebrowShape: string; // straight, arched, curved, angled
  noseShape: string; // straight, aquiline, button, wide, narrow
  lipShape: string; // full, thin, wide, heart-shaped, downturned
  jawline: string; // sharp, soft, square, round, pointed
  cheekbones: string; // high, low, prominent, subtle
  skinTone: string; // hex-approximate or descriptive
  skinTexture: string; // smooth, freckled, textured
  distinguishingMarks: string[]; // moles, scars, dimples, freckle patterns
  facialHair: string | null; // beard style, mustache, clean-shaven
  hairColor: string;
  hairTexture: string; // straight, wavy, curly, coily
  hairLength: string;
  estimatedAge: string; // age range
  estimatedGender: string;
}

interface IdentityLock {
  lockId: string;
  sourceImageId: string;
  sourceImagePath: string;
  landmarks: FacialLandmarks;
  confidenceScore: number; // 0-100, extraction confidence
  createdAt: string;
}

interface PreservationValidation {
  identityPreserved: boolean;
  matchScore: number; // 0-100
  deviations: string[];
  criticalViolations: string[]; // things that would make it look like a different person
}

class FacialIdentityPreservationService {
  private identityLocks: Map<string, IdentityLock> = new Map();

  /**
   * Extract facial landmarks from uploaded image.
   * Real path: calls Gemini vision (gemini-vision-client.ts) to actually
   * analyze the photo's face shape/eyes/nose/lips/marks/etc. Falls back to
   * manually-supplied imageFeatures, then to generic defaults, if
   * GEMINI_API_KEY is unset or the call fails — never throws.
   */
  async extractFacialLandmarks(
    imagePath: string,
    imageFeatures?: Record<string, any>
  ): Promise<{ landmarks: FacialLandmarks; modelConfidence: number | null }> {
    const realAnalysis = isGeminiConfigured() ? await analyzeFacialFeatures(imagePath) : null;

    const source = realAnalysis ?? imageFeatures ?? {};

    const landmarks: FacialLandmarks = {
      faceShape: source.faceShape || 'oval',
      eyeShape: source.eyeShape || 'almond',
      eyeColor: source.eyeColor || 'brown',
      eyeSpacing: source.eyeSpacing || 'average',
      eyebrowShape: source.eyebrowShape || 'arched',
      noseShape: source.noseShape || 'straight',
      lipShape: source.lipShape || 'full',
      jawline: source.jawline || 'soft',
      cheekbones: source.cheekbones || 'average',
      skinTone: source.skinTone || 'medium',
      skinTexture: source.skinTexture || 'smooth',
      distinguishingMarks: source.distinguishingMarks || [],
      facialHair: source.facialHair || null,
      hairColor: source.hairColor || 'brown',
      hairTexture: source.hairTexture || 'straight',
      hairLength: source.hairLength || 'medium',
      estimatedAge: source.estimatedAge || '25-35',
      estimatedGender: source.estimatedGender || 'unspecified',
    };

    log.info('[FacialIdentity] Landmarks extracted', {
      imagePath,
      faceShape: landmarks.faceShape,
      distinguishingMarksCount: landmarks.distinguishingMarks.length,
      source: realAnalysis ? 'gemini-vision (real)' : imageFeatures ? 'manual-features' : 'default-placeholder',
    });

    return { landmarks, modelConfidence: realAnalysis?.confidence ?? null };
  }

  /**
   * Create identity lock from uploaded source image
   */
  async createIdentityLock(
    sourceImageId: string,
    sourceImagePath: string,
    imageFeatures?: Record<string, any>
  ): Promise<IdentityLock> {
    const { landmarks, modelConfidence } = await this.extractFacialLandmarks(sourceImagePath, imageFeatures);

    // Prefer the vision model's own confidence when real analysis ran;
    // otherwise fall back to the old heuristic (more manual features supplied = more confident)
    const detectedCount = imageFeatures ? Object.keys(imageFeatures).length : 0;
    const confidenceScore = modelConfidence ?? Math.min(100, 40 + detectedCount * 5);

    const lockId = `identity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const identityLock: IdentityLock = {
      lockId,
      sourceImageId,
      sourceImagePath,
      landmarks,
      confidenceScore,
      createdAt: new Date().toISOString(),
    };

    this.identityLocks.set(lockId, identityLock);

    log.info('[FacialIdentity] Identity lock created', {
      lockId,
      sourceImageId,
      confidence: confidenceScore,
    });

    return identityLock;
  }

  /**
   * Generate strict preservation instructions for injection into prompts
   * This is the critical piece: forces the generation model to respect
   * the REAL extracted facial structure, not invent a new face
   */
  generatePreservationInstructions(identityLock: IdentityLock): string {
    const l = identityLock.landmarks;

    const distinguishingMarksText =
      l.distinguishingMarks.length > 0
        ? `Distinguishing marks (MUST appear identically): ${l.distinguishingMarks.join(', ')}`
        : 'No distinguishing marks to preserve beyond structure below';

    return `
[FACIAL IDENTITY PRESERVATION — SOURCE PHOTO LOCK]
[CRITICAL] This is a REAL person from an uploaded reference photo. Do NOT invent
a new face, do NOT generalize, do NOT beautify/idealize away real features.
Reproduce this EXACT facial structure:

- Face shape: ${l.faceShape} (do not alter proportions)
- Eyes: ${l.eyeShape} shape, ${l.eyeColor} color, ${l.eyeSpacing} spacing
- Eyebrows: ${l.eyebrowShape}
- Nose: ${l.noseShape}
- Lips: ${l.lipShape}
- Jawline: ${l.jawline}
- Cheekbones: ${l.cheekbones}
- Skin: ${l.skinTone} tone, ${l.skinTexture} texture
- Hair: ${l.hairColor}, ${l.hairTexture}, ${l.hairLength}
${l.facialHair ? `- Facial hair: ${l.facialHair}` : ''}
- Age appearance: ${l.estimatedAge}
${distinguishingMarksText}

[NON-NEGOTIABLE RULES]
1. Same person must be recognizable across every frame/angle/lighting change
2. Do NOT symmetrize, smooth, or "improve" the face beyond the source
3. Do NOT swap ethnicity, age range, or gender presentation
4. Expression may change (smile, serious, surprised) but bone structure MUST NOT
5. If uncertain about a feature, default to source photo, never invent
[CONFIDENCE: ${identityLock.confidenceScore}/100 extraction confidence]
`.trim();
  }

  /**
   * Inject identity preservation into a content generation prompt
   */
  injectIdentityLock(prompt: string, lockId: string): string {
    const identityLock = this.identityLocks.get(lockId);

    if (!identityLock) {
      log.warn('[FacialIdentity] Lock not found for injection', { lockId });
      return prompt;
    }

    const instructions = this.generatePreservationInstructions(identityLock);

    return `${instructions}\n\n[CONTENT PROMPT]\n${prompt}`;
  }

  /**
   * Validate that generated content description preserves identity
   * (Text-level check; production would compare actual output image
   * embeddings against source image embedding for real verification)
   */
  async validatePreservation(
    lockId: string,
    generatedDescription: string
  ): Promise<PreservationValidation> {
    const identityLock = this.identityLocks.get(lockId);

    if (!identityLock) {
      return {
        identityPreserved: false,
        matchScore: 0,
        deviations: ['Identity lock not found'],
        criticalViolations: ['No source lock to validate against'],
      };
    }

    const l = identityLock.landmarks;
    const lowerDesc = generatedDescription.toLowerCase();
    const deviations: string[] = [];
    const criticalViolations: string[] = [];

    // Check for explicit contradictions (critical)
    const contradictionChecks: Array<{ pattern: RegExp; violation: string }> = [
      { pattern: /different (face|person|identity)/i, violation: 'Explicitly different face/person mentioned' },
      { pattern: /new face/i, violation: 'New face generation implied' },
      { pattern: /idealized|perfected|flawless face/i, violation: 'Beautification beyond source detected' },
      { pattern: /swap(ped)? (ethnicity|gender|age)/i, violation: 'Demographic swap detected' },
    ];

    for (const check of contradictionChecks) {
      if (check.pattern.test(lowerDesc)) {
        criticalViolations.push(check.violation);
      }
    }

    // Check feature consistency mentions (soft check)
    if (l.distinguishingMarks.length > 0) {
      const marksmentioned = l.distinguishingMarks.some(mark =>
        lowerDesc.includes(mark.toLowerCase())
      );
      if (!marksmentioned && lowerDesc.length > 50) {
        deviations.push('Distinguishing marks not explicitly referenced in output description');
      }
    }

    let matchScore = 100;
    matchScore -= criticalViolations.length * 40;
    matchScore -= deviations.length * 10;
    matchScore = Math.max(0, matchScore);

    const identityPreserved = criticalViolations.length === 0 && matchScore >= 70;

    log.info('[FacialIdentity] Preservation validated', {
      lockId,
      matchScore,
      identityPreserved,
      violationCount: criticalViolations.length,
    });

    return {
      identityPreserved,
      matchScore,
      deviations,
      criticalViolations,
    };
  }

  /**
   * Get identity lock
   */
  getIdentityLock(lockId: string): IdentityLock | undefined {
    return this.identityLocks.get(lockId);
  }

  /**
   * Get identity lock by source image ID
   */
  getIdentityLockBySourceImage(sourceImageId: string): IdentityLock | undefined {
    for (const lock of this.identityLocks.values()) {
      if (lock.sourceImageId === sourceImageId) return lock;
    }
    return undefined;
  }
}

export const facialIdentityPreservationService = new FacialIdentityPreservationService();
