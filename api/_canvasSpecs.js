/**
 * Canvas Specs — Single source of truth de dimensiones + safe-zones por formato.
 *
 * Specs exactas del usuario (no aproximadas). Cada formato declara:
 *   - canvas {w,h} en px (base 1080)
 *   - aspect ratio
 *   - zones: noGo (zonas donde NO poner texto/CTA) o good (zonas seguras)
 *   - visibleArea (lo que se ve en feed/perfil antes de abrir)
 *   - margin lateral mínimo
 *
 * Consumido por: _agencyBrain (mostrar al usuario), validateComposition (chequeo).
 * GET /api/agency/specs · GET /api/agency/specs?platform=instagram&format=reel
 */

export const CANVAS_SPECS = {
  instagram: {
    reel: {
      label: 'Reel de Instagram',
      canvas: { w: 1080, h: 1920 },
      aspect: '9:16',
      zones: {
        noGo: [
          { edge: 'top', px: 220, reason: 'UI superior IG (tiempo, perfil)' },
          { edge: 'bottom', px: 450, reason: 'caption, botones, CTA, audio' },
        ],
      },
      visibleArea: { w: 1080, h: 1440, note: 'Área visible en perfil/feed antes de abrir el reel' },
      margin: { left: 80, right: 80 },
      safe: { top: 220, bottom: 450, left: 80, right: 80 },
      tip: 'Hook y texto clave dentro del área visible 1080x1440 (centro-arriba). Nada importante en los últimos 450px.',
    },
    carousel: {
      label: 'Carrusel de Instagram',
      canvas: { w: 1080, h: 1440 },
      aspect: '3:4',
      zones: {
        noGo: [
          { edge: 'top', px: 180, reason: 'header de perfil sobre la imagen' },
          { edge: 'bottom', px: 180, reason: 'íconos like/comment/share/save' },
        ],
      },
      margin: { left: 120, right: 120 },
      safe: { top: 180, bottom: 180, left: 120, right: 120 },
      tip: 'En TODOS los slides mantener 120px laterales para que íconos no tapen letras.',
    },
    landscape: {
      label: 'Post horizontal / Paisaje',
      canvas: { w: 1080, h: 566 },
      aspect: '1.91:1',
      zones: { noGo: [] },
      margin: { left: 60, right: 60 },
      safe: { top: 40, bottom: 40, left: 60, right: 60 },
      tip: 'Formato landscape para paisajes y link previews.',
    },
    story: {
      label: 'Reels & Stories (Good Zone)',
      canvas: { w: 1080, h: 1920 },
      aspect: '9:16',
      zones: {
        good: [
          { edge: 'top', px: 250, reason: 'zona segura superior' },
          { edge: 'bottom', px: 250, reason: 'zona segura inferior' },
        ],
      },
      margin: { left: 80, right: 80 },
      safe: { top: 250, bottom: 250, left: 80, right: 80 },
      tip: 'Good Zone = todo el texto entre los 250px de arriba y los 250px de abajo. Centro 1080x1420 es 100% seguro.',
    },
    profile: {
      label: 'Foto de perfil',
      canvas: { w: 1080, h: 1080 },
      aspect: '1:1',
      shape: 'circular',
      zones: { noGo: [] },
      margin: { left: 0, right: 0 },
      safe: { top: 0, bottom: 0, left: 0, right: 0 },
      tip: 'Se recorta en círculo. Cara/logo centrado, dejar respiro en las esquinas (se cortan).',
    },
    'sponsored-feed': {
      label: 'Contenido esponsorizado (Feed)',
      canvas: { w: 1080, h: 1350 },
      aspect: '4:5',
      zones: { noGo: [] },
      margin: { left: 80, right: 80 },
      safe: { top: 80, bottom: 80, left: 80, right: 80 },
      tip: 'Para carruseles y singles patrocinados. 4:5 maximiza espacio en feed.',
    },
    'sponsored-story': {
      label: 'Contenido esponsorizado (Stories/Reels)',
      canvas: { w: 1080, h: 1920 },
      aspect: '9:16',
      zones: {
        noGo: [
          { edge: 'top', px: 220, reason: 'UI superior + label "Publicidad"' },
          { edge: 'bottom', px: 450, reason: 'CTA del anuncio + botón swipe-up/link' },
        ],
      },
      margin: { left: 80, right: 80 },
      safe: { top: 220, bottom: 450, left: 80, right: 80 },
      tip: 'Para historias y reels patrocinados. Mismo no-go que reel orgánico.',
    },
  },

  tiktok: {
    carousel: {
      label: 'Carrusel de TikTok (Photo Mode)',
      canvas: { w: 1080, h: 1440 },
      aspect: '3:4',
      zones: {
        noGo: [
          { edge: 'right', px: 200, reason: 'sidebar derecho (perfil/like/comment/share)' },
          { edge: 'bottom', px: 180, reason: 'usuario + caption + audio' },
        ],
      },
      margin: { left: 80, right: 200 },
      safe: { top: 80, bottom: 180, left: 80, right: 200 },
      tip: 'Mismo 3:4 que IG pero respetar sidebar derecho de TikTok.',
    },
    reel: {
      label: 'Video vertical TikTok (Reel)',
      canvas: { w: 1080, h: 1920 },
      aspect: '9:16',
      zones: {
        noGo: [
          { edge: 'top', px: 120, reason: 'búsqueda + "Siguiendo/Para ti"' },
          { edge: 'right', px: 200, reason: 'sidebar derecho (like/comment/share/audio girando)' },
          { edge: 'bottom', px: 350, reason: 'usuario + caption + barra de navegación' },
        ],
      },
      margin: { left: 60, right: 200 },
      safe: { top: 120, bottom: 350, left: 60, right: 200 },
      fullScreen: true,
      tip: 'El video ocupa toda la pantalla 9:16. Texto SOLO en la franja central-izquierda, lejos del sidebar derecho y la barra inferior.',
    },
    story: {
      label: 'TikTok Story',
      canvas: { w: 1080, h: 1920 },
      aspect: '9:16',
      zones: {
        noGo: [
          { edge: 'top', px: 200, reason: 'UI superior' },
          { edge: 'bottom', px: 350, reason: 'UI inferior + reply' },
        ],
      },
      margin: { left: 60, right: 200 },
      safe: { top: 200, bottom: 350, left: 60, right: 200 },
      tip: 'Similar al reel, texto en zona central segura.',
    },
  },
};

