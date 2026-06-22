import type { RecipeOutput } from '../../studio/types.js';

const notImplemented = (): Promise<RecipeOutput> =>
  Promise.resolve({
    recipeId: 'stub',
    ok: false,
    contentPieces: [],
    pipelineResults: [],
    error: 'Recipes en reconstrucción. Usar pipelines directos (brief-to-publish, autopilot).',
  });

export const reelFacelessTutorial = notImplemented;
export const carruselEducativo = notImplemented;
export const storySequenceLaunch = notImplemented;
export const postImagenQuote = notImplemented;
export const repurposeBlogToAll = notImplemented;
export const weeklyContentPackage = notImplemented;
export const trendingAudioReel = notImplemented;
export const testimonialToCarrusel = notImplemented;
export const productShowcaseReel = notImplemented;
export const faqFacelessTriple = notImplemented;
