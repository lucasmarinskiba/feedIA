/**
 * Brand Studio — Generación de imágenes de marca usando fotos autorizadas del usuario.
 *
 * Flujo: el usuario sube su(s) foto(s) → se usa como protagonista → se aplica
 * estilo/diseño + colores de marca + elementos visuales del nicho → imagen final.
 *
 * Motor primario: Gemini 2.5 Flash Image ("nano-banana") — acepta imágenes de
 * referencia + prompt y devuelve imagen editada/compuesta. Free tier. $0.
 * Fallback: text-to-image (smartGenerateImage) SIN foto (cuando no hay key/modelo).
 *
 * Endpoints:
 *   GET  /api/brand-studio/templates    → librería de prompts de ejemplo
 *   POST /api/brand-studio/build-prompt → arma prompt optimizado desde campos
 *   POST /api/brand-studio/generate     → genera imagen con fotos + prompt
 */

import { smartGenerateImage } from './_imageProviders.js';
import { getSpec } from './_canvasSpecs.js';
import { carouselRulesPromptText } from './_carouselViralRules.js';

const ENV = process.env;
const GEMINI_IMAGE_MODEL = ENV.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview';

// ── Plantillas de prompt (espejo de los ejemplos del usuario) ────────────────
export const PROMPT_TEMPLATES = {
  'anuncio-ganador': {
    label: '🏆 Anuncio ganador',
    desc: 'Foto del usuario como protagonista en un anuncio premium con título grande',
    fields: ['producto', 'estilo', 'colores', 'nicho', 'titulo', 'formato'],
    template:
      'Usá esta foto como protagonista. Diseñá un anuncio para {producto}. Estilo {estilo}. Usá los colores {colores}. Agregá elementos visuales relacionados con {nicho}. Título: {titulo}. Formato {formato}. Composición premium, alto contraste, iluminación cinematográfica, texto legible y jerarquía visual clara.',
    example: {
      producto: 'CarouselCode (sistema de carruseles)',
      estilo: 'PREMIUM / MODERNO',
      colores: 'verde menta + negro',
      nicho: 'marketing de contenidos',
      titulo: 'CAROUSEL CODE',
      formato: 'vertical 9:16',
    },
  },
  carrusel: {
    label: '🎠 Carrusel seamless',
    desc: 'Carrusel de varios slides con foto del usuario como protagonista',
    fields: ['tema', 'colores', 'estiloRef', 'slides', 'formato'],
    template:
      'Creá un carrusel seamless de {slides} slides sobre {tema}. Usá los colores de la marca {colores} y el estilo visual de referencia. Utilizá las fotos adjuntas como protagonista. Incluí: Hook llamativo en slide 1, ideas principales en slides intermedios, CTA en el último slide. Diseño premium, moderno, alto contraste, optimizado para Instagram. Formato {formato}.',
    example: {
      tema: 'cómo generar ingresos con productos digitales low ticket',
      colores: 'violeta + blanco',
      estiloRef: 'editorial moderno',
      slides: '5',
      formato: '3:4 (1080x1440)',
    },
  },
  branding: {
    label: '🎨 Identidad visual / Branding',
    desc: 'Sistema de identidad de marca a partir de logo + paleta + tipografía',
    fields: ['marca', 'paleta', 'tipografia', 'estilo'],
    template:
      'Creá una identidad visual para {marca}. Usá el logo adjunto como punto de partida. Basándote en la paleta de colores {paleta} y tipografía {tipografia}, desarrollá: dirección visual de marca, variaciones del logo, paleta principal y secundaria, sistema tipográfico, estilo visual para redes sociales y mockups de aplicación de marca. El resultado debe verse {estilo}, premium y coherente en todos los puntos de contacto.',
    example: {
      marca: 'finmark AI',
      paleta: 'violetas + rosa + negro',
      tipografia: 'Neue Montreal',
      estilo: 'moderno, tecnológico',
    },
  },
  'portada-reel': {
    label: '🎬 Portada de Reel',
    desc: 'Portada de reel con foto del usuario + texto hook',
    fields: ['tema', 'hook', 'colores', 'estilo', 'nicho'],
    template:
      'Diseñá una portada de reel vertical 9:16 usando esta foto como protagonista. Tema: {tema}. Texto principal grande y legible: "{hook}". Usá los colores {colores}. Estilo {estilo}. Agregá elementos visuales de {nicho}. Texto en el tercio central-superior (zona segura), nada importante en los últimos 450px (zona de UI de Instagram).',
    example: {
      tema: 'productividad con IA',
      hook: '25 hooks de storytelling para reels',
      colores: 'verde menta + negro',
      estilo: 'PREMIUM oscuro con glow',
      nicho: 'marketing digital',
    },
  },
  'producto-mockup': {
    label: '📦 Mockup de producto',
    desc: 'Producto/servicio del usuario presentado de forma profesional',
    fields: ['producto', 'colores', 'estilo', 'fondo'],
    template:
      'Creá un mockup profesional de {producto} usando la imagen adjunta. Usá los colores de marca {colores}. Estilo {estilo}. Fondo {fondo}. Iluminación de estudio, sombras suaves, composición centrada, calidad publicitaria.',
    example: {
      producto: 'un curso online (mockup de dispositivos)',
      colores: 'azul + blanco',
      estilo: 'minimalista limpio',
      fondo: 'degradado suave',
    },
  },
};

