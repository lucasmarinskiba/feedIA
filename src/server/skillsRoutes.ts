/**
 * skillsRoutes — expone las skills de FeedIA (.claude/commands/feedIA-*.md) a la web app
 * y conecta el generador de carruseles (run.py) como endpoint real.
 *
 *   GET  /api/skills/list                  → lista todas las skills (id, title, description)
 *   GET  /api/skills/:id                    → markdown completo de una skill
 *   POST /api/skills/carousel/generate      → corre src/skills/carrusel-instagram (estrategia + PNGs)
 *   GET  /api/skills/carousel/status/:jobId → estado de un job de generación
 *
 * Producción real: el endpoint de carrusel hace spawn de python con FAL_KEY del env.
 * Si python o FAL_KEY faltan → responde modo "plan-only" (estrategia sin imágenes).
 */
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { json, type RouteDefinition } from './http.js';

const CWD = process.cwd();
const COMMANDS_DIR = join(CWD, '.claude', 'commands');
const SKILL_DIR = join(CWD, 'src', 'skills', 'carrusel-instagram');
// Serverless (Vercel) sólo permite escribir en /tmp.
const JOBS_DIR =
  process.env.VERCEL || process.env.FEEDIA_SERVERLESS ? join('/tmp', 'skill-jobs') : join(CWD, 'data', 'skill-jobs');

interface SkillMeta {
  id: string;
  title: string;
  description: string;
  category: string;
}

