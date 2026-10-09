import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { User } from '../auth/userAccounts.js';
import type { BrandProfile } from '../config/types.js';

const usuarioDeSesion = vi.fn<(req: unknown) => Promise<User | null>>();
const listarIntentos = vi.fn(async () => []);
const programarPublicacion = vi.fn(async () => true);
const listConnectionsForBrand = vi.fn(async (_brandId: string) => [] as unknown[]);
const deleteConnection = vi.fn(async () => true);
const saveConnection = vi.fn(async () => undefined);

vi.mock('../server/forge/forgeSesion.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../server/forge/forgeSesion.js')>()),
  usuarioDeSesion: (req: unknown): Promise<User | null> => usuarioDeSesion(req),
}));

vi.mock('../server/forge/forgeStore.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../server/forge/forgeStore.js')>()),
  listarIntentos: (...args: unknown[]): Promise<unknown[]> =>
    (listarIntentos as (...a: unknown[]) => Promise<unknown[]>)(...args),
  programarPublicacion: (...args: unknown[]): Promise<boolean> =>
    (programarPublicacion as (...a: unknown[]) => Promise<boolean>)(...args),
}));

vi.mock('../integrations/oauthConnections.js', () => ({
  listConnectionsForBrand: (brandId: string): Promise<unknown[]> => listConnectionsForBrand(brandId),
  deleteConnection: (): Promise<boolean> => deleteConnection(),
  saveConnection: (): Promise<void> => saveConnection(),
}));

const usuarioConMarcas = (overrides: Partial<User> = {}): User => ({
  id: 'user_1',
  email: 'dueno@example.com',
  displayName: 'Dueño',
  passwordHash: '',
  passwordSalt: '',
  plan: 'pro',
  status: 'active',
  brandIds: ['brand_a', 'brand_b'],
  activeBrandId: 'brand_a',
  createdAt: '2026-01-01T00:00:00.000Z',
  metadata: {},
  ...overrides,
});

describe('rutas Forge: sesión y autorización por marca', () => {
  let servidor: Server;
  let base: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgres://test-only';
    const { createForgeRoutes } = await import('../server/forgeRoutes.js');
    const app = express();
    app.use(express.json());
    app.use(createForgeRoutes({ id: 'brand_a', name: 'Marca A' } as unknown as BrandProfile));
    servidor = app.listen(0);
    const { port } = servidor.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => servidor.close(() => r()));
    delete process.env.DATABASE_URL;
  });

  beforeEach(() => {
    usuarioDeSesion.mockReset();
    listarIntentos.mockClear();
    programarPublicacion.mockClear();
    listConnectionsForBrand.mockReset();
    listConnectionsForBrand.mockResolvedValue([]);
    deleteConnection.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('history: sin sesión responde 401 y no consulta la DB', async () => {
    usuarioDeSesion.mockResolvedValue(null);
    const r = await fetch(`${base}/api/forge/history`);
    expect(r.status).toBe(401);
    expect(listarIntentos).not.toHaveBeenCalled();
  });

  it('history: usa la marca activa del usuario, no un parámetro del cliente', async () => {
    usuarioDeSesion.mockResolvedValue(usuarioConMarcas());
    const r = await fetch(`${base}/api/forge/history?accountId=brand_b&limit=5`);
    expect(r.status).toBe(200);
    expect(listarIntentos).toHaveBeenCalledWith('brand_a', 5);
  });

  it('connected-accounts: ignora ?userId y solo lista marcas del usuario de sesión', async () => {
    usuarioDeSesion.mockResolvedValue(usuarioConMarcas({ brandIds: ['brand_a'] }));
    listConnectionsForBrand.mockImplementation(async (brandId: string) =>
      brandId === 'brand_a'
        ? [
            {
              platform: 'instagram',
              brandId,
              accessToken: 'secreto',
              connectedAt: '2026-01-02T00:00:00.000Z',
              metadata: { username: 'mi_cuenta' },
            },
          ]
        : [{ platform: 'instagram', brandId, accessToken: 'ajeno', connectedAt: '2026-01-02T00:00:00.000Z' }],
    );

    const r = await fetch(`${base}/api/forge/instagram/connected-accounts?userId=user_victima`);
    const cuerpo = (await r.json()) as { accounts: Array<Record<string, unknown>> };
    expect(r.status).toBe(200);
    expect(cuerpo.accounts).toHaveLength(1);
    expect(cuerpo.accounts[0]?.brandId).toBe('brand_a');
    expect(cuerpo.accounts[0]?.username).toBe('mi_cuenta');
    // Nunca se devuelve el token.
    expect(JSON.stringify(cuerpo)).not.toContain('secreto');
  });

  it('publish-scheduled: rechaza una marca que no es del usuario (403)', async () => {
    usuarioDeSesion.mockResolvedValue(usuarioConMarcas());
    const r = await fetch(`${base}/api/forge/publish-scheduled`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contentId: 'c1', platform: 'instagram', brandId: 'brand_ajena' }),
    });
    expect(r.status).toBe(403);
    expect(programarPublicacion).not.toHaveBeenCalled();
  });

  it('publish-scheduled: programa en una marca propia y devuelve 201-equivalente 200', async () => {
    usuarioDeSesion.mockResolvedValue(usuarioConMarcas());
    const r = await fetch(`${base}/api/forge/publish-scheduled`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contentId: 'c1', platform: 'instagram', brandId: 'brand_b' }),
    });
    expect(r.status).toBe(200);
    expect(programarPublicacion).toHaveBeenCalledWith(expect.objectContaining({ brandId: 'brand_b', contentId: 'c1' }));
  });

  it('disconnect: no puede desconectar una marca ajena', async () => {
    usuarioDeSesion.mockResolvedValue(usuarioConMarcas());
    const r = await fetch(`${base}/api/forge/instagram/disconnect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brandId: 'brand_ajena' }),
    });
    expect(r.status).toBe(403);
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  it('oauth-authorize y oauth-callback quedan en 410 apuntando al flujo real', async () => {
    const a = await fetch(`${base}/api/forge/instagram/oauth-authorize`);
    const c = await fetch(`${base}/api/forge/instagram/oauth-callback?code=x`);
    expect(a.status).toBe(410);
    expect(c.status).toBe(410);
    expect(((await c.json()) as { destino: string }).destino).toBe('/api/auth/instagram/callback');
  });
});
