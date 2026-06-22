import type { PipelineStep, PipelineResult, RenderRequest, RenderResult, ContentAsset } from './types.js';
import type { StudioEngine } from './engines/base.js';
import { log } from '../agent/logger.js';

export interface PipelineConfig {
  pipelineId: string;
  steps: PipelineStep[];
}

export class PipelineRunner {
  private engines: Map<string, StudioEngine> = new Map();

  registerEngine(engine: StudioEngine): void {
    this.engines.set(engine.name, engine);
  }

  getEngine(name: string): StudioEngine | undefined {
    return this.engines.get(name);
  }

  listEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  async run(config: PipelineConfig): Promise<PipelineResult> {
    const startMs = Date.now();
    const results: PipelineResult['steps'] = [];
    const artifacts: ContentAsset[] = [];
    const completedSteps = new Set<string>();

    // Topological execution by dependencies
    const pending = new Set(config.steps.map((s) => s.stepId));

    while (pending.size > 0) {
      const ready = config.steps.filter(
        (s) => pending.has(s.stepId) && (s.dependsOn ?? []).every((d) => completedSteps.has(d)),
      );

      if (ready.length === 0 && pending.size > 0) {
        const remaining = Array.from(pending).join(', ');
        return {
          ok: false,
          pipelineId: config.pipelineId,
          steps: results,
          artifacts,
          totalDurationMs: Date.now() - startMs,
          error: `Deadlock en pipeline: steps pendientes con dependencias no resolubles: ${remaining}`,
        };
      }

      // Execute ready steps in parallel
      const batch = await Promise.all(
        ready.map(async (step) => {
          const engine = this.engines.get(step.engine);
          const stepStart = Date.now();
          if (!engine) {
            return {
              step,
              result: this.mockFailure(step.request, `Engine "${step.engine}" no registrado`, stepStart),
            };
          }
          if (!engine.supports(step.request)) {
            return {
              step,
              result: this.mockFailure(
                step.request,
                `Engine "${step.engine}" no soporta formato ${step.request.format}`,
                stepStart,
              ),
            };
          }
          const result = await engine.render(step.request);
          return { step, result };
        }),
      );

      for (const { step, result } of batch) {
        pending.delete(step.stepId);
        completedSteps.add(step.stepId);
        results.push({
          stepId: step.stepId,
          result,
          startedAt: new Date(Date.now() - result.durationMs).toISOString(),
          finishedAt: new Date().toISOString(),
        });
        if (result.ok && result.artifactUrls) {
          result.artifactUrls.forEach((url, idx) => {
            artifacts.push({
              id: `${step.stepId}-artifact-${idx}`,
              type: step.request.format === 'mp4' ? 'video' : 'image',
              source: 'generated',
              url,
            });
          });
        }
        if (!result.ok) {
          log.error(`Pipeline step ${step.stepId} falló: ${result.error}`);
        }
      }
    }

    const allOk = results.every((r) => r.result.ok);
    return {
      ok: allOk,
      pipelineId: config.pipelineId,
      steps: results,
      artifacts,
      totalDurationMs: Date.now() - startMs,
      error: allOk ? undefined : 'Al menos un step del pipeline falló. Revisar logs.',
    };
  }

  private mockFailure(request: RenderRequest, error: string, startMs: number): RenderResult {
    return {
      ok: false,
      requestId: request.id,
      engineName: 'pipeline',
      format: request.format,
      durationMs: Date.now() - startMs,
      error,
    };
  }
}
