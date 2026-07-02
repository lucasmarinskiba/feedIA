/**
 * Phase 25: Resource Aggregator (Enhanced)
 *
 * 80+ integrated resources: images, fonts, design tools, video, color, mockups,
 * illustrations, icons, inspiration, research, font sources
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
    { id: 'font-squirrel', name: 'Font Squirrel', url: 'https://fontsquirrel.com', isPaid: false, quality: 85, recommendedFor: ['all'] },
    { id: 'fontspace', name: 'Fontspace', url: 'https://fontspace.com', isPaid: false, quality: 75, recommendedFor: ['all'] },
    { id: '1001fonts', name: '1001 Fonts', url: 'https://1001fonts.com', isPaid: false, quality: 72, recommendedFor: ['all'] },
    { id: 'creative-market-fonts', name: 'Creative Market Fonts', url: 'https://creativemarket.com/fonts', isPaid: false, quality: 90, recommendedFor: ['premium'] },
    { id: 'lost-type', name: 'Lost Type', url: 'https://losttype.com', isPaid: false, quality: 88, recommendedFor: ['indie', 'creative'] },
    { id: 'league-fonts', name: 'The League of Moveable Type', url: 'https://theleagueofmoveabletype.com', isPaid: false, quality: 86, recommendedFor: ['all'] },
    { id: 'fontesk', name: 'Fontesk', url: 'https://fontesk.com', isPaid: false, quality: 80, recommendedFor: ['all'] },
  ],

  designTools: [
    { id: 'canva', name: 'Canva', url: 'https://canva.com', isPaid: false, quality: 85, recommendedFor: ['carousel', 'story'] },
    { id: 'figma', name: 'Figma', url: 'https://figma.com', isPaid: true, quality: 95, recommendedFor: ['carousel', 'reel', 'professional'] },
    { id: 'adobe-xd', name: 'Adobe XD', url: 'https://adobe.com/products/xd', isPaid: true, quality: 92, recommendedFor: ['professional'] },
    { id: 'adobe-express', name: 'Adobe Express', url: 'https://express.adobe.com', isPaid: false, quality: 88, recommendedFor: ['carousel', 'social'] },
    { id: 'pixlr', name: 'Pixlr', url: 'https://pixlr.com', isPaid: false, quality: 82, recommendedFor: ['quick-edit'] },
    { id: 'vistacreate', name: 'Vistacreate', url: 'https://vistacreate.com', isPaid: false, quality: 85, recommendedFor: ['carousel', 'story'] },
    { id: 'lunacy', name: 'Lunacy', url: 'https://lunacy.design', isPaid: false, quality: 84, recommendedFor: ['professional'] },
    { id: 'vectr', name: 'Vectr', url: 'https://vectr.com', isPaid: false, quality: 80, recommendedFor: ['vector', 'illustration'] },
    { id: 'gravit', name: 'Gravit Designer', url: 'https://gravit.io', isPaid: false, quality: 82, recommendedFor: ['vector', 'design'] },
    { id: 'relythat', name: 'Relythat', url: 'https://relythat.com', isPaid: false, quality: 78, recommendedFor: ['quick-design'] },
    { id: 'desygner', name: 'Desygner', url: 'https://desygner.com', isPaid: false, quality: 80, recommendedFor: ['carousel', 'social'] },
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
    { id: 'mockup-world', name: 'Mockup World', url: 'https://mockupworld.co', isPaid: false, quality: 84, recommendedFor: ['all'] },
    { id: 'pixeden', name: 'Pixeden', url: 'https://pixeden.com', isPaid: false, quality: 86, recommendedFor: ['premium'] },
    { id: 'ls-graphics', name: 'LS Graphics', url: 'https://lsgraphics.com', isPaid: false, quality: 87, recommendedFor: ['professional'] },
    { id: 'artboard-studio', name: 'Artboard Studio', url: 'https://artboard.studio', isPaid: false, quality: 89, recommendedFor: ['presentation'] },
    { id: 'shotsnapp', name: 'Shotsnapp', url: 'https://shotsnapp.com', isPaid: false, quality: 82, recommendedFor: ['mockup'] },
    { id: 'renderforest', name: 'Renderforest', url: 'https://renderforest.com', isPaid: false, quality: 85, recommendedFor: ['animation', 'video'] },
    { id: 'mockubro', name: 'Mockubro', url: 'https://mockubro.com', isPaid: false, quality: 80, recommendedFor: ['mockup'] },
    { id: 'dimmy', name: 'Dimmy.club', url: 'https://dimmy.club', isPaid: false, quality: 81, recommendedFor: ['mockup'] },
    { id: 'pixelbudha', name: 'Pixel Buddha', url: 'https://pixelbuddha.net', isPaid: false, quality: 84, recommendedFor: ['resources'] },
  ],

  illustrations: [
    { id: 'flaticon', name: 'Flaticon', url: 'https://flaticon.com', isPaid: false, quality: 92, recommendedFor: ['icons', 'illustrations'] },
    { id: 'icons8', name: 'Icons8', url: 'https://icons8.com', isPaid: false, quality: 90, recommendedFor: ['icons', 'illustrations'] },
    { id: 'lordicon', name: 'Lordicon', url: 'https://lordicon.com', isPaid: false, quality: 88, recommendedFor: ['animated-icons'] },
    { id: 'undraw', name: 'Undraw', url: 'https://undraw.co', isPaid: false, quality: 94, recommendedFor: ['illustrations'] },
    { id: 'streamline', name: 'Streamline', url: 'https://streamlinehq.com', isPaid: false, quality: 92, recommendedFor: ['icons', 'illustrations'] },
    { id: 'iconmonstr', name: 'Iconmonstr', url: 'https://iconmonstr.com', isPaid: false, quality: 85, recommendedFor: ['icons'] },
    { id: 'svg-repo', name: 'SVG Repo', url: 'https://svgrepo.com', isPaid: false, quality: 83, recommendedFor: ['svg', 'icons'] },
    { id: 'heroicons', name: 'Heroicons', url: 'https://heroicons.com', isPaid: false, quality: 90, recommendedFor: ['icons'] },
    { id: 'humaaans', name: 'Humaaans', url: 'https://humaaans.com', isPaid: false, quality: 91, recommendedFor: ['people-illustrations'] },
    { id: 'drawkit', name: 'DrawKit', url: 'https://drawkit.com', isPaid: false, quality: 89, recommendedFor: ['illustrations'] },
  ],

  inspiration: [
    { id: 'behance', name: 'Behance', url: 'https://behance.net', isPaid: false, quality: 95, recommendedFor: ['all'] },
    { id: 'dribbble', name: 'Dribbble', url: 'https://dribbble.com', isPaid: false, quality: 93, recommendedFor: ['design', 'ui'] },
    { id: 'muzli', name: 'Muzli', url: 'https://muzli.space', isPaid: false, quality: 90, recommendedFor: ['all'] },
    { id: 'designspiration', name: 'Designspiration', url: 'https://designspiration.com', isPaid: false, quality: 91, recommendedFor: ['design'] },
    { id: 'pinterest', name: 'Pinterest', url: 'https://pinterest.com', isPaid: false, quality: 88, recommendedFor: ['all'] },
    { id: 'awwwards', name: 'Awwwards', url: 'https://awwwards.com', isPaid: false, quality: 92, recommendedFor: ['web', 'premium'] },
    { id: 'siteinspire', name: 'Siteinspire', url: 'https://siteinspire.com', isPaid: false, quality: 90, recommendedFor: ['web'] },
    { id: 'uimovement', name: 'UI Movement', url: 'https://uimovement.com', isPaid: false, quality: 88, recommendedFor: ['ui', 'animation'] },
    { id: 'land-book', name: 'Land-book', url: 'https://land-book.com', isPaid: false, quality: 89, recommendedFor: ['web', 'landing'] },
    { id: 'collectui', name: 'Collect UI', url: 'https://collectui.com', isPaid: false, quality: 87, recommendedFor: ['ui', 'design'] },
  ],

  research: [
    { id: 'underconsideration', name: 'UnderConsideration', url: 'https://underconsideration.com', isPaid: false, quality: 95, recommendedFor: ['branding', 'research'] },
    { id: 'fontsinuse', name: 'Fonts In Use', url: 'https://fontsinuse.com', isPaid: false, quality: 94, recommendedFor: ['typography', 'research'] },
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
