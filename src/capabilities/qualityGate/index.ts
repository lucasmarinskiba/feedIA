/**
 * Quality Gate — umbral unificado de calidad antes de publicar.
 *
 * Combina:
 * - Content scoring (hook, CTA, readability, hashtags, originality)
 * - Visual QA (márgenes, safe zones, jerarquía tipográfica, estética)
 * - BrandKit validation (colores, fuentes, iconografía, voz)
 * - Anti-promise audit (sin promesas vacías)
 *
 * Score combinado ≥ 70 = aprueba.
 * Si falla, intenta mejorar automáticamente hasta 2 veces.
 * Si sigue fallando, escala a checkpoint humano.
 */

import { z } from 'zod';
import { log } from '../../agent/logger.js';
import { audit } from '../../compliance/auditLog.js';
import { createCheckpoint } from '../../agent/checkpoints.js';
import { sendAlert } from '../../integrations/notifications.js';
import { env } from '../../config/index.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';
import { scoreContent, type ContentToScore, type ContentScoreResult } from '../content/contentScorer.js';
import { validateVisualQA, type VisualQAInput, type VisualQAResult } from '../design/visualQA.js';
import { validateContentAgainstBrandKit } from '../brandkit/validator.js';
import type { BrandConsistencyResult } from '../brandkit/types.js';
import { auditContentForEmptyPromises, type AntiPromiseAuditResult } from '../antiPromiseAuditor/antiPromiseAuditor.js';
import { ensureBrandKit } from '../brandkit/index.js';

export const QualityGateInputSchema = z.object({
  brand: z.custom<BrandProfile>(),
  format: z.enum(['reel', 'carrusel', 'historia', 'post-imagen', 'reel-faceless']),
  caption: z.string(),
  hashtags: z.array(z.string()),
  topic: z.string(),
  hasCTA: z.boolean(),
  visualInput: z.custom<VisualQAInput>(),
  colorsUsed: z.array(z.string()).default([]),
  fontsUsed: z.array(z.string()).default([]),
  description: z.string().default(''),
  tasteInput: z.custom<import('../creativeDirector/index.js').TasteInput>().optional(),
});

export type QualityGateInput = z.infer<typeof QualityGateInputSchema>;

export interface QualityGateResult {
  passed: boolean;
  combinedScore: number;
  contentScore: number;
  visualScore: number;
  brandScore: number;
  antiPromiseScore: number;
  tasteScore: number;
  details: {
    content: ContentScoreResult;
    visual: VisualQAResult;
    brand: BrandConsistencyResult;
    antiPromise: AntiPromiseAuditResult;
  };
  attempts: number;
  checkpointId?: string;
  requiresHumanApproval: boolean;
}

const MIN_SCORE = 70;
const MAX_ATTEMPTS = 2;

const weights = {
  content: 0.3,
  visual: 0.35,
  brand: 0.25,
  antiPromise: 0.1,
};

const runQualityChecks = async (
  input: QualityGateInput,
): Promise<Pick<QualityGateResult, 'contentScore' | 'visualScore' | 'brandScore' | 'antiPromiseScore' | 'tasteScore' | 'details'>> => {
  const contentToScore: ContentToScore = {
    caption: input.caption,
    hashtags: input.hashtags,
    format: input.format as ContentFormat,
    hasCTA: input.hasCTA,
    topic: input.topic,
    hasVisualBrief: input.visualInput.slides.length > 0,
    tasteInput: input.tasteInput,
  };

  const [contentResult, antiPromiseResult] = await Promise.all([
    scoreContent(contentToScore),
    Promise.resolve(auditContentForEmptyPromises(input.caption)),
  ]);

  const visualResult = validateVisualQA(input.visualInput);

  let brandResult: BrandConsistencyResult;
  try {
    const kit = ensureBrandKit(input.brand.name);
    brandResult = validateContentAgainstBrandKit(
      {
        colorsUsed: input.colorsUsed,
        fontsUsed: input.fontsUsed,
        description: input.description,
      },
      kit,
      input.brand,
    );
  } catch {
    // Si no hay brandkit, aprobar con score neutral
    brandResult = {
      totalScore: 75,
      paletteScore: 75,
      typographyScore: 75,
      iconographyScore: 75,
      voiceScore: 75,
      compositionScore: 75,
      issues: [
        {
          severity: 'warning',
          field: 'brandkit',
          message: 'BrandKit no inicializado',
          suggestion: 'Ejecutar ensureBrandKit primero',
        },
      ],
      passed: true,
      threshold: 70,
    };
  }

  const contentScore = contentResult.overall;
  const visualScore = visualResult.score;
  const brandScore = brandResult.totalScore;
  const antiPromiseScore = antiPromiseResult.score;
  const tasteScore = Math.round((contentResult.dimensions.taste / 20) * 100);

  return {
    contentScore,
    visualScore,
    brandScore,
    antiPromiseScore,
    tasteScore,
    details: {
      content: contentResult,
      visual: visualResult,
      brand: brandResult,
      antiPromise: antiPromiseResult,
    },
  };
};

