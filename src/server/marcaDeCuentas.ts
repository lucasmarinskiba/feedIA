import type { BrandProfile } from '../config/types.js';
import { getRequestedBrandId, resolveDefaultBrandId, type RequestContext } from './oauthRoutes.js';

/**
 * Marca cuyas cuentas de Instagram y TikTok se leen. Es la misma que se usa al conectar:
 * la marca activa de la sesión. Sin sesión, la marca por defecto del servidor.
 */
export const marcaDeCuentas = async (req: RequestContext['req'], brand: BrandProfile): Promise<string> => {
  const solicitada = await getRequestedBrandId({ req, source: {} }, brand);
  return solicitada?.brandId ?? resolveDefaultBrandId(brand) ?? 'default';
};
