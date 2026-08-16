/**
 * Platform-Native Output Service
 * Format content → platform specs (dimensions, safe zones, metadata, scheduling)
 */

export interface ContentMetadata {
  format: 'carousel' | 'reel' | 'story' | 'static';
  platform: 'instagram' | 'tiktok' | 'pinterest';
  title?: string;
  description?: string;
  hashtags?: string[];
  callToAction?: string;
  postingTime?: string;
}

export interface PlatformSpec {
  name: string;
  format: string;
  imageWidth: number;
  imageHeight: number;
  aspectRatio: string;
  safeTitleZone: { x: number; y: number; width: number; height: number };
  maxTextLength: number;
  videoMaxLength?: number;
  fps?: number;
  colorProfile: string;
  compressionLevel: 'low' | 'medium' | 'high';
}

export interface FormattedOutput {
  platform: string;
  format: string;
  specs: PlatformSpec;
  metadata: ContentMetadata;
  exportPaths: {
    image?: string;
    video?: string;
    thumbnail?: string;
  };
  scheduling: {
    recommendedPostTime: string;
    bestDayOfWeek: string;
    bestHour: number;
  };
  warnings: string[];
}

// Platform-specific specifications
const PLATFORM_SPECS: Record<string, Record<string, PlatformSpec>> = {
  instagram: {
    carousel: {
      name: 'Instagram Carousel',
      format: 'carousel',
      imageWidth: 1080,
      imageHeight: 1350,
      aspectRatio: '4:5',
      safeTitleZone: { x: 40, y: 100, width: 1000, height: 250 },
      maxTextLength: 2200,
      colorProfile: 'sRGB',
      compressionLevel: 'medium',
    },
    reel: {
      name: 'Instagram Reel',
      format: 'reel',
      imageWidth: 1080,
      imageHeight: 1920,
      aspectRatio: '9:16',
      safeTitleZone: { x: 40, y: 200, width: 1000, height: 300 },
      maxTextLength: 2200,
      videoMaxLength: 90,
      fps: 30,
      colorProfile: 'sRGB',
      compressionLevel: 'medium',
    },
    story: {
      name: 'Instagram Story',
      format: 'story',
      imageWidth: 1080,
      imageHeight: 1920,
      aspectRatio: '9:16',
      safeTitleZone: { x: 60, y: 250, width: 960, height: 250 },
      maxTextLength: 500,
      videoMaxLength: 15,
      fps: 24,
      colorProfile: 'sRGB',
      compressionLevel: 'high',
    },
    static: {
      name: 'Instagram Feed Post',
      format: 'static',
      imageWidth: 1080,
      imageHeight: 1080,
      aspectRatio: '1:1',
      safeTitleZone: { x: 40, y: 200, width: 1000, height: 300 },
      maxTextLength: 2200,
      colorProfile: 'sRGB',
      compressionLevel: 'medium',
    },
  },
  tiktok: {
    reel: {
      name: 'TikTok Video',
      format: 'reel',
      imageWidth: 1080,
      imageHeight: 1920,
      aspectRatio: '9:16',
      safeTitleZone: { x: 60, y: 300, width: 960, height: 400 },
      maxTextLength: 150,
      videoMaxLength: 600,
      fps: 24,
      colorProfile: 'sRGB',
      compressionLevel: 'medium',
    },
    carousel: {
      name: 'TikTok Slideshow',
      format: 'carousel',
      imageWidth: 1080,
      imageHeight: 1920,
      aspectRatio: '9:16',
      safeTitleZone: { x: 60, y: 300, width: 960, height: 400 },
      maxTextLength: 300,
      videoMaxLength: 60,
      fps: 24,
      colorProfile: 'sRGB',
      compressionLevel: 'medium',
    },
    story: {
      name: 'TikTok Story',
      format: 'story',
      imageWidth: 1080,
      imageHeight: 1920,
      aspectRatio: '9:16',
      safeTitleZone: { x: 60, y: 300, width: 960, height: 400 },
      maxTextLength: 150,
      videoMaxLength: 15,
      fps: 24,
      colorProfile: 'sRGB',
      compressionLevel: 'medium',
    },
  },
  pinterest: {
    carousel: {
      name: 'Pinterest Carousel',
      format: 'carousel',
      imageWidth: 1000,
      imageHeight: 1500,
      aspectRatio: '2:3',
      safeTitleZone: { x: 50, y: 150, width: 900, height: 300 },
      maxTextLength: 500,
      colorProfile: 'sRGB',
      compressionLevel: 'low',
    },
    static: {
      name: 'Pinterest Pin',
      format: 'static',
      imageWidth: 1000,
      imageHeight: 1500,
      aspectRatio: '2:3',
      safeTitleZone: { x: 50, y: 150, width: 900, height: 300 },
      maxTextLength: 500,
      colorProfile: 'sRGB',
      compressionLevel: 'low',
    },
    reel: {
      name: 'Pinterest Idea Pin',
      format: 'reel',
      imageWidth: 1000,
      imageHeight: 1500,
      aspectRatio: '2:3',
      safeTitleZone: { x: 50, y: 150, width: 900, height: 300 },
      maxTextLength: 300,
      videoMaxLength: 60,
      fps: 24,
      colorProfile: 'sRGB',
      compressionLevel: 'low',
    },
  },
};

