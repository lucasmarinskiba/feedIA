/**
 * Carousel Design System — 8 layouts SVG variantes para slides.
 *
 * Reemplaza al layout único hardcodeado en _carouselComposer.js.
 * Cada layout es una función pura (slide, palette, spec, photo?) → svg string.
 * `pickLayout({slideRole, mood, contentType})` elige el mejor por contexto.
 *
 * Reusa fitText, wrapTextPx, isDark, esc, etc del composer (re-exportados via imports).
 */

import { fitText, wrapTextPx, esc, tspans, isDark } from './_carouselComposer.js';

// ── Tipografías estéticas (no infantiles) ────────────────────────────────────
// Headlines: serif editorial elegante. Body: sans-serif clean. Number: tabular condensed.
const FONT_SERIF_DISPLAY = 'Georgia, "Cormorant Garamond", "Playfair Display", "Times New Roman", serif';
const FONT_SANS_DISPLAY = '"Helvetica Neue", "Inter", -apple-system, BlinkMacSystemFont, Arial, sans-serif';
const FONT_SANS_BODY = '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, Arial, sans-serif';
const FONT_MONO_NUMBER = '"SF Mono", "JetBrains Mono", "Helvetica Neue", monospace';

// ── Helpers comunes ──────────────────────────────────────────────────────────
const baseHeader = (W, ml, safeTop, brandHandle, fg) =>
  brandHandle
    ? `<text x="${ml}" y="${safeTop - 30}" fill="${fg}" font-size="26" font-weight="500" opacity="0.55" letter-spacing="1.5" font-family='${FONT_SANS_BODY}'>${esc(brandHandle)}</text>`
    : '';

// Footer minimalista (sin número de slide grande — IG ya muestra "1 de 5")
const baseFooter = (W, ml, H, safeBottom, accent, opt = {}) => {
  if (opt.hideAll) return '';
  // Solo línea sutil + opcional dot indicator
  return `<rect x="${ml}" y="${H - safeBottom - 24}" width="${W - ml * 2}" height="2" fill="${accent}" opacity="0.22"/>`;
};

// Íconos IG SVG (corazón / comentario / share / save / link) para CTA
const igIcons = (x, y, color, size = 64) => `
  <g transform="translate(${x},${y})" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M ${size * 0.5} ${size * 0.8} C ${size * 0.2} ${size * 0.55} ${size * 0.05} ${size * 0.4} ${size * 0.15} ${size * 0.25} C ${size * 0.25} ${size * 0.12} ${size * 0.42} ${size * 0.18} ${size * 0.5} ${size * 0.32} C ${size * 0.58} ${size * 0.18} ${size * 0.75} ${size * 0.12} ${size * 0.85} ${size * 0.25} C ${size * 0.95} ${size * 0.4} ${size * 0.8} ${size * 0.55} ${size * 0.5} ${size * 0.8} Z"/>
  </g>`;

const igCommentIcon = (x, y, color, size = 64) => `
  <g transform="translate(${x},${y})" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M ${size * 0.12} ${size * 0.45} C ${size * 0.12} ${size * 0.22} ${size * 0.3} ${size * 0.12} ${size * 0.5} ${size * 0.12} C ${size * 0.7} ${size * 0.12} ${size * 0.88} ${size * 0.22} ${size * 0.88} ${size * 0.45} C ${size * 0.88} ${size * 0.65} ${size * 0.7} ${size * 0.75} ${size * 0.5} ${size * 0.75} L ${size * 0.3} ${size * 0.75} L ${size * 0.2} ${size * 0.88} L ${size * 0.22} ${size * 0.72} C ${size * 0.16} ${size * 0.66} ${size * 0.12} ${size * 0.57} ${size * 0.12} ${size * 0.45} Z"/>
  </g>`;

const igSaveIcon = (x, y, color, size = 64) => `
  <g transform="translate(${x},${y})" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M ${size * 0.25} ${size * 0.12} L ${size * 0.75} ${size * 0.12} L ${size * 0.75} ${size * 0.85} L ${size * 0.5} ${size * 0.65} L ${size * 0.25} ${size * 0.85} Z"/>
  </g>`;

