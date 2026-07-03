/**
 * Phase 37: Tool/App Integration Library
 *
 * Catalogs tools, capabilities, use cases
 */

export interface Tool {
  id: string;
  name: string;
  category: 'design' | 'content' | 'analytics' | 'distribution' | 'ai-generation';
  capability: string[];
  useCase: string;
  platform: string;
  apiAvailable: boolean;
  integratedWithFeedIA: boolean;
  pros: string[];
  cons: string[];
  alternatives?: string[];
}

export const toolLibrary: Tool[] = [
  {
    id: 'metricool',
    name: 'Metricool',
    category: 'analytics',
    capability: ['instagram-analytics', 'performance-tracking', 'engagement-measurement'],
    useCase: 'Track carousel performance, learn which patterns work',
    platform: 'instagram',
    apiAvailable: true,
    integratedWithFeedIA: true,
    pros: ['Real-time metrics', 'Competitor analysis', 'Content calendar integration'],
    cons: ['Paid tier required for advanced features'],
    alternatives: ['Later', 'Buffer', 'Hootsuite']
  },
  {
    id: 'canva',
    name: 'Canva',
    category: 'design',
    capability: ['template-based-design', 'brand-kit-integration', 'quick-editing'],
    useCase: 'Quick carousel design, template customization',
    platform: 'web',
    apiAvailable: false,
    integratedWithFeedIA: false,
    pros: ['User-friendly', 'Massive template library', 'Brand kit support'],
    cons: ['Limited control', 'Quality varies by template'],
    alternatives: ['Adobe Express', 'Figma', 'PicMonkey']
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'design',
    capability: ['professional-design', 'component-systems', 'collaboration', 'dev-handoff'],
    useCase: 'Build brand design systems, export for FeedIA',
    platform: 'web',
    apiAvailable: true,
    integratedWithFeedIA: true,
    pros: ['Component systems', 'Collaboration', 'Dev integration', 'Version control'],
    cons: ['Steep learning curve', 'Paid'],
    alternatives: ['Adobe XD', 'Sketch', 'Penpot']
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    category: 'ai-generation',
    capability: ['image-generation', 'concept-exploration', 'style-consistency'],
    useCase: 'Generate carousel images, explore visual directions',
    platform: 'discord',
    apiAvailable: false,
    integratedWithFeedIA: false,
    pros: ['High-quality images', 'Style consistency', 'Fast iteration'],
    cons: ['Discord-only', 'Limited control', 'Paid'],
    alternatives: ['DALL-E', 'Stable Diffusion', 'Adobe Firefly']
  }
];

export interface ToolRecommendation {
  task: string;
  recommendedTool: string;
  reason: string;
  workflow: string;
}

export const recommendations: ToolRecommendation[] = [
  {
    task: 'Design carousel from scratch',
    recommendedTool: 'Figma',
    reason: 'Professional control, component systems, brand consistency',
    workflow: 'Build design system in Figma → Export → Import to FeedIA'
  },
  {
    task: 'Quick carousel customization',
    recommendedTool: 'Canva',
    reason: 'Speed, templates, brand kit integration',
    workflow: 'Select template → Customize in Canva → Export → Post'
  },
  {
    task: 'Measure carousel performance',
    recommendedTool: 'Metricool',
    reason: 'Real-time metrics, learn what works',
    workflow: 'Publish carousel → Track with Metricool → Learn pattern → FeedIA improves'
  },
  {
    task: 'Generate carousel images',
    recommendedTool: 'Midjourney',
    reason: 'Style consistency, visual exploration',
    workflow: 'Prompt Midjourney → Generate images → Use in carousel'
  }
];

export const getToolFor = (task: string): Tool | null => {
  const rec = recommendations.find(r => r.task.includes(task));
  if (!rec) return null;
  return toolLibrary.find(t => t.name === rec.recommendedTool) || null;
};

export const ingestTool = (tool: any): Tool => {
  return {
    id: `tool-${Date.now()}`,
    name: tool.name,
    category: tool.category || 'design',
    capability: tool.capability || [],
    useCase: tool.useCase || '',
    platform: tool.platform || 'web',
    apiAvailable: tool.apiAvailable || false,
    integratedWithFeedIA: tool.integratedWithFeedIA || false,
    pros: tool.pros || [],
    cons: tool.cons || [],
    alternatives: tool.alternatives || []
  };
};
