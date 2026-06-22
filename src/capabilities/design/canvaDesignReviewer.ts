/**
 * Canva Design Reviewer — QA post-render de diseños Canva.
 *
 * 1. Toma el resultado del render de Canva + metadatos del contenido.
 * 2. Ejecuta visualQA.
 * 3. Si score < 75, intenta regenerar con feedback (hasta 2 veces).
 * 4. Si sigue fallando, crea checkpoint humano.
 */

import { log } from '../../agent/logger.js';
import { audit } from '../../compliance/auditLog.js';
import { createCheckpoint } from '../../agent/checkpoints.js';
import { sendAlert } from '../../integrations/notifications.js';
import { env } from '../../config/index.js';
import type { RenderedDesign } from '../content/canvaRender.js';
import { validateVisualQA, type VisualQAInput, type VisualQAResult, generateVisualQAFeedback } from './visualQA.js';

export interface DesignReviewResult {
  ok: boolean;
  passed: boolean;
  score: number;
  attempts: number;
  finalDesign?: RenderedDesign;
  visualQA: VisualQAResult;
  checkpointId?: string;
  requiresHumanApproval: boolean;
}

export interface ReviewableContent {
  platform: 'instagram' | 'tiktok';
  format: 'carrusel' | 'reel' | 'story' | 'post';
  slides: VisualQAInput['slides'];
}

const MAX_ATTEMPTS = 2;

export const reviewCanvaDesign = async (
  rendered: RenderedDesign,
  content: ReviewableContent,
  regenerateFn?: () => Promise<RenderedDesign>,
): Promise<DesignReviewResult> => {
  let currentDesign = rendered;
  let attempts = 0;
  let visualQA = validateVisualQA({
    platform: content.platform,
    format: content.format,
    slides: content.slides,
    exportUrl: currentDesign.exportUrls?.[0],
  });

  log.info(`[CanvaDesignReviewer] Score inicial: ${visualQA.score}/100`);

  while (!visualQA.passed && attempts < MAX_ATTEMPTS && regenerateFn) {
    attempts++;
    log.warn(`[CanvaDesignReviewer] Intento ${attempts}: score ${visualQA.score}. Regenerando...`);

    audit({
      action: 'API_REQUEST',
      outcome: 'failure',
      reason: `VISUAL_QA_FAILED: score ${visualQA.score}. Regeneración intento ${attempts}.`,
      contentSummary: generateVisualQAFeedback(visualQA).slice(0, 200),
    });

    if (env.dryRun) {
      log.info('[CanvaDesignReviewer] DRY_RUN: simulando regeneración');
      break;
    }

    currentDesign = await regenerateFn();
    visualQA = validateVisualQA({
      platform: content.platform,
      format: content.format,
      slides: content.slides,
      exportUrl: currentDesign.exportUrls?.[0],
    });
  }

  if (!visualQA.passed) {
    const checkpoint = createCheckpoint(
      'content_approval',
      `Diseño ${content.platform}/${content.format} no pasó QA visual (${visualQA.score}/100). Revisar manualmente.`,
      currentDesign.designId ?? `design-${Date.now()}`,
      {
        platform: content.platform,
        format: content.format,
        score: visualQA.score,
        issues: visualQA.issues,
        designUrl: currentDesign.designUrl,
      },
      2880, // 48h
    );

    sendAlert({
      severity: 'warn',
      title: `🎨 QA visual falló — ${content.platform}/${content.format}`,
      body: generateVisualQAFeedback(visualQA),
      metadata: { checkpointId: checkpoint.id, score: visualQA.score },
    }).catch(() => undefined);

    audit({
      action: 'API_REQUEST',
      outcome: 'failure',
      reason: `VISUAL_QA_ESCALATED: checkpoint ${checkpoint.id}`,
    });

    return {
      ok: false,
      passed: false,
      score: visualQA.score,
      attempts,
      finalDesign: currentDesign,
      visualQA,
      checkpointId: checkpoint.id,
      requiresHumanApproval: true,
    };
  }

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `VISUAL_QA_PASSED: score ${visualQA.score}`,
  });

  return {
    ok: true,
    passed: true,
    score: visualQA.score,
    attempts,
    finalDesign: currentDesign,
    visualQA,
    requiresHumanApproval: false,
  };
};
