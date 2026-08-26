import { Router, Request, Response } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface CarouselSlide {
  slideNumber: number;
  headline: string;
  body: string;
  cta: string;
}

interface GeneratedContent {
  format: string;
  slides: CarouselSlide[];
  sourceCategory: string;
  generatedAt: string;
}

interface CarouselRequest {
  category: string;
  slideCount?: number;
}

router.post(
  '/carousel',
  async (
    req: Request<Record<string, never>, GeneratedContent | { error: string }, CarouselRequest>,
    res: Response<GeneratedContent | { error: string }>,
  ): Promise<void> => {
    try {
      const { category, slideCount = 10 } = req.body;

      if (!category) {
        return res.status(400).json({ error: 'Missing category' });
        return;
      }

      const message = await anthropic.messages.create({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `Generate ${slideCount} carousel slides about ${category}. Return JSON array with headline, body, cta fields.`,
          },
        ],
        system: 'Return ONLY valid JSON array, no other text.',
      });

      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Array<Record<string, string>>) : [];

      const slides = parsed.map((item, idx) => ({
        slideNumber: idx + 1,
        headline: item.headline ?? '',
        body: item.body ?? '',
        cta: item.cta ?? '',
      }));

      const content: GeneratedContent = {
        format: 'carousel',
        slides: slides.slice(0, slideCount),
        sourceCategory: category,
        generatedAt: new Date().toISOString(),
      };

      return res.json(content);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: `Failed: ${error}` });
    }
  },
);

router.get(
  '/prompts/stats',
  async (
    _req: Request<Record<string, never>>,
    res: Response<Record<string, unknown> | { error: string }>,
  ): Promise<void> => {
    try {
      return res.json({
        total_prompts: 0,
        total_batches: 0,
        categories: [],
        last_updated: new Date().toISOString(),
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: `Failed: ${error}` });
    }
  },
);

export default router;
