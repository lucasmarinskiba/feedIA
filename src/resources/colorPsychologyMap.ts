/**
 * Phase 35: Color Psychology Mapping
 *
 * Maps colors → emotions, industries, accessibility
 */

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  emotion: string[];
  industries: string[];
  psychology: string;
  accessibilityRatio: number; // contrast ratio
  examples: string[]; // brands/campaigns using this
}

export const colorPalettes: ColorPalette[] = [
  {
    id: 'lime-green',
    name: 'Lime Green (Energetic Eco)',
    primary: '#00FF00',
    secondary: '#FFFFFF',
    accent: '#000000',
    emotion: ['energetic', 'eco-friendly', 'sporty', 'youthful'],
    industries: ['bikes', 'fitness', 'sports', 'outdoor', 'tech'],
    psychology: 'High visibility, nature connection, activity activation',
    accessibilityRatio: 19.56,
    examples: ['ATASport', 'eco-brands', 'adventure-companies']
  },
  {
    id: 'neon-yellow',
    name: 'Neon Yellow (Bold Visibility)',
    primary: '#FFFF00',
    secondary: '#000000',
    accent: '#FFFFFF',
    emotion: ['bold', 'visible', 'energetic', 'youthful', 'playful'],
    industries: ['bikes', 'adventure', 'sports', 'youth-market'],
    psychology: 'Maximum contrast, attention-grabbing, energy',
    accessibilityRatio: 19.56,
    examples: ['MBikes', 'safety-brands', 'urban-sports']
  },
  {
    id: 'red-orange',
    name: 'Red/Orange (Passion & Action)',
    primary: '#FF4500',
    secondary: '#FFFFFF',
    accent: '#000000',
    emotion: ['passionate', 'urgent', 'action-oriented', 'energetic'],
    industries: ['bikes', 'sports', 'campaigns', 'awareness', 'special-events'],
    psychology: 'Urgency, passion, motivation',
    accessibilityRatio: 9.04,
    examples: ['Cyclist-awareness-campaigns', 'action-brands']
  },
  {
    id: 'blue-trust',
    name: 'Blue (Trust & Adventure)',
    primary: '#0066FF',
    secondary: '#FFFFFF',
    accent: '#000000',
    emotion: ['trust', 'adventure', 'premium', 'technical', 'calm'],
    industries: ['bikes', 'tech', 'financial', 'premium', 'outdoor'],
    psychology: 'Trust, stability, sky/water connection (adventure)',
    accessibilityRatio: 8.58,
    examples: ['TrikatPro', 'tech-brands', 'premium-bikes']
  }
];

export interface ColorRecommendation {
  industry: string;
  emotion: string;
  situation: string; // 'promo', 'education', 'lifestyle', 'trust'
  suggestedPalette: string; // palette ID
  reasoning: string;
}

export const colorRecommendations: ColorRecommendation[] = [
  {
    industry: 'bikes',
    emotion: 'energetic',
    situation: 'promo',
    suggestedPalette: 'lime-green',
    reasoning: 'High visibility for sport/action, eco-friendly connection'
  },
  {
    industry: 'bikes',
    emotion: 'urgent',
    situation: 'promo',
    suggestedPalette: 'red-orange',
    reasoning: 'Action trigger, urgency signal for limited-time offers'
  },
  {
    industry: 'bikes',
    emotion: 'premium',
    situation: 'education',
    suggestedPalette: 'blue-trust',
    reasoning: 'Trust + technical positioning for high-end products'
  }
];

export const getPaletteByIndustryEmotion = (industry: string, emotion: string): ColorPalette | null => {
  const recommendation = colorRecommendations.find(
    r => r.industry === industry && r.emotion === emotion
  );
  if (!recommendation) return null;

  return colorPalettes.find(p => p.id === recommendation.suggestedPalette) || null;
};

export const ingestColorPalette = (colors: {
  primary: string;
  secondary: string;
  accent: string;
}, metadata: any): ColorPalette => {
  return {
    id: `palette-${Date.now()}`,
    name: metadata.name || 'Custom Palette',
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    emotion: metadata.emotion || [],
    industries: metadata.industries || [],
    psychology: metadata.psychology || '',
    accessibilityRatio: metadata.accessibilityRatio || 4.5,
    examples: metadata.examples || []
  };
};