// ── Parse frontmatter description de cada feedIA-*.md ─────────────────────────
const parseFrontmatter = (raw: string): { description: string } => {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return { description: '' };
  const block = m[1] ?? '';
  // description puede ser inline o folded (>)
  const dm = block.match(/description:\s*(?:>-?\s*\n?)?([\s\S]*?)(?:\n[a-zA-Z_-]+:|$)/);
  const desc = (dm?.[1] ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  return { description: desc };
};

const categorize = (id: string): string => {
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

const listSkills = (): SkillMeta[] => {
  if (!existsSync(COMMANDS_DIR)) return [];
  const out: SkillMeta[] = [];
  for (const file of readdirSync(COMMANDS_DIR)) {
    if (!file.startsWith('feedIA-') || !file.endsWith('.md')) continue;
    const id = file.replace(/\.md$/, '');
    try {
      const raw = readFileSync(join(COMMANDS_DIR, file), 'utf8');
      const { description } = parseFrontmatter(raw);
      const title = id
        .replace(/^feedIA-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      out.push({ id, title, description: description || title, category: categorize(id) });
    } catch {
      /* skip unreadable */
    }
  }
  return out.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
};

// ── Job store (en memoria + persistido a disco) ──────────────────────────────
interface CarouselJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error' | 'plan-only';
  input: string;
  inputType: 'youtube' | 'article' | 'text';
  model: string;
  outputDir: string;
  log: string[];
  slides: string[];
  error?: string;
  startedAt: string;
  finishedAt?: string;
}
const jobs = new Map<string, CarouselJob>();

const ensureDir = (d: string): void => {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
};

const detectInputType = (s: string): CarouselJob['inputType'] => {
  if (/(?:youtube\.com\/watch|youtu\.be\/)/.test(s)) return 'youtube';
  if (/^https?:\/\//.test(s)) return 'article';
  return 'text';
};

const pythonBin = (): string => process.env.PYTHON_BIN ?? 'python3';

const hasFalKey = (): boolean => {
  if (process.env.FAL_KEY) return true;
  const envFile = join(SKILL_DIR, '.env');
  if (existsSync(envFile)) {
    try {
      return /FAL_KEY=\S+/.test(readFileSync(envFile, 'utf8'));
    } catch {
      /* noop */
    }
  }
  return false;
};

const falKey = (): string => {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  const envFile = join(SKILL_DIR, '.env');
  if (existsSync(envFile)) {
    try {
      const m = readFileSync(envFile, 'utf8').match(/FAL_KEY=(\S+)/);
      if (m?.[1]) return m[1];
    } catch {
      /* noop */
    }
  }
  return '';
};

const isServerless = (): boolean => !!(process.env.VERCEL || process.env.FEEDIA_SERVERLESS);

const FAL_MODEL_SLUG: Record<string, string> = {
  'gpt-image-2': 'openai/gpt-image-2',
  'nano-banana-2': 'fal-ai/nano-banana-2',
};

interface StrategySlide {
  num?: number;
  title?: string;
  body?: string;
  visual_prompt?: string;
  prompt?: string;
}
interface CarouselStrategy {
  slides: StrategySlide[];
  caption?: string;
  hashtags?: string;
  style?: string;
}

// Doctrina central del cerebro FeedIA (ver .claude/commands/feedIA-brain.md).
// Se pasa como `system` a toda llamada LLM → cada skill responde como especialista.
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
SOCIAL COMMERCE: en TikTok se vende por descubrimiento (soft-sell nativo, demo/UGC, prueba social, video shoppable, TikTok Shop, LIVE shopping); en IG por relación (embudo DM, link in bio, stories con sticker link, product tags + Tienda IG/checkout). El contenido vende sin parecer anuncio.
CRECIMIENTO: seguidores = alcance frío + razón clara para seguir + perfil/bio que convierte. Interacción = disparadores diseñados (comments/saves/sends/replies) + respuesta en los primeros 30-60min. IG: Reels frío + carrusel saves + stories relación + Explore. TikTok: completion + series + sonidos trending + cadencia alta + nichado.
ANÁLISIS: conectar cada métrica con un objetivo y una decisión; detectar el cuello de botella (alcance < retención < engagement < conversión) y proponer 1 acción de mayor ROI; tendencia > foto puntual.
REGLA: no inventar cifras; respetar voz de marca; mínimo esfuerzo del usuario; aplicar el algoritmo correcto por red; entregar terminado y accionable.`;

const CANVAS_RULES = `Reglas de diseño FeedIA (carrusel 1080x1350, 4:5, magazine infographic premium):
- 10 slides. S1 portada (hero + título mega bicolor). S2-S9 desarrollo denso (80-150 palabras). S10 CTA.
- Headline BICOLOR (palabras blancas + palabras de color de marca en la misma frase).
- Cada slide: progress X/10 top-left, hero photo realista, sub-puntos con iconos en círculos, TIP PRO box (S2-S9).
- Paleta default morado #5B21B6/#7C3AED + lila #EDE9FE + fondo #0F0F12 + blanco + gris #9CA3AF.
- Tipografía geometric sans bold. Sin texto en inglés. Sin datos inventados.`;

/* Construye estrategia (slides + prompts) desde el input. LLM si hay ANTHROPIC_API_KEY,
   si no, fallback determinístico para que el render igual funcione. */
const buildStrategy = async (input: string, inputType: string): Promise<CarouselStrategy> => {
  const topic = inputType === 'text' ? input : `contenido de: ${input}`;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { askJson } = await import('../agent/claude.js');
      const prompt = `Generá un carrusel de Instagram de 10 slides sobre: "${topic}".
${CANVAS_RULES}
Devolvé JSON con esta forma exacta:
{
  "slides": [
    { "num": 1, "title": "HEADLINE bicolor (indica palabras blancas y moradas)", "body": "subtítulo + sub-puntos", "visual_prompt": "[LAYOUT]...[HERO PHOTO]...[HEADLINE BICOLOR]...[SUB-PUNTOS]...[TIP PRO]...[ESTILO]...[CONSTRAINTS] prompt COMPLETO en español para gpt-image-2, texto literal entre comillas, 1080x1350 4:5" }
  ],
  "caption": "caption Instagram 100-150 palabras, 1 CTA",
  "hashtags": "8-12 hashtags nicho + intent separados por espacio"
}
Los visual_prompt deben ser autocontenidos y detallados (cada uno declara todas las zonas). 10 slides exactos.`;
      const strat = await askJson<CarouselStrategy>(prompt, {
        maxTokens: 8000,
        temperature: 0.6,
        system: `${FEEDIA_BRAIN}\n${CANVAS_RULES}`,
      });
      if (strat?.slides?.length) return strat;
    } catch {
      /* cae al fallback */
    }
  }
  // Fallback determinístico: 5 slides template (sin LLM)
  const baseStyle =
    'magazine infographic premium 1080x1350 4:5, fondo #0F0F12, acentos morados #5B21B6/#7C3AED, tipografía geometric sans bold, foto realista, iconos en círculos morados';
  const slides: StrategySlide[] = Array.from({ length: 6 }, (_, i) => ({
    num: i + 1,
    title: i === 0 ? topic.slice(0, 60) : `Punto ${i}`,
    body: i === 0 ? 'Portada' : `Desarrollo del punto ${i} sobre ${topic.slice(0, 40)}`,
    visual_prompt: `${i === 0 ? 'Portada' : `Slide ${i + 1}`} de carrusel sobre "${topic.slice(0, 80)}". ${baseStyle}. Texto en español, headline grande, ${i === 0 ? 'hero photo full bleed' : 'sub-puntos + TIP PRO box'}. Progress ${i + 1}/6 top-left.`,
  }));
  return { slides, caption: `Carrusel sobre ${topic.slice(0, 60)}.`, hashtags: '#instagram #contenido #marketing #ia' };
};

/**
 * Generación Node-nativa vía fal.run (sync). No requiere python — corre en Vercel.
 * Llama un slug por slide, descarga el PNG y lo guarda en outputDir/slides.
 */
const runCarouselNodeFal = async (job: CarouselJob, strategy: unknown): Promise<void> => {
  const key = falKey();
  const slug = FAL_MODEL_SLUG[job.model] ?? FAL_MODEL_SLUG['gpt-image-2'] ?? 'openai/gpt-image-2';
  const slides = ((strategy as { slides?: StrategySlide[] })?.slides ?? []) as StrategySlide[];
  if (!slides.length) {
    job.status = 'error';
    job.error = 'strategy.slides vacío. El cliente debe enviar la estrategia con prompts por slide.';
    job.finishedAt = new Date().toISOString();
    return;
  }
  const slidesDir = join(job.outputDir, 'slides');
  ensureDir(slidesDir);
  job.status = 'running';
  job.log.push(`🌐 Node-FAL · modelo ${slug} · ${slides.length} slides`);

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i] ?? {};
    const num = s.num ?? i + 1;
    const prompt = s.visual_prompt ?? s.prompt ?? `${s.title ?? ''}. ${s.body ?? ''}`.trim();
    if (!prompt) {
      job.log.push(`slide ${num}: sin prompt, salto`);
      continue;
    }
    try {
      const body = slug.startsWith('fal-ai/nano-banana')
        ? { prompt, num_images: 1, aspect_ratio: '4:5', output_format: 'png' }
        : { prompt, image_size: { width: 1024, height: 1280 }, quality: 'high', num_images: 1, output_format: 'png' };
      const resp = await fetch(`https://fal.run/${slug}`, {
        method: 'POST',
        headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        job.log.push(`slide ${num}: fal ${resp.status} ${resp.statusText}`);
        continue;
      }
      const j = (await resp.json()) as { images?: { url?: string }[] };
      const imgUrl = j.images?.[0]?.url;
      if (!imgUrl) {
        job.log.push(`slide ${num}: respuesta sin imagen`);
        continue;
      }
      const imgResp = await fetch(imgUrl);
      const buf = Buffer.from(await imgResp.arrayBuffer());
      writeFileSync(join(slidesDir, `slide-${String(num).padStart(2, '0')}.png`), buf);
      job.slides.push(join(slidesDir, `slide-${String(num).padStart(2, '0')}.png`));
      job.log.push(`✓ slide ${num}/${slides.length} generado`);
    } catch (err) {
      job.log.push(`slide ${num}: error ${String(err)}`);
    }
  }
  job.status = job.slides.length ? 'done' : 'error';
  if (!job.slides.length) job.error = 'Ningún slide generado. Revisá FAL_KEY y los prompts.';
  job.finishedAt = new Date().toISOString();
};

