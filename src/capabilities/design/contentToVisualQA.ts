/**
 * Content → VisualQA Input — Convierte carruseles y reels en input estructurado
 * para validación de QA visual.
 */

import type { CarruselResult, CarruselSlide } from '../content/carrusel.js';
import type { ReelScript } from '../content/reel.js';
import type { CreativeTemplate, TemplateSlot } from '../creativeSuite/types.js';
import { fillTemplate } from '../creativeSuite/templateEngine.js';
import type { VisualQAInput, TextElement, SlideOrFrame } from './visualQA.js';

const inferRoleFromSlot = (slot: TemplateSlot): TextElement['role'] => {
  const role = slot.role;
  if (role === 'headline' || role === 'body' || role === 'cta') return role;
  const id = slot.id.toLowerCase();
  if (id.includes('cta')) return 'cta';
  if (id.includes('head') || id.includes('hook') || id.includes('title')) return 'headline';
  if (id.includes('body') || id.includes('sub') || id.includes('desc')) return 'body';
  return 'caption';
};

const slotToTextElement = (slot: TemplateSlot): TextElement => ({
  text: slot.value ?? '',
  role: inferRoleFromSlot(slot),
  x: slot.x,
  y: slot.y,
  width: slot.width,
  height: slot.height,
  fontSize: slot.style?.fontSize,
  fontFamily: slot.style?.fontFamily,
  color: slot.style?.color,
});

const slidePrefixToIndex = (slotId: string): number | undefined => {
  const match = slotId.match(/^(?:s|slide)?(\d+)-/i);
  if (match) return Math.max(0, parseInt(match[1]!, 10) - 1);
  return undefined;
};

const enrichSlidesWithTemplate = (slides: SlideOrFrame[], template: CreativeTemplate): SlideOrFrame[] => {
  const groups = new Map<number, TemplateSlot[]>();
  const defaultReelIndex = 0;
  for (const slot of template.slots) {
    const idx = slidePrefixToIndex(slot.id) ?? defaultReelIndex;
    if (!groups.has(idx)) groups.set(idx, []);
    groups.get(idx)!.push(slot);
  }

  return slides.map((slide, index) => {
    const slots = groups.get(index);
    if (!slots || slots.length === 0) return slide;
    return {
      ...slide,
      textElements: slots.map(slotToTextElement),
    };
  });
};

const applyCarruselToTemplate = (carrusel: CarruselResult, template: CreativeTemplate): CreativeTemplate => {
  const values: Record<string, string> = {};
  for (const slot of template.slots) {
    const idx = slidePrefixToIndex(slot.id) ?? 0;
    const slide = carrusel.slides[idx];
    if (!slide) continue;
    const id = slot.id.toLowerCase();
    if (id.includes('head') || id.includes('hook') || id.includes('title')) {
      values[slot.id] = slide.titulo;
    } else if (id.includes('body') || id.includes('sub')) {
      values[slot.id] = slide.cuerpo;
    } else if (id.includes('cta')) {
      values[slot.id] = slide.rolEnNarrativa === 'cta' ? slide.cuerpo || slide.titulo : carrusel.cta;
    }
  }
  return fillTemplate(template, values);
};

const applyReelToTemplate = (reel: ReelScript, template: CreativeTemplate): CreativeTemplate => {
  const values: Record<string, string> = {};
  for (const slot of template.slots) {
    const id = slot.id.toLowerCase();
    if (id.includes('hook') || id.includes('head')) values[slot.id] = reel.hookVisual;
    else if (id.includes('sub') || id.includes('body')) values[slot.id] = reel.caption;
    else if (id.includes('cta')) values[slot.id] = reel.cta;
  }
  return fillTemplate(template, values);
};

const extractTextElementsFromSlide = (slide: CarruselSlide): TextElement[] => {
  const elements: TextElement[] = [];

  if (slide.titulo) {
    elements.push({
      text: slide.titulo,
      role: slide.rolEnNarrativa === 'cta' ? 'cta' : 'headline',
    });
  }

  if (slide.cuerpo) {
    elements.push({
      text: slide.cuerpo,
      role: 'body',
    });
  }

  return elements;
};

export const carruselToVisualQAInput = (carrusel: CarruselResult, exportUrl?: string): VisualQAInput => ({
  platform: 'instagram',
  format: 'carrusel',
  slides: carrusel.slides.map(
    (slide, index): SlideOrFrame => ({
      id: `slide-${index + 1}`,
      index,
      textElements: extractTextElementsFromSlide(slide),
      backgroundColor: '#FFFFFF',
      hasImage: true,
    }),
  ),
  exportUrl,
});

export const reelToVisualQAInput = (reel: ReelScript, exportUrl?: string): VisualQAInput => ({
  platform: 'instagram',
  format: 'reel',
  slides: [
    {
      id: 'reel-frame-1',
      index: 0,
      textElements: [
        { text: reel.hookVisual, role: 'headline' },
        ...(reel.caption ? [{ text: reel.caption, role: 'body' as const }] : []),
        ...(reel.cta ? [{ text: reel.cta, role: 'cta' as const }] : []),
      ],
      backgroundColor: '#000000',
      hasImage: true,
    },
  ],
  exportUrl,
});

export const buildVisualQAInput = (opts: {
  carrusel?: CarruselResult;
  reel?: ReelScript;
  exportUrl?: string;
  platform?: 'instagram' | 'tiktok';
  template?: CreativeTemplate;
}): VisualQAInput => {
  const { carrusel, reel, exportUrl, platform = 'instagram', template } = opts;
  if (carrusel) {
    const input = carruselToVisualQAInput(carrusel, exportUrl);
    if (template) {
      const filled = applyCarruselToTemplate(carrusel, template);
      input.slides = enrichSlidesWithTemplate(input.slides, filled);
    }
    return { ...input, platform };
  }
  if (reel) {
    const input = reelToVisualQAInput(reel, exportUrl);
    if (template) {
      const filled = applyReelToTemplate(reel, template);
      input.slides = enrichSlidesWithTemplate(input.slides, filled);
    }
    return { ...input, platform };
  }
  throw new Error('buildVisualQAInput requires carrusel or reel');
};