// Scheduling recommendations by platform
const SCHEDULING_RULES: Record<
  string,
  { bestDays: string[]; bestHours: number[]; postingGap: number }
> = {
  instagram: { bestDays: ['Tuesday', 'Wednesday', 'Thursday'], bestHours: [6, 11, 19], postingGap: 24 },
  tiktok: { bestDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'], bestHours: [6, 9, 19, 21], postingGap: 4 },
  pinterest: { bestDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'], bestHours: [8, 14, 20], postingGap: 72 },
};

export const formatForPlatform = (
  metadata: ContentMetadata
): FormattedOutput => {
  const platformData = PLATFORM_SPECS[metadata.platform];
  if (!platformData) {
    throw new Error(`Unsupported platform: ${metadata.platform}`);
  }

  const spec = platformData[metadata.format];
  if (!spec) {
    throw new Error(`Unsupported format ${metadata.format} for platform ${metadata.platform}`);
  }

  // Validate content
  const warnings: string[] = [];

  if (metadata.description && metadata.description.length > spec.maxTextLength) {
    warnings.push(
      `Description too long (${metadata.description.length}/${spec.maxTextLength} chars). Will be truncated.`
    );
  }

  if (metadata.format === 'reel' && metadata.description && metadata.description.length > 150) {
    warnings.push('Reels with long captions may have lower engagement. Consider shortening.');
  }

  if (!metadata.hashtags || metadata.hashtags.length === 0) {
    warnings.push('No hashtags specified. Add 5-10 relevant hashtags for discovery.');
  }

  if (metadata.hashtags && metadata.hashtags.length > 30) {
    warnings.push('Too many hashtags (>30). Consider reducing to 10-20 for better engagement.');
  }

  // Determine scheduling
  const schedRules = SCHEDULING_RULES[metadata.platform]!;
  const randomBestHour = schedRules.bestHours[Math.floor(Math.random() * schedRules.bestHours.length)]!;
  const randomBestDay = schedRules.bestDays[Math.floor(Math.random() * schedRules.bestDays.length)]!;

  // Generate posting time recommendation
  const nextPostTime = generatePostingTime(randomBestDay, randomBestHour);

  return {
    platform: metadata.platform,
    format: metadata.format,
    specs: spec,
    metadata,
    exportPaths: {
      image: `/exports/${metadata.platform}-${metadata.format}-${Date.now()}.png`,
      thumbnail: `/exports/${metadata.platform}-${metadata.format}-${Date.now()}-thumb.png`,
    },
    scheduling: {
      recommendedPostTime: nextPostTime,
      bestDayOfWeek: randomBestDay,
      bestHour: randomBestHour,
    },
    warnings,
  };
};

export const validateContent = (metadata: ContentMetadata): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!metadata.format || !['carousel', 'reel', 'story', 'static'].includes(metadata.format)) {
    errors.push('Invalid format');
  }

  if (!metadata.platform || !['instagram', 'tiktok', 'pinterest'].includes(metadata.platform)) {
    errors.push('Invalid platform');
  }

  const spec = PLATFORM_SPECS[metadata.platform]?.[metadata.format];
  if (!spec) {
    errors.push(`Format ${metadata.format} not supported on ${metadata.platform}`);
  }

  if (!metadata.description || metadata.description.trim().length === 0) {
    errors.push('Description required');
  }

  if (metadata.hashtags && metadata.hashtags.length === 0) {
    errors.push('At least one hashtag recommended');
  }

  return { valid: errors.length === 0, errors };
};

export const optimizeForPlatform = (
  content: ContentMetadata
): ContentMetadata => {
  const optimized = { ...content };

  // Platform-specific optimizations
  if (content.platform === 'tiktok' && content.description && content.description.length > 150) {
    optimized.description = content.description.substring(0, 150);
  }

  if (content.platform === 'pinterest' && content.format === 'static') {
    // Pinterest favors vertical aspect ratio
    optimized.format = 'carousel';
  }

  // Remove irrelevant fields
  if (content.platform === 'pinterest' && content.format === 'reel') {
    optimized.callToAction = undefined;
  }

  return optimized;
};

// ============ HELPERS ============

const generatePostingTime = (dayOfWeek: string, hour: number): string => {
  const daysMap: Record<string, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 0,
  };

  const today = new Date();
  const targetDayNum = daysMap[dayOfWeek] ?? 1;
  const currentDayNum = today.getDay();
  const daysUntilTarget = (targetDayNum - currentDayNum + 7) % 7 || 7; // If 0, schedule for next week

  const postDate = new Date(today);
  postDate.setDate(postDate.getDate() + daysUntilTarget);
  postDate.setHours(hour, 0, 0, 0);

  return postDate.toISOString();
};
