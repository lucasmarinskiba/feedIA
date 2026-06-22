// @ts-nocheck
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { designController } from '../../studio/controllers/designController.js';
import type { DesignCommand } from '../../studio/controllers/designController.js';
import { executeWithRecovery } from '../../studio/computerUse/reliableSession.js';
import { contentAlgorithmAgent } from '../../studio/intelligence/contentAlgorithmAgent.js';
import { audiencePsychologyAgent } from '../../studio/intelligence/audiencePsychologyAgent.js';
import { nicheClassifier } from '../../studio/intelligence/nicheClassifier.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory } from '../../studio/intelligence/nicheAnalyzer.js';
import { DEFAULT_AUDIENCE } from './intelligenceHelpers.js';

interface ToolSpec extends Tool {
  description: string;
}

const tools: Record<string, ToolSpec> = {};

// ── Existing session tools ────────────────────────────────────────────────────

tools.design_create_session = {
  name: 'design_create_session',
  description: 'Create a new design session with specified tool (Figma, Canva, Adobe Express, Photoshop)',
  input_schema: {
    type: 'object' as const,
    properties: {
      tool: {
        type: 'string',
        enum: ['figma', 'canva', 'adobe-express', 'photoshop'],
        description: 'Design tool to use',
      },
      project_name: { type: 'string', description: 'Name for the design project' },
      dimensions: {
        type: 'object',
        properties: {
          width: { type: 'number', description: 'Width in pixels' },
          height: { type: 'number', description: 'Height in pixels' },
        },
        description: 'Canvas dimensions for the design',
      },
      brand_colors: {
        type: 'array',
        items: { type: 'string' },
        description: 'Brand color hex codes to use',
      },
    },
    required: ['tool'],
  },
};

tools.design_execute_command = {
  name: 'design_execute_command',
  description: 'Execute a specific design command in an active session (create, edit, export, validate)',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active design session ID' },
      action: {
        type: 'string',
        enum: ['create', 'edit', 'export', 'share', 'validate'],
        description: 'Design action to perform',
      },
      params: {
        type: 'object',
        description: 'Action-specific parameters (text, colors, images, effects, etc.)',
        additionalProperties: true,
      },
    },
    required: ['session_id', 'action', 'params'],
  },
};

tools.design_add_assets = {
  name: 'design_add_assets',
  description: 'Add images, icons, or other assets to active design session',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active design session ID' },
      assets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['image', 'icon', 'photo', 'video'] },
            source: { type: 'string', description: 'URL or file path' },
            position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
            scale: { type: 'number' },
          },
        },
        description: 'Assets to add to design',
      },
    },
    required: ['session_id', 'assets'],
  },
};

tools.design_apply_template = {
  name: 'design_apply_template',
  description: 'Apply a template or layout to current design session',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active design session ID' },
      template_type: {
        type: 'string',
        enum: ['carousel-ig', 'reel-cover', 'story', 'tiktok-vertical', 'post-feed', 'thumbnail'],
        description: 'Predefined template type',
      },
      customize: {
        type: 'object',
        description: 'Custom values to override template defaults',
        additionalProperties: true,
      },
    },
    required: ['session_id', 'template_type'],
  },
};

tools.design_export = {
  name: 'design_export',
  description: 'Export final design in specified format(s) and return URLs/paths',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active design session ID' },
      format: {
        type: 'array',
        items: { type: 'string', enum: ['png', 'jpg', 'pdf', 'svg', 'webp'] },
        description: 'Export format(s)',
      },
      quality: {
        type: 'string',
        enum: ['draft', 'standard', 'high', 'max'],
        description: 'Export quality level',
      },
    },
    required: ['session_id', 'format'],
  },
};

tools.design_close_session = {
  name: 'design_close_session',
  description: 'Close active design session and cleanup resources',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Design session ID to close' },
      save_before_close: { type: 'boolean', description: 'Save design before closing' },
    },
    required: ['session_id'],
  },
};

// ── AI Intelligence Tools ─────────────────────────────────────────────────────

