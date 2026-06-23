/**
 * Computer Use SDK — Real browser automation via Anthropic API.
 * Automates Canva template search + customization.
 */

import { log } from '../agent/logger.js';

const COMPUTER_USE_API = 'https://api.anthropic.com/v1/messages';
const API_KEY = process.env['ANTHROPIC_COMPUTER_USE_KEY'];

export interface ComputerUseTask {
  action: 'screenshot' | 'click' | 'type' | 'scroll' | 'wait';
  target?: string;
  text?: string;
  coordinates?: [number, number];
}

/**
 * Execute browser automation task via Computer Use API.
 */
export const executeComputerUseTask = async (
  task: string,
  previousScreenshot?: string,
): Promise<{ screenshot: string; result: string; success: boolean }> => {
  if (!API_KEY) {
    log.warn('[ComputerUse] API key not set. Fallback to Canva API.');
    return {
      screenshot: '',
      result: 'Computer Use SDK not configured',
      success: false,
    };
  }

  try {
    const response = await fetch(COMPUTER_USE_API, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus',
        max_tokens: 4096,
        tools: [
          {
            type: 'computer_use',
            name: 'computer',
            display_name: 'Browser Control',
          },
        ],
        messages: [
          {
            role: 'user',
            content: `${task}\n\n${previousScreenshot ? `Current screenshot: ${previousScreenshot}` : ''}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = (await response.json()) as any;
    const content = data.content?.[0];

    log.info(`[ComputerUse] Task executed: ${task.substring(0, 50)}`);

    return {
      screenshot: content?.image || '',
      result: content?.text || 'Task completed',
      success: true,
    };
  } catch (err) {
    log.error(`[ComputerUse] Task failed: ${(err as Error).message}`);
    return {
      screenshot: '',
      result: (err as Error).message,
      success: false,
    };
  }
};

/**
 * Search Canva templates via browser automation.
 */
export const searchCanvaTemplatesWithBrowser = async (
  style: string,
  slideCount: number,
): Promise<{ templateId: string; name: string } | null> => {
  const task = `
    1. Go to https://www.canva.com/templates
    2. Search for: "carousel ${style}" with ${slideCount} slides
    3. Find first matching template
    4. Extract template ID from URL
    5. Return: { templateId, name }
  `;

  const result = await executeComputerUseTask(task);
  if (!result.success) return null;

  try {
    const parsed = JSON.parse(result.result);
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Customize Canva template via browser.
 */
export const customizeCanvaViaComputer = async (
  templateId: string,
  customizations: { slideTexts: string[]; colors: { primary: string; secondary: string } },
): Promise<{ designUrl: string; success: boolean }> => {
  const task = `
    1. Open Canva template: https://www.canva.com/templates/${templateId}
    2. For each slide in template:
       - Replace text with: ${customizations.slideTexts.join('; ')}
       - Change colors to primary: ${customizations.colors.primary}, secondary: ${customizations.colors.secondary}
    3. Export design
    4. Return design URL
  `;

  const result = await executeComputerUseTask(task);

  return {
    designUrl: result.result || '',
    success: result.success,
  };
};

export const computerUseSDK = {
  executeComputerUseTask,
  searchCanvaTemplatesWithBrowser,
  customizeCanvaViaComputer,
};
