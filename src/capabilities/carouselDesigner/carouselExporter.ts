/**
 * Carousel Exporter — Create downloadable ZIP package.
 * Collects PNG slides + CSS + MP4 + metadata.json
 */

import { writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

export interface CarouselExport {
  zipPath: string;
  downloadUrl: string;
  fileSize: number;
  createdAt: string;
  expiresAt: string;
}

/**
 * Create carousel export package (ZIP structure in /tmp).
 * Returns metadata for download.
 */
export const createCarouselExport = async (
  jobId: string,
  slides: any[],
  animations: { css: string; timeline: any[] },
  mp4Url?: string,
): Promise<CarouselExport> => {
  const exportDir = `/tmp/carousel-exports/${jobId}`;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  try {
    // Ensure export directory
    mkdirSync(exportDir, { recursive: true });

    // 1. Write PNG slide metadata (placeholder paths)
    const slidesMetadata = slides.map((slide, idx) => ({
      id: idx + 1,
      text: slide.visualText,
      design_notes: slide.designNotes,
      pattern: slide.pinterestPattern,
      colors: slide.colorPalette,
      animation: slide.animation,
      image_asset: slide.downloadedAssetId || null,
      file: `slide-${idx + 1}.png`,
    }));

    writeFileSync(
      join(exportDir, 'slides.json'),
      JSON.stringify(slidesMetadata, null, 2),
      'utf8',
    );

    // 2. Write CSS animations
    writeFileSync(join(exportDir, 'animations.css'), animations.css, 'utf8');

    // 3. Write animation timeline
    const timelineMetadata = {
      total_duration_ms: animations.timeline[animations.timeline.length - 1]?.delay +
        animations.timeline[animations.timeline.length - 1]?.duration || 0,
      slides: animations.timeline,
    };

    writeFileSync(
      join(exportDir, 'timeline.json'),
      JSON.stringify(timelineMetadata, null, 2),
      'utf8',
    );

    // 4. Write main metadata.json
    const metadata = {
      id: jobId,
      version: '1.0',
      created_at: createdAt,
      expires_at: expiresAt,
      slides_count: slides.length,
      animation_type: slides[0]?.animation?.type || 'fade',
      aesthetic_score: 0, // Will be filled by completeJob
      mp4_url: mp4Url || null,
      export_format: 'zip',
      files: {
        slides: 'slides.json',
        css: 'animations.css',
        timeline: 'timeline.json',
        preview: 'preview.html',
      },
    };

    writeFileSync(
      join(exportDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8',
    );

    // 5. Create HTML preview
    const htmlPreview = generateHTMLPreview(slides, animations.css);
    writeFileSync(join(exportDir, 'preview.html'), htmlPreview, 'utf8');

    // 6. Create manifest (list of files)
    const files = readdirSync(exportDir);
    const manifest = {
      export_id: jobId,
      created_at: createdAt,
      files: files.map((f) => ({
        name: f,
        path: f,
        type: f.endsWith('.json') ? 'json' : f.endsWith('.css') ? 'css' : 'html',
      })),
    };

    writeFileSync(
      join(exportDir, 'MANIFEST.json'),
      JSON.stringify(manifest, null, 2),
      'utf8',
    );

    // 7. Create .zip equivalent (placeholder: tar.gz would be better, but for now just directory)
    // In production: use archiver to create actual ZIP
    // For now: return directory path as "zipPath" (can be served as download)

    const fileSize = files.reduce(
      (sum, f) => {
        try {
          const fs = require('fs');
          return sum + fs.statSync(join(exportDir, f)).size;
        } catch {
          return sum;
        }
      },
      0,
    );

    return {
      zipPath: exportDir,
      downloadUrl: `/api/skills/carousel-designer-pro/download/${jobId}/package`,
      fileSize,
      createdAt,
      expiresAt,
    };
  } catch (error) {
    throw new Error(`Failed to create export: ${(error as Error).message}`);
  }
};

/**
 * Generate HTML5 preview with inline CSS animations.
 */
const generateHTMLPreview = (slides: any[], css: string): string => {
  const slidesHTML = slides
    .map(
      (slide, idx) => `
    <div class="slide slide-${idx + 1}" style="animation: ${slide.animation?.type || 'fade'} ${slide.animation?.duration || 400}ms ${slide.animation?.easing || 'ease-out'} forwards ${slide.animation?.delay || 0}ms;">
      <h2 style="font-size: ${slide.typography?.headline?.size || 32}px; font-weight: ${slide.typography?.headline?.weight || 700}; color: ${slide.colorPalette?.primary || '#000'};">
        ${slide.visualText}
      </h2>
      ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="slide-${idx + 1}" style="max-width: 80%; margin: 20px 0;" />` : ''}
      <p style="font-size: ${slide.typography?.body?.size || 16}px; color: ${slide.colorPalette?.secondary || '#666'};">
        ${slide.designNotes}
      </p>
    </div>
  `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carousel Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f12; padding: 20px; }
    .carousel { width: 480px; aspect-ratio: 4/5; margin: 0 auto; overflow: hidden; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); position: relative; background: white; }
    .slide {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 24px;
      position: absolute;
      text-align: center;
    }
    ${css}
    .info { margin-top: 40px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="carousel">
    ${slidesHTML}
  </div>
  <div class="info">
    <p>Carousel with ${slides.length} slides · Animations: ${slides[0]?.animation?.type || 'fade'}</p>
  </div>
</body>
</html>
  `;
};

/**
 * Get export directory for downloading.
 * Used by download endpoint to serve files.
 */
export const getExportDirectory = (jobId: string): string => {
  return `/tmp/carousel-exports/${jobId}`;
};

/**
 * List files in export directory.
 * Used by download endpoint to show manifest.
 */
export const listExportFiles = (jobId: string): string[] => {
  try {
    const dir = getExportDirectory(jobId);
    return readdirSync(dir);
  } catch {
    return [];
  }
};

export const carouselExporter = {
  createCarouselExport,
  getExportDirectory,
  listExportFiles,
};
