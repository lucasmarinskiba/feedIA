/* ══════════════════════════════════════════════════════════════════════════════
   ADMIN KEY · acceso a las rutas de administración (bots, revisión de comentarios)
   ──────────────────────────────────────────────────────────────────────────────
   La clave vive SOLO en memoria de esta pestaña: nada de localStorage/sessionStorage
   (CLAUDE.md prohíbe credenciales en storage del navegador). Al recargar hay que
   volver a ingresarla; a cambio no queda expuesta ante un XSS ni en el disco.

   En desarrollo (servidor sin FEEDIA_ADMIN_KEY) nunca hace falta: no se pide nada.
   ══════════════════════════════════════════════════════════════════════════════ */
import { api } from './api.js';

let key = '';

export const isAuthError = (err) => err?.status === 401 || err?.status === 403;

export const clearAdminKey = () => {
  key = '';
};

/** Pide la clave al usuario. true si ingresó algo (no valida: eso lo hace el servidor). */
export const askAdminKey = () => {
  const entered = window.prompt(
    'Este servidor pide la clave de admin. Se guarda solo mientras esta pestaña esté abierta.',
  );
  if (entered && entered.trim()) {
    key = entered.trim();
    return true;
  }
  return false;
};

/**
 * fetch JSON con la clave de admin. `interactive` = si el servidor la pide (401/403), se le pregunta al
 * usuario UNA vez y se reintenta; solo debe usarse tras una acción suya, nunca en un polling.
 */
export const adminApi = async (path, opts = {}, { interactive = false } = {}) => {
  const run = () => api(path, { ...opts, noCache: true, headers: key ? { 'x-admin-key': key } : undefined });
  try {
    return await run();
  } catch (err) {
    if (interactive && isAuthError(err) && askAdminKey()) {
      try {
        return await run();
      } catch (retryErr) {
        if (isAuthError(retryErr)) clearAdminKey(); // la clave era incorrecta: que la próxima vez se vuelva a pedir
        throw retryErr;
      }
    }
    throw err;
  }
};
