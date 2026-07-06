import Anthropic from '@anthropic-ai/sdk';
import { log } from '../agent/logger.js';
import type { BrandProfile } from '../config/types.js';

export interface PromptGenerationRequest {
  basePromptId: string;
  numberOfVariations: number;
  styleOverride?: 'press' | 'glass' | 'neon' | 'graffiti' | 'container' | 'nano-banana';
  occasionFilter?: 'trabajo' | 'amigos' | 'temática';
  maxTokens?: number;
  batchId?: string;
}

export interface GeneratedPrompt {
  id: string;
  baseId: string;
  variation: number;
  style: string;
  occasion: string;
  prompt: string;
  metadata: {
    generatedAt: string;
    model: string;
    tokensUsed: number;
    batchId?: string;
  };
}

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';

const STYLE_SPECS: Record<string, string> = {
  press: 'Foto periodística, reportaje, high-contrast B&W + color, noticia visual, composición editorial',
  glass: 'Transparencia/reflejos, cristal doble, efecto espejo, distorsión óptica, luz refractada',
  neon: 'Cyberpunk futurista, neon rosa/azul/verde, glow efecto, atmósfera nocturna, high-saturation',
  graffiti: 'Street art, tagging, spray paint, mural urbano, textura áspera, estilo callejero',
  container: 'Miniatura, nano-banana style, detalle ultra-HD, dentro frasco/botella/envase',
  'nano-banana': 'Ultra-miniature diorama (5-50cm), inside glass/capsule/container, hyper-realistic details, cinematic lighting, ultra-HD texture, professional product photography',
};

export const generatePromptVariations = async (
  brand: BrandProfile,
  request: PromptGenerationRequest,
): Promise<GeneratedPrompt[]> => {
  log.info('[PromptGenerationAgent] starting', { request });

  const systemPrompt = buildSystemPrompt(brand, request.styleOverride, request.occasionFilter);
  const userPrompt = buildUserPrompt(request);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: request.maxTokens || 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const generatedText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const prompts = parseGeneratedPrompts(generatedText, request);

    log.info('[PromptGenerationAgent] completed', { count: prompts.length, batchId: request.batchId });
    return prompts;
  } catch (error) {
    log.error('[PromptGenerationAgent] error', { error, request });
    throw error;
  }
};

const buildSystemPrompt = (brand: BrandProfile, style?: string, occasion?: string): string => {
  const styleGuide = style ? STYLE_SPECS[style] || STYLE_SPECS['nano-banana'] : 'Hybrid (press+glass+neon+graffiti+nano-banana)';

  return `You are FeedIA PromptGeneration Agent.
Role: Generate ultra-realistic construction/retail/luxury prompts with nano-banana specifications.

Brand Context:
- Name: ${brand.name}
- Niche: ${brand.niche || 'general'}
- Target: ${brand.targetAudience || 'professionals'}
- Aesthetic: ${brand.aesthetic || 'modern'}
- Tone: ${brand.tone || 'professional'}

Style Guide: ${styleGuide}
Occasion Filter: ${occasion || 'flexible (trabajo/amigos/temática)'}

Output Requirements:
1. Ultra-realistic photographic quality (8K resolution)
2. Cinematic lighting (3-point lighting + ambient)
3. Instagram square format (1080x1080 or 4:5)
4. High-detail textures (skin, materials, surfaces)
5. Dynamic composition (angles: drone/macro/low/counter-camera)
6. Professional photography aesthetic (shallow DOF, color grading)
7. Nano-banana reference: miniature scenes inside containers (glass, boxes, capsules, phones, etc.)
8. Contains miniature humans (realistic proportions, detailed faces, clothing texture)
9. Contextual elements (products, environments, lighting setups)
10. NO corporate/stock photo/generic look

Genre-Specific Details:
- Construction: Hard hats, safety vests, tools, sites, weather, dust particles
- Retail: Store interiors, merchandise, shoppers, displays, lighting design
- Luxury: Premium materials, craftsmanship details, elevated environments
- Music: Instruments, musicians, performance moments, acoustic spaces
- Artisan: Workshop settings, hands-on creation, traditional techniques

Technical Specs:
- Aspect ratio: [xy] (specify if needed)
- Camera setup: macro perspective, close-up, extreme detail focus
- Lighting: studio warm glow, no harsh shadows, soft fill light
- Color grading: natural, saturated (2-4 colors max per scene)
- Focus: sharp on main elements, shallow DOF on background
- Format: Instagram square, high-detail, magazine-quality

Output format: JSON array. Each item: { id: string, style: string, occasion: string, prompt: string }
Each prompt: 150-300 words, self-contained, executable by image generation model.`;
};

const buildUserPrompt = (request: PromptGenerationRequest): string => {
  return `Generate ${request.numberOfVariations} unique prompt variations.

Base ID: ${request.basePromptId}
Style: ${request.styleOverride || 'Varied'}
Occasion: ${request.occasionFilter || 'Flexible'}
Batch: ${request.batchId || 'autonomous'}

Each variation must:
- Be unique (not repetitive from base)
- Include specific details (person age/ethnicity/pose, background, lighting, props)
- Include nano-banana specs (miniature scene, container, detail level, cinematic mood)
- Be adaptable to multiple situations (work teams, friends, thematic projects)
- Follow ultra-realistic specifications (texture, lighting, composition)
- Start with "Create hyper-realistic..." or similar production-ready opening
- Include technical specs (aspect ratio, camera angle, lighting, materials, color palette)
- End with format/style (Instagram square, professional photography, ultra-HD, etc.)

Return: Valid JSON array of { id, style, occasion, prompt } objects.
Do NOT include markdown, code fences, or explanations. Pure JSON only.`;
};

const parseGeneratedPrompts = (text: string, request: PromptGenerationRequest): GeneratedPrompt[] => {
  try {
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      json = JSON.parse(jsonMatch[0]);
    }

    const prompts = Array.isArray(json) ? json : json.prompts || [];

    return prompts.map(
      (p: any, i: number): GeneratedPrompt => ({
        id: `${request.basePromptId}-VAR-${i + 1}`,
        baseId: request.basePromptId,
        variation: i + 1,
        style: p.style || request.styleOverride || 'nano-banana',
        occasion: p.occasion || request.occasionFilter || 'flexible',
        prompt: p.prompt || '',
        metadata: {
          generatedAt: new Date().toISOString(),
          model: MODEL,
          tokensUsed: Math.ceil(text.length / 4),
          batchId: request.batchId,
        },
      }),
    );
  } catch (error) {
    log.error('[PromptGenerationAgent] parse error', { error, textLength: text.length });
    return [];
  }
};

export const batchGeneratePrompts = async (
  brand: BrandProfile,
  baseIds: string[],
  style?: string,
): Promise<GeneratedPrompt[]> => {
  const allPrompts: GeneratedPrompt[] = [];
  const batchId = `batch-${Date.now()}`;

  for (const baseId of baseIds) {
    const variations = await generatePromptVariations(brand, {
      basePromptId: baseId,
      numberOfVariations: 10,
      styleOverride: style as any,
      batchId,
    });
    allPrompts.push(...variations);
  }

  log.info('[PromptGenerationAgent] batch complete', { batchId, totalPrompts: allPrompts.length });
  return allPrompts;
};