// ── Estilos de diseño disponibles ─────────────────────────────────────────────
export const DESIGN_STYLES = [
  { key: 'premium', label: 'Premium', desc: 'Alto contraste, lujo, iluminación cinematográfica' },
  { key: 'moderno', label: 'Moderno', desc: 'Limpio, geométrico, tendencia actual' },
  { key: 'minimalista', label: 'Minimalista', desc: 'Espacios en blanco, simple, elegante' },
  { key: 'editorial', label: 'Editorial', desc: 'Estilo revista, tipografía protagonista' },
  { key: 'oscuro-glow', label: 'Oscuro con glow', desc: 'Fondo oscuro, neón, efecto luminoso' },
  { key: 'colorido-genz', label: 'Colorido Gen-Z', desc: 'Vibrante, bold, divertido' },
  { key: 'corporativo', label: 'Corporativo', desc: 'Serio, confiable, profesional' },
  { key: 'organico', label: 'Orgánico/Natural', desc: 'Tonos tierra, cálido, auténtico' },
];

// ── Construcción de prompt optimizado ─────────────────────────────────────────
const fill = (tpl, vars = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] || `[${k}]`);

export const buildBrandPrompt = ({
  templateKey = 'anuncio-ganador',
  vars = {},
  brandColors = [],
  niche = '',
  platform = 'instagram',
  format = 'carousel',
  extraElements = [],
} = {}) => {
  const tpl = PROMPT_TEMPLATES[templateKey] || PROMPT_TEMPLATES['anuncio-ganador'];
  const mergedVars = {
    ...tpl.example,
    ...vars,
    colores:
      Array.isArray(brandColors) && brandColors.length ? brandColors.join(', ') : vars.colores || tpl.example.colores,
    nicho: niche || vars.nicho || tpl.example.nicho,
  };

  const spec = getSpec(platform, format);
  const specHint = spec ? ` Dimensiones: ${spec.canvas.w}x${spec.canvas.h} (${spec.aspect}). ${spec.tip || ''}` : '';

  const elementsHint = extraElements.length
    ? ` Elementos visibles a incluir relacionados a la cuenta: ${extraElements.join(', ')}.`
    : '';

  // Carrusel/reel → inyectar reglas de viralidad (texto grande, jerarquía, formato validado)
  const isCarousel = templateKey === 'carrusel';
  const viralHint = isCarousel ? '\n\n' + carouselRulesPromptText(parseInt(mergedVars.slides, 10) || 5) : '';

  // Guarantee string — mismos principios que el pipeline TS (facial-identity,
  // resolution-quality, creativity-wit) pero inline para no romper el bundle
  // serverless de este archivo (JS plano, sin cross-import a src/).
  const qualityGuarantee =
    ` Máxima resolución posible (mínimo ${spec?.canvas?.w || 1080}x${spec?.canvas?.h || 1350}px, ${spec?.aspect || '4:5'}),` +
    ' sin artefactos de compresión, exportación limpia en una sola pasada.' +
    ' La persona de la foto debe mantenerse fiel: misma forma de cara, mismos ojos, nariz, labios, marcas distintivas — no idealizar ni inventar rasgos nuevos.' +
    ' No deformar rostros, manos, productos ni fondos/ambientes.' +
    ' Texto sin errores de ortografía.' +
    ' Diseño con ocurrencia genuina: evitar clichés genéricos (ej. "vive ríe ama", "hustle"), buscar un ángulo o giro visual inesperado que sorprenda, no una composición predecible.';

  const prompt = fill(tpl.template, mergedVars) + specHint + elementsHint + viralHint + qualityGuarantee;

  return { prompt, templateKey, vars: mergedVars, spec };
};

// ── Gemini nano-banana: imagen(es) de referencia + prompt → imagen ────────────
const stripDataUrl = (s) => {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(s || '');
  return m ? { mime: m[1], data: m[2] } : null;
};

const fetchToBase64 = async (url) => {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const mime = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    return { mime, data: buf.toString('base64') };
  } catch {
    return null;
  }
};

const toInlinePart = async (img) => {
  if (typeof img !== 'string') return null;
  if (img.startsWith('data:')) {
    const d = stripDataUrl(img);
    return d ? { inline_data: { mime_type: d.mime, data: d.data } } : null;
  }
  if (img.startsWith('http')) {
    const d = await fetchToBase64(img);
    return d ? { inline_data: { mime_type: d.mime, data: d.data } } : null;
  }
  return null;
};

