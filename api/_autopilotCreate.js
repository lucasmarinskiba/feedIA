/**
 * Autopilot Create — pipeline autónomo REAL de creación + publicación.
 *
 * Honesto sobre límites: serverless NO maneja browser headless. Este flujo
 * NO usa Computer Use de navegador; usa APIs oficiales (publica de verdad):
 *
 *   cerebro (agencyBrain + andromeda) → mejor combo ángulo×persona×formato
 *     → copy/caption/hashtags
 *     → nano-banana genera imagen (reglas virales inyectadas)
 *     → FAL refine (sube nitidez + devuelve URL PÚBLICA, requerida por IG API)
 *     → validación viral (validateCarousel + predictVirality)
 *     → si autoPublish && cuenta conectada: igPublish/ttPublish (REAL)
 *       si no: status 'ready-for-review' (1-click manual)
 *
 * Tiene en cuenta datos viral vs no-viral (carouselViralRules) en la creación.
 * POST /api/autopilot/create-post
 */

import { buildBrandPrompt, generateBrandedImage } from './_brandStudio.js';
import { validateCarousel, carouselRulesPromptText, buildValidatedStructure } from './_carouselViralRules.js';
import { predictVirality } from './_viralPredictor.js';
import { igPublish, ttPublish, connectionStatus } from './_socialConnect.js';
import { recordPlan } from './_accountMemory.js';
import { composeCarousel, deriveSlidesText } from './_carouselComposer.js';
import { askLLMJson } from './_llm.js';
import { runAndromeda } from './_andromeda.js';
import {
  canvaStatus,
  createFromBrandTemplate,
  listBrandTemplates,
  exportDesign,
  getExportStatus,
} from './_canvaConnect.js';
import { buildPriming } from './_promptLibrary.js';
import { loadIntelligencePriming } from './_nicheIntelligence.js';
import { getToolBoost, boostToPriming } from './_toolBoost.js';

// Polling Canva export (≤25s) — devuelve URLs PNG cuando listo
const pollCanvaExport = async (scope, jobId, maxMs = 25000) => {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const j = await getExportStatus(scope, jobId).catch(() => null);
    if (j?.job?.status === 'success' && Array.isArray(j.job.urls)) return j.job.urls;
    if (j?.job?.status === 'failed' || j?.error) return null;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return null;
};

// Selecciona el mejor template Canva del usuario por mood/role
// Canva API solo expone los templates DEL usuario logueado (Free + Pro/Teams si paga).
// NO existe API pública de marketplace para templates de "otros usuarios".
const pickBestTemplate = (templates = [], mood = 'premium') => {
  if (!templates.length) return null;
  // Buscar template cuyo nombre matchee mood
  const moodKeywords = {
    premium: ['premium', 'editorial', 'luxury', 'elegant', 'oscuro', 'dark'],
    minimalista: ['minimal', 'simple', 'clean', 'blanco', 'white'],
    brutal: ['bold', 'brutal', 'pop', 'colorful'],
    luxury: ['luxury', 'gold', 'serif', 'classic'],
    monochrome: ['mono', 'b&w', 'noir'],
    techno: ['tech', 'cyber', 'neon', 'futur'],
    organico: ['organic', 'earth', 'natural', 'eco'],
    editorial: ['editorial', 'magazine', 'revista'],
  };
  const kws = moodKeywords[mood] || [];
  const lower = (t) => (t.title || t.name || '').toLowerCase();
  const match = templates.find((t) => kws.some((k) => lower(t).includes(k)));
  return match || templates[0];
};

