import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initialOnboardingState,
  applyOnboardingAnswers,
  buildBrandProfileFromState,
  generateOnboardingQuestions,
  completeOnboarding,
  quickOnboarding,
  getMissingFields,
} from '../../../src/capabilities/onboarding/index.js';
import { loadBrandProfileById, saveBrandProfile } from '../../../src/config/accounts.js';

const baseAnswers = {
  name: 'Paithon Labs',
  type: 'empresa' as const,
  niche: 'Inteligencia artificial para Instagram',
  description: 'Agencia de IA que crea y publica contenido en Instagram.',
  audienceDescription: 'Empresas y creadores que quieren escalar su presencia en Instagram.',
  pains: ['Falta de tiempo', 'No saben qué publicar', 'Bajo engagement'],
  desires: ['Más clientes', 'Marca reconocida', 'Contenido constante'],
  tone: ['profesional', 'amigable', 'directo'],
  primaryGoal: 'leads' as const,
  metricsToWatch: ['alcance', 'interacciones', 'leads'],
  competitors: ['@competidor1', '@competidor2'],
};

describe('OnboardingEngine', () => {
  it('inicia en el paso business', () => {
    const state = initialOnboardingState('test-account');
    expect(state.step).toBe('business');
    expect(state.completedSteps).toEqual([]);
  });

  it('aplica respuestas y avanza al siguiente paso', () => {
    let state = initialOnboardingState('test-account');
    state = applyOnboardingAnswers(state, 'business', { name: 'Marca X' });
    expect(state.step).toBe('audience');
    expect(state.completedSteps).toContain('business');
  });

  it('detecta campos faltantes', () => {
    const state = initialOnboardingState('test-account');
    expect(getMissingFields(state.answers)).toContain('name');
    expect(getMissingFields(state.answers)).toContain('niche');
  });

  it('genera preguntas para campos faltantes', () => {
    const state = initialOnboardingState('test-account');
    const questions = generateOnboardingQuestions(state);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some((q) => q.includes('marca o negocio'))).toBe(true);
  });

  it('construye BrandProfile cuando están todos los campos', () => {
    const state = applyOnboardingAnswers(initialOnboardingState('test-account'), 'competitors', baseAnswers);
    const { profile, missing } = buildBrandProfileFromState(state);
    expect(profile).toBeDefined();
    expect(missing).toHaveLength(0);
    expect(profile?.name).toBe('Paithon Labs');
    expect(profile?.goals.primary).toBe('leads');
  });

  it('completa onboarding y genera estrategia + competidores', async () => {
    const result = await quickOnboarding('test-onboarding-brand', baseAnswers);
    expect(result.ok).toBe(true);
    expect(result.brandProfile).toBeDefined();
    expect(result.strategy?.pillars.length).toBeGreaterThan(0);
    expect(result.competitorBaseline?.competitors.length).toBe(2);
  });

  it('persiste el BrandProfile cuando se pide', async () => {
    const accountId = 'test-onboarding-persist';
    const result = await quickOnboarding(accountId, baseAnswers, { persist: true });
    expect(result.ok).toBe(true);
    const saved = loadBrandProfileById(accountId);
    expect(saved.name).toBe(baseAnswers.name);
    expect(saved.contentPillars.length).toBeGreaterThan(0);
  });
});
