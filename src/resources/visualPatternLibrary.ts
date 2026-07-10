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
    id: 'numbered-benefits',
    type: 'Numbered Benefits (1,2,3,4,5)',
    description: 'Big bold numbers + benefit callout per slide',
    visualGuide: 'Number 60% bg, photo 70%, benefit text bold',
    bestFor: ['fitness', 'gym', 'training', 'education', 'motivation'],
    colorPalettes: ['neon-yellow', 'lime-green', 'orange-black']
  },
  {
    id: 'product-checklist-grid',
    type: 'Product + Checklist Grid',
    description: 'Product hero + feature checkboxes + benefit proof',
    visualGuide: '3-slide: product hero | feature checklist | lifestyle use',
    bestFor: ['equipment', 'tech', 'fitness-products', 'e-commerce'],
    colorPalettes: ['orange-black', 'lime-green']
  },
  {
    id: 'hand-holding-money',
    type: 'Hand Holding Money/Asset',
    description: 'Close-up: hand + cash/coins/document, professional lighting',
    visualGuide: 'Hand centered, object in focus (60%), soft background, top-down perspective',
    bestFor: ['finance', 'accounting', 'banking', 'investment', 'savings'],
    colorPalettes: ['professional-blue', 'dark-blue-white']
  },
  {
    id: 'money-tree-growth',
    type: 'Growing Money Tree (Growth Metaphor)',
    description: 'Tree/plant with coins growing, hand holding base',
    visualGuide: 'Plant 70%, hand holding base 30%, organic composition',
    bestFor: ['finance', 'investment', 'growth', 'wealth', 'savings'],
    colorPalettes: ['professional-blue', 'green-accents']
  },
  {
    id: 'money-stack-shock',
    type: 'Money Stack (Cost Visual Shock)',
    description: 'Stack of bills/currency, close-up, emphasizing quantity',
    visualGuide: 'Stack 70% of frame, clean background 30%, top-down angle',
    bestFor: ['finance', 'cost-education', 'hiring', 'budget', 'price-revelation'],
    colorPalettes: ['yellow-gold', 'professional-blue']
  },
  {
    id: 'calculator-professional',
    type: 'Calculator/Numbers (Technical Credibility)',
    description: 'Large calculator or numbers, person interacting',
    visualGuide: 'Calculator/numbers 60%, person 40%, white/minimal background',
    bestFor: ['accounting', 'finance', 'tax', 'numbers', 'precision'],
    colorPalettes: ['dark-blue-white', 'professional-blue']
  },
  {
    id: 'gradient-dark-gold',
    type: 'Gradient Dark/Gold (Premium Finance)',
    description: 'Dark to gold gradient background, elegant typography hierarchy',
    visualGuide: 'Gradient 100%, vertical line divider, text centered',
    bestFor: ['finance', 'premium-services', 'consulting', 'cost-education'],
    colorPalettes: ['dark-blue-gold', 'black-gold']
  },
  {
    id: 'card-myth-series',
    type: 'Card Layout with Rounded Corners (Myth Series)',
    description: 'Rounded rectangle card, organized typography, line dividers between sections',
    visualGuide: 'Card 80% of frame, padding 20px, rounded corners 16px, line dividers 2px',
    bestFor: ['myth-busting', 'education', 'professional-services', 'q&a-format'],
    colorPalettes: ['dark-blue-white', 'professional-blue', 'dark-blue-gold']
  },
  {
    id: 'yellow-truth-breakthrough',
    type: 'Yellow Background (Truth/Breakthrough)',
    description: 'Solid yellow background, bold dark text, celebratory feeling',
    visualGuide: 'Full yellow background (100%), text dark navy, high contrast, bold typography',
    bestFor: ['truth-reveals', 'breakthrough-moments', 'affirmations', 'benefits-summary'],
    colorPalettes: ['yellow-gold-elegant', 'yellow-dark-blue']
  },
  {
    id: 'motivational-split',
    type: 'Motivational Split (Headline + Action)',
    description: 'Bold headline 50% + person 50%, strong copy',
    visualGuide: 'Text left (bold uppercase), person right (confident pose)',
    bestFor: ['fitness', 'motivation', 'coaching', 'personal-training'],
    colorPalettes: ['neon-yellow', 'orange-black']
  },
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
  return (matches[0] || layoutTemplates[0]) as LayoutTemplate;
};
