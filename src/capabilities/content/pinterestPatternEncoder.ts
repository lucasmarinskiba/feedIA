/**
 * Phase 17: Pinterest Pattern Encoder
 *
 * Encodes visual + narrative patterns from Pinterest research directly into FeedIA brain.
 * Used by carousel generator to auto-select: colors, fonts, layouts, narrative structures.
 */

import { log } from '../../agent/logger.js';

export interface PinterestPattern {
  id: string;
  name: string;
  category: 'color' | 'typography' | 'layout' | 'narrative' | 'visual-element';
  frequency: number; // 0-100, higher = more validated
  applicableTo: string[]; // ['carousel', 'reel', 'story'] etc
  implementation: Record<string, any>;
  notes: string;
}

export interface PatternLibrary {
  colorPalettes: PinterestPattern[];
  typographyPairings: PinterestPattern[];
  layoutPatterns: PinterestPattern[];
  narrativeStructures: PinterestPattern[];
  visualElements: PinterestPattern[];
}

// ── Validated Pattern Library from Pinterest Research ─────────────────────

export const pinterestPatternLibrary: PatternLibrary = {
  // ── Color Palettes (from 50 pins analysis) ─────────────────────────────

  colorPalettes: [
    {
      id: 'warm-organic-orange',
      name: 'Warm Organic (Orange)',
      category: 'color',
      frequency: 87, // High frequency in viral pins
      applicableTo: ['carousel', 'reel', 'story', 'tiktok'],
      implementation: {
        primary: '#C65911', // Warm terracotta orange
        secondary: '#FF7A5C', // Lighter warm orange
        accent: '#D4AF37', // Gold
        background: '#F5EEE0', // Cream/off-white
        textOnDark: '#FFFFFF',
        textOnLight: '#1A1A1A',
        mood: 'welcoming, warm, authentic',
        psychologyDriver: 'trust + energy + approachability',
      },
      notes:
        'Top performing palette across lifestyle, education, wellness. Warm oranges trigger both urgency + comfort. Best for: tips, tutorials, transformations, community.',
    },
    {
      id: 'bold-playful-magenta',
      name: 'Bold Playful (Magenta + Cyan)',
      category: 'color',
      frequency: 72,
      applicableTo: ['carousel', 'reel', 'tiktok'],
      implementation: {
        primary: '#E91E8C', // Hot magenta
        secondary: '#00D9FF', // Electric cyan
        accent: '#FFFFFF', // White
        background: '#1A1A1A', // Dark
        textOnDark: '#FFFFFF',
        textOnLight: '#1A1A1A',
        mood: 'energetic, playful, viral',
        psychologyDriver: 'excitement + novelty + attention',
      },
      notes:
        'Highest engagement on entertainment + youth content. High saturation = high initial attention. Risk: overuse = fatigue. Best for: entertainment, comedy, trend-driven.',
    },
    {
      id: 'dark-premium-gold',
      name: 'Dark Premium (Gold on Dark)',
      category: 'color',
      frequency: 65,
      applicableTo: ['carousel', 'reel', 'story'],
      implementation: {
        primary: '#1A1A1A', // Dark gray/black
        secondary: '#E6D5B8', // Soft gold
        accent: '#FFFFFF', // White
        background: '#2D2D2D', // Charcoal
        textOnDark: '#FFFFFF',
        textOnLight: '#1A1A1A',
        mood: 'luxury, professional, trustworthy',
        psychologyDriver: 'authority + elegance + exclusivity',
      },
      notes:
        'Premium education, luxury, professional services. Gold on dark = scarcity perception. Best for: premium courses, luxury products, authority positioning.',
    },
    {
      id: 'clean-editorial-navy',
      name: 'Clean Editorial (Navy + White)',
      category: 'color',
      frequency: 58,
      applicableTo: ['carousel', 'story'],
      implementation: {
        primary: '#001F3F', // Navy
        secondary: '#FFFFFF', // White
        accent: '#FF6B6B', // Single accent color
        background: '#FFFFFF',
        textOnDark: '#FFFFFF',
        textOnLight: '#001F3F',
        mood: 'professional, clear, trustworthy',
        psychologyDriver: 'clarity + stability + competence',
      },
      notes:
        'News, how-to, education. Minimal palette = focus on content. Best for: tutorials, news, B2B, thought leadership.',
    },
  ],

  // ── Typography Pairings ────────────────────────────────────────────────

  typographyPairings: [
    {
      id: 'poppins-inter-modern',
      name: 'Poppins + Inter (Modern Pair)',
      category: 'typography',
      frequency: 91,
      applicableTo: ['carousel', 'reel', 'story', 'tiktok'],
      implementation: {
        headlineFont: 'Poppins',
        headlineWeight: 700,
        headlineSize: '36-48px',
        bodyFont: 'Inter',
        bodyWeight: 400,
        bodySize: '14-18px',
        accentFont: null,
        lineHeight: 1.5,
        feeling: 'modern, professional, approachable',
        googleFonts: true,
        freeLicenseAvailable: true,
      },
      notes:
        'Most used pairing across all successful pins. Poppins = bold, geometric, friendly. Inter = highly legible. Best all-purpose combo.',
    },
    {
      id: 'montserrat-lora-elegant',
      name: 'Montserrat + Lora (Elegant Pair)',
      category: 'typography',
      frequency: 64,
      applicableTo: ['carousel', 'story'],
      implementation: {
        headlineFont: 'Montserrat',
        headlineWeight: 700,
        headlineSize: '32-44px',
        bodyFont: 'Lora',
        bodyWeight: 400,
        bodySize: '16-18px',
        accentFont: 'Playfair Display',
        lineHeight: 1.6,
        feeling: 'elegant, sophisticated, premium',
        googleFonts: true,
        freeLicenseAvailable: true,
      },
      notes:
        'For luxury, education, thought leadership. Lora = serifs for readability + elegance. Playfair for hero headlines.',
    },
    {
      id: 'playfair-opensans-luxury',
      name: 'Playfair Display + Open Sans (Luxury Pair)',
      category: 'typography',
      frequency: 48,
      applicableTo: ['carousel', 'story'],
      implementation: {
        headlineFont: 'Playfair Display',
        headlineWeight: 700,
        headlineSize: '40-56px',
        bodyFont: 'Open Sans',
        bodyWeight: 400,
        bodySize: '14-16px',
        accentFont: null,
        lineHeight: 1.4,
        feeling: 'luxurious, editorial, premium',
        googleFonts: true,
        freeLicenseAvailable: true,
      },
      notes:
        'Fashion, luxury brands, premium content. Playfair = high-contrast serif = elegance. Open Sans = clean contrast.',
    },
  ],

  // ── Layout Patterns ────────────────────────────────────────────────────

  layoutPatterns: [
    {
      id: 'text-left-visual-right-40-60',
      name: 'Text Left + Visual Right (40/60)',
      category: 'layout',
      frequency: 78,
      applicableTo: ['carousel', 'story'],
      implementation: {
        textPlacement: 'left',
        textWidth: '40%',
        visualPlacement: 'right',
        visualWidth: '60%',
        textAlignment: 'left',
        textVerticalAlign: 'center',
        safeZone: '20px margins',
        background: 'solid or subtle gradient',
        visualType: 'hero image, mockup, illustration',
        breakpoint: 'mobile: stack vertically',
      },
      notes:
        'Proven layout for features, tips, product comparisons. Text easy to read, visual provides context. Safe default.',
    },
    {
      id: 'full-bleed-image-text-overlay-centered',
      name: 'Full-Bleed Image + Centered Text',
      category: 'layout',
      frequency: 71,
      applicableTo: ['carousel', 'reel'],
      implementation: {
        background: 'full-width high-res image',
        textPlacement: 'center overlay',
        textOverlay: 'rgba(0, 0, 0, 0.5) dark background',
        textColor: '#FFFFFF',
        textMaxWidth: '70% of slide width',
        textAlignment: 'center',
        fontSize: '36-48px headline, 16-20px body',
        safeZone: '15% margins',
        visualType: 'lifestyle photo, landscape, gradient',
      },
      notes:
        'High impact for hooks and CTAs. Image provides emotion, text provides message. Good for quotes, urgency, inspirational.',
    },
    {
      id: 'grid-layout-3x3',
      name: 'Grid Layout (3x3 or 2x2)',
      category: 'layout',
      frequency: 63,
      applicableTo: ['carousel', 'story'],
      implementation: {
        gridType: '3x3 or 2x2',
        itemWidth: '100-150px (3x3) or 200-250px (2x2)',
        spacing: '16-20px between items',
        background: 'solid or light gradient',
        itemBackgroundRadius: '12px border-radius',
        itemShadow: '0 2px 8px rgba(0,0,0,0.15)',
        textPerItem: 'short label or number',
        headerAbove: 'optional category header',
      },
      notes:
        'Perfect for listicles, comparisons, benefits, checklist. Scannable, organized. Great retention on value slides.',
    },
    {
      id: 'asymmetrical-with-whitespace',
      name: 'Asymmetrical + Whitespace',
      category: 'layout',
      frequency: 52,
      applicableTo: ['carousel', 'reel'],
      implementation: {
        mainElement: 'hero image or icon on one side (top-left, bottom-right, etc)',
        textPosition: 'opposite corner',
        whitespace: 'min 20% of slide',
        background: 'solid or subtle gradient',
        breathing: 'creates premium, sophisticated feel',
        alignment: 'avoid center symmetry',
      },
      notes:
        'Modern, high-design approach. Whitespace = premium perception. Best for luxury, design-forward brands.',
    },
  ],

  // ── Narrative Structures ───────────────────────────────────────────────

  narrativeStructures: [
    {
      id: 'hook-value-proof-cta-5',
      name: 'Hook → Value → Proof → CTA (5 slides)',
      category: 'narrative',
      frequency: 76,
      applicableTo: ['carousel'],
      implementation: {
        slides: [
          {
            number: 1,
            role: 'hook',
            purpose: 'stop scroll',
            copyPattern:
              'Question OR Benefit statement OR Social proof ("1.4M people...") OR Curiosity teaser',
            retentionTrigger: 'Pattern interrupt, emotional hook, "Wait..."',
          },
          {
            number: 2,
            role: 'curiosity-build',
            purpose: 'create tension',
            copyPattern: 'Myth vs Reality OR "But here\'s the twist..." OR Revelation',
            retentionTrigger: 'Mystery, revelation, "Here\'s why..."',
          },
          {
            number: 3,
            role: 'value',
            purpose: 'deliver first insight',
            copyPattern: 'First tip/lesson with quick example',
            retentionTrigger: 'Actionable, "Today you can..."',
          },
          {
            number: 4,
            role: 'proof',
            purpose: 'social proof',
            copyPattern: 'Stat, testimonial, case study, or "X thousand people..."',
            retentionTrigger: 'Credibility, FOMO, "Others got..."',
          },
          {
            number: 5,
            role: 'cta',
            purpose: 'action',
            copyPattern: 'Direct ask (Follow/Link/DM/Save) + benefit',
            retentionTrigger: 'Clear next step, low friction',
          },
        ],
        optimalFor: 'product features, transformations, simple workflows',
        retentionEstimate: '80-85%',
      },
      notes:
        'Sweet spot. Fast, complete arc. Works for most topics. Holds attention without fatigue.',
    },
    {
      id: 'listicle-structure-7',
      name: 'Listicle (7 slides: Hook + 5 items + CTA)',
      category: 'narrative',
      frequency: 89,
      applicableTo: ['carousel'],
      implementation: {
        slides: [
          {number: 1, role: 'hook', copyPattern: '"5 Mistakes You\'re Making" or "Here\'s what nobody tells you"'},
          {number: 2, role: 'item', label: 'Mistake/Tip #1 (basic/obvious)', retention: 'Quick win'},
          {number: 3, role: 'item', label: 'Mistake/Tip #2 (intermediate)', retention: 'Deep dive'},
          {number: 4, role: 'item', label: 'Mistake/Tip #3 (subtle)', retention: 'Aha moment'},
          {number: 5, role: 'item', label: 'Mistake/Tip #4 (advanced)', retention: '"I didn\'t know this"'},
          {number: 6, role: 'item', label: 'Mistake/Tip #5 (meta/unexpected)', retention: 'Plot twist'},
          {number: 7, role: 'cta', copyPattern: 'Follow for more', retention: 'Clear ask'},
        ],
        optimalFor: 'tips, mistakes, lessons, advice',
        retentionEstimate: '75-80%',
        escalationPattern: 'Obvious → Subtle → Advanced → Unexpected',
      },
      notes:
        'Highest engagement format. Numbered = FOMO. Each item = reason to swipe. Avoid filler items.',
    },
    {
      id: 'before-after-transformation-5',
      name: 'Before-After (5 slides: Hook + Before + Transformation + After + CTA)',
      category: 'narrative',
      frequency: 68,
      applicableTo: ['carousel', 'reel'],
      implementation: {
        slides: [
          {number: 1, role: 'hook', copyPattern: '"See this transformation" or "What changed?"'},
          {number: 2, role: 'before', visual: 'problem state', copyPattern: 'Problem description'},
          {number: 3, role: 'transformation', copyPattern: 'Method/steps/how-to', visual: 'process illustration'},
          {number: 4, role: 'after', visual: 'solution state', copyPattern: 'Result description, benefits'},
          {number: 5, role: 'cta', copyPattern: 'DM for guide / Follow for more'},
        ],
        optimalFor: 'transformations, makeovers, problem-solving, improvements',
        retentionEstimate: '85-90%',
        emotionalArc: 'Problem (empathy) → Solution (hope) → Result (joy/FOMO)',
      },
      notes: 'Visual + emotional. Easy to remember. Strong retention curve.',
    },
    {
      id: 'hook-lesson-example-actions-cta-5',
      name: 'Hook → Lesson → Example → Actions → CTA (Newsletter Structure)',
      category: 'narrative',
      frequency: 74,
      applicableTo: ['carousel'],
      implementation: {
        slides: [
          {number: 1, role: 'hook', copyPattern: 'Question or benefit', visual: 'attention-grabbing'},
          {
            number: 2,
            role: 'lesson',
            copyPattern: 'Core principle or insight',
            visual: 'explanation diagram or illustration',
          },
          {
            number: 3,
            role: 'example',
            copyPattern: 'Real-world example or case',
            visual: 'context image or story',
          },
          {
            number: 4,
            role: 'actions',
            copyPattern: '3 action steps (numbered, scannable)',
            visual: 'simple numbered list or icons',
          },
          {number: 5, role: 'cta', copyPattern: 'Follow / Link in bio', visual: 'clear button'},
        ],
        optimalFor: 'educational content, how-to, thought leadership',
        retentionEstimate: '80-85%',
        structure: 'Principle → Evidence → Application → Action',
      },
      notes:
        'Educational + actionable. Great for tutorials, business tips, advice. Structured = high retention.',
    },
  ],

  // ── Visual Elements ────────────────────────────────────────────────────

  visualElements: [
    {
      id: 'icon-style-outline',
      name: 'Icons (Outline Style)',
      category: 'visual-element',
      frequency: 82,
      applicableTo: ['carousel', 'reel', 'story'],
      implementation: {
        stroke: '2-3px',
        size: '24-32px standard, 40-48px for hero',
        color: 'match primary or secondary palette',
        background: 'optional rounded square 8-12px radius',
        style: 'minimal, geometric, not filled',
        sources: ['Google Material Icons', 'Feather Icons', 'Figma plugins'],
      },
      notes: 'Outline icons = modern + clean + readable. Filled icons = dated. Consistency across carousel.',
    },
    {
      id: 'illustration-silueta',
      name: 'Illustrations + Siluetas',
      category: 'visual-element',
      frequency: 76,
      applicableTo: ['carousel', 'reel'],
      implementation: {
        type: 'custom silueta of people, hands, objects',
        style: 'consistent across carousel (same artist/style)',
        colorStrategy: 'match palette, or single accent color',
        usage: 'first 3 slides (hook phase), less in proof phase',
        benefit: 'universal, culturally neutral, brand-building',
      },
      notes:
        'Better than stock photos. Creates cohesive visual brand. Siluetas > photos for abstract concepts.',
    },
    {
      id: 'mockup-device-display',
      name: 'Mockups (Device/Screen Displays)',
      category: 'visual-element',
      frequency: 71,
      applicableTo: ['carousel'],
      implementation: {
        types: ['phone mockup', 'laptop screen', 'tablet display', 'product mockup'],
        style: 'clean, minimal frame',
        tools: ['Figma', 'Smartmockups', 'Placeit'],
        usage: 'show product, interface, or design example',
        background: 'subtle shadow or gradient behind',
      },
      notes: 'Mockups = show without saying. Great for SaaS, apps, design services.',
    },
    {
      id: 'rounded-corners-elements',
      name: 'Rounded Corners (Design Pattern)',
      category: 'visual-element',
      frequency: 88,
      applicableTo: ['carousel', 'reel', 'story'],
      implementation: {
        containerRadius: '12px (icon containers, image corners)',
        cardRadius: '12-16px (larger content cards)',
        neverUseSquareCorners: true,
        shadow: 'subtle 0 2px 8px rgba(0,0,0,0.15)',
        effect: 'softens design, feels modern',
      },
      notes:
        'Square corners = dated. Always round. Adds perceived professionalism + modernity.',
    },
  ],
};

