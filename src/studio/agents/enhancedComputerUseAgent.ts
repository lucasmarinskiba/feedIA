import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Enhanced Computer Use Agent
 * Generates ultra-precise, detailed prompts for Computer Use operations
 * Improves accuracy + consistency across all tools
 */

export interface ComputerUsePromptRequest {
  tool: string;
  action: string;
  details: Record<string, unknown>;
  brand: BrandProfile;
}

export class EnhancedComputerUseAgent {
  /**
   * Generate high-precision Computer Use goal
   * Includes exact steps, visual references, error handling
   */
  generatePreciseGoal(request: ComputerUsePromptRequest): string {
    const { tool, action, details, brand } = request;

    let goal = this.buildToolGoal(tool, action, details, brand);

    // Add universal precision directives
    goal += `\n\n━━━ PRECISION REQUIREMENTS ━━━
EXACTNESS:
- Follow visual placement exactly as specified
- Verify element positions before confirming
- Check color accuracy (exact hex or RGB match)
- Ensure text is pixel-perfect aligned

BRAND ENFORCEMENT:
- Voice: ${brand.voice.tone}
- Mood: ${brand.visual.mood}
- Colors: ${brand.visual.palette.join(', ')}
- Forbidden words: ${brand.voice.forbidden.join(', ') || 'none'}
- Must not deviate from brand guidelines

ERROR DETECTION:
- If page loads incorrectly, take screenshot + analyze
- If element not found, scroll/search and try again
- If color doesn't apply, verify hex code is correct
- If text truncates, adjust font size down incrementally

SUCCESS VERIFICATION:
- Screenshot final result
- Verify all text is visible and readable
- Confirm colors match brand
- Check alignment matches specification
- Test on mobile preview if available`;

    return goal;
  }

  private buildToolGoal(tool: string, action: string, details: Record<string, unknown>, brand: BrandProfile): string {
    switch (tool) {
      case 'canva':
        return this.buildCanvaGoal(action, details, brand);
      case 'capcut':
        return this.buildCapCutGoal(action, details, brand);
      case 'instagram':
        return this.buildInstagramGoal(action, details, brand);
      case 'tiktok':
        return this.buildTikTokGoal(action, details, brand);
      default:
        return `Execute ${action} in ${tool}`;
    }
  }

  private buildCanvaGoal(action: string, details: Record<string, unknown>, brand: BrandProfile): string {
    if (action === 'create-design') {
      const headline = details.headline as string;
      const templateType = details.template_type as string;

      return `Create Canva design with EXACT specifications:

TEMPLATE SELECTION:
1. Open canva.com
2. Click "Create a design"
3. Search template type: "${templateType}"
4. Select FIRST professional result (highest rating)

HEADLINE PLACEMENT & STYLING:
- Text: "${headline}"
- Font: ${brand.visual.typography[0] || 'Montserrat'}
- Size: 72px (headline) - MUST be readable from thumbnail
- Color: ${brand.visual.palette[0]} (verify exact match)
- Position: TOP CENTER (20% from top)
- Alignment: CENTER
- Shadow: Yes, subtle (offset 2px, blur 8px, dark gray 40%)

BRAND COLORS APPLICATION:
- Background: ${brand.visual.palette[1] || 'white'} (if applicable)
- Accent elements: ${brand.visual.palette[2] || 'transparent'}
- Text secondary: ${brand.visual.palette[0]} (if needed)
- Verify: Colors match EXACTLY to brand palette

QUALITY ASSURANCE:
- Preview at multiple sizes (mobile, tablet, desktop)
- Verify text readable at thumbnail size (small)
- Check no text cuts off edges
- Confirm brand colors display correctly

EXPORT SETTINGS:
- Format: PNG (transparent background preferred)
- Resolution: Maximum quality
- Filename: design-${Date.now()}.png
- Download location: ~/Downloads`;
    }

    return `Create design in Canva: ${action}`;
  }

  private buildCapCutGoal(action: string, details: Record<string, unknown>, brand: BrandProfile): string {
    if (action === 'edit-video') {
      return `Edit video in CapCut with PRECISION:

VIDEO IMPORT:
1. Open CapCut
2. Import video: ${details.video_path as string}
3. Set canvas to: ${(details.format as string) || 'TikTok (1080x1920)'}

TEXT OVERLAY PLACEMENT:
- Position: SAFE AREA (80px margin all sides)
- Font: ${brand.visual.typography[0] || 'Arial Sans'}
- Size: 48px minimum (must be readable)
- Color: ${brand.visual.palette[0]} with white outline for contrast
- Duration: Match or exceed audio length
- Animation: Fade in/out (100ms each)

AUDIO SYNC:
- Use trending audio (latest in library)
- Sync audio to beat/rhythm
- Adjust audio volume to -6dB if too loud
- Add ambient audio fade at end (2s)

VISUAL EFFECTS:
- Add transitions between clips (100ms standard)
- No effects that distort brand colors
- Keep lighting consistent
- Avoid heavy filters (max 30% intensity)

EXPORT:
- Format: MP4 (H.264)
- Resolution: 1080x1920 (TikTok)
- Frame rate: 30fps
- Bitrate: High quality
- File: video-${Date.now()}.mp4 to ~/Downloads`;
    }

    return `Edit video in CapCut: ${action}`;
  }

  private buildInstagramGoal(action: string, details: Record<string, unknown>, brand: BrandProfile): string {
    if (action === 'post') {
      return `Post to Instagram with BRAND PRECISION:

POSTING FLOW:
1. Open instagram.com
2. Click CREATE (+ icon)
3. Upload: ${details.media_path as string}

CAPTION COMPOSITION:
Text: "${details.caption as string}"
Voice: ${brand.voice.tone}
Length: 150-300 characters (optimal engagement)
Include: ${details.hashtags as string[] | string}

POSITIONING & PREVIEW:
- Check preview on mobile (critical)
- Verify image crops correctly
- Confirm text is visible if overlaid
- Test hashtags link correctly

POSTING:
- Set: PUBLIC (unless specified private)
- Add location: ${(details.location as string) || 'brand location'}
- Disable comments: NO (encourage engagement)
- Share to story: NO
- Click SHARE`;
    }

    return `Post to Instagram: ${action}`;
  }

  private buildTikTokGoal(action: string, details: Record<string, unknown>, brand: BrandProfile): string {
    if (action === 'post') {
      return `Post to TikTok with VIRAL OPTIMIZATION:

UPLOAD FLOW:
1. Open tiktok.com
2. Click CREATE (+)
3. Upload video: ${details.video_path as string}

CAPTION + HASHTAGS:
Caption: "${details.caption as string}"
Hashtags: ${(details.hashtags as string[]).join(' ')}
Strategy: Lead with hook, use trending tags (5-8 total)

VISUAL PREVIEW:
- Watch full preview (critical for timing)
- Verify audio levels aren't distorted
- Check text/elements display correctly
- Confirm colors match brand

OPTIMIZATION:
- Cover image: First frame (must be engaging)
- Description: Clear, concise, action-oriented
- Visibility: PUBLIC (for maximum reach)
- Allow duets: YES (encourage remixes)
- Allow comments: YES (build community)
- Allow stitches: YES

POSTING:
- Click POST
- Verify upload completed
- Share to other platforms: NO
- Get video URL after posting`;
    }

    return `Post to TikTok: ${action}`;
  }
}

export const enhancedComputerUseAgent = new EnhancedComputerUseAgent();