const runCarouselJob = (job: CarouselJob, strategy: unknown): void => {
  ensureDir(job.outputDir);
  // Persistir estrategia (Claude/LLM ya la generó) para que run.py o Node-FAL la consuma
  const strategyFile = join(job.outputDir, 'strategy.json');
  try {
    writeFileSync(strategyFile, JSON.stringify(strategy ?? {}, null, 2), 'utf8');
  } catch {
    /* noop */
  }

  if (!hasFalKey()) {
    job.status = 'plan-only';
    job.log.push('⚠️ FAL_KEY ausente. Estrategia guardada; imágenes NO generadas. Configurá FAL_KEY para render real.');
    job.finishedAt = new Date().toISOString();
    return;
  }

  // En serverless (Vercel) no hay python → usar generador Node-FAL.
  if (isServerless()) {
    job.log.push('☁️ Entorno serverless detectado · render vía Node-FAL (sin python)');
    void runCarouselNodeFal(job, strategy);
    return;
  }

  job.status = 'running';
  job.log.push(`🐍 spawn ${pythonBin()} run.py --strategy-file`);
  const args = [
    join(SKILL_DIR, 'scripts', 'run.py'),
    '--input',
    job.input,
    '--output-dir',
    job.outputDir,
    '--strategy-file',
    strategyFile,
    '--yes',
  ];
  const child = spawn(pythonBin(), args, {
    cwd: SKILL_DIR,
    env: { ...process.env, FAL_KEY: process.env.FAL_KEY ?? '' },
  });
  child.stdout.on('data', (d) => job.log.push(String(d).trimEnd()));
  child.stderr.on('data', (d) => job.log.push('[err] ' + String(d).trimEnd()));
  child.on('close', (code) => {
    job.status = code === 0 ? 'done' : 'error';
    if (code !== 0) job.error = `python exit ${code}`;
    // Recolectar PNGs generados
    const slidesDir = join(job.outputDir, 'slides');
    if (existsSync(slidesDir)) {
      try {
        job.slides = readdirSync(slidesDir)
          .filter((f) => f.endsWith('.png'))
          .map((f) => join(slidesDir, f));
      } catch {
        /* noop */
      }
    }
    job.finishedAt = new Date().toISOString();
  });
  child.on('error', (err) => {
    job.status = 'error';
    job.error = `No se pudo lanzar python (${pythonBin()}): ${err.message}. Instalá Python 3 o configurá PYTHON_BIN.`;
    job.finishedAt = new Date().toISOString();
  });
};

