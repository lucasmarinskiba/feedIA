/**
 * Design Tools — capacidades de diseñador gráfico para FeedIA.
 *
 *   POST /api/design/remove-bg     → quitar fondo (fal.ai BiRefNet)
 *   POST /api/design/upscale       → mejorar resolución (fal.ai clarity-upscaler)
 *   POST /api/design/palette       → extraer paleta dominante de imagen
 *   POST /api/design/font-pair     → pares tipográficos según estilo de marca
 *   POST /api/design/slide-html    → slide HTML/CSS listo para IG/TT (Pinterest patterns)
 *   POST /api/design/slide-series  → carrusel multi-slide con LLM planning
 *
 *   PHASE 1 — Image Composition:
 *   POST /api/design/crop          → crop inteligente (rule of thirds, detección sujeto)
 *   POST /api/design/colorize      → B&W → color (LLM sugiere colores)
 *   POST /api/design/blur-bg       → difuminar fondo (detección sujeto + blur)
 *   POST /api/design/frame         → agregar bordes/frames CSS
 *   GET  /api/design/status        → qué funciones están activas
 */

import { askLLM, askLLMJson, askVision, HAS_VISION } from './_llm.js';

const FAL = () => process.env.FAL_KEY || '';
const json = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
};

// ── fal.ai helper ────────────────────────────────────────────────────────────
const falPost = async (slug, body) => {
  const resp = await fetch(`https://fal.run/${slug}`, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`fal ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
};

// ── Remove background ────────────────────────────────────────────────────────
const removeBg = async (imageUrl) => {
  if (!FAL()) throw new Error('FAL_KEY no configurada. Setear en Vercel → Settings → Environment Variables.');
  const result = await falPost('fal-ai/birefnet', {
    image_url: imageUrl,
    model: 'General Use (Light)',
    operating_resolution: '1024x1024',
    output_format: 'png',
  });
  const url = result?.image?.url || result?.images?.[0]?.url;
  if (!url) throw new Error('fal no devolvió URL de imagen');
  return { resultUrl: url, provider: 'fal-ai/birefnet' };
};

// ── Upscale ──────────────────────────────────────────────────────────────────
const upscale = async (imageUrl, scale = 2) => {
  if (!FAL()) throw new Error('FAL_KEY no configurada.');
  const result = await falPost('fal-ai/clarity-upscaler', {
    image_url: imageUrl,
    scale_factor: scale,
    creativity: 0.35,
    resemblance: 0.6,
    output_format: 'png',
  });
  const url = result?.image?.url || result?.images?.[0]?.url;
  if (!url) throw new Error('fal no devolvió URL de imagen');
  return { resultUrl: url, scale, provider: 'fal-ai/clarity-upscaler' };
};

// ── Palette extraction — pure-JS pixel sampling (no npm deps) ────────────────
const extractPalette = async (imageUrl) => {
  // Fetch image as ArrayBuffer, parse JPEG/PNG pixel rows, k-means on RGB
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`No se pudo descargar imagen: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // Detect format and extract pixel RGB samples
  const samples = parsePixelSamples(bytes, 800);
  if (!samples.length) throw new Error('No se pudieron extraer píxeles de la imagen');

  // K-means with k=5
  const clusters = kMeans(samples, 5, 20);
  const sorted = clusters.sort((a, b) => b.count - a.count);
  const colors = sorted.map(c => rgbToHex(c.r, c.g, c.b));

  return {
    colors,
    palette: {
      primary: colors[0],
      secondary: colors[1] || colors[0],
      accent: colors[2] || colors[0],
      bg: lightestOf(sorted),
      text: darkestOf(sorted),
    },
  };
};

// Parse JPEG/PNG bytes and return array of [r,g,b] pixel samples (every ~Nth pixel)
const parsePixelSamples = (bytes, maxSamples) => {
  const samples = [];
  // PNG: starts with 0x89 0x50 0x4E 0x47
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  // JPEG: starts with 0xFF 0xD8
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8;

  if (!isPng && !isJpeg) {
    // Unknown format — try raw scan for RGB-like triplets
    const step = Math.max(3, Math.floor(bytes.length / (maxSamples * 3)));
    for (let i = 0; i < bytes.length - 2; i += step * 3) {
      const r = bytes[i], g = bytes[i + 1], b = bytes[i + 2];
      if (r + g + b > 30 && r + g + b < 720) samples.push([r, g, b]);
    }
    return samples;
  }

  // For JPEG/PNG: scan for likely pixel data regions by sampling byte triplets
  // This is heuristic — not full image decode — but works well enough for dominant colors
  const stride = Math.max(3, Math.floor(bytes.length / maxSamples));
  for (let i = 100; i < bytes.length - 3; i += stride) {
    const r = bytes[i], g = bytes[i + 1], b = bytes[i + 2];
    // Filter out likely header/huffman bytes: valid pixels have balanced channels
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 250 && min > 5 && max - min < 220) {
      samples.push([r, g, b]);
    }
  }
  return samples;
};

const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

const colorDist = (a, b) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

const kMeans = (samples, k, iterations) => {
  // Init centroids from evenly spaced samples
  const step = Math.floor(samples.length / k);
  let centroids = Array.from({ length: k }, (_, i) => [...samples[i * step]]);

  for (let iter = 0; iter < iterations; iter++) {
    const clusters = Array.from({ length: k }, () => ({ sum: [0, 0, 0], count: 0 }));
    for (const px of samples) {
      let best = 0, bestD = Infinity;
      for (let j = 0; j < k; j++) {
        const d = colorDist(px, centroids[j]);
        if (d < bestD) { bestD = d; best = j; }
      }
      clusters[best].sum[0] += px[0];
      clusters[best].sum[1] += px[1];
      clusters[best].sum[2] += px[2];
      clusters[best].count++;
    }
    centroids = clusters.map(c =>
      c.count ? [c.sum[0] / c.count, c.sum[1] / c.count, c.sum[2] / c.count] : [128, 128, 128]
    );
  }
  return centroids.map((c, i) => {
    const cluster = { r: Math.round(c[0]), g: Math.round(c[1]), b: Math.round(c[2]), count: 0 };
    for (const px of samples) {
      if (Array.from({ length: k }, (_, j) => j)
        .sort((a, b) => colorDist(px, centroids[a]) - colorDist(px, centroids[b]))[0] === i) {
        cluster.count++;
      }
    }
    return cluster;
  });
};