tools.design_brand_validate = {
  name: 'design_brand_validate',
  description:
    'Score content against brand guidelines — checks forbidden words, palette compliance, tone alignment. Returns 0-100 score + violations list',
  input_schema: {
    type: 'object' as const,
    properties: {
      caption: { type: 'string', description: 'Caption or text content to validate' },
      visual_theme: { type: 'string', description: 'Visual description or theme to validate' },
      colors_used: {
        type: 'array',
        items: { type: 'string' },
        description: 'Hex colors used in design',
      },
      platform: {
        type: 'string',
        enum: ['instagram', 'tiktok'],
        description: 'Target platform',
      },
    },
    required: ['caption'],
  },
};

tools.design_generate_ai = {
  name: 'design_generate_ai',
  description:
    'AI-directed design generation with niche context, psychology hooks, and brand alignment. Uses Computer Use to create in Canva/Figma',
  input_schema: {
    type: 'object' as const,
    properties: {
      topic: { type: 'string', description: 'Content topic or subject' },
      format: {
        type: 'string',
        enum: ['feed-post', 'reel-cover', 'story', 'carousel-slide', 'highlight-cover', 'tiktok-cover'],
        description: 'Target format',
      },
      niche: { type: 'string', description: 'Content niche (e.g. fitness-coaching, ecommerce)' },
      goal: {
        type: 'string',
        enum: ['awareness', 'engagement', 'conversion', 'community'],
        description: 'Content goal drives visual strategy',
      },
      platform: {
        type: 'string',
        enum: ['instagram', 'tiktok'],
        description: 'Target platform',
      },
      design_tool: {
        type: 'string',
        enum: ['canva', 'figma'],
        description: 'Design tool to use (default: canva)',
      },
    },
    required: ['topic', 'format', 'niche'],
  },
};

tools.design_batch_variants = {
  name: 'design_batch_variants',
  description:
    'Create N visual A/B variants of a base design — different color combinations, layouts, compositions. Returns variant set for testing',
  input_schema: {
    type: 'object' as const,
    properties: {
      base_topic: { type: 'string', description: 'Base content topic' },
      format: {
        type: 'string',
        enum: ['feed-post', 'reel-cover', 'story', 'carousel-slide'],
        description: 'Design format',
      },
      niche: { type: 'string', description: 'Content niche' },
      variant_count: {
        type: 'number',
        description: 'Number of variants to create (2-5)',
      },
      vary_by: {
        type: 'array',
        items: { type: 'string', enum: ['color', 'layout', 'typography', 'composition', 'mood'] },
        description: 'What dimensions to vary across variants',
      },
    },
    required: ['base_topic', 'format', 'niche'],
  },
};

tools.design_niche_preset = {
  name: 'design_niche_preset',
  description:
    "Get niche-specific design system: recommended colors, fonts, composition rules, visual mood, do/don't list for Instagram/TikTok",
  input_schema: {
    type: 'object' as const,
    properties: {
      niche: {
        type: 'string',
        description: 'Content niche (fitness-coaching, ecommerce, finance, etc.)',
      },
      platform: {
        type: 'string',
        enum: ['instagram', 'tiktok', 'both'],
        description: 'Target platform',
      },
      account_stage: {
        type: 'string',
        enum: ['starter', 'growing', 'established', 'dominant'],
        description: 'Account growth stage affects visual strategy',
      },
    },
    required: ['niche'],
  },
};

