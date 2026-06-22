import { log } from '../../agent/logger.js';
import { executeWithRecovery } from './reliableSession.js';
import { fileMonitor } from './fileMonitor.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Advanced Canva Computer Use Controller
 * Intelligent template selection, text editing, brand application, export detection
 */

export interface CanvaDesignRequest {
  templateType: 'carousel' | 'reel-cover' | 'story' | 'feed' | 'thumbnail';
  headline: string;
  subheadline?: string;
  brandColors: string[];
  imageUrl?: string;
  callToAction?: string;
}

export const createCanvaDesign = async (
  brand: BrandProfile,
  request: CanvaDesignRequest,
): Promise<{ ok: boolean; designUrl?: string; filePath?: string; durationMs: number }> => {
  const startMs = Date.now();

  const goal = `Create Canva design for @${brand.name}:

STEP 1: TEMPLATE SELECTION
- Go to canva.com
- Click "Create a design"
- Search: "${request.templateType}"
- Select professional template (first or highest-rated)

STEP 2: HEADLINE + SUBHEADLINE
- Click text "Headline" → replace with: "${request.headline}"
- Click text "Subheadline" → replace with: "${request.subheadline || 'Supporting text'}"
- Font: Sans-serif, size: large + readable
- Alignment: center or strategic placement

STEP 3: BRAND COLORS & STYLING
- Select all text → apply color: ${request.brandColors[0]}
- Background: apply color: ${request.brandColors[1] || request.brandColors[0]}
- Accent elements: color: ${request.brandColors[2] || 'white'}
- Mood/feeling: ${brand.visual.mood}

STEP 4: IMAGE INSERTION
${request.imageUrl ? `- Click "Upload images" → paste URL or select: ${request.imageUrl}` : '- Skip image insertion'}
- Position: focal point, maintain aspect ratio
- Brightness/contrast: adjust for brand consistency

STEP 5: CALL-TO-ACTION
${request.callToAction ? `- Add text: "${request.callToAction}"` : ''}
- Style: bold, contrasting color
- Position: bottom or strategic placement

STEP 6: QUALITY CHECK
- Preview on multiple devices (mobile + desktop)
- Check text readability
- Validate brand colors match brand guide
- Ensure dimensions correct for ${request.templateType}

STEP 7: EXPORT
- Click "Share" or "Download"
- Format: PNG (transparent background) or JPG (opaque)
- Download to: ~/Downloads
- Filename: design-${Date.now()}.png

BRAND GUIDELINES:
- Voice: ${brand.voice.tone}
- Visual mood: ${brand.visual.mood}
- Colors: ${brand.visual.palette.join(', ')}
- NO forbidden words: ${brand.voice.forbidden.join(', ') || 'none'}`;

  try {
    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 20,
      operationName: `Canva ${request.templateType} design`,
      maxRetries: 2,
    });

    if (!result.ok) {
      return { ok: false, durationMs: Date.now() - startMs };
    }

    // Detect downloaded file
    const downloadPath = await fileMonitor.findRecentDownload('design-*.png', undefined, 5);

    // Extract design URL if mentioned in summary
    const designUrl = result.summary.match(/canva\.com\/design\/([^\s/]+)/)?.[1];

    return {
      ok: true,
      designUrl: designUrl ? `https://canva.com/design/${designUrl}` : undefined,
      filePath: downloadPath,
      durationMs: Date.now() - startMs,
    };
  } catch (error) {
    log.error(`[CanvaComputerUse] Failed: ${error}`);
    return { ok: false, durationMs: Date.now() - startMs };
  }
};

/**
 * Batch create multiple Canva designs
 * Intelligent template selection + parallel creation
 */
export const batchCreateCanvaDesigns = async (
  brand: BrandProfile,
  designs: CanvaDesignRequest[],
): Promise<{ ok: boolean; results: Array<{ design: string; url?: string; path?: string }>; durationMs: number }> => {
  const startMs = Date.now();
  const results: Array<{ design: string; url?: string; path?: string }> = [];

  for (const design of designs) {
    try {
      const result = await createCanvaDesign(brand, design);
      results.push({
        design: design.headline,
        url: result.designUrl,
        path: result.filePath,
      });
    } catch (error) {
      log.warn(`[CanvaBatch] Design failed: ${design.headline}`);
      results.push({ design: design.headline });
    }
  }

  return {
    ok: results.every((r) => r.url || r.path),
    results,
    durationMs: Date.now() - startMs,
  };
};

/**
 * Edit existing Canva design
 * Text updates, color changes, image swaps
 */
