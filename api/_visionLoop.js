/**
 * Vision Loop — Computer Vision integrado 100% con Computer Use.
 *
 * Ciclo see-think-act para automatización guiada por visión:
 *   visionSee()         → interpreta screenshot → observación estructurada
 *   visionDecide()      → observación + goal → próxima acción
 *   visionExtract()     → extrae métricas/datos de capturas IG/TT/Canva
 *   visionProfile()     → análisis profundo de perfil competidor
 *   visionVerifyStep()  → verifica si acción CU se ejecutó correctamente
 *   runVisionLoop()     → ciclo multi-step con historial (see→act→screenshot→repeat)
 *
 * Proveedores: Gemini Flash (gratis) → OpenRouter vision (gratis).
 * Sin GPU, sin modelos propios — usa multimodales pre-entrenados ($0/mes).
 *
 * Rutas:
 *   GET  /api/vision/status
 *   POST /api/vision/analyze       → visionSee con prompt libre
 *   POST /api/vision/extract       → extrae campos específicos
 *   POST /api/vision/profile       → análisis profundo competidor
 *   POST /api/vision/verify-step   → verifica ejecución de paso CU
 *   POST /api/vision/decide        → decide próxima acción dado estado
 *   POST /api/vision/loop          → ciclo completo multi-step
 */

import { askVision, askLLMJson, HAS_VISION } from './_llm.js';

const ENV = process.env;

const json = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
  return true;
};

// Extractor JSON tolerante a fences y comentarios.
const parseJson = (txt) => {
  if (!txt) return null;
  let s = String(txt)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');
  s = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf('{');
  if (a === -1) return null;
  let depth = 0;
  for (let i = a; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) { try { return JSON.parse(s.slice(a, i + 1)); } catch { return null; } } }
  }
  return null;
};

const sanitizeImages = (images) =>
  (Array.isArray(images) ? images : [images])
    .filter((u) => typeof u === 'string' && (u.startsWith('http') || u.startsWith('data:image')))
    .slice(0, 8);

// ── SEE: ¿qué hay exactamente en esta pantalla? ─────────────────────────────
export const visionSee = async (imageUrl, { goal = '', step = 0, platform = 'auto', context = '' } = {}) => {
  if (!HAS_VISION) return { error: 'no-vision' };
  const imgs = sanitizeImages([imageUrl]);
  if (!imgs.length) return { error: 'no-image' };

  const prompt = `Sos un agente de visión por computadora. Describí EXACTAMENTE lo que ves en esta captura de pantalla.
Contexto: goal="${goal}", step=${step}, platform="${platform}"${context ? `, contexto extra: ${context}` : ''}.

Respondé SOLO este JSON (sin texto extra):
{
  "platform": "instagram|tiktok|canva|chrome|figma|capcut|other",
  "screen": "feed|profile|post|stories|inbox|dm|reel|editor|settings|search|explore|other",
  "elements_visible": ["elemento concreto 1", "elemento 2"],
  "text_visible": ["texto importante legible en pantalla"],
  "metrics": {"followers": null, "following": null, "likes": null, "comments": null, "views": null, "shares": null},
  "ui_interactive": [{"label": "botón/campo", "position": "top|center|bottom|left|right|top-right", "type": "button|input|link|icon"}],
  "state": "descripción concisa del estado actual de la pantalla",
  "actionable_next": ["acción posible 1", "acción posible 2"],
  "goal_progress": 0
}`;

  const raw = await askVision(prompt, imgs, { maxTokens: 900, temperature: 0.3 });
  const parsed = parseJson(raw);
  if (!parsed) return { error: 'parse', raw: (raw || '').slice(0, 300) };
  parsed._step = step;
  parsed._imageUrl = imgs[0].startsWith('data:') ? '[base64]' : imgs[0];
  return parsed;
};

