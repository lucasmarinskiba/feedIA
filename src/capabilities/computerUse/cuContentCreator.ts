/**
 * CU Content Creator — orquestador local que arma briefs de creación de contenido para Computer Use.
 *
 * Genera InstructionPlan + AssetSpec + CaptionSpec + HashtagSpec
 * en estructura serializable que cualquier driver CU (Playwright, Browser MCP,
 * Anthropic Computer Use beta) puede consumir.
 *
 * Sin Anthropic call directo — usa templates + reglas determinísticas.
 * Caller puede luego enviar a runAnthropicComputerUse para ejecución real.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const CONTENT_DIR = path.resolve('data/cu/content');

export type ContentFormat = 'feed-post' | 'feed-carousel' | 'reel' | 'story' | 'story-series' | 'live';
export type ContentGoal = 'awareness' | 'engagement' | 'conversion' | 'community' | 'sales';
export type AssetSource = 'canva' | 'fal-ai' | 'native-png' | 'user-upload' | 'reused';

export interface AssetSpec {
  id: string;
  source: AssetSource;
  dimensions: { width: number; height: number };
  format: 'png' | 'jpg' | 'mp4' | 'mov';
  promptOrTemplate?: string;
  expectedLocalPath?: string;
  alt?: string;
}

export interface CaptionSpec {
  hook: string; // ≤10 palabras, scroll-stop
  body: string; // valor + storytelling
  cta: string; // acción concreta
  charCount: number;
  emojiCount: number;
  lineBreaks: number;
  toneNotes: string[];
}

export interface HashtagSpec {
  flat: string[]; // hasta 30
  pyramid: {
    mega: string[]; // >1M posts (1-2)
    macro: string[]; // 100K-1M (3-5)
    micro: string[]; // 10K-100K (5-10)
    nano: string[]; // <10K (5-10)
    brand: string[]; // hashtags marca propios
  };
  shadowbanRisk: 'low' | 'mid' | 'high';
  rotationStrategy: 'fixed' | 'rotating-3x' | 'rotating-5x';
}

export interface InstructionStep {
  step: number;
  app: 'instagram' | 'tiktok' | 'canva' | 'capcut' | 'browser';
  action: string;
  targetSelector?: string;
  inputText?: string;
  expectedResult: string;
  retryStrategy: 'none' | 'screenshot-and-retry' | 'reload-and-retry';
  timeoutMs: number;
}

export interface ContentBrief {
  id: string;
  brandId: string;
  format: ContentFormat;
  goal: ContentGoal;
  topic: string;
  asset: AssetSpec[];
  caption: CaptionSpec;
  hashtags: HashtagSpec;
  cuInstructions: InstructionStep[];
  estimatedCuDurationMs: number;
  estimatedSuccessProbability: number;
  createdAt: string;
  status: 'draft' | 'ready' | 'publishing' | 'published' | 'failed';
}

const briefPath = (brandId: string, id: string): string => path.join(CONTENT_DIR, `${brandId}-${id}.json`);

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(CONTENT_DIR, { recursive: true });
};

const PROMPT_TEMPLATES: Record<ContentFormat, (topic: string) => string> = {
  'feed-post': (t) =>
    `Imagen 1080x1350 (4:5) estilo limpio, texto grande sobre fondo plano: "${t}". Paleta marca. Foco visual en headline.`,
  'feed-carousel': (t) =>
    `Carrusel 10 slides 1080x1350 educativos sobre "${t}". Slide 1 hook, slides 2-9 desarrollo (1 idea cada), slide 10 CTA.`,
  reel: (t) =>
    `Video vertical 9:16 (1080x1920) 15-30s sobre "${t}". Hook visual en sec 1, retención hasta sec 7, payoff final.`,
  story: (t) => `Frame 1080x1920 sobre "${t}". Texto grande arriba, sticker interactivo abajo (poll/quiz/pregunta).`,
  'story-series': (t) =>
    `Serie 4-6 frames 1080x1920 sobre "${t}". Frame 1 hook, frames 2-N desarrollo con stickers, frame final CTA con link sticker.`,
  live: (t) => `Cover IG Live 1080x1920 anunciando charla sobre "${t}". Fecha + hora visibles. Sticker recordatorio.`,
};

const composeHook = (topic: string, goal: ContentGoal): string => {
  const hooks: Record<ContentGoal, string[]> = {
    awareness: [
      `¿Sabés qué pasa con ${topic}?`,
      `Lo que nadie te dice sobre ${topic}`,
      `${topic} explicado en 10 segundos`,
    ],
    engagement: [
      `Esto te va a pasar con ${topic}`,
      `Decime si te pasó esto con ${topic}`,
      `Coment[á si entendés ${topic}`,
    ],
    conversion: [`Cómo ganar con ${topic}`, `Esto cambió todo en ${topic}`, `${topic} sin perder dinero`],
    community: [`Hablemos de ${topic}`, `¿Vos cómo vivís ${topic}?`, `Nuestro lado de ${topic}`],
    sales: [`Por qué ${topic} es la inversión correcta`, `${topic} ya disponible`, `Última oportunidad: ${topic}`],
  };
  const pool = hooks[goal];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
};

const composeBody = (topic: string, goal: ContentGoal): string => {
  const templates: Record<ContentGoal, string> = {
    awareness: `Te cuento por qué ${topic} importa más de lo que pensás. Mirá esto:`,
    engagement: `Hace 3 años no entendía ${topic}. Hoy lo veo distinto. Acá va lo que aprendí. ¿Vos qué pensás?`,
    conversion: `Implementamos ${topic} con clientes reales. Resultado: +40% en menos de 60 días. Estos son los pasos.`,
    community: `${topic} es algo que nos une. Cada experiencia es distinta. Te dejo la mía y quiero leer la tuya en comentarios.`,
    sales: `Después de meses de pruebas, soltamos ${topic}. Diseñado para resolver un problema real. Mirá el detalle.`,
  };
  return templates[goal];
};

const composeCTA = (goal: ContentGoal): string => {
  const ctas: Record<ContentGoal, string[]> = {
    awareness: ['Guardá este post para revisarlo después.', 'Comparte con alguien que necesite verlo.'],
    engagement: ['Contame tu experiencia en comentarios.', 'Etiquetá a alguien que piense distinto.'],
    conversion: ['Link en bio para empezar.', 'DM con la palabra "info" y te paso detalles.'],
    community: ['Sumate a la conversación abajo.', 'Compartí tu historia, leemos todo.'],
    sales: ['Toca el link en bio.', 'DM "quiero" y reservás cupo.'],
  };
  const pool = ctas[goal];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
};

const computeHashtagPyramid = (topic: string, format: ContentFormat, brandTags: string[] = []): HashtagSpec => {
  const sanitized = topic
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '');
  const formatTag = format === 'reel' ? 'reels' : format === 'story' || format === 'story-series' ? 'stories' : 'feed';
  const mega = ['instagram', formatTag];
  const macro = [`${formatTag}ideas`, 'contentcreator', `${sanitized}tips`];
  const micro = [
    `${sanitized}community`,
    `${sanitized}lover`,
    `${sanitized}daily`,
    `${sanitized}life`,
    `${sanitized}talk`,
  ];
  const nano = [`${sanitized}argentina`, `${sanitized}latam`, `${sanitized}español`, `${sanitized}emprendedor`];
  const flat = [
    ...mega.map((h) => `#${h}`),
    ...macro.map((h) => `#${h}`),
    ...micro.map((h) => `#${h}`),
    ...nano.map((h) => `#${h}`),
    ...brandTags.map((h) => (h.startsWith('#') ? h : `#${h}`)),
  ].slice(0, 30);
  return {
    flat,
    pyramid: { mega, macro, micro, nano, brand: brandTags },
    shadowbanRisk: 'low',
    rotationStrategy: 'rotating-3x',
  };
};

const composeCaption = (topic: string, goal: ContentGoal): CaptionSpec => {
  const hook = composeHook(topic, goal);
  const body = composeBody(topic, goal);
  const cta = composeCTA(goal);
  const full = `${hook}\n\n${body}\n\n${cta}`;
  return {
    hook,
    body,
    cta,
    charCount: full.length,
    emojiCount: (full.match(/\p{Emoji}/gu) ?? []).length,
    lineBreaks: (full.match(/\n/g) ?? []).length,
    toneNotes: ['humano', 'directo', 'sin hype', 'cierre claro'],
  };
};

const buildAssetSpecs = (format: ContentFormat, topic: string, source: AssetSource): AssetSpec[] => {
  const dims =
    format === 'reel' || format === 'story' || format === 'story-series'
      ? { width: 1080, height: 1920 }
      : { width: 1080, height: 1350 };
  const fmtFile: AssetSpec['format'] = format === 'reel' ? 'mp4' : 'png';
  const count = format === 'feed-carousel' ? 10 : format === 'story-series' ? 5 : 1;
  return Array.from({ length: count }, (_, i) => ({
    id: `asset-${Date.now()}-${i}`,
    source,
    dimensions: dims,
    format: fmtFile,
    promptOrTemplate: PROMPT_TEMPLATES[format](topic),
    alt: `Asset ${i + 1} para ${topic}`,
  }));
};

const buildCuInstructions = (
  format: ContentFormat,
  asset: AssetSpec[],
  caption: CaptionSpec,
  hashtags: HashtagSpec,
): InstructionStep[] => {
  const steps: InstructionStep[] = [];
  let step = 0;

  steps.push({
    step: ++step,
    app: 'browser',
    action: 'navigate',
    inputText: 'https://www.instagram.com',
    expectedResult: 'Feed cargado',
    retryStrategy: 'reload-and-retry',
    timeoutMs: 15000,
  });

  steps.push({
    step: ++step,
    app: 'instagram',
    action: 'click',
    targetSelector: 'aria-label="Nueva publicación"',
    expectedResult: 'Modal de creación abierto',
    retryStrategy: 'screenshot-and-retry',
    timeoutMs: 5000,
  });

  for (let i = 0; i < asset.length; i++) {
    steps.push({
      step: ++step,
      app: 'instagram',
      action: 'upload-file',
      inputText: asset[i]!.expectedLocalPath ?? `pending-asset-${i}.${asset[i]!.format}`,
      expectedResult: `Asset ${i + 1}/${asset.length} cargado`,
      retryStrategy: 'screenshot-and-retry',
      timeoutMs: 10000,
    });
  }

  if (format !== 'reel') {
    steps.push({
      step: ++step,
      app: 'instagram',
      action: 'crop-1080x1350',
      expectedResult: 'Crop aplicado',
      retryStrategy: 'none',
      timeoutMs: 3000,
    });
  }

  steps.push({
    step: ++step,
    app: 'instagram',
    action: 'click-next',
    expectedResult: 'Paso de edición',
    retryStrategy: 'none',
    timeoutMs: 3000,
  });

  if (format === 'reel') {
    steps.push({
      step: ++step,
      app: 'instagram',
      action: 'add-trending-audio',
      expectedResult: 'Audio agregado',
      retryStrategy: 'screenshot-and-retry',
      timeoutMs: 8000,
    });
  }

  steps.push({
    step: ++step,
    app: 'instagram',
    action: 'click-next',
    expectedResult: 'Paso de caption',
    retryStrategy: 'none',
    timeoutMs: 3000,
  });

  const fullCaption = `${caption.hook}\n\n${caption.body}\n\n${caption.cta}\n\n${hashtags.flat.join(' ')}`;
  steps.push({
    step: ++step,
    app: 'instagram',
    action: 'type-caption',
    inputText: fullCaption,
    expectedResult: 'Caption escrito',
    retryStrategy: 'screenshot-and-retry',
    timeoutMs: 5000,
  });

  steps.push({
    step: ++step,
    app: 'instagram',
    action: 'click-publish',
    expectedResult: 'Post publicado',
    retryStrategy: 'screenshot-and-retry',
    timeoutMs: 10000,
  });

  steps.push({
    step: ++step,
    app: 'instagram',
    action: 'verify-published',
    expectedResult: 'Post visible en perfil',
    retryStrategy: 'screenshot-and-retry',
    timeoutMs: 8000,
  });

  return steps;
};

export const buildContentBrief = async (params: {
  brandId: string;
  format: ContentFormat;
  goal: ContentGoal;
  topic: string;
  assetSource?: AssetSource;
  brandHashtags?: string[];
}): Promise<ContentBrief> => {
  const asset = buildAssetSpecs(params.format, params.topic, params.assetSource ?? 'native-png');
  const caption = composeCaption(params.topic, params.goal);
  const hashtags = computeHashtagPyramid(params.topic, params.format, params.brandHashtags);
  const cuInstructions = buildCuInstructions(params.format, asset, caption, hashtags);

  const totalTimeout = cuInstructions.reduce((s, i) => s + i.timeoutMs, 0);
  const probability = Math.max(0.4, Math.min(0.95, 1 - cuInstructions.length * 0.02));

  const brief: ContentBrief = {
    id: `brief-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId: params.brandId,
    format: params.format,
    goal: params.goal,
    topic: params.topic,
    asset,
    caption,
    hashtags,
    cuInstructions,
    estimatedCuDurationMs: totalTimeout,
    estimatedSuccessProbability: probability,
    createdAt: new Date().toISOString(),
    status: 'ready',
  };

  await ensureDir();
  await fs.writeFile(briefPath(params.brandId, brief.id), JSON.stringify(brief, null, 2), 'utf-8');
  log.info('[cuContentCreator] brief built', {
    brandId: params.brandId,
    format: params.format,
    steps: cuInstructions.length,
  });
  return brief;
};

export const getBrief = async (brandId: string, id: string): Promise<ContentBrief | null> => {
  try {
    return JSON.parse(await fs.readFile(briefPath(brandId, id), 'utf-8')) as ContentBrief;
  } catch {
    return null;
  }
};

export const listBriefs = async (brandId: string, status?: ContentBrief['status']): Promise<ContentBrief[]> => {
  try {
    await ensureDir();
    const files = await fs.readdir(CONTENT_DIR);
    const briefs: ContentBrief[] = [];
    for (const f of files) {
      if (!f.startsWith(`${brandId}-brief-`)) continue;
      try {
        const b = JSON.parse(await fs.readFile(path.join(CONTENT_DIR, f), 'utf-8')) as ContentBrief;
        if (!status || b.status === status) briefs.push(b);
      } catch {
        /* skip */
      }
    }
    return briefs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
};