export const buildSkillsRoutes = (): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/skills/list',
    handler: ({ res }) => {
      const skills = listSkills();
      const categories = [...new Set(skills.map((s) => s.category))];
      json(res, 200, { count: skills.length, categories, skills });
    },
  },
  {
    method: 'GET',
    pattern: '/api/skills/:id',
    handler: ({ res, params }) => {
      const id = params['id'];
      const file = join(COMMANDS_DIR, `${id}.md`);
      if (!id || !/^feedIA-[a-z0-9-]+$/i.test(id) || !existsSync(file)) {
        json(res, 404, { error: 'skill-not-found', id });
        return;
      }
      json(res, 200, { id, markdown: readFileSync(file, 'utf8') });
    },
  },
  {
    method: 'POST',
    pattern: '/api/skills/carousel/generate',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { input?: string; model?: string; strategy?: CarouselStrategy };
      const input = (b.input ?? '').trim();
      if (!input) {
        json(res, 400, { error: 'missing-input' });
        return;
      }
      ensureDir(JOBS_DIR);
      const id = randomUUID().slice(0, 8);
      const job: CarouselJob = {
        id,
        status: 'queued',
        input,
        inputType: detectInputType(input),
        model: b.model ?? 'gpt-image-2',
        outputDir: join(JOBS_DIR, id),
        log: [],
        slides: [],
        startedAt: new Date().toISOString(),
      };
      jobs.set(id, job);
      // Async: si el cliente no mandó strategy con slides, la construimos (LLM o fallback)
      void (async () => {
        try {
          let strategy = b.strategy;
          if (!strategy?.slides?.length) {
            job.log.push('🧠 Construyendo estrategia (slides + prompts)…');
            strategy = await buildStrategy(input, job.inputType);
            job.log.push(`✓ Estrategia: ${strategy.slides.length} slides`);
          }
          runCarouselJob(job, strategy);
        } catch (err) {
          job.status = 'error';
          job.error = String(err);
          job.finishedAt = new Date().toISOString();
        }
      })();
      json(res, 202, { jobId: id, status: 'running', inputType: job.inputType, hasFalKey: hasFalKey() });
    },
  },
  {
    method: 'GET',
    pattern: '/api/skills/carousel/status/:jobId',
    handler: ({ res, params }) => {
      const job = jobs.get(params['jobId'] ?? '');
      if (!job) {
        json(res, 404, { error: 'job-not-found' });
        return;
      }
      // Exponemos slides por basename (no rutas absolutas) para servirlos seguro.
      const slideNames = job.slides.map((p) => p.split(/[\\/]/).pop()).filter(Boolean) as string[];
      json(res, 200, {
        id: job.id,
        status: job.status,
        inputType: job.inputType,
        model: job.model,
        log: job.log.slice(-40),
        slides: slideNames,
        error: job.error,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/skills/carousel/slide/:jobId/:name',
    handler: ({ res, params }) => {
      const job = jobs.get(params['jobId'] ?? '');
      const name = params['name'] ?? '';
      // Sólo basename PNG, sin traversal.
      if (!job || !/^[\w.-]+\.png$/i.test(name)) {
        json(res, 404, { error: 'not-found' });
        return;
      }
      const file = join(job.outputDir, 'slides', name);
      if (!existsSync(file)) {
        json(res, 404, { error: 'not-found' });
        return;
      }
      try {
        const buf = readFileSync(file);
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' });
        res.end(buf);
      } catch {
        json(res, 500, { error: 'read-failed' });
      }
    },
  },
  // ── TikTok: guion de video (equipo de agentes internos) ──────────────────
  {
    method: 'POST',
    pattern: '/api/skills/tiktok/script',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as {
        tema?: string;
        duracion?: number;
        formato?: string;
        modo?: string;
        tono?: string;
        gancho?: string;
        cta?: string;
        ritmo?: string;
        audiencia?: Audiencia;
        plataforma?: string;
        subtitulos?: string;
        broll?: string;
        densidad?: string;
        ctaTexto?: string;
        evitar?: string;
      };
      if (!b.tema?.trim()) {
        json(res, 400, { error: 'missing-tema' });
        return;
      }
      json(res, 200, await buildTikTokScript(b));
    },
  },
  // ── TikTok: photo mode / carrusel / álbum (agentes internos) ─────────────
  {
    method: 'POST',
    pattern: '/api/skills/tiktok/photo',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as PhotoBody;
      if (!b.tema?.trim()) {
        json(res, 400, { error: 'missing-tema' });
        return;
      }
      json(res, 200, await buildTikTokPhoto(b));
    },
  },
];

