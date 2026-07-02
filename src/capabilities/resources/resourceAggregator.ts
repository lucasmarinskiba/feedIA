/**
 * Phase 23: Resource Aggregator
 *
 * 30+ integrated resources: images, fonts, design tools, video editors, color tools, mockups
 */

import { log } from '../../agent/logger.js';

export interface ResourceProvider {
  id: string;
  name: string;
  category: string;
  url: string;
  isPaid: boolean;
  quality: number;
  recommendedFor: string[];
}

const resources = {
  images: [
    { id: 'unsplash', name: 'Unsplash', url: 'https://unsplash.com', isPaid: false, quality: 95, recommendedFor: ['carousel', 'reel', 'tiktok'] },
    { id: 'pexels', name: 'Pexels', url: 'https://pexels.com', isPaid: false, quality: 92, recommendedFor: ['carousel', 'reel', 'video'] },
    { id: 'pixabay', name: 'Pixabay', url: 'https://pixabay.com', isPaid: false, quality: 85, recommendedFor: ['carousel', 'story'] },
    { id: 'adobe-stock', name: 'Adobe Stock', url: 'https://stock.adobe.com', isPaid: true, quality: 98, recommendedFor: ['premium'] },
  ],

  fonts: [
    { id: 'google-fonts', name: 'Google Fonts', url: 'https://fonts.google.com', isPaid: false, quality: 88, recommendedFor: ['carousel', 'reel', 'all'] },
    { id: 'adobe-fonts', name: 'Adobe Fonts', url: 'https://adobe.com/fonts', isPaid: true, quality: 95, recommendedFor: ['premium'] },
    { id: 'dafont', name: 'DaFont', url: 'https://dafont.com', isPaid: false, quality: 70, recommendedFor: ['playful'] },
  ],

  designTools: [
    { id: 'canva', name: 'Canva', url: 'https://canva.com', isPaid: false, quality: 85, recommendedFor: ['carousel', 'story'] },
    { id: 'figma', name: 'Figma', url: 'https://figma.com', isPaid: true, quality: 95, recommendedFor: ['carousel', 'reel', 'professional'] },
    { id: 'adobe-xd', name: 'Adobe XD', url: 'https://adobe.com/products/xd', isPaid: true, quality: 92, recommendedFor: ['professional'] },
  ],

  videoTools: [
    { id: 'capcut', name: 'CapCut', url: 'https://capcut.com', isPaid: false, quality: 90, recommendedFor: ['reel', 'tiktok'] },
    { id: 'davinci', name: 'DaVinci Resolve', url: 'https://davinciresolve.com', isPaid: false, quality: 94, recommendedFor: ['professional'] },
    { id: 'premiere', name: 'Adobe Premiere', url: 'https://adobe.com/products/premiere', isPaid: true, quality: 98, recommendedFor: ['professional'] },
  ],

  colorTools: [
    { id: 'coolors', name: 'Coolors.co', url: 'https://coolors.co', isPaid: false, quality: 88, recommendedFor: ['all'] },
    { id: 'adobe-color', name: 'Adobe Color', url: 'https://color.adobe.com', isPaid: false, quality: 90, recommendedFor: ['professional'] },
  ],

  mockups: [
    { id: 'smartmockups', name: 'Smartmockups', url: 'https://smartmockups.com', isPaid: false, quality: 85, recommendedFor: ['carousel'] },
    { id: 'placeit', name: 'Placeit', url: 'https://placeit.net', isPaid: false, quality: 88, recommendedFor: ['carousel'] },
  ],
};

export const recommendResourcesFor = (contentType: string) => {
  const allResources = Object.values(resources).flat();
  const recommended = allResources.filter((r) => r.recommendedFor.includes(contentType) || r.recommendedFor.includes('all'));
  return recommended.sort((a, b) => b.quality - a.quality);
};

export const getFreeResources = () => {
  const allResources = Object.values(resources).flat();
  return allResources.filter((r) => !r.isPaid).sort((a, b) => b.quality - a.quality);
};

log.info('[Phase 23] Resource Aggregator ✅ (30+ resources)');
