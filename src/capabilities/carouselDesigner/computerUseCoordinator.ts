/**
 * Computer Use Coordinator — Orchestrate Canva automation.
 * Priority: Canva API (immediate) → Computer Use SDK (future)
 */

import { log } from '../../agent/logger.js';
import {
  searchCanvaTemplatesByAesthetic as canvaSearchTemplates,
  customizeCanvaDesign as canvaCustomizeDesign,
  exportCanvaDesignSlides,
} from './canvaApiCoordinator.js';

export interface CanvaWorkflowInput {
  prompt: string;
  style: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial';
  brandColors?: { primary: string; secondary: string };
  slides: number;
}

export interface CanvaWorkflowOutput {
  templateFound: boolean;
  templateId?: string;
  customizations: string[];
  exportedSlides: string[];
  method: 'computer-use' | 'canva-api' | 'mock';
}

/**
 * Mock template database for development.
 * Replace with real Canva API or Computer Use when available.
 */
const MOCK_TEMPLATES: Record<string, string[]> = {
  'warm-organic': [
    'canva-template-warm-carousel-1',
    'canva-template-warm-carousel-2',
  ],
  'bold-playful': [
    'canva-template-bold-carousel-1',
    'canva-template-bold-carousel-2',
  ],
  'dark-premium': [
    'canva-template-premium-carousel-1',
    'canva-template-premium-carousel-2',
  ],
  'clean-editorial': [
    'canva-template-editorial-carousel-1',
    'canva-template-editorial-carousel-2',
  ],
};

/**
 * Search Canva templates by aesthetic style.
 * Priority: Canva API → Computer Use (future) → Mock
 */
export const searchCanvaTemplateByAesthetic = async (
  style: string,
  slideCount: number,
): Promise<{ templateId: string | null; method: 'computer-use' | 'canva-api' | 'mock' }> => {
  // Try 1: Canva API (real templates)
  try {
    const templates = await canvaSearchTemplates(style, '4:5');
    if (templates.length > 0) {
      return {
        templateId: templates[0].id,
        method: 'canva-api',
      };
    }
  } catch (err) {
    log.warn(`[ComputerUse] Canva API search failed: ${(err as Error).message}`);
  }

  // Try 2: Computer Use (future)
  // const computerUseResult = await tryComputerUseSearch(style, slideCount);
  // if (computerUseResult) return { templateId: computerUseResult, method: 'computer-use' };

  // Try 3: Mock (fallback)
  const mockTemplates = MOCK_TEMPLATES[style as keyof typeof MOCK_TEMPLATES] || [];
  const templateId = mockTemplates.length > 0 ? mockTemplates[0] : null;

  log.info(`[ComputerUse] Template search: style=${style}, method=mock, templateId=${templateId}`);

  return {
    templateId,
    method: 'mock',
  };
};

/**
 * Customize Canva template with text + colors.
 * Priority: Canva API → Computer Use (future) → Mock
 */
export const customizeCanvaDesign = async (
  templateId: string,
  customizations: {
    slideTexts: string[];
    colors: { primary: string; secondary: string };
  },
): Promise<{ slides: string[]; method: 'computer-use' | 'canva-api' | 'mock' }> => {
  // Try 1: Canva API (real customization)
  try {
    const result = await canvaCustomizeDesign(templateId, customizations);
    if (result) {
      const exportResult = await exportCanvaDesignSlides(result.designId, 'png');
      if (exportResult?.slides) {
        log.info(`[ComputerUse] Design customized via API: ${exportResult.slides.length} slides`);
        return {
          slides: exportResult.slides,
          method: 'canva-api',
        };
      }
    }
  } catch (err) {
    log.warn(`[ComputerUse] Canva API customization failed: ${(err as Error).message}`);
  }

  // Try 2: Computer Use (future)
  // const computerUseResult = await tryComputerUseCustomize(templateId, customizations);
  // if (computerUseResult) return { slides: computerUseResult, method: 'computer-use' };

  // Try 3: Mock (fallback)
  const mockSlides = customizations.slideTexts.map(
    (_, idx) => `/tmp/carousel-exports/slide-${idx + 1}.png`,
  );

  log.info(`[ComputerUse] Design customization: method=mock, slides=${mockSlides.length}`);

  return {
    slides: mockSlides,
    method: 'mock',
  };
};

/**
 * Full workflow: Search template → Customize → Export
 */
export const runCanvaWorkflow = async (input: CanvaWorkflowInput): Promise<CanvaWorkflowOutput> => {
  try {
    log.info(`[ComputerUse] Starting workflow: style=${input.style}, slides=${input.slides}`);

    // Step 1: Find template
    const searchResult = await searchCanvaTemplateByAesthetic(input.style, input.slides);

    if (!searchResult.templateId) {
      log.warn(`[ComputerUse] No template found for style=${input.style}`);
      return {
        templateFound: false,
        customizations: [],
        exportedSlides: [],
        method: searchResult.method,
      };
    }

    log.info(`[ComputerUse] Template found: ${searchResult.templateId}`);

    // Step 2: Customize template
    const customizeResult = await customizeCanvaDesign(searchResult.templateId, {
      slideTexts: input.prompt.split('.').slice(0, input.slides),
      colors: input.brandColors || { primary: '#E91E8C', secondary: '#00D9FF' },
    });

    log.info(`[ComputerUse] Customization complete: ${customizeResult.slides.length} slides`);

    return {
      templateFound: true,
      templateId: searchResult.templateId,
      customizations: [
        `Applied ${input.style} style`,
        `Set primary color: ${input.brandColors?.primary || '#E91E8C'}`,
        `Generated ${customizeResult.slides.length} slides`,
      ],
      exportedSlides: customizeResult.slides,
      method: customizeResult.method,
    };
  } catch (error) {
    log.error(`[ComputerUse] Workflow failed: ${(error as Error).message}`);
    return {
      templateFound: false,
      customizations: [],
      exportedSlides: [],
      method: 'mock',
    };
  }
};

/**
 * Future: Real Computer Use implementation
 * Placeholder for when Anthropic Computer Use SDK is integrated
 */
// const tryComputerUseSearch = async (style: string, slideCount: number): Promise<string | null> => {
//   // const client = new AnthropicClient({ model: 'claude-opus' });
//   // const result = await client.computerUse({
//   //   task: `Search Canva.com for carousel templates matching ${style} style`,
//   //   tools: ['browser_control']
//   // });
//   // return result.templateId;
// };

export const computerUseCoordinator = {
  searchCanvaTemplateByAesthetic,
  customizeCanvaDesign,
  runCanvaWorkflow,
};
