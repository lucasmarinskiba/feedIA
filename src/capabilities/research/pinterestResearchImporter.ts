/**
 * Pinterest Research Importer
 *
 * Manual import system: You extract from Pinterest → Paste JSON → FeedIA learns
 * Structures: Typography, colors, apps, fonts, strategies from pins
 */

import { log } from '../../agent/logger.js';

export interface PinterestPinAnalysis {
  pinUrl: string;
  title: string;
  description: string;
  analysis: {
    typography: {
      headlineFonts: string[];
      bodyFonts: string[];
      scriptFonts?: string[];
      fontSizes?: {headline: number; body: number}[];
    };
    colors: {
      palette: string[]; // hex codes
      mood: string;
      contrast: string; // 'high' | 'medium' | 'low'
    };
    layout: {
      backgroundStyle: 'image' | 'gradient' | 'solid' | 'pattern';
      textPlacement: 'overlay' | 'side' | 'bottom' | 'full';
      alignment: 'left' | 'center' | 'right';
    };
    elements: {
      hasImages: boolean;
      hasMockups: boolean;
      hasIcons: boolean;
      hasGraphics: boolean;
    };
    strategy: {
      hooks?: string[];
      copyTechniques?: string[];
      emotionalTriggers?: string[];
      ctas?: string[];
    };
    apps?: string[]; // Tools mentioned (Canva, Figma, etc)
    resources?: {
      imageSources?: string[]; // Unsplash, Pexels, etc
      fontSources?: string[]; // Google Fonts, Adobe, etc
      mockupSources?: string[];
    };
  };
  retentionScore?: number; // 0-100
  engagement: {
    visualAttention: number; // 0-100
    readability: number; // 0-100
    brandCoherence: number; // 0-100
  };
  inspirationLevel: number; // 0-100 (how useful for FeedIA)
}

export interface PinterestResearchLibrary {
  pins: PinterestPinAnalysis[];
  aggregated: {
    topFonts: {font: string; frequency: number}[];
    topColors: {color: string; frequency: number}[];
    topStrategies: {strategy: string; frequency: number}[];
    topApps: {app: string; frequency: number}[];
    averageEngagement: number;
    recommendedPalettes: string[][];
    recommendedFonts: {headline: string; body: string}[];
  };
}

// ── Import pin analysis JSON ──────────────────────────────────────────

export const importPinAnalysis = (pinJson: PinterestPinAnalysis): PinterestPinAnalysis => {
  log.info(`[Pinterest Import] Analyzing: ${pinJson.title}`);

  // Validate structure
  if (!pinJson.pinUrl || !pinJson.analysis) {
    throw new Error('Invalid pin analysis structure. Required: pinUrl, analysis.');
  }

  return pinJson;
};

export const buildResearchLibrary = (pins: PinterestPinAnalysis[]): PinterestResearchLibrary => {
  log.info(`[Pinterest Library] Building from ${pins.length} pins`);

  // Aggregate fonts
  const fontFreq = new Map<string, number>();
  pins.forEach((pin) => {
    pin.analysis.typography.headlineFonts?.forEach((f) => {
      fontFreq.set(f, (fontFreq.get(f) || 0) + 1);
    });
    pin.analysis.typography.bodyFonts?.forEach((f) => {
      fontFreq.set(f, (fontFreq.get(f) || 0) + 1);
    });
  });

  const topFonts = Array.from(fontFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([font, frequency]) => ({font, frequency}));

  // Aggregate colors
  const colorFreq = new Map<string, number>();
  pins.forEach((pin) => {
    pin.analysis.colors.palette?.forEach((c) => {
      colorFreq.set(c, (colorFreq.get(c) || 0) + 1);
    });
  });

  const topColors = Array.from(colorFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([color, frequency]) => ({color, frequency}));

  // Aggregate strategies
  const strategyFreq = new Map<string, number>();
  pins.forEach((pin) => {
    pin.analysis.strategy?.copyTechniques?.forEach((s) => {
      strategyFreq.set(s, (strategyFreq.get(s) || 0) + 1);
    });
  });

  const topStrategies = Array.from(strategyFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([strategy, frequency]) => ({strategy, frequency}));

  // Aggregate apps
  const appFreq = new Map<string, number>();
  pins.forEach((pin) => {
    pin.analysis.apps?.forEach((a) => {
      appFreq.set(a, (appFreq.get(a) || 0) + 1);
    });
  });

  const topApps = Array.from(appFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([app, frequency]) => ({app, frequency}));

  // Recommended palettes (top 3 color combos)
  const recommendedPalettes = pins
    .slice(0, 3)
    .map((p) => p.analysis.colors.palette)
    .filter((p) => p.length >= 3);

  // Recommended fonts (most common combo)
  const headlineFont = topFonts[0]?.font || 'Poppins';
  const bodyFont = topFonts[1]?.font || 'Inter';
  const recommendedFonts = [{headline: headlineFont, body: bodyFont}];

  // Average engagement
  const averageEngagement =
    pins.reduce((sum, p) => sum + (p.engagement.visualAttention + p.engagement.readability) / 2, 0) / pins.length;

  return {
    pins,
    aggregated: {
      topFonts,
      topColors,
      topStrategies,
      topApps,
      averageEngagement: Math.round(averageEngagement),
      recommendedPalettes,
      recommendedFonts,
    },
  };
};

