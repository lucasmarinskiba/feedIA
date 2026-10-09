import type { IncomingMessage } from 'node:http';
import { getSessionUser, type User } from '../../auth/userAccounts.js';

const COOKIE_SESION = 'feedia_session';

const leerCookie = (cabecera: string | undefined, nombre: string): string | undefined => {
  if (!cabecera) return undefined;
  const coincidencia = cabecera.match(new RegExp(`${nombre}=([^;]+)`));
  return coincidencia?.[1];
};

/** Usuario de la cookie de sesión. El userId nunca se toma del query string: eso permitía leer cuentas ajenas. */
export const usuarioDeSesion = async (req: IncomingMessage): Promise<User | null> =>
  getSessionUser(leerCookie(req.headers.cookie, COOKIE_SESION));

/** Marca sobre la que opera Forge: la activa o la primera del usuario. */
export const marcaActiva = (usuario: User): string | undefined => usuario.activeBrandId ?? usuario.brandIds[0];

export const puedeUsarMarca = (usuario: User, brandId: string): boolean => usuario.brandIds.includes(brandId);
