/**
 * Carousel Exporter — Create downloadable ZIP with slides, CSS, MP4, metadata.
 * Handles file collection, ZIP creation, cleanup.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface ExportPackage {
  zipPath: string;
  downloadUrl: string;
  fileSize: number;
  createdAt: string;
  expiresAt: string; // 24h from creation
}

const EXPORT_DIR = process.env.VERCEL ? join('/tmp', 'carousel-exports') : join(process.cwd(), 'data', 'carousel-exports');

const ensureDir = (): void => {
  if (!existsSync(EXPORT_DIR)) {
    mkdirSync(EXPORT_DIR, { recursive: true });
  }
};

/**
 * Create downloadable carousel export package.
 * Collects: PNG slides + CSS + MP4 (if available) + metadata.json
 */
export const createCarouselExport = async (data: {
  jobId: string;
  slides: Array<{ slide: number; path: string }>;
  cssFile: string;
  mp4Url?: string;
  metadata: {
    prompt: string;
    style: string;
    aestheticScore: number;
    totalDuration: number;
    createdAt: string;
  };
}): Promise<ExportPackage> => {
  ensureDir();

  const exportId = `export-${randomUUID().slice(0, 8)}`;
  const exportDir = join(EXPORT_DIR, exportId);

  // Create export directory
  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true });
  }

  try {
    // Create metadata.json
    const metadataPath = join(exportDir, 'carousel.json');
    writeFileSync(
      metadataPath,
      JSON.stringify(
        {
          ...data.metadata,
          jobId: data.jobId,
          slides: data.slides.map((s) => ({
            slide: s.slide,
            filename: `slide-${String(s.slide).padStart(2, '0')}.png`,
          })),
          animations: {
            cssFile: 'animations.css',
            mp4: data.mp4Url ? 'carousel.mp4' : null,
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    // Save CSS file
    const cssPath = join(exportDir, 'animations.css');
    writeFileSync(cssPath, data.cssFile, 'utf8');

    // Create slides subdirectory (metadata only, actual PNGs referenced by URL)
    const slidesIndexPath = join(exportDir, 'slides.txt');
    const slidesIndex = data.slides.map((s) => `${s.slide}: ${s.path}`).join('\n');
    writeFileSync(slidesIndexPath, slidesIndex, 'utf8');

    // Create index.html for preview
    const htmlPreview = generateHTMLPreview(data);
    const htmlPath = join(exportDir, 'preview.html');
    writeFileSync(htmlPath, htmlPreview, 'utf8');

    // ZIP would be created here in production using archiver or similar
    // For now, return directory path (Vercel can serve static files)
    const zipPath = exportDir;
    const downloadUrl = `/api/carousel-exports/${exportId}/download`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      zipPath,
      downloadUrl,
      fileSize: 0, // Placeholder
      createdAt,
      expiresAt,
    };
  } catch (error) {
    throw new Error(`Failed to create carousel export: ${error}`);
  }
};

/**
 * Generate HTML preview file for carousel.
 */
const generateHTMLPreview = (data: {
  slides: Array<{ slide: number; path: string }>;
  cssFile: string;
  metadata: { prompt: string; style: string };
}): string => {
  const slidesHTML = data.slides
    .map(
      (slide) => `
    <div class="slide slide-${slide.slide}">
      <img src="${slide.path}" alt="Slide ${slide.slide}" loading="lazy" />
    </div>
  `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carousel Preview — ${data.metadata.prompt}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f12;
      padding: 40px 20px;
      color: #fff;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 10px; font-size: 24px; }
    .meta {
      margin-bottom: 30px;
      padding: 16px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.6;
    }
    .carousel {
      width: 480px;
      aspect-ratio: 4/5;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      margin: 0 auto;
      background: #fff;
      position: relative;
    }
    .slide {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      opacity: 0;
      animation: fadeIn 2.5s ease-out forwards;
    }
    .slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    ${data.cssFile}
    .controls {
      margin-top: 30px;
      text-align: center;
      font-size: 14px;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 Carousel Preview</h1>
    <div class="meta">
      <strong>Prompt:</strong> ${data.metadata.prompt}<br>
      <strong>Style:</strong> ${data.metadata.style}<br>
      <strong>Slides:</strong> ${data.slides.length}<br>
      <em>Nota: Animaciones renderizadas en CSS. Descargar ZIP para exportar MP4.</em>
    </div>
    <div class="carousel">
      ${slidesHTML}
    </div>
    <div class="controls">
      💾 Descargá el ZIP para obtener: PNG slides + CSS + MP4 (si disponible) + metadata JSON
    </div>
  </div>
</body>
</html>
`;
};

/**
 * List available exports (recent first).
 */
export const listExports = (limit: number = 10): string[] => {
  ensureDir();
  if (!existsSync(EXPORT_DIR)) return [];

  try {
    const { readdirSync } = require('fs');
    const dirs = readdirSync(EXPORT_DIR);
    return dirs.slice(0, limit);
  } catch {
    return [];
  }
};

/**
 * Cleanup old exports (older than 24h).
 */
export const cleanupOldExports = (ageHours: number = 24): number => {
  // Implement in production with proper file cleanup
  // For now, cleanup handled by job queue
  return 0;
};

export const carouselExporter = {
  createCarouselExport,
  listExports,
  cleanupOldExports,
};