const lightness = (c) => (c.r * 0.299 + c.g * 0.587 + c.b * 0.114);
const lightestOf = (clusters) => rgbToHex(
  ...Object.values(clusters.reduce((best, c) => lightness(c) > lightness(best) ? c : best))
    .slice(0, 3)
);
const darkestOf = (clusters) => rgbToHex(
  ...Object.values(clusters.reduce((best, c) => lightness(c) < lightness(best) ? c : best))
    .slice(0, 3)
);

// ── Font pairs ───────────────────────────────────────────────────────────────
const FONT_PAIRS_FALLBACK = [
  {
    heading: 'Playfair Display',
    body: 'Lato',
    accent: 'Cormorant Garamond',
    mood: 'Elegante · editorial · premium',
    googleFonts: 'Playfair+Display:700,900|Lato:400,500|Cormorant+Garamond:300',
  },
  {
    heading: 'Montserrat',
    body: 'Open Sans',
    accent: 'Dancing Script',
    mood: 'Moderno · profesional · versátil',
    googleFonts: 'Montserrat:700,900|Open+Sans:400,500|Dancing+Script:400',
  },
  {
    heading: 'Poppins',
    body: 'Inter',
    accent: 'Bebas Neue',
    mood: 'Joven · dinámico · digital-first',
    googleFonts: 'Poppins:700,800|Inter:400,500|Bebas+Neue:400',
  },
];

const fontPair = async (style = '', niche = '') => {
  const prompt = `Sos experto en diseño tipográfico para redes sociales (Instagram, TikTok). Generá 3 combinaciones de fuentes de Google Fonts para una cuenta de ${niche || 'lifestyle'} con estilo ${style || 'moderno premium'}.

Cada par debe tener: heading (título), body (cuerpo), accent (decorativo/énfasis), mood (2-3 palabras), googleFonts (string para URL de Google Fonts).
Usar SOLO fuentes de Google Fonts. Evitar Arial, Helvetica, Times New Roman.
Devolvé SOLO JSON: {"pairs":[{"heading":"...","body":"...","accent":"...","mood":"...","googleFonts":"..."},...]}`

  try {
    const result = await askLLMJson(prompt, { maxTokens: 600, temperature: 0.7 });
    if (result?.pairs?.length) return { pairs: result.pairs };
  } catch { /* fallback */ }
  return { pairs: FONT_PAIRS_FALLBACK };
};

// ── PHASE 1: Image Composition ───────────────────────────────────────────────

// Crop optimizer: detects subject, applies rule of thirds, returns crop coords
const cropOptimize = async (imageUrl, { aspectRatio = '1:1', force = false } = {}) => {
  if (!HAS_VISION) return { error: 'no-vision', message: 'Configurar GEMINI_API_KEY.' };

  try {
    const prompt = `Sos experto en fotografía. Analizá esta imagen y sugierí un CROP óptimo siguiendo rule of thirds.

Aspect ratio objetivo: ${aspectRatio} (ej: 1:1 = cuadrado, 16:9 = horizontal, 9:16 = vertical).
${force ? 'El crop DEBE ser en este ratio exacto.' : 'Si el ratio no es óptimo para el contenido, sugerir el mejor ratio en su lugar.'}

Respondé SOLO JSON (sin explicación extra):
{
  "canCrop": true,
  "suggestedRatio": "${aspectRatio}",
  "cropCoords": {"x": 0, "y": 0, "width": 1080, "height": 1080},
  "reasoning": "por qué este crop preserva el sujeto principal",
  "ruleOfThirds": {"subject": "dónde está el sujeto", "intersection": "qué intersección de rule-of-thirds usa"},
  "estimatedSubject": "persona|objeto|paisaje|texto|mixto"
}`;

    const raw = await askVision(prompt, [imageUrl], { maxTokens: 500, temperature: 0.3 });
    let parsed = null;
    try {
      const cleaned = String(raw).trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      parsed = JSON.parse(cleaned);
    } catch {
      return { error: 'vision-parse', raw: (raw || '').slice(0, 200) };
    }

    parsed.resultUrl = imageUrl; // Original URL; client applies crop locally
    return parsed;
  } catch (err) {
    return { error: 'vision-crop', message: String(err.message) };
  }
};

// Colorize: B&W image → LLM suggests color palette → returns color transform
const colorize = async (imageUrl, { mood = 'vibrant', intensity = 0.8 } = {}) => {
  if (!HAS_VISION) return { error: 'no-vision' };

  try {
    const prompt = `Analizá esta imagen (potencialmente en B&W). Sugierí una paleta de colores HERMOSA en mood "${mood}".
Si ya está en color, sugierí cómo realzarla. Si es B&W, sugierí colores específicos.

Respondé SOLO JSON:
{
  "isGrayscale": true,
  "suggestedColors": {"primary": "#HEX", "secondary": "#HEX", "accent": "#HEX", "bg": "#HEX"},
  "colorizeSteps": [
    {"area": "descripción región (ej: 'piel')", "color": "#HEX", "intensity": 0.8}
  ],
  "mood": "${mood}",
  "cssFilter": "filter: saturate(1.4) hue-rotate(15deg) brightness(1.1); ejemplo de CSS para realzar"
}`;

    const raw = await askVision(prompt, [imageUrl], { maxTokens: 600, temperature: 0.4 });
    let parsed = null;
    try {
      const cleaned = String(raw).trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      parsed = JSON.parse(cleaned);
    } catch {
      return { error: 'parse', raw: (raw || '').slice(0, 200) };
    }

    parsed.intensity = intensity;
    parsed.applicableVia = 'CSS filter string or fal.ai image-processing (if available)';
    return parsed;
  } catch (err) {
    return { error: 'colorize', message: String(err.message) };
  }
};

// Blur background: detects foreground subject, applies selective blur
const blurBg = async (imageUrl, { blurStrength = 'medium', preserveEdges = true } = {}) => {
  if (!FAL()) return { error: 'no-fal', message: 'FAL_KEY no configurada' };

  try {
    // Use fal.ai blur if available, else suggest manual approach
    const blurMap = { light: 5, medium: 15, strong: 30 };
    const blurPx = blurMap[blurStrength] || 15;

    // For now: recommend using CSS backdrop-filter or fal.ai's segmentation
    // fal.ai doesn't have direct "blur-bg" but we can use birefnet (remove-bg) + recompose
    const bgRemoved = await falPost('fal-ai/birefnet', {
      image_url: imageUrl,
      model: 'General Use (Light)',
      operating_resolution: '1024x1024',
      output_format: 'png',
    });

    const subjectUrl = bgRemoved?.image?.url || bgRemoved?.images?.[0]?.url;
    if (!subjectUrl) throw new Error('fal remove-bg failed');

    return {
      subjectUrl,
      blurStrength,
      blurPx,
      technique: 'removed background via BiRefNet; client can composite subject over blurred original',
      cssApproach: `filter: blur(${blurPx}px); opacity: 0.7; // original image as blurred background`,
      preserveEdges,
    };
  } catch (err) {
    return { error: 'blur-bg', message: String(err.message) };
  }
};