const computeCombinedScore = (
  contentScore: number,
  visualScore: number,
  brandScore: number,
  antiPromiseScore: number,
): number => {
  const raw =
    contentScore * weights.content +
    visualScore * weights.visual +
    brandScore * weights.brand +
    antiPromiseScore * weights.antiPromise;
  return Math.round(raw);
};

export const runQualityGate = async (
  input: QualityGateInput,
  improveCaptionFn?: (feedback: string[]) => Promise<string>,
): Promise<QualityGateResult> => {
  let attempts = 0;
  let currentCaption = input.caption;
  const currentHashtags = [...input.hashtags];

  let checks = await runQualityChecks({
    ...input,
    caption: currentCaption,
    hashtags: currentHashtags,
  });

  let combinedScore = computeCombinedScore(
    checks.contentScore,
    checks.visualScore,
    checks.brandScore,
    checks.antiPromiseScore,
  );

  log.info(
    `[QualityGate] Score inicial: ${combinedScore}/100 (content=${checks.contentScore}, visual=${checks.visualScore}, brand=${checks.brandScore}, antiPromise=${checks.antiPromiseScore})`,
  );

  while (combinedScore < MIN_SCORE && attempts < MAX_ATTEMPTS && improveCaptionFn) {
    attempts++;
    log.warn(`[QualityGate] Intento ${attempts}: score ${combinedScore}. Mejorando caption...`);

    const feedback = [
      ...checks.details.content.feedback,
      ...checks.details.visual.issues.map((i: { rule: string; message: string }) => `${i.rule}: ${i.message}`),
      ...checks.details.brand.issues.map((i: { field: string; message: string }) => `${i.field}: ${i.message}`),
      ...checks.details.antiPromise.matches.map((m) => `anti-promise: ${m.pattern}`),
    ];

    if (env.dryRun) {
      log.info('[QualityGate] DRY_RUN: simulando mejora');
      break;
    }

    try {
      currentCaption = await improveCaptionFn(feedback);
      checks = await runQualityChecks({
        ...input,
        caption: currentCaption,
        hashtags: currentHashtags,
      });
      combinedScore = computeCombinedScore(
        checks.contentScore,
        checks.visualScore,
        checks.brandScore,
        checks.antiPromiseScore,
      );
    } catch (err) {
      log.error(`[QualityGate] Error en mejora: ${(err as Error).message}`);
      break;
    }
  }

  const passed = combinedScore >= MIN_SCORE;

  if (!passed) {
    const allFeedback = [
      ...checks.details.content.feedback,
      ...checks.details.visual.issues.map((i) => `[${i.severity}] ${i.message}`),
      ...checks.details.brand.issues.map((i) => `[${i.severity}] ${i.message}`),
    ].join('\n');

    const checkpoint = createCheckpoint(
      'content_approval',
      `Quality Gate falló (${combinedScore}/${MIN_SCORE}). Revisar calidad textual/visual/marca.`,
      `qg-${Date.now()}`,
      {
        combinedScore,
        contentScore: checks.contentScore,
        visualScore: checks.visualScore,
        brandScore: checks.brandScore,
        antiPromiseScore: checks.antiPromiseScore,
        feedback: allFeedback,
      },
      2880,
    );

    sendAlert({
      severity: 'warn',
      title: '🚫 Quality Gate bloqueó publicación',
      body: `Score: ${combinedScore}/${MIN_SCORE}\n${allFeedback.slice(0, 1500)}`,
      metadata: { checkpointId: checkpoint.id },
    }).catch(() => undefined);

    audit({
      action: 'COMPLIANCE_BLOCKED',
      outcome: 'blocked',
      reason: `QUALITY_GATE_BLOCKED: ${combinedScore}/${MIN_SCORE}`,
      contentSummary: currentCaption.slice(0, 120),
    });

    return {
      passed: false,
      combinedScore,
      contentScore: checks.contentScore,
      visualScore: checks.visualScore,
      brandScore: checks.brandScore,
      antiPromiseScore: checks.antiPromiseScore,
      tasteScore: checks.tasteScore,
      details: checks.details,
      attempts,
      checkpointId: checkpoint.id,
      requiresHumanApproval: true,
    };
  }

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `QUALITY_GATE_PASSED: ${combinedScore}`,
  });

  return {
    passed: true,
    combinedScore,
    contentScore: checks.contentScore,
    visualScore: checks.visualScore,
    brandScore: checks.brandScore,
    antiPromiseScore: checks.antiPromiseScore,
    tasteScore: checks.tasteScore,
    details: checks.details,
    attempts,
    requiresHumanApproval: false,
  };
};
