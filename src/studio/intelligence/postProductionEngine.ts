import type { NicheCategory } from './nicheAnalyzer.js';

export type VideoEditOperationType =
  | 'silence-cut'
  | 'dynamic-subtitles'
  | 'broll-insert'
  | 'zoom-punch'
  | 'color-grade'
  | 'hook-text-overlay'
  | 'captions-burn-in'
  | 'music-ducking';

export type ColorPreset = 'viral-warm' | 'clean-bright' | 'moody-dark' | 'neon-pop' | 'natural-flat';

export type SubtitleAnimationType = 'word-by-word' | 'line-by-line' | 'karaoke';
export type SubtitleFont = 'bold-white-stroke' | 'yellow-bold' | 'minimal-white' | 'animated-pop';

export interface SubtitleStyle {
  font: SubtitleFont;
  fontSize: 'small' | 'medium' | 'large';
  position: 'bottom' | 'middle' | 'top';
  animationType: SubtitleAnimationType;
  highlightColor: string;
}

export type BRollSource =
  | { type: 'stock-footage'; query: string }
  | { type: 'zoom-in'; targetRegion: 'face' | 'product' | 'hands' | 'text' }
  | { type: 'text-insert'; text: string; backgroundColor?: string };

export interface SilenceCutOp {
  type: 'silence-cut';
  thresholdDb: number;
  minSilenceMs: number;
}
export interface DynamicSubtitlesOp {
  type: 'dynamic-subtitles';
  style: SubtitleStyle;
  keywordColors: Record<string, string>;
}
export interface BRollInsertOp {
  type: 'broll-insert';
  intervalSeconds: number;
  sources: BRollSource[];
}
export interface ZoomPunchOp {
  type: 'zoom-punch';
  timestamps: number[];
  zoomFactor: number;
}
export interface ColorGradeOp {
  type: 'color-grade';
  preset: ColorPreset;
}
export interface HookOverlayOp {
  type: 'hook-text-overlay';
  text: string;
  durationSeconds: number;
  style: 'bold-centered' | 'bottom-caption' | 'top-highlight';
}
export interface CaptionsBurnInOp {
  type: 'captions-burn-in';
  language: 'es' | 'en';
  highlightKeywords: string[];
}
export interface MusicDuckingOp {
  type: 'music-ducking';
  backgroundTrack?: string;
  duckingLevel: number;
}

export type VideoEditOperation =
  | SilenceCutOp
  | DynamicSubtitlesOp
  | BRollInsertOp
  | ZoomPunchOp
  | ColorGradeOp
  | HookOverlayOp
  | CaptionsBurnInOp
  | MusicDuckingOp;

export interface PostProductionPlan {
  inputVideoPath: string;
  platform: 'instagram' | 'tiktok';
  niche: NicheCategory;
  outputFormat: '9:16' | '1:1' | '4:5';
  operations: VideoEditOperation[];
  estimatedEditTimeMinutes: number;
  retentionImprovementScore: number;
  automationTool: 'capcut' | 'opus-clip' | 'submagic' | 'descript';
  capcutInstructions: string;
}

const NICHE_COLOR_PRESETS: Partial<Record<NicheCategory, ColorPreset>> = {
  'fitness-coaching': 'viral-warm',
  'fitness-products': 'viral-warm',
  coaching: 'clean-bright',
  'b2b-services': 'clean-bright',
  finance: 'clean-bright',
  education: 'natural-flat',
  'personal-brand': 'clean-bright',
  beauty: 'neon-pop',
  fashion: 'neon-pop',
  entertainment: 'neon-pop',
  food: 'viral-warm',
  travel: 'natural-flat',
};

const NICHE_HIGHLIGHT_KEYWORDS: Partial<Record<NicheCategory, string[]>> = {
  coaching: ['gratuito', 'error', 'secreto', 'resultados', 'gratis'],
  'fitness-coaching': ['gratis', 'transformación', 'error', 'rutina', 'resultado'],
  finance: ['dinero', 'inversión', 'error', 'ganar', 'gratis'],
  education: ['importante', 'error', 'clave', 'aprende', 'descubre'],
  ecommerce: ['descuento', 'gratis', 'nuevo', 'exclusivo', 'oferta'],
  beauty: ['secreto', 'hack', 'transformación', 'nuevo', 'viral'],
};

