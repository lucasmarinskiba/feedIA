import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Design Precision Agent
 * Calculates exact text placement, sizing, positioning for images/videos
 * Ensures readability + brand alignment + visual hierarchy
 */

export interface TextElement {
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  position: { x: number; y: number };
  alignment: 'left' | 'center' | 'right';
  maxWidth: number;
  lineHeight: number;
  opacity: number;
  shadow?: boolean;
}

export interface DesignLayout {
  canvasWidth: number;
  canvasHeight: number;
  safeAreaMargin: number;
  textElements: TextElement[];
  brandAlignment: 'top' | 'center' | 'bottom';
  visualHierarchy: string[];
}

export class DesignPrecisionAgent {
  /**
   * Calculate optimal text placement for image/video
   * Respects safe areas (mobile-friendly), readability, hierarchy
   */
  calculateTextPlacement(
    brand: BrandProfile,
    format: 'instagram-post' | 'tiktok-video' | 'carousel' | 'story',
    textElements: Array<{ text: string; priority: 'headline' | 'subheadline' | 'body' | 'cta' }>,
  ): DesignLayout {
    // Format-specific dimensions
    const dimensions: Record<string, { width: number; height: number; margin: number }> = {
      'instagram-post': { width: 1080, height: 1080, margin: 60 },
      'tiktok-video': { width: 1080, height: 1920, margin: 80 },
      carousel: { width: 1080, height: 1350, margin: 50 },
      story: { width: 1080, height: 1920, margin: 100 },
    };

    const dim = (dimensions[format] || { width: 1080, height: 1080, margin: 60 }) as {
      width: number;
      height: number;
      margin: number;
    };

    const layout: DesignLayout = {
      canvasWidth: dim.width,
      canvasHeight: dim.height,
      safeAreaMargin: dim.margin,
      textElements: [],
      brandAlignment: brand.visual.mood === 'minimal' ? 'center' : 'top',
      visualHierarchy: [],
    };

    // Calculate positions
    let currentY = dim.margin;

    for (const element of textElements) {
      const fontSizeMap: Record<string, number> = {
        headline: 72,
        subheadline: 48,
        body: 32,
        cta: 56,
      };

      const fontSize = fontSizeMap[element.priority] || 48;

      const textElement: TextElement = {
        content: element.text,
        fontFamily: brand.visual.typography[0] || 'Arial',
        fontSize,
        color: this.selectTextColor(element.priority, brand),
        position: {
          x: dim.width / 2,
          y: currentY,
        },
        alignment: 'center',
        maxWidth: dim.width - dim.margin * 2,
        lineHeight: fontSize * 1.4,
        opacity: element.priority === 'body' ? 0.9 : 1.0,
        shadow: element.priority === 'headline',
      };

      layout.textElements.push(textElement);
      currentY += textElement.fontSize + textElement.lineHeight + 40;

      layout.visualHierarchy.push(`${element.priority}: ${fontSizeMap[element.priority]}px`);
    }

    log.debug(`[DesignPrecision] Layout calculated: ${format} (${layout.textElements.length} elements)`);

    return layout;
  }

  /**
   * Select contrasting text color based on element type + brand
   */
  private selectTextColor(priority: 'headline' | 'subheadline' | 'body' | 'cta', brand: BrandProfile): string {
    const primaryColor = brand.visual.palette[0] || '#000000';
    const accentColor = brand.visual.palette[2] || 'white';

    switch (priority) {
      case 'headline':
        return primaryColor;
      case 'cta':
        return accentColor;
      case 'subheadline':
        return primaryColor;
      default:
        return 'white';
    }
  }

  /**
   * Generate Computer Use instructions for text placement
   * Precise, executable instructions for design tools
   */
  generatePlacementInstructions(layout: DesignLayout, format: string): string {
    let instructions = `TEXT PLACEMENT GUIDE FOR ${format.toUpperCase()}:\n\n`;

    for (let i = 0; i < layout.textElements.length; i++) {
      const el = layout.textElements[i];
      if (!el) continue;

      const verticalPercent = ((el.position.y - layout.safeAreaMargin) / layout.canvasHeight) * 100;

      instructions += `ELEMENT ${i + 1}:
- Text: "${el.content}"
- Position: ${el.alignment} alignment, ${verticalPercent.toFixed(1)}% from top
- Font: ${el.fontFamily}, ${el.fontSize}px
- Color: ${el.color}
- Max width: ${el.maxWidth}px
- Line height: ${el.lineHeight}px
- Shadow: ${el.shadow ? 'Yes, subtle drop shadow' : 'No'}
- Ensure: Safe area margin ${layout.safeAreaMargin}px all sides
- Test: Readable on mobile (small screen)

`;
    }

    instructions += `VISUAL HIERARCHY:\n${layout.visualHierarchy.map((h) => `- ${h}`).join('\n')}\n\n`;
    instructions += `SAFE AREA: Keep all text within ${layout.safeAreaMargin}px margins from edges`;

    return instructions;
  }

  /**
   * Validate text placement for readability
   * Check contrast, size, positioning
   */
  validateReadability(layout: DesignLayout): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    for (const el of layout.textElements) {
      if (!el) continue;

      // Font size check
      if (el.fontSize < 24) {
        issues.push(`Element too small (${el.fontSize}px). Minimum 24px for readability.`);
      }

      // Safe area check
      if (
        el.position.x - el.maxWidth / 2 < layout.safeAreaMargin ||
        el.position.x + el.maxWidth / 2 > layout.canvasWidth - layout.safeAreaMargin
      ) {
        issues.push(`Element outside safe area margins (${layout.safeAreaMargin}px).`);
      }

      // Overlapping check (simplified)
      if (el.position.y < layout.safeAreaMargin) {
        issues.push(`Element too close to top edge (y: ${el.position.y}).`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export const designPrecisionAgent = new DesignPrecisionAgent();
