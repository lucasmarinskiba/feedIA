/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { analizarPostsDeMarca } from '../capabilities/executive/postsAnalisis.js';
import { devolverAnalisis } from '../capabilities/executive/postsDevoluciones.js';

const buildPostsAnalysisRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  return [
    {
      method: 'GET',
      pattern: '/api/executive/posts-analysis',
      handler: async ({ res, query }) => {
        const bloques = await analizarPostsDeMarca(brandId, { refrescar: query['refrescar'] === '1' });
        const [instagram, tiktok] = await Promise.all([
          devolverAnalisis(bloques.instagram),
          devolverAnalisis(bloques.tiktok),
        ]);
        json(res, 200, {
          instagram: { ...bloques.instagram, devolucion: instagram },
          tiktok: { ...bloques.tiktok, devolucion: tiktok },
        });
      },
    },
  ];
};

const createPostsAnalysisRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildPostsAnalysisRoutes(brand));

export default createPostsAnalysisRoutes;
