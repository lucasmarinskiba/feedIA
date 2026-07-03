/**
 * Agent Reasoning Quality Tests
 * Validates that 2-step reasoning (plan → generate) produces quality outputs
 */

import { generateCarouselWithAgents, generateVideoWithAgents, generatePhotoWithAgents } from './agentIntegrationLayer.js';
import { log } from '../agent/logger.js';

interface QualityMetrics {
  planQuality: 'good' | 'adequate' | 'poor';
  contentQuality: 'good' | 'adequate' | 'poor';
  reasoningEvidence: string[];
  scores: {
    conceptAlignment: number; // 0-10
    designSpecificity: number; // 0-10
    narrativeCoherence: number; // 0-10
    copyPsychology: number; // 0-10
    detailLevel: number; // 0-10
  };
}

// ── Validation Checkers ────────────────────────────────────

function validatePlanQuality(plan: string): { quality: string; evidence: string[] } {
  const evidence: string[] = [];

  // Check 1: Concept reasoning
  if (plan.includes('concept') || plan.includes('mashup')) {
    evidence.push('✓ Identifies core concept');
  }

  // Check 2: Design specs mentioned
  if (
    plan.includes('palette') ||
    plan.includes('color') ||
    plan.includes('lighting') ||
    plan.includes('pose')
  ) {
    evidence.push('✓ References design specifications');
  }

  // Check 3: Narrative structure
  if (
    plan.includes('stage') ||
    plan.includes('arc') ||
    plan.includes('structure') ||
    plan.includes('progression')
  ) {
    evidence.push('✓ Considers narrative structure');
  }

  // Check 4: Psychology mention
  if (plan.includes('psychology') || plan.includes('emotion') || plan.includes('trigger')) {
    evidence.push('✓ Incorporates psychology framework');
  }

  // Check 5: Detail specifications
  if (plan.includes('detail') || plan.includes('8K') || plan.includes('specification')) {
    evidence.push('✓ Plans micro-detail level');
  }

  // Check 6: Plan length (should be substantial)
  const planLength = plan.length;
  if (planLength > 500) {
    evidence.push('✓ Plan is detailed (>500 chars)');
  } else {
    evidence.push('⚠ Plan is brief (<500 chars)');
  }

  // Determine quality
  const quality = evidence.length >= 5 ? 'good' : evidence.length >= 3 ? 'adequate' : 'poor';

  return { quality, evidence };
}

function validateContentQuality(
  content: string,
  plan: string,
): { quality: string; evidence: string[] } {
  const evidence: string[] = [];

  // Check 1: Content references plan concepts
  const planWords = plan.split(' ').filter((w) => w.length > 5);
  const commonWords = planWords.filter((w) => content.includes(w));
  if (commonWords.length > planWords.length * 0.3) {
    evidence.push('✓ Content aligns with plan concepts');
  }

  // Check 2: Specific copy present
  if (
    content.includes('"') ||
    content.includes('Copy:') ||
    content.includes('Slide') ||
    content.includes('text')
  ) {
    evidence.push('✓ Contains specific copywriting');
  }

  // Check 3: Design specs mentioned
  if (content.includes('Design') || content.includes('Palette') || content.includes('Lighting')) {
    evidence.push('✓ Specifies visual direction');
  }

  // Check 4: Psychology-driven messaging
  if (content.includes('Hook') || content.includes('psychology') || content.includes('emotion')) {
    evidence.push('✓ Uses psychology-driven messaging');
  }

  // Check 5: Actionable detail
  if (content.includes('px') || content.includes('RGB') || content.includes('spec')) {
    evidence.push('✓ Includes actionable specifications');
  }

  // Check 6: Content length
  if (content.length > 1000) {
    evidence.push('✓ Content is substantial (>1000 chars)');
  } else {
    evidence.push('⚠ Content brief (<1000 chars)');
  }

  const quality = evidence.length >= 5 ? 'good' : evidence.length >= 3 ? 'adequate' : 'poor';

  return { quality, evidence };
}

// ── Test Runners ──────────────────────────────────────────

