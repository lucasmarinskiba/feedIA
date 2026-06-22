/**
 * _skills.js — handlers REALES de skills para la deploy de Vercel.
 *
 * A diferencia del resto del catch-all (demo mock), esto corre de verdad:
 *   GET  /api/skills/list                    → lee .claude/commands/feedIA-*.md
 *   GET  /api/skills/:id                      → markdown de una skill
 *   POST /api/skills/carousel/generate        → render REAL vía fal.run (Node, sin python)
 *   GET  /api/skills/carousel/status/:jobId   → estado + log + slides
 *   GET  /api/skills/carousel/slide/:job/:n   → sirve el PNG generado
 *
 * Producción real con el secret: setear FAL_KEY como env var en Vercel
 * (Project → Settings → Environment Variables). Sin FAL_KEY → plan-only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { askLLMJson } from './_llm.js';
import { pickAgentsForGoal, agentSystemPrompt } from './_growth-agents.js';

const CWD = process.cwd();
const COMMANDS_DIR = path.join(CWD, '.claude', 'commands');
const JOBS_DIR = path.join('/tmp', 'feedia-skill-jobs'); // Vercel: solo /tmp es escribible

const FAL_MODEL_SLUG = {
  'gpt-image-2': 'openai/gpt-image-2',
  'nano-banana-2': 'fal-ai/nano-banana-2',
};

const jobs = new Map(); // in-memory (warm instance)

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

const falKey = () => process.env.FAL_KEY || '';

const ensureDir = (d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
};

// ── Parse frontmatter description ─────────────────────────────────────────────
const parseDesc = (raw) => {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return '';
  const block = m[1] || '';
  const dm = block.match(/description:\s*(?:>-?\s*\n?)?([\s\S]*?)(?:\n[a-zA-Z_-]+:|$)/);
  return (dm && dm[1] ? dm[1] : '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
};

const categorize = (id) => {
  if (/canva|carousel|carrusel|reel|story|image|video|visual|design|format|feed-aesthetic/.test(id))
    return 'Creación visual';
  if (/cu|computer|remote|neural|brain|autonomy|attention|ensemble|memory|super-genius|learning/.test(id))
    return 'Cerebro / Computer Use';
  if (/copywriting|hook|caption|humanizer|voice|hashtag|content-strategy|ai-seo/.test(id)) return 'Copy & estrategia';
  if (/meta-ads|ad-creative|crm|pricing|cro|shopping|live-shopping|product-marketing/.test(id)) return 'Ventas & ads';
  if (/community|faq|crisis|influencer|collab|broadcast|instagram|sms/.test(id)) return 'Comunidad';
  if (/report|calendar|publish|scheduler|audit|curador/.test(id)) return 'Operación';
  return 'General';
};

const listSkills = () => {
  if (!fs.existsSync(COMMANDS_DIR)) return [];
  const out = [];
  for (const file of fs.readdirSync(COMMANDS_DIR)) {
    if (!file.startsWith('feedIA-') || !file.endsWith('.md')) continue;
    const id = file.replace(/\.md$/, '');
    try {
      const raw = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf8');
      const title = id
        .replace(/^feedIA-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      out.push({ id, title, description: parseDesc(raw) || title, category: categorize(id) });
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
};

const detectInputType = (s) => {
  if (/(?:youtube\.com\/watch|youtu\.be\/)/.test(s)) return 'youtube';
  if (/^https?:\/\//.test(s)) return 'article';
  return 'text';
};

// CANVA-GRADE SAFE-AREA · single source of truth en feedia-next/lib/canva-safe-area.ts.
// Para ig-carousel-4-5: canvas 1080×1350 · safe top:80 right:80 bottom:80 left:80 · hookBox top-band 22% · ctaBox bottom-band 10% · handleBox bottom-strip.
// El text DEBE caer dentro del safe-area; usar wrap multi-línea + fontSize autoFit (validator /api/twin/visual/validate).
const CANVAS_RULES = `Carrusel Instagram 1080x1350 4:5 con SAFE-AREA Canva-grade: márgenes 80px en los 4 lados, texto SOLO dentro de safe-area, hook en banda superior 22% del canvas, CTA en banda inferior 10%, handle bottom-strip. Wrap multi-línea obligatorio (preset headline 22ch/4l, fontSize 56-84px auto-fit). NUNCA clip silencioso del texto · NUNCA salir de safe-area salvo elementos de fondo o decoración artística. 10 slides: S1 portada (hero + título mega bicolor en hookBox), S2-S9 desarrollo denso 80-150 palabras (headline bicolor blanco+morado en hookBox, sub-puntos con iconos en círculos en subtextBox, TIP PRO box, progress X/10, hero photo realista de fondo), S10 CTA (call-to-action en ctaBox + handle @feedia en handleBox). Paleta morado #5B21B6/#7C3AED + lila #EDE9FE + fondo #0F0F12 + blanco + gris. Tipografía geometric sans bold (Geist/Inter). Español, sin datos inventados.`;

const fallbackStrategy = (topic) => {
  const style =
    'magazine infographic premium 1080x1350 4:5, fondo #0F0F12, acentos morados #5B21B6/#7C3AED, tipografía geometric sans bold, foto realista, iconos en círculos morados';
  const slides = Array.from({ length: 6 }, (_, i) => ({
    num: i + 1,
    title: i === 0 ? topic.slice(0, 60) : `Punto ${i}`,
    body: i === 0 ? 'Portada' : `Desarrollo ${i}`,
    visual_prompt: `${i === 0 ? 'Portada' : `Slide ${i + 1}`} de carrusel sobre "${topic.slice(0, 80)}". ${style}. Texto español, headline grande, ${i === 0 ? 'hero full bleed' : 'sub-puntos + TIP PRO'}. Progress ${i + 1}/6.`,
  }));
  return { slides, caption: `Carrusel sobre ${topic.slice(0, 60)}.`, hashtags: '#instagram #contenido #marketing #ia' };
};

// Estrategia vía Anthropic API (fetch, sin SDK). Fallback determinístico si no hay key.
const buildStrategy = async (input, inputType) => {
  const topic = inputType === 'text' ? input : `contenido de: ${input}`;
  const specs = pickAgentsForGoal(`carrusel instagram saves dwell ${topic}`, 'instagram', 2);
  const specSystem = specs.length
    ? `\n\n--- ESPECIALISTAS DE CARRUSEL ACTIVADOS ---\n${specs.map(agentSystemPrompt).join('\n---\n')}\n`
    : '';
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const prompt = `Generá carrusel Instagram 10 slides sobre: "${topic}".${specSystem}\n${CANVAS_RULES}\nDevolvé SOLO JSON: {"slides":[{"num":1,"title":"headline bicolor","body":"subtítulo + sub-puntos","visual_prompt":"prompt completo español para gpt-image-2, todas las zonas, texto literal entre comillas, 1080x1350 4:5"}],"caption":"100-150 palabras + CTA","hashtags":"8-12 hashtags"}. 10 slides exactos. Sin markdown.`;
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          temperature: 0.6,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (resp.ok) {
        const j = await resp.json();
        const txt = j && j.content && j.content[0] && j.content[0].text ? j.content[0].text : '';
        const cleaned = txt
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/i, '');
        const strat = JSON.parse(cleaned);
        if (strat && Array.isArray(strat.slides) && strat.slides.length) return strat;
      }
    } catch {
      /* fallback */
    }
  }
  return fallbackStrategy(topic);
};

