/**
 * Stories Engine — pipeline visual de historias 1080x1920 (9:16).
 *
 * Genera frames con LLM + renderiza cada uno como SVG (texto nítido, sticker
 * placeholders, good-zones de Instagram respetadas).
 *
 * Reutiliza utilidades de _carouselComposer.js (fitText, wrapTextPx, isDark, esc,
 * tspans, buildPalette) y _canvasSpecs.js (getSpec('instagram','story')).
 *
 * Endpoint: POST /api/stories/generate
 */

import { askLLMJson } from './_llm.js';
import { getSpec } from './_canvasSpecs.js';
import { fitText, esc, tspans, isDark } from './_carouselComposer.js';
import { buildPriming, detectNiche } from './_promptLibrary.js';

// Reutilizo buildPalette (no exportado en _carouselComposer.js) — inline simple
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
const resolveColor = (n) => (/^#[0-9a-f]{3,8}$/i.test(n || '') ? n : COLOR_MAP[(n || '').toLowerCase().trim()] || null);
const buildPalette = (brandColors = []) => {
  const resolved = (brandColors || []).map(resolveColor).filter(Boolean);
  if (resolved.length >= 2) {
    const dark = resolved.find((c) => isDark(c)) || resolved[0];
    const accent = resolved.find((c) => !isDark(c)) || resolved[resolved.length - 1];
    return { bg: dark, fg: isDark(dark) ? '#FFFFFF' : '#0B0B0F', accent };
  }
  if (resolved.length === 1) {
    const c = resolved[0];
    return isDark(c) ? { bg: c, fg: '#FFFFFF', accent: '#10F2B0' } : { bg: '#0B0B0F', fg: '#FFFFFF', accent: c };
  }
  return { bg: '#0B0B0F', fg: '#FFFFFF', accent: '#10F2B0' };
};

const svgToDataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

// ── Renderizador de frame SVG (1080x1920 con good-zones respetadas) ──────────
export const renderStoryFrameSVG = (frame, palette, spec, photoDataUrl = null) => {
  const W = spec.canvas.w,
    H = spec.canvas.h;
  const safeTop = spec.safe?.top || 250,
    safeBottom = spec.safe?.bottom || 250;
  const ml = spec.margin?.left || 80;
  const { bg, fg, accent } = palette;

  const role = frame.role || frame.tipo || 'gancho';
  const main = frame.text || frame.textoPrincipal || frame.title || '';
  const sub = frame.subtext || frame.textoSecundario || frame.body || '';
  const sticker = frame.sticker || frame.stickers || null;
  const cta = frame.cta || '';

  // Fondo: foto si hay (solo primer frame), si no gradient sutil con accent
  const background = photoDataUrl
    ? `<image href="${photoDataUrl}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
       <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}" opacity="0.55"/>`
    : `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
       <circle cx="${W * 0.85}" cy="${H * 0.15}" r="${W * 0.35}" fill="${accent}" opacity="0.15"/>
       <circle cx="${W * 0.15}" cy="${H * 0.85}" r="${W * 0.25}" fill="${accent}" opacity="0.10"/>`;

  // Texto principal: dentro de good-zone (centro vertical)
  const usableH = H - safeTop - safeBottom - 200;
  const fit = fitText(main || 'Tu historia', {
    maxWidthPx: W - ml * 2,
    maxHeightPx: usableH * 0.55,
    startSize: 130,
    minSize: 60,
    maxLines: 4,
  });
  const mainStartY = safeTop + 280 + fit.size;

  // Subtext (más pequeño debajo)
  const subFit = sub
    ? fitText(sub, {
        maxWidthPx: W - ml * 2,
        maxHeightPx: usableH * 0.25,
        startSize: 56,
        minSize: 32,
        maxLines: 4,
      })
    : null;

  // Sticker visual (placeholder según tipo)
  const stickerSvg = sticker ? renderSticker(sticker, W, H, safeTop, accent, fg) : '';

  // CTA (solo último frame)
  const ctaSvg = cta
    ? `<rect x="${W / 2 - 260}" y="${H - safeBottom - 60}" width="520" height="100" rx="50" fill="${accent}"/>
       <text x="${W / 2}" y="${H - safeBottom + 8}" fill="${isDark(accent) ? '#fff' : '#000'}" font-size="40" font-weight="900" text-anchor="middle" font-family="Inter, Arial, sans-serif">${esc(cta.slice(0, 22))}</text>`
    : '';

  // Indicador de tipo arriba (chip)
  const roleChip = `<rect x="${ml}" y="${safeTop + 30}" width="200" height="48" rx="24" fill="${accent}"/>
    <text x="${ml + 100}" y="${safeTop + 62}" fill="${isDark(accent) ? '#fff' : '#000'}" font-size="22" font-weight="900" text-anchor="middle" font-family="Inter, Arial, sans-serif">${esc(role.toUpperCase())}</text>`;

  // Pagination dot indicator (top)
  const totalFrames = frame.total || 5;
  const dotW = (W - ml * 2 - (totalFrames - 1) * 8) / totalFrames;
  const dots = Array.from({ length: totalFrames })
    .map(
      (_, i) =>
        `<rect x="${ml + i * (dotW + 8)}" y="${safeTop - 20}" width="${dotW}" height="6" rx="3" fill="${fg}" opacity="${i === frame.n - 1 ? '1' : '0.3'}"/>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    ${background}
    ${dots}
    ${roleChip}
    ${tspans(fit.lines, ml, mainStartY, fit.lineH, fg, fit.size, '900')}
    ${subFit ? tspans(subFit.lines, ml, mainStartY + fit.lines.length * fit.lineH + 40 + subFit.size, subFit.lineH, fg, subFit.size, '500') : ''}
    ${stickerSvg}
    ${ctaSvg}
  </svg>`;
};

// ── Sticker visual placeholder (poll / pregunta / slider) ────────────────────
const renderSticker = (sticker, W, H, safeTop, accent, fg) => {
  const stickerLabel = typeof sticker === 'string' ? sticker : sticker?.type || sticker?.tipo || 'engagement';
  const s = stickerLabel.toLowerCase();
  const cy = H - 600;
  if (s.includes('encuesta') || s.includes('poll')) {
    return `<rect x="${(W - 700) / 2}" y="${cy}" width="700" height="180" rx="20" fill="rgba(255,255,255,0.95)"/>
      <text x="${W / 2}" y="${cy + 50}" fill="#000" font-size="28" font-weight="800" text-anchor="middle" font-family="Inter, Arial, sans-serif">${esc(typeof sticker === 'object' ? sticker.question || '¿Sí o No?' : '¿Sí o No?')}</text>
      <rect x="${(W - 660) / 2}" y="${cy + 80}" width="310" height="70" rx="14" fill="#10b981"/>
      <text x="${(W - 660) / 2 + 155}" y="${cy + 125}" fill="#fff" font-size="32" font-weight="900" text-anchor="middle" font-family="Inter, Arial, sans-serif">SÍ ✅</text>
      <rect x="${(W + 40) / 2}" y="${cy + 80}" width="310" height="70" rx="14" fill="#ef4444"/>
      <text x="${(W + 40) / 2 + 155}" y="${cy + 125}" fill="#fff" font-size="32" font-weight="900" text-anchor="middle" font-family="Inter, Arial, sans-serif">NO ❌</text>`;
  }
  if (s.includes('pregunta') || s.includes('question') || s.includes('ask')) {
    return `<rect x="${(W - 700) / 2}" y="${cy}" width="700" height="180" rx="20" fill="rgba(255,255,255,0.95)"/>
      <text x="${W / 2}" y="${cy + 50}" fill="#000" font-size="26" font-weight="800" text-anchor="middle" font-family="Inter, Arial, sans-serif">💬 ${esc(typeof sticker === 'object' ? sticker.question || 'Preguntame lo que sea' : 'Preguntame lo que sea')}</text>
      <rect x="${(W - 600) / 2}" y="${cy + 90}" width="600" height="70" rx="14" fill="#f3f4f6" stroke="#9ca3af" stroke-width="2"/>
      <text x="${(W - 600) / 2 + 20}" y="${cy + 135}" fill="#6b7280" font-size="28" font-family="Inter, Arial, sans-serif">Escribí tu pregunta…</text>`;
  }
  if (s.includes('slider') || s.includes('emoji')) {
    return `<rect x="${(W - 700) / 2}" y="${cy}" width="700" height="180" rx="20" fill="rgba(255,255,255,0.95)"/>
      <text x="${W / 2}" y="${cy + 60}" fill="#000" font-size="28" font-weight="800" text-anchor="middle" font-family="Inter, Arial, sans-serif">${esc(typeof sticker === 'object' ? sticker.question || '¿Cuánto te gusta?' : '¿Cuánto te gusta?')}</text>
      <line x1="${(W - 600) / 2}" y1="${cy + 130}" x2="${(W + 600) / 2}" y2="${cy + 130}" stroke="#d1d5db" stroke-width="6"/>
      <circle cx="${W / 2 + 100}" cy="${cy + 130}" r="35" fill="${accent}"/>
      <text x="${W / 2 + 100}" y="${cy + 140}" fill="#fff" font-size="30" text-anchor="middle">🔥</text>`;
  }
  if (s.includes('quiz') || s.includes('cuestionario')) {
    return `<rect x="${(W - 700) / 2}" y="${cy - 30}" width="700" height="270" rx="20" fill="rgba(255,255,255,0.95)"/>
      <text x="${W / 2}" y="${cy + 20}" fill="#000" font-size="28" font-weight="900" text-anchor="middle" font-family="Inter, Arial, sans-serif">🎯 QUIZ</text>
      <rect x="${(W - 600) / 2}" y="${cy + 50}" width="600" height="50" rx="10" fill="#a855f7"/>
      <text x="${(W - 600) / 2 + 20}" y="${cy + 85}" fill="#fff" font-size="22" font-weight="700" font-family="Inter, Arial, sans-serif">A · ${esc(typeof sticker === 'object' ? sticker.optionA || 'Opción A' : 'Opción A')}</text>
      <rect x="${(W - 600) / 2}" y="${cy + 110}" width="600" height="50" rx="10" fill="#3b82f6"/>
      <text x="${(W - 600) / 2 + 20}" y="${cy + 145}" fill="#fff" font-size="22" font-weight="700" font-family="Inter, Arial, sans-serif">B · ${esc(typeof sticker === 'object' ? sticker.optionB || 'Opción B' : 'Opción B')}</text>
      <rect x="${(W - 600) / 2}" y="${cy + 170}" width="600" height="50" rx="10" fill="#10b981"/>
      <text x="${(W - 600) / 2 + 20}" y="${cy + 205}" fill="#fff" font-size="22" font-weight="700" font-family="Inter, Arial, sans-serif">C · ${esc(typeof sticker === 'object' ? sticker.optionC || 'Opción C' : 'Opción C')}</text>`;
  }
  if (s.includes('link') || s.includes('swipe')) {
    return `<rect x="${(W - 600) / 2}" y="${cy + 60}" width="600" height="100" rx="50" fill="#fff" stroke="${accent}" stroke-width="4"/>
      <text x="${W / 2}" y="${cy + 122}" fill="#000" font-size="32" font-weight="900" text-anchor="middle" font-family="Inter, Arial, sans-serif">🔗 ${esc(typeof sticker === 'object' ? sticker.linkText || 'Ver más' : 'Ver más')}</text>`;
  }
  // Sticker genérico (chip)
  return `<rect x="${(W - 500) / 2}" y="${cy + 60}" width="500" height="80" rx="40" fill="rgba(255,255,255,0.95)"/>
    <text x="${W / 2}" y="${cy + 110}" fill="#000" font-size="26" font-weight="800" text-anchor="middle" font-family="Inter, Arial, sans-serif">${esc(stickerLabel.slice(0, 30))}</text>`;
};

// ── Generador de frames (LLM) ────────────────────────────────────────────────
const generateFramesLLM = async ({ topic, niche, goal, framesCount = 5, archetype = 'cercano' }) => {
  const detectedNiche = niche || detectNiche(topic);
  const { priming } = buildPriming('any_story_set', { topic, niche: detectedNiche, archetype });

  const prompt = `${priming}

Generá ${framesCount} frames de Instagram Stories sobre "${topic}". Objetivo: ${goal}.
Cada frame ≤8 palabras de texto principal + 1 oración de apoyo opcional.
Sticker interactivo en frames 2-4 (encuesta/pregunta/slider/quiz).
Último frame = CTA con link/comentario/follow.

SOLO JSON array (${framesCount} objetos):
[
  {"role":"gancho","text":"texto principal corto","subtext":"apoyo opcional","sticker":null,"cta":null},
  {"role":"contexto","text":"...","subtext":"...","sticker":"encuesta","cta":null},
  {"role":"revelacion","text":"...","subtext":"...","sticker":"pregunta","cta":null},
  {"role":"proof","text":"...","subtext":"...","sticker":"slider","cta":null},
  {"role":"cta","text":"...","subtext":"","sticker":"link","cta":"Ver más"}
]`;

  const out = await askLLMJson(prompt).catch(() => null);
  if (Array.isArray(out) && out.length >= 3) {
    return out.slice(0, framesCount).map((f, i) => ({
      role: f.role || ['gancho', 'contexto', 'revelacion', 'proof', 'cta'][i] || 'frame',
      text: (f.text || f.textoPrincipal || '').trim(),
      subtext: (f.subtext || f.textoSecundario || '').trim(),
      sticker: f.sticker || null,
      cta: f.cta || null,
    }));
  }
  // Fallback determinista
  return fallbackFrames({ topic, framesCount });
};

const fallbackFrames = ({ topic, framesCount = 5 }) =>
  [
    { role: 'gancho', text: `Esto te va a sorprender sobre ${topic}`, subtext: '', sticker: null, cta: null },
    { role: 'contexto', text: '3 cosas que descubrí', subtext: 'Y la #3 cambió todo', sticker: 'encuesta', cta: null },
    { role: 'revelacion', text: 'Lo que nadie te dice', subtext: 'La verdad incómoda', sticker: 'pregunta', cta: null },
    { role: 'proof', text: 'Mis resultados reales', subtext: 'Sin trucos ni filtros', sticker: 'slider', cta: null },
    { role: 'cta', text: '¿Querés más?', subtext: 'Comentá INFO', sticker: 'link', cta: 'Ver más' },
  ].slice(0, framesCount);

// ── Orquestador principal ────────────────────────────────────────────────────
export const generateStories = async ({
  topic = '',
  niche = '',
  goal = 'engagement',
  archetype = 'cercano',
  framesCount = 5,
  brandColors = [],
  photoDataUrl = null,
  brandHandle = '',
  scope = 'anon',
  accountId = '',
} = {}) => {
  const spec = getSpec('instagram', 'story');
  const palette = buildPalette(brandColors);
  const framesText = await generateFramesLLM({ topic, niche, goal, framesCount, archetype });
  const total = framesText.length;

  const frames = framesText.map((f, i) => {
    const frameData = { ...f, n: i + 1, total };
    const svg = renderStoryFrameSVG(frameData, palette, spec, i === 0 ? photoDataUrl : null);
    return {
      n: i + 1,
      role: f.role,
      text: f.text,
      subtext: f.subtext,
      sticker: f.sticker,
      cta: f.cta,
      dataUrl: svgToDataUrl(svg),
    };
  });

  return { frames, palette, spec: { w: spec.canvas.w, h: spec.canvas.h, aspect: spec.aspect } };
};

// ── HTTP handler ──────────────────────────────────────────────────────────────
export const handleStoriesEngine = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/stories/generate' && m === 'POST') {
    try {
      const result = await generateStories({
        topic: body?.topic || '',
        niche: body?.niche || '',
        goal: body?.goal || 'engagement',
        archetype: body?.archetype || 'cercano',
        framesCount: Math.max(3, Math.min(8, body?.framesCount || 5)),
        brandColors: body?.brandColors || [],
        photoDataUrl: body?.images?.[0] || body?.photoDataUrl || null,
        brandHandle: body?.brandHandle || (body?.accountId ? `@${body.accountId.replace(/^@/, '')}` : ''),
        scope: ctx.userId || 'anon',
        accountId: body?.accountId || '',
      });
      return json(200, { ok: true, ...result });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 300) });
    }
  }

  return false;
};