/* Equipo de agentes internos (NO frontend): viral-strategy, engagement, tema,
   hook-gen, optimización, storytelling, storyboard, on-screen title, video title,
   hashtags. Se inyectan como un solo system de razonamiento. */
const TIKTOK_AGENTS = `Sos el cerebro TikTok de FeedIA: un equipo de especialistas que trabaja junto y devuelve UN resultado terminado (el usuario hace poco, sin agencia):
- Estratega viral: ángulo + por qué puede explotar en FYP (completion/rewatch).
- Engagement: cómo dispara comentarios/shares/saves.
- Temática: define el tema/serie nativo TikTok.
- Generador de ganchos: hook 0-2s brutal (verbal + visual + on-screen).
- Optimización de video: ritmo, cortes 2-4s, duración real < guion, loop de cierre.
- Storytelling: arco emocional, tensión, payoff.
- Storyboard: qué se ve por beat (encuadre/corte/b-roll).
- Título en pantalla (on-screen text) por beat.
- Título de video (caption/primera línea).
- Hashtags: mix nicho + amplio + trend (4-8, sin spam).
- Community: pregunta de cierre + comentario fijado sugerido para sembrar interacción.
- Sonido: tipo de sonido/tendencia sugerido y por qué ayuda a la distribución.
Reglas: español, voz de marca, cifras reales o no inventar, nativo TikTok (no IG). Resultado listo para grabar y publicar.`;