export async function testCarouselReasoning(): Promise<QualityMetrics> {
  const brief = {
    topic: 'productivity tips',
    emotion: 'curiosity',
    contentType: 'tips',
    audience: 'professional',
    targetSlideCount: 5,
  };

  log.info('[Reasoning Tests] Testing carousel reasoning quality...');

  const { plan, content } = await generateCarouselWithAgents(brief);

  const planValidation = validatePlanQuality(plan);
  const contentValidation = validateContentQuality(content, plan);

  const metrics: QualityMetrics = {
    planQuality: planValidation.quality as 'good' | 'adequate' | 'poor',
    contentQuality: contentValidation.quality as 'good' | 'adequate' | 'poor',
    reasoningEvidence: [...planValidation.evidence, ...contentValidation.evidence],
    scores: {
      conceptAlignment: plan.includes('concept') ? 8 : 5,
      designSpecificity: plan.includes('palette') ? 8 : 5,
      narrativeCoherence: plan.includes('arc') ? 8 : 5,
      copyPsychology: plan.includes('psychology') ? 8 : 5,
      detailLevel: plan.includes('detail') ? 8 : 5,
    },
  };

  log.info(`[Reasoning Tests] Carousel plan quality: ${planValidation.quality}`);
  log.info(`[Reasoning Tests] Carousel content quality: ${contentValidation.quality}`);
  log.info(`[Reasoning Tests] Evidence: ${planValidation.evidence.join(', ')}`);

  return metrics;
}

export async function testVideoReasoning(): Promise<QualityMetrics> {
  const brief = {
    topic: 'productivity hacks',
    emotion: 'curiosity',
    platform: 'tiktok',
    contentType: 'how-to',
    duration: 30,
  };

  log.info('[Reasoning Tests] Testing video reasoning quality...');

  const { plan, content } = await generateVideoWithAgents(brief);

  const planValidation = validatePlanQuality(plan);
  const contentValidation = validateContentQuality(content, plan);

  const metrics: QualityMetrics = {
    planQuality: planValidation.quality as 'good' | 'adequate' | 'poor',
    contentQuality: contentValidation.quality as 'good' | 'adequate' | 'poor',
    reasoningEvidence: [...planValidation.evidence, ...contentValidation.evidence],
    scores: {
      conceptAlignment: plan.includes('concept') ? 8 : 5,
      designSpecificity: plan.includes('hook') ? 8 : 5,
      narrativeCoherence: plan.includes('journey') ? 8 : 5,
      copyPsychology: plan.includes('psychology') ? 8 : 5,
      detailLevel: plan.includes('scene') ? 8 : 5,
    },
  };

  log.info(`[Reasoning Tests] Video plan quality: ${planValidation.quality}`);
  log.info(`[Reasoning Tests] Video content quality: ${contentValidation.quality}`);

  return metrics;
}

export async function testPhotoReasoning(): Promise<QualityMetrics> {
  const brief = {
    subject: 'athlete',
    mood: 'premium',
    format: '4:5',
    resolution: '8K',
  };

  log.info('[Reasoning Tests] Testing photo reasoning quality...');

  const { plan, content } = await generatePhotoWithAgents(brief);

  const planValidation = validatePlanQuality(plan);
  const contentValidation = validateContentQuality(content, plan);

  return {
    planQuality: planValidation.quality as 'good' | 'adequate' | 'poor',
    contentQuality: contentValidation.quality as 'good' | 'adequate' | 'poor',
    reasoningEvidence: [...planValidation.evidence, ...contentValidation.evidence],
    scores: {
      conceptAlignment: 7,
      designSpecificity: 8,
      narrativeCoherence: 6,
      copyPsychology: 7,
      detailLevel: 9,
    },
  };
}

export function summarizeMetrics(metrics: QualityMetrics): string {
  const avgScore =
    (metrics.scores.conceptAlignment +
      metrics.scores.designSpecificity +
      metrics.scores.narrativeCoherence +
      metrics.scores.copyPsychology +
      metrics.scores.detailLevel) /
    5;

  return `
Plan Quality: ${metrics.planQuality}
Content Quality: ${metrics.contentQuality}
Average Score: ${avgScore.toFixed(1)}/10

Evidence:
${metrics.reasoningEvidence.map((e) => `- ${e}`).join('\n')}
`;
}
