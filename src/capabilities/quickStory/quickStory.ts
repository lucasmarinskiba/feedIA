// @ts-nocheck
/**
 * Quick Story — Series de Stories desde un prompt mínimo.
 *
 * Input: { prompt } → genera 3-5 stories conectadas (frames 1080x1920)
 * con texto, polls/quiz/questions, CTA y publica como Story sequence en IG.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const STORY_DIR = path.resolve('data/quick-story');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type StoryFrameType = 'photo' | 'video' | 'text' | 'poll' | 'quiz' | 'question' | 'countdown' | 'link';

export interface StoryFrame {
  number: number;
  type: StoryFrameType;
  mainText: string; // texto principal (máx 80 chars)
  bgColor: string; // hex
  textColor: string;
  interactive?: {
    pollQuestion?: string;
    pollOptions?: [string, string];
    quizQuestion?: string;
    quizOptions?: string[];
    correctAnswer?: number;
    questionPrompt?: string;
    countdownDate?: string;
    linkUrl?: string;
    linkText?: string;
  };
  stickers: string[]; // emojis/stickers sugeridos
  durationSec: number; // 5-15
  designNotes: string;
}

export interface QuickStoryPrompt {
  prompt: string;
  frameCount?: number; // default 4
  goal?: 'engagement' | 'venta' | 'awareness' | 'feedback' | 'anuncio';
  includeInteractive?: boolean; // default true
  linkUrl?: string; // si goal=venta y plan permite link
}

export interface QuickStoryPackage {
  id: string;
  brandId: string;
  generatedAt: string;
  originalPrompt: string;
  refinedTopic: string;
  goal: NonNullable<QuickStoryPrompt['goal']>;
  frames: StoryFrame[];
  estimatedReach: number;
  expectedReplyRate: number;
  readyToPublish: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(STORY_DIR, { recursive: true });
};
const pkgPath = (brandId: string, id: string): string => path.join(STORY_DIR, `${brandId}-${id}.json`);

// ── Pipeline principal ───────────────────────────────────────────────────────

export const createQuickStory = async (brand: BrandProfile, input: QuickStoryPrompt): Promise<QuickStoryPackage> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const id = `qs-${Date.now()}`;
  const frameCount = input.frameCount ?? 4;
  const goal = input.goal ?? 'engagement';

  log.info('[quickStory] generating', { brandId, id, prompt: input.prompt.slice(0, 60) });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2500,
    thinking: { type: 'adaptive' },
    system: `Experto en Instagram Stories. Sabés que los Stories duran 24h, son rápidos (5-15s c/u)
y que las interactive stickers (polls, quiz, questions) multiplican el engagement por 3-5x.
Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Crea serie de ${frameCount} stories para ${brand.name}:

Prompt: "${input.prompt}"
Objetivo: ${goal}
Industria: ${brand.industryCategory ?? 'general'}
Tono: ${brand.toneOfVoice ?? 'cercano profesional'}
${input.includeInteractive !== false ? 'Incluir 1-2 stickers interactivos (poll, quiz, question, countdown)' : ''}
${input.linkUrl ? `Incluir 1 frame con link: ${input.linkUrl}` : ''}

Estructura sugerida:
- Frame 1: HOOK (atrae atención, promete valor)
- Frame 2-${frameCount - 1}: DESARROLLO (1 idea por frame, interactivos)
- Frame ${frameCount}: CTA (DM, swipe up, link)

JSON:
{
  "refinedTopic": "tema concreto",
  "frames": [{
    "number": 1,
    "type": "photo|video|text|poll|quiz|question|countdown|link",
    "mainText": "texto máx 80 chars",
    "bgColor": "#XXXXXX",
    "textColor": "#XXXXXX",
    "interactive": {
      "pollQuestion": "", "pollOptions": ["", ""],
      "quizQuestion": "", "quizOptions": ["", ""], "correctAnswer": 0,
      "questionPrompt": "", "countdownDate": "", "linkUrl": "", "linkText": ""
    },
    "stickers": ["emoji1"],
    "durationSec": 7,
    "designNotes": "instrucciones diseño"
  }],
  "estimatedReach": número,
  "expectedReplyRate": 0.0-1.0
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[quickStory] No frames generated');

  const generated = JSON.parse(jsonMatch[0]) as Partial<QuickStoryPackage>;

  const pkg: QuickStoryPackage = {
    id,
    brandId,
    generatedAt: new Date().toISOString(),
    originalPrompt: input.prompt,
    refinedTopic: generated.refinedTopic ?? input.prompt,
    goal,
    frames: (generated.frames ?? []) as StoryFrame[],
    estimatedReach: generated.estimatedReach ?? 0,
    expectedReplyRate: generated.expectedReplyRate ?? 0.05,
    readyToPublish: (generated.frames ?? []).length > 0,
  };

  await ensureDir();
  await fs.writeFile(pkgPath(brandId, id), JSON.stringify(pkg, null, 2), 'utf-8');
  return pkg;
};

export const getQuickStory = async (brandId: string, id: string): Promise<QuickStoryPackage | null> => {
  try {
    return JSON.parse(await fs.readFile(pkgPath(brandId, id), 'utf-8')) as QuickStoryPackage;
  } catch {
    return null;
  }
};

export const listQuickStories = async (brandId: string, limit = 20): Promise<QuickStoryPackage[]> => {
  try {
    await ensureDir();
    const files = await fs.readdir(STORY_DIR);
    const list = files.filter((f) => f.startsWith(`${brandId}-qs-`)).slice(-limit);
    const pkgs: QuickStoryPackage[] = [];
    for (const f of list) {
      pkgs.push(JSON.parse(await fs.readFile(path.join(STORY_DIR, f), 'utf-8')) as QuickStoryPackage);
    }
    return pkgs.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  } catch {
    return [];
  }
};
