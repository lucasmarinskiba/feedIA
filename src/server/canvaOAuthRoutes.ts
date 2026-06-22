import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { json, text, type RouteDefinition } from './http.js';
import { buildCanvaAuthUrl, exchangeCanvaCode, saveCanvaTokens, deleteCanvaTokens } from '../integrations/canvaAuth.js';
import { ensureUser, listUsers, deleteUser } from '../integrations/userRegistry.js';

interface PkceSession {
  verifier: string;
  handle: string;
  createdAt: number;
}

const sessions = new Map<string, PkceSession>();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos

const cleanOldSessions = (): void => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [key, sess] of sessions) {
    if (sess.createdAt < cutoff) sessions.delete(key);
  }
};

const successHtml = (handle: string): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Canva conectado</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;">
  <h1>✅ Canva conectado</h1>
  <p>La cuenta de Canva para <strong>${handle}</strong> fue vinculada correctamente.</p>
  <p>Podés cerrar esta pestaña.</p>
</body>
</html>`;

const errorHtml = (msg: string): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Error</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;">
  <h1>❌ Error al conectar Canva</h1>
  <p>${msg}</p>
  <p><a href="/">Volver al inicio</a></p>
</body>
</html>`;

export const buildCanvaOAuthRoutes = (): RouteDefinition[] => {
  const clientId = env.canva.clientId;
  const clientSecret = env.canva.clientSecret;
  const redirectUri = `http://localhost:${process.env['DAEMON_PORT'] ?? 7321}/oauth/callback/canva`;

  if (!clientId || !clientSecret) {
    log.warn('CANVA_CLIENT_ID/SECRET no configurados: rutas OAuth deshabilitadas');
    return [];
  }

  return [
    {
      method: 'GET',
      pattern: '/connect/canva',
      handler: async ({ res, query }): Promise<void> => {
        const handle = (query['handle'] ?? '').trim();
        if (!handle) {
          return text(res, 400, errorHtml('Falta el parámetro ?handle=@usuario'));
        }
        cleanOldSessions();
        const state = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        try {
          const { url, verifier } = await buildCanvaAuthUrl(clientId, redirectUri, state);
          sessions.set(state, { verifier, handle, createdAt: Date.now() });
          res.statusCode = 302;
          res.setHeader('Location', url);
          res.end();
        } catch (err) {
          text(res, 500, errorHtml(`Error generando URL de autorización: ${(err as Error).message}`));
        }
      },
    },
    {
      method: 'GET',
      pattern: '/oauth/callback/canva',
      handler: async ({ res, query }): Promise<void> => {
        const code = query['code'];
        const state = query['state'];
        const error = query['error'];

        if (error) {
          return text(res, 400, errorHtml(`Canva rechazó la autorización: ${error}`));
        }
        if (!code || !state) {
          return text(res, 400, errorHtml('Faltan parámetros code o state'));
        }

        cleanOldSessions();
        const sess = sessions.get(state);
        if (!sess) {
          return text(res, 400, errorHtml('Sesión expirada o inválida. Intentá de nuevo.'));
        }
        sessions.delete(state);

        const result = await exchangeCanvaCode(code, sess.verifier, clientId, clientSecret, redirectUri);
        if (!result) {
          return text(res, 500, errorHtml('No se pudo intercambiar el código por tokens.'));
        }

        ensureUser(sess.handle);
        saveCanvaTokens(sess.handle, {
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          expiresAt: Date.now() + result.expires_in * 1000,
          connectedAt: new Date().toISOString(),
        });

        log.success(`Canva conectado para ${sess.handle}`);
        text(res, 200, successHtml(sess.handle), 'text/html; charset=utf-8');
      },
    },
    {
      method: 'GET',
      pattern: '/api/canva/users',
      handler: ({ res }): void => {
        const users = listUsers().filter((u) => u.canvaConnected);
        json(res, 200, { users });
      },
    },
    {
      // Health check de la integración Canva: estado de conexión + capacidad
      // real de llamar a la API. Lo lee el Brand Board y sirve de diagnóstico.
      method: 'GET',
      pattern: '/api/canva/health',
      handler: async ({ res }): Promise<void> => {
        const users = listUsers().filter((u) => u.canvaConnected);
        const connected = users.length > 0;
        const staticToken = !!process.env['CANVA_STATIC_TOKEN'];
        const oauthConfigured = !!process.env['CANVA_CLIENT_ID'] && !!process.env['CANVA_CLIENT_SECRET'];
        let apiReachable = false;
        let reason: string | undefined;
        if (connected || staticToken) {
          try {
            const { getUserAccessToken } = await import('../integrations/canvaAuth.js');
            const handle = users[0]?.handle ?? '';
            const token = staticToken ? process.env['CANVA_STATIC_TOKEN'] : await getUserAccessToken(handle);
            if (token) {
              const r = await fetch('https://api.canva.com/rest/v1/users/me', {
                headers: { authorization: `Bearer ${token}` },
              });
              apiReachable = r.ok;
              if (!r.ok) reason = `Canva API ${r.status}`;
            } else {
              reason = 'sin token válido';
            }
          } catch (e) {
            reason = `error: ${(e as Error).message}`;
          }
        } else {
          reason = oauthConfigured
            ? 'sin cuentas conectadas'
            : 'OAuth no configurado (faltan CANVA_CLIENT_ID/CANVA_CLIENT_SECRET)';
        }
        json(res, 200, {
          connected,
          tokens: users.length,
          staticToken,
          oauthConfigured,
          apiReachable,
          reason: apiReachable ? null : reason,
          message: apiReachable
            ? `Canva operativo (${users.length} cuenta(s)).`
            : `Canva no operativo: ${reason}. ${oauthConfigured ? 'Conectá una cuenta en /connect/canva.' : 'Configurá CANVA_CLIENT_ID y CANVA_CLIENT_SECRET en .env y reiniciá.'}`,
        });
      },
    },
    {
      method: 'POST',
      pattern: '/api/canva/disconnect',
      handler: async ({ res, body }): Promise<void> => {
        const b = body as { handle?: string };
        if (!b.handle) return json(res, 400, { error: 'handle requerido' });
        deleteCanvaTokens(b.handle);
        deleteUser(b.handle);
        json(res, 200, { ok: true, message: `Canva desconectado para ${b.handle}` });
      },
    },
  ];
};
