/**
 * Phase 10: Slide Sequencer
 *
 * Orders carousel slides for maximum engagement + conversion
 * Implements Pinterest/Instagram best practices
 */

import { log } from '../../agent/logger.js';

export interface SlideSequence {
  slideNumber: number;
  purpose: 'hook' | 'value' | 'education' | 'proof' | 'cta' | 'retention';
  order: number;
  engagement_target: string;
}

export const sequenceCarousel = (slideCount: number): SlideSequence[] => {
  log.info(`[Sequencer] Ordering ${slideCount}-slide carousel`);

  const sequence: SlideSequence[] = [];

  if (slideCount >= 1) {
    sequence.push({
      slideNumber: 1,
      purpose: 'hook',
      order: 1,
      engagement_target: 'Stop scroll in first 2 seconds',
    });
  }

  if (slideCount >= 2) {
    sequence.push({
      slideNumber: 2,
      purpose: 'hook',
      order: 2,
      engagement_target: 'Raise curiosity (pattern interrupt)',
    });
  }

  if (slideCount >= 3) {
    sequence.push({
      slideNumber: 3,
      purpose: 'hook',
      order: 3,
      engagement_target: 'Promise of value',
    });
  }

  // Value slides (4-7): Education + proof
  for (let i = 4; i <= Math.min(7, slideCount); i++) {
    sequence.push({
      slideNumber: i,
      purpose: i <= 5 ? 'education' : 'proof',
      order: i,
      engagement_target:
        i <= 5
          ? 'Deliver promised value, keep reading'
          : 'Build credibility, show results',
    });
  }

  // CTA slides (8-10): Action
  if (slideCount >= 8) {
    sequence.push({
      slideNumber: 8,
      purpose: 'cta',
      order: 8,
      engagement_target: 'Clear call-to-action',
    });
  }

  if (slideCount >= 9) {
    sequence.push({
      slideNumber: 9,
      purpose: 'cta',
      order: 9,
      engagement_target: 'Urgency or scarcity element',
    });
  }

  if (slideCount >= 10) {
    sequence.push({
      slideNumber: 10,
      purpose: 'retention',
      order: 10,
      engagement_target: 'Follow/subscribe for more',
    });
  }

  return sequence;
};

export const validateSequence = (sequence: SlideSequence[]): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Validate hook is first 3 slides
  const hooks = sequence.filter((s) => s.purpose === 'hook');
  if (hooks.length < 3 || hooks[0]!.order !== 1) {
    issues.push('Hook must occupy slides 1-3');
  }

  // Validate value is middle
  const values = sequence.filter((s) => s.purpose === 'education' || s.purpose === 'proof');
  if (values.length === 0) {
    issues.push('Must include value/education slides');
  }

  // Validate CTA is near end
  const ctas = sequence.filter((s) => s.purpose === 'cta');
  if (ctas.length === 0) {
    issues.push('Must include CTA slides');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