const buildCapCutInstructions = (inputPath: string, outputFormat: string, operations: VideoEditOperation[]): string => {
  const steps: string[] = [
    `1. Abrir CapCut Studio (capcut.com) → Nuevo proyecto`,
    `2. Importar: "${inputPath}"`,
    `3. Establecer relación de aspecto: ${outputFormat}`,
  ];

  let n = 4;
  for (const op of operations) {
    switch (op.type) {
      case 'silence-cut':
        steps.push(
          `${n}. SILENCE CUT: Herramientas → "Eliminar silencios" → Umbral ${op.thresholdDb}dB → Mínimo ${op.minSilenceMs}ms → Aplicar`,
        );
        break;
      case 'dynamic-subtitles':
        steps.push(
          `${n}. SUBTÍTULOS: Herramientas → "Auto subtítulos" → Español → "Palabras resaltadas" → Color ${op.keywordColors['default'] ?? '#FFD700'}`,
        );
        break;
      case 'broll-insert': {
        const firstSource = op.sources[0];
        const query = firstSource?.type === 'stock-footage' ? firstSource.query : 'relevant footage';
        steps.push(
          `${n}. B-ROLL: Cada ${op.intervalSeconds}s → Insertar clip stock → Buscar "${query}" → Duración 1.5-2s → Mantener audio`,
        );
        break;
      }
      case 'zoom-punch':
        steps.push(
          `${n}. ZOOM PUNCH: En [${op.timestamps.join(', ')}s] → Keyframe zoom ${op.zoomFactor}x → Duración 0.3s cada uno`,
        );
        break;
      case 'color-grade':
        steps.push(`${n}. COLOR: Ajustes → Filtros → "${op.preset}" → Intensidad 70%`);
        break;
      case 'hook-text-overlay':
        steps.push(`${n}. TEXTO HOOK: Añadir "${op.text}" → ${op.durationSeconds}s → Estilo ${op.style} → Centro`);
        break;
      case 'music-ducking':
        steps.push(`${n}. MÚSICA: Ducking ${Math.round(op.duckingLevel * 100)}% sobre pista original`);
        break;
      case 'captions-burn-in':
        steps.push(
          `${n}. CAPTIONS: Grabar subtítulos en ${op.language} → Resaltar: ${op.highlightKeywords.join(', ')}`,
        );
        break;
    }
    n++;
  }

  steps.push(
    `${n}. EXPORT: 1080x1920 (${outputFormat}) → 30fps → Calidad máxima`,
    `${n + 1}. Output: EXPORT_PATH: [ruta del archivo exportado]`,
  );

  return steps.join('\n');
};

class PostProductionEngine {
  buildPlan = (
    inputVideoPath: string,
    platform: 'instagram' | 'tiktok',
    niche: NicheCategory,
    durationSeconds: number,
    hasSpokenHook: boolean,
    hookText?: string,
  ): PostProductionPlan => {
    const colorPreset: ColorPreset = NICHE_COLOR_PRESETS[niche] ?? 'clean-bright';
    const highlightKeywords = NICHE_HIGHLIGHT_KEYWORDS[niche] ?? ['importante', 'gratis', 'error'];
    const outputFormat: '9:16' = '9:16';

    const operations: VideoEditOperation[] = [];
    let retentionLift = 0;

    operations.push({ type: 'silence-cut', thresholdDb: -35, minSilenceMs: 300 });
    retentionLift += 12;

    operations.push({
      type: 'dynamic-subtitles',
      style: {
        font: niche === 'coaching' || niche === 'education' ? 'bold-white-stroke' : 'animated-pop',
        fontSize: 'large',
        position: 'bottom',
        animationType: 'word-by-word',
        highlightColor: niche === 'beauty' || niche === 'fashion' ? '#FF69B4' : '#FFD700',
      },
      keywordColors: Object.fromEntries([...highlightKeywords, 'default'].map((k) => [k, '#FFD700'])),
    });
    retentionLift += 18;

    if (durationSeconds > 15) {
      operations.push({
        type: 'broll-insert',
        intervalSeconds: platform === 'tiktok' ? 2 : 3,
        sources: [
          { type: 'zoom-in', targetRegion: 'face' },
          { type: 'stock-footage', query: niche.replace('-', ' ') },
          { type: 'zoom-in', targetRegion: 'text' },
        ],
      });
      retentionLift += 15;
    }

    const punchTimestamps = [1, Math.round(durationSeconds / 3), Math.round((durationSeconds * 2) / 3)];
    operations.push({ type: 'zoom-punch', timestamps: punchTimestamps, zoomFactor: 1.15 });
    retentionLift += 8;

    operations.push({ type: 'color-grade', preset: colorPreset });
    retentionLift += 5;

    if (hasSpokenHook && hookText) {
      operations.push({
        type: 'hook-text-overlay',
        text: hookText.slice(0, 50),
        durationSeconds: 3,
        style: 'bold-centered',
      });
      retentionLift += 10;
    }

    operations.push({ type: 'music-ducking', duckingLevel: 0.15 });

    return {
      inputVideoPath,
      platform,
      niche,
      outputFormat,
      operations,
      estimatedEditTimeMinutes: Math.ceil(operations.length * 2.5),
      retentionImprovementScore: Math.min(100, retentionLift),
      automationTool: 'capcut',
      capcutInstructions: buildCapCutInstructions(inputVideoPath, outputFormat, operations),
    };
  };

  getSubtitleStyle = (platform: 'instagram' | 'tiktok', niche: NicheCategory): SubtitleStyle => ({
    font: platform === 'tiktok' ? 'animated-pop' : 'bold-white-stroke',
    fontSize: 'large',
    position: platform === 'tiktok' ? 'middle' : 'bottom',
    animationType: 'word-by-word',
    highlightColor: NICHE_COLOR_PRESETS[niche] === 'neon-pop' ? '#FF69B4' : '#FFD700',
  });

  estimateSilenceSavings = (durationSeconds: number): string =>
    `${Math.round(durationSeconds * 0.15)}-${Math.round(durationSeconds * 0.25)} segundos eliminados`;
}

export const postProductionEngine = new PostProductionEngine();
