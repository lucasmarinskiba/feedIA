/**
 * Resolution & Quality Engine
 * Guarantees ALL FeedIA content hits maximum resolution Instagram/TikTok allow
 * No compression artifacts, no quality loss, correct aspect ratio + bitrate per format
 */

import { log } from '../agent/logger.js';

interface ResolutionSpec {
  platform: 'instagram' | 'tiktok';
  format: string;
  width: number;
  height: number;
  aspectRatio: string;
  minBitrateKbps: number;
  recommendedBitrateKbps: number;
  maxFileSizeMB: number;
  frameRate: number | null; // null for images
  colorSpace: string;
  exportFormat: string;
  notes: string;
}

interface QualityCheckResult {
  passed: boolean;
  targetSpec: ResolutionSpec;
  issues: string[];
  recommendations: string[];
  upscaleNeeded: boolean;
}

class ResolutionQualityEngine {
  // Maximum quality specs Instagram/TikTok actually support (as of platform limits)
  private readonly SPECS: ResolutionSpec[] = [
    // INSTAGRAM
    {
      platform: 'instagram',
      format: 'feed-square',
      width: 1080,
      height: 1080,
      aspectRatio: '1:1',
      minBitrateKbps: 3500,
      recommendedBitrateKbps: 5000,
      maxFileSizeMB: 100,
      frameRate: 30,
      colorSpace: 'sRGB',
      exportFormat: 'JPEG (image) / MP4 H.264 (video)',
      notes: 'Instagram compresses on upload — export at max spec to survive compression',
    },
    {
      platform: 'instagram',
      format: 'feed-carousel-portrait',
      width: 1080,
      height: 1350,
      aspectRatio: '4:5',
      minBitrateKbps: 3500,
      recommendedBitrateKbps: 5000,
      maxFileSizeMB: 100,
      frameRate: 30,
      colorSpace: 'sRGB',
      exportFormat: 'JPEG (image) / MP4 H.264 (video)',
      notes: 'Best carousel format — maximizes feed real estate. Recommended default.',
    },
    {
      platform: 'instagram',
      format: 'feed-landscape',
      width: 1080,
      height: 566,
      aspectRatio: '1.91:1',
      minBitrateKbps: 3500,
      recommendedBitrateKbps: 5000,
      maxFileSizeMB: 100,
      frameRate: 30,
      colorSpace: 'sRGB',
      exportFormat: 'JPEG (image) / MP4 H.264 (video)',
      notes: 'Max landscape ratio before IG crops. Avoid unless format demands.',
    },
    {
      platform: 'instagram',
      format: 'stories',
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      minBitrateKbps: 3500,
      recommendedBitrateKbps: 6000,
      maxFileSizeMB: 4000, // 4GB video limit
      frameRate: 30,
      colorSpace: 'sRGB',
      exportFormat: 'MP4 H.264, AAC audio',
      notes: 'Full vertical. Keep critical content in center 1080x1420 (safe zone from UI overlays)',
    },
    {
      platform: 'instagram',
      format: 'reels',
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      minBitrateKbps: 5000,
      recommendedBitrateKbps: 8000,
      maxFileSizeMB: 4000,
      frameRate: 30,
      colorSpace: 'sRGB',
      exportFormat: 'MP4 H.264, AAC audio 128kbps+',
      notes: 'Highest quality tier IG offers. Export 1080p minimum, prefer source at higher res then downscale.',
    },
    // TIKTOK
    {
      platform: 'tiktok',
      format: 'standard-vertical',
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      minBitrateKbps: 516,
      recommendedBitrateKbps: 10000,
      maxFileSizeMB: 287, // ~287MB for 10min limit at max bitrate
      frameRate: 30,
      colorSpace: 'sRGB',
      exportFormat: 'MP4 H.264 or H.265(HEVC), AAC audio',
      notes: 'TikTok re-compresses aggressively — export at HIGHEST bitrate to survive their pipeline',
    },
    {
      platform: 'tiktok',
      format: 'standard-vertical-hd',
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      minBitrateKbps: 8000,
      recommendedBitrateKbps: 16000,
      maxFileSizeMB: 287,
      frameRate: 60,
      colorSpace: 'sRGB',
      exportFormat: 'MP4 H.265(HEVC) preferred for higher quality-per-bitrate',
      notes: '60fps + higher bitrate for motion-heavy content (sports/action). Best quality tier.',
    },
    {
      platform: 'tiktok',
      format: 'photo-mode',
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      minBitrateKbps: 0,
      recommendedBitrateKbps: 0,
      maxFileSizeMB: 20,
      frameRate: null,
      colorSpace: 'sRGB',
      exportFormat: 'JPEG/PNG, max quality (100%)',
      notes: 'TikTok Photo Mode (carousel). Export lossless PNG then convert to max-quality JPEG.',
    },
  ];

  /**
   * Get spec for platform + format
   */
  getSpec(platform: 'instagram' | 'tiktok', format: string): ResolutionSpec | undefined {
    return this.SPECS.find(s => s.platform === platform && s.format === format);
  }

  /**
   * Get best (highest quality) spec for platform + content type
   */
  getBestSpec(platform: 'instagram' | 'tiktok', contentType: 'image' | 'video' | 'carousel'): ResolutionSpec {
    if (platform === 'instagram') {
      if (contentType === 'carousel' || contentType === 'image') {
        return this.getSpec('instagram', 'feed-carousel-portrait')!;
      }
      return this.getSpec('instagram', 'reels')!; // highest quality video tier
    } else {
      if (contentType === 'image' || contentType === 'carousel') {
        return this.getSpec('tiktok', 'photo-mode')!;
      }
      return this.getSpec('tiktok', 'standard-vertical-hd')!; // highest quality tier
    }
  }

