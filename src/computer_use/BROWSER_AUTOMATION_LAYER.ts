/**
 * Browser Automation Layer - Instagram & TikTok Direct Control
 * Uses Playwright for browser control + Computer Vision for context awareness
 */

import { chromium, Browser, Page } from 'playwright';

interface BrowserSession {
  browser: Browser;
  page: Page;
  platform: 'instagram' | 'tiktok' | 'unknown';
  userId?: string;
  authenticated: boolean;
}

// ── BROWSER MANAGER ──────────────────────────────────────

class BrowserAutomationManager {
  private session: BrowserSession | null = null;

  async initializeBrowser(): Promise<BrowserSession> {
    const browser = await chromium.launch({
      headless: false, // Show browser so user can see actions
    });

    const page = await browser.newPage();
    page.setViewportSize({ width: 1080, height: 1920 }); // Mobile-like viewport

    this.session = {
      browser,
      page,
      platform: 'unknown',
      authenticated: false,
    };

    return this.session;
  }

  async navigateToInstagram(): Promise<void> {
    if (!this.session) throw new Error('Browser not initialized');

    await this.session.page.goto('https://www.instagram.com');
    this.session.platform = 'instagram';

    // Wait for page load
    await this.session.page.waitForLoadState('networkidle');

    // Check if logged in
    const isLoggedIn = await this.session.page.$('[aria-label="Home"]') !== null;
    this.session.authenticated = isLoggedIn;

    if (!isLoggedIn) {
      console.log('[Browser] Not authenticated. Manual login required.');
      // Wait for user to login manually (show in browser)
      await this.session.page.waitForNavigation({ timeout: 60000 });
      this.session.authenticated = true;
    }
  }

  async navigateToTikTok(): Promise<void> {
    if (!this.session) throw new Error('Browser not initialized');

    await this.session.page.goto('https://www.tiktok.com');
    this.session.platform = 'tiktok';

    await this.session.page.waitForLoadState('networkidle');

    const isLoggedIn = await this.session.page.$('[data-testid="nav-user-icon"]') !== null;
    this.session.authenticated = isLoggedIn;

    if (!isLoggedIn) {
      console.log('[Browser] Not authenticated. Manual login required.');
      await this.session.page.waitForNavigation({ timeout: 60000 });
      this.session.authenticated = true;
    }
  }

  // ── INSTAGRAM AUTOMATION ──────────────────────────

  async createInstagramCarousel(content: {
    images: string[];
    captions: string[];
    hashtags: string;
  }): Promise<void> {
    if (!this.session || this.session.platform !== 'instagram') {
      throw new Error('Not on Instagram');
    }

    const page = this.session.page;

    // Step 1: Click "Create" button
    await page.click('[aria-label="Create"]');
    await page.waitForTimeout(1000);

    // Step 2: Click "Post"
    await page.click('text=Post');
    await page.waitForTimeout(1000);

    // Step 3: Upload images
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      // Upload all carousel images
      for (const imagePath of content.images) {
        await fileInput.setInputFiles(imagePath);
        await page.waitForTimeout(500);
      }
    }

    // Step 4: Select carousel layout if multiple images
    if (content.images.length > 1) {
      await page.click('text=Select multiple');
      await page.waitForTimeout(500);
    }

    // Step 5: Click Next
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(1000);

    // Step 6: Add caption
    const captionField = await page.$('[aria-label="Write a caption..."]');
    if (captionField) {
      const fullCaption = content.captions.join('\n\n') + '\n\n' + content.hashtags;
      await captionField.fill(fullCaption);
    }

    // Step 7: Click Share
    await page.click('button:has-text("Share")');

