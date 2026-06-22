import type { BrandProfile } from '../../config/types.js';
import type { CarruselSlide } from '../content/carrusel.js';
import type { StorySlide } from '../content/stories.js';

export interface RenderTheme {
  bg: string;
  fg: string;
  accent: string;
  font: string;
  estilo: string;
}

const themeFromBrand = (brand: BrandProfile): RenderTheme => {
  const palette = brand.visual.palette;
  return {
    bg: palette[0] ?? '#0a0a0a',
    fg: palette[1] ?? '#f5f5f5',
    accent: palette[2] ?? '#ff5f1f',
    font: brand.visual.typography[0] ?? 'Inter, system-ui, sans-serif',
    estilo: brand.visual.style,
  };
};

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const wrapText = (text: string, maxCharsPerLine: number, maxLines: number): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current.trim());
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last && last.length > maxCharsPerLine - 1) {
      lines[maxLines - 1] = last.slice(0, maxCharsPerLine - 1) + '…';
    }
  }
  return lines;
};

export interface SlideRoleConfig {
  bgFn: (theme: RenderTheme, idx: number, total: number) => string;
  fgFn: (theme: RenderTheme) => string;
  showAccentBar: boolean;
}

const roleStyles: Record<CarruselSlide['rolEnNarrativa'], SlideRoleConfig> = {
  gancho: {
    bgFn: (t): string => t.accent,
    fgFn: (t): string => t.bg,
    showAccentBar: false,
  },
  tension: {
    bgFn: (t): string => t.bg,
    fgFn: (t): string => t.fg,
    showAccentBar: true,
  },
  desarrollo: {
    bgFn: (t): string => t.bg,
    fgFn: (t): string => t.fg,
    showAccentBar: true,
  },
  climax: {
    bgFn: (t): string => t.fg,
    fgFn: (t): string => t.bg,
    showAccentBar: false,
  },
  resolucion: {
    bgFn: (t): string => t.bg,
    fgFn: (t): string => t.fg,
    showAccentBar: true,
  },
  cta: {
    bgFn: (t): string => t.accent,
    fgFn: (t): string => t.bg,
    showAccentBar: false,
  },
};

export const renderCarruselSlideSvg = (slide: CarruselSlide, brand: BrandProfile, total: number): string => {
  const theme = themeFromBrand(brand);
  const role = roleStyles[slide.rolEnNarrativa] ?? roleStyles.desarrollo;
  if (!role) throw new Error(`role inesperado: ${slide.rolEnNarrativa}`);
  const bg = role.bgFn(theme, slide.numero, total);
  const fg = role.fgFn(theme);
  const titleLines = wrapText(slide.titulo, 22, 4);
  const bodyLines = wrapText(slide.cuerpo, 38, 8);
  const titleY = 280;
  const bodyStartY = titleY + titleLines.length * 80 + 60;

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="80" y="${titleY + i * 80}" font-size="68" font-weight="800" fill="${fg}" font-family="${theme.font}">${escapeXml(line)}</text>`,
    )
    .join('');
  const bodySvg = bodyLines
    .map(
      (line, i) =>
        `<text x="80" y="${bodyStartY + i * 50}" font-size="36" font-weight="400" fill="${fg}" opacity="0.85" font-family="${theme.font}">${escapeXml(line)}</text>`,
    )
    .join('');

  const accentBar = role.showAccentBar
    ? `<rect x="80" y="190" width="120" height="8" rx="4" fill="${theme.accent}"/>`
    : '';
  const pageNumber = `<text x="80" y="140" font-size="28" font-weight="600" fill="${fg}" opacity="0.5" font-family="${theme.font}">${slide.numero} / ${total}</text>`;
  const brandTag = `<text x="1000" y="1330" text-anchor="end" font-size="24" font-weight="500" fill="${fg}" opacity="0.5" font-family="${theme.font}">@${escapeXml(brand.name)}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <rect width="1080" height="1350" fill="${bg}"/>
  ${accentBar}
  ${pageNumber}
  ${titleSvg}
  ${bodySvg}
  ${brandTag}
</svg>`;
};

export const renderStoryFrameSvg = (story: StorySlide, brand: BrandProfile): string => {
  const theme = themeFromBrand(brand);
  const lines = wrapText(story.textoPrincipal, 24, 6);
  const startY = 700 - lines.length * 35;

  const stickerSvg = story.sticker
    ? `<rect x="120" y="1350" width="840" height="220" rx="32" fill="${theme.fg}" opacity="0.9"/>
       <text x="540" y="1430" text-anchor="middle" font-size="32" fill="${theme.bg}" font-family="${theme.font}" font-weight="600">${escapeXml(story.sticker.tipo.toUpperCase())}</text>
       <text x="540" y="1490" text-anchor="middle" font-size="28" fill="${theme.bg}" font-family="${theme.font}">${escapeXml(story.sticker.payload.slice(0, 60))}</text>`
    : '';

  const lineSvg = lines
    .map(
      (line, i) =>
        `<text x="540" y="${startY + i * 80}" text-anchor="middle" font-size="64" font-weight="800" fill="${theme.fg}" font-family="${theme.font}">${escapeXml(line)}</text>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <linearGradient id="bg-${story.orden}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg}"/>
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0.3"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg-${story.orden})"/>
  <text x="540" y="180" text-anchor="middle" font-size="28" fill="${theme.fg}" opacity="0.6" font-family="${theme.font}">@${escapeXml(brand.name)}</text>
  ${lineSvg}
  ${stickerSvg}
</svg>`;
};

export const renderReelStoryboardSvg = (
  beats: Array<{ segundo: number; textoEnPantalla: string; bRoll: string }>,
  brand: BrandProfile,
): string[] => {
  const theme = themeFromBrand(brand);
  return beats.map((beat) => {
    const textLines = wrapText(beat.textoEnPantalla, 22, 4);
    const startY = 780 - textLines.length * 40;
    const lineSvg = textLines
      .map(
        (line, i) =>
          `<text x="540" y="${startY + i * 80}" text-anchor="middle" font-size="60" font-weight="900" fill="${theme.fg}" font-family="${theme.font}" stroke="${theme.bg}" stroke-width="6" paint-order="stroke">${escapeXml(line)}</text>`,
      )
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <rect width="1080" height="1920" fill="${theme.bg}"/>
  <rect x="0" y="0" width="1080" height="1920" fill="${theme.accent}" opacity="0.08"/>
  <text x="60" y="120" font-size="32" fill="${theme.fg}" opacity="0.5" font-family="${theme.font}" font-weight="600">${beat.segundo}s</text>
  <rect x="60" y="1700" width="960" height="160" rx="20" fill="${theme.fg}" opacity="0.08"/>
  <text x="80" y="1760" font-size="26" fill="${theme.fg}" opacity="0.6" font-family="${theme.font}">B-roll:</text>
  <text x="80" y="1810" font-size="28" fill="${theme.fg}" opacity="0.85" font-family="${theme.font}">${escapeXml(beat.bRoll.slice(0, 60))}</text>
  ${lineSvg}
</svg>`;
  });
};

export const svgToDataUrl = (svg: string): string => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
