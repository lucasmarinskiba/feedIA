import { Router, Request, Response } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';
import { promptLoader } from '../services/prompt-loader-new.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface CarouselSlide {
  slideNumber: number;
  headline?: string;
  body?: string;
  cta?: string;
}

interface GeneratedContent {
  format: string;
  slides: CarouselSlide[];
  sourceCategory: string;
  generatedAt: string;
}

router.post('/carousel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, slideCount = 10 } = req.body as { category: string; slideCount?: number };

    if (!category) {
      res.status(400).json({ error: 'Missing category' });
      return;
    }

    const ctx = await promptLoader.getPromptContext(category, 'carousel');

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Generate ${slideCount} carousel slides based on:\n\n${ctx.prompt.text}`,
        },
      ],
      system: `Generate carousel slides with headline, body, cta fields. Return JSON array only.`,
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as unknown[]) : [];

    const slides = (parsed as Record<string, unknown>[]).map((item, idx) => ({
      slideNumber: idx + 1,
      headline: (item.headline || '') as string,
      body: (item.body || '') as string,
      cta: (item.cta || '') as string,
    }));

    const content: GeneratedContent = {
      format: 'carousel',
      slides: slides.slice(0, slideCount),
      sourceCategory: ctx.prompt.category,
      generatedAt: new Date().toISOString(),
    };

    res.json(content);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed: ${error}` });
  }
});

router.get('/prompts/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await promptLoader.getBatchStats();
    res.json(stats);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed: ${error}` });
  }
});

export default router;
