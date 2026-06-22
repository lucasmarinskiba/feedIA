/**
 * Campaign Design System — define y aplica un sistema de diseño coherente
 * para todas las piezas de una campaña, reemplazando el trabajo manual de
 * comunicador visual / diseñador gráfico.
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import type { CampaignTheme, DesignSystem } from './types.js';

export const CAMPAIGN_MOODS: CampaignTheme['mood'][] = ['bold', 'minimal', 'warm', 'premium', 'playful'];

export const detectCampaignMood = (brand: BrandProfile): CampaignTheme['mood'] => {
  const style = brand.visual?.style?.toLowerCase() ?? '';
  if (style.includes('premium') || style.includes('luxury') || style.includes('elegant')) return 'premium';
  if (style.includes('minimal') || style.includes('clean') || style.includes('simple')) return 'minimal';
  if (style.includes('warm') || style.includes('human') || style.includes('soft')) return 'warm';
  if (style.includes('playful') || style.includes('fun') || style.includes('bold-color')) return 'playful';
  return 'bold';
};

export const buildCampaignTheme = (
  brand: BrandProfile,
  campaignName: string,
  mood: CampaignTheme['mood'] = 'bold',
): CampaignTheme => {
  const palette = brand.visual?.palette ?? [];
  const primary = palette[0] ?? '#FF0055';
  const secondary = palette[1] ?? '#000000';

  const palettes: Record<CampaignTheme['mood'], CampaignTheme['colors']> = {
    bold: {
      primary,
      secondary,
      accent: '#FFD700',
      background: '#FFFFFF',
      text: '#111111',
    },
    minimal: {
      primary: primary ?? '#111111',
      secondary: '#F5F5F5',
      accent: '#888888',
      background: '#FAFAFA',
      text: '#222222',
    },
    warm: {
      primary: primary ?? '#E85D04',
      secondary: '#FAA307',
      accent: '#F48C06',
      background: '#FFF3E0',
      text: '#3E2723',
    },
    premium: {
      primary: primary ?? '#0A0A0A',
      secondary: '#C0A062',
      accent: '#FFFFFF',
      background: '#121212',
      text: '#F5F5F5',
    },
    playful: {
      primary: primary ?? '#7209B7',
      secondary: '#4CC9F0',
      accent: '#F72585',
      background: '#FEF7FF',
      text: '#1A1A2E',
    },
  };

  return {
    id: `campaign-${Date.now()}`,
    name: campaignName,
    description: `Campaña "${campaignName}" con mood ${mood} para ${brand.name}`,
    durationWeeks: 4,
    colors: palettes[mood],
    fonts: {
      heading: brand.visual?.typography?.[0] ?? 'Inter',
      body: brand.visual?.typography?.[1] ?? brand.visual?.typography?.[0] ?? 'Inter',
    },
    mood,
    patterns: mood === 'bold' ? ['diagonal-stripes'] : mood === 'premium' ? ['subtle-gradient'] : [],
    textures: mood === 'warm' ? ['paper-grain'] : [],
    forbiddenElements: ['clipart', 'comic-sans', 'low-res-stock'],
  };
};

export const buildDesignSystem = (brand: BrandProfile, campaign?: CampaignTheme): DesignSystem => {
  const theme = campaign ?? buildCampaignTheme(brand, 'default', 'bold');

  return {
    brandName: brand.name,
    campaign: theme,
    grid: {
      columns: 4,
      marginPx: 40,
      gutterPx: 24,
    },
    typography: {
      headingScale: 1.618,
      maxFonts: 2,
      minHeadlineRatio: 1.6,
    },
    safeZones: {
      topPx: 60,
      bottomPx: 60,
      leftPx: 60,
      rightPx: 60,
    },
  };
};

export const applyDesignSystemToTemplate = (
  system: DesignSystem,
  slots: Array<{ role?: string; style?: Record<string, unknown> }>,
): void => {
  if (!system.campaign) return;

  for (const slot of slots) {
    if (!slot.style) slot.style = {};
    if (slot.role === 'headline' || slot.role === 'cta') {
      slot.style.color = system.campaign.colors.primary;
      slot.style.fontFamily = system.campaign.fonts.heading;
    } else if (slot.role === 'body') {
      slot.style.color = system.campaign.colors.text;
      slot.style.fontFamily = system.campaign.fonts.body;
    }
  }

  log.info(`[CampaignDesignSystem] Applied theme "${system.campaign.name}" to ${slots.length} slots`);
};

export const validateDesignSystem = (system: DesignSystem): string[] => {
  const issues: string[] = [];
  if (!system.campaign) {
    issues.push('No campaign theme defined');
    return issues;
  }
  if (system.campaign.mood === 'premium' && system.campaign.colors.background === '#FFFFFF') {
    issues.push('Premium mood should use dark background');
  }
  if (system.typography.maxFonts > 3) {
    issues.push('Too many fonts allowed (max 3)');
  }
  return issues;
};
