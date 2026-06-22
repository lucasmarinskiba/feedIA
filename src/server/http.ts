import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { log } from '../agent/logger.js';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  rawBody: Buffer;
}

export type RouteHandler = (ctx: RouteContext) => Promise<void> | void;

export interface RouteDefinition {
  method: Method;
  pattern: string;
  handler: RouteHandler;
}

const matchPattern = (pattern: string, path: string): { match: boolean; params: Record<string, string> } => {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return { match: false, params: {} };
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const p = patternParts[i] ?? '';
    const v = pathParts[i] ?? '';
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(v);
    } else if (p !== v) {
      return { match: false, params: {} };
    }
  }
  return { match: true, params };
};

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolveP, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolveP(Buffer.concat(chunks)));
    req.on('error', reject);
  });

export const json = (res: ServerResponse, status: number, payload: unknown): void => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('access-control-allow-origin', '*');
  res.end(JSON.stringify(payload));
};

export const text = (
  res: ServerResponse,
  status: number,
  body: string,
  contentType = 'text/plain; charset=utf-8',
): void => {
  res.statusCode = status;
  res.setHeader('content-type', contentType);
  res.end(body);
};

/**
 * Dispatcher puro: matchea routes y ejecuta el handler para un (req,res) dado.
 * Reutilizable en server clásico (startHttp) y serverless (api/[...path].ts).
 * No bindea puerto ni arranca procesos de fondo.
 */
export const createRequestHandler =
  (routes: RouteDefinition[], fallback?: RouteHandler) =>
  (req: IncomingMessage, res: ServerResponse): void => {
    void (async (): Promise<void> => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const query: Record<string, string> = {};
      url.searchParams.forEach((v, k) => {
        query[k] = v;
      });

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('access-control-allow-origin', '*');
        res.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('access-control-allow-headers', 'content-type, x-hub-signature-256');
        res.end();
        return;
      }

      const rawBody = ['POST', 'PUT', 'PATCH'].includes(req.method ?? '') ? await readBody(req) : Buffer.alloc(0);

      let body: unknown = null;
      const ct = (req.headers['content-type'] ?? '').toLowerCase();
      if (rawBody.length && ct.includes('application/json')) {
        try {
          body = JSON.parse(rawBody.toString('utf-8'));
        } catch {
          json(res, 400, { error: 'JSON inválido' });
          return;
        }
      } else if (rawBody.length) {
        body = rawBody.toString('utf-8');
      }

      for (const route of routes) {
        if (route.method !== req.method) continue;
        const m = matchPattern(route.pattern, url.pathname);
        if (!m.match) continue;
        try {
          await route.handler({ req, res, params: m.params, query, body, rawBody });
        } catch (err) {
          log.error(`Route ${route.method} ${route.pattern} falló: ${(err as Error).message}`);
          if (!res.headersSent) json(res, 500, { error: (err as Error).message });
        }
        return;
      }

      if (fallback) {
        await fallback({ req, res, params: {}, query, body, rawBody });
        return;
      }
      json(res, 404, { error: 'Not found', path: url.pathname });
    })();
  };

export const startHttp = (
  port: number,
  routes: RouteDefinition[],
  fallback?: RouteHandler,
  onUpgrade?: (
    req: InstanceType<typeof import('http').IncomingMessage>,
    socket: InstanceType<typeof import('net').Socket>,
    head: Buffer,
  ) => void,
): { close: () => void; server: ReturnType<typeof createServer> } => {
  const server = createServer(createRequestHandler(routes, fallback));

  if (onUpgrade) {
    server.on('upgrade', onUpgrade);
  }

  server.listen(port, () => {
    log.success(`HTTP server escuchando en :${port}`);
  });

  return {
    close: (): void => {
      server.close();
    },
    server,
  };
};
