/**
 * Audience Persona Analysis — Phase 9
 * Analiza y segmenta la audiencia en personas
 */

export interface AudiencePersona {
  id: string; // "persona-1", "persona-2"
  name: string; // "Budget-Conscious Mom"
  description: string;
  percentOfAudience: number; // 0-100
  primaryPainPoints: string[];
  contentPreferences: string[];
  engagementStyle: string; // "save", "share", "comment", "watch"
  estimatedLTV: number; // 1-10 scale
  recommendedContentFormats: string[];
  callToAction: string;
}

export interface PersonaAnalysisResult {
  personas: AudiencePersona[];
  dominantPersona: AudiencePersona;
  personaGap?: AudiencePersona; // Opportunity persona (not yet represented)
  contentAllocationByPersona: Record<string, number>; // % allocation per persona
  crossPersonaOpportunity: string; // Content that appeals to multiple personas
  recommendations: string[];
}

const generatePersonas = (): AudiencePersona[] => [
  {
    id: 'persona-1',
    name: 'Early Adopter Professional',
    description: 'Young professional interested in innovation and career growth',
    percentOfAudience: 28,
    primaryPainPoints: ['Limited time for learning', 'Career progression anxiety', 'Work-life balance struggle'],
    contentPreferences: ['Quick tips (< 5 min)', 'Case studies', 'Behind-the-scenes', 'Success stories'],
    engagementStyle: 'save',
    estimatedLTV: 8,
    recommendedContentFormats: ['Reel', 'Carousel', 'Story Series'],
    callToAction: 'Learn how to...',
  },
  {
    id: 'persona-2',
    name: 'Lifestyle Seeker',
    description: 'Values aesthetics and wellness, seeking inspiration and community',
    percentOfAudience: 35,
    primaryPainPoints: ['Lack of inspiration', 'FOMO (fear of missing out)', 'Desire for authenticity'],
    contentPreferences: ['Visually stunning posts', 'Wellness tips', 'Community stories', 'Transformation narratives'],
    engagementStyle: 'share',
    estimatedLTV: 7,
    recommendedContentFormats: ['Carousel', 'Reel', 'Static Post'],
    callToAction: 'Transform your...',
  },
  {
    id: 'persona-3',
    name: 'Skeptical Consumer',
    description: 'Values proof, social proof, and clear ROI before investing',
    percentOfAudience: 22,
    primaryPainPoints: ['Trust issues', 'Budget constraints', 'Analysis paralysis'],
    contentPreferences: ['Data-backed claims', 'Testimonials', 'Detailed comparisons', 'Money-back guarantees'],
    engagementStyle: 'comment',
    estimatedLTV: 6,
    recommendedContentFormats: ['Carousel', 'Long-form post', 'Video tutorial'],
    callToAction: 'See proof of...',
  },
  {
    id: 'persona-4',
    name: 'Entertainment First',
    description: 'Scrolls for entertainment and connection, low purchase intent',
    percentOfAudience: 15,
    primaryPainPoints: ['Boredom', 'Need for humor', 'Seeking community feel'],
    contentPreferences: ['Memes', 'Behind-the-scenes', 'Funny moments', 'Community challenges'],
    engagementStyle: 'watch',
    estimatedLTV: 3,
    recommendedContentFormats: ['Reel', 'Story', 'Video'],
    callToAction: 'Check this out...',
  },
];

export const analyzeAudiencePersonas = (engagementMetrics?: Record<string, number>): PersonaAnalysisResult => {
  const allPersonas = generatePersonas();

  // Simulate persona distribution based on metrics (or use defaults)
  let personas = [...allPersonas];
  if (engagementMetrics?.saveRate) {
    personas[0].percentOfAudience += engagementMetrics.saveRate * 5;
  }
  if (engagementMetrics?.shareRate) {
    personas[1].percentOfAudience += engagementMetrics.shareRate * 5;
  }

  // Normalize percentages
  const total = personas.reduce((sum, p) => sum + p.percentOfAudience, 0);
  personas = personas.map((p) => ({
    ...p,
    percentOfAudience: Math.round((p.percentOfAudience / total) * 100),
  }));

  const dominantPersona = personas.reduce((max, p) => (p.percentOfAudience > max.percentOfAudience ? p : max));

  // Identify gap (opportunity persona)
  const personaGap: AudiencePersona | undefined = {
    id: 'persona-gap',
    name: 'B2B Entrepreneur (Underserved)',
    description: 'B2B-focused entrepreneur seeking systemic solutions',
    percentOfAudience: 0, // Not represented yet
    primaryPainPoints: ['Scalability', 'Team management', 'Revenue stagnation'],
    contentPreferences: ['Framework', 'Playbooks', 'Mastermind content', 'Affiliate opportunities'],
    engagementStyle: 'comment',
    estimatedLTV: 9,
    recommendedContentFormats: ['Long-form', 'Webinar', 'Case study'],
    callToAction: 'Scale your business with...',
  };

  const contentAllocation: Record<string, number> = {};
  personas.forEach((p) => {
    contentAllocation[p.id] = p.percentOfAudience;
  });

  const recommendations: string[] = [
    `📍 Persona dominante: ${dominantPersona.name} (${dominantPersona.percentOfAudience}%). Enfoca 40% del contenido aquí.`,
    `💰 LTV promedio: ${Math.round(personas.reduce((sum, p) => sum + (p.estimatedLTV * p.percentOfAudience) / 100, 0))}/10. Invierte en retención.`,
  ];

  if (personaGap.percentOfAudience === 0) {
    recommendations.push(
      `🎯 Oportunidad no capturada: ${personaGap.name}. Crear 1 contenido/semana podría abrir nuevo segmento.`,
    );
  }

  // Cross-persona insight
  const crossPersonaOpportunity =
    'Contenido sobre "transformation" y "community" apela a Lifestyle Seeker + Early Adopter.';
  recommendations.push(`🔗 Multi-persona: ${crossPersonaOpportunity}`);

  return {
    personas,
    dominantPersona,
    personaGap,
    contentAllocationByPersona: contentAllocation,
    crossPersonaOpportunity,
    recommendations,
  };
};
