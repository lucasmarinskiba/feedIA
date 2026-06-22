/**
 * Design Tools Generic de FeedIA — extensión del studio a otras herramientas.
 *
 * Permite usar Figma, Photopea, Adobe Express, Crello, etc. con el mismo patrón
 * que Canva: abrir → navegar → customizar → exportar. Cada herramienta tiene
 * particularidades pero el flujo conceptual es el mismo.
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { log } from '../../agent/logger.js';
import { runComputerUseSession, type ComputerUseResult } from './controller.js';
import { openBrowserWithUrl } from './appLauncher.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type DesignTool = 'figma' | 'photopea' | 'adobe-express' | 'crello' | 'visme' | 'kapwing' | 'photoshop-web';

export interface DesignToolInfo {
  id: DesignTool;
  name: string;
  url: string;
  loginRequired: boolean;
  freeExports: boolean;
  bestFor: string[];
  exportFormats: string[];
  knownLimitations: string[];
}

export const DESIGN_TOOLS_REGISTRY: Record<DesignTool, DesignToolInfo> = {
  figma: {
    id: 'figma',
    name: 'Figma',
    url: 'https://www.figma.com/',
    loginRequired: true,
    freeExports: true,
    bestFor: ['mockups', 'wireframes', 'visual design', 'componentes reutilizables'],
    exportFormats: ['png', 'jpg', 'svg', 'pdf'],
    knownLimitations: ['No tiene templates de stock de Instagram tan visibles como Canva'],
  },
  photopea: {
    id: 'photopea',
    name: 'Photopea',
    url: 'https://www.photopea.com/',
    loginRequired: false,
    freeExports: true,
    bestFor: ['edición fotográfica avanzada', 'manipulación de imágenes', 'remplazo de PSD'],
    exportFormats: ['png', 'jpg', 'webp', 'gif', 'psd'],
    knownLimitations: ['Interfaz similar a Photoshop (curva de aprendizaje)'],
  },
  'adobe-express': {
    id: 'adobe-express',
    name: 'Adobe Express',
    url: 'https://www.adobe.com/express/',
    loginRequired: true,
    freeExports: true,
    bestFor: ['plantillas profesionales', 'animaciones simples', 'integración con Creative Cloud'],
    exportFormats: ['png', 'jpg', 'pdf', 'mp4'],
    knownLimitations: ['Requiere Adobe ID'],
  },
  crello: {
    id: 'crello',
    name: 'Crello / VistaCreate',
    url: 'https://create.vista.com/',
    loginRequired: true,
    freeExports: true,
    bestFor: ['animated posts', 'plantillas modernas'],
    exportFormats: ['png', 'jpg', 'mp4', 'gif'],
    knownLimitations: ['Algunos templates son premium'],
  },
  visme: {
    id: 'visme',
    name: 'Visme',
    url: 'https://www.visme.co/',
    loginRequired: true,
    freeExports: true,
    bestFor: ['infografías', 'presentaciones'],
    exportFormats: ['png', 'jpg', 'pdf', 'html'],
    knownLimitations: ['Marca de agua en plan free para algunos exports'],
  },
  kapwing: {
    id: 'kapwing',
    name: 'Kapwing',
    url: 'https://www.kapwing.com/',
    loginRequired: false,
    freeExports: true,
    bestFor: ['edición de video', 'reels', 'subtítulos automáticos'],
    exportFormats: ['mp4', 'gif', 'png'],
    knownLimitations: ['Marca de agua en plan free, max 4 min'],
  },
  'photoshop-web': {
    id: 'photoshop-web',
    name: 'Photoshop Web',
    url: 'https://www.adobe.com/products/photoshop/online.html',
    loginRequired: true,
    freeExports: false,
    bestFor: ['edición profesional fotográfica'],
    exportFormats: ['png', 'jpg', 'psd'],
    knownLimitations: ['Suscripción Adobe requerida'],
  },
};

// ── Workflow genérico ─────────────────────────────────────────────────────────

export interface DesignToolWorkflowInput {
  tool: DesignTool;
  task: string; // descripción libre de qué hacer
  exportFormat?: 'png' | 'jpg' | 'pdf' | 'mp4' | 'gif' | 'svg' | 'webp';
  customInstructions?: string;
  maxIterations?: number;
  downloadFolder?: string;
}

export interface DesignToolResult {
  ok: boolean;
  tool: DesignTool;
  computerUseResult: ComputerUseResult;
  exportedFilePath?: string;
  durationMs: number;
  error?: string;
}

export const runDesignToolWorkflow = async (
  brand: BrandProfile,
  input: DesignToolWorkflowInput,
): Promise<DesignToolResult> => {
  const start = Date.now();
  const toolInfo = DESIGN_TOOLS_REGISTRY[input.tool];

  if (env.dryRun) {
    log.warn(`[DesignToolsGeneric] DRY RUN: simulando workflow ${input.tool}`);
    return {
      ok: true,
      tool: input.tool,
      computerUseResult: { ok: true, summary: `[DRY RUN] ${toolInfo.name} workflow`, actionsExecuted: 0 },
      exportedFilePath: join(homedir(), 'Downloads', `mock-${input.tool}-export.${input.exportFormat ?? 'png'}`),
      durationMs: Date.now() - start,
    };
  }

  log.info(`[DesignToolsGeneric] Iniciando ${toolInfo.name}: "${input.task.slice(0, 60)}..."`);

  // Abrir tool
  const launch = await openBrowserWithUrl(toolInfo.url);
  if (!launch.ok) {
    return {
      ok: false,
      tool: input.tool,
      computerUseResult: { ok: false, summary: `No se pudo abrir ${toolInfo.name}`, actionsExecuted: 0 },
      durationMs: Date.now() - start,
      error: launch.error,
    };
  }

  const downloadFolder = input.downloadFolder ?? join(homedir(), 'Downloads');
  const exportFormat = input.exportFormat ?? 'png';

  // Construir goal contextualizado
  const goal = `Trabajar en ${toolInfo.name} (${toolInfo.url}) para esta marca.

TAREA: ${input.task}

CONTEXTO DE LA HERRAMIENTA:
- Nombre: ${toolInfo.name}
- Login requerido: ${toolInfo.loginRequired ? 'SÍ — asumir que ya estamos logueados o esperar 30s si pide login' : 'NO'}
- Mejor para: ${toolInfo.bestFor.join(', ')}
- Formatos de export: ${toolInfo.exportFormats.join(', ')}
- Limitaciones conocidas: ${toolInfo.knownLimitations.join(' | ')}

MARCA:
- Nombre: ${brand.name}
- Nicho: ${brand.niche}
- Paleta visual: ${brand.visual.palette.join(', ') || '(neutra)'}
- Tipografía: ${brand.visual.typography?.join(', ') ?? '(default)'}
- Mood: ${brand.visual.mood ?? 'profesional'}

FORMATO DE EXPORT REQUERIDO: ${exportFormat}
CARPETA DE DESCARGAS: ${downloadFolder}

${input.customInstructions ? `INSTRUCCIONES ADICIONALES:\n${input.customInstructions}` : ''}

REGLAS DE OPERACIÓN:
- Esperar 2-3s entre acciones para que la UI responda
- Si aparece tutorial / onboarding, cerrarlo (ESC o X)
- Si pide login y no se completa en 30s, abortar
- Para exportar: buscar botón Download / Export / Compartir (suele estar arriba a la derecha)
- Después de la descarga, esperar 5s para asegurar que el archivo está completo
- El archivo final debe quedar en ${downloadFolder}`;

  const cuResult = await runComputerUseSession(brand, {
    goal,
    context: `Workflow en ${toolInfo.name}`,
    maxIterations: input.maxIterations ?? 50,
  });

  // Detectar archivo descargado
  let exportedFilePath: string | undefined;
  try {
    const { detectRecentDownload } = await import('./fileBridge.js');
    exportedFilePath = await detectRecentDownload({
      folder: downloadFolder,
      extension: exportFormat,
      maxAgeSeconds: 300,
    });
  } catch (err) {
    log.warn(`[DesignToolsGeneric] No se pudo detectar download: ${(err as Error).message}`);
  }

  return {
    ok: cuResult.ok && Boolean(exportedFilePath),
    tool: input.tool,
    computerUseResult: cuResult,
    exportedFilePath,
    durationMs: Date.now() - start,
    error: cuResult.error,
  };
};

// ── Helpers de alto nivel ─────────────────────────────────────────────────────

export const createWithFigma = async (brand: BrandProfile, task: string): Promise<DesignToolResult> =>
  runDesignToolWorkflow(brand, { tool: 'figma', task, exportFormat: 'png' });

export const editWithPhotopea = async (brand: BrandProfile, task: string): Promise<DesignToolResult> =>
  runDesignToolWorkflow(brand, { tool: 'photopea', task, exportFormat: 'png' });

export const createReelWithKapwing = async (brand: BrandProfile, task: string): Promise<DesignToolResult> =>
  runDesignToolWorkflow(brand, { tool: 'kapwing', task, exportFormat: 'mp4' });

export const createInfographicWithVisme = async (brand: BrandProfile, task: string): Promise<DesignToolResult> =>
  runDesignToolWorkflow(brand, { tool: 'visme', task, exportFormat: 'png' });

// ── Decisión automática: qué tool usar para qué tarea ────────────────────────

export const recommendToolForTask = (task: string, options: { hasAdobeSubscription?: boolean } = {}): DesignTool => {
  const lower = task.toLowerCase();
  if (/video|reel|tiktok|short/i.test(lower)) return 'kapwing';
  if (/infografía|infographic/i.test(lower)) return 'visme';
  if (/foto|edición fotográfica|retoque|psd|photoshop/i.test(lower))
    return options.hasAdobeSubscription ? 'photoshop-web' : 'photopea';
  if (/mockup|wireframe|prototipo|ui/i.test(lower)) return 'figma';
  if (/animación|animated/i.test(lower)) return 'crello';
  return 'figma';
};

// ── Listado ───────────────────────────────────────────────────────────────────

export const listDesignTools = (): DesignToolInfo[] => Object.values(DESIGN_TOOLS_REGISTRY);
