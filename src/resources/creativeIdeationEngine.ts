/**
 * Phase 38: Creative Ideation Engine
 *
 * Combines Phase 33-37 to generate carousel concepts automatically
 */

import { VisualPattern, queryPatterns } from './visualPatternLibrary';
import { CopyPattern, findCopyPattern } from './copyPatternLibrary';
import { ColorPalette, getPaletteByIndustryEmotion } from './colorPsychologyMap';
import { CarouselFlowPattern, getFlowTemplate } from './narrativeFlowPatterns';

export interface CarouselBriefing {
  industry: string;
  audience: string;
  messageType: 'promo' | 'education' | 'lifestyle' | 'social-proof' | 'feature';
  emotion: string;
  goal: 'awareness' | 'engagement' | 'conversion' | 'education';
}

export interface GeneratedCarouselConcept {
  id: string;
  title: string;
  briefing: CarouselBriefing;

  // Visual direction
  visualPattern: VisualPattern;
  colorPalette: ColorPalette;
  layoutTemplate: string;

  // Copy direction
  hookCopy: CopyPattern;
  educationCopy?: CopyPattern;
  ctaCopy: CopyPattern;

  // Flow structure
  flowPattern: CarouselFlowPattern;
  slides: {
    number: number;
    role: string;
    copyDirection: string;
    visualDirection: string;
  }[];

  // Guidance
  creativeDirection: string;
  retentionStrategy: string;
  nextSteps: string[];
}

export const generateCarouselConcepts = (briefing: CarouselBriefing, count: number = 3): GeneratedCarouselConcept[] => {
  const concepts: GeneratedCarouselConcept[] = [];

  // Get visual patterns matching brief
  const visualMatches = queryPatterns({
    industry: briefing.industry,
    emotion: briefing.emotion
  });

  // Get copy patterns
  const hookCopies = findCopyPattern({ type: 'hook', tone: briefing.emotion });
  const ctaCopies = findCopyPattern({ type: 'cta' });
  const educationCopies = findCopyPattern({ type: 'education' });

  // Get color palette
  const colorMatch = getPaletteByIndustryEmotion(briefing.industry, briefing.emotion);

  // Get flow template
  const flowMatch = getFlowTemplate({
    industry: briefing.industry,
    messageType: briefing.messageType
  });

  // Generate N concepts
  for (let i = 0; i < count && i < Math.min(visualMatches.length, hookCopies.length); i++) {
    const concept: GeneratedCarouselConcept = {
      id: `concept-${Date.now()}-${i}`,
      title: `Carousel Concept ${i + 1} for ${briefing.industry.toUpperCase()}`,
      briefing,

      // Visual
      visualPattern: visualMatches[i] || visualMatches[0],
      colorPalette: colorMatch || { id: 'default', name: 'Default', primary: '#000', secondary: '#FFF', accent: '#FF0', emotion: [], industries: [], psychology: '', accessibilityRatio: 4.5, examples: [] },
      layoutTemplate: visualMatches[i]?.layout.type || 'hero-left',

      // Copy
      hookCopy: hookCopies[i] || hookCopies[0],
      educationCopy: educationCopies[0],
      ctaCopy: ctaCopies[0],

      // Flow
      flowPattern: flowMatch || { id: 'default', name: 'Default Flow', slides: 6, flow: [], retention: [], industryFit: [], psychologyFlow: '' },

      // Slides breakdown
      slides: (flowMatch?.flow || []).map((roleDesc, idx) => ({
        number: idx + 1,
        role: roleDesc,
        copyDirection: hookCopies[0]?.template || '',
        visualDirection: visualMatches[0]?.layout.type || 'hero-left'
      })),

      creativeDirection: `Use ${visualMatches[i]?.layout.type || 'hero-left'} layout with ${colorMatch?.name || 'primary'} color palette. Lead with ${hookCopies[0]?.template || 'hook'}. Apply ${flowMatch?.name || 'default'} flow structure.`,

      retentionStrategy: `Hook at slide 1 with curiosity/emotion. Sustain through education (slides 3-4). Build proof (slides 5-6). Close with urgent CTA.`,

      nextSteps: [
        '1. Gather assets (photos, illustrations)',
        '2. Apply color palette to design',
        '3. Write specific copy for each slide using patterns',
        '4. Design layout mockup',
        '5. Validate with Metricool benchmarks',
        '6. Publish and track performance'
      ]
    };

    concepts.push(concept);
  }

  return concepts;
};

export const generateBatchConcepts = (briefings: CarouselBriefing[]): GeneratedCarouselConcept[] => {
  let allConcepts: GeneratedCarouselConcept[] = [];

  for (const briefing of briefings) {
    const concepts = generateCarouselConcepts(briefing, 2);
    allConcepts = allConcepts.concat(concepts);
  }

  return allConcepts;
};

export const formatConceptForOutput = (concept: GeneratedCarouselConcept): string => {
  return `
CAROUSEL CONCEPT: ${concept.title}
================

VISUAL DIRECTION:
- Layout: ${concept.layoutTemplate}
- Colors: ${concept.colorPalette.name}
- Pattern: ${concept.visualPattern.name}

COPY DIRECTION:
- Hook: ${concept.hookCopy.template}
- Education: ${concept.educationCopy?.template || 'N/A'}
- CTA: ${concept.ctaCopy.template}

FLOW STRUCTURE:
${concept.slides.map(s => `  Slide ${s.number}: ${s.role}`).join('\n')}

CREATIVE BRIEF:
${concept.creativeDirection}

RETENTION STRATEGY:
${concept.retentionStrategy}

NEXT STEPS:
${concept.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}
  `;
};