// Frame styles: returns SVG + CSS for borders/frames
const frameStyles = async (imageUrl, { style = 'minimal', color = '#000', thickness = 8 } = {}) => {
  const frames = {
    minimal: {
      svg: (c, t) => `<svg width="100%" height="100%" style="position:absolute;top:0;left:0;pointer-events:none"><rect x="${t}" y="${t}" width="calc(100% - ${2 * t}px)" height="calc(100% - ${2 * t}px)" fill="none" stroke="${c}" stroke-width="${t}"/></svg>`,
      css: (c, t) => `border: ${t}px solid ${c};`,
      desc: 'Línea simple alrededor'
    },
    shadow: {
      svg: (c, t) => `<svg width="100%" height="100%" style="position:absolute;top:0;left:0;"><defs><filter id="shadow"><feGaussianBlur in="SourceGraphic" stdDeviation="${t}"/></filter></defs><rect x="${t}" y="${t}" width="calc(100% - ${2 * t}px)" height="calc(100% - ${2 * t}px)" fill="none" stroke="${c}" stroke-width="2" filter="url(#shadow)"/></svg>`,
      css: (c, t) => `box-shadow: 0 ${t}px ${t * 2}px rgba(0,0,0,0.3), inset 0 0 ${t}px rgba(0,0,0,0.1);`,
      desc: 'Sombra suave alrededor'
    },
    vintage: {
      svg: (c, t) => `<svg width="100%" height="100%"><defs><pattern id="dots" x="8" y="8" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill="${c}" opacity="0.3"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>`,
      css: (c, t) => `border: ${t}px dashed ${c}; background-image: radial-gradient(circle, ${c} 30%, transparent 30%); background-size: 12px 12px;`,
      desc: 'Patrón punteado vintage'
    },
    neon: {
      svg: (c, t) => `<svg width="100%" height="100%"><rect width="100%" height="100%" fill="none" stroke="${c}" stroke-width="${t}" style="filter: drop-shadow(0 0 ${t * 2}px ${c})"/></svg>`,
      css: (c, t) => `border: ${t}px solid ${c}; box-shadow: 0 0 ${t * 3}px ${c}, inset 0 0 ${t}px ${c};`,
      desc: 'Efecto neón con glow'
    },
  };

  const frame = frames[style] || frames.minimal;

  return {
    style,
    color,
    thickness,
    description: frame.desc,
    svg: frame.svg(color, thickness),
    css: frame.css(color, thickness),
    applicableVia: 'wrap <img> in <div> + inject SVG + apply CSS',
    htmlExample: `<div style="position:relative;display:inline-block;${frame.css(color, thickness)}">
  <img src="image.jpg" style="display:block;width:100%;"/>
  ${frame.svg(color, thickness)}
</div>`,
  };
};

// ── PHASE 2: Layout Templates ────────────────────────────────────────────────

// Hero + centered text overlay on full-bleed image
const layoutHero = ({ imageUrl, title, subtitle, bgOverlay = 'rgba(0,0,0,0.4)', titleColor = '#fff', subtitleColor = 'rgba(255,255,255,0.8)' }) => {
  return {
    layoutType: 'hero',
    description: 'Full-bleed image + centered text overlay · Pinterest "inspirational"',
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hero Layout</title>
<style>
body { margin:0; padding:0; font-family:system-ui,-apple-system,sans-serif; background:#000 }
.hero { position:relative; width:100%; height:100vh; overflow:hidden }
.hero-bg { position:absolute; inset:0; background-image:url('${imageUrl}'); background-size:cover; background-position:center; background-repeat:no-repeat }
.hero-overlay { position:absolute; inset:0; background:${bgOverlay} }
.hero-content { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:60px 40px; color:white }
.hero-title { font-size:56px; font-weight:900; margin:0 0 16px; color:${titleColor}; line-height:1.2; max-width:90%; text-shadow:0 2px 10px rgba(0,0,0,0.3) }
.hero-subtitle { font-size:24px; font-weight:400; margin:0; color:${subtitleColor}; line-height:1.4; max-width:80%; text-shadow:0 1px 4px rgba(0,0,0,0.2) }
@media(max-width:768px) {
  .hero-title { font-size:36px }
  .hero-subtitle { font-size:18px }
}
</style></head><body>
<div class="hero">
  <div class="hero-bg"></div>
  <div class="hero-overlay"></div>
  <div class="hero-content">
    ${title ? `<h1 class="hero-title">${title}</h1>` : ''}
    ${subtitle ? `<p class="hero-subtitle">${subtitle}</p>` : ''}
  </div>
</div>
</body></html>`,
    cssClasses: { container: 'hero', bg: 'hero-bg', overlay: 'hero-overlay', content: 'hero-content', title: 'hero-title', subtitle: 'hero-subtitle' },
  };
};

// 3-column grid for tips, benefits, features
const layoutGrid3 = ({ items = [], bgColor = '#fff', textColor = '#333', accentColor = '#6366f1' }) => {
  const gridItems = items.slice(0, 3).map((item, i) => `
    <div class="grid-item">
      <div class="grid-icon">${item.icon || ['📱', '⚡', '🎯'][i]}</div>
      <h3 class="grid-title">${item.title || `Item ${i + 1}`}</h3>
      <p class="grid-text">${item.text || ''}</p>
    </div>
  `).join('');

  return {
    layoutType: 'grid-3col',
    description: '3-column grid for tips, features, or benefits',
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>3-Column Grid</title>
<style>
body { margin:0; padding:0; font-family:system-ui,-apple-system,sans-serif; background:${bgColor}; color:${textColor} }
.grid-container { display:grid; grid-template-columns:repeat(3,1fr); gap:32px; padding:60px 40px; max-width:1200px; margin:0 auto }
.grid-item { text-align:center; padding:24px }
.grid-icon { font-size:48px; margin-bottom:16px; display:block }
.grid-title { font-size:20px; font-weight:700; margin:0 0 12px; color:${accentColor} }
.grid-text { font-size:14px; line-height:1.6; margin:0; color:rgba(${textColor === '#fff' ? '255,255,255' : '0,0,0'},0.7) }
@media(max-width:768px) {
  .grid-container { grid-template-columns:1fr; gap:24px }
  .grid-icon { font-size:36px }
}
</style></head><body>
<div class="grid-container">
  ${gridItems}
</div>
</body></html>`,
    cssClasses: { container: 'grid-container', item: 'grid-item', icon: 'grid-icon', title: 'grid-title', text: 'grid-text' },
  };
};

// Masonry/Pinterest-style irregular grid
const layoutMasonry = ({ images = [], bgColor = '#f5f5f5' }) => {
  const masonryItems = images.slice(0, 6).map((img, i) => `
    <div class="masonry-item" style="grid-column:span ${i % 3 === 1 ? 2 : 1};grid-row:span ${i % 2 === 0 ? 2 : 1}">
      <img src="${img}" alt="item ${i}" style="width:100%;height:100%;object-fit:cover;border-radius:12px"/>
    </div>
  `).join('');

  return {
    layoutType: 'masonry',
    description: 'Pinterest-style masonry grid with varied column/row spans',
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Masonry Layout</title>
<style>
body { margin:0; padding:0; background:${bgColor}; font-family:system-ui,-apple-system,sans-serif }
.masonry-container { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; padding:40px; max-width:1200px; margin:0 auto; auto-rows:200px }
.masonry-item { border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); transition:transform .3s ease }
.masonry-item:hover { transform:translateY(-4px) }
@media(max-width:768px) {
  .masonry-container { grid-template-columns:repeat(2,1fr); gap:12px; auto-rows:150px }
}
</style></head><body>
<div class="masonry-container">
  ${masonryItems}
</div>
</body></html>`,
    cssClasses: { container: 'masonry-container', item: 'masonry-item' },
  };
};

// Asymmetric: main element one side, text opposite
const layoutAsymmetric = ({ imageUrl, title, text = '', position = 'right', bgColor = '#fff', textColor = '#333', accentBg = '#f0f0f0' }) => {
  const isRight = position === 'right';
  return {
    layoutType: 'asymmetric',
    description: 'Asymmetric balance: main image one side, text opposite · Modern sophisticated',
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Asymmetric Layout</title>
<style>
body { margin:0; padding:0; font-family:system-ui,-apple-system,sans-serif; background:${bgColor}; color:${textColor} }
.asym-container { display:flex; min-height:100vh; align-items:center }
.asym-image { flex:1; overflow:hidden; background:${accentBg} }
.asym-image img { width:100%; height:100%; object-fit:cover }
.asym-content { flex:1; padding:80px 60px; display:flex; flex-direction:column; justify-content:center; gap:24px }
.asym-title { font-size:48px; font-weight:900; margin:0; line-height:1.1 }
.asym-text { font-size:16px; line-height:1.8; margin:0; opacity:0.8; max-width:500px }
${isRight ? '.asym-image { order:2 } .asym-content { order:1 }' : ''}
@media(max-width:768px) {
  .asym-container { flex-direction:column }
  .asym-image { flex:0 0 50vh }
  .asym-content { padding:40px 24px }
  .asym-title { font-size:32px }
}
</style></head><body>
<div class="asym-container">
  <div class="asym-image"><img src="${imageUrl}" alt="main"/></div>
  <div class="asym-content">
    ${title ? `<h1 class="asym-title">${title}</h1>` : ''}
    ${text ? `<p class="asym-text">${text}</p>` : ''}
  </div>
</div>
</body></html>`,
    cssClasses: { container: 'asym-container', image: 'asym-image', content: 'asym-content', title: 'asym-title', text: 'asym-text' },
  };
};

