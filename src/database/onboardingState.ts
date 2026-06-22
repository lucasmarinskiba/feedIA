/**
 * onboardingState — persistencia del wizard de onboarding por cuenta.
 *
 * Guarda el estado intermedio en SQLite (local/dev) para que el usuario pueda
 * retomar el wizard si el servidor se reinicia. En producción con Supabase se
 * sincroniza vía accounts.onboarding_json.
 */

import { getDb } from './db.js';
import { upsertAccount, getAccount } from './accounts.js';
import type { OnboardingState } from '../capabilities/onboarding/index.js';

export const saveOnboardingState = (state: OnboardingState): void => {
  upsertAccount({
    id: state.accountId,
    name: state.answers.name ?? state.accountId,
    onboardingJson: JSON.stringify(state),
  });
};

export const loadOnboardingState = (accountId: string): OnboardingState | null => {
  const account = getAccount(accountId);
  if (!account?.onboardingJson) return null;
  try {
    return JSON.parse(account.onboardingJson) as OnboardingState;
  } catch {
    return null;
  }
};

export const deleteOnboardingState = (accountId: string): void => {
  const db = getDb();
  db.prepare("UPDATE accounts SET onboarding_json = NULL WHERE id = ?").run(accountId);
};
