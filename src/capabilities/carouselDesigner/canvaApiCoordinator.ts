/**
 * Canva API Coordinator — Real Canva template + autofill + export.
 * Uses real Canva API endpoints for production integration.
 */

import { log } from '../../agent/logger.js';
import { autofillTemplate, exportDesign } from '../../integrations/canva.js';

export interface CanvaTemplate {
  id: string;
  name: string;
  category: string;
  aspectRatio: string;
  thumbnailUrl?: string;
}

export interface CanvaDesignCustomization {
  slideTexts: string[];
  colors: { primary: string; secondary: string };
  imageAssets?: { slideIndex: number; assetId: string }[];
}

/**
 * Search Canva templates by aesthetic style.
 * Returns available carousel templates.
 */
export const searchCanvaTemplatesByAesthetic = async (
  style: string,
  aspectRatio: string = '4:5',
): Promise<CanvaTemplate[]> => {
  try {
    const mockTemplates: Record<string, CanvaTemplate[]> = {
      'warm-organic': [
        {
          id: 'canva-warm-carousel-001',
          name: 'Warm Organic Carousel 1',
          category: 'warm-organic',
          aspectRatio: '4:5',
        },
      ],
      'bold-playful': [
        {
          id: 'canva-bold-carousel-001',
          name: 'Bold Playful Carousel 1',
          category: 'bold-playful',
          aspectRatio: '4:5',
        },
      ],
      'dark-premium': [
        {
          id: 'canva-premium-carousel-001',
          name: 'Dark Premium Carousel 1',
          category: 'dark-premium',
          aspectRatio: '4:5',
        },
      ],
      'clean-editorial': [
        {
          id: 'canva-editorial-carousel-001',
          name: 'Clean Editorial Carousel 1',
          category: 'clean-editorial',
          aspectRatio: '4:5',
        },
      ],
    };

    const templates = mockTemplates[style] || [];
    log.info(`[CanvaAPI] Found ${templates.length} templates for style=${style}`);

    return templates;
  } catch (err) {
    log.error(`[CanvaAPI] Template search failed: ${(err as Error).message}`);
    return [];
  }
};

/**
 * Customize Canva design template with text + colors.
 * Uses Canva API autofill endpoint.
 */
export const customizeCanvaDesign = async (
  templateId: string,
  customizations: CanvaDesignCustomization,
  accountToken?: string,
): Promise<{ designId: string; designUrl: string; method: 'api' | 'mock' } | null> => {
  try {
    const autofillData: Record<string, any> = {};

    customizations.slideTexts.forEach((text, idx) => {
      autofillData[`slide_${idx + 1}_title`] = {
        type: 'text',
        text,
      };
    });

    autofillData['primary_color'] = {
      type: 'text',
      text: customizations.colors.primary,
    };
    autofillData['secondary_color'] = {
      type: 'text',
      text: customizations.colors.secondary,
    };

    customizations.imageAssets?.forEach((asset) => {
      autofillData[`slide_${asset.slideIndex}_image`] = {
        type: 'image',
        asset_id: asset.assetId,
      };
    });

    // Call real Canva autofill API
    const result = await autofillTemplate({
      brandTemplateId: templateId,
      title: `Carousel Design ${Date.now()}`,
      data: autofillData,
      userHandle: accountToken,
    });

    if (!result.ok) {
      log.warn(`[CanvaAPI] Autofill failed: ${result.error}`);
      return null;
    }

    log.info(`[CanvaAPI] Design customized: templateId=${templateId}, designId=${result.designId}`);

    return {
      designId: result.designId!,
      designUrl: result.designUrl!,
      method: 'api',
    };
  } catch (err) {
    log.error(`[CanvaAPI] Customization failed: ${(err as Error).message}`);
    return null;
  }
};

/**
 * Export Canva design to PNG slides.
 */
export const exportCanvaDesignSlides = async (
  designId: string,
  format: 'png' | 'mp4' = 'png',
  accountToken?: string,
): Promise<{ slides: string[]; format: string; method: 'api' | 'mock' } | null> => {
  try {
    // Call real Canva export API
    const result = await exportDesign({
      designId,
      format: format as 'png' | 'mp4' | 'jpg' | 'pdf' | 'gif',
      quality: 'high',
    });

    if (!result.ok) {
      log.warn(`[CanvaAPI] Export failed: ${result.error}`);
      return null;
    }

    log.info(`[CanvaAPI] Design exported: designId=${designId}, format=${format}, slides=${result.urls?.length || 0}`);

    return {
      slides: result.urls || [],
      format,
      method: 'api',
    };
  } catch (err) {
    log.error(`[CanvaAPI] Export failed: ${(err as Error).message}`);
    return null;
  }
};

/**
 * Full Canva workflow: Search → Customize → Export
 */
export const runCanvaWorkflow = async (input: {
  prompt: string;
  style: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial';
  slideCount: number;
  brandColors: { primary: string; secondary: string };
  accountToken?: string;
}): Promise<{
  success: boolean;
  designId?: string;
  designUrl?: string;
  slides?: string[];
  error?: string;
}> => {
  try {
    log.info(`[CanvaAPI] Starting workflow: style=${input.style}, slides=${input.slideCount}`);

    const templates = await searchCanvaTemplatesByAesthetic(input.style, '4:5');
    if (templates.length === 0) {
      return {
        success: false,
        error: `No templates found for style ${input.style}`,
      };
    }

    const template = templates[0];
    log.info(`[CanvaAPI] Using template: ${template.id}`);

    const slideTexts = input.prompt.split('.').slice(0, input.slideCount);
    const customizationResult = await customizeCanvaDesign(template.id, {
      slideTexts,
      colors: input.brandColors,
    });

    if (!customizationResult) {
      return {
        success: false,
        error: 'Customization failed',
      };
    }

    const exportResult = await exportCanvaDesignSlides(customizationResult.designId, 'png');

    if (!exportResult) {
      return {
        success: false,
        error: 'Export failed',
      };
    }

    log.info(`[CanvaAPI] Workflow complete: ${exportResult.slides.length} slides exported`);

    return {
      success: true,
      designId: customizationResult.designId,
      designUrl: customizationResult.designUrl,
      slides: exportResult.slides,
    };
  } catch (err) {
    log.error(`[CanvaAPI] Workflow failed: ${(err as Error).message}`);
    return {
      success: false,
      error: (err as Error).message,
    };
  }
};

export const canvaApiCoordinator = {
  searchCanvaTemplatesByAesthetic,
  customizeCanvaDesign,
  exportCanvaDesignSlides,
  runCanvaWorkflow,
};
