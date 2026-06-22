import { log } from '../agent/logger.js';
import type { OAuthCredentials } from './oauthManager.js';

/**
 * Account Manager
 * Manages connected Instagram/TikTok accounts
 * Routes requests to correct account + credential validation
 */

export interface ConnectedAccount {
  id: string;
  platform: 'instagram' | 'tiktok';
  username: string;
  userId: string;
  handle: string;
  connectedAt: Date;
  lastActive: Date;
  credentials: OAuthCredentials;
  status: 'active' | 'expired' | 'disconnected';
}

export class AccountManager {
  private accounts: Map<string, ConnectedAccount> = new Map();

  /**
   * Register new connected account
   */
  registerAccount(credentials: OAuthCredentials): ConnectedAccount {
    const accountId = `${credentials.platform}-${credentials.userId}`;

    const account: ConnectedAccount = {
      id: accountId,
      platform: credentials.platform,
      username: credentials.username,
      userId: credentials.userId,
      handle: `@${credentials.username}`,
      connectedAt: new Date(),
      lastActive: new Date(),
      credentials,
      status: 'active',
    };

    this.accounts.set(accountId, account);
    log.info(`[AccountManager] Connected: ${account.handle} (${credentials.platform})`);

    return account;
  }

  /**
   * Get account by ID
   */
  getAccount(accountId: string): ConnectedAccount | undefined {
    return this.accounts.get(accountId);
  }

  /**
   * Get account by handle
   */
  getAccountByHandle(handle: string): ConnectedAccount | undefined {
    for (const account of this.accounts.values()) {
      if (account.handle === handle || account.username === handle) {
        return account;
      }
    }
    return undefined;
  }

  /**
   * List all connected accounts
   */
  listAccounts(platform?: 'instagram' | 'tiktok'): ConnectedAccount[] {
    const accounts = Array.from(this.accounts.values());
    if (platform) {
      return accounts.filter((a) => a.platform === platform);
    }
    return accounts;
  }

  /**
   * Get credentials for account
   */
  getCredentials(accountId: string): OAuthCredentials | undefined {
    const account = this.getAccount(accountId);
    return account?.credentials;
  }

  /**
   * Update last active time
   */
  updateLastActive(accountId: string): void {
    const account = this.getAccount(accountId);
    if (account) {
      account.lastActive = new Date();
    }
  }

  /**
   * Disconnect account
   */
  disconnectAccount(accountId: string): void {
    const account = this.getAccount(accountId);
    if (account) {
      account.status = 'disconnected';
      this.accounts.delete(accountId);
      log.info(`[AccountManager] Disconnected: ${account.handle}`);
    }
  }

  /**
   * Get account summary (for UI)
   */
  getSummary(accountId: string): Record<string, unknown> | null {
    const account = this.getAccount(accountId);
    if (!account) return null;

    return {
      id: account.id,
      handle: account.handle,
      platform: account.platform,
      status: account.status,
      connected_at: account.connectedAt.toISOString(),
      last_active: account.lastActive.toISOString(),
    };
  }

  /**
   * Get all accounts summary
   */
  getAllSummaries(): Array<Record<string, unknown>> {
    return Array.from(this.accounts.values()).map((account) => ({
      id: account.id,
      handle: account.handle,
      platform: account.platform,
      status: account.status,
      connected_at: account.connectedAt.toISOString(),
      last_active: account.lastActive.toISOString(),
    }));
  }
}

export const accountManager = new AccountManager();