// ── Helper: Select Pattern Based on Context ────────────────────────────

export const selectColorPalette = (
  topic: string,
  emotion: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity',
  audience?: string,
): PinterestPattern => {
  const emotionToPalette: Record<string, string[]> = {
    fear: ['dark-premium-gold', 'bold-playful-magenta'],
    hope: ['warm-organic-orange', 'clean-editorial-navy'],
    joy: ['bold-playful-magenta', 'warm-organic-orange'],
    anger: ['dark-premium-gold', 'bold-playful-magenta'],
    curiosity: ['bold-playful-magenta', 'warm-organic-orange'],
  };

  const candidates = emotionToPalette[emotion] || ['warm-organic-orange'];
  const palette = pinterestPatternLibrary.colorPalettes.find((p) => p.id === candidates[0]);

  return palette || pinterestPatternLibrary.colorPalettes[0];
};

export const selectTypographyPairing = (contentType: string): PinterestPattern => {
  if (contentType === 'luxury' || contentType === 'premium') {
    return pinterestPatternLibrary.typographyPairings[1]; // Montserrat + Lora
  }
  if (contentType === 'playful' || contentType === 'entertainment') {
    return pinterestPatternLibrary.typographyPairings[0]; // Poppins + Inter (modern default)
  }
  return pinterestPatternLibrary.typographyPairings[0]; // Default to modern pair
};

