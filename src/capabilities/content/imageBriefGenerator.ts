/**
 * Phase 10: Image Brief Generator
 *
 * Converts copy + psychology into visual briefs
 * Describes images for stock/AI generation
 */

import { log } from '../../agent/logger.js';
import type { SlideCopy } from './copywritingEngine.js';

export interface ImageBrief {
  slideNumber: number;
  description: string;
  style: 'photograph' | 'illustration' | 'diagram' | 'abstract' | 'silueta';
  mood: string;
  keywords: string[];
  colorPalette?: string[];
}

export const generateImageBriefs = (
  slides: SlideCopy[],
  topic: string,
): ImageBrief[] => {
  log.info(`[Image Briefs] Generating visuals for ${slides.length} slides`);

  const briefs: ImageBrief[] = slides.map((slide) => {
    const isHook = slide.slideNumber <= 3;
    const isValue = slide.slideNumber <= 7;

    return {
      slideNumber: slide.slideNumber,
      description: generateDescription(slide, topic, isHook),
      style: selectStyle(slide.slideNumber),
      mood: selectMood(slide.slideNumber),
      keywords: extractKeywords(slide.headline, topic),
      colorPalette: selectPalette(slide.slideNumber),
    };
  });

  return briefs;
};

const generateDescription = (slide: SlideCopy, topic: string, isHook: boolean): string => {
  if (isHook) {
    return `High-energy visual for "${slide.headline}". Bold, attention-grabbing composition. ${topic} theme. Close-up or hero image. Vibrant colors.`;
  }

  return `Educational visual supporting "${slide.headline}". Clear, informative composition. ${topic} context. Medium shot. Professional style.`;
};

const selectStyle = (slideNumber: number): ImageBrief['style'] => {
  if (slideNumber === 1) return 'photograph';
  if (slideNumber <= 3) return 'silueta';
  if (slideNumber <= 7) return 'illustration';
  return 'abstract';
};

const selectMood = (slideNumber: number): string => {
  if (slideNumber <= 3) return 'exciting, curiosity-driven, eye-catching';
  if (slideNumber <= 7) return 'educational, trustworthy, professional';
  return 'inspiring, call-to-action, motivational';
};

const extractKeywords = (headline: string, topic: string): string[] => {
  const words = headline.toLowerCase().split(' ').filter((w) => w.length > 4);
  return [...new Set([...words, topic.toLowerCase()])].slice(0, 5);
};

const selectPalette = (slideNumber: number): string[] | undefined => {
  if (slideNumber === 1) return ['#E91E8C', '#22D3EE', '#FFFFFF']; // Bold playful
  if (slideNumber <= 3) return ['#E91E8C', '#000000', '#FFFFFF']; // High contrast
  if (slideNumber <= 7) return ['#001F3F', '#E6D5B8', '#FFFFFF']; // Premium dark
  return ['#6B8E71', '#F5EEE0', '#C65911']; // Warm organic
};
