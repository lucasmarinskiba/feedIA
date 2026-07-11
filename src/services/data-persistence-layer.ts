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
    const db = await feedIADatabase.getConnection();

    await db.run(
      `INSERT OR REPLACE INTO polling_jobs
       (postId, accountId, platform, format, publishedAt, nextMetricsCheck, nextEngagementCheck, nextFeedbackCheck, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [postId, accountId, platform, format, publishedAt, nextMetricsCheck, nextEngagementCheck, nextFeedbackCheck, Date.now()],
    );

    log.debug('[Persistence] Polling job saved', { postId });
  } catch (err) {
    log.error('[Persistence] Failed to save polling job', { postId, error: String(err) });
  }
};

/**
 * Load polling jobs from database
 */
export const loadPollingJobs = async (): Promise<
  Array<{
    postId: string;
    accountId: string;
    platform: 'instagram' | 'tiktok';
    format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo';
    publishedAt: number;
    nextMetricsCheck: number;
    nextEngagementCheck: number;
    nextFeedbackCheck: number;
  }>
> => {
  try {
    const db = await feedIADatabase.getConnection();

    const jobs = await db.all(
      `SELECT postId, accountId, platform, format, publishedAt, nextMetricsCheck, nextEngagementCheck, nextFeedbackCheck
       FROM polling_jobs
       WHERE nextFeedbackCheck > ?`,
      [Date.now() - 7 * 24 * 60 * 60 * 1000], // Last 7 days
    );

    log.info('[Persistence] Polling jobs loaded', { count: jobs?.length || 0 });

    return jobs || [];
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
    const db = await feedIADatabase.getConnection();

    await db.run(
      `INSERT OR REPLACE INTO token_budgets (accountId, monthlyBudget, spent, resetAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [accountId, monthlyBudget, spent, resetAt, Date.now()],
    );

    log.debug('[Persistence] Budget saved', { accountId, spent });
  } catch (err) {
    log.error('[Persistence] Failed to save budget', { accountId, error: String(err) });
  }
};

/**
 * Load token budget from database
 */
export const loadBudget = async (accountId: string): Promise<{ monthlyBudget: number; spent: number; resetAt: number } | null> => {
  try {
    const db = await feedIADatabase.getConnection();

    const budget = await db.get(
      `SELECT monthlyBudget, spent, resetAt FROM token_budgets WHERE accountId = ?`,
      [accountId],
    );

    if (budget) {
      log.debug('[Persistence] Budget loaded', { accountId, spent: budget.spent });
    }

    return budget || null;
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
    const db = await feedIADatabase.getConnection();

    await db.run(
      `INSERT OR REPLACE INTO prompt_cache (key, pillar, variant, platform, brandNiche, prompt, qualityScore, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [key, pillar, variant, platform, brandNiche, prompt, qualityScore, expiresAt, Date.now()],
    );

    log.debug('[Persistence] Prompt cached', { key });
  } catch (err) {
    log.error('[Persistence] Failed to cache prompt', { key, error: String(err) });
  }
};

/**
 * Load cached prompts from database (cleanup expired)
 */
export const loadCachedPrompts = async (): Promise<
  Array<{
    key: string;
    pillar: string;
    variant: string;
    platform: 'instagram' | 'tiktok';
    brandNiche: string;
    prompt: string;
    qualityScore: number;
  }>
> => {
  try {
    const db = await feedIADatabase.getConnection();

    // Delete expired
    await db.run(`DELETE FROM prompt_cache WHERE expiresAt < ?`, [Date.now()]);

    const prompts = await db.all(
      `SELECT key, pillar, variant, platform, brandNiche, prompt, qualityScore
       FROM prompt_cache
       WHERE expiresAt > ?`,
      [Date.now()],
    );

    log.info('[Persistence] Cached prompts loaded', { count: prompts?.length || 0 });

    return prompts || [];
  } catch (err) {
    log.error('[Persistence] Failed to load cached prompts', { error: String(err) });
    return [];
  }
};