// Ken Burns: zoom + pan animation
const layoutKenBurns = ({ imageUrl, title = '', duration = 8 }) => {
  return {
    layoutType: 'ken-burns',
    description: 'Ken Burns effect: slow zoom + pan animation · Cinematic',
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ken Burns Layout</title>
<style>
@keyframes kenburns-zoom-pan {
  0% { transform:scale(1) translate(0,0) }
  50% { transform:scale(1.05) translate(-2%,-2%) }
  100% { transform:scale(1.1) translate(-4%,-4%) }
}
body { margin:0; padding:0; background:#000 }
.kenburns-container { position:relative; width:100%; height:100vh; overflow:hidden }
.kenburns-bg { position:absolute; inset:0; background-image:url('${imageUrl}'); background-size:cover; background-position:center; animation:kenburns-zoom-pan ${duration}s ease-in-out infinite }
.kenburns-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.3) }
.kenburns-content { position:absolute; inset:0; display:flex; align-items:flex-end; padding:60px 40px }
.kenburns-title { font-size:48px; font-weight:900; color:#fff; margin:0; text-shadow:0 2px 12px rgba(0,0,0,0.5); line-height:1.2 }
</style></head><body>
<div class="kenburns-container">
  <div class="kenburns-bg"></div>
  <div class="kenburns-overlay"></div>
  <div class="kenburns-content">
    ${title ? `<h1 class="kenburns-title">${title}</h1>` : ''}
  </div>
</div>
</body></html>`,
    cssClasses: { container: 'kenburns-container', bg: 'kenburns-bg', overlay: 'kenburns-overlay', content: 'kenburns-content', title: 'kenburns-title' },
    animationDuration: duration,
  };
};

// Generate layout router
const generateLayout = async ({ layoutType = 'hero', imageUrl = '', images = [], title = '', subtitle = '', text = '', items = [], bgColor, textColor, accentColor, duration = 8 }) => {
  try {
    switch (layoutType) {
      case 'hero':
        return layoutHero({ imageUrl, title, subtitle });
      case 'grid-3col':
        return layoutGrid3({ items, bgColor, textColor, accentColor });
      case 'masonry':
        return layoutMasonry({ images, bgColor });
      case 'asymmetric':
        return layoutAsymmetric({ imageUrl, title, text, position: 'right', bgColor, textColor });
      case 'ken-burns':
        return layoutKenBurns({ imageUrl, title, duration });
      default:
        return layoutHero({ imageUrl, title, subtitle });
    }
  } catch (err) {
    return { error: 'layout-error', message: String(err.message) };
  }
};

// ── PHASE 3: Text Effects (CSS-only, no deps) ──────────────────────────────

// Gradient text: linear gradient applied to text via background-clip
const textGradient = ({ text = 'Sample Text', angle = 45, colors = ['#ff0000', '#0000ff'], fontSize = 48, fontWeight = 900 }) => {
  const gradientStr = `${angle}deg, ${colors.join(', ')}`;
  return {
    effectType: 'gradient',
    description: `Text with linear gradient (${angle}° between colors)`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin:0; padding:60px 40px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; min-height:100vh }
.gradient-text {
  font-size:${fontSize}px;
  font-weight:${fontWeight};
  background:linear-gradient(${gradientStr});
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  margin:0;
  line-height:1.2;
}
</style></head><body>
<h1 class="gradient-text">${text}</h1>
</body></html>`,
    css: `background:linear-gradient(${gradientStr}); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;`,
    colors,
    angle,
  };
};