export const updateBriefStatus = async (brandId: string, id: string, status: ContentBrief['status']): Promise<void> => {
  const brief = await getBrief(brandId, id);
  if (!brief) return;
  brief.status = status;
  await fs.writeFile(briefPath(brandId, id), JSON.stringify(brief, null, 2), 'utf-8');
};

export const composeInstructionForCU = (brief: ContentBrief): string => {
  const lines: string[] = [];
  lines.push(`TASK: Publicar ${brief.format} sobre "${brief.topic}" en Instagram.`);
  lines.push(`GOAL: ${brief.goal}`);
  lines.push(
    `ASSETS: ${brief.asset.length} archivo(s) de ${brief.asset[0]?.dimensions.width}x${brief.asset[0]?.dimensions.height}`,
  );
  lines.push('');
  lines.push('CAPTION COMPLETA (copiar exacto):');
  lines.push(
    `${brief.caption.hook}\n\n${brief.caption.body}\n\n${brief.caption.cta}\n\n${brief.hashtags.flat.join(' ')}`,
  );
  lines.push('');
  lines.push('PASOS:');
  for (const s of brief.cuInstructions) {
    lines.push(
      `${s.step}. [${s.app}] ${s.action}${s.inputText ? ` — texto: "${s.inputText.slice(0, 80)}"` : ''}${s.targetSelector ? ` — selector: ${s.targetSelector}` : ''} → ${s.expectedResult}`,
    );
  }
  return lines.join('\n');
};