// ── Export template for manual Pinterest research ────────────────────

export const generatePinterestResearchTemplate = (): string => {
  return `
{
  "pinUrl": "https://pin.it/XXXXX",
  "title": "Carousel Title",
  "description": "Brief description of what makes this pin effective",
  "analysis": {
    "typography": {
      "headlineFonts": ["Poppins", "Montserrat"],
      "bodyFonts": ["Inter", "Open Sans"],
      "scriptFonts": ["Pacifico"],
      "fontSizes": [
        {"headline": 36, "body": 16},
        {"headline": 40, "body": 18}
      ]
    },
    "colors": {
      "palette": ["#E91E8C", "#00D9FF", "#FFFFFF", "#1A1A1A"],
      "mood": "bold, playful, energetic",
      "contrast": "high"
    },
    "layout": {
      "backgroundStyle": "image",
      "textPlacement": "overlay",
      "alignment": "center"
    },
    "elements": {
      "hasImages": true,
      "hasMockups": false,
      "hasIcons": true,
      "hasGraphics": true
    },
    "strategy": {
      "hooks": ["Pattern interrupt", "Curiosity loop", "Social proof"],
      "copyTechniques": ["Listicle", "Before-after", "Transformation story"],
      "emotionalTriggers": ["Fear of missing out", "Hope for change", "Joy of discovery"],
      "ctas": ["Follow for more", "Link in bio", "DM for access"]
    },
    "apps": ["Canva", "Adobe Illustrator", "CapCut"],
    "resources": {
      "imageSources": ["Unsplash", "Pexels", "Adobe Stock"],
      "fontSources": ["Google Fonts", "Adobe Fonts", "Font.google.com"],
      "mockupSources": ["Figma", "Smartmockups", "Placeit"]
    }
  },
  "retentionScore": 87,
  "engagement": {
    "visualAttention": 92,
    "readability": 85,
    "brandCoherence": 78
  },
  "inspirationLevel": 90
}
`;
};

// ── Apply learnings to FeedIA brain ──────────────────────────────────

export const applyResearchToBrain = (library: PinterestResearchLibrary): {rules: string[]; recommendations: string[]} => {
  log.info(`[Brain Update] Applying Pinterest research (${library.pins.length} pins)`);

  const rules: string[] = [];
  const recommendations: string[] = [];

  // Font rules
  if (library.aggregated.topFonts.length > 0) {
    const topFont = library.aggregated.topFonts[0]!.font;
    rules.push(`Use ${topFont} for headlines (appears in ${library.aggregated.topFonts[0]!.frequency} top pins)`);
  }

  // Color rules
  if (library.aggregated.topColors.length > 0) {
    const topColor = library.aggregated.topColors[0]!.color;
    rules.push(`Primary color: ${topColor} (found in ${library.aggregated.topColors[0]!.frequency} pins)`);
  }

  // Strategy rules
  if (library.aggregated.topStrategies.length > 0) {
    recommendations.push(
      `Top strategy: ${library.aggregated.topStrategies[0]!.strategy} (${library.aggregated.topStrategies[0]!.frequency} pins)`,
    );
  }

  // App integration rules
  if (library.aggregated.topApps.length > 0) {
    recommendations.push(`Integrate tools: ${library.aggregated.topApps.map((a) => a.app).join(', ')}`);
  }

  // Average engagement
  rules.push(
    `Target engagement: ${library.aggregated.averageEngagement}+ (average from research)`,
  );

  return {rules, recommendations};
};