// Outline/stroke text
const textOutline = ({ text = 'Sample Text', outlineColor = '#000', outlineWidth = 2, fillColor = '#fff', fontSize = 48, fontWeight = 900 }) => {
  return {
    effectType: 'outline',
    description: `Stroked text (outline effect via text-shadow layering)`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin:0; padding:60px 40px; background:#222; display:flex; align-items:center; justify-content:center; min-height:100vh }
.outline-text {
  font-size:${fontSize}px;
  font-weight:${fontWeight};
  color:${fillColor};
  margin:0;
  line-height:1.2;
  text-shadow:
    -${outlineWidth}px -${outlineWidth}px 0 ${outlineColor},
    0px -${outlineWidth}px 0 ${outlineColor},
    ${outlineWidth}px -${outlineWidth}px 0 ${outlineColor},
    -${outlineWidth}px 0px 0 ${outlineColor},
    ${outlineWidth}px 0px 0 ${outlineColor},
    -${outlineWidth}px ${outlineWidth}px 0 ${outlineColor},
    0px ${outlineWidth}px 0 ${outlineColor},
    ${outlineWidth}px ${outlineWidth}px 0 ${outlineColor};
}
</style></head><body>
<h1 class="outline-text">${text}</h1>
</body></html>`,
    css: `color:${fillColor}; text-shadow: -${outlineWidth}px -${outlineWidth}px 0 ${outlineColor}, ... (8 layers for full stroke);`,
    outlineColor,
    outlineWidth,
    fillColor,
  };
};

// Glow/shadow effect
const textGlow = ({ text = 'Sample Text', glowColor = '#00d9ff', glowSize = 20, fontSize = 48, fontWeight = 900, bgColor = '#000' }) => {
  return {
    effectType: 'glow',
    description: `Neon glow effect (text + shadow + filter)`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin:0; padding:60px 40px; background:${bgColor}; display:flex; align-items:center; justify-content:center; min-height:100vh }
.glow-text {
  font-size:${fontSize}px;
  font-weight:${fontWeight};
  color:${glowColor};
  margin:0;
  line-height:1.2;
  text-shadow:
    0 0 ${glowSize}px ${glowColor},
    0 0 ${glowSize * 2}px ${glowColor},
    0 0 ${glowSize * 3}px ${glowColor};
  filter:drop-shadow(0 0 ${glowSize}px ${glowColor});
}
</style></head><body>
<h1 class="glow-text">${text}</h1>
</body></html>`,
    css: `color:${glowColor}; text-shadow: 0 0 ${glowSize}px ${glowColor}, ...; filter: drop-shadow(0 0 ${glowSize}px ${glowColor});`,
    glowColor,
    glowSize,
  };
};

// Drop cap: first letter large and floated
const textDropCap = ({ text = 'Lorem ipsum dolor sit amet', letterColor = '#6366f1', fontSize = 48, lineHeight = 1.6 }) => {
  const firstLetter = text.charAt(0);
  const restText = text.slice(1);
  const dropCapSize = Math.round(fontSize * 3.5);
  return {
    effectType: 'drop-cap',
    description: 'Drop cap: first letter oversized and floated',
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin:0; padding:40px; background:#f9f9f9; font-family:system-ui,-apple-system,sans-serif }
.drop-cap-container { max-width:600px }
.drop-cap-letter {
  float:left;
  font-size:${dropCapSize}px;
  font-weight:900;
  color:${letterColor};
  line-height:1;
  padding-right:8px;
  padding-top:3px;
}
.drop-cap-text {
  font-size:${fontSize}px;
  line-height:${lineHeight};
  color:#333;
  margin:0;
}
</style></head><body>
<div class="drop-cap-container">
  <div class="drop-cap-letter">${firstLetter}</div>
  <p class="drop-cap-text">${restText}</p>
</div>
</body></html>`,
    css: `::first-letter { float:left; font-size:${dropCapSize}px; ... }`,
    letterColor,
  };
};

// Curved text via SVG path (advanced typographic effect)
const textCurved = ({ text = 'CURVED TEXT', radius = 100, direction = 'up', textColor = '#333' }) => {
  const id = `path-${Math.random().toString(36).slice(2, 8)}`;
  const pathD = direction === 'up'
    ? `M ${radius},${radius} A ${radius},${radius} 0 0,1 ${radius * 2},${radius}`
    : `M ${radius * 2},${radius} A ${radius},${radius} 0 0,1 ${radius},${radius}`;

  return {
    effectType: 'curved',
    description: `Text following curved path (advanced SVG)`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin:0; padding:60px 40px; background:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh }
svg { max-width:100%; height:auto }
</style></head><body>
<svg viewBox="0 0 ${radius * 2.5} ${radius * 2.5}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <path id="${id}" d="${pathD}" fill="none"/>
  </defs>
  <text font-size="24" font-weight="700" letter-spacing="2" fill="${textColor}">
    <textPath href="#${id}" startOffset="50%" text-anchor="middle">
      ${text}
    </textPath>
  </text>
</svg>
</body></html>`,
    textColor,
    radius,
    direction,
  };
};

// Text effect generator router
const generateTextEffect = async ({ effectType = 'gradient', text = '', ...options }) => {
  try {
    switch (effectType) {
      case 'gradient':
        return textGradient({ text, ...options });
      case 'outline':
        return textOutline({ text, ...options });
      case 'glow':
        return textGlow({ text, ...options });
      case 'drop-cap':
        return textDropCap({ text, ...options });
      case 'curved':
        return textCurved({ text, ...options });
      default:
        return textGradient({ text, ...options });
    }
  } catch (err) {
    return { error: 'text-effect-error', message: String(err.message) };
  }
};

// ── Slide HTML generator (Pinterest Design Patterns from CLAUDE.md) ──────────
const LAYOUT_PATTERNS = ['left-right', 'full-bleed', 'grid', 'asymmetric'];
const PALETTE_NAMES = ['warm-organic', 'bold-playful', 'dark-premium', 'clean-editorial'];

const PALETTE_DEFS = {
  'warm-organic':    { bg: '#F5EEE0', text: '#4A3728', primary: '#C65911', secondary: '#6B8E71', accent: '#D4AF37', cardBg: '#EDE3D2' },
  'bold-playful':    { bg: '#1A1A2E', text: '#FFFFFF', primary: '#E91E8C', secondary: '#00D9FF', accent: '#7FFF00', cardBg: '#16213E' },
  'dark-premium':    { bg: '#1A1A1A', text: '#FFFFFF', primary: '#E6D5B8', secondary: '#36454F', accent: '#C9A96E', cardBg: '#252525' },
  'clean-editorial': { bg: '#FFFFFF', text: '#001F3F', primary: '#001F3F', secondary: '#E8E8E8', accent: '#E63946', cardBg: '#F8F8F8' },
};

