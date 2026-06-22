import { log } from '../../agent/logger.js';

export interface AppSession {
  appName: 'canva' | 'figma' | 'capcut' | 'inshot' | 'instagram' | 'tiktok';
  openedAt: Date;
  lastActive: Date;
  url?: string;
  isLoggedIn: boolean;
  lastError?: string;
}

export interface FileOperation {
  type: 'download' | 'upload' | 'save';
  timestamp: Date;
  fileName: string;
  filePath?: string;
  expectedLocation?: string;
}

export class SessionStateManager {
  private sessions: Map<string, AppSession> = new Map();
  private fileOperations: FileOperation[] = [];
  private sessionTimeout = 30 * 60 * 1000; // 30 min

  openSession(appName: AppSession['appName'], url?: string): string {
    const sessionId = `session-${appName}-${Date.now()}`;
    const session: AppSession = {
      appName,
      openedAt: new Date(),
      lastActive: new Date(),
      url,
      isLoggedIn: false,
    };

    this.sessions.set(sessionId, session);
    log.debug(`[SessionState] Opened: ${appName} (${sessionId})`);

    return sessionId;
  }

  updateSession(sessionId: string, updates: Partial<AppSession>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    Object.assign(session, updates, { lastActive: new Date() });
    log.debug(`[SessionState] Updated ${session.appName}: ${JSON.stringify(updates)}`);
  }

  markLoggedIn(sessionId: string, loggedIn: boolean): void {
    this.updateSession(sessionId, { isLoggedIn: loggedIn });
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const duration = new Date().getTime() - session.openedAt.getTime();
    log.debug(`[SessionState] Closed ${session.appName}: ${duration}ms`);

    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): AppSession | undefined {
    return this.sessions.get(sessionId);
  }

  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const age = new Date().getTime() - session.lastActive.getTime();
    return age < this.sessionTimeout;
  }

  trackFileOperation(operation: Omit<FileOperation, 'timestamp'>): void {
    this.fileOperations.push({
      ...operation,
      timestamp: new Date(),
    });

    log.debug(`[SessionState] File ${operation.type}: ${operation.fileName}`);
  }

  getLastDownload(_appName?: string): FileOperation | undefined {
    const downloads = this.fileOperations.filter((op) => op.type === 'download');
    return downloads[downloads.length - 1];
  }

  getDownloadsSince(_appName: string, minutes: number): FileOperation[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.fileOperations.filter((op) => op.type === 'download' && op.timestamp > cutoff);
  }

  getAllSessions(): Array<{ id: string; session: AppSession }> {
    return Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      session,
    }));
  }

  cleanup(): void {
    const now = new Date().getTime();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      const age = now - session.lastActive.getTime();
      if (age > this.sessionTimeout) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.debug(`[SessionState] Cleaned up ${cleaned} expired session(s)`);
    }
  }
}

export const sessionStateManager = new SessionStateManager();
