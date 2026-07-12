import Sharp from 'sharp';
import { promises as fs } from 'fs';

export interface PhotoEditRequest {
  inputPath: string;
  outputPath: string;
  operations: PhotoOperation[];
}

export interface PhotoOperation {
  type: 'crop' | 'resize' | 'filter' | 'brightness' | 'contrast' | 'saturation' | 'blur' | 'rotate' | 'text-overlay';
  params: Record<string, unknown>;
}

interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResizeParams {
  width: number;
  height: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

interface FilterParams {
  name: 'grayscale' | 'sepia' | 'vintage' | 'cool' | 'warm';
}

interface BrightnessParams {
  value: number;
}

interface ContrastParams {
  value: number;
}

interface SaturationParams {
  value: number;
}

interface BlurParams {
  radius: number;
}

interface RotateParams {
  degrees: number;
  background?: string;
}

interface TextOverlayParams {
  text: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
  font?: string;
}

export const photoEditingService = {
  async crop(inputPath: string, outputPath: string, params: CropParams): Promise<void> {
    await Sharp(inputPath)
      .extract(params)
      .toFile(outputPath);
  },

  async resize(inputPath: string, outputPath: string, params: ResizeParams): Promise<void> {
    await Sharp(inputPath)
      .resize(params.width, params.height, {
        fit: params.fit || 'cover',
        position: 'center',
      })
      .toFile(outputPath);
  },

  async filter(inputPath: string, outputPath: string, params: FilterParams): Promise<void> {
    const sharp = Sharp(inputPath);

    switch (params.name) {
      case 'grayscale':
        await sharp.grayscale().toFile(outputPath);
        break;
      case 'sepia':
        await sharp
          .modulate({ saturation: 0.5 })
          .tint({ r: 112, g: 66, b: 20 })
          .toFile(outputPath);
        break;
      case 'vintage':
        await sharp
          .modulate({ saturation: 0.7, brightness: 1.1 })
          .toFile(outputPath);
        break;
      case 'cool':
        await sharp
          .modulate({ lightness: 0.05 })
          .tint({ r: 180, g: 210, b: 240 })
          .toFile(outputPath);
        break;
      case 'warm':
        await sharp
          .modulate({ lightness: 0.05 })
          .tint({ r: 250, g: 200, b: 150 })
          .toFile(outputPath);
        break;
      default:
        await sharp.toFile(outputPath);
    }
  },

  async brightness(inputPath: string, outputPath: string, params: BrightnessParams): Promise<void> {
    await Sharp(inputPath)
      .modulate({ brightness: params.value })
      .toFile(outputPath);
  },

  async contrast(inputPath: string, outputPath: string, params: ContrastParams): Promise<void> {
    await Sharp(inputPath)
      .modulate({ saturation: params.value })
      .toFile(outputPath);
  },

  async saturation(inputPath: string, outputPath: string, params: SaturationParams): Promise<void> {
    await Sharp(inputPath)
      .modulate({ saturation: params.value })
      .toFile(outputPath);
  },

  async blur(inputPath: string, outputPath: string, params: BlurParams): Promise<void> {
    await Sharp(inputPath)
      .blur(params.radius)
      .toFile(outputPath);
  },

  async rotate(inputPath: string, outputPath: string, params: RotateParams): Promise<void> {
    await Sharp(inputPath)
      .rotate(params.degrees, {
        background: params.background || '#ffffff',
      })
      .toFile(outputPath);
  },

  async textOverlay(inputPath: string, outputPath: string, params: TextOverlayParams): Promise<void> {
    const svgText = `
      <svg width="2000" height="2000">
        <text x="${params.x * 20}" y="${params.y * 20}" font-size="${params.fontSize * 20}" fill="${params.color}" font-family="${params.font || 'Arial'}">
          ${params.text}
        </text>
      </svg>
    `;
    const svgBuffer = Buffer.from(svgText);

    await Sharp(inputPath)
      .composite([
        {
          input: svgBuffer,
          top: params.y,
          left: params.x,
        },
      ])
      .toFile(outputPath);
  },

  async processOperations(req: PhotoEditRequest): Promise<void> {
    let current = req.inputPath;

    for (let i = 0; i < req.operations.length; i++) {
      const op = req.operations[i];
      const intermediate = i === req.operations.length - 1 ? req.outputPath : `/tmp/feedia-photo-${Date.now()}-${i}.png`;

      switch (op.type) {
        case 'crop':
          await this.crop(current, intermediate, op.params as CropParams);
          break;
        case 'resize':
          await this.resize(current, intermediate, op.params as ResizeParams);
          break;
        case 'filter':
          await this.filter(current, intermediate, op.params as FilterParams);
          break;
        case 'brightness':
          await this.brightness(current, intermediate, op.params as BrightnessParams);
          break;
        case 'contrast':
          await this.contrast(current, intermediate, op.params as ContrastParams);
          break;
        case 'saturation':
          await this.saturation(current, intermediate, op.params as SaturationParams);
          break;
        case 'blur':
          await this.blur(current, intermediate, op.params as BlurParams);
          break;
        case 'rotate':
          await this.rotate(current, intermediate, op.params as RotateParams);
          break;
        case 'text-overlay':
          await this.textOverlay(current, intermediate, op.params as TextOverlayParams);
          break;
      }

      if (intermediate !== req.outputPath && current !== req.inputPath) {
        await fs.unlink(current);
      }
      current = intermediate;
    }
  },
};
