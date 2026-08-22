export interface GeneratedContent {
  id: string;
  type: string;
  content: unknown;
  prompts?: string[];
  [key: string]: unknown;
}

export const contentPipeline = async (input: unknown): Promise<GeneratedContent[]> => [{ id: '1', type: 'stub', content: {} }];

contentPipeline.generateCarousel = async (input: unknown): Promise<GeneratedContent[]> => [{ id: '1', type: 'carousel', content: {} }];

export const contentGenerationPipeline = async (input: unknown): Promise<unknown> => ({ content: [], status: 'generated' });