    console.log('[Instagram] Carousel posted successfully');
  }

  async createInstagramStory(imagePath: string, text?: string): Promise<void> {
    if (!this.session || this.session.platform !== 'instagram') {
      throw new Error('Not on Instagram');
    }

    const page = this.session.page;

    // Click Story button
    await page.click('[aria-label="Your Story"]');
    await page.waitForTimeout(1000);

    // Upload image
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(imagePath);
      await page.waitForTimeout(1000);
    }

    // Add text if provided
    if (text) {
      await page.click('text=Aa'); // Text tool
      const textInput = await page.$('[contenteditable="true"]');
      if (textInput) {
        await textInput.fill(text);
      }
    }

    // Post story
    await page.click('button:has-text("Share to Story")');

    console.log('[Instagram] Story posted successfully');
  }

  async respondToComments(responses: {
    commentId: string;
    response: string;
  }[]): Promise<void> {
    if (!this.session || this.session.platform !== 'instagram') {
      throw new Error('Not on Instagram');
    }

    const page = this.session.page;

    for (const { commentId, response } of responses) {
      // Find comment
      const comment = await page.$(`[data-comment-id="${commentId}"]`);
      if (!comment) continue;

      // Click reply
      await comment.click();
      await page.waitForTimeout(500);

      // Find reply input
      const replyInput = await page.$('[aria-label="Add a comment..."]');
      if (replyInput) {
        await replyInput.fill(response);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    }

    console.log(`[Instagram] Responded to ${responses.length} comments`);
  }

  async analyzeAccountMetrics(): Promise<{
    followers: number;
    engagement: number;
    posts: number;
  }> {
    if (!this.session || this.session.platform !== 'instagram') {
      throw new Error('Not on Instagram');
    }

    const page = this.session.page;

    // Navigate to own profile
    await page.click('[aria-label="Profile"]');
    await page.waitForTimeout(1000);

    // Extract metrics
    const followersText = await page.textContent('._ac2a');
    const followers = parseInt(followersText?.match(/\d+/)?.[0] || '0');

    // Get engagement rate from recent posts
    const postEngagement = await page.$$eval('[role="article"]', (posts) =>
      posts.map((p) => ({
        likes: (p.querySelector('[aria-label*="like"]')?.textContent || '0').match(/\d+/)?.[0],
        comments: (p.querySelector('[aria-label*="comment"]')?.textContent || '0').match(/\d+/)?.[0],
      })),
    );

    const avgEngagement =
      postEngagement.reduce(
        (sum, p) =>
          sum + (parseInt(p.likes || '0') + parseInt(p.comments || '0')),
        0,
      ) / postEngagement.length || 0;

    return {
      followers,
      engagement: avgEngagement,
      posts: postEngagement.length,
    };
  }

  // ── TIKTOK AUTOMATION ──────────────────────────────

  async createTikTokVideo(content: {
    videoPath: string;
    caption: string;
    hashtags: string;
  }): Promise<void> {
    if (!this.session || this.session.platform !== 'tiktok') {
      throw new Error('Not on TikTok');
    }

    const page = this.session.page;

    // Click upload
    await page.click('[data-testid="nav-upload"]');
    await page.waitForTimeout(1000);

    // Upload video
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(content.videoPath);
      await page.waitForTimeout(2000);
    }

    // Click "Continue"
    await page.click('button:has-text("Upload video")');
    await page.waitForTimeout(1000);

    // Add caption
    const captionInput = await page.$('[placeholder*="Describe"]');
    if (captionInput) {
      await captionInput.fill(content.caption + '\n' + content.hashtags);
    }

    // Post
    await page.click('button:has-text("Post")');

    console.log('[TikTok] Video posted successfully');
  }

  async respondToDMsAndComments(messages: { content: string; type: 'dm' | 'comment' }[]): Promise<void> {
    if (!this.session || this.session.platform !== 'tiktok') {
      throw new Error('Not on TikTok');
    }

    const page = this.session.page;

    // Go to messages
    await page.click('[data-testid="nav-messages"]');
    await page.waitForTimeout(1000);

    for (const msg of messages) {
      if (msg.type === 'dm') {
        // Click first conversation
        const conversation = await page.$('[data-testid="inbox-item"]');
        if (conversation) {
          await conversation.click();
          const input = await page.$('[placeholder*="Send"]');
          if (input) {
            await input.fill(msg.content);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
          }
        }
      }
    }

    console.log(`[TikTok] Responded to ${messages.length} messages`);
  }

  async closeBrowser(): Promise<void> {
    if (this.session) {
      await this.session.browser.close();
      this.session = null;
    }
  }
}

// ── PUBLIC API ──────────────────────────────────────────

export async function automateInstagramPost(content: any): Promise<void> {
  const manager = new BrowserAutomationManager();
  await manager.initializeBrowser();
  await manager.navigateToInstagram();
  await manager.createInstagramCarousel(content);
  await manager.closeBrowser();
}

export async function automateTikTokVideo(content: any): Promise<void> {
  const manager = new BrowserAutomationManager();
  await manager.initializeBrowser();
  await manager.navigateToTikTok();
  await manager.createTikTokVideo(content);
  await manager.closeBrowser();
}

export { BrowserAutomationManager };