const igShareIcon = (x, y, color, size = 64) => `
  <g transform="translate(${x},${y})" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M ${size * 0.12} ${size * 0.55} L ${size * 0.88} ${size * 0.18}"/>
    <path d="M ${size * 0.12} ${size * 0.55} L ${size * 0.4} ${size * 0.78} L ${size * 0.5} ${size * 0.55} L ${size * 0.88} ${size * 0.18}"/>
  </g>`;

const svgWrap = (
  W,
  H,
  body,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.95"/>
    </linearGradient></defs>
    ${body}
  </svg>`;

// ── 8 LAYOUTS (tipografía elegante editorial, márgenes amplios, sin números decorativos) ──
export const LAYOUTS = {
  // 1. Editorial — foto top + título serif XXL bottom (revista premium)
  editorial: (slide, palette, spec, photoDataUrl) => {
    const { title = '', brandHandle = '' } = slide;
    const { bg, fg, accent } = palette;
    const W = spec.canvas.w,
      H = spec.canvas.h,
      ml = spec.margin.left || 120,
      safeTop = spec.safe?.top || 180,
      safeBottom = spec.safe?.bottom || 180;
    const photoH = photoDataUrl ? Math.round(H * 0.5) : 0;
    const textTop = (photoDataUrl ? photoH : safeTop) + 110;
    const textAreaH = H - safeBottom - textTop - 70;
    const fit = fitText(title, {
      maxWidthPx: W - ml * 2,
      maxHeightPx: textAreaH,
      startSize: 152,
      minSize: 64,
      maxLines: 4,
    });
    const photo = photoDataUrl
      ? `<image href="${photoDataUrl}" x="0" y="0" width="${W}" height="${photoH}" preserveAspectRatio="xMidYMid slice"/>
         <rect x="0" y="${photoH - 140}" width="${W}" height="${H - photoH + 140}" fill="${bg}"/>
         <rect x="0" y="${photoH - 140}" width="${W}" height="220" fill="url(#grad)"/>`
      : `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
         <text x="${ml}" y="${safeTop + 70}" fill="${accent}" font-size="34" font-weight="400" letter-spacing="6" font-family='${FONT_SERIF_DISPLAY}' font-style="italic" opacity="0.7">— editorial</text>`;
    return svgWrap(
      W,
      H,
      `${photo}
      <line x1="${ml}" y1="${textTop - 50}" x2="${ml + 110}" y2="${textTop - 50}" stroke="${accent}" stroke-width="2.5"/>
      ${tspans(fit.lines, ml, textTop + fit.size, fit.lineH, fg, fit.size, '700', 'start').replace(/font-family="[^"]+"/g, `font-family='${FONT_SERIF_DISPLAY}'`)}
      <text x="${ml}" y="${H - safeBottom + 26}" fill="${accent}" font-size="24" font-weight="600" letter-spacing="4" font-family='${FONT_SANS_BODY}'>DESLIZÁ  →</text>
      ${baseHeader(W, ml, safeTop, brandHandle, fg)}`,
    );
  },

  // 2. Brutal — fondo intenso, sans Black gigante, sin decoración
  brutal: (slide, palette, spec) => {
    const { title = '', brandHandle = '' } = slide;
    const W = spec.canvas.w,
      H = spec.canvas.h,
      ml = spec.margin.left || 120,
      safeTop = spec.safe?.top || 180,
      safeBottom = spec.safe?.bottom || 180;
    const bg = '#FFE600',
      fg = '#0A0A0A',
      accent = '#FF1F4A';
    const fit = fitText(title, {
      maxWidthPx: W - ml * 2,
      maxHeightPx: H - safeTop - safeBottom - 200,
      startSize: 200,
      minSize: 90,
      maxLines: 4,
    });
    return svgWrap(
      W,
      H,
      `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      <rect x="0" y="0" width="${W}" height="14" fill="${accent}"/>
      <rect x="0" y="${H - 14}" width="${W}" height="14" fill="${accent}"/>
      ${tspans(fit.lines, ml, (H - fit.lines.length * fit.lineH) / 2 + fit.size, fit.lineH, fg, fit.size, '900').replace(/font-family="[^"]+"/g, `font-family='${FONT_SANS_DISPLAY}'`)}
      <text x="${ml}" y="${H - safeBottom + 30}" fill="${accent}" font-size="28" font-weight="900" letter-spacing="6" font-family='${FONT_SANS_DISPLAY}'>SEGUÍ  →</text>
      ${brandHandle ? `<text x="${W - ml}" y="${safeTop - 30}" fill="${fg}" font-size="26" font-weight="700" text-anchor="end" letter-spacing="2" font-family='${FONT_SANS_BODY}'>${esc(brandHandle)}</text>` : ''}`,
    );
  },

  // 3. Premium Quote — fondo oscuro, comilla serif decorativa, frase centrada
  premium_quote: (slide, palette, spec) => {
    const { title = '', body = '', brandHandle = '' } = slide;
    const { bg, fg, accent } = palette;
    const W = spec.canvas.w,
      H = spec.canvas.h,
      ml = spec.margin.left || 120,
      safeTop = spec.safe?.top || 180,
      safeBottom = spec.safe?.bottom || 180;
    const fit = fitText(title || body, {
      maxWidthPx: W - ml * 2 - 40,
      maxHeightPx: 650,
      startSize: 96,
      minSize: 54,
      maxLines: 6,
    });
    return svgWrap(
      W,
      H,
      `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      <text x="${W / 2}" y="${H * 0.28}" fill="${accent}" font-size="280" text-anchor="middle" font-family='${FONT_SERIF_DISPLAY}' opacity="0.4">"</text>
      ${tspans(fit.lines, W / 2, H / 2 - (fit.lines.length * fit.lineH) / 2 + fit.size, fit.lineH, fg, fit.size, '500', 'middle').replace(/font-family="[^"]+"/g, `font-family='${FONT_SERIF_DISPLAY}'`)}
      <line x1="${W / 2 - 60}" y1="${H - safeBottom - 60}" x2="${W / 2 + 60}" y2="${H - safeBottom - 60}" stroke="${accent}" stroke-width="2"/>
      ${baseFooter(W, ml, H, safeBottom, accent)}
      ${baseHeader(W, ml, safeTop, brandHandle, fg)}`,
    );
  },

  // 4. Comparison — split A vs B (sin íconos infantiles, tipografía limpia)
  comparison: (slide, palette, spec) => {
    const { title = '', body = '', brandHandle = '' } = slide;
    const { bg, fg, accent } = palette;
    const W = spec.canvas.w,
      H = spec.canvas.h,
      ml = spec.margin.left || 120,
      safeTop = spec.safe?.top || 180,
      safeBottom = spec.safe?.bottom || 180;
    const parts = (body || '').split(/\s+(?:vs|VS|\/|→)\s+/);
    const left = title || parts[0] || 'A';
    const right = parts[1] || body || 'B';
    const halfW = (W - ml * 2) / 2 - 40;
    const fitL = fitText(left, { maxWidthPx: halfW, maxHeightPx: H * 0.55, startSize: 84, minSize: 48, maxLines: 6 });
    const fitR = fitText(right, { maxWidthPx: halfW, maxHeightPx: H * 0.55, startSize: 84, minSize: 48, maxLines: 6 });
    return svgWrap(
      W,
      H,
      `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      <line x1="${W / 2}" y1="${safeTop + 60}" x2="${W / 2}" y2="${H - safeBottom - 70}" stroke="${fg}" stroke-width="1.5" opacity="0.25"/>
      <text x="${W / 4}" y="${safeTop + 80}" fill="#9CA3AF" font-size="28" font-weight="600" text-anchor="middle" letter-spacing="6" font-family='${FONT_SANS_BODY}'>ANTES</text>
      <text x="${(W * 3) / 4}" y="${safeTop + 80}" fill="${accent}" font-size="28" font-weight="600" text-anchor="middle" letter-spacing="6" font-family='${FONT_SANS_BODY}'>DESPUÉS</text>
      ${tspans(fitL.lines, W / 4, H / 2 - (fitL.lines.length * fitL.lineH) / 2 + fitL.size, fitL.lineH, '#D4D4D8', fitL.size, '500', 'middle').replace(/font-family="[^"]+"/g, `font-family='${FONT_SERIF_DISPLAY}'`)}
      ${tspans(fitR.lines, (W * 3) / 4, H / 2 - (fitR.lines.length * fitR.lineH) / 2 + fitR.size, fitR.lineH, fg, fitR.size, '700', 'middle').replace(/font-family="[^"]+"/g, `font-family='${FONT_SERIF_DISPLAY}'`)}
      ${baseFooter(W, ml, H, safeBottom, accent)}
      ${baseHeader(W, ml, safeTop, brandHandle, fg)}`,
    );
  },

  // 5. List Numbered — ÚNICO con número (porque son pasos reales)
  list_numbered: (slide, palette, spec) => {
    const { n = 1, title = '', body = '', brandHandle = '' } = slide;
    const { bg, fg, accent } = palette;
    const W = spec.canvas.w,
      H = spec.canvas.h,
      ml = spec.margin.left || 120,
      safeTop = spec.safe?.top || 180,
      safeBottom = spec.safe?.bottom || 180;
    const textAreaW = W - ml * 2;
    const stepNum = String(n - 1).padStart(2, '0');
    const titleTop = safeTop + 260;
    const titleFit = fitText(title || 'Idea clave', {
      maxWidthPx: textAreaW,
      maxHeightPx: 240,
      startSize: 90,
      minSize: 52,
      maxLines: 3,
    });
    const bodyTop = titleTop + titleFit.lines.length * titleFit.lineH + 40;
    const bodyFit = fitText(body || '', {
      maxWidthPx: textAreaW,
      maxHeightPx: H - safeBottom - 80 - bodyTop,
      startSize: 50,
      minSize: 32,
      maxLines: 8,
    });
    return svgWrap(
      W,
      H,
      `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      <text x="${ml}" y="${safeTop + 140}" fill="${accent}" font-size="44" font-weight="400" letter-spacing="8" font-family='${FONT_SANS_BODY}' opacity="0.6">PASO</text>
      <text x="${ml}" y="${safeTop + 220}" fill="${accent}" font-size="140" font-weight="200" font-family='${FONT_MONO_NUMBER}'>${esc(stepNum)}</text>
      <line x1="${ml}" y1="${safeTop + 250}" x2="${ml + 90}" y2="${safeTop + 250}" stroke="${accent}" stroke-width="2"/>
      ${tspans(titleFit.lines, ml, titleTop + titleFit.size, titleFit.lineH, fg, titleFit.size, '700').replace(/font-family="[^"]+"/g, `font-family='${FONT_SERIF_DISPLAY}'`)}
      ${bodyFit.lines.length ? tspans(bodyFit.lines, ml, bodyTop + bodyFit.size, bodyFit.lineH, fg, bodyFit.size, '400').replace(/font-family="[^"]+"/g, `font-family='${FONT_SANS_BODY}'`) : ''}
      ${baseFooter(W, ml, H, safeBottom, accent)}
      ${baseHeader(W, ml, safeTop, brandHandle, fg)}`,
    );
  },

  // 6. Before/After — split horizontal limpio
  before_after: (slide, palette, spec) => {
    const { title = '', body = '', brandHandle = '' } = slide;
    const { bg, fg, accent } = palette;
    const W = spec.canvas.w,
      H = spec.canvas.h,
      ml = spec.margin.left || 120,
      safeTop = spec.safe?.top || 180,
      safeBottom = spec.safe?.bottom || 180;
    const fitA = fitText(title || 'Antes', {
      maxWidthPx: W - ml * 2,
      maxHeightPx: H * 0.32,
      startSize: 80,
      minSize: 44,
      maxLines: 4,
    });
    const fitB = fitText(body || 'Después', {
      maxWidthPx: W - ml * 2,
      maxHeightPx: H * 0.32,
      startSize: 80,
      minSize: 44,
      maxLines: 4,
    });
    const midY = H / 2;
    return svgWrap(
      W,
      H,
      `<rect x="0" y="0" width="${W}" height="${H / 2}" fill="#1E1E22"/>
      <rect x="0" y="${H / 2}" width="${W}" height="${H / 2}" fill="${bg}"/>
      <text x="${ml}" y="${safeTop + 60}" fill="#9CA3AF" font-size="24" font-weight="500" letter-spacing="6" font-family='${FONT_SANS_BODY}'>ANTES</text>
      ${tspans(fitA.lines, ml, midY - 50 - (fitA.lines.length - 1) * fitA.lineH, fitA.lineH, '#D4D4D8', fitA.size, '500').replace(/font-family="[^"]+"/g, `font-family='${FONT_SERIF_DISPLAY}'`)}
      <circle cx="${W / 2}" cy="${midY}" r="42" fill="${accent}"/>
      <text x="${W / 2}" y="${midY + 16}" fill="${isDark(accent) ? '#fff' : '#000'}" font-size="46" font-weight="300" text-anchor="middle" font-family='${FONT_SANS_DISPLAY}'>↓</text>
      <text x="${ml}" y="${midY + 110}" fill="${accent}" font-size="24" font-weight="600" letter-spacing="6" font-family='${FONT_SANS_BODY}'>DESPUÉS</text>
      ${tspans(fitB.lines, ml, midY + 180 + fitB.size, fitB.lineH, fg, fitB.size, '700').replace(/font-family="[^"]+"/g, `font-family='${FONT_SERIF_DISPLAY}'`)}
      ${baseFooter(W, ml, H, safeBottom, accent)}
      ${baseHeader(W, ml, safeTop, brandHandle, fg)}`,
    );
  },

  // 7. Data Card — número gigante + contexto
  data_card: (slide, palette, spec) => {
    const { title = '', body = '', brandHandle = '' } = slide;
    const { bg, fg, accent } = palette;
    const W = spec.canvas.w,
      H = spec.canvas.h,
      ml = spec.margin.left || 120,
      safeTop = spec.safe?.top || 180,
      safeBottom = spec.safe?.bottom || 180;
    const numberMatch = (title + ' ' + body).match(/(\d+(?:[.,]\d+)?(?:[%xX]|\s?[KMB]+)?)/);
    const bigNumber = numberMatch ? numberMatch[0] : title.slice(0, 4);
    const labelText = title.replace(bigNumber, '').trim() || 'Dato clave';
    const contextText = body || '';
    const numberSize = bigNumber.length <= 3 ? 420 : bigNumber.length <= 5 ? 300 : 220;
    const fitLabel = fitText(labelText, {
      maxWidthPx: W - ml * 2,
      maxHeightPx: 180,
      startSize: 64,
      minSize: 40,
      maxLines: 3,
    });
    const fitCtx = fitText(contextText, {
      maxWidthPx: W - ml * 2,
      maxHeightPx: 220,
      startSize: 42,
      minSize: 28,
      maxLines: 5,
    });
    return svgWrap(
      W,
      H,
      `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      <text x="${W / 2}" y="${H * 0.4}" fill="${accent}" font-size="${numberSize}" font-weight="200" text-anchor="middle" font-family='${FONT_MONO_NUMBER}'>${esc(bigNumber)}</text>
      <line x1="${W / 2 - 80}" y1="${H * 0.45}" x2="${W / 2 + 80}" y2="${H * 0.45}" stroke="${accent}" stroke-width="2"/>
      ${tspans(fitLabel.lines, W / 2, H * 0.55, fitLabel.lineH, fg, fitLabel.size, '600', 'middle').replace(/font-family="[^"]+"/g, `font-family='${FONT_SERIF_DISPLAY}'`)}
      ${tspans(fitCtx.lines, W / 2, H * 0.55 + fitLabel.lines.length * fitLabel.lineH + 50, fitCtx.lineH, fg, fitCtx.size, '400', 'middle').replace(/font-family="[^"]+"/g, `font-family='${FONT_SANS_BODY}'`)}
      ${baseFooter(W, ml, H, safeBottom, accent)}
      ${baseHeader(W, ml, safeTop, brandHandle, fg)}`,
    );
  },

  // 8. Story Narrative — CTA con íconos IG (heart/comment/save/share/link-in-bio)
  story_narrative: (slide, palette, spec) => {
    const { title = '', body = '', brandHandle = '' } = slide;
    const { bg, fg, accent } = palette;
    const W = spec.canvas.w,
      H = spec.canvas.h,
      ml = spec.margin.left || 120,
      safeTop = spec.safe?.top || 180,
      safeBottom = spec.safe?.bottom || 180;
    const titleFit = fitText(title || '¿Te sirvió?', {
      maxWidthPx: W - ml * 2,
      maxHeightPx: 280,
      startSize: 130,
      minSize: 64,
      maxLines: 3,
    });
    const bodyText = body && body.length > 18 ? body : 'Mostrame que te sirvió';
    const bodyFit = fitText(bodyText, {
      maxWidthPx: W - ml * 2,
      maxHeightPx: 160,
      startSize: 44,
      minSize: 28,
      maxLines: 3,
    });
    const centerY = H * 0.36;
    // CTA action: detectar si menciona "DM/link in bio" del body
    const isLink = /link.*bio|perfil/i.test(body);
    const buttonText = isLink ? 'Link en mi perfil ✦' : 'Comentá un emoji ✦';
    // Íconos IG: corazón / comentario / save / share / link
    const iconY = H - safeBottom - 270;
    const iconSize = 78;
    const iconSpacing = (W - ml * 2 - iconSize * 5) / 4;
    const iconX = (idx) => ml + idx * (iconSize + iconSpacing);
    return svgWrap(
      W,
      H,
      `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      <rect x="0" y="0" width="${W}" height="6" fill="${accent}"/>
      ${tspans(titleFit.lines, W / 2, centerY, titleFit.lineH, fg, titleFit.size, '700', 'middle').replace(/font-family="[^"]+"/g, `font-family='${FONT_SERIF_DISPLAY}'`)}
      ${tspans(bodyFit.lines, W / 2, centerY + titleFit.lines.length * titleFit.lineH + 60, bodyFit.lineH, fg, bodyFit.size, '400', 'middle').replace(/font-family="[^"]+"/g, `font-family='${FONT_SANS_BODY}'`)}
      ${igIcons(iconX(0), iconY, accent, iconSize)}
      ${igCommentIcon(iconX(1), iconY, accent, iconSize)}
      ${igShareIcon(iconX(2), iconY, accent, iconSize)}
      ${igSaveIcon(iconX(3), iconY, accent, iconSize)}
      <g transform="translate(${iconX(4)},${iconY})" fill="${accent}" stroke="none">
        <text x="${iconSize / 2}" y="${iconSize * 0.62}" font-size="${iconSize * 0.55}" text-anchor="middle" font-family='${FONT_SANS_DISPLAY}'>@</text>
      </g>
      <rect x="${ml}" y="${H - safeBottom - 130}" width="${W - ml * 2}" height="86" rx="43" fill="none" stroke="${accent}" stroke-width="3"/>
      <text x="${W / 2}" y="${H - safeBottom - 76}" fill="${accent}" font-size="34" font-weight="600" text-anchor="middle" letter-spacing="2" font-family='${FONT_SANS_DISPLAY}'>${esc(buttonText)}</text>
      ${baseHeader(W, ml, safeTop, brandHandle, fg)}`,
    );
  },
};

// ── Matriz de selección de layout ────────────────────────────────────────────
export const pickLayout = ({
  slideRole = 'practica',
  mood = 'premium',
  contentType = '',
  slideIndex = 0,
  isStep = false,
  slideText = '',
} = {}) => {
  // CTA siempre con story_narrative (íconos IG + botón)
  if (slideRole === 'cta') return 'story_narrative';
  // Hook
  if (slideRole === 'hook') {
    if (['brutal', 'gen-z-meme', 'cyberpunk', 'retro80', 'noir'].includes(mood)) return 'brutal';
    return 'editorial';
  }
  // SOLO usar list_numbered si REALMENTE son pasos
  const txt = String(slideText || contentType || '').toLowerCase();
  const looksLikeStep = isStep || /^paso\s|\bpaso\s\d|\bstep\s\d|^\d+\.|primero |segundo |tercero /i.test(txt);
  if (looksLikeStep) return 'list_numbered';
  // Heurística por contenido (sin defaultear a list_numbered)
  if (/"|«|—\s/.test(slideText)) return 'premium_quote';
  if (/\bvs\b|\bversus\b/i.test(slideText)) return 'comparison';
  if (/\bantes\b.*\bdespu[eé]s\b|antes:.*despu[eé]s:/i.test(slideText)) return 'before_after';
  if (/\b\d+\s*(%|x|K|M|B|veces)/i.test(slideText)) return 'data_card';
  // Rotación elegante (NO list_numbered como default — evita números falsos)
  const rotation = ['premium_quote', 'data_card', 'comparison', 'premium_quote', 'data_card'];
  return rotation[slideIndex % rotation.length] || 'premium_quote';
};

// ── Render entrypoint ────────────────────────────────────────────────────────
export const renderSlideSVG = (layoutKey, slide, palette, spec, photoDataUrl) => {
  const fn = LAYOUTS[layoutKey] || LAYOUTS.list_numbered;
  return fn(slide, palette, spec, photoDataUrl);
};
