import { describe, it, expect } from 'vitest';
import { analyzeCompetitors } from '../../../src/capabilities/onboarding/index.js';
import type { BrandProfile } from '../../../src/config/types.js';

const mockBrand: BrandProfile = {
  name: 'Marca Test',
  type: 'empresa',
  niche: 'Fitness online',
  audience: {
    description: 'Personas que entrenan en casa',
    pains: ['Falta de motivación'],
    desires: ['Rutinas efectivas'],
    locale: 'es-AR',
  },
  voice: { tone: ['motivador'], forbidden: [], referenceQuotes: [] },
  visual: {
    palette: [],
    typography: [],
    style: 'minimalista',
    mood: 'energético',
    photographyStyle: 'natural',
    compositionRules: [],
    allowedIconography: [],
    forbiddenIconography: [],
    moodboardUrls: [],
    density: 'medium',
    imageTextRatio: 'balanced',
  },
  goals: { primary: 'awareness', metricsToWatch: ['alcance'] },
  competitors: [],
  hashtagPools: {},
  contentPillars: [],
  complianceRules: [],
  brandStrategy: {
    vision: '',
    mission: '',
    values: [],
    promise: '',
    positioning: '',
    story: '',
    personality: [],
    archetype: '',
    architecture: 'master-brand',
    differentiators: [],
    experiencePrinciples: [],
    targetPersonas: [],
    brandVoiceRules: [],
    visualUsageRules: [],
  },
};

describe('CompetitorBaseline', () => {
  it('genera un baseline para 3 competidores', async () => {
    const baseline = await analyzeCompetitors(mockBrand, ['@fitpro', '@gymonline', '@entrenamientocasa']);
    expect(baseline.competitors).toHaveLength(3);
    expect(baseline.commonPatterns.length).toBeGreaterThan(0);
    expect(baseline.gaps.length).toBeGreaterThan(0);
    expect(baseline.recommendations.length).toBeGreaterThan(0);
  });

  it('limpia el @ de los handles', async () => {
    const baseline = await analyzeCompetitors(mockBrand, ['@competidor']);
    expect(baseline.competitors[0]?.handle).toBe('competidor');
  });
});
