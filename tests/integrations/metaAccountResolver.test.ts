import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveMetaCredentials, hasMetaCredentials } from '../../src/integrations/metaAccountResolver.js';
import { saveConnection, deleteConnection } from '../../src/integrations/oauthConnections.js';

describe('metaAccountResolver', () => {
  const accountId = 'test-meta-resolver';

  beforeEach(async () => {
    await deleteConnection(accountId, 'instagram');
  });

  afterEach(async () => {
    await deleteConnection(accountId, 'instagram');
  });

  it('resuelve credenciales desde archivo/oauthConnections', async () => {
    await saveConnection({
      platform: 'instagram',
      brandId: accountId,
      accessToken: 'token-123',
      expiresAtIso: new Date(Date.now() + 86_400_000).toISOString(),
      metadata: { igBusinessId: 'ig-123', pageId: 'page-123' },
      connectedAt: new Date().toISOString(),
    });

    const creds = await resolveMetaCredentials(accountId);
    expect(creds).not.toBeNull();
    expect(creds?.accessToken).toBe('token-123');
    expect(creds?.igBusinessId).toBe('ig-123');
    expect(creds?.pageId).toBe('page-123');
    expect(await hasMetaCredentials(accountId)).toBe(true);
  });

  it('retorna null si no hay credenciales', async () => {
    const creds = await resolveMetaCredentials('nonexistent-account');
    expect(creds).toBeNull();
    expect(await hasMetaCredentials('nonexistent-account')).toBe(false);
  });
});
