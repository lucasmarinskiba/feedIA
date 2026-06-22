/**
 * Carousel Composer — genera slides de carrusel como SVG (texto vectorial real).
 *
 * Por qué SVG y no imagen-IA: los modelos de imagen (nano-banana/flux) escriben
 * texto ilegible/deformado. Los carruseles pro (estilo Canva) usan texto vectorial
 * nítido. Esto genera slides legibles, con colores de marca, jerarquía correcta,
 * safe-zones respetadas, y foto del usuario embebida en la portada.
 *
 * $0, instantáneo, sin LLM (el texto de cada slide lo arma quien llama).
 * Devuelve cada slide como data URL (image/svg+xml base64) → se ve y se publica.
 */

import { buildValidatedStructure, TEXT_WEIGHTS } from './_carouselViralRules.js';
import { getSpec } from './_canvasSpecs.js';

// Paletas por defecto si la marca no define
const DEFAULT_PALETTES = [
  { bg: '#0B0B0F', fg: '#FFFFFF', accent: '#10F2B0' },
  { bg: '#1A0B2E', fg: '#FFFFFF', accent: '#A855F7' },
  { bg: '#0A1A2F', fg: '#FFFFFF', accent: '#3B82F6' },
];

// Mapea nombres de color comunes (ES) a hex para el accent/bg
const COLOR_MAP = {
  verde: '#10B981',
  'verde menta': '#10F2B0',
  menta: '#10F2B0',
  negro: '#0B0B0F',
  blanco: '#FFFFFF',
  gris: '#6B7280',
  azul: '#3B82F6',
  violeta: '#A855F7',
  morado: '#A855F7',
  rosa: '#EC4899',
  rojo: '#EF4444',
  naranja: '#F59E0B',
  amarillo: '#FBBF24',
  celeste: '#38BDF8',
  dorado: '#D4AF37',
};

