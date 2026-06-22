import { describe, it, expect, vi } from 'vitest';
import { encryptToken, decryptToken, isEncryptionAvailable, getRawSecret } from '../../src/integrations/oauthTokenCrypto.js';

describe('oauthTokenCrypto', () => {
  it('cifra y descifra un token', () => {
    vi.stubEnv('OAUTH_TOKEN_SECRET', 'test-secret-long-enough-12345');
    expect(isEncryptionAvailable()).toBe(true);

    const plaintext = JSON.stringify({ accessToken: 'abc-123', refreshToken: 'refresh-456' });
    const encrypted = encryptToken(plaintext);
    expect(encrypted).not.toBeNull();
    expect(encrypted).not.toBe(plaintext);

    const decrypted = decryptToken(encrypted!);
    expect(decrypted).toBe(plaintext);
  });

  it('devuelve null si no hay secreto configurado', () => {
    vi.stubEnv('OAUTH_TOKEN_SECRET', '');
    expect(isEncryptionAvailable()).toBe(false);
    expect(encryptToken('token')).toBeNull();
    expect(decryptToken('token')).toBeNull();
  });

  it('maneja secreto corto derivando clave', () => {
    vi.stubEnv('OAUTH_TOKEN_SECRET', 'short');
    const plaintext = 'sensitive';
    const encrypted = encryptToken(plaintext);
    expect(encrypted).not.toBeNull();
    expect(decryptToken(encrypted!)).toBe(plaintext);
  });

  it('devuelve null al descifrar texto corrupto', () => {
    vi.stubEnv('OAUTH_TOKEN_SECRET', 'another-secret-for-corruption-test');
    expect(decryptToken('invalid-format')).toBeNull();
    expect(decryptToken('a:b:c')).toBeNull();
  });
});
