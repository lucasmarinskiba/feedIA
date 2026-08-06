/**
 * Data Persistence Layer
 *
 * Persists in-memory state to SQLite:
 * - Polling queue (registered posts + next check times)
 * - Token budgets (monthly spend per account)
 * - Prompt cache (generated prompts for reuse)
 *
 * Survives server restart.
 */

import { log } from '../agent/logger.js';
import { feedIADatabase } from '../db/database.js';

interface PollingJobRow {
  postId: string;
  accountId: string;
  platform: 'instagram' | 'tiktok';
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo';
  publishedAt: number;
  nextMetricsCheck: number;
  nextEngagementCheck: number;
  nextFeedbackCheck: number;
}

interface BudgetRow {
  monthlyBudget: number;
  spent: number;
  resetAt: number;
}

interface CachedPromptRow {
  key: string;
  pillar: string;
  variant: string;
  platform: 'instagram' | 'tiktok';
  brandNiche: string;
  prompt: string;
  qualityScore: number;
}

/**
 * Save polling job to database
 */
export const persistPollingJob = async (
  postId: string,
  accountId: string,
  platform: 'instagram' | 'tiktok',
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo',
  publishedAt: number,
  nextMetricsCheck: number,
  nextEngagementCheck: number,
  nextFeedbackCheck: number,
): Promise<void> => {
  try {
    const db = feedIADatabase.getConnection();

    db.prepare(
      `INSERT OR REPLACE INTO polling_jobs
       (postId, accountId, platform, format, publishedAt, nextMetricsCheck, nextEngagementCheck, nextFeedbackCheck, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      postId,
      accountId,
      platform,
      format,
      publishedAt,
      nextMetricsCheck,
      nextEngagementCheck,
      nextFeedbackCheck,
      Date.now(),
    );

    log.debug('[Persistence] Polling job saved', { postId });
  } catch (err) {
    log.error('[Persistence] Failed to save polling job', { postId, error: String(err) });
  }
};

/**
 * Load polling jobs from database
 */
export const loadPollingJobs = async (): Promise<PollingJobRow[]> => {
  try {
    const db = feedIADatabase.getConnection();

    const jobs = db
      .prepare(
        `SELECT postId, accountId, platform, format, publishedAt, nextMetricsCheck, nextEngagementCheck, nextFeedbackCheck
         FROM polling_jobs
         WHERE nextFeedbackCheck > ?`,
      )
      .all(Date.now() - 7 * 24 * 60 * 60 * 1000) as PollingJobRow[]; // Last 7 days

    log.info('[Persistence] Polling jobs loaded', { count: jobs.length });

    return jobs;
  } catch (err) {
    log.error('[Persistence] Failed to load polling jobs', { error: String(err) });
    return [];
  }
};

/**
 * Save token budget to database
 */
export const persistBudget = async (
  accountId: string,
  monthlyBudget: number,
  spent: number,
  resetAt: number,
): Promise<void> => {
  try {
    const db = feedIADatabase.getConnection();

    db.prepare(
      `INSERT OR REPLACE INTO token_budgets (accountId, monthlyBudget, spent, resetAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(accountId, monthlyBudget, spent, resetAt, Date.now());

    log.debug('[Persistence] Budget saved', { accountId, spent });
  } catch (err) {
    log.error('[Persistence] Failed to save budget', { accountId, error: String(err) });
  }
};

/**
 * Load token budget from database
 */
export const loadBudget = async (accountId: string): Promise<BudgetRow | null> => {
  try {
    const db = feedIADatabase.getConnection();

    const budget = db
      .prepare(`SELECT monthlyBudget, spent, resetAt FROM token_budgets WHERE accountId = ?`)
      .get(accountId) as BudgetRow | undefined;

    if (budget) {
      log.debug('[Persistence] Budget loaded', { accountId, spent: budget.spent });
    }

    return budget ?? null;
  } catch (err) {
    log.error('[Persistence] Failed to load budget', { accountId, error: String(err) });
    return null;
  }
};

/**
 * Save cached prompt to database
 */
export const persistCachedPrompt = async (
  key: string,
  pillar: string,
  variant: string,
  platform: 'instagram' | 'tiktok',
  brandNiche: string,
  prompt: string,
  qualityScore: number,
  expiresAt: number,
): Promise<void> => {
  try {
    const db = feedIADatabase.getConnection();

    db.prepare(
      `INSERT OR REPLACE INTO prompt_cache (key, pillar, variant, platform, brandNiche, prompt, qualityScore, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(key, pillar, variant, platform, brandNiche, prompt, qualityScore, expiresAt, Date.now());

    log.debug('[Persistence] Prompt cached', { key });
  } catch (err) {
    log.error('[Persistence] Failed to cache prompt', { key, error: String(err) });
  }
};

/**
 * Load cached prompts from database (cleanup expired)
 */
export const loadCachedPrompts = async (): Promise<CachedPromptRow[]> => {
  try {
    const db = feedIADatabase.getConnection();

    // Delete expired
    db.prepare(`DELETE FROM prompt_cache WHERE expiresAt < ?`).run(Date.now());

    const prompts = db
      .prepare(
        `SELECT key, pillar, variant, platform, brandNiche, prompt, qualityScore
         FROM prompt_cache
         WHERE expiresAt > ?`,
      )
      .all(Date.now()) as CachedPromptRow[];

    log.info('[Persistence] Cached prompts loaded', { count: prompts.length });

    return prompts;
  } catch (err) {
    log.error('[Persistence] Failed to load cached prompts', { error: String(err) });
    return [];
  }
};
