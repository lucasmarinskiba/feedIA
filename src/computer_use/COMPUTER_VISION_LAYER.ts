/**
 * Computer Vision + Analysis Layer - Visual Intelligence
 * Screen analysis: understand what's on screen, extract actionable data.
 *
 * Implementation of the design spec in COMPUTER_VISION_LAYER.md.
 */

import Anthropic from '@anthropic-ai/sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

export interface VisionElement {
  type: string;
  label?: string;
  position?: { x: number; y: number };
  [key: string]: unknown;
}

export interface VisionContent {
  recentPosts?: Array<{
    caption: string;
    format?: string;
    category?: string;
    [key: string]: unknown;
  }>;
  accountMetrics?: {
    followers?: number;
    engagement?: number;
    [key: string]: unknown;
  };
  audienceProfile?: {
    description?: string;
    segments?: string[];
    [key: string]: unknown;
  };
  comments?: Array<{
    id: string;
    text: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface VisionAnalysis {
  screenState: string;
  elements: VisionElement[];
  content: VisionContent;
  recommendations: string[];
  nextAction: string;
}

/**
 * Capture a screenshot of the current screen and return it base64-encoded.
 * Best-effort: platform-specific, degrades to an empty string on failure.
 */
export async function captureScreenshot(): Promise<string> {
  const platform = process.platform;
  const tmpPath =
    platform === 'win32' ? `${process.env.TEMP || 'C:\\Temp'}\\screenshot.png` : '/tmp/screenshot.png';

  let command = '';
  if (platform === 'win32') {
    command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size); $bitmap.Save('${tmpPath}')"`;
  } else if (platform === 'darwin') {
    command = `screencapture -x ${tmpPath}`;
  } else {
    command = `import -window root ${tmpPath}`;
  }

  try {
    await execAsync(command);
    const buffer = fs.readFileSync(tmpPath);
    return buffer.toString('base64');
  } catch (error) {
    console.warn('[ComputerVisionLayer] Screenshot capture failed, degrading gracefully:', error);
    return '';
  }
}

/**
 * Analyze the current screen via Claude Vision.
 * Degrades gracefully to an empty/default analysis when no screenshot or API key is available.
 */
export async function analyzeScreenshot(): Promise<VisionAnalysis> {
  const emptyAnalysis: VisionAnalysis = {
    screenState: 'unknown',
    elements: [],
    content: {},
    recommendations: [],
    nextAction: 'none',
  };

  const screenshot = await captureScreenshot();
  if (!screenshot || !process.env.ANTHROPIC_API_KEY) {
    return emptyAnalysis;
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshot,
              },
            },
            {
              type: 'text',
              text: `Analyze this screenshot. Extract:
1. Current screen/platform (Instagram/TikTok/etc)
2. All visible elements (buttons, inputs, text, images)
3. Content visible (posts, comments, messages, etc)
4. Current user action context
5. Next recommended action for FeedIA automation
6. Any engagement/quality metrics visible

Format as structured JSON.`,
            },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const rawText = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '{}';
    const analysis = JSON.parse(rawText) as {
      platform?: string;
      elements?: VisionElement[];
      content?: VisionContent;
      recommendations?: string[];
      nextAction?: string;
    };

    return {
      screenState: analysis.platform || 'unknown',
      elements: analysis.elements || [],
      content: analysis.content || {},
      recommendations: analysis.recommendations || [],
      nextAction: analysis.nextAction || 'none',
    };
  } catch (error) {
    console.warn('[ComputerVisionLayer] Vision analysis failed, degrading gracefully:', error);
    return emptyAnalysis;
  }
}
