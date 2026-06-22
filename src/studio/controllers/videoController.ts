import { log } from '../../agent/logger.js';
import type { ContentAsset, RenderResult } from '../types.js';

export interface VideoCommand {
  tool: 'capcut' | 'inshot' | 'premiere' | 'davinci';
  action: 'create' | 'edit' | 'add-audio' | 'add-effects' | 'export' | 'validate';
  params: Record<string, unknown>;
  timeoutMs?: number;
}

export interface VideoSession {
  sessionId: string;
  tool: string;
  projectName: string;
  assets: ContentAsset[];
  timeline?: {
    duration: number;
    fps: number;
    resolution: { width: number; height: number };
  };
  history: VideoCommand[];
}

export interface VideoControllerConfig {
  headless?: boolean;
  timeout?: number;
  retries?: number;
  exportPath?: string;
}

export class VideoController {
  private sessions: Map<string, VideoSession> = new Map();
  private config: VideoControllerConfig;

  constructor(config: VideoControllerConfig = {}) {
    this.config = {
      headless: false,
      timeout: 120000,
      retries: 2,
      exportPath: './videos-output',
      ...config,
    };
  }

  async executeCommand(sessionId: string, cmd: VideoCommand): Promise<RenderResult> {
    const startMs = Date.now();
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        ok: false,
        requestId: sessionId,
        engineName: 'VideoController',
        format: 'mp4',
        durationMs: Date.now() - startMs,
        error: `Session ${sessionId} not found`,
      };
    }

    try {
      session.history.push(cmd);
      log.debug(`[VideoController] Executing ${cmd.tool} ${cmd.action} for session ${sessionId}`);

      switch (cmd.tool) {
        case 'capcut':
          return await this.executeCapCutCommand(session, cmd, startMs);
        case 'inshot':
          return await this.executeInShotCommand(session, cmd, startMs);
        case 'premiere':
          return await this.executePremiereCommand(session, cmd, startMs);
        case 'davinci':
          return await this.executeDavinciCommand(session, cmd, startMs);
        default:
          return {
            ok: false,
            requestId: sessionId,
            engineName: 'VideoController',
            format: 'mp4',
            durationMs: Date.now() - startMs,
            error: `Unknown tool: ${cmd.tool}`,
          };
      }
    } catch (error) {
      log.error(
        `[VideoController] Command execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        ok: false,
        requestId: sessionId,
        engineName: 'VideoController',
        format: 'mp4',
        durationMs: Date.now() - startMs,
        error: `Command execution failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async executeCapCutCommand(session: VideoSession, cmd: VideoCommand, startMs: number): Promise<RenderResult> {
    log.info('[VideoController] CapCut command queued for Computer Use execution');

    if (cmd.action === 'create') {
      session.timeline = {
        duration: (cmd.params.durationMs as number) || 15000,
        fps: (cmd.params.fps as number) || 30,
        resolution: (cmd.params.resolution as { width: number; height: number }) || {
          width: 1080,
          height: 1920,
        },
      };
    }

    return {
      ok: true,
      requestId: session.sessionId,
      engineName: 'VideoController-CapCut',
      format: 'mp4',
      durationMs: Date.now() - startMs,
      designUrl: `capcut://project/${cmd.params.projectId ?? 'new'}`,
      artifactUrls: [`/exports/capcut-${session.sessionId}.mp4`],
    };
  }

  private async executeInShotCommand(session: VideoSession, cmd: VideoCommand, startMs: number): Promise<RenderResult> {
    log.info('[VideoController] InShot command queued for Computer Use execution');

    if (cmd.action === 'create') {
      session.timeline = {
        duration: (cmd.params.durationMs as number) || 15000,
        fps: 30,
        resolution: (cmd.params.resolution as { width: number; height: number }) || {
          width: 1080,
          height: 1920,
        },
      };
    }

    return {
      ok: true,
      requestId: session.sessionId,
      engineName: 'VideoController-InShot',
      format: 'mp4',
      durationMs: Date.now() - startMs,
      designUrl: `inshot://editor/${cmd.params.projectId ?? 'new'}`,
      artifactUrls: [`/exports/inshot-${session.sessionId}.mp4`],
    };
  }

  private async executePremiereCommand(
    session: VideoSession,
    cmd: VideoCommand,
    startMs: number,
  ): Promise<RenderResult> {
    log.info('[VideoController] Premiere command queued for Computer Use execution');

    if (cmd.action === 'create') {
      session.timeline = {
        duration: (cmd.params.durationMs as number) || 30000,
        fps: (cmd.params.fps as number) || 24,
        resolution: (cmd.params.resolution as { width: number; height: number }) || {
          width: 1920,
          height: 1080,
        },
      };
    }

    return {
      ok: true,
      requestId: session.sessionId,
      engineName: 'VideoController-Premiere',
      format: 'mp4',
      durationMs: Date.now() - startMs,
      artifactUrls: [`/exports/premiere-${session.sessionId}.mp4`],
    };
  }

  private async executeDavinciCommand(
    session: VideoSession,
    cmd: VideoCommand,
    startMs: number,
  ): Promise<RenderResult> {
    log.info('[VideoController] DaVinci Resolve command queued for Computer Use execution');

    if (cmd.action === 'create') {
      session.timeline = {
        duration: (cmd.params.durationMs as number) || 30000,
        fps: (cmd.params.fps as number) || 24,
        resolution: (cmd.params.resolution as { width: number; height: number }) || {
          width: 1920,
          height: 1080,
        },
      };
    }

    return {
      ok: true,
      requestId: session.sessionId,
      engineName: 'VideoController-DaVinci',
      format: 'mp4',
      durationMs: Date.now() - startMs,
      artifactUrls: [`/exports/davinci-${session.sessionId}.mp4`],
    };
  }

  async createSession(tool: string, projectName: string, params?: Record<string, unknown>): Promise<VideoSession> {
    const sessionId = `video-${tool}-${Date.now()}`;
    const session: VideoSession = {
      sessionId,
      tool,
      projectName,
      assets: [],
      history: [],
    };

    if (params?.fps || params?.resolution) {
      session.timeline = {
        duration: 0,
        fps: (params.fps as number) || 30,
        resolution: (params.resolution as { width: number; height: number }) || {
          width: 1080,
          height: 1920,
        },
      };
    }

    this.sessions.set(sessionId, session);
    log.debug(`[VideoController] Created session ${sessionId} for ${tool}: "${projectName}"`);
    return session;
  }

  async closeSession(sessionId: string): Promise<boolean> {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      log.debug(`[VideoController] Closed session ${sessionId}`);
    }
    return deleted;
  }

  getSession(sessionId: string): VideoSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): VideoSession[] {
    return Array.from(this.sessions.values());
  }
}

export const videoController = new VideoController({
  headless: false,
  exportPath: './videos-output',
});