// ── DECIDE: ¿qué hacer a continuación? ──────────────────────────────────────
export const visionDecide = async (observation, goal, history = []) => {
  if (!goal) return { action: 'wait', complete: false, reasoning: 'No hay goal definido.' };

  const recentHistory = history.slice(-4).map((h) => ({
    step: h.step,
    action: h.decision?.action,
    target: h.decision?.target,
    verified: h.verified,
  }));

  const prompt = `Sos un agente de automatización inteligente. Decidí la PRÓXIMA acción concreta.

GOAL: "${goal}"
OBSERVACIÓN ACTUAL: ${JSON.stringify(observation, null, 2)}
HISTORIAL RECIENTE: ${JSON.stringify(recentHistory)}

ACCIONES DISPONIBLES:
- scroll: desplazar pantalla (params: direction up|down|left|right, amount px)
- click: hacer clic en elemento (params: target descripción del elemento)
- type: escribir texto (params: text contenido, target campo donde escribir)
- navigate: ir a URL (params: url)
- wait: esperar (params: ms milisegundos)
- capture: tomar screenshot para análisis (sin params)
- complete: goal alcanzado, finalizar loop

Respondé SOLO este JSON:
{
  "action": "scroll|click|type|navigate|wait|capture|complete",
  "target": "descripción exacta del elemento objetivo (null si no aplica)",
  "params": {},
  "reasoning": "por qué esta acción específica ahora",
  "complete": false,
  "expected_result": "qué debería verse en la pantalla después",
  "next_screenshot_needed": true,
  "confidence": 85
}`;

  const result = await askLLMJson(prompt);
  if (!result) return { action: 'capture', complete: false, reasoning: 'No se pudo decidir. Capturá pantalla.', confidence: 30 };
  return result;
};

// ── EXTRACT: extrae datos estructurados de capturas ─────────────────────────
export const visionExtract = async (imageUrl, { platform = 'instagram', fields = [] } = {}) => {
  if (!HAS_VISION) return { error: 'no-vision' };
  const imgs = sanitizeImages([imageUrl]);
  if (!imgs.length) return { error: 'no-image' };

  const platformFields = {
    instagram: ['username', 'display_name', 'followers', 'following', 'posts_count', 'bio', 'verified', 'category', 'recent_post_hooks', 'avg_likes'],
    tiktok: ['username', 'display_name', 'followers', 'following', 'likes_total', 'bio', 'verified', 'recent_video_titles'],
    canva: ['design_title', 'page_count', 'current_page', 'selected_element', 'zoom_level', 'unsaved_changes'],
    generic: ['page_title', 'main_content', 'navigation_items', 'cta_buttons', 'form_fields'],
  };
  const extract = fields.length ? fields : (platformFields[platform] || platformFields.generic);

  const prompt = `Sos un extractor de datos visual. Analizá esta captura de ${platform} y extraé EXACTAMENTE estos campos:
${extract.map((f) => `- ${f}`).join('\n')}

Si el dato no es visible en la imagen, usá null.
Respondé SOLO un JSON plano con esos campos como claves. Sin texto extra, sin explicaciones.`;

  const raw = await askVision(prompt, imgs, { maxTokens: 700, temperature: 0.2 });
  const parsed = parseJson(raw);
  if (!parsed) return { error: 'parse', raw: (raw || '').slice(0, 200) };
  parsed._platform = platform;
  return parsed;
};