// Genera slides con Canva (si conectado + brand template) — calidad PRO
const tryCanvaSlides = async ({ scope, slidesText, brandColors, mood = 'premium' }) => {
  const st = await canvaStatus(scope).catch(() => ({}));
  if (!st?.connected) return null;
  const templatesResp = await listBrandTemplates(scope).catch(() => null);
  const all = templatesResp?.items || templatesResp?.brand_templates || templatesResp?.templates || [];
  if (!all.length) return null;
  // Selecciona el mejor template del usuario por mood (Free user = templates default; Pro/Teams = brand templates personalizados)
  const tpl = pickBestTemplate(all, mood);
  const tplId = tpl?.id;
  if (!tplId) return null;

  // Mapear cada slide → autofill data del template
  const slideUrls = [];
  for (const sl of slidesText) {
    const fill = await createFromBrandTemplate(scope, {
      templateId: tplId,
      data: {
        TITLE: sl.title || '',
        BODY: sl.body || '',
        ROLE: sl.role || '',
        // Algunos brand templates exponen vars adicionales:
        HEADLINE: sl.title || '',
        SUBTITLE: sl.body || '',
        TEXT: sl.body || '',
        ACCENT_COLOR: brandColors?.[1] || brandColors?.[0] || '',
        BG_COLOR: brandColors?.[0] || '',
      },
    }).catch(() => null);
    const designId = fill?.job?.result?.design?.id || fill?.design?.id;
    if (!designId) continue;
    const exp = await exportDesign(scope, { designId, format: 'png' }).catch(() => null);
    const jobId = exp?.job?.id;
    if (!jobId) continue;
    const urls = await pollCanvaExport(scope, jobId, 15000);
    if (urls?.[0]) slideUrls.push({ role: sl.role, title: sl.title, body: sl.body, dataUrl: urls[0], canvaTemplateId: tplId, canvaTemplateName: tpl.title || tpl.name || '' });
  }
  return slideUrls.length ? slideUrls : null;
};

// Budget: corta operaciones lentas si pasamos X segundos del tope de Vercel (60s)
const TOTAL_BUDGET_MS = 45_000;
const withBudget = (promise, deadline, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), Math.max(1000, deadline - Date.now()))),
  ]);

