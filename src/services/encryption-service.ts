/**
 * Encryption Service
 * AES-256-GCM at-rest encryption for sensitive data
 * Week 3: Security layer
 */

import crypto from 'crypto';

interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits

  /**
   * Encrypt data with master key
   */
  encrypt(plaintext: string, masterKey: string): EncryptedData {
    try {
      // Derive 256-bit key from master key
      const key = crypto.pbkdf2Sync(masterKey, 'feedia-salt', 100000, this.keyLength, 'sha256');

      // Generate random IV (12 bytes for GCM)
      const iv = crypto.randomBytes(12);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = (cipher as any).getAuthTag();

      return {
        ciphertext: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
      };
    } catch (err) {
      throw new Error(`Encryption failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  /**
   * Decrypt data with master key
   */
  decrypt(encrypted: EncryptedData, masterKey: string): string {
    try {
      // Derive key
      const key = crypto.pbkdf2Sync(masterKey, 'feedia-salt', 100000, this.keyLength, 'sha256');

      // Recreate decipher
      const iv = Buffer.from(encrypted.iv, 'hex');
      const authTag = Buffer.from(encrypted.authTag, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      (decipher as any).setAuthTag(authTag);

      let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err) {
      throw new Error(`Decryption failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  /**
   * Generate random encryption key
   */
  generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash password with salt (for 2FA backup codes storage)
   */
  hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return { hash, salt };
  }

  /**
   * Verify password against hash
   */
  verifyPassword(password: string, hash: string, salt: string): boolean {
    const derived = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return derived === hash;
  }
}

export const encryptionService = new EncryptionService();