// ── PROFILE: análisis profundo de competidor ─────────────────────────────────
export const visionProfile = async (images, { niche = 'general', language = 'es' } = {}) => {
  if (!HAS_VISION) return { error: 'no-vision' };
  const imgs = sanitizeImages(images);
  if (!imgs.length) return { error: 'no-images' };

  const prompt = `Sos analista de growth de redes sociales de nivel agencia top. Analizá ${imgs.length} captura(s) de un competidor del nicho "${niche}". Idioma de respuesta: ${language}.

Análisis HONESTO, ESPECÍFICO y ACCIONABLE (evitá generalidades):
Respondé SOLO este JSON:
{
  "profile": {
    "username": null,
    "display_name": null,
    "followers": null,
    "following": null,
    "posts_count": null,
    "verified": false,
    "category": null,
    "bio_summary": null
  },
  "visual_identity": {
    "dominant_colors": ["#hex"],
    "style": "descripción del estilo visual",
    "font_style": "serif|sans-serif|script|mixed",
    "consistency_score": 0,
    "format_distribution": {"reels": 0, "carousels": 0, "photos": 0}
  },
  "content_strategy": {
    "hook_patterns": ["patrón de hook que usa"],
    "cta_types": ["tipo de CTA"],
    "best_performing_format": null,
    "posting_tone": "educativo|entretenimiento|inspiracional|comercial|mixto",
    "unique_angle": "qué los diferencia"
  },
  "metrics_snapshot": {
    "est_engagement_rate": null,
    "avg_likes_visible": null,
    "avg_comments_visible": null
  },
  "what_to_replicate": [
    {"tactic": "táctica concreta", "how": "cómo implementarla", "effort": "low|medium|high", "impact": "low|medium|high"}
  ],
  "what_to_avoid": ["qué NO copiar y por qué"],
  "gap_opportunity": "qué hace mal o no cubre que vos podés aprovechar",
  "threat_level": "low|medium|high",
  "summary": "resumen ejecutivo 2 oraciones"
}`;

  const raw = await askVision(prompt, imgs, { maxTokens: 1800, temperature: 0.3 });
  const parsed = parseJson(raw);
  if (!parsed) return { error: 'parse', raw: (raw || '').slice(0, 300), imagesAnalyzed: imgs.length };
  parsed.imagesAnalyzed = imgs.length;
  parsed._provider = globalThis.__lastVisionProvider || null;
  return parsed;
};

// ── VERIFY STEP: ¿se ejecutó correctamente el paso CU? ──────────────────────
export const visionVerifyStep = async (imageUrl, { expectedAction, expectedResult, step = 0 } = {}) => {
  if (!HAS_VISION) return { verified: false, confidence: 0, error: 'no-vision' };
  const imgs = sanitizeImages([imageUrl]);
  if (!imgs.length) return { verified: false, confidence: 0, error: 'no-image' };

  const prompt = `Verificá si una acción se ejecutó correctamente comparando el estado esperado con la captura real.

Acción ejecutada: "${expectedAction}"
Estado esperado tras la acción: "${expectedResult}"
Paso número: ${step}

Analizá la captura y respondé SOLO este JSON:
{
  "verified": true,
  "confidence": 0,
  "actual_state": "qué ves realmente en pantalla",
  "matches_expected": true,
  "mismatch": null,
  "recovery_suggestion": null,
  "next_recommended_action": null
}

verified=true solo si el estado actual coincide razonablemente con lo esperado.`;

  const raw = await askVision(prompt, imgs, { maxTokens: 600, temperature: 0.2 });
  const parsed = parseJson(raw);
  if (!parsed) return { verified: false, confidence: 0, error: 'parse', raw: (raw || '').slice(0, 200) };
  return parsed;
};

// ── LOOP: ciclo see-decide multi-step con screenshots ───────────────────────
export const runVisionLoop = async ({ goal, screenshots = [], maxSteps = 8, verifyEach = false }) => {
  if (!HAS_VISION) return { error: 'no-vision', status: 'error' };
  if (!goal) return { error: 'no-goal', status: 'error' };

  const history = [];
  const allShots = sanitizeImages(screenshots);
  if (!allShots.length) return { error: 'no-screenshots', status: 'error' };

  for (let step = 0; step < maxSteps; step++) {
    const screenshotUrl = allShots[step] || allShots[allShots.length - 1];

    // SEE
    const observation = await visionSee(screenshotUrl, { goal, step });
    if (observation.error) { history.push({ step: step + 1, error: observation.error }); break; }

    // DECIDE
    const decision = await visionDecide(observation, goal, history);

    const entry = { step: step + 1, screenshotUrl: screenshotUrl.startsWith('data:') ? '[base64]' : screenshotUrl, observation, decision, ts: new Date().toISOString() };
    history.push(entry);

    // Goal reached
    if (decision.complete || (observation.goal_progress || 0) >= 100) {
      return { status: 'complete', steps: history.length, history, summary: `Goal "${goal}" completado en ${history.length} paso(s).` };
    }

    // No más screenshots disponibles → devolver para que cliente tome el siguiente
    if (step >= allShots.length - 1) {
      return {
        status: 'awaiting_screenshot',
        step: step + 1,
        nextAction: decision,
        instruction: `Ejecutá esta acción y enviá nueva captura:\n• Acción: ${decision.action}\n• Objetivo: ${decision.target || 'pantalla actual'}\n• Resultado esperado: ${decision.expected_result || 'ver cambio en pantalla'}`,
        history,
      };
    }
  }

  return { status: 'max_steps_reached', steps: history.length, history, summary: `Límite de ${maxSteps} pasos alcanzado.` };
};