const resolveColor = (name) => {
  const n = (name || '').toLowerCase().trim();
  if (/^#[0-9a-f]{3,8}$/i.test(n)) return n;
  return COLOR_MAP[n] || null;
};

// Acepta overrides explícitos (textColor, bgColor) además de brandColors
const buildPalette = (brandColors = [], overrides = {}) => {
  const resolved = (brandColors || []).map(resolveColor).filter(Boolean);
  let base;
  if (resolved.length >= 2) {
    const dark = resolved.find((c) => isDark(c)) || resolved[0];
    const accent = resolved.find((c) => !isDark(c)) || resolved[resolved.length - 1];
    base = { bg: dark, fg: isDark(dark) ? '#FFFFFF' : '#0B0B0F', accent };
  } else if (resolved.length === 1) {
    const c = resolved[0];
    base = isDark(c) ? { bg: c, fg: '#FFFFFF', accent: '#10F2B0' } : { bg: '#0B0B0F', fg: '#FFFFFF', accent: c };
  } else {
    base = DEFAULT_PALETTES[Math.floor(Math.random() * DEFAULT_PALETTES.length)];
  }
  // Overrides explícitos (text/bg/accent)
  const fg = resolveColor(overrides.textColor) || base.fg;
  const bg = resolveColor(overrides.bgColor) || base.bg;
  const accent = resolveColor(overrides.accentColor) || base.accent;
  return { bg, fg, accent };
};

export const isDark = (hex) => {
  const h = hex.replace('#', '');
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16),
    g = parseInt(h.slice(2, 4), 16),
    b = parseInt(h.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 140;
};

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Ancho aprox de un caracter para Inter Bold (ratio relativo al font-size)
const CHAR_W_RATIO = 0.55;

// Estima cuántos caracteres caben en `maxWidthPx` para un `fontSize` dado
const maxCharsForWidth = (fontSize, maxWidthPx) => Math.max(6, Math.floor(maxWidthPx / (fontSize * CHAR_W_RATIO)));

// Wrap por píxeles reales (no chars genéricos)
export const wrapTextPx = (text, fontSize, maxWidthPx) => {
  const max = maxCharsForWidth(fontSize, maxWidthPx);
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const tryLine = (cur + ' ' + w).trim();
    if (tryLine.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = tryLine;
  }
  if (cur) lines.push(cur);
  return lines;
};

// Auto-fit: reduce font-size hasta que (lines × lineH) ≤ maxHeightPx Y ningún line > maxWidth
export const fitText = (text, { maxWidthPx, maxHeightPx, startSize, minSize = 28, maxLines = 8 }) => {
  let size = startSize;
  while (size >= minSize) {
    const lines = wrapTextPx(text, size, maxWidthPx);
    const lineH = size * 1.12;
    const totalH = lines.length * lineH;
    if (lines.length <= maxLines && totalH <= maxHeightPx) return { size, lines, lineH };
    size -= 4;
  }
  // Última opción: truncar
  const lines = wrapTextPx(text, minSize, maxWidthPx).slice(0, maxLines);
  return { size: minSize, lines, lineH: minSize * 1.12 };
};

// Wrap viejo (para slides legacy) — mantener compatibilidad
const wrapText = (text, maxCharsPerLine) => {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxCharsPerLine && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
};

export const tspans = (lines, x, startY, lineH, fill, size, weight = '800', anchor = 'start') =>
  lines
    .map(
      (ln, i) =>
        `<text x="${x}" y="${startY + i * lineH}" fill="${fill}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif">${esc(ln)}</text>`,
    )
    .join('');

/**
 * Genera el SVG de un slide.
 * @param {object} s - { n, role, title, body, total }
 * @param {object} palette - { bg, fg, accent }
 * @param {object} spec - canvas spec
 * @param {string|null} photoDataUrl - foto del usuario (solo portada)
 */
const slideSvg = ({ n, role, title, body, total, brandHandle }, palette, spec, photoDataUrl) => {
  const W = spec?.canvas?.w || 1080;
  const H = spec?.canvas?.h || 1440;
  const ml = spec?.margin?.left || 120;
  const safeTop = spec?.safe?.top || 180;
  const safeBottom = spec?.safe?.bottom || 180;
  const { bg, fg, accent } = palette;

  let inner = '';

  if (role === 'hook') {
    // Portada: foto top + título XXL bottom, AUTO-FIT (nunca sale de safe-zone)
    const textAreaW = W - ml * 2;
    const photoH = photoDataUrl ? Math.round(H * 0.48) : 0;
    const textTop = (photoDataUrl ? photoH : safeTop) + 70;
    const textBottom = H - safeBottom - 90; // espacio para "Deslizá →" + paginación
    const textAreaH = textBottom - textTop;
    const fit = fitText(title || 'Tu título acá', {
      maxWidthPx: textAreaW,
      maxHeightPx: textAreaH,
      startSize: 138,
      minSize: 56,
      maxLines: 5,
    });
    const titleStartY = textTop + fit.size;
    const photo = photoDataUrl
      ? `<image href="${photoDataUrl}" x="0" y="0" width="${W}" height="${photoH}" preserveAspectRatio="xMidYMid slice"/>
         <rect x="0" y="${photoH - 100}" width="${W}" height="${H - photoH + 100}" fill="${bg}"/>
         <rect x="0" y="${photoH - 100}" width="${W}" height="180" fill="url(#grad)"/>`
      : `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
         <circle cx="${W * 0.85}" cy="${H * 0.18}" r="${W * 0.32}" fill="${accent}" opacity="0.18"/>
         <circle cx="${W * 0.12}" cy="${H * 0.85}" r="${W * 0.18}" fill="${accent}" opacity="0.10"/>`;
    inner = `${photo}
      <rect x="${ml}" y="${textTop - 30}" width="120" height="12" rx="6" fill="${accent}"/>
      ${tspans(fit.lines, ml, titleStartY, fit.lineH, fg, fit.size, '900')}
      <text x="${ml}" y="${H - safeBottom + 30}" fill="${accent}" font-size="34" font-weight="900" font-family="Inter, Arial, sans-serif">Deslizá →</text>
      <text x="${W - ml}" y="${H - safeBottom + 30}" fill="${fg}" font-size="26" font-weight="600" text-anchor="end" opacity="0.6" font-family="Inter, Arial, sans-serif">1 / ${total}</text>`;
  } else if (role === 'cta') {
    const textAreaW = W - ml * 2;
    const titleFit = fitText(title || '¿Te sirvió?', {
      maxWidthPx: textAreaW,
      maxHeightPx: 280,
      startSize: 110,
      minSize: 56,
      maxLines: 3,
    });
    const bodyText = body && body.length > 18 ? body : 'Guardalo · compartilo · seguime';
    const bodyFit = fitText(bodyText, {
      maxWidthPx: textAreaW,
      maxHeightPx: 200,
      startSize: 48,
      minSize: 30,
      maxLines: 4,
    });
    const buttonText = body && body.length <= 18 ? body : 'Comentá 👇';
    const centerY = H * 0.42;
    inner = `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      <rect x="0" y="0" width="${W}" height="14" fill="${accent}"/>
      <circle cx="${W / 2}" cy="${H * 0.22}" r="80" fill="${accent}" opacity="0.2"/>
      <text x="${W / 2}" y="${H * 0.23}" fill="${accent}" font-size="80" text-anchor="middle" font-family="Inter, Arial, sans-serif">✦</text>
      ${tspans(titleFit.lines, W / 2, centerY, titleFit.lineH, fg, titleFit.size, '900', 'middle')}
      ${tspans(bodyFit.lines, W / 2, centerY + titleFit.lines.length * titleFit.lineH + 50, bodyFit.lineH, fg, bodyFit.size, '500', 'middle')}
      <rect x="${W / 2 - 240}" y="${H - safeBottom - 130}" width="480" height="100" rx="50" fill="${accent}"/>
      <text x="${W / 2}" y="${H - safeBottom - 65}" fill="${isDark(accent) ? '#fff' : '#0B0B0F'}" font-size="40" font-weight="900" text-anchor="middle" font-family="Inter, Arial, sans-serif">${esc(buttonText)}</text>`;
  } else {
    // Slides intermedios: número + título + cuerpo, AUTO-FIT estricto
    const textAreaW = W - ml * 2;
    const numberY = safeTop + 240;
    // Layout: número (320px) → título → cuerpo → barra → paginación
    const titleTop = numberY + 60;
    const titleMaxH = 280;
    const titleFit = fitText(title || 'Idea clave', {
      maxWidthPx: textAreaW,
      maxHeightPx: titleMaxH,
      startSize: 92,
      minSize: 48,
      maxLines: 3,
    });
    const titleH = titleFit.lines.length * titleFit.lineH;
    const bodyTop = titleTop + titleH + 50;
    const bodyMaxH = H - safeBottom - 80 - bodyTop;
    const bodyFit = fitText(body || '', {
      maxWidthPx: textAreaW,
      maxHeightPx: bodyMaxH,
      startSize: 56,
      minSize: 32,
      maxLines: 8,
    });
    inner = `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      <circle cx="${ml + 90}" cy="${safeTop + 130}" r="80" fill="${accent}" opacity="0.2"/>
      <text x="${ml + 90}" y="${safeTop + 175}" fill="${accent}" font-size="120" font-weight="900" text-anchor="middle" font-family="Inter, Arial, sans-serif">${n - 1}</text>
      <rect x="${ml}" y="${numberY + 20}" width="80" height="6" rx="3" fill="${accent}"/>
      ${tspans(titleFit.lines, ml, titleTop + titleFit.size, titleFit.lineH, fg, titleFit.size, '900')}
      ${bodyFit.lines.length ? tspans(bodyFit.lines, ml, bodyTop + bodyFit.size, bodyFit.lineH, fg, bodyFit.size, '400') : ''}
      <rect x="${ml}" y="${H - safeBottom - 30}" width="${W - ml * 2}" height="4" fill="${accent}" opacity="0.35"/>
      <rect x="${ml}" y="${H - safeBottom - 30}" width="${(W - ml * 2) * (n / total)}" height="4" fill="${accent}"/>
      <text x="${W - ml}" y="${H - safeBottom + 16}" fill="${accent}" font-size="30" font-weight="800" text-anchor="end" font-family="Inter, Arial, sans-serif">${n} / ${total}</text>`;
  }

  const handle = brandHandle
    ? `<text x="${ml}" y="${safeTop - 30}" fill="${fg}" font-size="30" font-weight="700" opacity="0.7" font-family="Inter, Arial, sans-serif">${esc(brandHandle)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}" stop-opacity="0"/><stop offset="100%" stop-color="${bg}" stop-opacity="0.95"/>
    </linearGradient></defs>
    ${inner}
    ${handle}
  </svg>`;
};

const svgToDataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

/**
 * Compone el carrusel completo.
 * @param {object} p
 * @param {Array<{role,title,body}>} p.slidesText - texto por slide (de LLM o derivado)
 * @param {string[]} p.brandColors
 * @param {string|null} p.photoDataUrl - foto del usuario para la portada
 * @param {string} p.platform, p.format
 * @param {string} p.brandHandle - @cuenta
 */
export const composeCarousel = async ({
  slidesText = [],
  brandColors = [],
  photoDataUrl = null,
  bgImageDataUrl = null,
  textColor = null,
  bgColor = null,
  accentColor = null,
  platform = 'instagram',
  format = 'carousel',
  brandHandle = '',
  mood = 'premium',
} = {}) => {
  const spec = getSpec(platform, format) || getSpec('instagram', 'carousel');
  const palette = buildPalette(brandColors, { textColor, bgColor, accentColor });
  const total = slidesText.length;

  // Lazy import del design system para evitar ciclo
  let pickLayout = null,
    renderSlideSVG = null;
  try {
    const ds = await import('./_carouselDesignSystem.js');
    pickLayout = ds.pickLayout;
    renderSlideSVG = ds.renderSlideSVG;
  } catch {
    /* fallback al slideSvg legacy si falla import */
  }

  const slides = slidesText.map((st, i) => {
    const slideData = {
      n: i + 1,
      role: st.role,
      title: st.title || '',
      body: st.body || '',
      total,
      brandHandle,
      bgImageDataUrl,
    };
    const photo = st.role === 'hook' ? photoDataUrl || bgImageDataUrl : null;
    let svg, layoutUsed;
    if (pickLayout && renderSlideSVG) {
      const contentType = `${st.title || ''} ${st.body || ''}`;
      layoutUsed = pickLayout({
        slideRole: st.role,
        mood,
        contentType,
        slideIndex: i,
        slideText: `${st.title || ''} ${st.body || ''}`,
        isStep: Boolean(st.isStep),
      });
      svg = renderSlideSVG(layoutUsed, slideData, palette, spec, photo);
    } else {
      svg = slideSvg(slideData, palette, spec, photo);
      layoutUsed = 'legacy';
    }
    return {
      n: i + 1,
      role: st.role,
      title: st.title || '',
      body: st.body || '',
      layout: layoutUsed,
      dataUrl: svgToDataUrl(svg),
    };
  });

  return { slides, palette, spec: { w: spec.canvas.w, h: spec.canvas.h, aspect: spec.aspect } };
};

// Deriva estructura de texto de slides desde inputs sueltos (fallback sin LLM)
export const deriveSlidesText = ({ hook, points = [], cta, slideCount = 5 }) => {
  const structure = buildValidatedStructure(slideCount);
  const pts = [...points];
  return structure.map((s) => {
    if (s.role === 'hook') return { role: 'hook', title: hook || 'Tu hook acá', body: '' };
    if (s.role === 'cta') return { role: 'cta', title: '¿Te sirvió?', body: cta || 'Guardá esto 📌' };
    const p = pts.shift() || { title: 'Punto clave', body: '' };
    return { role: s.role, title: p.title || p, body: p.body || '' };
  });
};
