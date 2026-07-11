/**
 * Browserless Automation Service
 *
 * Cloud-based browser automation for Instagram engagement actions.
 * Suitable for Vercel (serverless), avoids local Puppeteer.
 *
 * Actions: like, comment, follow, story-view
 * Cost: ~$0.05-0.10 per action
 * Signup: browserless.io
 */

import { log } from '../agent/logger.js';

export interface BrowserlessAction {
  action: 'like' | 'comment' | 'follow' | 'story-view';
  targetPostId?: string;
  targetAccountId?: string;
  message?: string; // for comments
}

export interface BrowserlessResult {
  ok: boolean;
  action: string;
  durationMs: number;
  error?: string;
}

const API_URL = 'https://chrome.browserless.io/function';
const API_KEY = process.env.BROWSERLESS_API_KEY;

/**
 * Execute Instagram action via Browserless
 */
export const executeBrowserlessAction = async (task: BrowserlessAction, igToken: string): Promise<BrowserlessResult> => {
  if (!API_KEY) {
    log.warn('[Browserless] Missing BROWSERLESS_API_KEY, skipping automation');
    return {
      ok: false,
      action: task.action,
      durationMs: 0,
      error: 'BROWSERLESS_API_KEY not configured',
    };
  }

  const startTime = Date.now();

  try {
    log.info('[Browserless] Executing action', { action: task.action, accountId: task.targetAccountId });

    // Browserless payload: custom Chrome automation script
    const payload = buildPayload(task, igToken);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 30000, // 30s timeout for action
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorData = (await response.text()) as string;
      log.error('[Browserless] Request failed', { status: response.status, error: errorData });
      return {
        ok: false,
        action: task.action,
        durationMs,
        error: `Browserless error: ${response.status}`,
      };
    }

    const result = (await response.json()) as { data?: unknown; error?: string };

    if (result.error) {
      log.error('[Browserless] Action failed', { action: task.action, error: result.error });
      return {
        ok: false,
        action: task.action,
        durationMs,
        error: result.error,
      };
    }

    log.info('[Browserless] Action succeeded', { action: task.action, durationMs });
    return {
      ok: true,
      action: task.action,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    log.error('[Browserless] Exception', { error: String(err), durationMs });
    return {
      ok: false,
      action: task.action,
      durationMs,
      error: String(err),
    };
  }
};

/**
 * Build Browserless automation payload
 * Each action gets its own Chrome script
 */
const buildPayload = (task: BrowserlessAction, igToken: string): unknown => {
  const commonSetup = `
    const page = await browser.newPage();
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

    // Inject token into localStorage (Instagram session)
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('INSTAGRAM_ACCESS_TOKEN', token);
    }, '${igToken}');

    await page.reload({ waitUntil: 'networkidle2' });
  `;

  const actions: Record<string, string> = {
    like: `
      ${commonSetup}
      // Navigate to post
      await page.goto('https://www.instagram.com/p/${task.targetPostId}/', { waitUntil: 'networkidle2' });

      // Find and click like button
      const likeBtn = await page.$('button[aria-label*="Like"]');
      if (likeBtn) {
        await likeBtn.click();
        await page.waitForTimeout(1000);
      } else {
        throw new Error('Like button not found');
      }
      return { success: true };
    `,
    comment: `
      ${commonSetup}
      // Navigate to post
      await page.goto('https://www.instagram.com/p/${task.targetPostId}/', { waitUntil: 'networkidle2' });

      // Click comment field
      const commentField = await page.$('input[aria-label="Add a comment..."]');
      if (commentField) {
        await commentField.type('${task.message || 'Great post!'}');

        // Submit comment
        const submitBtn = await page.$('button:contains("Post")');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForTimeout(1000);
        }
      } else {
        throw new Error('Comment field not found');
      }
      return { success: true };
    `,
    follow: `
      ${commonSetup}
      // Navigate to account
      await page.goto('https://www.instagram.com/${task.targetAccountId}/', { waitUntil: 'networkidle2' });

      // Find and click follow button
      const followBtn = await page.$('button:contains("Follow")');
      if (followBtn) {
        await followBtn.click();
        await page.waitForTimeout(1000);
      } else {
        throw new Error('Follow button not found');
      }
      return { success: true };
    `,
    'story-view': `
      ${commonSetup}
      // Navigate to story (stories don't have direct URLs, use Stories feed)
      await page.goto('https://www.instagram.com/stories/${task.targetAccountId}/', { waitUntil: 'networkidle2' });

      // Wait for story to load and auto-advance
      await page.waitForTimeout(3000);

      return { success: true };
    `,
  };

  const script = actions[task.action] || actions.like;

  return {
    code: `
      module.exports = async function ({ page, browser }) {
        try {
          ${script}
        } catch (error) {
          throw new Error('Action failed: ' + error.message);
        }
      };
    `,
  };
};
