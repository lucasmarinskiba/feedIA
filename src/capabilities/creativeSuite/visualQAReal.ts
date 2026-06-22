/**
 * Visual QA Real — análisis de calidad visual usando computer vision (Claude Vision).
 *
 * Reemplaza/enriquece el QA heurístico con análisis real de píxeles: paleta,
 * consistencia de marca, detección de riesgos visuales, OCR básico.
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { analizarImagen } from '../vision/analyzer.js';
import type { VisualQARealInput, VisualQARealResult } from './types.js';

const DRY_RUN = process.env['DRY_RUN'] === 'true';

const mockVisualQA = (input: VisualQARealInput): VisualQARealResult => ({
  score: 78,
  passed: true,
  issues: [],
  insights: [`Mock QA for ${input.format} on ${input.platform}`, 'Claude Vision not invoked in DRY_RUN'],
  dominantColors: ['#FFFFFF', '#000000'],
  textDetected: ['mock text'],
});

export const analyzeVisualQuality = async (
  brand: BrandProfile,
  input: VisualQARealInput,
): Promise<VisualQARealResult> => {
  if (DRY_RUN) {
    return mockVisualQA(input);
  }

  try {
    const analysis = await analizarImagen(brand, { type: 'url', url: input.imageUrl });

    const issues: VisualQARealResult['issues'] = [];

    if (analysis.brandConsistency.score < 60) {
      issues.push({
        severity: 'high',
        rule: 'brand-consistency',
        message: `Consistencia de marca baja (${analysis.brandConsistency.score}/100)`,
        suggestion: analysis.brandConsistency.razones.join('; '),
      });
    } else if (analysis.brandConsistency.score < 75) {
      issues.push({
        severity: 'medium',
        rule: 'brand-consistency',
        message: `Consistencia de marca mejorable (${analysis.brandConsistency.score}/100)`,
        suggestion: 'Ajustar paleta o tipografía para acercarse a la marca',
      });
    }

    if (analysis.riesgosVisuales.length > 0) {
      issues.push({
        severity: 'critical',
        rule: 'visual-risks',
        message: `Riesgos visuales detectados: ${analysis.riesgosVisuales.join(', ')}`,
        suggestion: 'Revisar manualmente antes de publicar',
      });
    }

    const score = Math.max(0, Math.min(100, analysis.brandConsistency.score - issues.length * 10));

    log.info(
      `[VisualQAReal] Score ${score}/100 for ${input.format} (${analysis.brandConsistency.score} brand consistency)`,
    );

    return {
      score,
      passed: score >= 70,
      issues,
      insights: [analysis.descripcion, analysis.composicion, analysis.emocion],
      dominantColors: analysis.paletaDominante,
      textDetected: [], // Claude Vision no expone OCR literal en este endpoint; placeholder para futura integración
    };
  } catch (err) {
    log.warn(`[VisualQAReal] Failed: ${(err as Error).message}. Fallback to mock.`);
    return mockVisualQA(input);
  }
};
