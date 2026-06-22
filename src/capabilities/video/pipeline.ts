import { log } from '../../agent/logger.js';
import { generateImage } from '../../integrations/imageGen.js';
import { generateVideo } from './generator.js';
import type { VideoScript, VideoGenerationResult } from './types.js';

export interface ReelPipelineInput {
  topic: string;
  brandId: string;
  targetDuration?: number;
  style?: string;
  generateImages?: boolean;
}

/**
 * Pipeline completo: script → imágenes → video → entrega
 */
export const runReelPipeline = async (input: ReelPipelineInput): Promise<VideoGenerationResult> => {
  // Step 1: Generate script (using existing LLM capabilities)
  const script = await generateScript(input);

  // Step 2: Generate images for each scene if needed
  const images: string[] = [];
  if (input.generateImages !== false) {
    for (const scene of script.scenes) {
      if (scene.visualPrompt) {
        try {
          const img = await generateImage({
            prompt: scene.visualPrompt,
            aspectRatio: '9:16',
            style: input.style,
          });
          if (img.urls && img.urls.length > 0) images.push(...img.urls);
        } catch (e) {
          log.warn(`Failed to generate image for scene: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  // Step 3: Generate video
  const result = await generateVideo({
    script,
    brandId: input.brandId,
    images: images.length > 0 ? images : undefined,
  });

  return result;
};

async function generateScript(input: ReelPipelineInput): Promise<VideoScript> {
  // For now, construct a simple script from the topic
  // In production, this should call the LLM to generate the script
  const duration = input.targetDuration ?? 30;
  const scenesCount = Math.max(3, Math.floor(duration / 10));

  return {
    title: input.topic,
    hook: `Descubrí el secreto de ${input.topic}`,
    scenes: Array.from({ length: scenesCount }).map((_, i) => ({
      text: `Escena ${i + 1}: ${input.topic}`,
      duration: duration / scenesCount,
      visualPrompt: `${input.topic}, estilo ${input.style ?? 'moderno'}, escena ${i + 1}, vertical 9:16, alta calidad`,
    })),
    cta: 'Seguime para más contenido como este',
    musicStyle: input.style ?? 'trending',
    durationSeconds: duration,
  };
}
