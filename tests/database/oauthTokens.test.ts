import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveOAuthToken,
  getOAuthToken,
  deleteOAuthToken,
  listOAuthTokensForBrand,
  type OAuthConnection,
} from '../../src/database/oauthTokens.js';

describe('oauthTokens (SQLite cifrado)', () => {
  const brandId = 'test-oauth-brand';
  const secret = 'test-secret-oauth-32-bytes-long!!';

  const makeConnection = (platform: 'instagram' | 'tiktok'): OAuthConnection => ({
    platform,
    brandId,
    accessToken: `token-${platform}`,
    refreshToken: `refresh-${platform}`,
    scope: 'publish,read',
    expiresAtIso: new Date(Date.now() + 86_400_000).toISOString(),
    metadata: { igBusinessId: `ig-${platform}`, pageId: `page-${platform}` },
    connectedAt: new Date().toISOString(),
  });

  beforeEach(() => {
    vi.stubEnv('OAUTH_TOKEN_SECRET', secret);
  });

  afterEach(async () => {
    await deleteOAuthToken(brandId, 'instagram');
    await deleteOAuthToken(brandId, 'tiktok');
    vi.unstubAllEnvs();
  });

  it('guarda y recupera un token cifrado', async () => {
    const conn = makeConnection('instagram');
    const saved = await saveOAuthToken(conn);
    expect(saved).toBe(true);

    const retrieved = await getOAuthToken(brandId, 'instagram');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.accessToken).toBe(conn.accessToken);
    expect(retrieved?.refreshToken).toBe(conn.refreshToken);
    expect(retrieved?.metadata?.igBusinessId).toBe(conn.metadata.igBusinessId);
  });

  it('actualiza un token existente', async () => {
    const conn = makeConnection('instagram');
    await saveOAuthToken(conn);

    const updated: OAuthConnection = { ...conn, accessToken: 'token-v2', refreshToken: 'refresh-v2' };
    await saveOAuthToken(updated);

    const retrieved = await getOAuthToken(brandId, 'instagram');
    expect(retrieved?.accessToken).toBe('token-v2');
    expect(retrieved?.refreshToken).toBe('refresh-v2');
  });

  it('lista conexiones por brand', async () => {
    await saveOAuthToken(makeConnection('instagram'));
    await saveOAuthToken(makeConnection('tiktok'));

    const list = await listOAuthTokensForBrand(brandId);
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.platform).sort()).toEqual(['instagram', 'tiktok']);
  });

  it('elimina un token', async () => {
    await saveOAuthToken(makeConnection('instagram'));
    expect(await getOAuthToken(brandId, 'instagram')).not.toBeNull();

    await deleteOAuthToken(brandId, 'instagram');
    expect(await getOAuthToken(brandId, 'instagram')).toBeNull();
  });

  it('no opera si no hay secreto de cifrado', async () => {
    vi.stubEnv('OAUTH_TOKEN_SECRET', '');
    const conn = makeConnection('instagram');
    expect(await saveOAuthToken(conn)).toBe(false);
    expect(await getOAuthToken(brandId, 'instagram')).toBeNull();
  });
});