// Mapea formato genérico de la app → clave de spec
const FORMAT_ALIAS = {
  reel: 'reel',
  reels: 'reel',
  video: 'reel',
  carousel: 'carousel',
  carrusel: 'carousel',
  carruseles: 'carousel',
  story: 'story',
  stories: 'story',
  historia: 'story',
  historias: 'story',
  landscape: 'landscape',
  paisaje: 'landscape',
  horizontal: 'landscape',
  profile: 'profile',
  perfil: 'profile',
  'sponsored-feed': 'sponsored-feed',
  sponsored: 'sponsored-feed',
  publicidad: 'sponsored-feed',
  ad: 'sponsored-feed',
  'sponsored-story': 'sponsored-story',
  feed: 'carousel',
  photo: 'carousel',
  post: 'carousel',
};

export const getSpec = (platform = 'instagram', format = 'reel') => {
  const p = (platform || 'instagram').toLowerCase();
  const platSpecs = CANVAS_SPECS[p] || CANVAS_SPECS.instagram;
  const key = FORMAT_ALIAS[(format || '').toLowerCase()] || format;
  return platSpecs[key] || platSpecs.reel || null;
};

export const getAllSpecs = (platform) => {
  if (platform) return CANVAS_SPECS[platform.toLowerCase()] || {};
  return CANVAS_SPECS;
};

/**
 * Valida que los elementos {x,y,w,h} caigan dentro de la zona segura.
 * Para no-go zones: el elemento NO debe entrar en el área no-go.
 * Para good zones: el elemento debe estar dentro de la franja central.
 */
export const validateComposition = ({ elements = [], platform = 'instagram', format = 'reel' } = {}) => {
  const spec = getSpec(platform, format);
  if (!spec) return { ok: false, error: 'spec desconocida' };
  const { canvas, safe } = spec;
  const violations = (elements || [])
    .filter(
      (el) =>
        el.x < safe.left ||
        el.x + el.w > canvas.w - safe.right ||
        el.y < safe.top ||
        el.y + el.h > canvas.h - safe.bottom,
    )
    .map((el) => ({ ...el, reason: 'fuera de zona segura' }));
  return {
    ok: violations.length === 0,
    spec,
    violations,
    suggestion: violations.length
      ? `Mover ${violations.length} elemento(s) dentro del área segura: x[${safe.left}–${canvas.w - safe.right}] y[${safe.top}–${canvas.h - safe.bottom}]`
      : 'Composición dentro de safe-zones ✓',
  };
};

// Resumen para inyectar en prompts de generación (texto compacto)
export const specToPromptText = (platform, format) => {
  const s = getSpec(platform, format);
  if (!s) return '';
  const zoneTxt = s.zones?.noGo?.length
    ? `NO-GO zones: ${s.zones.noGo.map((z) => `${z.edge} ${z.px}px`).join(', ')}`
    : s.zones?.good?.length
      ? `GOOD zones (texto seguro): ${s.zones.good.map((z) => `${z.edge} ${z.px}px`).join(', ')}`
      : 'sin restricciones de zona';
  return `${s.label}: ${s.canvas.w}x${s.canvas.h} (${s.aspect}). ${zoneTxt}. Márgenes laterales: ${s.margin.left}/${s.margin.right}px. ${s.tip}`;
};

export const handleCanvasSpecs = async (req, res, path, m) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };
  if (path === '/api/agency/specs' && m === 'GET') {
    try {
      const url = new URL(req.url, 'http://x');
      const platform = url.searchParams.get('platform');
      const format = url.searchParams.get('format');
      if (platform && format)
        return json(200, { ok: true, spec: getSpec(platform, format), promptText: specToPromptText(platform, format) });
      return json(200, { ok: true, specs: getAllSpecs(platform) });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }
  return false;
};
