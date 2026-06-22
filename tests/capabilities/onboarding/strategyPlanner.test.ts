import { describe, it, expect } from 'vitest';
import { planStrategy } from '../../../src/capabilities/onboarding/index.js';
import type { BrandProfile } from '../../../src/config/types.js';

const mockBrand: BrandProfile = {
  name: 'Marca Test',
  type: 'empresa',
  niche: 'Fitness online',
  audience: {
    description: 'Personas que entrenan en casa',
    pains: ['Falta de motivación', 'No ven resultados'],
    desires: ['Rutinas efectivas', 'Cuerpo saludable'],
    locale: 'es-AR',
  },
  voice: {
    tone: ['motivador', 'práctico'],
    forbidden: ['promesas milagrosas'],
    referenceQuotes: [],
  },
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
  goals: {
    primary: 'leads',
    metricsToWatch: ['alcance', 'leads'],
  },
  competitors: [],
  hashtagPools: {},
  contentPillars: [],
  complianceRules: [],
  brandStrategy: {
    vision: '',
    mission: '',
    values: [],
    promise: 'Entrenamientos que se adaptan a tu vida',
    positioning: '',
    story: '',
    personality: ['motivador'],
    archetype: '',
    architecture: 'master-brand',
    differentiators: ['Rutinas personalizadas'],
    experiencePrinciples: [],
    targetPersonas: [],
    brandVoiceRules: [],
    visualUsageRules: [],
  },
};

describe('StrategyPlanner', () => {
  it('genera entre 4 y 6 pilares que suman ~100%', async () => {
    const plan = await planStrategy(mockBrand);
    expect(plan.pillars.length).toBeGreaterThanOrEqual(4);
    expect(plan.pillars.length).toBeLessThanOrEqual(6);
    const totalWeight = plan.pillars.reduce((sum, p) => sum + p.weight, 0);
    expect(totalWeight).toBeGreaterThanOrEqual(95);
    expect(totalWeight).toBeLessThanOrEqual(105);
  });

  it('incluye diferenciación y positioning statement', async () => {
    const plan = await planStrategy(mockBrand);
    expect(plan.differentiation.length).toBeGreaterThan(0);
    expect(plan.positioningStatement.length).toBeGreaterThan(0);
    expect(plan.toneNotes.length).toBeGreaterThan(0);
  });
});
