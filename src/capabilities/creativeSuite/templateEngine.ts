/**
 * Template Engine — biblioteca propia de templates creativos parametrizables.
 */

import { log } from '../../agent/logger.js';
import type { CreativeTemplate, TemplateSlot } from './types.js';

const TEMPLATES: CreativeTemplate[] = [
  {
    id: 'cs-car-bold-3slides',
    name: 'Carrusel Bold 3 Slides',
    format: 'carrusel',
    aspectRatio: '4:5',
    width: 1080,
    height: 1350,
    slots: [
      {
        id: 's1-headline',
        type: 'text',
        role: 'headline',
        x: 80,
        y: 200,
        width: 920,
        height: 120,
        style: { fontSize: 72, align: 'left' },
      },
      {
        id: 's1-body',
        type: 'text',
        role: 'body',
        x: 80,
        y: 360,
        width: 920,
        height: 300,
        style: { fontSize: 40, align: 'left' },
      },
      {
        id: 's2-headline',
        type: 'text',
        role: 'headline',
        x: 80,
        y: 120,
        width: 920,
        height: 100,
        style: { fontSize: 56, align: 'left' },
      },
      {
        id: 's2-body',
        type: 'text',
        role: 'body',
        x: 80,
        y: 260,
        width: 920,
        height: 800,
        style: { fontSize: 36, align: 'left' },
      },
      {
        id: 's3-cta',
        type: 'text',
        role: 'cta',
        x: 80,
        y: 1000,
        width: 920,
        height: 120,
        style: { fontSize: 64, align: 'center' },
      },
    ],
  },
  {
    id: 'cs-reel-hook',
    name: 'Reel Hook 9:16',
    format: 'reel',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    slots: [
      {
        id: 'r-hook',
        type: 'text',
        role: 'headline',
        x: 80,
        y: 300,
        width: 920,
        height: 200,
        style: { fontSize: 80, align: 'center' },
      },
      {
        id: 'r-sub',
        type: 'text',
        role: 'body',
        x: 80,
        y: 540,
        width: 920,
        height: 120,
        style: { fontSize: 44, align: 'center' },
      },
      {
        id: 'r-cta',
        type: 'text',
        role: 'cta',
        x: 80,
        y: 1500,
        width: 920,
        height: 100,
        style: { fontSize: 48, align: 'center' },
      },
    ],
    animation: 'text_reveal',
  },
  {
    id: 'cs-story-poll',
    name: 'Story Poll 9:16',
    format: 'story',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    slots: [
      {
        id: 'st-question',
        type: 'text',
        role: 'headline',
        x: 80,
        y: 400,
        width: 920,
        height: 160,
        style: { fontSize: 64, align: 'center' },
      },
      {
        id: 'st-option-a',
        type: 'text',
        role: 'body',
        x: 80,
        y: 900,
        width: 920,
        height: 80,
        style: { fontSize: 40, align: 'center' },
      },
      {
        id: 'st-option-b',
        type: 'text',
        role: 'body',
        x: 80,
        y: 1020,
        width: 920,
        height: 80,
        style: { fontSize: 40, align: 'center' },
      },
    ],
  },
  {
    id: 'cs-post-1x1',
    name: 'Feed Post 1:1',
    format: 'post',
    aspectRatio: '1:1',
    width: 1080,
    height: 1080,
    slots: [
      {
        id: 'p-headline',
        type: 'text',
        role: 'headline',
        x: 80,
        y: 160,
        width: 920,
        height: 140,
        style: { fontSize: 68, align: 'center' },
      },
      {
        id: 'p-body',
        type: 'text',
        role: 'body',
        x: 120,
        y: 340,
        width: 840,
        height: 500,
        style: { fontSize: 38, align: 'center' },
      },
      {
        id: 'p-cta',
        type: 'text',
        role: 'cta',
        x: 80,
        y: 900,
        width: 920,
        height: 100,
        style: { fontSize: 44, align: 'center' },
      },
    ],
  },
];

export const listTemplates = (opts?: {
  format?: CreativeTemplate['format'];
  aspectRatio?: CreativeTemplate['aspectRatio'];
}): CreativeTemplate[] => {
  let filtered = [...TEMPLATES];
  if (opts?.format) filtered = filtered.filter((t) => t.format === opts.format);
  if (opts?.aspectRatio) filtered = filtered.filter((t) => t.aspectRatio === opts.aspectRatio);
  return filtered;
};

export const getTemplate = (id: string): CreativeTemplate | undefined => TEMPLATES.find((t) => t.id === id);

export const fillTemplate = (template: CreativeTemplate, values: Record<string, string>): CreativeTemplate => {
  const filledSlots: TemplateSlot[] = template.slots.map((slot) => ({
    ...slot,
    ...(values[slot.id] ? { value: values[slot.id] } : {}),
  }));
  return { ...template, slots: filledSlots };
};

export const recommendTemplate = (format: CreativeTemplate['format']): CreativeTemplate => {
  const candidates = listTemplates({ format });
  const chosen = candidates[0] ?? TEMPLATES[0]!;
  log.info(`[TemplateEngine] Recommended template "${chosen.name}" for ${format}`);
  return chosen;
};

export const registerTemplate = (template: CreativeTemplate): void => {
  const existing = TEMPLATES.find((t) => t.id === template.id);
  if (existing) {
    Object.assign(existing, template);
  } else {
    TEMPLATES.push(template);
  }
};
