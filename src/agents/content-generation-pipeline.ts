export interface GeneratedContent {
  id: string;
  type: string;
  content: unknown;
  prompts?: string[];
  [key: string]: unknown;
}

export const contentPipeline = async (input: unknown): Promise<GeneratedContent[]> => [{ id: '1', type: 'stub', content: {} }];

contentPipeline.generateCarousel = async (input: unknown): Promise<GeneratedContent[]> => [{ id: '1', type: 'carousel', content: {} }];

// generateReel/generateStory/generatePost/generateBatch/getStats: never
// implemented. api/content-routes.ts calls all five — every request to
// POST /api/content/reel, /story, /post, /batch, and the stats endpoint
// has always thrown "contentPipeline.generateX is not a function" here,
// caught by that router's own try/catch and surfaced as a 500 "Content
// generation failed" (not a process crash, but a 100%-of-the-time 500
// for every caller of those 5 endpoints). Adding these so the module
// actually has the shape content-routes.ts expects (fixes the tsc
// errors) and so the 500 comes with a clear reason instead of a
// generic method-missing crash — not filling in the real generation
// logic, which doesn't exist yet and isn't something to invent here.
// capabilities/content/generationPipeline.ts has real, working
// carousel/video generators (generateCarouselContent/
// generateVideoContent) that reel/story/post generation likely belongs
// on top of — flagged for whoever picks this up next.
const notImplemented = (name: string) => async (_input: unknown): Promise<GeneratedContent[]> => {
  throw new Error(`contentPipeline.${name} is not implemented yet`);
};
contentPipeline.generateReel = notImplemented('generateReel');
contentPipeline.generateStory = notImplemented('generateStory');
contentPipeline.generatePost = notImplemented('generatePost');
contentPipeline.generateBatch = async (..._args: unknown[]): Promise<GeneratedContent[]> => {
  throw new Error('contentPipeline.generateBatch is not implemented yet');
};
contentPipeline.getStats = async (_input?: unknown): Promise<{ totalGenerated: number; byType: Record<string, number> }> => {
  throw new Error('contentPipeline.getStats is not implemented yet');
};

export const contentGenerationPipeline = async (input: unknown): Promise<unknown> => ({ content: [], status: 'generated' });
