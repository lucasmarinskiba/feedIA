/**
 * Phase 33: Visual Pattern Extraction
 *
 * Ingests carousel images → extracts visual patterns
 * Learns: colors, typography, layout, composition, white space, icons
 */

export interface VisualPattern {
  id: string;
  name: string;
  industry: string;
  platform: 'carousel' | 'story' | 'reel' | 'post';
  emotion: 'energetic' | 'trust' | 'premium' | 'playful' | 'urgent' | 'aspirational';

  // Color system
  colors: {
    primary: string; // hex
    secondary: string;
    accent: string;
    contrast: 'high' | 'medium' | 'low';
  };

  // Typography
  typography: {
    headlineFont: string;
    bodyFont: string;
    accentFont?: string;
    headlineSize: 'small' | 'medium' | 'large' | 'xlarge';
    hierarchy: 'minimal' | 'moderate' | 'strong';
  };

  // Layout
  layout: {
    type: 'hero-left' | 'hero-right' | 'hero-center' | 'grid' | 'asymmetrical' | 'overlay' | 'split';
    personPlacement: 'left' | 'center' | 'right' | 'full-bleed' | 'detail-only';
    productPlacement: 'hero' | 'detail' | 'secondary' | 'hidden';
    whitespaceRatio: number; // 0-1 (percentage of empty space)
    textOverlapPhoto: boolean;
  };

  // Visual elements
  elements: {
    geometricShapes: boolean;
    shapeType?: 'arrows' | 'triangles' | 'waves' | 'circles' | 'organic';
    icons: boolean;
    illustrations: boolean;
    photoStyle: 'professional' | 'lifestyle' | 'detail' | 'mixed';
    borderRadius: 'square' | 'rounded' | 'organic';
  };

  // Composition
  composition: {
    rule_of_thirds: boolean;
    leading_lines: boolean;
    depth_layers: number; // 1-5
    movement_direction: 'horizontal' | 'vertical' | 'diagonal' | 'circular' | 'none';
  };

  // Meta
  source?: string; // image URL or filename
  extractedFrom?: string; // carousel name/brand
  successMetrics?: {
    shareability?: number; // 1-10
    clarity?: number; // 1-10
    memorability?: number; // 1-10
  };
}

export interface LayoutTemplate {
  id: string;
  type: string;
  description: string;
  visualGuide: string;
  bestFor: string[]; // industries
  colorPalettes: string[]; // ref to color patterns
}

export const visualPatterns: VisualPattern[] = [];

export const layoutTemplates: LayoutTemplate[] = [
  {
    id: 'hero-list',
    type: 'Hero Photo + List Overlay',
    description: 'Person photo with bulleted benefits floating',
    visualGuide: 'Photo 70%, text overlay 30%, vertical center',
    bestFor: ['bikes', 'fitness', 'sports', 'lifestyle'],
    colorPalettes: ['lime-green', 'neon-yellow']
  },
  {
    id: 'close-up-detail',
    type: 'Product Close-Up',
    description: 'Product 60% + minimal text 40%',
    visualGuide: 'Product detail centered, text bottom-right',
    bestFor: ['bikes', 'tech', 'accessories', 'equipment'],
    colorPalettes: ['neon-yellow', 'blue']
  },
  {
    id: 'lifestyle-full-bleed',
    type: 'Lifestyle Full-Bleed',
    description: 'Person in environment edge-to-edge',
    visualGuide: 'Image fills entire slide, text overlay center',
    bestFor: ['sports', 'adventure', 'lifestyle', 'travel'],
    colorPalettes: ['all']
  },
  {
    id: 'feature-grid',
    type: 'Feature Grid (X Beneficios)',
    description: '"X benefits" + numbered list + icons',
    visualGuide: 'Grid layout 3-4 items per row, consistent spacing',
    bestFor: ['education', 'features', 'benefits', 'comparison'],
    colorPalettes: ['lime-green', 'neon-yellow']
  },
  {
    id: 'testimonial-person',
    type: 'Testimonial + Person',
    description: 'Quote + face + action CTA',
    visualGuide: 'Person 50%, quote text 50%, side-by-side',
    bestFor: ['social-proof', 'reviews', 'case-studies'],
    colorPalettes: ['blue', 'red-orange']
  },
  {
    id: 'geometric-shapes',
    type: 'Geometric Overlay',
    description: 'Arrows/triangles + person = movement',
    visualGuide: 'Shapes 30%, person 70%, creates directional flow',
    bestFor: ['campaign', 'awareness', 'action', 'adventure'],
    colorPalettes: ['red-orange', 'blue']
  },
  {
    id: 'single-centered',
    type: 'Single Post/Story Centered',
    description: 'Person or product centered + bold shapes around',
    visualGuide: 'Subject centered, shapes in corners/edges',
    bestFor: ['campaign', 'holiday', 'special-event', 'announcement'],
    colorPalettes: ['all']
  }
];

// Learning engine: ingest new image
export const ingestVisualPattern = (image: any, metadata: any): VisualPattern => {
  // TODO: Vision API to extract:
  // - dominant colors
  // - layout structure
  // - typography hierarchy
  // - element positioning
  // - composition rules

  return {
    id: `pattern-${Date.now()}`,
    name: metadata.name || 'Untitled',
    industry: metadata.industry || 'general',
    platform: metadata.platform || 'carousel',
    emotion: metadata.emotion || 'energetic',
    colors: metadata.colors || { primary: '#000000', secondary: '#FFFFFF', accent: '#FF0000', contrast: 'high' },
    typography: metadata.typography || { headlineFont: 'sans-serif', bodyFont: 'sans-serif', headlineSize: 'large', hierarchy: 'strong' },
    layout: metadata.layout || { type: 'hero-left', personPlacement: 'left', productPlacement: 'hero', whitespaceRatio: 0.2, textOverlapPhoto: true },
    elements: metadata.elements || { geometricShapes: false, icons: false, illustrations: false, photoStyle: 'mixed', borderRadius: 'rounded' },
    composition: metadata.composition || { rule_of_thirds: true, leading_lines: true, depth_layers: 3, movement_direction: 'horizontal' },
    source: metadata.source,
    extractedFrom: metadata.extractedFrom,
    successMetrics: metadata.successMetrics
  };
};

// Query patterns by criteria
export const queryPatterns = (filters: {
  industry?: string;
  platform?: string;
  emotion?: string;
  layoutType?: string;
}): VisualPattern[] => {
  return visualPatterns.filter(p => {
    if (filters.industry && p.industry !== filters.industry) return false;
    if (filters.platform && p.platform !== filters.platform) return false;
    if (filters.emotion && p.emotion !== filters.emotion) return false;
    return true;
  });
};

// Get best matching template
export const getMatchingTemplate = (briefing: {
  industry: string;
  emotion: string;
  messageType: 'promo' | 'education' | 'lifestyle' | 'social-proof' | 'feature';
}): LayoutTemplate => {
  const matches = layoutTemplates.filter(t => t.bestFor.includes(briefing.industry));
  return matches[0] || layoutTemplates[0];
};