interface Audiencia {
  edad?: string;
  genero?: string;
  region?: string;
  idioma?: string;
  nivel?: string;
  intereses?: string;
}
const audienciaTxt = (a?: Audiencia): string => {
  if (!a) return '';
  const sig = Object.entries({ edad: a.edad, genero: a.genero, region: a.region, idioma: a.idioma, nivel: a.nivel })
    .filter(([, v]) => v && v !== 'Todos')
    .map(([k, v]) => `${k}: ${v}`);
  if (a.intereses) sig.push(`intereses: ${a.intereses}`);
  return sig.length
    ? `\nAudiencia objetivo (adaptá lenguaje/ritmo/referencias): ${sig.join(', ')}.`
    : '\nAudiencia: general (no segmentar el lenguaje).';
};

const buildTikTokScript = async (b: {
  tema?: string;
  duracion?: number;
  formato?: string;
  modo?: string;
  tono?: string;
  gancho?: string;
  cta?: string;
  ritmo?: string;
  audiencia?: Audiencia;
  plataforma?: string;
  subtitulos?: string;
  broll?: string;
  densidad?: string;
  ctaTexto?: string;
  evitar?: string;
}) => {
  const dur = b.duracion ?? 30;
  const ctx = `${audienciaTxt(b.audiencia)}${b.tono ? `\nTono: ${b.tono}.` : ''}${b.gancho && b.gancho !== 'auto' ? `\nTipo de gancho: ${b.gancho}.` : ''}${b.cta ? `\nObjetivo del CTA: ${b.cta}.` : ''}${b.ritmo ? `\nRitmo de edición: ${b.ritmo}.` : ''}${b.plataforma && b.plataforma !== 'tiktok' ? `\nPlataforma destino: ${b.plataforma} (adaptá formato).` : ''}${b.subtitulos === 'no' ? '\nSin subtítulos.' : ''}${b.broll === 'no' ? '\nSin b-roll.' : ''}${b.densidad && b.densidad !== 'media' ? `\nDensidad de texto en pantalla: ${b.densidad}.` : ''}${b.ctaTexto ? `\nCTA exacto a usar: "${b.ctaTexto}".` : ''}${b.evitar ? `\nEvitá estas palabras/temas: ${b.evitar}.` : ''}`;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { askJson } = await import('../agent/claude.js');
      const out = await askJson<Record<string, unknown>>(
        `${TIKTOK_AGENTS}\nCreá un guion de video TikTok de ${dur}s, formato ${b.formato ?? 'talking-head'}, modo ${b.modo ?? 'educar'}, tema: "${b.tema}".${ctx}\nDevolvé JSON: {"title":"título de video/caption primera línea","hook":"hook 0-2s","beats":[{"tipo":"hook|desarrollo|payoff|cta","duracion":3,"guion":"qué se dice","noVerbal":"expresión+gesto+movimiento+mirada","onScreen":"texto en pantalla","visual":"encuadre/corte/b-roll"}],"caption":"caption corto","hashtags":"#a #b","sonido":"tipo de sonido trending sugerido","retencion":"1 tip de retención clave"}`,
        { maxTokens: 6000, temperature: 0.7, system: FEEDIA_BRAIN },
      );
      if (out?.beats) return { ok: true, ...out };
    } catch {
      /* fallback */
    }
  }
  // Fallback estructurado (sin LLM)
  const beats = [
    {
      tipo: 'hook',
      duracion: 2,
      guion: `Hook sobre ${b.tema}`,
      noVerbal: 'cejas arriba, mano que frena, mirada a lente',
      onScreen: 'gancho grande',
      visual: 'zoom/corte segundo 0',
    },
    {
      tipo: 'desarrollo',
      duracion: 8,
      guion: 'Idea 1 + micro-cliffhanger',
      noVerbal: 'gesto que enumera',
      onScreen: 'palabra clave',
      visual: 'cambio de plano',
    },
    {
      tipo: 'desarrollo',
      duracion: 8,
      guion: 'Idea 2, sube tensión',
      noVerbal: 'energía up',
      onScreen: 'dato real',
      visual: 'corte seco',
    },
    {
      tipo: 'payoff',
      duracion: 6,
      guion: 'El insight prometido',
      noVerbal: 'pausa, baja la voz',
      onScreen: 'revelación',
      visual: 'primer plano',
    },
    {
      tipo: 'cta',
      duracion: 3,
      guion: 'Comentá/seguí + loop al inicio',
      noVerbal: 'señalar comentarios',
      onScreen: 'CTA',
      visual: 'volver al frame 1',
    },
  ];
  return {
    ok: true,
    simulated: true,
    title: `${b.tema}`.slice(0, 60),
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
3. Tipógrafo / on-screen: texto corto y grande en safe-area (evita bordes y UI de TikTok), legible en mobile, jerarquía clara.
4. Color & estética: paleta coherente foto a foto, look nativo/crudo real > sobreproducido.
5. Consistencia de serie: misma identidad visual (estilo, paleta, tipografía, grano) en todas las fotos.
Reglas: foto 1 = hook que obliga a deslizar; 1 idea por foto; reservá espacio negativo para el texto; sin texto inventado; sin watermark.`;

interface PhotoBody {
  tema?: string;
  fotos?: number;
  tipo?: string;
  modelo?: string;
  modo?: string;
  estilo?: string;
  paleta?: string;
  mood?: string;
  densidad?: string;
  audiencia?: Audiencia;
}
const fotoCtx = (b: PhotoBody): string =>
  `${audienciaTxt(b.audiencia)}${b.modo ? `\nObjetivo: ${b.modo}.` : ''}${b.estilo ? `\nEstilo visual: ${b.estilo}.` : ''}${b.paleta && b.paleta !== 'marca' ? `\nPaleta: ${b.paleta}.` : ''}${b.mood ? `\nMood: ${b.mood}.` : ''}${b.densidad && b.densidad !== 'media' ? `\nDensidad de texto en pantalla: ${b.densidad}.` : ''}${b.modelo ? `\nModelo de render destino: ${b.modelo} (optimizá el prompt para sus fortalezas).` : ''}`;

const buildTikTokPhoto = async (b: PhotoBody) => {
  const n = b.fotos ?? 6;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { askJson } = await import('../agent/claude.js');
      const out = await askJson<Record<string, unknown>>(
        `${TIKTOK_AGENTS}\n${PHOTO_AGENTS}\n\nCreá un ${b.tipo ?? 'photo set'} de TikTok (Photo Mode, 9:16 vertical, ${n} fotos), tema: "${b.tema}".${fotoCtx(b)}\nDevolvé JSON: {"photos":[{"n":1,"role":"hook|revelacion|remate","text":"texto en pantalla corto","prompt":"prompt de imagen perfeccionado con todas las secciones [SUJETO]...[CALIDAD], autocontenido, 9:16, con el texto entre comillas","alt":"alt accesible breve"}],"caption":"caption corto","hashtags":"#a #b","sonido":"trending sugerido"}`,
        { maxTokens: 6500, temperature: 0.7, system: FEEDIA_BRAIN },
      );
      if (out?.photos) return { ok: true, ...out };
    } catch {
      /* fallback */
    }
  }
  const estilo = b.estilo ?? 'realista nativo TikTok';
  const paleta = b.paleta && b.paleta !== 'marca' ? b.paleta : 'alto contraste';
  const tema = `${b.tema}`.slice(0, 60);
  const photos = Array.from({ length: n }, (_, i) => {
    const txt = i === 0 ? `Hook: ${tema}`.slice(0, 48) : i === n - 1 ? 'Punch final + volvé / comentá' : `Idea ${i}`;
    return {
      n: i + 1,
      role: i === 0 ? 'hook' : i === n - 1 ? 'remate' : 'revelacion',
      text: txt,
      prompt: `[SUJETO] escena sobre "${tema}", foto ${i + 1}/${n}. [PLANO] ${i === 0 ? 'plano impactante que obliga a deslizar' : 'plano claro de una idea'}. [ENTORNO] coherente con el tema. [LUZ] natural direccional, alto contraste. [PALETA] ${paleta}. [ESTILO] ${estilo}, crudo real, no sobreproducido. [ON-SCREEN] texto grande "${txt}" en safe-area superior, legible mobile, espacio negativo reservado. [MOOD] ${b.mood ?? 'nativo TikTok'}. [CALIDAD] 1080x1920 vertical 9:16, nativo TikTok, sin watermark.`,
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
