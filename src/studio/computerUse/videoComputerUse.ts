import { log } from '../../agent/logger.js';
import { executeWithRecovery } from './reliableSession.js';
import type { BrandProfile } from '../../config/types.js';

export const executeVideoWithComputerUse = async (
  brand: BrandProfile,
  tool: string,
  action: string,
  params: Record<string, unknown>,
): Promise<{ ok: boolean; exportPath?: string; durationMs: number; error?: string }> => {
  const startMs = Date.now();

  try {
    const goal = buildVideoGoal(brand, tool, action, params);
    log.info(`[VideoComputerUse] ${tool}: ${action}`);

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 20,
      operationName: `Video edit with ${tool}`,
      maxRetries: 3,
    });

    if (!result.ok) {
      return {
        ok: false,
        durationMs: Date.now() - startMs,
        error: result.summary || 'Video creation failed',
      };
    }

    const exportPath = parseVideoExport(result.summary);

    return {
      ok: true,
      exportPath,
      durationMs: Date.now() - startMs,
    };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

function buildVideoGoal(brand: BrandProfile, tool: string, action: string, params: Record<string, unknown>): string {
  const brandContext = `Brand: @${brand.name} | Voice: ${brand.voice.tone}`;

  if (tool === 'capcut') {
    return `Edit video in CapCut (${action}):
${brandContext}
${JSON.stringify(params).substring(0, 150)}...
Export MP4 to Downloads after editing.`;
  }

  if (tool === 'inshot') {
    return `Edit video in InShot (${action}):
${brandContext}
${JSON.stringify(params).substring(0, 150)}...
Save final video.`;
  }

  return `Edit video in ${tool}: ${action}`;
}

function parseVideoExport(summary: string): string | undefined {
  const match = summary.match(/([A-Za-z]:[\\/][^\s]+\.mp4)/i);
  return match ? match[0] : undefined;
}