const FAL_ASPECT = { reel: '9:16', historia: '9:16', story: '9:16', carrusel: '4:5' };
const GPT_SIZE = {
  reel: { width: 1024, height: 1792 },
  historia: { width: 1024, height: 1792 },
  story: { width: 1024, height: 1792 },
  carrusel: { width: 1024, height: 1280 },
};

const falImage = async (slug, prompt, format) => {
  const aspect = FAL_ASPECT[format] || '4:5';
  const size = GPT_SIZE[format] || GPT_SIZE.carrusel;
  const body = slug.startsWith('fal-ai/nano-banana')
    ? { prompt, num_images: 1, aspect_ratio: aspect, output_format: 'png' }
    : { prompt, image_size: size, quality: 'high', num_images: 1, output_format: 'png' };
  const resp = await fetch(`https://fal.run/${slug}`, {
    method: 'POST',
    headers: { Authorization: `Key ${falKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`fal ${resp.status}`);
  const j = await resp.json();
  const url = j && j.images && j.images[0] && j.images[0].url;
  if (!url) throw new Error('sin imagen');
  return url; // CDN fal — no descargamos (serverless stateless)
};

/**
 * Generación SÍNCRONA: en serverless la función se congela tras res.end, así que
 * hacemos todo dentro del request y devolvemos URLs CDN de fal (sin /tmp, sin poll).
 * Limita slides para no exceder maxDuration.
 */
const generateSync = async (strategy, model, format, log) => {
  const slug = FAL_MODEL_SLUG[model] || FAL_MODEL_SLUG['gpt-image-2'];
  const all = strategy && Array.isArray(strategy.slides) ? strategy.slides : [];
  // Cap: carrusel hasta 8 imágenes; reel/story 1 cover. (límite de tiempo serverless)
  const max = format === 'reel' || format === 'historia' || format === 'story' ? 1 : 8;
  const slides = all.slice(0, max);
  const out = [];
  log.push(`🌐 fal ${slug} · ${slides.length} imagen(es) · ${format}`);
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i] || {};
    const num = s.num || i + 1;
    const prompt = s.visual_prompt || s.prompt || `${s.title || ''}. ${s.body || ''}`.trim();
    if (!prompt) {
      log.push(`slide ${num}: sin prompt`);
      continue;
    }
    try {
      const url = await falImage(slug, prompt, format);
      out.push({ num, url, title: s.title || '' });
      log.push(`✓ slide ${num}/${slides.length}`);
    } catch (err) {
      log.push(`slide ${num}: ${String(err)}`);
    }
  }
  return out;
};

// ── Cerebro FeedIA: doctrina central (ver .claude/commands/feedIA-brain.md) ───
// Inyectada como system en TODA llamada LLM → cada skill responde como especialista.
const FEEDIA_BRAIN = `Sos el cerebro de FeedIA: reemplazás a una agencia entera de redes con precisión profesional y EJECUTÁS. Cada respuesta es de especialista, lista para usar, no borrador.
EQUIPO INTERNO (toda entrega pasa por los roles relevantes, calidad de agencia top):
- Community manager: tono de marca, siembra de comentarios, respuestas que dan ganas de interactuar, moderación, detección temprana de crisis.
- Director de arte / diseñador gráfico: jerarquía visual, grilla, contraste, color de marca, tipografía, composición 4:5 y 9:16, consistencia entre piezas.
- Copywriter publicitario: big idea, ángulo, AIDA/PAS, oferta clara, CTA específico, microcopy.
- Estratega de contenido (agencia): pilares, calendario, mix de formatos, objetivo de negocio detrás de cada pieza.
- Growth / analista: lee métricas, detecta el cuello de botella, propone el experimento A/B de mayor ROI, prioriza.
- Influencer / creador nativo: autenticidad, storytelling personal, hooks nativos, lectura de tendencias y sonidos.
- Media buyer (cuando aplica): estructura de campaña, audiencias, creativo, ángulos de prueba.
- SEO/AEO: descubrimiento en buscadores y en IA (ChatGPT/Perplexity).
ELOCUENCIA: claridad sobre adorno, concreto > abstracto, voz humana con criterio. PROHIBIDO (delata IA): "en el vasto mundo", "fascinante", "revolucionario", "en la era digital", "sumérgete", "desbloquea el poder", "no es solo X es Y", abrir con "¿Sabías que?"/"Hoy te traigo".
ALGORITMO INSTAGRAM: señal madre = sends/shares a DM > saves > comments > likes; Reels = alcance frío (hook visual 0-1s + retención + loop); carrusel = saves + dwell (slide 1 promete, última paga + CTA); caption 1ª línea = hook; primeros 30min (engagement velocity) deciden empuje.
ALGORITMO TIKTOK (≠ IG): FYP en frío, seguidores casi no importan; completion-rate + rewatch mandan; hook 0-2s triple capa (verbal+visual+texto); sonido trending = distribución; loop perfecto multiplica rewatch; nativo/crudo > producido; comentarios sembrados (cliffhanger/pregunta) suben ranking.
PRINCIPIOS DE PERSUASIÓN: claridad, especificidad, prueba (cifras reales o ejemplo), una sola idea por pieza, beneficio antes que feature, fricción mínima en el CTA.
EQUIPO DE CRECIMIENTO (20 especialistas activos, invocá el correcto según objetivo): Hook Engineer 🪝 · Retention Architect ⏱️ · IG Algorithm Whisperer 📷 · TikTok FYP Whisperer 🎵 · Niche Definer 🎯 · Series Designer 📺 · Community Activator 💬 · Profile Conversion 🎨 · Trend Surfer 🌊 · Collab Strategist 🤝 · DM Funnel 📩 · Story Stacker 📖 · Posting Cadence 📅 · Vertical Authority 🎓 · UGC Mover 👥 · Save-Bait 🔖 · Share-Bait ↗️ · Live Selling 🎥 · Loop Designer 🔁 · Algorithm Recovery 🚑.
SOCIAL COMMERCE: en TikTok se vende por descubrimiento (soft-sell nativo, demo/UGC, prueba social, video shoppable, TikTok Shop, LIVE shopping); en IG por relación (embudo DM, link in bio, stories con sticker link, product tags + Tienda IG/checkout). El contenido vende sin parecer anuncio.
CRECIMIENTO: seguidores = alcance frío + razón clara para seguir + perfil/bio que convierte. Interacción = disparadores diseñados (comments/saves/sends/replies) + respuesta en los primeros 30-60min. IG: Reels frío + carrusel saves + stories relación + Explore. TikTok: completion + series + sonidos trending + cadencia alta + nichado.
ANÁLISIS: conectar cada métrica con un objetivo y una decisión; detectar el cuello de botella (alcance < retención < engagement < conversión) y proponer 1 acción de mayor ROI; tendencia > foto puntual.
REGLA: no inventar cifras; respetar voz de marca; mínimo esfuerzo del usuario; aplicar el algoritmo correcto por red; entregar terminado y accionable.`;

// ── TikTok: equipo de agentes internos (cerebro FeedIA) ──────────────────────
const TIKTOK_AGENTS = `Sos el cerebro TikTok de FeedIA: equipo de especialistas que devuelve UN resultado terminado (el usuario hace poco, sin agencia):
- Estratega viral: ángulo + por qué puede explotar en FYP (completion/rewatch/shares).
- Engagement / community: disparadores de comentarios y shares, pregunta de cierre, comentario fijado sugerido.
- Temática / serie: define formato y serie repetible nativa de TikTok.
- Ganchos 0-2s: hook en 3 capas (verbal + visual + on-screen) con pattern interrupt en el segundo 0.
- Optimización de video: ritmo, cortes 2-4s, duración real < guion, loop de cierre, sin watermark, subtítulos.
- Storytelling: arco tensión → payoff, cliffhanger por beat.
- Storyboard: qué se ve por beat (encuadre, corte, b-roll, prop).
- On-screen text: texto corto grande por beat, adelanta ("esperá al paso 3").
- Título/caption: 1ª línea que detiene + describe.
- Hashtags: mix nicho + amplio + trend (4-8), sin spam.
- Sonido: sugiere tipo de sonido/tendencia y por qué ayuda a la distribución.
Español, voz de marca, cifras reales o no inventar, nativo TikTok (no IG). Resultado listo para grabar y publicar.`;

// Multi-LLM (Groq/Gemini/DeepSeek/OpenRouter/Anthropic) con el cerebro como system.
const anthropicJSON = async (prompt, maxTokens) =>
  askLLMJson(prompt, { system: FEEDIA_BRAIN, maxTokens, temperature: 0.7 });

const audienciaTxt = (a) => {
  if (!a || typeof a !== 'object') return '';
  const sig = Object.entries({ edad: a.edad, genero: a.genero, region: a.region, idioma: a.idioma, nivel: a.nivel })
    .filter(([, v]) => v && v !== 'Todos')
    .map(([k, v]) => `${k}: ${v}`);
  if (a.intereses) sig.push(`intereses: ${a.intereses}`);
  return sig.length
    ? `\nAudiencia objetivo (adaptá lenguaje/ritmo/referencias): ${sig.join(', ')}.`
    : '\nAudiencia: general (no segmentar el lenguaje).';
};

const tiktokScript = async (b) => {
  const dur = b.duracion || 30;
  const ctx = `${audienciaTxt(b.audiencia)}${b.tono ? `\nTono: ${b.tono}.` : ''}${b.gancho && b.gancho !== 'auto' ? `\nTipo de gancho: ${b.gancho}.` : ''}${b.cta ? `\nObjetivo del CTA: ${b.cta}.` : ''}${b.ritmo ? `\nRitmo de edición: ${b.ritmo}.` : ''}${b.plataforma && b.plataforma !== 'tiktok' ? `\nPlataforma destino: ${b.plataforma} (adaptá formato).` : ''}${b.subtitulos === 'no' ? '\nSin subtítulos.' : ''}${b.broll === 'no' ? '\nSin b-roll.' : ''}${b.densidad && b.densidad !== 'media' ? `\nDensidad de texto en pantalla: ${b.densidad}.` : ''}${b.ctaTexto ? `\nCTA exacto a usar: "${b.ctaTexto}".` : ''}${b.evitar ? `\nEvitá estas palabras/temas: ${b.evitar}.` : ''}`;
  const specs = pickAgentsForGoal(`guion tiktok ${b.tema} hook retención`, 'tiktok', 2);
  const specSystem = specs.length
    ? `\n\n--- ESPECIALISTAS ACTIVADOS ---\n\n${specs.map(agentSystemPrompt).join('\n\n---\n\n')}`
    : '';
  const out = await anthropicJSON(
    `${TIKTOK_AGENTS}${specSystem}\nGuion video TikTok ${dur}s, formato ${b.formato || 'talking-head'}, modo ${b.modo || 'educar'}, tema: "${b.tema}".${ctx}\nJSON: {"title":"caption 1ª línea","hook":"hook 0-2s","beats":[{"tipo":"hook|desarrollo|payoff|cta","duracion":3,"guion":"","noVerbal":"expresión+gesto+mirada","onScreen":"","visual":""}],"caption":"","hashtags":"#a #b","sonido":"","retencion":""}`,
    6000,
  );
  if (out && out.beats) return { ok: true, ...out };
  const beats = [
    {
      tipo: 'hook',
      duracion: 2,
      guion: `Hook sobre ${b.tema}`,
      noVerbal: 'cejas arriba, mano que frena, mirada a lente',
      onScreen: 'gancho grande',
      visual: 'zoom/corte seg 0',
    },
    {
      tipo: 'desarrollo',
      duracion: 8,
      guion: 'Idea 1 + cliffhanger',
      noVerbal: 'gesto que enumera',
      onScreen: 'palabra clave',
      visual: 'cambio de plano',
    },
    {
      tipo: 'desarrollo',
      duracion: 8,
      guion: 'Idea 2 sube tensión',
      noVerbal: 'energía up',
      onScreen: 'dato real',
      visual: 'corte seco',
    },
    {
      tipo: 'payoff',
      duracion: 6,
      guion: 'El insight',
      noVerbal: 'pausa, baja la voz',
      onScreen: 'revelación',
      visual: 'primer plano',
    },
    {
      tipo: 'cta',
      duracion: 3,
      guion: 'Comentá/seguí + loop',
      noVerbal: 'señalar comentarios',
      onScreen: 'CTA',
      visual: 'volver al frame 1',
    },
  ];
  return {
    ok: true,
    simulated: true,
    title: String(b.tema).slice(0, 60),
    hook: `Hook sobre ${b.tema}`.slice(0, 60),
    beats,
    caption: `Sobre ${b.tema}.`,
    hashtags: '#tiktok #fyp #contenido',
    sonido: 'trending del nicho',
    retencion: 'Loop de cierre para rewatch',
  };
};

// Equipo de imagen interno: perfecciona el PROMPT de cada foto (render listo).
const PHOTO_AGENTS = `Además, activá el equipo de IMAGEN del cerebro FeedIA (cada foto sale con prompt de render perfecto):
1. Director de fotografía: encuadre 9:16 vertical (1080x1920), regla de tercios, punto focal claro, profundidad, plano (close/medium/wide) y lente coherentes.
2. Prompt engineer de imagen (Nano Banana / gpt-image-2): prompt AUTOCONTENIDO con secciones [SUJETO][ACCIÓN][ENTORNO][LUZ tipo+dirección][LENTE/PLANO][PALETA][ESTILO][MOOD][CALIDAD: 1080x1920 vertical, alto contraste, nativo TikTok]. El texto en pantalla va SIEMPRE literal entre comillas exactas para que el modelo lo renderice.
3. Tipógrafo / on-screen: define texto corto y grande, ubicado en safe-area (evita bordes y UI de TikTok abajo/derecha), legible en mobile, jerarquía clara.
4. Color & estética: paleta coherente foto a foto, look nativo/crudo real > sobreproducido.
5. Consistencia de serie: misma identidad visual (estilo, paleta, tipografía, grano) en todas las fotos.
Reglas: foto 1 = hook que obliga a deslizar; 1 idea por foto; reservá espacio negativo para el texto; sin texto inventado; sin watermark.`;

const fotoCtx = (b) =>
  `${audienciaTxt(b.audiencia)}${b.modo ? `\nObjetivo: ${b.modo}.` : ''}${b.estilo ? `\nEstilo visual: ${b.estilo}.` : ''}${b.paleta && b.paleta !== 'marca' ? `\nPaleta: ${b.paleta}.` : ''}${b.mood ? `\nMood: ${b.mood}.` : ''}${b.densidad && b.densidad !== 'media' ? `\nDensidad de texto en pantalla: ${b.densidad}.` : ''}${b.modelo ? `\nModelo de render destino: ${b.modelo} (optimizá el prompt para sus fortalezas).` : ''}`;

const tiktokPhoto = async (b) => {
  const n = b.fotos || 6;
  const specs = pickAgentsForGoal(`foto tiktok photo mode ${b.tema} hook visual cover thumbnail`, 'tiktok', 2);
  const specSystem = specs.length
    ? `\n\n--- ESPECIALISTAS ACTIVADOS ---\n\n${specs.map(agentSystemPrompt).join('\n\n---\n\n')}`
    : '';
  const out = await anthropicJSON(
    `${TIKTOK_AGENTS}\n${PHOTO_AGENTS}${specSystem}\n\nCreá un ${b.tipo || 'photo set'} TikTok Photo Mode 9:16, ${n} fotos, tema: "${b.tema}".${fotoCtx(b)}\nJSON: {"photos":[{"n":1,"role":"hook|revelacion|remate","text":"texto en pantalla corto","prompt":"prompt de imagen perfeccionado con todas las secciones, autocontenido, 9:16, con el texto entre comillas","alt":"alt accesible breve"}],"caption":"","hashtags":"#a #b","sonido":""}`,
    6500,
  );
  if (out && out.photos) return { ok: true, ...out };
  const estilo = b.estilo || 'realista nativo TikTok';
  const paleta = b.paleta && b.paleta !== 'marca' ? b.paleta : 'alto contraste';
  const tema = String(b.tema).slice(0, 60);
  const photos = Array.from({ length: n }, (_, i) => {
    const txt = i === 0 ? `Hook: ${tema}`.slice(0, 48) : i === n - 1 ? 'Punch final + volvé / comentá' : `Idea ${i}`;
    return {
      n: i + 1,
      role: i === 0 ? 'hook' : i === n - 1 ? 'remate' : 'revelacion',
      text: txt,
      prompt: `[SUJETO] escena sobre "${tema}", foto ${i + 1}/${n}. [PLANO] ${i === 0 ? 'plano impactante que obliga a deslizar' : 'plano claro de una idea'}. [ENTORNO] coherente con el tema. [LUZ] natural direccional, alto contraste. [PALETA] ${paleta}. [ESTILO] ${estilo}, crudo real, no sobreproducido. [ON-SCREEN] texto grande "${txt}" en safe-area superior, legible mobile, espacio negativo reservado. [MOOD] ${b.mood || 'nativo TikTok'}. [CALIDAD] 1080x1920 vertical 9:16, nativo TikTok, sin watermark.`,
      alt: `Foto ${i + 1} sobre ${tema}`,
    };
  });
  return {
    ok: true,
    simulated: true,
    photos,
    caption: `Sobre ${tema}.`,
    hashtags: '#tiktok #fyp #fotos',
    sonido: 'trending del nicho',
  };
};

// ── Router ────────────────────────────────────────────────────────────────────
// Devuelve true si manejó el request. ASYNC: el caller DEBE await.
const handleSkills = async (req, res, pathName, method, body, searchParams) => {
  if (pathName === '/api/skills/tiktok/script' && method === 'POST') {
    if (!body || !body.tema) {
      json(res, 400, { error: 'missing-tema' });
      return true;
    }
    const { gateRequest } = await import('./_gate.js');
    const gate = await gateRequest(req, res, 'ai-call');
    if (!gate.ok) return true;
    const result = await tiktokScript(body);
    const { recordUsage } = await import('./_usage.js');
    await recordUsage(gate.userId, 'ai-call', 1, { model: 'claude-haiku-4-5', inputTokens: 800, outputTokens: 600 });
    json(res, 200, result);
    return true;
  }
  if (pathName === '/api/skills/tiktok/photo' && method === 'POST') {
    if (!body || !body.tema) {
      json(res, 400, { error: 'missing-tema' });
      return true;
    }
    const { gateRequest } = await import('./_gate.js');
    const gate = await gateRequest(req, res, 'ai-call');
    if (!gate.ok) return true;
    const result = await tiktokPhoto(body);
    const { recordUsage } = await import('./_usage.js');
    await recordUsage(gate.userId, 'ai-call', 1, { model: 'claude-haiku-4-5', inputTokens: 600, outputTokens: 400 });
    json(res, 200, result);
    return true;
  }
  if (pathName === '/api/skills/list' && method === 'GET') {
    const skills = listSkills();
    const categories = [...new Set(skills.map((s) => s.category))];
    json(res, 200, { count: skills.length, categories, skills });
    return true;
  }

  let m = pathName.match(/^\/api\/skills\/(feedIA-[a-z0-9-]+)$/i);
  if (m && method === 'GET') {
    const file = path.join(COMMANDS_DIR, `${m[1]}.md`);
    if (fs.existsSync(file)) json(res, 200, { id: m[1], markdown: fs.readFileSync(file, 'utf8') });
    else json(res, 404, { error: 'skill-not-found', id: m[1] });
    return true;
  }

  if (pathName === '/api/skills/carousel/generate' && method === 'POST') {
    // Gate: requiere quota de post + ai-call + imágenes.
    const { gateRequest } = await import('./_gate.js');
    const slideCount = Math.min(10, Math.max(3, Number((body || {}).slideCount || 5)));
    const gPost = await gateRequest(req, res, 'post');
    if (!gPost.ok) return true;
    const gAi = await gateRequest(req, res, 'ai-call');
    if (!gAi.ok) return true;
    const gImg = await gateRequest(req, res, 'image');
    if (!gImg.ok) return true;
    // Síncrono: await hasta tener las imágenes (serverless se congela tras end).
    await handleGenerate(res, body || {});
    // Registrar usage post-éxito (fire-and-forget — caller ya cerró res).
    const { recordUsage } = await import('./_usage.js');
    await recordUsage(gPost.userId, 'post', 1);
    await recordUsage(gPost.userId, 'ai-call', 2, {
      model: 'claude-sonnet-4-6',
      inputTokens: 1500,
      outputTokens: 2000,
    });
    await recordUsage(gPost.userId, 'image', slideCount);
    return true;
  }

  return false;
};

const handleGenerate = async (res, b) => {
  const input = (b.input || '').trim();
  if (!input) {
    json(res, 400, { error: 'missing-input' });
    return;
  }
  const format = b.format || 'carrusel';
  const model = b.model || 'gpt-image-2';
  const inputType = detectInputType(input);
  const log = [];
  if (!falKey()) {
    let strategy = b.strategy;
    if (!strategy || !Array.isArray(strategy.slides) || !strategy.slides.length) {
      strategy = await buildStrategy(input, inputType);
    }
    json(res, 200, {
      status: 'plan-only',
      hasFalKey: false,
      format,
      inputType,
      strategy,
      note: 'Setear FAL_KEY en Vercel env para render real de imágenes.',
    });
    return;
  }
  try {
    let strategy = b.strategy;
    if (!strategy || !Array.isArray(strategy.slides) || !strategy.slides.length) {
      log.push('🧠 Construyendo estrategia…');
      strategy = await buildStrategy(input, inputType);
      log.push(`✓ ${strategy.slides.length} slides`);
    }
    const slides = await generateSync(strategy, model, format, log);
    json(res, 200, {
      status: slides.length ? 'done' : 'error',
      hasFalKey: true,
      format,
      inputType,
      model,
      slides,
      caption: strategy.caption || '',
      hashtags: strategy.hashtags || '',
      log,
      error: slides.length ? undefined : 'Ninguna imagen generada. Revisá FAL_KEY/saldo fal.ai.',
    });
  } catch (err) {
    json(res, 200, { status: 'error', hasFalKey: true, error: String(err), log });
  }
};

export { handleSkills };
