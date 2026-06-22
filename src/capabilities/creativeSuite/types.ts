/**
 * Creative Suite types — design system, templates y motion graphics.
 */

export interface CampaignTheme {
  id: string;
  name: string;
  description: string;
  durationWeeks: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  mood: 'bold' | 'minimal' | 'warm' | 'premium' | 'playful';
  patterns?: string[];
  textures?: string[];
  forbiddenElements?: string[];
}

export interface DesignSystem {
  brandName: string;
  campaign?: CampaignTheme;
  grid: {
    columns: number;
    marginPx: number;
    gutterPx: number;
  };
  typography: {
    headingScale: number; // ratio entre headings y body
    maxFonts: number;
    minHeadlineRatio: number;
  };
  safeZones: {
    topPx: number;
    bottomPx: number;
    leftPx: number;
    rightPx: number;
  };
}

export interface TemplateSlot {
  id: string;
  type: 'text' | 'image' | 'shape' | 'icon';
  role?: 'headline' | 'body' | 'cta' | 'hashtag' | 'logo' | 'background';
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string; // relleno después de fillTemplate
  style?: {
    fontSize?: number;
    color?: string;
    align?: 'left' | 'center' | 'right';
    fontFamily?: string;
  };
}

export interface CreativeTemplate {
  id: string;
  name: string;
  format: 'carrusel' | 'reel' | 'story' | 'post';
  aspectRatio: '1:1' | '4:5' | '9:16';
  width: number;
  height: number;
  slots: TemplateSlot[];
  animation?: string; // Lottie animation id
}

export interface VisualQARealInput {
  imageUrl: string;
  format: 'carrusel' | 'reel' | 'story' | 'post';
  platform: 'instagram' | 'tiktok';
  brandName: string;
}

export interface VisualQARealResult {
  score: number;
  passed: boolean;
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    rule: string;
    message: string;
    suggestion: string;
  }>;
  insights: string[];
  dominantColors?: string[];
  textDetected?: string[];
}

export interface MotionGraphic {
  id: string;
  name: string;
  type: 'text_reveal' | 'zoom' | 'slide' | 'pulse' | 'typewriter';
  lottieUrl?: string;
  durationSec: number;
  params: Record<string, unknown>;
}
