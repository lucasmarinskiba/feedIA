import type { BrandProfile } from '../../config/types.js';
import { generateStyleGuidePrompt } from './brandStyleGuide.js';
import { scoreAesthetic, type DesignProposal } from './aestheticScorer.js';
import type { StudioEngine } from '../../studio/engines/base.js';

export interface VisualDirection {
  engine: string;
  templateFormat: string;
  aspectRatio: string;
  styleNotes: string[];
  assetPrompts: string[];
  colorOverrides: Record<string, string>;
  typographyOverrides: Record<string, string>;
  estimatedScore: number;
}

export interface DirectionRequest {
  format: 'reel' | 'carrusel' | 'post-imagen' | 'historia' | 'reel-faceless';
  idea: string;
  objective?: string;
  preferredEngine?: string;
  existingAssets?: string[];
}

const ENGINE_PREFERENCES: Record<string, string[]> = {
  reel: ['canva', 'capcut'],
  carrusel: ['canva', 'figma'],
  'post-imagen': ['canva', 'imagegen', 'adobe_express'],
  historia: ['canva', 'inshot'],
  'reel-faceless': ['canva', 'capcut', 'imagegen'],
};

const ASPECT_RATIOS: Record<string, string> = {
  reel: '9:16',
  carrusel: '4:5',
  'post-imagen': '4:5',
  historia: '9:16',
  'reel-faceless': '9:16',
};

export const decideVisualDirection = (
  brand: BrandProfile,
  req: DirectionRequest,
  availableEngines: StudioEngine[],
): VisualDirection => {
  const engines = availableEngines.map((e) => e.name);
  const preferences = ENGINE_PREFERENCES[req.format] ?? ['canva'];
  const chosenEngine =
    req.preferredEngine && engines.includes(req.preferredEngine)
      ? req.preferredEngine
      : (preferences.find((p) => engines.includes(p)) ?? 'canva');

  const _styleGuide = generateStyleGuidePrompt(brand);
  void _styleGuide;
  const notes: string[] = [
    `Engine seleccionado: ${chosenEngine}`,
    `Formato: ${req.format}`,
    `Ratio: ${ASPECT_RATIOS[req.format] ?? '1:1'}`,
  ];

  // Generate asset prompts based on idea + brand style
  const assetPrompts: string[] = [
    `Fondo ${brand.visual.style}, paleta ${brand.visual.palette.slice(0, 3).join('/')}, mood ${brand.visual.mood ?? 'profesional'} para: ${req.idea}`,
  ];

  if (req.format === 'reel' || req.format === 'reel-faceless') {
    assetPrompts.push(
      `B-roll cinematográfico, estilo ${brand.visual.photographyStyle ?? 'natural'}, iluminación suave, sin texto`,
    );
  }

  if (req.format === 'post-imagen' || req.format === 'carrusel') {
    assetPrompts.push(
      `Textura o patrón sutil en tonos ${brand.visual.palette[0] ?? '#0A0A0A'} y ${brand.visual.palette[1] ?? '#F5F5F5'}`,
    );
  }

  // Estimate aesthetic score
  const dummyProposal: DesignProposal = {
    title: req.idea,
    format: req.format,
    colorsUsed: brand.visual.palette.slice(0, 3),
    fontsUsed: brand.visual.typography,
    textBlocks: req.format === 'carrusel' ? 7 : 3,
    imageBlocks: req.format === 'post-imagen' ? 1 : 2,
    densityEstimate: brand.visual.density ?? 'medium',
    description: `${brand.visual.style}, ${brand.visual.mood ?? 'profesional'}`,
  };
  const score = scoreAesthetic(brand, dummyProposal);

  notes.push(`Score estético estimado: ${score.total}/100`);
  if (score.issues.length > 0) {
    notes.push(`Issues detectados: ${score.issues.slice(0, 2).join('; ')}`);
  }

  const colorOverrides: Record<string, string> = {};
  brand.visual.palette.forEach((c, i) => {
    colorOverrides[`brand_color_${i + 1}`] = c;
  });

  const typographyOverrides: Record<string, string> = {};
  brand.visual.typography.forEach((t, i) => {
    typographyOverrides[`brand_font_${i + 1}`] = t;
  });

  return {
    engine: chosenEngine,
    templateFormat: req.format,
    aspectRatio: ASPECT_RATIOS[req.format] ?? '1:1',
    styleNotes: notes,
    assetPrompts,
    colorOverrides,
    typographyOverrides,
    estimatedScore: score.total,
  };
};

export const generateVisualBrief = (brand: BrandProfile, direction: VisualDirection): string =>
  `BRIEF VISUAL — ${brand.name}

ENGINE: ${direction.engine}
FORMATO: ${direction.templateFormat}
RATIO: ${direction.aspectRatio}

NOTAS DE ESTILO:
${direction.styleNotes.map((n) => `- ${n}`).join('\n')}

PROMPTS DE ASSETS:
${direction.assetPrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

PALETA APLICAR:
${Object.entries(direction.colorOverrides)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

TIPOGRAFÍA APLICAR:
${Object.entries(direction.typographyOverrides)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

Score estético estimado: ${direction.estimatedScore}/100
`.trim();
