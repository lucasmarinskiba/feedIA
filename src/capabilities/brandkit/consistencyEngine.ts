import type { BrandProfile } from '../../config/types.js';
import { scoreAesthetic } from '../aesthetic/aestheticScorer.js';
import type { BrandKit, ValidationIssue } from './types.js';
import { validateContentAgainstBrandKit } from './validator.js';

export interface BrandConsistencyReport {
  consistencyScore: number;
  aestheticScore: number;
  combinedScore: number;
  passed: boolean;
  threshold: number;
  paletteScore: number;
  typographyScore: number;
  iconographyScore: number;
  voiceScore: number;
  compositionScore: number;
  issues: ValidationIssue[];
  recommendations: string[];
  contentId?: string;
}

export const runBrandConsistencyCheck = (
  content: {
    id?: string;
    title: string;
    format: 'reel' | 'carrusel' | 'post-imagen' | 'historia';
    description: string;
    colorsUsed?: string[];
    fontsUsed?: string[];
    iconography?: string[];
    textBlocks?: number;
    imageBlocks?: number;
    density?: 'low' | 'medium' | 'high';
  },
  brand: BrandProfile,
  kit: BrandKit,
): BrandConsistencyReport => {
  // Run aesthetic scorer
  const aesthetic = scoreAesthetic(brand, {
    title: content.title,
    format: content.format,
    colorsUsed: content.colorsUsed ?? [],
    fontsUsed: content.fontsUsed ?? [],
    textBlocks: content.textBlocks ?? 3,
    imageBlocks: content.imageBlocks ?? 1,
    densityEstimate: content.density ?? 'medium',
    description: content.description,
  });

  // Run brand kit validator
  const brandKitResult = validateContentAgainstBrandKit(
    {
      colorsUsed: content.colorsUsed,
      fontsUsed: content.fontsUsed,
      description: content.description,
      iconography: content.iconography,
    },
    kit,
    brand,
  );

  // Combine scores: 40% aesthetic, 60% brand kit consistency
  const combinedScore = Math.round(aesthetic.total * 0.4 + brandKitResult.totalScore * 0.6);
  const threshold = 70;
  const passed = combinedScore >= threshold;

  const recommendations: string[] = [];
  if (!passed) {
    recommendations.push(
      `Score combinado ${combinedScore} está por debajo del umbral ${threshold}. Revisar issues antes de publicar.`,
    );
  }
  for (const issue of brandKitResult.issues) {
    if (issue.suggestion) recommendations.push(`[${issue.severity.toUpperCase()}] ${issue.field}: ${issue.suggestion}`);
  }
  for (const issue of aesthetic.issues) {
    recommendations.push(`[AESTHETIC] ${issue}`);
  }
  for (const suggestion of aesthetic.suggestions) {
    recommendations.push(`[SUGERENCIA] ${suggestion}`);
  }

  return {
    consistencyScore: brandKitResult.totalScore,
    aestheticScore: aesthetic.total,
    combinedScore,
    passed,
    threshold,
    paletteScore: brandKitResult.paletteScore,
    typographyScore: brandKitResult.typographyScore,
    iconographyScore: brandKitResult.iconographyScore,
    voiceScore: brandKitResult.voiceScore,
    compositionScore: brandKitResult.compositionScore,
    issues: brandKitResult.issues,
    recommendations,
    contentId: content.id,
  };
};