export const editCanvaDesign = async (
  brand: BrandProfile,
  designUrl: string,
  edits: {
    headline?: string;
    subheadline?: string;
    imageUrl?: string;
    colors?: string[];
  },
): Promise<{ ok: boolean; durationMs: number }> => {
  const startMs = Date.now();

  const goal = `Edit Canva design: ${designUrl}

EDITS TO MAKE:
${edits.headline ? `- Headline: Replace with "${edits.headline}"` : ''}
${edits.subheadline ? `- Subheadline: Replace with "${edits.subheadline}"` : ''}
${edits.imageUrl ? `- Image: Replace with ${edits.imageUrl}` : ''}
${edits.colors ? `- Colors: Apply ${edits.colors.join(', ')}` : ''}

PROCEDURE:
1. Open design URL in Canva
2. Click each element to select
3. Make edits (text, colors, images)
4. Save/auto-save
5. Close editor

Quality: Maintain brand consistency (${brand.visual.mood})`;

  try {
    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 15,
      operationName: 'Canva design edit',
      maxRetries: 2,
    });

    return { ok: result.ok, durationMs: Date.now() - startMs };
  } catch (error) {
    return { ok: false, durationMs: Date.now() - startMs };
  }
};

/**
 * Apply brand kit to Canva design
 * Auto-apply colors, fonts, logos
 */
export const applyCanvaBrandKit = async (
  brand: BrandProfile,
  designUrl: string,
): Promise<{ ok: boolean; durationMs: number }> => {
  const startMs = Date.now();

  const goal = `Apply brand kit to Canva design:

BRAND KIT APPLICATION:
1. Open ${designUrl}
2. Click "Brand kit" or "Brand" button
3. Select or create brand kit
4. Add brand details:
   - Primary color: ${brand.visual.palette[0]}
   - Secondary color: ${brand.visual.palette[1] || brand.visual.palette[0]}
   - Typography: ${brand.visual.typography[0] || 'Sans-serif'}
   - Fonts: Sans-serif preferred
5. Apply to all elements
6. Auto-replace colors matching theme
7. Save design

Brand voice to maintain: ${brand.voice.tone}
Mood: ${brand.visual.mood}`;

  try {
    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 16,
      operationName: 'Canva brand kit application',
      maxRetries: 2,
    });

    return { ok: result.ok, durationMs: Date.now() - startMs };
  } catch (error) {
    return { ok: false, durationMs: Date.now() - startMs };
  }
};

/**
 * Extract design elements for repurposing
 * Crops, variations, quote cards, etc.
 */
export const extractCanvaElements = async (
  brand: BrandProfile,
  designUrl: string,
  elementTypes: ('crop' | 'quote' | 'thumbnail' | 'card')[],
): Promise<{ ok: boolean; filePaths?: string[]; durationMs: number }> => {
  const startMs = Date.now();

  const goal = `Extract Canva design elements:

DESIGN URL: ${designUrl}

ELEMENTS TO EXTRACT:
${elementTypes.includes('crop') ? '- Crop main image (square for IG feed)' : ''}
${elementTypes.includes('quote') ? '- Extract quote card (text + background)' : ''}
${elementTypes.includes('thumbnail') ? '- Create thumbnail (16:9)' : ''}
${elementTypes.includes('card') ? '- Create card variation (carousel slide)' : ''}

WORKFLOW:
1. Open design in Canva
2. For each element type:
   a. Duplicate slide/design
   b. Delete unwanted elements
   c. Crop/resize as needed
   d. Export as PNG
   e. Download to ~/Downloads
3. Name files: design-${elementTypes[0]}-${Date.now()}.png

Maintain: Brand colors (${brand.visual.palette.join(', ')}) + tone (${brand.voice.tone})`;

  try {
    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 18,
      operationName: 'Canva element extraction',
      maxRetries: 2,
    });

    if (!result.ok) {
      return { ok: false, durationMs: Date.now() - startMs };
    }

    // Detect multiple downloaded files
    const filePaths: string[] = [];
    for (const type of elementTypes) {
      const path = await fileMonitor.findRecentDownload(`design-${type}-*.png`, undefined, 5);
      if (path) filePaths.push(path);
    }

    return { ok: true, filePaths, durationMs: Date.now() - startMs };
  } catch (error) {
    return { ok: false, durationMs: Date.now() - startMs };
  }
};

/**
 * Smart template suggestion for Canva
 * Based on content type + brand profile
 */
export const suggestCanvaTemplate = (brand: BrandProfile, contentType: string): string => {
  const suggestions: Record<string, Record<string, string>> = {
    carousel: {
      default: 'Modern carousel',
      educational: 'Step-by-step carousel',
      promotional: 'Product showcase carousel',
      testimonial: 'Quote carousel',
    },
    reel: {
      default: 'Trending reel template',
      tutorial: 'How-to reel',
      viral: 'Hook-focused reel',
      behind_scenes: 'Casual reel',
    },
    story: {
      default: 'Instagram story template',
      announcement: 'Bold announcement story',
      poll: 'Interactive story',
      countdown: 'Countdown story',
    },
  };

  return suggestions[contentType]?.['default'] || 'Professional template';
};
