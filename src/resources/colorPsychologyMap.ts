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
  },
  {
    id: 'orange-black-modern',
    name: 'Orange/Black (Modern Fitness)',
    primary: '#FF6600',
    secondary: '#000000',
    accent: '#FFFFFF',
    emotion: ['energetic', 'modern', 'premium', 'powerful', 'action'],
    industries: ['fitness', 'gym', 'equipment', 'coaching', 'tech'],
    psychology: 'Energy + sophistication, modern innovation, power',
    accessibilityRatio: 11.3,
    examples: ['OM GYM', 'modern-equipment-brands', 'fitness-studios']
  },
  {
    id: 'yellow-black-motivation',
    name: 'Yellow/Black (Bold Motivation)',
    primary: '#FFFF00',
    secondary: '#000000',
    accent: '#FFFFFF',
    emotion: ['energetic', 'urgent', 'bold', 'motivational', 'confident'],
    industries: ['fitness', 'personal-training', 'motivation', 'coaching', 'sports'],
    psychology: 'Maximum contrast, attention, energy, confidence',
    accessibilityRatio: 19.56,
    examples: ['Fitness coaches', 'motivation-brands', 'action-gyms']
  },
  {
    id: 'lime-modern-eco',
    name: 'Lime Green/Black (Eco-Modern)',
    primary: '#00FF00',
    secondary: '#000000',
    accent: '#FFFFFF',
    emotion: ['modern', 'eco', 'energetic', 'tech-forward', 'innovative'],
    industries: ['equipment', 'tech-fitness', 'modern-gym', 'sustainability', 'innovation'],
    psychology: 'Technology + nature, modernity, efficiency',
    accessibilityRatio: 19.56,
    examples: ['Adjustable dumbbells', 'modern-equipment', 'smart-fitness']
  },
  {
    id: 'yellow-purple-energetic',
    name: 'Yellow/Purple (Energetic & Bold)',
    primary: '#FFFF00',
    secondary: '#8B00FF',
    accent: '#FFFFFF',
    emotion: ['energetic', 'playful', 'youthful', 'bold', 'engaging'],
    industries: ['fitness', 'young-audience', 'motivation', 'lifestyle', 'sports'],
    psychology: 'High contrast, youth energy, playful but serious',
    accessibilityRatio: 15.2,
    examples: ['Fitness motivation carousel', 'youth-gyms', 'workout-influencers']
  },
  {
    id: 'professional-blue',
    name: 'Professional Blue (Trust & Finance)',
    primary: '#0066CC',
    secondary: '#FFFFFF',
    accent: '#003366',
    emotion: ['trust', 'professional', 'secure', 'corporate', 'credible'],
    industries: ['finance', 'accounting', 'banking', 'corporate', 'legal'],
    psychology: 'Trust, stability, professionalism, authority',
    accessibilityRatio: 10.5,
    examples: ['Razzão Contabilidad', 'Guia-se Digital', 'Finance services']
  },
  {
    id: 'dark-blue-white',
    name: 'Dark Blue/White (Technical Clarity)',
    primary: '#003366',
    secondary: '#FFFFFF',
    accent: '#0066CC',
    emotion: ['technical', 'clear', 'serious', 'precise', 'trustworthy'],
    industries: ['accounting', 'finance', 'tax', 'corporate', 'numbers'],
    psychology: 'Precision, clarity, technical competence, minimalism',
    accessibilityRatio: 12.6,
    examples: ['Tax/accounting services', 'Technical finance']
  },
  {
    id: 'purple-modern-finance',
    name: 'Purple Modern (Contemporary Finance)',
    primary: '#8B00FF',
    secondary: '#FFFFFF',
    accent: '#000000',
    emotion: ['modern', 'innovative', 'attention-seeking', 'confident', 'forward-thinking'],
    industries: ['finance', 'fintech', 'digital-finance', 'startups', 'modern-services'],
    psychology: 'Modern, innovative, breaks from traditional finance aesthetic, attention',
    accessibilityRatio: 14.3,
    examples: ['Modern accounting services', 'Fintech', 'Digital tax services']
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
  },
  {
    industry: 'fitness',
    emotion: 'energetic',
    situation: 'motivation',
    suggestedPalette: 'yellow-black-motivation',
    reasoning: 'Maximum contrast grabs attention, bold energizes viewers'
  },
  {
    industry: 'fitness',
    emotion: 'powerful',
    situation: 'promo',
    suggestedPalette: 'orange-black-modern',
    reasoning: 'Modern premium feel, sophisticated energy, strong presence'
  },
  {
    industry: 'gym',
    emotion: 'bold',
    situation: 'coaching',
    suggestedPalette: 'yellow-black-motivation',
    reasoning: 'Confidence-building, motivational energy, attention-grabbing'
  },
  {
    industry: 'equipment',
    emotion: 'modern',
    situation: 'product',
    suggestedPalette: 'lime-modern-eco',
    reasoning: 'Tech-forward feeling, modern/innovative positioning'
  },
  {
    industry: 'personal-training',
    emotion: 'energetic',
    situation: 'motivation',
    suggestedPalette: 'yellow-purple-energetic',
    reasoning: 'Youth + energy, playful yet powerful, engaging community'
  },
  {
    industry: 'finance',
    emotion: 'trust',
    situation: 'education',
    suggestedPalette: 'professional-blue',
    reasoning: 'Trust + professionalism, authority positioning'
  },
  {
    industry: 'accounting',
    emotion: 'technical',
    situation: 'service',
    suggestedPalette: 'dark-blue-white',
    reasoning: 'Precision + clarity, minimalist technical feel'
  },
  {
    industry: 'fintech',
    emotion: 'modern',
    situation: 'promotion',
    suggestedPalette: 'purple-modern-finance',
    reasoning: 'Modern + innovative, breaks traditional finance aesthetic'
  },
  {
    industry: 'finance',
    emotion: 'urgent',
    situation: 'warning',
    suggestedPalette: 'professional-blue',
    reasoning: 'Trust-building while communicating urgency/caution'
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
