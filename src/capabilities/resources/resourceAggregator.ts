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
    { id: 'thedieline', name: 'TheDieLine', url: 'https://thedieline.com', isPaid: false, quality: 94, recommendedFor: ['packaging', 'branding'] },
    { id: 'loggos', name: 'Loggos.co', url: 'https://loggos.co', isPaid: false, quality: 91, recommendedFor: ['logos', 'branding'] },
    { id: 'inspirationgrid', name: 'The Inspiration Grid', url: 'https://theinspirationgrid.com', isPaid: false, quality: 92, recommendedFor: ['design', 'branding'] },
  ],

  photoEditing: [
    { id: 'lightroom-mobile', name: 'Lightroom Mobile', url: 'https://adobe.com/products/lightroom', isPaid: false, quality: 92, recommendedFor: ['product-photos', 'mobile-editing'] },
    { id: 'snapseed', name: 'Snapseed', url: 'https://snapseed.online', isPaid: false, quality: 88, recommendedFor: ['retouching', 'mobile'] },
  ],

  tools: [
    { id: 'whatthefont', name: 'What The Font', url: 'https://whatthefont.com', isPaid: false, quality: 96, recommendedFor: ['typography', 'font-identification'] },
    { id: 'hypic', name: 'Hypic', url: 'https://hypic.app', isPaid: false, quality: 88, recommendedFor: ['text-effects', 'mobile-editing'] },
  ],

  aiTools: [
    // Chatbot (15)
    { id: 'chatbase', name: 'Chatbase', url: 'https://chatbase.co', isPaid: false, quality: 88, recommendedFor: ['chatbot', 'ai'] },
    { id: 'popai', name: 'POPAI', url: 'https://popai.pro', isPaid: false, quality: 85, recommendedFor: ['chatbot'] },
    { id: 'coze', name: 'Coze', url: 'https://coze.com', isPaid: false, quality: 87, recommendedFor: ['chatbot', 'ai'] },
    { id: 'gleap', name: 'Gleap', url: 'https://gleap.io', isPaid: false, quality: 82, recommendedFor: ['chatbot'] },
    { id: 'perplexity', name: 'Perplexity', url: 'https://perplexity.ai', isPaid: false, quality: 92, recommendedFor: ['search', 'ai'] },
    { id: 'seona-ai', name: 'Seona AI', url: 'https://seona.ai', isPaid: false, quality: 80, recommendedFor: ['seo', 'ai'] },
    { id: 'longshot', name: 'LongShot', url: 'https://longshot.ai', isPaid: false, quality: 88, recommendedFor: ['writing', 'ai'] },
    { id: 'dialogflow', name: 'Dialogflow', url: 'https://dialogflow.cloud.google.com', isPaid: false, quality: 89, recommendedFor: ['chatbot', 'nlp'] },
    { id: 'bright-eye', name: 'Bright Eye', url: 'https://brighteye.ai', isPaid: false, quality: 76, recommendedFor: ['analytics'] },
    { id: 'chatsimple', name: 'ChatSimple', url: 'https://chatsimple.com', isPaid: false, quality: 84, recommendedFor: ['chatbot'] },
    { id: 'respell', name: 'Respell', url: 'https://respell.ai', isPaid: false, quality: 86, recommendedFor: ['automation'] },
    { id: 'chatfuel', name: 'Chatfuel', url: 'https://chatfuel.com', isPaid: false, quality: 83, recommendedFor: ['chatbot'] },
    { id: 'sortex', name: 'Sortex', url: 'https://sortex.ai', isPaid: false, quality: 78, recommendedFor: ['data', 'ai'] },
    { id: 'claude', name: 'Claude', url: 'https://claude.ai', isPaid: false, quality: 95, recommendedFor: ['ai', 'writing'] },
    { id: 'hix', name: 'Hix', url: 'https://hix.ai', isPaid: false, quality: 87, recommendedFor: ['writing', 'ai'] },

    // Writing/Copy (12)
    { id: 'grammary', name: 'Grammary', url: 'https://grammarly.com', isPaid: true, quality: 94, recommendedFor: ['writing', 'grammar'] },
    { id: 'copyai', name: 'Copy.AI', url: 'https://copy.ai', isPaid: false, quality: 88, recommendedFor: ['copywriting', 'marketing'] },
    { id: 'text-fx', name: 'Text FX', url: 'https://textfx.withgoogle.com', isPaid: false, quality: 85, recommendedFor: ['creative-writing', 'ai'] },
    { id: 'jenni', name: 'Jenni', url: 'https://jenni.ai', isPaid: false, quality: 89, recommendedFor: ['writing', 'ai'] },
    { id: 'jenniai', name: 'JenniAI', url: 'https://jenni.ai', isPaid: false, quality: 89, recommendedFor: ['writing'] },
    { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com', isPaid: false, quality: 90, recommendedFor: ['ai', 'writing'] },
    { id: 'rytr', name: 'Rytr', url: 'https://rytr.me', isPaid: false, quality: 86, recommendedFor: ['copywriting', 'ai'] },
    { id: 'word-stream', name: 'Word Stream', url: 'https://wordstream.com', isPaid: false, quality: 82, recommendedFor: ['keywords', 'ads'] },
    { id: 'bing', name: 'Bing', url: 'https://bing.com/chat', isPaid: false, quality: 88, recommendedFor: ['search', 'ai'] },
    { id: 'notion-ai', name: 'Notion AI', url: 'https://notion.so', isPaid: true, quality: 87, recommendedFor: ['writing', 'productivity'] },
    { id: 'marsai', name: 'MarsAI', url: 'https://marsai.ai', isPaid: false, quality: 84, recommendedFor: ['writing', 'ai'] },
    { id: 'monica', name: 'Monica', url: 'https://monica.im', isPaid: false, quality: 85, recommendedFor: ['chatbot', 'writing'] },

    // Design/Visual (25)
    { id: 'veed', name: 'Veed', url: 'https://veed.io', isPaid: false, quality: 86, recommendedFor: ['video', 'editing'] },
    { id: 'imagica', name: 'Imagica', url: 'https://imagica.ai', isPaid: false, quality: 84, recommendedFor: ['image-generation', 'ai'] },
    { id: 'loggai', name: 'LoggAI', url: 'https://loggai.com', isPaid: false, quality: 88, recommendedFor: ['logo-design', 'ai'] },
    { id: 'makelogo', name: 'MakeLogo', url: 'https://makelogo.ai', isPaid: false, quality: 86, recommendedFor: ['logo', 'design'] },
    { id: 'looka', name: 'Looka', url: 'https://looka.com', isPaid: false, quality: 89, recommendedFor: ['logo', 'branding'] },
    { id: 'designs', name: 'Designs', url: 'https://designs.ai', isPaid: false, quality: 85, recommendedFor: ['design', 'ai'] },
    { id: 'firefly', name: 'Firefly', url: 'https://firefly.adobe.com', isPaid: true, quality: 92, recommendedFor: ['image-generation', 'design'] },
    { id: 'leonardo', name: 'Leonardo', url: 'https://leonardo.ai', isPaid: false, quality: 91, recommendedFor: ['image-generation', 'ai'] },
    { id: 'dall-e2', name: 'DALL-E 2', url: 'https://openai.com/dall-e-2', isPaid: true, quality: 95, recommendedFor: ['image-generation', 'ai'] },
    { id: 'pixelme', name: 'PixelMe', url: 'https://pixel.me', isPaid: false, quality: 80, recommendedFor: ['qr-codes', 'design'] },
    { id: 'suno', name: 'Suno', url: 'https://suno.ai', isPaid: false, quality: 88, recommendedFor: ['music', 'audio'] },
    { id: 'lucidpic', name: 'Lucidpic', url: 'https://lucidpic.com', isPaid: true, quality: 87, recommendedFor: ['portrait', 'ai'] },
    { id: 'invideo', name: 'InVideo', url: 'https://invideo.io', isPaid: false, quality: 86, recommendedFor: ['video', 'ai'] },
    { id: 'canva', name: 'Canva', url: 'https://canva.com', isPaid: false, quality: 90, recommendedFor: ['design', 'templates'] },
    { id: 'deepai', name: 'DeepAI', url: 'https://deepai.org', isPaid: false, quality: 85, recommendedFor: ['image-generation', 'ai'] },
    { id: 'safurai', name: 'Safurai', url: 'https://safurai.com', isPaid: false, quality: 82, recommendedFor: ['code', 'ai'] },
    { id: 'playground', name: 'Playground', url: 'https://playground.ai', isPaid: false, quality: 87, recommendedFor: ['image-generation'] },
    { id: 'ideogram', name: 'Ideogram', url: 'https://ideogram.ai', isPaid: false, quality: 89, recommendedFor: ['text-to-image', 'ai'] },
    { id: 'brandmark', name: 'Brandmark', url: 'https://brandmark.io', isPaid: false, quality: 88, recommendedFor: ['logo', 'branding'] },
    { id: 'midjourney', name: 'Midjourney', url: 'https://midjourney.com', isPaid: true, quality: 96, recommendedFor: ['image-generation', 'ai'] },
    { id: 'heygenaio', name: 'HeyGen', url: 'https://heygen.com', isPaid: false, quality: 87, recommendedFor: ['video', 'avatar'] },
    { id: 'simplified', name: 'Simplified', url: 'https://simplified.com', isPaid: false, quality: 84, recommendedFor: ['design', 'video'] },
    { id: 'durable', name: 'Durable', url: 'https://durable.co', isPaid: false, quality: 85, recommendedFor: ['website', 'design'] },
    { id: 'fliki', name: 'Fliki', url: 'https://fliki.ai', isPaid: false, quality: 86, recommendedFor: ['video', 'text-to-speech'] },
    { id: 'shuffii', name: 'Shuffii', url: 'https://shuffii.com', isPaid: false, quality: 81, recommendedFor: ['music', 'ai'] },

    // Video (10)
    { id: 'synthesis', name: 'Synthesis', url: 'https://synthesis.ai', isPaid: false, quality: 84, recommendedFor: ['video', 'speech'] },
    { id: 'vidiq', name: 'VidIQ', url: 'https://vidiq.com', isPaid: false, quality: 89, recommendedFor: ['youtube', 'seo'] },
    { id: 'tldv', name: 'tl;dv', url: 'https://tldv.io', isPaid: false, quality: 86, recommendedFor: ['video', 'meeting'] },
    { id: 'semrush', name: 'Semrush', url: 'https://semrush.com', isPaid: true, quality: 92, recommendedFor: ['seo', 'marketing'] },
    { id: 'zapier', name: 'Zapier', url: 'https://zapier.com', isPaid: false, quality: 90, recommendedFor: ['automation', 'integration'] },
    { id: 'pencil', name: 'Pencil', url: 'https://pencil.so', isPaid: false, quality: 84, recommendedFor: ['animation', 'design'] },
    { id: 'adcopy', name: 'AdCopy', url: 'https://adcopy.ai', isPaid: false, quality: 86, recommendedFor: ['ads', 'copywriting'] },
    { id: 'adcreative', name: 'AdCreative', url: 'https://adcreative.ai', isPaid: false, quality: 87, recommendedFor: ['ads', 'design'] },
    { id: 'leap', name: 'Leap', url: 'https://leap.ai', isPaid: false, quality: 85, recommendedFor: ['ai', 'api'] },
    { id: 'magdix', name: 'Magdix', url: 'https://magdix.com', isPaid: false, quality: 79, recommendedFor: ['social', 'content'] },

    // Productivity/Tools (20+)
    { id: 'taskade', name: 'Taskade', url: 'https://taskade.com', isPaid: false, quality: 87, recommendedFor: ['productivity', 'ai'] },
    { id: 'mindgrasp', name: 'Mindgrasp', url: 'https://mindgrasp.ai', isPaid: false, quality: 85, recommendedFor: ['notes', 'ai'] },
    { id: 'clearscape', name: 'Clearscape', url: 'https://clearscape.ai', isPaid: false, quality: 82, recommendedFor: ['analysis', 'ai'] },
    { id: 'notafolia', name: 'Notafolia', url: 'https://notafolia.com', isPaid: false, quality: 80, recommendedFor: ['notes', 'portfolio'] },
    { id: 'google-bard', name: 'Google Bard', url: 'https://bard.google.com', isPaid: false, quality: 91, recommendedFor: ['ai', 'search'] },
    { id: 'hypwrite', name: 'HyperWrite', url: 'https://hyperwrite.com', isPaid: false, quality: 88, recommendedFor: ['writing', 'ai'] },
    { id: 'codeium', name: 'Codeium', url: 'https://codeium.com', isPaid: false, quality: 89, recommendedFor: ['code', 'ai'] },
    { id: 'wix', name: 'Wix', url: 'https://wix.com', isPaid: false, quality: 85, recommendedFor: ['website', 'builder'] },
    { id: '10web', name: '10Web', url: 'https://10web.io', isPaid: false, quality: 86, recommendedFor: ['website', 'ai'] },
    { id: 'gitfluence', name: 'GitFluence', url: 'https://gitfluence.com', isPaid: false, quality: 81, recommendedFor: ['git', 'ai'] },
    { id: 'framer', name: 'Framer', url: 'https://framer.com', isPaid: false, quality: 88, recommendedFor: ['design', 'prototype'] },
    { id: 'dribble', name: 'Dribbble', url: 'https://dribbble.com', isPaid: false, quality: 93, recommendedFor: ['design', 'inspiration'] },
    { id: 'seaart', name: 'SeaArt', url: 'https://seaart.ai', isPaid: false, quality: 86, recommendedFor: ['image', 'ai'] },
    { id: 'nameheap', name: 'Nameheap', url: 'https://nameheap.com', isPaid: false, quality: 82, recommendedFor: ['domain', 'branding'] },
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

log.info('[Phase 23-25] Resource Aggregator ✅ (95+ resources: images, fonts, design, video, color, mockups, illustrations, inspiration, research, photo editing, tools)');