// ── HTTP handler ─────────────────────────────────────────────────────────────
export const handleVisionLoop = async (req, res, path, m, body) => {
  if (path === '/api/vision/status' && m === 'GET') {
    return json(res, 200, {
      hasVision: HAS_VISION,
      providers: [
        ENV.GEMINI_API_KEY ? 'gemini' : null,
        ENV.OPENROUTER_API_KEY ? 'openrouter' : null,
      ].filter(Boolean),
      capabilities: ['analyze', 'extract', 'profile', 'verify-step', 'decide', 'loop'],
    });
  }

  if (path === '/api/vision/analyze' && m === 'POST') {
    const { imageUrl, images, goal, step, platform, context } = body || {};
    const img = imageUrl || (Array.isArray(images) ? images[0] : null);
    if (!img) return json(res, 400, { error: 'no-image', message: 'Enviá imageUrl o images[].' });
    if (!HAS_VISION) return json(res, 503, { error: 'no-vision', message: 'Configurar GEMINI_API_KEY o OPENROUTER_API_KEY.' });
    const result = await visionSee(img, { goal: goal || '', step: step || 0, platform: platform || 'auto', context: context || '' });
    return json(res, result.error ? 422 : 200, result);
  }

  if (path === '/api/vision/extract' && m === 'POST') {
    const { imageUrl, images, platform, fields } = body || {};
    const img = imageUrl || (Array.isArray(images) ? images[0] : null);
    if (!img) return json(res, 400, { error: 'no-image' });
    if (!HAS_VISION) return json(res, 503, { error: 'no-vision' });
    const result = await visionExtract(img, { platform: platform || 'instagram', fields: fields || [] });
    return json(res, result.error ? 422 : 200, result);
  }

  if (path === '/api/vision/profile' && m === 'POST') {
    const { imageUrl, images, niche, language } = body || {};
    const imgs = images || (imageUrl ? [imageUrl] : []);
    if (!imgs.length) return json(res, 400, { error: 'no-images', message: 'Enviá images[] (hasta 8 capturas).' });
    if (!HAS_VISION) return json(res, 503, { error: 'no-vision' });
    const result = await visionProfile(imgs, { niche: niche || 'general', language: language || 'es' });
    return json(res, result.error ? 422 : 200, result);
  }

  if (path === '/api/vision/verify-step' && m === 'POST') {
    const { imageUrl, expectedAction, expectedResult, step } = body || {};
    if (!imageUrl) return json(res, 400, { error: 'no-image' });
    if (!HAS_VISION) return json(res, 503, { error: 'no-vision' });
    const result = await visionVerifyStep(imageUrl, { expectedAction: expectedAction || '', expectedResult: expectedResult || '', step: step || 0 });
    return json(res, 200, result);
  }

  if (path === '/api/vision/decide' && m === 'POST') {
    const { observation, goal, history } = body || {};
    if (!goal) return json(res, 400, { error: 'no-goal' });
    const result = await visionDecide(observation || {}, goal, history || []);
    return json(res, 200, result);
  }

  if (path === '/api/vision/loop' && m === 'POST') {
    const { goal, screenshots, imageUrl, maxSteps, verifyEach } = body || {};
    const shots = screenshots || (imageUrl ? [imageUrl] : []);
    if (!shots.length) return json(res, 400, { error: 'no-screenshots', message: 'Enviá screenshots[] o imageUrl.' });
    if (!goal) return json(res, 400, { error: 'no-goal' });
    if (!HAS_VISION) return json(res, 503, { error: 'no-vision' });
    const result = await runVisionLoop({ goal, screenshots: shots, maxSteps: Math.min(Number(maxSteps) || 8, 15), verifyEach: Boolean(verifyEach) });
    return json(res, result.error ? 422 : 200, result);
  }

  return false;
};