tools.design_algorithm_score = {
  name: 'design_algorithm_score',
  description:
    'Score design content before publishing — predicts algorithm performance based on platform signals (saves, shares, completion likelihood). Returns 0-100 score + optimizations',
  input_schema: {
    type: 'object' as const,
    properties: {
      format: {
        type: 'string',
        enum: ['feed', 'reel', 'story', 'carousel', 'tiktok-video'],
        description: 'Content format',
      },
      platform: {
        type: 'string',
        enum: ['instagram', 'tiktok'],
        description: 'Target platform',
      },
      niche: { type: 'string', description: 'Content niche' },
      has_hook: { type: 'boolean', description: 'Does first 3 seconds have strong hook?' },
      has_cta: { type: 'boolean', description: 'Has clear call-to-action?' },
      has_value: { type: 'boolean', description: 'Provides clear value (education/entertainment/inspiration)?' },
      visual_complexity: {
        type: 'string',
        enum: ['minimal', 'moderate', 'complex'],
        description: 'Visual complexity level',
      },
      text_overlay: { type: 'boolean', description: 'Has on-screen text overlay?' },
    },
    required: ['format', 'platform', 'niche'],
  },
};

tools.design_psychology_hooks = {
  name: 'design_psychology_hooks',
  description:
    'Generate psychology-driven visual layout recommendations — maps audience desires/fears to visual composition, color psychology, and visual hierarchy for maximum engagement',
  input_schema: {
    type: 'object' as const,
    properties: {
      niche: { type: 'string', description: 'Content niche' },
      target_emotion: {
        type: 'string',
        enum: ['aspiration', 'fear', 'curiosity', 'authority', 'belonging', 'urgency'],
        description: 'Primary emotion to trigger',
      },
      content_type: {
        type: 'string',
        enum: ['educational', 'promotional', 'social-proof', 'behind-scenes', 'viral-hook'],
        description: 'Type of content piece',
      },
      platform: {
        type: 'string',
        enum: ['instagram', 'tiktok'],
        description: 'Target platform',
      },
    },
    required: ['niche', 'target_emotion', 'content_type'],
  },
};

export const designTools = tools;

// ── Niche design system data ──────────────────────────────────────────────────

interface NicheDesignPreset {
  primaryColors: string[];
  secondaryColors: string[];
  fontStyle: string;
  compositionRule: string;
  visualMood: string;
  doList: string[];
  dontList: string[];
  topFormats: string[];
  saveableElements: string[];
}

const NICHE_DESIGN_PRESETS: Partial<Record<string, NicheDesignPreset>> = {
  'fitness-coaching': {
    primaryColors: ['#FF4500', '#1A1A2E', '#FFFFFF'],
    secondaryColors: ['#E94560', '#F5A623'],
    fontStyle: 'Bold sans-serif, high contrast, large headlines',
    compositionRule: 'Person-centered, transformation split, before/after diagonal',
    visualMood: 'Energetic, motivational, aspirational',
    doList: ['Show real people', 'Use transformation imagery', 'Bold typography', 'High contrast'],
    dontList: ['Stock-looking photos', 'Pastel colors', 'Complex backgrounds', 'Small text'],
    topFormats: ['reel-cover', 'carousel-ig', 'story'],
    saveableElements: ['tip graphics', 'workout plans', 'transformation reveals'],
  },
  'fitness-products': {
    primaryColors: ['#000000', '#FFFFFF', '#FF6B35'],
    secondaryColors: ['#00A8E8', '#F7F7F7'],
    fontStyle: 'Clean bold, product-forward, minimal',
    compositionRule: 'Product hero center, white space dominant, single focal point',
    visualMood: 'Premium, performance, clinical precision',
    doList: ['Crisp product shots', 'Ingredient callouts', 'Before/after results', 'Scientific credibility'],
    dontList: ['Cluttered backgrounds', 'Warm amateur lighting', 'Competing visual elements'],
    topFormats: ['feed-post', 'carousel-ig', 'story'],
    saveableElements: ['comparison charts', 'ingredient breakdowns', 'result proofs'],
  },
  ecommerce: {
    primaryColors: ['#2D3436', '#FFFFFF', '#FF7675'],
    secondaryColors: ['#6C5CE7', '#00B894'],
    fontStyle: 'Modern sans-serif, pricing prominent, benefit-forward',
    compositionRule: 'Product hero with lifestyle context, price anchor visible',
    visualMood: 'Aspirational but accessible, desire-driven',
    doList: ['Show product in use', 'Price visibility', 'Social proof numbers', 'Lifestyle context'],
    dontList: ['Plain product on white only', 'Hidden pricing', 'No human element'],
    topFormats: ['carousel-ig', 'feed-post', 'story'],
    saveableElements: ['product comparisons', 'review aggregates', 'unboxing reveals'],
  },
  'personal-brand': {
    primaryColors: ['#FDCB6E', '#6C5CE7', '#FFFFFF'],
    secondaryColors: ['#FD79A8', '#00CEC9'],
    fontStyle: 'Personality-forward, handwritten accents, bold headers',
    compositionRule: 'Creator face prominent, authentic energy, relatable composition',
    visualMood: 'Authentic, vibrant, trend-aware',
    doList: ['Show your face', 'Behind-the-scenes', 'Trend-adjacent aesthetics', 'Consistent color story'],
    dontList: ['Corporate stock photography', 'Overly polished', 'Hidden personality', 'Generic templates'],
    topFormats: ['reel-cover', 'story', 'carousel-ig'],
    saveableElements: ['opinion takes', 'behind-scenes', 'day-in-life'],
  },
  finance: {
    primaryColors: ['#2C3E50', '#27AE60', '#FFFFFF'],
    secondaryColors: ['#3498DB', '#F39C12'],
    fontStyle: 'Professional serif/sans hybrid, data visualization, chart-ready',
    compositionRule: 'Data-forward, clean infographic structure, authority framing',
    visualMood: 'Trustworthy, expert, aspirational wealth',
    doList: ['Data visualization', 'Charts and graphs', 'Dollar amounts visible', 'Clean layouts'],
    dontList: ['Cluttered data', 'Casual fonts', 'Amateur photography', 'Missing sources'],
    topFormats: ['carousel-ig', 'feed-post', 'tiktok-cover'],
    saveableElements: ['investment charts', 'savings formulas', 'money hacks'],
  },
};

