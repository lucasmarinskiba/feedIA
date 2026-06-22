/**
 * Feed Vision — Computer Vision para feeds de Instagram/TikTok.
 *
 * Usa modelos multimodales pre-entrenados (Gemini / OpenRouter free, $0) — NO entrena
 * redes neuronales (imposible en serverless sin GPU). Honesto: "computer vision" =
 * análisis con modelo de visión, sobre imágenes que el usuario sube.
 *
 * Capacidades:
 *   - auditFeed: analiza screenshots del feed → coherencia, huecos, qué agregar
 *   - learnFromAccount: analiza screenshot de una cuenta exitosa del nicho (que el
 *     usuario aporta — sin scraping) → patrones replicables
 *
 * LIMITACIÓN HONESTA: no accede a IG/TikTok directamente. El usuario sube las imágenes.
 */

import { askVision, HAS_VISION } from './_llm.js';
import { saveProfile, getProfile } from './_accountMemory.js';

// Extractor JSON tolerante (modelos de visión a veces meten fences/comentarios).
const parseJson = (txt) => {
  if (!txt) return null;
  let s = String(txt)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');
  s = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(s);
  } catch {}
  const a = s.indexOf('{');
  if (a === -1) return null;
  let depth = 0;
  for (let i = a; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(a, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

const MAX_IMAGES = 9; // límite de carga (feed grid típico)

const sanitizeImages = (images) =>
  (Array.isArray(images) ? images : [images])
    .filter((u) => typeof u === 'string' && (u.startsWith('http') || u.startsWith('data:image')))
    .slice(0, MAX_IMAGES);

/**
 * Audita el feed: coherencia visual, huecos, qué publicar para mejorar.
 */
export const auditFeed = async ({ images, niche = 'general', goal = 'engagement', brandVoice = 'cercano' }) => {
  const imgs = sanitizeImages(images);
  if (!imgs.length) return { error: 'no-images', message: 'Subí 1-9 capturas de tu feed (URLs o base64).' };
  if (!HAS_VISION) return { error: 'no-vision', message: 'No hay proveedor de visión configurado.' };

  const prompt = `Sos director de arte + estratega de Instagram de nivel agencia top. Analizá ${imgs.length === 1 ? 'esta captura' : `estas ${imgs.length} capturas`} del feed/posts de una cuenta. Nicho: ${niche}. Objetivo: ${goal}. Voz: ${brandVoice}.
Sé concreto, honesto y accionable (nada genérico). Si el feed está bien, decilo; si está mal, decí por qué.
Respondé SOLO este JSON, sin texto extra:
{"coherenceScore":0-100,"palette":["#hex","#hex","#hex"],"visualStyle":"descripción breve del estilo actual","strengths":["fortaleza concreta"],"weaknesses":["debilidad concreta y específica"],"gaps":["qué tipo de contenido/visual FALTA en el feed"],"whatToAdd":[{"idea":"idea de post específica para llenar el hueco","format":"reel|carrusel|story","why":"por qué mejora el feed/algoritmo"}],"perImage":[{"n":1,"verdict":"qué transmite este post","hookText":"el texto on-image se lee bien? sí/no + por qué","improve":"mejora puntual"}]}`;

  const raw = await askVision(prompt, imgs, { maxTokens: 1600, temperature: 0.4 });
  const parsed = parseJson(raw);
  if (!parsed)
    return {
      error: 'parse',
      message: 'El modelo de visión no devolvió JSON válido (reintentá).',
      raw: (raw || '').slice(0, 300),
    };
  parsed._provider = globalThis.__lastVisionProvider || null;
  parsed.imagesAnalyzed = imgs.length;
  return parsed;
};

/**
 * Aprende de una cuenta exitosa del nicho (screenshot aportado por el usuario).
 */
export const learnFromAccount = async ({ images, niche = 'general' }) => {
  const imgs = sanitizeImages(images);
  if (!imgs.length) return { error: 'no-images', message: 'Subí captura(s) del perfil/feed de la cuenta referente.' };
  if (!HAS_VISION) return { error: 'no-vision', message: 'No hay proveedor de visión configurado.' };

  const prompt = `Sos analista de growth orgánico. Analizá ${imgs.length === 1 ? 'esta captura' : `estas ${imgs.length} capturas`} de una cuenta EXITOSA del nicho ${niche}. Extraé patrones REPLICABLES y honestos (qué hace bien, sin copiar literal).
Respondé SOLO este JSON, sin texto extra:
{"visualPatterns":["patrón visual replicable"],"hookPatterns":["patrón de texto/hook que usa"],"contentFormats":["formatos que predominan"],"consistency":"qué tan consistente es y en qué","whatYouCanApply":[{"tactic":"táctica concreta para aplicar a tu cuenta","how":"cómo hacerlo"}],"avoid":["qué NO copiar (riesgo o no aplica a vos)"]}`;

  const raw = await askVision(prompt, imgs, { maxTokens: 1400, temperature: 0.4 });
  const parsed = parseJson(raw);
  if (!parsed)
    return {
      error: 'parse',
      message: 'El modelo de visión no devolvió JSON válido (reintentá).',
      raw: (raw || '').slice(0, 300),
    };
  parsed._provider = globalThis.__lastVisionProvider || null;
  return parsed;
};

// ── HTTP handler (montado bajo /api/account/) ──
export const handleFeedVision = async (req, res, path, m, body, ctx = {}) => {
  const scope = ctx.userId || 'anon';
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/account/audit-feed' && m === 'POST') {
    const { accountId, images, niche, goal, brandVoice } = body || {};
    let n = niche,
      g = goal,
      v = brandVoice;
    if (accountId) {
      const p = await getProfile(scope, accountId);
      if (p) {
        n = n || p.niche || p.brandNiche;
        g = g || p.goal;
        v = v || p.brandVoice;
      }
    }
    const result = await auditFeed({
      images,
      niche: n || 'general',
      goal: g || 'engagement',
      brandVoice: v || 'cercano',
    });
    if (accountId && !result.error) {
      try {
        await saveProfile(scope, accountId, {
          lastFeedAudit: { ts: new Date().toISOString(), coherenceScore: result.coherenceScore, gaps: result.gaps },
        });
      } catch {}
    }
    return json(result.error ? 422 : 200, result);
  }

  if (path === '/api/account/learn-competitor' && m === 'POST') {
    const { accountId, images, niche } = body || {};
    let n = niche;
    if (accountId && !n) {
      const p = await getProfile(scope, accountId);
      n = p?.niche || p?.brandNiche;
    }
    const result = await learnFromAccount({ images, niche: n || 'general' });
    return json(result.error ? 422 : 200, result);
  }

  return false;
};