// Genera el texto slide-por-slide (LLM) siguiendo la estructura validada
const generateSlideTexts = async ({
  topic,
  niche,
  goal,
  hook,
  cta,
  slideCount = 5,
  mood = 'premium',
  scope = 'anon',
  accountId = '',
  platform = 'instagram',
}) => {
  const structure = buildValidatedStructure(slideCount);
  // Inyección de priming rico por nicho/arquetipo/mood — biblioteca de prompts
  const { priming } = buildPriming('carousel_slides', { topic, niche, goal, mood });
  // + Inteligencia profunda del nicho cacheada (si existe para esta cuenta)
  const intelPriming = await loadIntelligencePriming({ scope, accountId, accountHandle: accountId }).catch(() => '');
  // + Tool boost específico (modelos/libs/frameworks por tool × plataforma)
  const toolBoost = boostToPriming(getToolBoost('carousel', platform));
  const prompt = `${toolBoost ? toolBoost + '\n\n' : ''}${intelPriming ? intelPriming + '\n\n' : ''}${priming}

══════════════════════════════════════════════════════════════════
HILO NARRATIVO OBLIGATORIO (slides deben encadenarse como UNA historia)
══════════════════════════════════════════════════════════════════
NO escribas slides aislados. Cada slide CONTINÚA lo anterior.
Antes de escribir, planificá el ARGUMENTO completo del carrusel:
  1. ¿Cuál es la TESIS central? (1 oración)
  2. ¿Qué PROMESA hace el hook que se cumple en el slide final?
  3. ¿Cómo se ESCALA la tensión entre slide 1 y N-1 para que el lector NO pueda parar de deslizar?
  4. Cada slide intermedio debe agregar UNA pieza nueva (no repetir, no resumir hasta el final).
  5. El último slide CIERRA la promesa del hook con CTA accionable.

REGLAS DE REDACCIÓN (críticas):
- NO escribas "Slide N" ni "Paso N" en el title/body — Instagram ya numera. Solo si la estructura del nicho exige pasos secuenciales (tutoriales paso-a-paso).
- NO usés "punto clave", "idea X", "tip N" como title. Cada title = afirmación concreta o pregunta filosa.
- NO empieces el hook con saludos ni "hoy te traigo".
- Los slides DEBEN sonar como un MISMO autor escribiendo: misma voz, mismas palabras-firma del nicho, misma cadencia.
- COHERENCIA TEMÁTICA: si el hook habla de "X errores", los slides 2-N son ESOS errores; si el hook promete "el método", los slides 2-N son los pasos del método.
- El title del slide final NO repite el hook — RESPONDE al hook.

Sos creador elite de carruseles virales de Instagram para el nicho: ${niche || topic}.
Tema central: "${topic}". Objetivo: ${goal}.
Audiencia: emprendedores LATAM que buscan resultados concretos.

Generá texto REAL y específico para CADA slide (NUNCA "Punto clave" o placeholder genérico).

Estructura obligatoria:
${structure.map((s) => `Slide ${s.slide} (${s.role}): ${s.purpose}. ${s.guide}`).join('\n')}

REGLAS DURAS:
- title: máx 7 palabras, IMPACTANTE, específico al tema (NO "Punto clave", NO "Idea 1")
- body: 8-18 palabras concretas (números, ejemplos, beneficios reales)
- Slide 1 (hook): frase poderosa que para el scroll, NO neutra
- Slide final (cta): título corto + CTA accionable ("Comentá INFO", "Guardá esto", etc)
- "vos" / LATAM / directo / sin relleno corporativo
- Los slides intermedios deben ser PRÁCTICOS: tip aplicable, dato, herramienta, paso

DEVOLVÉ SOLO ESTE JSON ARRAY (${structure.length} objetos, en orden):
[
${structure.map((s) => `  {"role":"${s.role}","title":"título específico del slide ${s.slide}","body":"cuerpo concreto del slide ${s.slide}"}`).join(',\n')}
]`;

  const out = await askLLMJson(prompt).catch(() => null);
  if (Array.isArray(out) && out.length >= 3) {
    const cleaned = out.map((o, i) => ({
      role: structure[i]?.role || o.role || 'practica',
      title: (o.title || '').trim(),
      body: (o.body || '').trim(),
    }));
    // Verifica que NO esté lleno de placeholders genéricos
    const hasRealContent =
      cleaned.filter((s) => s.title && !/^(punto clave|idea \d|título|placeholder|ejemplo|texto)$/i.test(s.title))
        .length >= Math.ceil(cleaned.length * 0.6);
    if (hasRealContent) return cleaned;
  }
  // Fallback inteligente: deriva puntos del tema, no placeholders vacíos
  return smartFallbackSlides({ topic, niche, hook, cta, slideCount });
};

// Fallback determinista con contenido real (no "Punto clave")
const smartFallbackSlides = ({ topic, niche, hook, cta, slideCount }) => {
  const structure = buildValidatedStructure(slideCount);
  const t = topic || niche || 'tu negocio';
  const realPoints = [
    { title: 'El error más común', body: `La mayoría empieza con ${t} sin estrategia. Resultado: tiempo perdido.` },
    { title: '3 herramientas clave', body: `Automatización, análisis de datos y contenido inteligente. Gratis.` },
    { title: 'Empezá hoy mismo', body: `5 minutos al día durante 30 días = transformación real.` },
    {
      title: 'Lo que nadie te dice',
      body: `${t} funciona si combinás constancia con sistema. Sin sistema, no escala.`,
    },
    { title: 'El siguiente paso', body: `Aplicá un solo cambio esta semana. Medilo. Repetí lo que funciona.` },
    { title: 'Casos reales', body: `Quienes aplicaron esto duplicaron resultados en 60 días. Sin trucos.` },
    { title: 'Tu ventaja injusta', body: `Empezá antes que tu competencia. El timing vale más que el talento.` },
    { title: 'Mi sistema simple', body: `Planificá → Ejecutá → Medí → Ajustá. Repetir hasta dominar.` },
  ];
  let idx = 0;
  return structure.map((s) => {
    if (s.role === 'hook') return { role: 'hook', title: hook || `Esto cambió mi forma de hacer ${t}`, body: '' };
    if (s.role === 'cta') return { role: 'cta', title: '¿Te sirvió?', body: cta || 'Comentá INFO 👇' };
    const p = realPoints[idx++ % realPoints.length];
    return { role: s.role, title: p.title, body: p.body };
  });
};

