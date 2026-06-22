import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';
import type { VideoGenerationRequest, VideoGenerationResult, VideoProvider } from './types.js';

export const detectProvider = (): VideoProvider => {
  if (process.env.VIDEO_PROVIDER) return process.env.VIDEO_PROVIDER as VideoProvider;
  if (env.imageGen.replicateToken) return 'replicate';
  return 'none';
};

/**
 * Genera un video para Reel usando el proveedor configurado.
 * Fallback: FFmpeg slideshow si hay imágenes y FFmpeg está instalado.
 */
export const generateVideo = async (req: VideoGenerationRequest): Promise<VideoGenerationResult> => {
  const provider = detectProvider();

  if (provider === 'replicate' && env.imageGen.replicateToken) {
    return generateViaReplicate(req);
  }

  if (provider === 'ffmpeg' || (req.images && req.images.length > 0)) {
    return generateViaFFmpeg(req);
  }

  if (provider === 'api' && process.env.VIDEO_API_URL) {
    return generateViaExternalApi(req);
  }

  log.error('No video provider configured. Set VIDEO_PROVIDER or configure Replicate/FFmpeg.');
  return { ok: false, durationSeconds: 0, format: 'mp4', error: 'No video provider configured' };
};

async function generateViaReplicate(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  try {
    const token = env.imageGen.replicateToken;
    // Use Replicate to generate video from first image or text
    const imageUrl = req.images?.[0];

    if (!imageUrl) {
      return {
        ok: false,
        durationSeconds: 0,
        format: 'mp4',
        error: 'Replicate video requires a seed image. Generate images first.',
      };
    }

    const predictionRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        version: '3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
        input: {
          image: imageUrl,
          frames: 24,
          fps: 6,
          motion_bucket_id: 127,
          cond_aug: 0.02,
        },
      }),
    });

    if (!predictionRes.ok) {
      throw new Error(`Replicate prediction failed: ${await predictionRes.text()}`);
    }

    const prediction = (await predictionRes.json()) as {
      id: string;
      status: string;
      output?: string;
    };

    // Poll for completion
    let output = prediction.output;
    let attempts = 0;
    while (!output && attempts < 60) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
      });
      const pollData = (await pollRes.json()) as { status: string; output?: string; error?: string };
      if (pollData.status === 'succeeded') {
        output = pollData.output;
        break;
      }
      if (pollData.status === 'failed') {
        throw new Error(`Replicate generation failed: ${pollData.error ?? 'unknown'}`);
      }
      attempts++;
    }

    if (!output) {
      throw new Error('Replicate generation timed out');
    }

    log.info(`Video generated via Replicate: ${output}`);
    return { ok: true, videoUrl: output, durationSeconds: req.script.durationSeconds, format: 'mp4' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Replicate video error: ${msg}`);
    return { ok: false, durationSeconds: 0, format: 'mp4', error: msg };
  }
}

async function generateViaFFmpeg(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  try {
    // Check if ffmpeg is available
    const { execSync } = await import('node:child_process');
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
    } catch {
      return {
        ok: false,
        durationSeconds: 0,
        format: 'mp4',
        error: 'FFmpeg not installed. Install ffmpeg or use Replicate.',
      };
    }

    const { writeFileSync, existsSync, mkdirSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const tmpDir = resolve('data/runtime/video-tmp');
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

    const outputPath = resolve(tmpDir, `reel-${Date.now()}.mp4`);
    const images = req.images ?? [];

    if (images.length === 0) {
      return { ok: false, durationSeconds: 0, format: 'mp4', error: 'FFmpeg slideshow requires images' };
    }

    // Create a concat file for ffmpeg
    const durationPerImage = req.script.durationSeconds / images.length;
    const concatLines = images.map((img) => `file '${img}'\nduration ${durationPerImage}`).join('\n');
    const concatPath = resolve(tmpDir, `concat-${Date.now()}.txt`);
    writeFileSync(concatPath, concatLines);

    // Run ffmpeg
    const filter = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v]`;
    const cmd = `ffmpeg -f concat -safe 0 -i "${concatPath}" -vf "${filter}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -y "${outputPath}"`;
    execSync(cmd, { stdio: 'ignore', timeout: 120000 });

    log.info(`FFmpeg video created: ${outputPath}`);
    return { ok: true, localPath: outputPath, durationSeconds: req.script.durationSeconds, format: 'mp4' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`FFmpeg video error: ${msg}`);
    return { ok: false, durationSeconds: 0, format: 'mp4', error: msg };
  }
}

async function generateViaExternalApi(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  try {
    const apiUrl = process.env.VIDEO_API_URL!;
    const apiKey = process.env.VIDEO_API_KEY;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: req.script,
        images: req.images,
        duration: req.script.durationSeconds,
      }),
    });
    if (!res.ok) throw new Error(`External API error: ${await res.text()}`);
    const data = (await res.json()) as { videoUrl?: string; duration?: number };
    return {
      ok: true,
      videoUrl: data.videoUrl,
      durationSeconds: data.duration ?? req.script.durationSeconds,
      format: 'mp4',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, durationSeconds: 0, format: 'mp4', error: msg };
  }
}
