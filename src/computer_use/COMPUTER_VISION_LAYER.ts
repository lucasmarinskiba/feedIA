/**
<<<<<<< HEAD
 * Computer Vision Layer — Stub implementation
 * Provides screenshot analysis capability for the autonomous brain.
 * Real implementation would use a vision model (e.g. Gemini Vision).
 */

export interface VisionContent {
  recentPosts: Array<{
    caption: string;
    format: string;
    category?: string;
    engagement?: number;
    timestamp?: string;
  }>;
  audienceProfile?: {
    description: string;
    segments: string[];
  };
  accountMetrics?: {
    followers: number;
    engagement: number;
    reach: number;
  };
}

export interface ScreenshotAnalysis {
  content: VisionContent;
  confidence: number;
  analyzedAt: string;
}

/**
 * Analyzes the current Instagram screen state via computer vision.
 * Stub: returns empty data in non-computer-use environments.
 */
export const analyzeScreenshot = async (): Promise<ScreenshotAnalysis> => {
  // Real implementation would capture screen and send to vision model.
  // Returning safe defaults to avoid runtime crashes.
  return {
    content: {
      recentPosts: [],
      audienceProfile: {
        description: 'general audience',
        segments: [],
      },
      accountMetrics: {
        followers: 0,
        engagement: 0,
        reach: 0,
      },
    },
    confidence: 0,
    analyzedAt: new Date().toISOString(),
  };
=======
 * Computer Vision Layer — Visual Intelligence (screen analysis)
 * Real implementation of the spec documented in COMPUTER_VISION_LAYER.md:
 * sends a screenshot to Claude Vision and extracts structured screen/content
 * data that the Computer Use orchestrator + Autonomous Brain use to decide
 * what to do next.
 *
 * Degrades gracefully: if no screenshot is available or the model call
 * fails, returns a safe empty analysis — every caller already treats
 * `content.*` fields as optional (`vision.content.comments || []`, etc).
 */

import { claude } from '../agent/claude.js';
import { log } from '../agent/logger.js';

export interface VisionElement {
  type: string;
  label?: string;
  position?: { x: number; y: number };
}

export interface VisionContent {
  comments?: Array<{ id: string; text: string }>;
  recentPosts?: Array<{ caption: string; format: string; category?: string }>;
  accountMetrics?: { followers: number; engagement: number };
  audienceProfile?: { description?: string; segments?: string[] };
  accountAnalysis?: unknown;
  audienceInsights?: unknown;
}

export interface VisionAnalysis {
  screenState: string;
  elements: VisionElement[];
  content: VisionContent;
  recommendations: string[];
  nextAction: string;
}

const emptyAnalysis = (): VisionAnalysis => ({
  screenState: 'unknown',
  elements: [],
  content: {},
  recommendations: [],
  nextAction: 'none',
});

/**
 * Analyze a screenshot (base64 PNG). Without a screenshot there's nothing to
 * analyze yet (no OS-level screen capture wired here), so it returns an
 * empty analysis rather than guessing.
 */
export const analyzeScreenshot = async (screenshotB64?: string): Promise<VisionAnalysis> => {
  if (!screenshotB64) {
    log.warn('[ComputerVision] No screenshot provided, returning empty analysis');
    return emptyAnalysis();
  }

  try {
    const response = await claude.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotB64 } },
            {
              type: 'text',
              text: `Analyze this screenshot. Extract:
1. Current screen/platform (Instagram/TikTok/etc)
2. All visible elements (buttons, inputs, text, images)
3. Content visible (posts, comments, messages, etc)
4. Current user action context
5. Next recommended action for FeedIA automation
6. Any engagement/quality metrics visible

Respond with ONLY structured JSON: { "platform": string, "elements": [...], "content": {...}, "recommendations": [...], "nextAction": string }`,
            },
          ],
        },
      ],
    });

    const block = (response as { content: Array<{ type: string; text?: string }> }).content[0];
    const text = block?.type === 'text' && block.text ? block.text : '{}';

    const parsed = JSON.parse(text) as Partial<{
      platform: string;
      elements: VisionElement[];
      content: VisionContent;
      recommendations: string[];
      nextAction: string;
    }>;

    return {
      screenState: parsed.platform ?? 'unknown',
      elements: parsed.elements ?? [],
      content: parsed.content ?? {},
      recommendations: parsed.recommendations ?? [],
      nextAction: parsed.nextAction ?? 'none',
    };
  } catch (err) {
    log.warn(`[ComputerVision] Analysis failed: ${(err as Error).message}`);
    return emptyAnalysis();
  }
>>>>>>> worktree-agent-a168fb945562927dd
};
