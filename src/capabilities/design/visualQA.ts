/**
 * Visual QA — valida reglas profesionales de diseño sobre assets exportados.
 *
 * Versión actual: validación basada en metadatos estructurados del contenido.
 * Futuro: integrar computer vision (OCR, detección de elementos, análisis de color)
 * sobre el PNG exportado.
 */

import { z } from 'zod';
import { getFormatSpecForContent } from './gridSystem.js';

export const VisualIssueSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type VisualIssueSeverity = z.infer<typeof VisualIssueSeveritySchema>;

export interface VisualIssue {
  rule: string;
  severity: VisualIssueSeverity;
  message: string;
  suggestion: string;
}

export interface VisualQAResult {
  score: number; // 0-100
  passed: boolean;
  format: string;
  issues: VisualIssue[];
}

export interface TextElement {
  text: string;
  role: 'headline' | 'body' | 'cta' | 'caption';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

export interface SlideOrFrame {
  id: string;
  index: number;
  textElements: TextElement[];
  backgroundColor?: string;
  hasImage?: boolean;
}

export interface VisualQAInput {
  platform: 'instagram' | 'tiktok';
  format: 'carrusel' | 'reel' | 'story' | 'post';
  slides: SlideOrFrame[];
  exportUrl?: string;
}

const PENALTIES: Record<VisualIssueSeverity, number> = {
  low: 3,
  medium: 8,
  high: 15,
  critical: 25,
};

export const validateVisualQA = (input: VisualQAInput): VisualQAResult => {
  const spec = getFormatSpecForContent(input.platform, input.format);
  if (!spec) {
    return {
      score: 0,
      passed: false,
      format: `${input.platform}-${input.format}`,
      issues: [
        {
          rule: 'format-unknown',
          severity: 'critical',
          message: `Formato desconocido: ${input.platform}-${input.format}`,
          suggestion: 'Registrar el formato en gridSystem.ts',
        },
      ],
    };
  }

  const issues: VisualIssue[] = [];

  // 1. Carrusel: CTA debe estar en última slide
  if (input.format === 'carrusel' && input.slides.length > 0) {
    const lastSlide = input.slides[input.slides.length - 1];
    const hasCtaInLast = lastSlide?.textElements.some((el) => el.role === 'cta');
    if (!hasCtaInLast) {
      issues.push({
        rule: 'cta-last-slide',
        severity: 'high',
        message: 'El CTA no está en la última slide del carrusel',
        suggestion: 'Mover el CTA a la última slide para maximizar conversión',
      });
    }
  }

  // 2. Validaciones por slide
  input.slides.forEach((slide) => {
    const fonts = new Set(slide.textElements.map((el) => el.fontFamily).filter(Boolean));
    if (fonts.size > spec.typography.maxFonts) {
      issues.push({
        rule: 'too-many-fonts',
        severity: 'medium',
        message: `Slide ${slide.index + 1} usa ${fonts.size} fuentes (máx ${spec.typography.maxFonts})`,
        suggestion: `Reducir a ${spec.typography.maxFonts} fuentes por pieza`,
      });
    }

    const headlines = slide.textElements.filter((el) => el.role === 'headline');
    const bodies = slide.textElements.filter((el) => el.role === 'body');

    for (const headline of headlines) {
      for (const body of bodies) {
        if (
          headline.fontSize &&
          body.fontSize &&
          headline.fontSize / body.fontSize < spec.typography.minHeadlineRatio
        ) {
          issues.push({
            rule: 'typographic-hierarchy',
            severity: 'medium',
            message: `Slide ${slide.index + 1}: headline (${headline.fontSize}px) no es suficientemente mayor que body (${body.fontSize}px)`,
            suggestion: `Asegurar ratio H1/body ≥ ${spec.typography.minHeadlineRatio}`,
          });
        }
      }
    }

    // 3. Safe zones (si hay posiciones)
    for (const el of slide.textElements) {
      if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
        const inSafeZone =
          el.x >= spec.safeZone.left &&
          el.x + el.width <= spec.width - spec.safeZone.right &&
          el.y >= spec.safeZone.top &&
          el.y + el.height <= spec.height - spec.safeZone.bottom;
        if (!inSafeZone) {
          issues.push({
            rule: 'safe-zone',
            severity: 'high',
            message: `Slide ${slide.index + 1}: texto "${el.text.slice(0, 30)}" fuera de safe zone`,
            suggestion: `Mantener texto dentro de márgenes seguros (top=${spec.safeZone.top}, bottom=${spec.safeZone.bottom})`,
          });
        }

        const hasMargins =
          el.x >= spec.margins.min &&
          spec.width - (el.x + el.width) >= spec.margins.min &&
          el.y >= spec.margins.min &&
          spec.height - (el.y + el.height) >= spec.margins.min;
        if (!hasMargins) {
          issues.push({
            rule: 'minimum-margins',
            severity: 'medium',
            message: `Slide ${slide.index + 1}: texto "${el.text.slice(0, 30)}" con márgenes insuficientes`,
            suggestion: `Respetar mínimo ${spec.margins.min}px de margen`,
          });
        }
      }
    }

    // 4. Text area vs whitespace
    const totalTextChars = slide.textElements.reduce((s, el) => s + el.text.length, 0);
    // Heurística: más de 400 caracteres por slide en carrusel = muy denso
    if (input.format === 'carrusel' && totalTextChars > 400) {
      issues.push({
        rule: 'text-density',
        severity: 'medium',
        message: `Slide ${slide.index + 1}: demasiado texto (${totalTextChars} caracteres)`,
        suggestion: 'Reducir a 250 caracteres máximo por slide o dividir en más slides',
      });
    }

    // 5. Diseño gráfico: palabras por headline y body
    for (const el of slide.textElements) {
      const words = el.text.trim().split(/\s+/).filter(Boolean).length;
      if (el.role === 'headline' && words > 10) {
        issues.push({
          rule: 'headline-too-long',
          severity: 'medium',
          message: `Slide ${slide.index + 1}: título de ${words} palabras`,
          suggestion: 'Limitar títulos a 4-8 palabras para impacto visual',
        });
      }
      if (el.role === 'body' && words > 35) {
        issues.push({
          rule: 'body-too-long',
          severity: 'medium',
          message: `Slide ${slide.index + 1}: body de ${words} palabras`,
          suggestion: 'Reducir body a máximo 25-30 palabras',
        });
      }
      if (el.role === 'headline' && /^[A-ZÁÉÍÓÚÑ\s!¡?¿]+$/.test(el.text) && el.text.length > 15) {
        issues.push({
          rule: 'all-caps-headline',
          severity: 'low',
          message: `Slide ${slide.index + 1}: título en mayúsculas excesivo`,
          suggestion: 'Usar mayúsculas solo para 1-3 palabras de énfasis',
        });
      }
    }

    // 6. Pinterest/IG aesthetic: slides sin imagen en carrusel son sospechosos
    if (input.format === 'carrusel' && !slide.hasImage && slide.textElements.length > 0) {
      issues.push({
        rule: 'missing-visual',
        severity: 'low',
        message: `Slide ${slide.index + 1}: sin imagen o textura visual`,
        suggestion: 'Agregar una imagen, forma o textura para elevar la estética',
      });
    }
  });

  // 5. Reel/Story: hook debe ser prominente (corto y grande)
  if ((input.format === 'reel' || input.format === 'story') && input.slides[0]) {
    const hook = input.slides[0].textElements.find((el) => el.role === 'headline');
    if (hook && hook.text.length > 80) {
      issues.push({
        rule: 'hook-too-long',
        severity: 'high',
        message: `Hook de ${input.format} muy largo (${hook.text.length} caracteres)`,
        suggestion: 'Reducir hook a máximo 60 caracteres para legibilidad mobile',
      });
    }
  }

  // Calcular score
  const totalPenalty = issues.reduce((sum, issue) => sum + PENALTIES[issue.severity], 0);
  const score = Math.max(0, 100 - totalPenalty);

  return {
    score,
    passed: score >= 75,
    format: spec.id,
    issues,
  };
};

export const generateVisualQAFeedback = (result: VisualQAResult): string => {
  if (result.issues.length === 0) return 'Diseño aprobado por QA visual.';
  return result.issues
    .map((issue) => `[${issue.severity.toUpperCase()}] ${issue.message} → ${issue.suggestion}`)
    .join('\n');
};