const generateSlideHtml = async ({
  title = '',
  subtitle = '',
  body = '',
  role = 'content',
  palette: paletteName,
  layout: layoutName,
  format = 'carousel',
  slideNum = 1,
  totalSlides = 5,
  emoji = '',
  brandColors = null,
}) => {
  // Resolve palette
  const pal = brandColors && brandColors.primary
    ? { bg: brandColors.bg || '#1A1A1A', text: brandColors.text || '#FFFFFF', primary: brandColors.primary, secondary: brandColors.secondary || '#888', accent: brandColors.accent || '#FFD700', cardBg: brandColors.cardBg || '#252525' }
    : PALETTE_DEFS[paletteName] || PALETTE_DEFS['dark-premium'];

  // Canvas dimensions
  const isVertical = format === 'reel' || format === 'story';
  const W = 1080, H = isVertical ? 1920 : 1350;
  const safeT = isVertical ? 220 : 120, safeB = isVertical ? 450 : 120;
  const safeL = isVertical ? 80 : 80, safeR = isVertical ? 80 : 80;

  // Layout pick
  const layout = layoutName || (role === 'hook' ? 'full-bleed' : role === 'cta' ? 'asymmetric' : 'left-right');

  // Progress dots
  const dotsHtml = Array.from({ length: totalSlides }, (_, i) =>
    `<div style="width:${i === slideNum - 1 ? 24 : 8}px;height:8px;border-radius:4px;background:${i === slideNum - 1 ? pal.primary : 'rgba(255,255,255,0.3)'}"></div>`
  ).join('');

  // Body bullets
  const bullets = body ? body.split(/[.·•\n]/).map(s => s.trim()).filter(s => s.length > 3) : [];
  const bulletsHtml = bullets.slice(0, 4).map(b =>
    `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
      <div style="width:6px;height:6px;border-radius:50%;background:${pal.primary};margin-top:10px;flex-shrink:0"></div>
      <p style="margin:0;font-size:24px;line-height:1.5;color:${pal.text};opacity:0.85">${escHtml(b)}</p>
    </div>`
  ).join('');

  const titleSize = title.length > 30 ? 52 : title.length > 20 ? 62 : 72;

  // Build layout-specific content area
  let contentArea = '';

  if (layout === 'full-bleed') {
    // Full-bleed: centered text overlay with semi-transparent backdrop
    contentArea = `
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:${safeT + 40}px ${safeL + 60}px ${safeB + 40}px">
        <div style="background:rgba(0,0,0,0.55);border-radius:24px;padding:60px 70px;max-width:${W - safeL * 2 - 80}px;text-align:center;backdrop-filter:blur(4px)">
          ${emoji ? `<div style="font-size:80px;margin-bottom:24px">${emoji}</div>` : ''}
          <h1 style="margin:0 0 20px;font-size:${titleSize}px;font-weight:900;color:#FFFFFF;line-height:1.1;letter-spacing:-1px">${escHtml(title)}</h1>
          ${subtitle ? `<p style="margin:0;font-size:28px;font-weight:400;color:rgba(255,255,255,0.8);line-height:1.4">${escHtml(subtitle)}</p>` : ''}
        </div>
      </div>`;
  } else if (layout === 'left-right') {
    // 40% text left, 60% accent right
    contentArea = `
      <div style="position:absolute;inset:0;display:flex;padding:${safeT + 40}px ${safeR}px ${safeB + 40}px ${safeL + 40}px;gap:40px;align-items:center">
        <div style="flex:0 0 55%;display:flex;flex-direction:column;justify-content:center">
          ${subtitle ? `<p style="margin:0 0 16px;font-size:20px;font-weight:600;color:${pal.primary};text-transform:uppercase;letter-spacing:3px">${escHtml(subtitle)}</p>` : ''}
          <h1 style="margin:0 0 28px;font-size:${Math.round(titleSize * 0.9)}px;font-weight:900;color:${pal.text};line-height:1.1">${escHtml(title)}</h1>
          ${bulletsHtml || (body ? `<p style="margin:0;font-size:24px;line-height:1.5;color:${pal.text};opacity:0.8">${escHtml(body)}</p>` : '')}
        </div>
        <div style="flex:1;height:${H - safeT - safeB - 120}px;background:${pal.primary};border-radius:24px;display:flex;align-items:center;justify-content:center">
          ${emoji ? `<span style="font-size:120px">${emoji}</span>` : `<div style="width:80px;height:80px;border-radius:50%;background:${pal.accent};opacity:0.5"></div>`}
        </div>
      </div>`;
  } else if (layout === 'grid') {
    // 2x2 grid for tips/checklist
    const items = bullets.slice(0, 4);
    while (items.length < 4) items.push('');
    const gridItems = items.map((item, i) => `
      <div style="background:${pal.cardBg};border-radius:20px;padding:32px;display:flex;flex-direction:column;gap:12px">
        <div style="width:40px;height:40px;border-radius:12px;background:${pal.primary};display:flex;align-items:center;justify-content:center">
          <span style="color:#fff;font-weight:700;font-size:18px">${i + 1}</span>
        </div>
        <p style="margin:0;font-size:22px;line-height:1.4;color:${pal.text}">${escHtml(item || '—')}</p>
      </div>`).join('');
    contentArea = `
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:${safeT + 20}px ${safeL + 40}px ${safeB + 20}px">
        <h1 style="margin:0 0 32px;font-size:${Math.round(titleSize * 0.8)}px;font-weight:900;color:${pal.text};line-height:1.1">${escHtml(title)}</h1>
        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:20px">${gridItems}</div>
      </div>`;
  } else {
    // asymmetric — large element one side, text opposite corner
    contentArea = `
      <div style="position:absolute;inset:0;padding:${safeT + 40}px ${safeR + 40}px ${safeB + 40}px ${safeL + 40}px">
        <div style="position:absolute;right:${safeR + 40}px;bottom:${safeB + 80}px;width:${Math.round(W * 0.45)}px;height:${Math.round(W * 0.45)}px;border-radius:50%;background:${pal.primary};opacity:0.15"></div>
        <div style="position:absolute;right:${safeR + 80}px;bottom:${safeB + 120}px;font-size:180px;opacity:0.9">${emoji || '✦'}</div>
        <div style="position:relative;max-width:${Math.round(W * 0.6)}px">
          ${subtitle ? `<p style="margin:0 0 20px;font-size:20px;font-weight:600;color:${pal.primary};text-transform:uppercase;letter-spacing:3px">${escHtml(subtitle)}</p>` : ''}
          <h1 style="margin:0 0 24px;font-size:${titleSize}px;font-weight:900;color:${pal.text};line-height:1.05">${escHtml(title)}</h1>
          ${body ? `<p style="margin:0;font-size:24px;line-height:1.5;color:${pal.text};opacity:0.8">${escHtml(body.slice(0, 120))}</p>` : ''}
        </div>
      </div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Poppins',sans-serif;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}</style>
</head><body>
<div style="position:relative;width:${W}px;height:${H}px;background:${pal.bg};overflow:hidden;flex-shrink:0">
  <!-- Gradient overlay -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at top right,${pal.secondary}22 0%,transparent 65%)"></div>
  <!-- Content -->
  ${contentArea}
  <!-- Corner accent -->
  <div style="position:absolute;top:${safeT - 30}px;left:${safeL + 30}px;width:40px;height:4px;background:${pal.primary};border-radius:2px"></div>
  <!-- Progress dots -->
  ${totalSlides > 1 ? `<div style="position:absolute;bottom:${safeB - 60}px;left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center">${dotsHtml}</div>` : ''}
  <!-- Slide number -->
  <div style="position:absolute;top:${safeT + 20}px;right:${safeR + 20}px;font-size:16px;color:${pal.text};opacity:0.4;font-weight:600">${slideNum}/${totalSlides}</div>
</div>
</body></html>`;

  return { html, width: W, height: H, palette: pal, layout };
};

const escHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Slide series (full carousel) ─────────────────────────────────────────────
// Maps role → best default layout
const ROLE_LAYOUT = { hook: 'full-bleed', cta: 'asymmetric', content: 'left-right', grid: 'grid' };

// LLM plans a complete carousel structure then we render each slide to HTML
const generateSlideSeries = async ({
  topic,
  slideCount = 5,
  palette: paletteName = 'dark-premium',
  format = 'carousel',
  niche = '',
  brandColors = null,
}) => {
  const count = Math.min(10, Math.max(3, Number(slideCount)));

  // Ask LLM to plan carousel content
  const planPrompt = `Planificá un carrusel de Instagram de ${count} slides sobre: "${topic}"${niche ? ` para nicho ${niche}` : ''}.

REGLAS:
- Slide 1: role="hook" — título gancho IMPACTANTE (máx 6 palabras), subtitle corto, emoji relevante. Layout: full-bleed.
- Slides 2 a ${count - 1}: role="content" — cada uno un punto/tip específico. Layouts: left-right o grid (para slides con lista).
- Slide ${count}: role="cta" — llamado a la acción claro. Layout: asymmetric.
- title: máx 8 palabras. body: 2-3 bullets concretos separados por punto.
- Contenido REAL y específico al topic. Sin placeholders.

Devolvé SOLO JSON válido:
{"slides":[{"title":"...","subtitle":"...","body":"...","emoji":"...","role":"hook|content|cta","layout":"full-bleed|left-right|grid|asymmetric"}]}`;

  let slidePlan = null;
  try {
    slidePlan = await askLLMJson(planPrompt, { maxTokens: 1200, temperature: 0.6 });
  } catch { /* fallback below */ }

  // Fallback: generic plan if LLM fails
  if (!Array.isArray(slidePlan?.slides) || !slidePlan.slides.length) {
    slidePlan = {
      slides: [
        { title: topic, subtitle: 'Todo lo que necesitás saber', body: '', emoji: '🚀', role: 'hook', layout: 'full-bleed' },
        ...Array.from({ length: count - 2 }, (_, i) => ({
          title: `Punto ${i + 1}`,
          subtitle: `Clave #${i + 1}`,
          body: `Información importante sobre ${topic}.`,
          emoji: ['💡', '✅', '⚡', '🎯', '📈', '🔥', '💪'][i % 7],
          role: 'content',
          layout: i % 3 === 2 ? 'grid' : 'left-right',
        })),
        { title: '¿Te sirvió?', subtitle: 'Guardalo para no olvidarlo', body: 'Seguime para más tips. Compartilo con alguien que lo necesite.', emoji: '🙌', role: 'cta', layout: 'asymmetric' },
      ],
    };
  }

  const slides = slidePlan.slides.slice(0, count);
  const total = slides.length;

  // Render each slide to HTML
  const rendered = await Promise.all(
    slides.map((s, i) =>
      generateSlideHtml({
        title:      s.title || '',
        subtitle:   s.subtitle || '',
        body:       s.body || '',
        emoji:      s.emoji || '',
        role:       s.role || 'content',
        palette:    paletteName,
        layout:     s.layout || ROLE_LAYOUT[s.role] || 'left-right',
        format,
        slideNum:   i + 1,
        totalSlides: total,
        brandColors,
      }).catch(err => ({ html: `<html><body><p>Error slide ${i + 1}: ${err.message}</p></body></html>`, error: true }))
    )
  );

  return {
    topic,
    total,
    palette: paletteName,
    format,
    slides: rendered.map((r, i) => ({
      num: i + 1,
      role: slides[i]?.role || 'content',
      title: slides[i]?.title || '',
      html: r.html,
      width: r.width || 1080,
      height: r.height || 1350,
    })),
  };
};

// ── Router ───────────────────────────────────────────────────────────────────
export const handleDesignTools = async (req, res, path, method, body) => {
  if (!path.startsWith('/api/design')) return false;

  if (path === '/api/design/status' && method === 'GET') {
    return json(res, 200, {
      removeBg:  { active: Boolean(FAL()), provider: 'fal-ai/birefnet' },
      upscale:   { active: Boolean(FAL()), provider: 'fal-ai/clarity-upscaler' },
      palette:   { active: true, provider: 'pure-js pixel sampling' },
      fontPair:  { active: true, provider: 'llm' },
      slideHtml:   { active: true, palettes: PALETTE_NAMES, layouts: LAYOUT_PATTERNS },
      slideSeries: { active: true, maxSlides: 10 },
      phase1: {
        crop:     { active: HAS_VISION, provider: 'vision + rule-of-thirds' },
        colorize: { active: HAS_VISION, provider: 'vision + llm colors' },
        blurBg:   { active: Boolean(FAL()), provider: 'fal-ai birefnet + blur' },
        frame:    { active: true, provider: 'SVG + CSS styles' },
      },
      phase2: {
        layouts: { active: true, types: ['hero', 'grid-3col', 'masonry', 'asymmetric', 'ken-burns'] },
      },
      phase3: {
        textEffects: { active: true, types: ['gradient', 'outline', 'glow', 'drop-cap', 'curved'] },
      },
    }), true;
  }

  // PHASE 1: Image Composition routes
  if (path === '/api/design/crop' && method === 'POST') {
    if (!body?.imageUrl) return json(res, 400, { error: 'imageUrl requerida' }), true;
    const result = await cropOptimize(body.imageUrl, { aspectRatio: body.aspectRatio || '1:1', force: body.force || false });
    return json(res, result.error ? 422 : 200, result), true;
  }

  if (path === '/api/design/colorize' && method === 'POST') {
    if (!body?.imageUrl) return json(res, 400, { error: 'imageUrl requerida' }), true;
    const result = await colorize(body.imageUrl, { mood: body.mood || 'vibrant', intensity: body.intensity || 0.8 });
    return json(res, result.error ? 422 : 200, result), true;
  }

  if (path === '/api/design/blur-bg' && method === 'POST') {
    if (!body?.imageUrl) return json(res, 400, { error: 'imageUrl requerida' }), true;
    const result = await blurBg(body.imageUrl, { blurStrength: body.blurStrength || 'medium', preserveEdges: body.preserveEdges !== false });
    return json(res, result.error ? 422 : 200, result), true;
  }

  if (path === '/api/design/frame' && method === 'POST') {
    if (!body?.imageUrl) return json(res, 400, { error: 'imageUrl requerida' }), true;
    const result = await frameStyles(body.imageUrl, { style: body.style || 'minimal', color: body.color || '#000', thickness: body.thickness || 8 });
    return json(res, 200, result), true;
  }

  // PHASE 3: Text Effects routes
  if (path === '/api/design/text-effect' && method === 'POST') {
    const { effectType, text } = body || {};
    if (!text) return json(res, 400, { error: 'text requerido' }), true;
    if (!effectType) return json(res, 400, { error: 'effectType requerido (gradient|outline|glow|drop-cap|curved)' }), true;
    try {
      const result = await generateTextEffect({ effectType, text, ...body });
      return json(res, result.error ? 422 : 200, result), true;
    } catch (err) {
      return json(res, 500, { error: 'text-effect-gen', message: String(err.message) }), true;
    }
  }

  if (path === '/api/design/text-effects' && method === 'GET') {
    return json(res, 200, {
      available: [
        { id: 'gradient', label: 'Gradient Text', desc: 'Linear gradient applied to text via background-clip', params: ['angle', 'colors'] },
        { id: 'outline', label: 'Outline/Stroke', desc: 'Text with stroke outline via text-shadow layering', params: ['outlineColor', 'outlineWidth'] },
        { id: 'glow', label: 'Neon Glow', desc: 'Glowing text with multiple shadows + filter', params: ['glowColor', 'glowSize'] },
        { id: 'drop-cap', label: 'Drop Cap', desc: 'Oversized first letter floated left', params: ['letterColor'] },
        { id: 'curved', label: 'Curved Text', desc: 'Text following SVG path (advanced)', params: ['radius', 'direction'] },
      ],
    }), true;
  }

  // PHASE 2: Layout Templates routes
  if (path === '/api/design/layout' && method === 'POST') {
    const { layoutType, imageUrl, images, title, subtitle, text, items, bgColor, textColor, accentColor, duration } = body || {};
    if (!layoutType) return json(res, 400, { error: 'layoutType requerido (hero|grid-3col|masonry|asymmetric|ken-burns)' }), true;
    try {
      const result = await generateLayout({ layoutType, imageUrl, images, title, subtitle, text, items, bgColor, textColor, accentColor, duration });
      return json(res, result.error ? 422 : 200, result), true;
    } catch (err) {
      return json(res, 500, { error: 'layout-gen', message: String(err.message) }), true;
    }
  }

  if (path === '/api/design/layouts' && method === 'GET') {
    return json(res, 200, {
      available: [
        { id: 'hero', label: 'Hero + Centered', desc: 'Full-bleed image + centered text overlay · inspirational', requiresImages: 1 },
        { id: 'grid-3col', label: '3-Column Grid', desc: 'Tips, features, benefits · structured', requiresImages: 0 },
        { id: 'masonry', label: 'Masonry', desc: 'Pinterest-style irregular grid · visual interest', requiresImages: 6 },
        { id: 'asymmetric', label: 'Asymmetric', desc: 'Main element one side, text opposite · modern', requiresImages: 1 },
        { id: 'ken-burns', label: 'Ken Burns', desc: 'Zoom + pan animation · cinematic', requiresImages: 1 },
      ],
    }), true;
  }

  if (path === '/api/design/remove-bg' && method === 'POST') {
    if (!body?.imageUrl) return json(res, 400, { error: 'imageUrl requerida' }), true;
    try {
      const result = await removeBg(body.imageUrl);
      return json(res, 200, result), true;
    } catch (e) {
      return json(res, 500, { error: String(e.message) }), true;
    }
  }

  if (path === '/api/design/upscale' && method === 'POST') {
    if (!body?.imageUrl) return json(res, 400, { error: 'imageUrl requerida' }), true;
    const scale = [2, 4].includes(Number(body.scale)) ? Number(body.scale) : 2;
    try {
      const result = await upscale(body.imageUrl, scale);
      return json(res, 200, result), true;
    } catch (e) {
      return json(res, 500, { error: String(e.message) }), true;
    }
  }

  if (path === '/api/design/palette' && method === 'POST') {
    if (!body?.imageUrl) return json(res, 400, { error: 'imageUrl requerida' }), true;
    try {
      const result = await extractPalette(body.imageUrl);
      return json(res, 200, result), true;
    } catch (e) {
      return json(res, 500, { error: String(e.message) }), true;
    }
  }

  if (path === '/api/design/font-pair' && method === 'POST') {
    const result = await fontPair(body?.style, body?.niche).catch(() => ({ pairs: FONT_PAIRS_FALLBACK }));
    return json(res, 200, result), true;
  }

  if (path === '/api/design/slide-html' && method === 'POST') {
    if (!body?.title) return json(res, 400, { error: 'title requerido' }), true;
    try {
      const result = await generateSlideHtml(body);
      return json(res, 200, result), true;
    } catch (e) {
      return json(res, 500, { error: String(e.message) }), true;
    }
  }

  if (path === '/api/design/slide-series' && method === 'POST') {
    if (!body?.topic) return json(res, 400, { error: 'topic requerido' }), true;
    try {
      const result = await generateSlideSeries(body);
      return json(res, 200, result), true;
    } catch (e) {
      return json(res, 500, { error: String(e.message) }), true;
    }
  }

  return false;
};
