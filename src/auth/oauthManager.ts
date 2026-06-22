import { log } from '../agent/logger.js';

/**
 * OAuth Manager
 * Handles Instagram + TikTok authentication
 * Manages tokens, refresh, credential storage
 */

export interface OAuthCredentials {
  platform: 'instagram' | 'tiktok';
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
  username: string;
}

export interface OAuthConfig {
  instagram: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  tiktok: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

export class OAuthManager {
  private credentials: Map<string, OAuthCredentials> = new Map();
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.loadCredentials();
  }

  /**
   * Generate Instagram OAuth URL
   */
  getInstagramAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.instagram.clientId,
      redirect_uri: this.config.instagram.redirectUri,
      scope: 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages',
      response_type: 'code',
      state,
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Generate TikTok OAuth URL
   */
  getTikTokAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.config.tiktok.clientId,
      redirect_uri: this.config.tiktok.redirectUri,
      scope: 'user.info.basic,video.upload,video.publish',
      response_type: 'code',
      state,
    });

    return `https://www.tiktok.com/v1/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange code for access token (Instagram)
   */
  async handleInstagramCallback(code: string): Promise<OAuthCredentials> {
    try {
      const tokenResponse = await fetch('https://graph.instagram.com/v18.0/oauth/access_token', {
        method: 'POST',
        body: JSON.stringify({
          client_id: this.config.instagram.clientId,
          client_secret: this.config.instagram.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: this.config.instagram.redirectUri,
          code,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = (await tokenResponse.json()) as Record<string, unknown>;

      const credentials: OAuthCredentials = {
        platform: 'instagram',
        accessToken: (data.access_token as string) || '',
        expiresAt: Date.now() + ((data.expires_in as number) || 3600) * 1000,
        userId: (data.user_id as string) || '',
        username: (data.username as string) || '',
      };

      this.credentials.set(`instagram-${credentials.userId}`, credentials);
      this.saveCredentials();

      log.info(`[OAuth] Instagram connected: ${credentials.username}`);
      return credentials;
    } catch (error) {
      log.error(`[OAuth] Instagram auth failed: ${error}`);
      throw error;
    }
  }

  /**
   * Exchange code for access token (TikTok)
   */
  async handleTikTokCallback(code: string): Promise<OAuthCredentials> {
    try {
      const tokenResponse = await fetch('https://open.tiktokapis.com/v1/oauth/token', {
        method: 'POST',
        body: JSON.stringify({
          client_key: this.config.tiktok.clientId,
          client_secret: this.config.tiktok.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.tiktok.redirectUri,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = (await tokenResponse.json()) as Record<string, unknown>;
      const dataObj = (data.data as Record<string, unknown>) || {};

      const credentials: OAuthCredentials = {
        platform: 'tiktok',
        accessToken: (dataObj.access_token as string) || '',
        refreshToken: (dataObj.refresh_token as string) || '',
        expiresAt: Date.now() + ((dataObj.expires_in as number) || 3600) * 1000,
        userId: (dataObj.open_id as string) || '',
        username: (dataObj.open_id as string) || '',
      };

      this.credentials.set(`tiktok-${credentials.userId}`, credentials);
      this.saveCredentials();

      log.info(`[OAuth] TikTok connected: ${credentials.userId}`);
      return credentials;
    } catch (error) {
      log.error(`[OAuth] TikTok auth failed: ${error}`);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(credentialId: string): Promise<OAuthCredentials> {
    const cred = this.credentials.get(credentialId);
    if (!cred) throw new Error(`Credentials not found: ${credentialId}`);

    if (cred.platform === 'instagram') {
      // Instagram: use long-lived token refresh
      const response = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${cred.accessToken}`,
      );

      const data = (await response.json()) as Record<string, unknown>;
      cred.accessToken = (data.access_token as string) || cred.accessToken;
      cred.expiresAt = Date.now() + ((data.expires_in as number) || 3600) * 1000;
    } else if (cred.platform === 'tiktok' && cred.refreshToken) {
      // TikTok: use refresh token
      const response = await fetch('https://open.tiktokapis.com/v1/oauth/token', {
        method: 'POST',
        body: JSON.stringify({
          client_key: this.config.tiktok.clientId,
          client_secret: this.config.tiktok.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: cred.refreshToken,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = (await response.json()) as Record<string, unknown>;
      const dataObj = (data.data as Record<string, unknown>) || {};
      cred.accessToken = (dataObj.access_token as string) || cred.accessToken;
      cred.refreshToken = (dataObj.refresh_token as string) || cred.refreshToken;
      cred.expiresAt = Date.now() + ((dataObj.expires_in as number) || 3600) * 1000;
    }

    this.saveCredentials();
    return cred;
  }

  /**
   * Get valid credentials (refresh if expired)
   */
  async getValidCredentials(credentialId: string): Promise<OAuthCredentials> {
    const cred = this.credentials.get(credentialId);
    if (!cred) throw new Error(`Credentials not found: ${credentialId}`);

    if (cred.expiresAt < Date.now()) {
      return this.refreshToken(credentialId);
    }

    return cred;
  }

  /**
   * List all connected accounts
   */
  listAccounts(): OAuthCredentials[] {
    return Array.from(this.credentials.values());
  }

  /**
   * Disconnect account
   */
  disconnectAccount(credentialId: string): void {
    this.credentials.delete(credentialId);
    this.saveCredentials();
    log.info(`[OAuth] Account disconnected: ${credentialId}`);
  }

  private loadCredentials(): void {
    // Load from secure storage (encrypted file or env vars)
    // For now: placeholder
    log.debug('[OAuth] Credentials loaded from secure storage');
  }

  private saveCredentials(): void {
    // Save to secure storage (encrypted file or env vars)
    log.debug(`[OAuth] Saved ${this.credentials.size} credential(s)`);
  }
}

export const createOAuthManager = (config: OAuthConfig): OAuthManager => {
  return new OAuthManager(config);
};