const pickBest = (arr, key) => (Array.isArray(arr) && arr.length ? (arr[0]?.[key] ?? arr[0]) : null);

/**
 * Crea un post completo listo para publicar (o lo publica si autoPublish).
 * @param {object} p
 * @param {string[]} p.images - fotos autorizadas (data URLs o http) — opcional
 * @param {boolean} p.autoPublish - publicar de una vía API oficial
 */
export const createAutonomousPost = async ({
  topic = '',
  niche = '',
  goal = 'engagement',
  platform = 'instagram',
  format = 'carousel',
  accountId = '',
  images = [],
  brandColors = [],
  extraElements = [],
  brandVoice = '',
  mood = 'premium',
  fontStyle = 'serif-editorial',
  textColor = null,
  bgColor = null,
  accentColor = null,
  bgImage = null,
  hookOverride = '',
  ctaOverride = '',
  numberOfPlans = 1,
  autoPublish = false,
  scope = 'anon',
} = {}) => {
  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_BUDGET_MS;
  const log = [];
  const step = (s) => {
    log.push(`${new Date().toISOString().slice(11, 19)} · +${Math.round((Date.now() - startedAt) / 1000)}s · ${s}`);
  };

  // 0) Auto-load brand kit del profile (si existe) — usuario no carga colores cada vez
  try {
    const { getProfile } = await import('./_accountMemory.js');
    const profile = await getProfile(scope, accountId).catch(() => null);
    const bk = profile?.brandKit || profile || null;
    if (bk) {
      if (!brandColors?.length && Array.isArray(bk.colors) && bk.colors.length) brandColors = bk.colors;
      if (!brandColors?.length && bk.bgColor && bk.accentColor) brandColors = [bk.bgColor, bk.accentColor];
      if (!extraElements?.length && Array.isArray(bk.elements) && bk.elements.length) extraElements = bk.elements;
      if (!textColor && bk.textColor) textColor = bk.textColor;
      if (!bgColor && bk.bgColor) bgColor = bk.bgColor;
      if (!accentColor && bk.accentColor) accentColor = bk.accentColor;
      if ((!mood || mood === 'premium') && bk.mood) mood = bk.mood;
      if ((!fontStyle || fontStyle === 'serif-editorial') && bk.font) fontStyle = bk.font;
      if (!images?.length && bk.photo) images = [bk.photo];
      if (!niche && bk.niche) niche = bk.niche;
      step(
        `🎨 Brand kit cargado de perfil: ${bk.handle ? '@' + bk.handle : 'sin handle'} · ${(brandColors || []).length} colores · ${images.length ? 'con foto' : 'sin foto'}`,
      );
    }
  } catch {}

  // 1) Cerebro liviano: solo Andrómeda (1 LLM call) — runAgencyBrain pesa demasiado
  step('🧠 Andrómeda: seleccionando mejor ángulo×persona…');
  const andromeda = await withBudget(
    runAndromeda({ topic, niche: niche || topic, goal, platform }).catch(() => null),
    Date.now() + 15_000,
    null,
  );
  const bestCombo = andromeda?.featured?.[0] || null;
  const hook = hookOverride || bestCombo?.hook_final || bestCombo?.hook || `Esto cambió mi forma de ver ${topic}`;
  const cta = ctaOverride || bestCombo?.cta_final || 'Comentá INFO 👇';
  const caption = bestCombo?.copy_body || `${hook}. ${cta}`;
  // Hashtags fijos por nicho (sin LLM) — el hash heurístico está en _agencyBrain pero acá no lo importamos por peso
  const hashtags = [
    '#contenidodigital',
    '#instagram',
    '#tiktok',
    '#reels',
    '#viral',
    '#tips',
    '#marketing',
    '#emprendimiento',
    '#growth',
    '#creator',
  ];

  // 2) Prompt con reglas virales inyectadas
  step('🎨 Armando prompt con reglas de viralidad…');
  const built = buildBrandPrompt({
    templateKey: format === 'reel' ? 'portada-reel' : 'carrusel',
    vars: { titulo: hook, producto: topic, tema: topic, hook, estilo: 'premium', slides: '5' },
    brandColors,
    niche,
    platform,
    format,
    extraElements,
  });

  // 3) Generar visuales
  let img = null;
  let carouselSlides = null;
  if (format === 'carousel') {
    // Carrusel → slides SVG legibles (texto vectorial real, no imagen-IA borrosa)
    step('📑 Escribiendo texto slide-por-slide…');
    const slidesText = await withBudget(
      generateSlideTexts({ topic, niche, goal, hook, cta, slideCount: 5, scope, accountId, mood, platform }),
      Date.now() + 18_000,
      smartFallbackSlides({ topic, niche, hook, cta, slideCount: 5 }),
    );
    // Intento Canva oficial primero (calidad PRO) — fallback a SVG composer
    step('🎨 Probando Canva oficial (si conectado)…');
    const canvaSlides = await withBudget(
      tryCanvaSlides({ scope, slidesText, brandColors, mood }).catch(() => null),
      Date.now() + 28_000,
      null,
    );
    if (canvaSlides) {
      carouselSlides = canvaSlides.map((s, i) => ({ n: i + 1, ...s }));
      img = {
        url: canvaSlides[0].dataUrl,
        provider: 'canva-connect',
        mode: 'canva-export',
        usedPhotos: 0,
        slideCount: canvaSlides.length,
      };
      step(`✅ Canva generó ${canvaSlides.length} slides PNG (calidad PRO)`);
    } else {
      step('🖌️ Sin Canva conectado → usando composer SVG (texto vectorial nítido, auto-fit safe-zones)…');
      const composed = await composeCarousel({
        slidesText,
        brandColors,
        photoDataUrl: images[0] || null,
        platform,
        format,
        bgImageDataUrl: bgImage || null,
        textColor: textColor || null,
        bgColor: bgColor || null,
        accentColor: accentColor || null,
        brandHandle: accountId ? (accountId.startsWith('@') ? accountId : '@' + accountId) : '',
        mood,
      });
      carouselSlides = composed.slides;
      img = {
        url: composed.slides[0]?.dataUrl,
        provider: 'carousel-composer-svg',
        mode: 'svg-slides',
        usedPhotos: images.length ? 1 : 0,
        slideCount: composed.slides.length,
      };
    }
  } else {
    // Reel/portada → imagen IA con foto protagonista (con budget)
    step(`🖼️ Generando imagen${images.length ? ' con tu foto' : ''} (nano-banana)…`);
    img = await withBudget(
      generateBrandedImage({ prompt: built.prompt, images, platform, format, refine: autoPublish }).catch((e) => ({
        error: String(e?.message || e),
      })),
      deadline,
      {
        error: 'image-timeout',
        message: 'Generación de imagen pasó el budget (Vercel 60s). Probá sin refine o sin foto.',
      },
    );
  }

  // 4) Validación viral
  step('✅ Validando contra reglas viral vs no-viral…');
  const carouselCheck = validateCarousel({
    slides: [{ text: hook }, { text: caption }, { text: cta }],
    dimensions: built.spec?.canvas || {},
  });
  const prediction = predictVirality({
    hook,
    caption,
    hashtags,
    format: format === 'reel' ? 'reels' : format,
    platform,
  });

  // 5) Publicación (REAL vía API) o ready-for-review
  let publishResult = null;
  let status = 'ready-for-review';
  const publicUrl = img && !img.error && /^https?:\/\//.test(img.url || '') ? img.url : null;

  if (autoPublish) {
    const conn = await connectionStatus(scope).catch(() => ({}));
    const fullCaption = `${caption}\n\n${cta}\n\n${hashtags.join(' ')}`.trim();
    if (platform === 'instagram' && conn?.instagram?.connected) {
      if (publicUrl) {
        step('📤 Publicando en Instagram (API oficial)…');
        publishResult = await igPublish(scope, { imageUrl: publicUrl, caption: fullCaption });
        status = publishResult?.ok ? 'published' : 'publish-failed';
      } else {
        status = 'no-public-url';
        step('⚠️ Imagen sin URL pública (FAL refine necesario para auto-publish).');
      }
    } else if (platform === 'tiktok' && conn?.tiktok?.connected) {
      status = 'tiktok-needs-video';
      step('⚠️ TikTok requiere video (no imagen). Usá un reel/video para auto-publish.');
    } else {
      status = 'not-connected';
      step(`⚠️ Cuenta ${platform} no conectada. Conectala para auto-publicar.`);
    }
  }

  // 6) Registrar en memoria
  if (accountId) {
    await recordPlan(scope, accountId, {
      topic,
      format,
      hook,
      goal,
      viralScore: prediction?.viralScore,
      status,
      createdBy: 'autopilot',
      at: new Date().toISOString(),
    }).catch(() => {});
  }

  return {
    status,
    topic,
    platform,
    format,
    goal,
    content: {
      hook,
      caption,
      cta,
      hashtags,
      angle: bestCombo?.angle || null,
      persona: bestCombo?.persona || null,
      whyThisWorks: bestCombo?.why_this_works || null,
    },
    image: img?.url
      ? { url: img.url, provider: img.provider, refined: img.refined, mode: img.mode, usedPhotos: img.usedPhotos }
      : { error: img?.error || img?.message || 'sin imagen' },
    carouselSlides: carouselSlides || null,
    validation: {
      carousel: carouselCheck,
      prediction: {
        viralScore: prediction?.viralScore,
        virality: prediction?.virality,
        improvements: prediction?.improvements?.slice(0, 3),
      },
    },
    publish: publishResult,
    prompt: built.prompt,
    spec: built.spec,
    log,
    note: autoPublish
      ? status === 'published'
        ? '✅ Publicado vía API oficial.'
        : 'No se pudo auto-publicar — ver status. El contenido quedó listo para 1-click.'
      : 'Contenido generado. Activá autoPublish (con cuenta conectada) para publicar solo.',
  };
};

export const handleAutopilotCreate = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/autopilot/create-post' && m === 'POST') {
    try {
      const result = await createAutonomousPost({
        topic: body?.topic || '',
        niche: body?.niche || '',
        goal: body?.goal || 'engagement',
        platform: body?.platform || 'instagram',
        format: body?.format || 'carousel',
        accountId: body?.accountId || '',
        images: body?.images || [],
        brandColors: body?.brandColors || [],
        extraElements: body?.extraElements || [],
        mood: body?.mood || 'premium',
        fontStyle: body?.fontStyle || 'serif-editorial',
        textColor: body?.textColor || null,
        bgColor: body?.bgColor || null,
        accentColor: body?.accentColor || null,
        bgImage: body?.bgImage || null,
        hookOverride: body?.hookOverride || body?.hook || '',
        ctaOverride: body?.ctaOverride || body?.cta || '',
        brandVoice: body?.brandVoice || '',
        autoPublish: Boolean(body?.autoPublish),
        scope: ctx.userId || 'anon',
      });
      return json(200, { ok: true, ...result });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 300) });
    }
  }

  return false;
};
