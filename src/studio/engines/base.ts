import type { RenderRequest, RenderResult, EngineCapability, EngineEstimate } from '../types.js';

export interface StudioEngine {
  readonly name: string;
  readonly version: string;
  getCapabilities(): EngineCapability;
  supports(request: RenderRequest): boolean;
  estimate(request: RenderRequest): EngineEstimate;
  render(request: RenderRequest): Promise<RenderResult>;
}

export abstract class BaseEngine implements StudioEngine {
  abstract readonly name: string;
  abstract readonly version: string;

  abstract getCapabilities(): EngineCapability;
  abstract supports(request: RenderRequest): boolean;
  abstract estimate(request: RenderRequest): EngineEstimate;
  abstract render(request: RenderRequest): Promise<RenderResult>;

  protected success(
    request: RenderRequest,
    partial: Omit<RenderResult, 'ok' | 'requestId' | 'engineName' | 'format' | 'durationMs'>,
    startMs: number,
  ): RenderResult {
    return {
      ok: true,
      requestId: request.id,
      engineName: this.name,
      format: request.format,
      durationMs: Date.now() - startMs,
      ...partial,
    };
  }

  protected failure(request: RenderRequest, error: string, startMs: number): RenderResult {
    return {
      ok: false,
      requestId: request.id,
      engineName: this.name,
      format: request.format,
      durationMs: Date.now() - startMs,
      error,
    };
  }
}
