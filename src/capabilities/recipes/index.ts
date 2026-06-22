import type { BrandProfile } from '../../config/types.js';
import type { RecipeInput, RecipeOutput } from '../../studio/types.js';
import {
  reelFacelessTutorial,
  carruselEducativo,
  storySequenceLaunch,
  postImagenQuote,
  repurposeBlogToAll,
  weeklyContentPackage,
  trendingAudioReel,
  testimonialToCarrusel,
  productShowcaseReel,
  faqFacelessTriple,
} from './recipes.js';

export type RecipeId =
  | 'reel-faceless-tutorial'
  | 'carrusel-educativo'
  | 'story-sequence-launch'
  | 'post-imagen-quote'
  | 'repurpose-blog-to-all'
  | 'weekly-content-package'
  | 'trending-audio-reel'
  | 'testimonial-to-carrusel'
  | 'product-showcase-reel'
  | 'faq-faceless-triple';

const RECIPE_REGISTRY: Record<RecipeId, (brand: BrandProfile, input: RecipeInput) => Promise<RecipeOutput>> = {
  'reel-faceless-tutorial': reelFacelessTutorial,
  'carrusel-educativo': carruselEducativo,
  'story-sequence-launch': storySequenceLaunch,
  'post-imagen-quote': postImagenQuote,
  'repurpose-blog-to-all': repurposeBlogToAll,
  'weekly-content-package': weeklyContentPackage,
  'trending-audio-reel': trendingAudioReel,
  'testimonial-to-carrusel': testimonialToCarrusel,
  'product-showcase-reel': productShowcaseReel,
  'faq-faceless-triple': faqFacelessTriple,
};

export const listRecipes = (): Array<{ id: RecipeId; name: string; description: string }> => [
  {
    id: 'reel-faceless-tutorial',
    name: 'Reel Faceless Tutorial',
    description: 'Guion + storyboard + assets IA + render video',
  },
  {
    id: 'carrusel-educativo',
    name: 'Carrusel Educativo',
    description: 'Research + guion + slides + render Canva + caption',
  },
  {
    id: 'story-sequence-launch',
    name: 'Story Sequence Launch',
    description: 'Secuencia de stories interactivas para lanzamientos',
  },
  {
    id: 'post-imagen-quote',
    name: 'Post Imagen Quote',
    description: 'Quote card con tipografía brand + fondo generado',
  },
  {
    id: 'repurpose-blog-to-all',
    name: 'Repurpose Blog to All',
    description: 'Blog → carrusel + reel + stories + post-imagen',
  },
  {
    id: 'weekly-content-package',
    name: 'Weekly Content Package',
    description: '3 reels + 2 carruseles + 14 stories en un comando',
  },
  {
    id: 'trending-audio-reel',
    name: 'Trending Audio Reel',
    description: 'Detecta audio trending → adaptación → guion + render',
  },
  {
    id: 'testimonial-to-carrusel',
    name: 'Testimonial to Carrusel',
    description: 'Testimonio de cliente → carrusel premium',
  },
  {
    id: 'product-showcase-reel',
    name: 'Product Showcase Reel',
    description: 'Fotos/videos de producto → reel con transiciones',
  },
  {
    id: 'faq-faceless-triple',
    name: 'FAQ Faceless Triple',
    description: '3 FAQs → 3 reels faceless + carrusel resumen',
  },
];

export const runRecipe = async (brand: BrandProfile, recipeId: RecipeId, input: RecipeInput): Promise<RecipeOutput> => {
  const recipe = RECIPE_REGISTRY[recipeId];
  if (!recipe) {
    return {
      recipeId,
      ok: false,
      contentPieces: [],
      pipelineResults: [],
      error: `Receta "${recipeId}" no encontrada. Disponibles: ${Object.keys(RECIPE_REGISTRY).join(', ')}`,
    };
  }
  return recipe(brand, input);
};

export type { RecipeInput, RecipeOutput } from '../../studio/types.js';