export const generateWithGeminiImage = async ({ prompt, images = [] }) => {
  if (!ENV.GEMINI_API_KEY) return { error: 'no-gemini-key' };
  const parts = [{ text: prompt }];
  for (const img of images.slice(0, 4)) {
    const part = await toInlinePart(img);
    if (part) parts.push(part);
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }),
      },
    );
    const j = await r.json();
    if (!r.ok) return { error: 'gemini-image', message: JSON.stringify(j).slice(0, 200) };
    const outParts = j.candidates?.[0]?.content?.parts || [];
    const imgPart = outParts.find((p) => p.inline_data || p.inlineData);
    const inline = imgPart?.inline_data || imgPart?.inlineData;
    if (inline?.data) {
      const mime = inline.mime_type || inline.mimeType || 'image/png';
      return { url: `data:${mime};base64,${inline.data}`, provider: 'gemini-nano-banana', model: GEMINI_IMAGE_MODEL };
    }
    return { error: 'no-image', message: 'Gemini no devolvió imagen' };
  } catch (e) {
    return { error: 'gemini-image', message: String(e?.message || e).slice(0, 200) };
  }
};

// ── Refine/upscale con FAL (pipeline en conjunto, opcional) ───────────────────
// nano-banana genera composición → FAL clarity-upscaler mejora nitidez/resolución.
export const refineWithFal = async (imageUrl) => {
  if (!ENV.FAL_KEY || !imageUrl) return null;
  try {
    const r = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
      method: 'POST',
      headers: { Authorization: `Key ${ENV.FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, upscale_factor: 2, creativity: 0.2, resemblance: 0.9 }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const url = j.image?.url || j.images?.[0]?.url || null;
    return url ? { url, provider: 'fal-clarity-upscaler' } : null;
  } catch {
    return null;
  }
};

// ── Generación principal: con foto (Gemini) → fallback sin foto (text2img) ─────
export const generateBrandedImage = async ({
  prompt,
  images = [],
  platform = 'instagram',
  format = 'carousel',
  planId = 'free',
  refine = false,
} = {}) => {
  const spec = getSpec(platform, format);
  const width = spec?.canvas?.w || 1080;
  const height = spec?.canvas?.h || 1350;

  const maybeRefine = async (result) => {
    if (!refine || !result?.url) return result;
    const up = await refineWithFal(result.url);
    return up ? { ...result, url: up.url, refined: true, refineProvider: up.provider } : result;
  };

  // Con fotos del usuario → Gemini nano-banana (img2img real)
  if (images.length && ENV.GEMINI_API_KEY) {
    const g = await generateWithGeminiImage({ prompt, images });
    if (g.url) return await maybeRefine({ ...g, usedPhotos: images.length, mode: 'photo-as-protagonist' });
    // si falla Gemini, sigue al fallback text2img (avisando)
    const fb = await smartGenerateImage({ planId, prompt, width, height, useCase: 'social-post' });
    return await maybeRefine({
      ...fb,
      usedPhotos: 0,
      mode: 'text2img-fallback',
      warning: `Gemini falló (${g.error}). Generado sin foto.`,
    });
  }

  // Sin fotos → text-to-image normal
  const fb = await smartGenerateImage({ planId, prompt, width, height, useCase: 'social-post' });
  return await maybeRefine({ ...fb, usedPhotos: 0, mode: images.length ? 'text2img-no-gemini-key' : 'text2img' });
};

// ── HTTP handler ──────────────────────────────────────────────────────────────
export const handleBrandStudio = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/brand-studio/templates' && m === 'GET') {
    return json(200, {
      ok: true,
      templates: Object.entries(PROMPT_TEMPLATES).map(([key, t]) => ({
        key,
        label: t.label,
        desc: t.desc,
        fields: t.fields,
        template: t.template,
        example: t.example,
      })),
      designStyles: DESIGN_STYLES,
      hasGeminiImage: Boolean(ENV.GEMINI_API_KEY),
    });
  }

  if (path === '/api/brand-studio/build-prompt' && m === 'POST') {
    try {
      const out = buildBrandPrompt({
        templateKey: body?.templateKey,
        vars: body?.vars || {},
        brandColors: body?.brandColors || [],
        niche: body?.niche || '',
        platform: body?.platform || 'instagram',
        format: body?.format || 'carousel',
        extraElements: body?.extraElements || [],
      });
      return json(200, { ok: true, ...out });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }

  if (path === '/api/brand-studio/generate' && m === 'POST') {
    try {
      // Permite armar el prompt en el server si mandan templateKey+vars, o usar prompt directo
      let prompt = body?.prompt;
      let spec = null;
      if (!prompt && body?.templateKey) {
        const built = buildBrandPrompt({
          templateKey: body.templateKey,
          vars: body.vars || {},
          brandColors: body.brandColors || [],
          niche: body.niche || '',
          platform: body.platform || 'instagram',
          format: body.format || 'carousel',
          extraElements: body.extraElements || [],
        });
        prompt = built.prompt;
        spec = built.spec;
      }
      if (!prompt) return json(400, { ok: false, error: 'Falta prompt o templateKey' });

      const result = await generateBrandedImage({
        prompt,
        images: body?.images || [],
        platform: body?.platform || 'instagram',
        format: body?.format || 'carousel',
        planId: ctx.planId || 'free',
        refine: Boolean(body?.refine),
      });
      return json(200, { ok: !result.error || Boolean(result.url), prompt, spec, ...result });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }

  return false;
};
