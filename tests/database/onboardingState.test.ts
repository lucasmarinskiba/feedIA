import { describe, it, expect, afterEach } from 'vitest';
import {
  saveOnboardingState,
  loadOnboardingState,
  deleteOnboardingState,
} from '../../src/database/onboardingState.js';
import { initialOnboardingState, applyOnboardingAnswers } from '../../src/capabilities/onboarding/index.js';
import { deleteAccount } from '../../src/database/accounts.js';

describe('onboardingState persistence', () => {
  const accountId = 'test-onboarding-state';

  afterEach(() => {
    deleteAccount(accountId);
  });

  it('guarda y carga estado intermedio', () => {
    let state = initialOnboardingState(accountId);
    state = applyOnboardingAnswers(state, 'business', { name: 'Marca Persistida' });
    saveOnboardingState(state);

    const loaded = loadOnboardingState(accountId);
    expect(loaded).not.toBeNull();
    expect(loaded?.accountId).toBe(accountId);
    expect(loaded?.answers.name).toBe('Marca Persistida');
    expect(loaded?.step).toBe('audience');
  });

  it('deleteOnboardingState elimina el estado', () => {
    const state = initialOnboardingState(accountId);
    saveOnboardingState(state);
    expect(loadOnboardingState(accountId)).not.toBeNull();

    deleteOnboardingState(accountId);
    expect(loadOnboardingState(accountId)).toBeNull();
  });
});