  /**
   * Generate export/generation instructions to inject into content prompts
   * This forces the generation pipeline to target max quality, not default/lazy settings
   */
  generateQualityInstructions(platform: 'instagram' | 'tiktok', contentType: 'image' | 'video' | 'carousel'): string {
    const spec = this.getBestSpec(platform, contentType);

    return `
[RESOLUTION & QUALITY LOCK — ${platform.toUpperCase()} ${contentType.toUpperCase()}]
[CRITICAL] Never downgrade below these specs. Never let compression degrade output.

- Target resolution: ${spec.width}x${spec.height} (${spec.aspectRatio})
- Export format: ${spec.exportFormat}
${spec.frameRate ? `- Frame rate: ${spec.frameRate}fps` : ''}
${spec.recommendedBitrateKbps > 0 ? `- Bitrate: ${spec.recommendedBitrateKbps}kbps minimum (source quality — platform will compress on upload, so source must exceed platform minimum)` : '- Export at maximum quality (100%), zero additional compression'}
- Color space: ${spec.colorSpace}
- Max file size: ${spec.maxFileSizeMB}MB (stay under to avoid platform's own aggressive re-compression)

[RULES]
1. Generate/render at native resolution — never generate small then upscale (introduces blur/artifacts)
2. If source asset is lower resolution than target, use AI upscaling (ESRGAN/Real-ESRGAN) BEFORE export, never simple interpolation
3. Export without JPEG re-compression cycles — one clean export pass
4. ${spec.notes}
5. Verify final file dimensions EXACTLY match ${spec.width}x${spec.height} before delivery — no auto-crop surprises
`.trim();
  }

  /**
   * Validate an asset's specs against platform requirements
   */
  validateQuality(
    platform: 'instagram' | 'tiktok',
    contentType: 'image' | 'video' | 'carousel',
    actualWidth: number,
    actualHeight: number,
    actualBitrateKbps?: number,
    actualFileSizeMB?: number
  ): QualityCheckResult {
    const targetSpec = this.getBestSpec(platform, contentType);
    const issues: string[] = [];
    const recommendations: string[] = [];
    let upscaleNeeded = false;

    // Resolution check
    if (actualWidth < targetSpec.width || actualHeight < targetSpec.height) {
      issues.push(
        `Resolution ${actualWidth}x${actualHeight} below target ${targetSpec.width}x${targetSpec.height}`
      );
      recommendations.push('Apply AI upscaling (Real-ESRGAN) to reach target resolution before export');
      upscaleNeeded = true;
    }

    // Aspect ratio check
    const actualRatio = actualWidth / actualHeight;
    const targetRatio = targetSpec.width / targetSpec.height;
    if (Math.abs(actualRatio - targetRatio) > 0.02) {
      issues.push(`Aspect ratio mismatch: ${actualRatio.toFixed(3)} vs target ${targetRatio.toFixed(3)}`);
      recommendations.push(`Recrop/reframe to exact ${targetSpec.aspectRatio} — avoid platform auto-crop`);
    }

    // Bitrate check (video only)
    if (targetSpec.frameRate && actualBitrateKbps !== undefined) {
      if (actualBitrateKbps < targetSpec.minBitrateKbps) {
        issues.push(`Bitrate ${actualBitrateKbps}kbps below minimum ${targetSpec.minBitrateKbps}kbps`);
        recommendations.push(`Re-export at ${targetSpec.recommendedBitrateKbps}kbps to survive platform compression`);
      }
    }

    // File size check
    if (actualFileSizeMB !== undefined && actualFileSizeMB > targetSpec.maxFileSizeMB) {
      issues.push(`File size ${actualFileSizeMB}MB exceeds platform max ${targetSpec.maxFileSizeMB}MB`);
      recommendations.push('Reduce via smarter bitrate allocation, not resolution downscale');
    }

    const passed = issues.length === 0;

    log.info('[ResolutionQuality] Validation complete', {
      platform,
      contentType,
      passed,
      issueCount: issues.length,
      upscaleNeeded,
    });

    return {
      passed,
      targetSpec,
      issues,
      recommendations,
      upscaleNeeded,
    };
  }

  /**
   * Get all specs for a platform (reference table)
   */
  getAllSpecsForPlatform(platform: 'instagram' | 'tiktok'): ResolutionSpec[] {
    return this.SPECS.filter(s => s.platform === platform);
  }

  /**
   * Get upscale recommendation
   */
  getUpscaleStrategy(currentWidth: number, currentHeight: number, targetWidth: number, targetHeight: number): Record<string, any> {
    const scaleFactor = Math.max(targetWidth / currentWidth, targetHeight / currentHeight);

    let method = 'standard-upscale';
    if (scaleFactor > 4) method = 'multi-pass-ai-upscale';
    else if (scaleFactor > 2) method = 'ai-upscale-single-pass';
    else if (scaleFactor > 1) method = 'ai-upscale-light';
    else method = 'no-upscale-needed';

    return {
      scaleFactor: Math.round(scaleFactor * 100) / 100,
      method,
      tool: 'Real-ESRGAN or GFPGAN (for faces — pairs with facial-identity-preservation.ts to avoid feature drift during upscale)',
      warning: scaleFactor > 4 ? 'Extreme upscale — quality ceiling limited, consider regenerating at higher native resolution instead' : null,
    };
  }
}

export const resolutionQualityEngine = new ResolutionQualityEngine();