export const selectLayoutPattern = (contentPhase: 'hook' | 'value' | 'proof' | 'cta'): PinterestPattern => {
  if (contentPhase === 'hook') {
    return pinterestPatternLibrary.layoutPatterns[1]; // Full-bleed for impact
  }
  if (contentPhase === 'value') {
    return pinterestPatternLibrary.layoutPatterns[0]; // Text left + visual right for clarity
  }
  if (contentPhase === 'proof') {
    return pinterestPatternLibrary.layoutPatterns[2]; // Grid for organizing proof
  }
  return pinterestPatternLibrary.layoutPatterns[0]; // Default
};

export const selectNarrativeStructure = (
  slideCount?: number,
  contentType?: string,
): PinterestPattern => {
  if (slideCount === 5) {
    return pinterestPatternLibrary.narrativeStructures[0]; // Hook-Value-Proof-CTA-5
  }
  if (slideCount === 7) {
    return pinterestPatternLibrary.narrativeStructures[1]; // Listicle-7
  }
  if (contentType === 'transformation' || contentType === 'before-after') {
    return pinterestPatternLibrary.narrativeStructures[2]; // Before-After-5
  }
  if (contentType === 'educational' || contentType === 'newsletter') {
    return pinterestPatternLibrary.narrativeStructures[3]; // Hook-Lesson-Example-Actions-CTA
  }

  // Default: listicle (highest engagement)
  return pinterestPatternLibrary.narrativeStructures[1];
};

// ── Log Initialization ────────────────────────────────────────────────

log.info(
  `[Phase 17] Pinterest Pattern Encoder initialized: ${pinterestPatternLibrary.colorPalettes.length} color palettes, ${pinterestPatternLibrary.typographyPairings.length} font pairings, ${pinterestPatternLibrary.layoutPatterns.length} layouts, ${pinterestPatternLibrary.narrativeStructures.length} narrative structures`,
);
