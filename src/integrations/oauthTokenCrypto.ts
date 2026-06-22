/**
 * oauthTokenCrypto — cifrado simétrico de tokens OAuth (AES-256-GCM).
 *
 * Clave: OAUTH_TOKEN_SECRET (derivada a 32 bytes vía SHA-256 si no los tiene).
 * Sin esta variable los tokens NO se persisten en la base de datos; se usan
 * archivos locales planos solo para desarrollo/legacy.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { log } from '../agent/logger.js';

const ENV_KEY = 'OAUTH_TOKEN_SECRET';

export const getRawSecret = (): string | undefined => process.env[ENV_KEY];

export const isEncryptionAvailable = (): boolean => Boolean(getRawSecret());

const deriveKey = (secret: string): Buffer => {
  const raw = Buffer.from(secret, 'utf-8');
  if (raw.length >= 32) return raw.subarray(0, 32);
  return createHash('sha256').update(raw).digest();
};

const getKey = (): Buffer | null => {
  const secret = getRawSecret();
  if (!secret) return null;
  return deriveKey(secret);
};

const SEPARATOR = ':';

/**
 * Cifra un texto plano. Devuelve `iv:tag:ciphertext` en base64.
 * Retorna null si no hay clave configurada.
 */
export const encryptToken = (plaintext: string): string | null => {
  const key = getKey();
  if (!key) return null;
  try {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((b) => b.toString('base64')).join(SEPARATOR);
  } catch (err) {
    log.warn(`[oauthTokenCrypto] encrypt failed: ${(err as Error).message}`);
    return null;
  }
};

/**
 * Descifra un token previamente cifrado con `encryptToken`.
 * Retorna null si la clave falta, el formato es inválido o la integridad falla.
 */
export const decryptToken = (ciphertext: string): string | null => {
  const key = getKey();
  if (!key) return null;
  const parts = ciphertext.split(SEPARATOR);
  if (parts.length !== 3) return null;
  try {
    const [ivB64, tagB64, dataB64] = parts as [string, string, string];
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    if (iv.length !== 16 || tag.length !== 16) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf-8');
  } catch (err) {
    log.warn(`[oauthTokenCrypto] decrypt failed: ${(err as Error).message}`);
    return null;
  }
};
