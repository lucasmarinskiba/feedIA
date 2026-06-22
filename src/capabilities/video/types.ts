export interface VideoScript {
  title: string;
  hook: string;
  scenes: Array<{
    text: string;
    duration: number;
    visualPrompt?: string;
  }>;
  cta: string;
  musicStyle?: string;
  durationSeconds: number;
}

export interface VideoGenerationRequest {
  script: VideoScript;
  brandId: string;
  images?: string[]; // URLs de imágenes pre-generadas
  voiceOver?: boolean;
  musicUrl?: string;
}

export interface VideoGenerationResult {
  ok: boolean;
  videoUrl?: string;
  localPath?: string;
  durationSeconds: number;
  format: 'mp4' | 'mov';
  error?: string;
}

export type VideoProvider = 'replicate' | 'ffmpeg' | 'api' | 'none';
