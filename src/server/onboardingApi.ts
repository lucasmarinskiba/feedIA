/**
 * Onboarding API — endpoints REST para el wizard de estrategia de marca.
 *
 * Rutas:
 *  POST /api/onboarding/start
 *  POST /api/onboarding/step/:step
 *  POST /api/onboarding/complete
 *  GET  /api/onboarding/:accountId/questions
 */

import { json, type RouteDefinition } from './http.js';
import {
  initialOnboardingState,
  applyOnboardingAnswers,
  completeOnboarding,
  generateOnboardingQuestions,
  type OnboardingStep,
  type OnboardingAnswers,
} from '../capabilities/onboarding/index.js';
import { saveOnboardingState, loadOnboardingState, deleteOnboardingState } from '../database/onboardingState.js';
import { log } from '../agent/logger.js';

const isString = (v: unknown): v is string => typeof v === 'string';

const validStep = (v: unknown): v is OnboardingStep =>
  v === 'business' ||
  v === 'audience' ||
  v === 'voice' ||
  v === 'goals' ||
  v === 'competitors' ||
  v === 'strategy' ||
  v === 'complete';

export const buildOnboardingRoutes = (): RouteDefinition[] => [
  {
    method: 'POST',
    pattern: '/api/onboarding/start',
    handler: async ({ res, body }): Promise<void> => {
      const name = isString((body as { name?: unknown } | null)?.name)
        ? (body as { name: string }).name
        : 'nueva-marca';
      const accountId = `acct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const state = initialOnboardingState(accountId);
      state.answers.name = name;
      saveOnboardingState(state);
      log.info(`[onboardingApi] iniciado wizard para ${accountId}`);
      json(res, 201, { ok: true, accountId, step: state.step, questions: generateOnboardingQuestions(state) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/onboarding/step/:step',
    handler: async ({ res, params, body }): Promise<void> => {
      const step = params.step;
      if (!validStep(step)) {
        json(res, 400, { error: 'Paso inválido' });
        return;
      }
      const payload = body as { accountId?: unknown; answers?: unknown } | null;
      if (!isString(payload?.accountId)) {
        json(res, 400, { error: 'accountId requerido' });
        return;
      }
      const state = loadOnboardingState(payload.accountId);
      if (!state) {
        json(res, 404, { error: 'Wizard no encontrado' });
        return;
      }
      const answers = (payload.answers ?? {}) as Partial<OnboardingAnswers>;
      const nextState = applyOnboardingAnswers(state, step, answers);
      saveOnboardingState(nextState);
      json(res, 200, {
        ok: true,
        accountId: nextState.accountId,
        step: nextState.step,
        completedSteps: nextState.completedSteps,
        questions: generateOnboardingQuestions(nextState),
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/onboarding/complete',
    handler: async ({ res, body }): Promise<void> => {
      const payload = body as { accountId?: unknown; persist?: unknown } | null;
      if (!isString(payload?.accountId)) {
        json(res, 400, { error: 'accountId requerido' });
        return;
      }
      const state = loadOnboardingState(payload.accountId);
      if (!state) {
        json(res, 404, { error: 'Wizard no encontrado' });
        return;
      }
      const persist = payload.persist === true || payload.persist === 'true';
      const result = await completeOnboarding(state, { persist });
      if (result.ok) {
        deleteOnboardingState(payload.accountId);
        json(res, 200, {
          ok: true,
          accountId: result.accountId,
          brandProfile: result.brandProfile,
          strategy: result.strategy,
          competitorBaseline: result.competitorBaseline,
        });
        return;
      }
      json(res, 422, {
        ok: false,
        accountId: result.accountId,
        missingFields: result.missingFields,
        nextQuestions: result.nextQuestions,
        error: result.error,
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/onboarding/:accountId/questions',
    handler: async ({ res, params }): Promise<void> => {
      const accountId = params.accountId ?? '';
      const state = loadOnboardingState(accountId);
      if (!state) {
        json(res, 404, { error: 'Wizard no encontrado' });
        return;
      }
      json(res, 200, {
        ok: true,
        accountId,
        step: state.step,
        completedSteps: state.completedSteps,
        questions: generateOnboardingQuestions(state),
      });
    },
  },
];
