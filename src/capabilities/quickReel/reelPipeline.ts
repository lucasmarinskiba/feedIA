// @ts-nocheck
/**
 * Reel Pipeline — render video + upload Instagram Reel.
 *
 * Caminos de render:
 *   A — Guion + cover PNG (sin video real; user graba)
 *   B — HeyGen avatar (HEYGEN_API_KEY) — video con avatar IA
 *   C — Runway (RUNWAY_API_KEY) — text-to-video
 *   D — fal.ai (FAL_KEY con modelo video) — Minimax/Kling
 *
 * Upload: via uploadToSocial mediaType='reel' (necesita UPLOAD_POST_KEY).
 *
 * IMPORTANTE: si no hay API de video → Camino A solo entrega assets para
 * grabación manual + cover. NO publica auto.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import type { ReelScript } from '../reelStudio/reelScriptwriter.js';
import { uploadToSocial } from '../../integrations/uploadPost.js';
import { withUploadRetry } from '../../auth/retryHelper.js';
import { createAvatarVideo, checkHeyGenVideo } from '../../browserOperators/heygen/heygenApi.js';
import { generateVideoWithRunway, checkRunwayTask } from '../../browserOperators/runway/runwayApi.js';

const REEL_RENDER_DIR = path.resolve('data/quick-reel/rendered');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ReelPath = 'A-script-only' | 'B-heygen' | 'C-runway' | 'D-fal-video';

export interface ReelPipelineConfig {
  path?: ReelPath;
  publishToInstagram?: boolean;
  scheduledFor?: string;
  dryRun?: boolean;
  heygenAvatarId?: string;
  heygenVoiceId?: string;
  runwayDuration?: 5 | 10;
}

export interface ReelPipelineResult {
  packageId: string;
  pathUsed: ReelPath;
  videoPath?: string;
  videoUrl?: string;
  coverPath?: string;
  scriptMarkdown?: string;
  uploadId?: string;
  publishedUrl?: string;
  publishedAt?: string;
  status: 'script-only' | 'video-generating' | 'rendered' | 'queued' | 'published' | 'failed';
  needsManualRecording: boolean;
  errors: string[];
}

// ── Capacidades ───────────────────────────────────────────────────────────────

export const checkReelCapabilities = (): { availablePaths: ReelPath[]; recommended: ReelPath } => {
  const paths: ReelPath[] = ['A-script-only']; // siempre disponible
  if (process.env['HEYGEN_API_KEY']) paths.push('B-heygen');
  if (process.env['RUNWAY_API_KEY']) paths.push('C-runway');
  if (process.env['FAL_KEY']) paths.push('D-fal-video');

  // Preferencia: HeyGen (más predecible) → Runway → fal → A
  const recommended = paths.includes('B-heygen')
    ? 'B-heygen'
    : paths.includes('C-runway')
      ? 'C-runway'
      : paths.includes('D-fal-video')
        ? 'D-fal-video'
        : 'A-script-only';

  return { availablePaths: paths, recommended };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(REEL_RENDER_DIR, { recursive: true });
};

const buildScriptMarkdown = (script: ReelScript): string => {
  return `# Reel: ${script.topic}

**Hook:** ${script.hook}
**Estilo:** ${script.style} | **Duración:** ${script.duration}s
**Audio:** ${script.audioStrategy.type} — ${script.audioStrategy.description}

## Escenas

${script.scenes
  .map(
    (s) => `### Escena ${s.sceneNumber} (${s.startSec}s - ${s.endSec}s)
- **Visual:** ${s.visualDescription}
- **Ángulo:** ${s.cameraAngle} | **Toma:** ${s.shotType} | **Movimiento:** ${s.movement}
- **Texto en pantalla:** "${s.onScreenText}"
${s.voiceoverText ? `- **Narración:** "${s.voiceoverText}"` : ''}
- **Audio:** ${s.audioCue}
- **Transición:** ${s.transitionToNext ?? 'cut'}
- **Efectos:** ${s.effects.join(', ')}
- **Notas:** ${s.productionNotes}
`,
  )
  .join('\n')}

## Cover
**Texto:** ${script.coverFrame.text}
**Visual:** ${script.coverFrame.visualDirection}

## Caption
${script.caption}

## CTA
${script.cta}

## Hashtags
${script.hashtags.join(' ')}

## Producción
- Tiempo grabación: ${script.estimatedShootMinutes} min
- Tiempo edición: ${script.estimatedEditMinutes} min
- Retención esperada: 3s=${(script.expectedRetention.sec3 * 100).toFixed(0)}% / 15s=${(script.expectedRetention.sec15 * 100).toFixed(0)}% / completion=${(script.expectedRetention.completion * 100).toFixed(0)}%

## Checklist
${script.productionChecklist.map((c) => `- [ ] ${c}`).join('\n')}
`;
};

// ── Render videos por camino ──────────────────────────────────────────────────

const renderViaHeygen = async (
  script: ReelScript,
  config: ReelPipelineConfig,
): Promise<{
  videoUrl?: string;
  videoPath?: string;
  status: 'video-generating' | 'rendered' | 'failed';
  error?: string;
}> => {
  try {
    const voiceoverText = script.scenes.map((s) => s.voiceoverText ?? s.onScreenText).join('. ');
    const avatarId = config.heygenAvatarId ?? process.env['HEYGEN_DEFAULT_AVATAR_ID'];
    const voiceId = config.heygenVoiceId ?? process.env['HEYGEN_DEFAULT_VOICE_ID'];
    if (!avatarId || !voiceId) {
      return { status: 'failed', error: 'HEYGEN_DEFAULT_AVATAR_ID + HEYGEN_DEFAULT_VOICE_ID requeridos' };
    }
    const result = await createAvatarVideo({
      script: voiceoverText,
      avatarId,
      voiceId,
    });
    if (!result.ok || !result.videoId) return { status: 'failed', error: result.error ?? 'no videoId' };

    // Poll hasta completarse (timeout 5 min)
    const start = Date.now();
    while (Date.now() - start < 5 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 5000));
      const check = await checkHeyGenVideo(result.videoId);
      if (check.ok && check.videoUrl) {
        const r = await fetch(check.videoUrl);
        const buf = Buffer.from(await r.arrayBuffer());
        const filePath = path.join(REEL_RENDER_DIR, `${script.id}-heygen.mp4`);
        await fs.writeFile(filePath, buf);
        return { videoUrl: check.videoUrl, videoPath: filePath, status: 'rendered' };
      }
      if (!check.ok && check.error) return { status: 'failed', error: check.error };
    }
    return { status: 'video-generating', error: 'timeout waiting for video' };
  } catch (err) {
    return { status: 'failed', error: String(err) };
  }
};

const renderViaRunway = async (
  script: ReelScript,
  config: ReelPipelineConfig,
): Promise<{
  videoUrl?: string;
  videoPath?: string;
  status: 'video-generating' | 'rendered' | 'failed';
  error?: string;
}> => {
  try {
    const prompt = `${script.scenes[0]?.visualDescription ?? script.topic}. Style: ${script.style}. Cinematic, vertical.`;
    const result = await generateVideoWithRunway({
      prompt,
      duration: config.runwayDuration ?? 10,
      ratio: '768:1280',
    });
    if (!result.ok || !result.taskId) return { status: 'failed', error: result.error ?? 'no taskId' };

    const start = Date.now();
    while (Date.now() - start < 5 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 5000));
      const check = await checkRunwayTask(result.taskId);
      if (check.ok && check.outputUrl) {
        const r = await fetch(check.outputUrl);
        const buf = Buffer.from(await r.arrayBuffer());
        const filePath = path.join(REEL_RENDER_DIR, `${script.id}-runway.mp4`);
        await fs.writeFile(filePath, buf);
        return { videoUrl: check.outputUrl, videoPath: filePath, status: 'rendered' };
      }
      if (!check.ok && check.error) return { status: 'failed', error: check.error };
    }
    return { status: 'video-generating', error: 'timeout waiting for video' };
  } catch (err) {
    return { status: 'failed', error: String(err) };
  }
};

// ── Pipeline principal ───────────────────────────────────────────────────────

export const runReelPipeline = async (
  brand: BrandProfile,
  script: ReelScript,
  config: ReelPipelineConfig = {},
): Promise<ReelPipelineResult> => {
  const caps = checkReelCapabilities();
  const pathChoice: ReelPath = config.path ?? caps.recommended;
  const errors: string[] = [];

  log.info('[reelPipeline] starting', { pkgId: script.id, path: pathChoice });

  await ensureDir();
  const scriptMd = buildScriptMarkdown(script);
  await fs.writeFile(path.join(REEL_RENDER_DIR, `${script.id}-script.md`), scriptMd, 'utf-8');

  let videoPath: string | undefined;
  let videoUrl: string | undefined;
  let renderStatus: 'script-only' | 'video-generating' | 'rendered' | 'failed' = 'script-only';

  if (pathChoice === 'A-script-only') {
    void brand;
    return {
      packageId: script.id,
      pathUsed: 'A-script-only',
      scriptMarkdown: scriptMd,
      status: 'script-only',
      needsManualRecording: true,
      errors,
    };
  }

  if (pathChoice === 'B-heygen') {
    const r = await renderViaHeygen(script, config);
    videoPath = r.videoPath;
    videoUrl = r.videoUrl;
    renderStatus = r.status;
    if (r.error) errors.push(r.error);
  } else if (pathChoice === 'C-runway') {
    const r = await renderViaRunway(script, config);
    videoPath = r.videoPath;
    videoUrl = r.videoUrl;
    renderStatus = r.status;
    if (r.error) errors.push(r.error);
  } else if (pathChoice === 'D-fal-video') {
    // fal.ai video models (Minimax, Kling)
    try {
      const { generateImage } = await import('../../integrations/falAi.js');
      const r = await generateImage({
        model: 'fal-ai/minimax-video/text-to-video' as never,
        prompt: `${script.scenes[0]?.visualDescription ?? script.topic}. ${script.style}. Vertical 9:16.`,
        aspectRatio: '9:16',
      });
      if (r.imageUrl) {
        const res = await fetch(r.imageUrl);
        const buf = Buffer.from(await res.arrayBuffer());
        videoPath = path.join(REEL_RENDER_DIR, `${script.id}-fal.mp4`);
        await fs.writeFile(videoPath, buf);
        videoUrl = r.imageUrl;
        renderStatus = 'rendered';
      }
    } catch (err) {
      errors.push(`fal-video: ${String(err)}`);
      renderStatus = 'failed';
    }
  }

  if (renderStatus !== 'rendered' || !videoPath) {
    return {
      packageId: script.id,
      pathUsed: pathChoice,
      scriptMarkdown: scriptMd,
      videoUrl,
      status: renderStatus,
      needsManualRecording: true,
      errors,
    };
  }

  if (!config.publishToInstagram) {
    return {
      packageId: script.id,
      pathUsed: pathChoice,
      videoPath,
      videoUrl,
      scriptMarkdown: scriptMd,
      status: 'rendered',
      needsManualRecording: false,
      errors,
    };
  }

  if (config.dryRun || process.env['DRY_RUN'] === 'true') {
    return {
      packageId: script.id,
      pathUsed: pathChoice,
      videoPath,
      videoUrl,
      status: 'queued',
      needsManualRecording: false,
      errors,
    };
  }

  try {
    const uploadResult = await withUploadRetry(
      () =>
        uploadToSocial({
          platforms: ['instagram'],
          mediaType: 'reel',
          mediaUrls: [videoPath!],
          caption: `${script.caption}\n\n${script.hashtags.join(' ')}`,
          hashtags: script.hashtags,
        }),
      `reel-${script.id}`,
    );

    const igResult = uploadResult.perPlatformResults.find((r) => r.platform === 'instagram');
    return {
      packageId: script.id,
      pathUsed: pathChoice,
      videoPath,
      videoUrl,
      scriptMarkdown: scriptMd,
      uploadId: uploadResult.uploadId,
      publishedUrl: igResult?.socialUrl,
      publishedAt: new Date().toISOString(),
      status: uploadResult.ok ? 'published' : 'queued',
      needsManualRecording: false,
      errors,
    };
  } catch (err) {
    errors.push(`Upload: ${String(err)}`);
    return {
      packageId: script.id,
      pathUsed: pathChoice,
      videoPath,
      videoUrl,
      status: 'failed',
      needsManualRecording: false,
      errors,
    };
  }
};
