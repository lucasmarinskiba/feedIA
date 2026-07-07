/**
 * FeedIA Prompt Expander
 * Base prompt (500) → 10 variations per prompt (5,000 total)
 * LLM-powered variation generation via Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { log } from '../agent/logger.js';
import { feedIADatabase } from '../db/database.js';

const client = new Anthropic();

interface ExpandedPrompt {
  id: string;
  prompt_id: string;
  tone: string;
  variation_text: string;
  version: number;
}

interface ExpansionResult {
  base_prompt_id: string;
  variations_generated: number;
  variations: ExpandedPrompt[];
  tokens_used: number;
}

const TONE_OPTIONS = ['emotional', 'entertaining', 'polemic', 'education', 'humor', 'debate'];

/**
 * Generate prompt variations via Claude API
 */
async function expandPrompt(
  basePromptId: string,
  basePromptText: string,
  tones: string[] = TONE_OPTIONS
): Promise<ExpandedPrompt[]> {
  try {
    const prompt = `
You are a creative prompt engineer for video content generation.

BASE PROMPT:
${basePromptText}

TASK: Generate exactly ${tones.length} variations of this prompt, one for each tone listed below.
Each variation should:
1. Maintain the core concept and structure
2. Adapt the emotional tone/delivery style
3. Be optimized for the specific platform (TikTok/Instagram Reels)
4. Be detailed and actionable for video generation

TONES (one variation each):
${tones.map((t, i) => `${i + 1}. ${t}`).join('\n')}

FORMAT YOUR RESPONSE AS JSON ONLY:
{
  "variations": [
    {
      "tone": "tone_name",
      "variation": "full_prompt_text_here"
    }
  ]
}

Generate now:
`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const variations: ExpandedPrompt[] = parsed.variations.map(
      (v: any, index: number) => ({
        id: `${basePromptId}-${v.tone}-${Date.now()}-${index}`,
        prompt_id: basePromptId,
        tone: v.tone,
        variation_text: v.variation,
        version: 1,
      })
    );

    log.info('[PromptExpander] Variations generated', {
      basePromptId,
      count: variations.length,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    });

    return variations;
  } catch (error) {
    log.error('[PromptExpander] Expansion failed', { basePromptId, error });
    return [];
  }
}

/**
 * Expand single prompt + store variations in DB
 */
async function expandAndStore(
  basePromptId: string,
  basePromptText: string
): Promise<ExpansionResult> {
  const variations = await expandPrompt(basePromptId, basePromptText);

  // Store variations in database
  let stored = 0;
  for (const variation of variations) {
    const success = feedIADatabase.storeVariation(variation);
    if (success) stored++;
  }

  return {
    base_prompt_id: basePromptId,
    variations_generated: variations.length,
    variations: variations.slice(0, 3), // Return first 3 for preview
    tokens_used: 0, // Track separately if needed
  };
}

/**
 * Expand batch of prompts (one-time job or scheduled)
 * Batch size: 10 at a time (rate limiting)
 */
async function expandBatch(batch: string = 'batch-90'): Promise<Record<string, any>> {
  try {
    log.info('[PromptExpander] Starting batch expansion', { batch });

    // Load base prompts from database by batch
    // TODO: Implement getPromptsByBatch in database.ts
    // const prompts = feedIADatabase.getPromptsByBatch(batch);

    // For now, placeholder
    const prompts: any[] = [];

    if (prompts.length === 0) {
      return { status: 'no_prompts_found', batch };
    }

    const results = [];
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];

      // Rate limiting: 10s delay between API calls (avoid rate limits)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      const result = await expandAndStore(prompt.id, prompt.base_template);
      results.push(result);

      log.info('[PromptExpander] Batch progress', {
        batch,
        completed: i + 1,
        total: prompts.length,
      });
    }

    const totalVariations = results.reduce((sum, r) => sum + r.variations_generated, 0);

    log.info('[PromptExpander] Batch expansion complete', {
      batch,
      totalVariations,
      prompts: prompts.length,
    });

    return {
      status: 'complete',
      batch,
      base_prompts: prompts.length,
      total_variations_generated: totalVariations,
      expansion_rate: `${totalVariations}x (${6} tones per prompt)`,
    };
  } catch (error) {
    log.error('[PromptExpander] Batch expansion failed', { batch, error });
    return { status: 'error', batch, error: String(error) };
  }
}

/**
 * Get expansion status + stats
 */
async function getExpansionStatus(): Promise<Record<string, any>> {
  try {
    const stats = feedIADatabase.getStats();

    return {
      status: 'operational',
      library: stats,
      expansion_info: {
        base_prompts: stats.prompts || 0,
        variations_available: stats.variations || 0,
        expansion_rate: stats.variations && stats.prompts
          ? (stats.variations / stats.prompts).toFixed(1)
          : '0',
        tones_per_prompt: 6,
        target_scale: '34,500+ total prompts',
      },
      next_action: 'POST /api/prompts/expand-batch to generate variations',
    };
  } catch (error) {
    log.error('[PromptExpander] Status check failed', error);
    return { status: 'error', error: String(error) };
  }
}

export { expandPrompt, expandAndStore, expandBatch, getExpansionStatus };