const PSYCHOLOGY_VISUAL_MAP: Record<string, Record<string, string[]>> = {
  aspiration: {
    colors: ['Gold (#FFD700)', 'Royal blue (#4169E1)', 'Premium white (#FAFAFA)'],
    composition: ['Look upward framing', 'Spacious negative space', 'Elevated perspective shots'],
    typography: ['Elegant serif for contrast', 'Wide letter-spacing', 'Gradient text on dark'],
    elements: ['Success symbols', 'Before→After reveals', 'Achievement numbers'],
  },
  fear: {
    colors: ['Warning red (#FF0000)', 'High contrast black/white', 'Urgent orange (#FF6600)'],
    composition: ['Close crop tension', 'Directional arrows toward pain point', 'Split comparison'],
    typography: ['Bold caps headlines', 'Exclamation emphasis', 'Problem → Solution arc'],
    elements: ['Warning icons', 'Countdown elements', 'Loss framing numbers'],
  },
  curiosity: {
    colors: ['Electric blue (#0099FF)', 'Unexpected color combos', 'Gradient depth'],
    composition: ['Partial reveal', 'Off-center mystery subject', 'Incomplete visual'],
    typography: ['Question-form headlines', 'Ellipsis hooks', 'Numbered reveals'],
    elements: ['Hidden element tease', 'Arrow pointing off-frame', 'Blurred background reveal'],
  },
  authority: {
    colors: ['Navy (#001F5B)', 'Gold accents', 'Clean white'],
    composition: ['Centered authority subject', 'Rule-of-thirds stability', 'Clean margins'],
    typography: ['Serif headlines for expertise', 'Credential callouts', 'Citation-style sub-text'],
    elements: ['Credentials/logos', 'Data citations', 'Expert framing shots'],
  },
  belonging: {
    colors: ['Warm earth tones', 'Community greens', 'Inclusive neutral palette'],
    composition: ['Group/community imagery', 'Inclusive framing', 'Celebratory layouts'],
    typography: ['Friendly rounded fonts', 'Second-person copy', 'Community language'],
    elements: ['User-generated style', 'Testimonials', 'Community numbers'],
  },
  urgency: {
    colors: ['Red (#FF0000)', 'Orange (#FF6600)', 'High contrast black'],
    composition: ['Countdown timers', 'Limited quantity callouts', 'Diagonal dynamic tension'],
    typography: ['CAPS for urgency', 'Strike-through old prices', 'Limited time copy'],
    elements: ['Timer graphics', 'Scarcity numbers', 'Now-or-never CTAs'],
  },
};

