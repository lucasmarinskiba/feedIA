import { execSync } from 'child_process';
import { promises as fs } from 'fs';

export interface VideoEditRequest {
  inputPath: string;
  outputPath: string;
  operations: VideoOperation[];
}

export interface VideoOperation {
  type: 'trim' | 'cut' | 'speed' | 'rotate' | 'filter' | 'overlay' | 'transition';
  params: Record<string, unknown>;
}

interface TrimParams {
  startSec: number;
  endSec: number;
}

interface CutParams {
  cuts: Array<{ start: number; end: number }>;
}

interface SpeedParams {
  factor: number;
}

interface RotateParams {
  degrees: number;
}

interface FilterParams {
  name: string;
  intensity?: number;
}

interface OverlayParams {
  imagePath: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
}

interface TransitionParams {
  type: 'fade' | 'slide' | 'dissolve';
  duration: number;
}

export const videoEditingService = {
  async trim(inputPath: string, outputPath: string, params: TrimParams): Promise<void> {
    const cmd = `ffmpeg -i "${inputPath}" -ss ${params.startSec} -to ${params.endSec} -c:v libx264 -preset fast -c:a aac "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
  },

  async cut(inputPath: string, outputPath: string, params: CutParams): Promise<void> {
    const filterComplex = params.cuts.map((c, i) => `[0]trim=${c.start}:${c.end}[c${i}]`).join(';');
    const concat = params.cuts.map((_, i) => `[c${i}]`).join('') + `concat=n=${params.cuts.length}[v]`;
    const cmd = `ffmpeg -i "${inputPath}" -filter_complex "${filterComplex};${concat}" -map "[v]" -c:v libx264 -preset fast "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
  },

  async speed(inputPath: string, outputPath: string, params: SpeedParams): Promise<void> {
    const filter = params.factor < 1 ? `setpts=${1 / params.factor}*PTS` : `setpts=${1 / params.factor}*PTS`;
    const cmd = `ffmpeg -i "${inputPath}" -filter:v "${filter}" -filter:a "atempo=${params.factor}" -c:v libx264 -preset fast "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
  },

  async rotate(inputPath: string, outputPath: string, params: RotateParams): Promise<void> {
    const rotations: Record<number, string> = {
      90: 'transpose=1',
      180: 'hflip,vflip',
      270: 'transpose=2',
    };
    const filter = rotations[params.degrees] || 'transpose=1';
    const cmd = `ffmpeg -i "${inputPath}" -vf "${filter}" -c:v libx264 -preset fast -c:a copy "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
  },

  async filter(inputPath: string, outputPath: string, params: FilterParams): Promise<void> {
    const filters: Record<string, string> = {
      grayscale: 'format=gray',
      sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
      brightness: `eq=brightness=${(params.intensity ?? 0.5) * 2}`,
      contrast: `eq=contrast=${(params.intensity ?? 0.5) * 2}`,
      blur: `boxblur=${params.intensity ?? 1}`,
      sharpen: `unsharp=5:5:${(params.intensity ?? 0.5) * 2}`,
    };
    const filterStr = filters[params.name] || filters.brightness;
    const cmd = `ffmpeg -i "${inputPath}" -vf "${filterStr}" -c:v libx264 -preset fast -c:a copy "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
  },

  async overlay(inputPath: string, outputPath: string, params: OverlayParams): Promise<void> {
    const posMap: Record<string, string> = {
      'top-left': 'x=10:y=10',
      'top-right': `x=W-w-10:y=10`,
      'bottom-left': `x=10:y=H-h-10`,
      'bottom-right': `x=W-w-10:y=H-h-10`,
      'center': `x=(W-w)/2:y=(H-h)/2`,
    };
    const pos = posMap[params.position] || posMap.center;
    const opacity = params.opacity !== undefined ? `:alpha=${params.opacity}` : '';
    const cmd = `ffmpeg -i "${inputPath}" -i "${params.imagePath}" -filter_complex "[0][1]overlay=${pos}${opacity}[v]" -map "[v]" -map "0:a" -c:v libx264 -preset fast -c:a copy "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
  },

  async transition(inputPath: string, outputPath: string, params: TransitionParams): Promise<void> {
    const transitionFilters: Record<string, string> = {
      fade: `format=yuva420p,fade=t=out:st=${0}:d=${params.duration}`,
      slide: `hstack=shortest=1`,
      dissolve: `xfade=transition=dissolve:duration=${params.duration}`,
    };
    const filter = transitionFilters[params.type] || transitionFilters.fade;
    const cmd = `ffmpeg -i "${inputPath}" -vf "${filter}" -c:v libx264 -preset fast -c:a copy "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
  },

  async processOperations(req: VideoEditRequest): Promise<void> {
    let current = req.inputPath;
    for (let i = 0; i < req.operations.length; i++) {
      const op = req.operations[i];
      if (!op) continue;
      const intermediate = i === req.operations.length - 1 ? req.outputPath : `/tmp/feedia-edit-${Date.now()}-${i}.mp4`;

      const params = op.params as unknown;
      switch (op.type) {
        case 'trim':
          await this.trim(current, intermediate, params as TrimParams);
          break;
        case 'cut':
          await this.cut(current, intermediate, params as CutParams);
          break;
        case 'speed':
          await this.speed(current, intermediate, params as SpeedParams);
          break;
        case 'rotate':
          await this.rotate(current, intermediate, params as RotateParams);
          break;
        case 'filter':
          await this.filter(current, intermediate, params as FilterParams);
          break;
        case 'overlay':
          await this.overlay(current, intermediate, params as OverlayParams);
          break;
        case 'transition':
          await this.transition(current, intermediate, params as TransitionParams);
          break;
      }

      if (intermediate !== req.outputPath && current !== req.inputPath) {
        await fs.unlink(current);
      }
      current = intermediate;
    }
  },
};
