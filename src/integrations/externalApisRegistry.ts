/**
 * External APIs Registry — Unified interface for all third-party AI services.
 * Supports: DeepSeek, Edits, Hailou AI, Speechma, Photopea, Microsoft Designer, Leonardo AI, etc.
 */

export interface ExternalAPI {
  name: string;
  endpoint: string;
  apiKey?: string;
  enabled: boolean;
  category: 'text' | 'image' | 'video' | 'speech' | 'design';
  priority: number; // 1 = highest priority (try first)
  fallbackTo?: string; // API name to fallback to if this fails
}

export const EXTERNAL_APIS: Record<string, ExternalAPI> = {
  // Text Generation
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: process.env['DEEPSEEK_API_KEY'],
    enabled: !!process.env['DEEPSEEK_API_KEY'],
    category: 'text',
    priority: 2,
    fallbackTo: 'anthropic',
  },

  // Image Generation
  leonardo_ai: {
    name: 'Leonardo AI',
    endpoint: 'https://api.leonardo.ai/v1/generations',
    apiKey: process.env['LEONARDO_AI_API_KEY'],
    enabled: !!process.env['LEONARDO_AI_API_KEY'],
    category: 'image',
    priority: 1,
    fallbackTo: 'unsplash',
  },
  microsoft_designer: {
    name: 'Microsoft Designer',
    endpoint: 'https://designer.microsoft.com/api/generate',
    apiKey: process.env['MICROSOFT_DESIGNER_KEY'],
    enabled: !!process.env['MICROSOFT_DESIGNER_KEY'],
    category: 'image',
    priority: 2,
    fallbackTo: 'leonardo_ai',
  },

  // Image Editing
  edits: {
    name: 'Edits API',
    endpoint: 'https://api.edits.ai/v1/edit',
    apiKey: process.env['EDITS_API_KEY'],
    enabled: !!process.env['EDITS_API_KEY'],
    category: 'image',
    priority: 1,
    fallbackTo: 'photopea',
  },
  photopea: {
    name: 'Photopea (Web Editor)',
    endpoint: 'https://www.photopea.com/api',
    apiKey: process.env['PHOTOPEA_API_KEY'],
    enabled: !!process.env['PHOTOPEA_API_KEY'],
    category: 'design',
    priority: 2,
    fallbackTo: 'canva',
  },

  // Video Generation
  hailou_ai: {
    name: 'Hailou AI',
    endpoint: 'https://api.hailou.ai/v1/video/generate',
    apiKey: process.env['HAILOU_API_KEY'],
    enabled: !!process.env['HAILOU_API_KEY'],
    category: 'video',
    priority: 1,
    fallbackTo: 'runway',
  },

  // Speech Generation
  speechma: {
    name: 'Speechma',
    endpoint: 'https://api.speechma.com/v1/synthesis',
    apiKey: process.env['SPEECHMA_API_KEY'],
    enabled: !!process.env['SPEECHMA_API_KEY'],
    category: 'speech',
    priority: 1,
    fallbackTo: 'elevenlabs',
  },

  // Fallbacks (existing)
  unsplash: {
    name: 'Unsplash',
    endpoint: 'https://api.unsplash.com',
    apiKey: process.env['UNSPLASH_API_KEY'],
    enabled: !!process.env['UNSPLASH_API_KEY'],
    category: 'image',
    priority: 10,
  },
  elevenlabs: {
    name: 'ElevenLabs',
    endpoint: 'https://api.elevenlabs.io',
    apiKey: process.env['ELEVENLABS_API_KEY'],
    enabled: !!process.env['ELEVENLABS_API_KEY'],
    category: 'speech',
    priority: 10,
  },
  runway: {
    name: 'Runway',
    endpoint: 'https://api.runwayml.com',
    apiKey: process.env['RUNWAY_API_KEY'],
    enabled: !!process.env['RUNWAY_API_KEY'],
    category: 'video',
    priority: 10,
  },
};

/**
 * Get enabled APIs for a category, sorted by priority.
 */
export const getAPIsByCategory = (category: ExternalAPI['category']): ExternalAPI[] => Object.values(EXTERNAL_APIS)
    .filter((api) => api.enabled && api.category === category)
    .sort((a, b) => a.priority - b.priority);

/**
 * Get next API in fallback chain.
 */
export const getNextFallback = (currentAPI: string): ExternalAPI | null => {
  const api = EXTERNAL_APIS[currentAPI];
  if (!api?.fallbackTo) return null;
  const fallback = EXTERNAL_APIS[api.fallbackTo];
  return fallback?.enabled ? fallback : null;
};

export const externalApisRegistry = {
  EXTERNAL_APIS,
  getAPIsByCategory,
  getNextFallback,
};