export const executeDesignTool = async (
  toolName: string,
  input: Record<string, unknown>,
  brand?: BrandProfile,
): Promise<string> => {
  try {
    switch (toolName) {
      case 'design_create_session': {
        const session = await designController.createSession(input.tool as string, input as Record<string, unknown>);
        return JSON.stringify({
          ok: true,
          session_id: session.sessionId,
          tool: session.tool,
          message: 'Design session created. Ready for commands.',
        });
      }

      case 'design_execute_command': {
        const toolStr = (input.tool as string) || 'figma';
        const validTools = ['figma', 'canva', 'adobe-express', 'photoshop'] as const;
        const isValidTool = (str: string): str is (typeof validTools)[number] =>
          validTools.includes(str as (typeof validTools)[number]);
        const designTool = isValidTool(toolStr) ? toolStr : 'figma';
        const cmd: DesignCommand = {
          tool: designTool,
          action: input.action as 'create' | 'edit' | 'export' | 'share' | 'validate',
          params: (input.params as Record<string, unknown>) || {},
        };
        const result = await designController.executeCommand(input.session_id as string, cmd);
        return JSON.stringify({
          ok: result.ok,
          result,
          message: result.ok ? 'Command executed successfully' : `Error: ${result.error}`,
        });
      }

      case 'design_add_assets': {
        const session = designController.getSession(input.session_id as string);
        if (!session) return JSON.stringify({ ok: false, error: `Session ${input.session_id} not found` });
        const assets = input.assets as Array<Record<string, unknown>>;
        const assetTypes = ['image', 'video', 'audio', 'font', 'vector'] as const;
        const isValidAssetType = (str: string): str is (typeof assetTypes)[number] =>
          assetTypes.includes(str as (typeof assetTypes)[number]);
        session.assets.push(
          ...assets.map((a) => {
            const typeStr = (a.type as string) || 'image';
            const type = isValidAssetType(typeStr) ? typeStr : 'image';
            return {
              id: `asset-${Date.now()}-${Math.random()}`,
              type,
              source: 'uploaded' as const,
              url: a.source as string | undefined,
              metadata: { position: a.position, scale: a.scale },
            };
          }),
        );
        return JSON.stringify({ ok: true, assets_added: assets.length, message: `${assets.length} asset(s) added` });
      }

      case 'design_apply_template': {
        const session = designController.getSession(input.session_id as string);
        if (!session) return JSON.stringify({ ok: false, error: `Session ${input.session_id} not found` });
        const templateType = input.template_type as string;
        const templates: Record<string, { width: number; height: number }> = {
          'carousel-ig': { width: 1080, height: 1350 },
          'reel-cover': { width: 1080, height: 1920 },
          story: { width: 1080, height: 1920 },
          'tiktok-vertical': { width: 1080, height: 1920 },
          'post-feed': { width: 1080, height: 1080 },
          thumbnail: { width: 1280, height: 720 },
        };
        const dim = templates[templateType];
        if (!dim) return JSON.stringify({ ok: false, error: `Unknown template: ${templateType}` });
        return JSON.stringify({
          ok: true,
          template: templateType,
          dimensions: dim,
          message: `Template applied: ${dim.width}x${dim.height}`,
        });
      }

      case 'design_export': {
        const session = designController.getSession(input.session_id as string);
        if (!session) return JSON.stringify({ ok: false, error: `Session ${input.session_id} not found` });
        const formats = input.format as string[];
        return JSON.stringify({
          ok: true,
          exported_formats: formats,
          artifact_urls: formats.map((f) => `/exports/${session.sessionId}.${f}`),
          message: `Design exported in ${formats.join(', ')} formats`,
        });
      }

      case 'design_close_session': {
        const closed = await designController.closeSession(input.session_id as string);
        return JSON.stringify({ ok: closed, message: closed ? 'Session closed' : 'Session not found' });
      }

      // ── AI Intelligence Cases ───────────────────────────────────────────────

      case 'design_brand_validate': {
        if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required' });

        const caption = (input.caption as string) || '';
        const visualTheme = (input.visual_theme as string) || '';
        const colorsUsed = (input.colors_used as string[]) || [];

        const violations: string[] = [];
        let score = 100;

        // Check forbidden words
        brand.voice.forbidden.forEach((forbidden) => {
          if (caption.toLowerCase().includes(forbidden.toLowerCase())) {
            violations.push(`Forbidden word: "${forbidden}" in caption`);
            score -= 15;
          }
        });

        // Check tone alignment
        const toneWords = brand.voice.tone;
        const captionLower = caption.toLowerCase();
        const toneMatches = toneWords.filter((t) => captionLower.includes(t.toLowerCase())).length;
        if (toneMatches === 0 && caption.length > 20) {
          violations.push('Caption tone does not align with brand voice');
          score -= 10;
        }

        // Check color palette compliance
        if (colorsUsed.length > 0) {
          const paletteNormalized = brand.visual.palette.map((c) => c.toLowerCase());
          const offBrand = colorsUsed.filter((c) => !paletteNormalized.includes(c.toLowerCase()));
          if (offBrand.length > 0) {
            violations.push(`Off-brand colors detected: ${offBrand.join(', ')}`);
            score -= offBrand.length * 8;
          }
        }

        // Check visual theme alignment
        if (visualTheme) {
          const typographyKeywords = brand.visual.typography.map((t) => t.toLowerCase());
          const themeAligned = typographyKeywords.some((k) => visualTheme.toLowerCase().includes(k));
          if (!themeAligned) {
            violations.push('Visual theme may not align with brand typography system');
            score -= 5;
          }
        }

        const finalScore = Math.max(0, score);
        return JSON.stringify({
          ok: true,
          brand_compliance_score: finalScore,
          violations,
          passed: violations.length === 0,
          ready_to_publish: finalScore >= 70,
          recommendations:
            violations.length > 0
              ? ['Fix violations before publishing', `Score ${finalScore}/100`]
              : ['Content passes brand validation'],
        });
      }

      case 'design_generate_ai': {
        if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required' });

        const topic = (input.topic as string) || 'content';
        const format = (input.format as string) || 'feed-post';
        const niche = input.niche as string as NicheCategory;
        const contentGoal = (input.goal as string) || 'engagement';
        const platform = (input.platform as string) || 'instagram';
        const designTool = (input.design_tool as string) || 'canva';

        // Get algorithm profile for visual strategy
        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);

        // Get psychology profile for emotional hook
        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);

        const topSignal = algProfile.rankingFactors[0];
        const topDesire = psychProfile.psychographics.coreDesire;
        const topTrigger = psychProfile.buyingTriggers[0]?.trigger ?? 'transformation';

        const formatDimensions: Record<string, string> = {
          'feed-post': '1080×1080px',
          'reel-cover': '1080×1920px',
          story: '1080×1920px',
          'carousel-slide': '1080×1080px',
          'highlight-cover': '1080×1080px',
          'tiktok-cover': '1080×1920px',
        };

        const goal = `Create a ${format} design (${formatDimensions[format] ?? '1080×1080px'}) in ${designTool}:

BRAND: ${brand.name}
COLORS: ${brand.visual.palette.slice(0, 3).join(', ')}
FONTS: ${brand.visual.typography.slice(0, 2).join(', ')}
TOPIC: ${topic}
NICHE: ${niche}
PLATFORM: ${platform}
GOAL: ${contentGoal}

ALGORITHM PRIORITY: Optimize for "${topSignal?.factor ?? 'completion'}" (${((topSignal?.weight ?? 0.3) * 100).toFixed(0)}% ranking weight)
PSYCHOLOGY HOOK: Trigger "${topTrigger}" — audience core desire: ${topDesire}

DESIGN STEPS:
1. Open ${designTool}.com → New design → Custom size: ${formatDimensions[format] ?? '1080×1080px'}
2. Apply brand colors: ${brand.visual.palette[0] ?? '#000'} (primary)
3. Use visual hook for "${topic}" that triggers ${topTrigger}
4. Typography: ${brand.visual.typography[0] ?? 'Bold Sans'}
5. NO TEXT unless carousel format — visual-only for SEO
6. Export and confirm URL

Output: DESIGN_URL: [url]`;

        const result = await executeWithRecovery(brand, {
          goal,
          maxIterations: 20,
          operationName: `AI design: ${topic} (${format})`,
          maxRetries: 2,
        });

        const urlMatch = result.summary.match(/(?:canva|figma)\.com\/[^\s"]+/);
        return JSON.stringify({
          ok: result.ok,
          design_url: urlMatch ? urlMatch[0] : null,
          algorithm_optimization: topSignal?.factor,
          psychology_trigger: topTrigger,
          summary: result.summary,
        });
      }

      case 'design_batch_variants': {
        if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required' });

        const topic = (input.base_topic as string) || 'content';
        const format = (input.format as string) || 'feed-post';
        const niche = (input.niche as string) || 'personal-brand';
        const variantCount = Math.min(
          5,
          Math.max(2, typeof input.variant_count === 'number' ? input.variant_count : 3),
        );
        const varyBy = (input.vary_by as string[]) || ['color', 'layout'];

        const paletteSubsets =
          brand.visual.palette.length >= 3
            ? Array.from({ length: variantCount }, (_, i) => [
                brand.visual.palette[i % brand.visual.palette.length] ?? '#000',
                brand.visual.palette[(i + 1) % brand.visual.palette.length] ?? '#FFF',
              ])
            : Array(variantCount).fill(brand.visual.palette.slice(0, 2));

        const variants = Array.from({ length: variantCount }, (_, i) => ({
          variant_id: `v${i + 1}`,
          color_scheme: paletteSubsets[i],
          layout: varyBy.includes('layout')
            ? ['centered', 'rule-of-thirds', 'diagonal', 'split', 'asymmetric'][i % 5]
            : 'centered',
          typography: varyBy.includes('typography')
            ? ['bold-headline', 'minimal', 'script-accent', 'all-caps'][i % 4]
            : 'bold-headline',
          mood: varyBy.includes('mood') ? ['energetic', 'calm', 'bold', 'elegant', 'playful'][i % 5] : 'energetic',
          composition: varyBy.includes('composition')
            ? ['product-hero', 'person-centric', 'text-dominant', 'lifestyle'][i % 4]
            : 'product-hero',
          canva_search_query: `${niche} ${format.replace('-', ' ')} ${['bold', 'minimal', 'trendy', 'professional', 'vibrant'][i % 5]}`,
        }));

        return JSON.stringify({
          ok: true,
          topic,
          format,
          niche,
          variant_count: variantCount,
          variants,
          testing_recommendation: 'Post variants 48h apart, same time of day. Declare winner at 500+ reach.',
          ab_metrics_to_track: ['saves_rate', 'reach', 'profile_visits', 'link_clicks'],
        });
      }

      case 'design_niche_preset': {
        const niche = (input.niche as string) || 'personal-brand';
        const platform = (input.platform as string) || 'both';
        const stage = (input.account_stage as string) || 'growing';

        const preset = NICHE_DESIGN_PRESETS[niche];

        const classifierResult = nicheClassifier.classify({
          bioText: niche,
          hashtags: [],
          ctaText: '',
          contentSamples: [],
        });

        return JSON.stringify({
          ok: true,
          niche,
          platform,
          account_stage: stage,
          design_preset: preset ?? {
            primaryColors: brand?.visual.palette.slice(0, 3) ?? ['#000', '#FFF', '#888'],
            fontStyle: 'Clean modern sans-serif',
            compositionRule: 'Rule of thirds, clear focal point',
            visualMood: 'Professional and engaging',
            doList: ['Strong visual hierarchy', 'Brand consistency', 'Clear CTA area'],
            dontList: ['Cluttered layouts', 'Off-brand colors', 'Too much text'],
            topFormats: ['feed-post', 'reel-cover', 'carousel-ig'],
            saveableElements: ['tips', 'how-tos', 'data points'],
          },
          classifier_confidence: classifierResult.confidence,
          platform_specific: {
            instagram: {
              grid_strategy: stage === 'established' ? 'Color-blocked alternating' : 'Consistent brand filter',
              story_ratio: '4:1 value to promotional',
            },
            tiktok: {
              cover_style: 'Bold text on face/product thumbnail',
              thumbnail_text: 'Add 2-3 word hook overlay',
            },
          },
        });
      }

      case 'design_algorithm_score': {
        const format = (input.format as string) || 'feed';
        const platform = (input.platform as string) || 'instagram';
        const niche = (input.niche as string) || 'personal-brand';
        const hasHook = (input.has_hook as boolean) ?? false;
        const hasCta = (input.has_cta as boolean) ?? false;
        const dayNameMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const plan = contentAlgorithmAgent.optimizeContent(platform as 'instagram' | 'tiktok', niche as NicheCategory, {
          type: format,
          hookText: hasHook ? 'Hook present' : undefined,
          hasCta,
        });

        return JSON.stringify({
          ok: true,
          algorithm_score: plan.score,
          platform,
          format,
          optimizations: plan.optimizations.map((o) => ({
            priority: o.impact,
            action: o.recommended,
            expected_lift: o.reason,
          })),
          posting_window_score: contentAlgorithmAgent.getPostingWindowScore(
            platform as 'instagram' | 'tiktok',
            dayNameMap[new Date().getDay()] ?? 'Wed',
            new Date().getHours(),
          ),
          ready_to_post: plan.score >= 60,
        });
      }

      case 'design_psychology_hooks': {
        const niche = (input.niche as string) || 'personal-brand';
        const targetEmotion = (input.target_emotion as string) || 'aspiration';
        const contentType = (input.content_type as string) || 'educational';

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche as NicheCategory, DEFAULT_AUDIENCE);
        const visualMap = PSYCHOLOGY_VISUAL_MAP[targetEmotion];
        const firstTrigger = psychProfile.buyingTriggers[0];

        const hookVariants = firstTrigger
          ? audiencePsychologyAgent.generateHookVariants(firstTrigger, 3)
          : [`Trigger ${targetEmotion} with visual contrast`, `Lead with the pain point`, `Show the after first`];

        const safeVisualMap = visualMap ?? {
          colors: ['Brand primary', 'High contrast accent'],
          composition: ['Clear focal point', 'Directional framing'],
          typography: ['Bold headline', 'Readable body'],
          elements: ['Relevant icons', 'Social proof'],
        };

        return JSON.stringify({
          ok: true,
          niche,
          target_emotion: targetEmotion,
          content_type: contentType,
          psychology_profile: {
            core_desire: psychProfile.psychographics.coreDesire,
            deepest_fear: psychProfile.psychographics.deepestFear,
            trust_signals: psychProfile.psychographics.trustSignals.slice(0, 3),
            urgency_triggers: psychProfile.psychographics.urgencyTriggers.slice(0, 3),
          },
          visual_recommendations: safeVisualMap,
          caption_hooks: hookVariants,
          layout_brief: `For ${contentType} content targeting ${targetEmotion}: ${safeVisualMap.composition[0] ?? 'Strong visual hierarchy'}. Lead colors: ${safeVisualMap.colors[0] ?? 'Brand primary'}. Typography: ${safeVisualMap.typography[0] ?? 'Bold and readable'}.`,
        });
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown design tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
