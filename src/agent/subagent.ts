import type { ContentBlock, MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { claude } from './claude.js';
import { tools, findTool } from './tools.js';
import { log } from './logger.js';
import { env } from '../config/index.js';
import type { BrandProfile } from '../config/types.js';

export interface SubAgentDefinition {
  name: string;
  description: string;
  systemPrompt: (brand: BrandProfile) => string;
  toolNames: string[];
  defaultGoal?: string;
  preferFastModel?: boolean;
}

export interface SubAgentResult {
  subagent: string;
  finalText: string;
  iterations: number;
  toolCalls: Array<{ name: string; ok: boolean; durationMs: number }>;
}

export const buildToolSubset = (toolNames: string[]): Tool[] => {
  const set = new Set(toolNames);
  return tools.filter((t) => set.has(t.spec.name)).map((t) => t.spec);
};

export const runSubAgent = async (
  brand: BrandProfile,
  def: SubAgentDefinition,
  goal: string,
  opts: { maxIterations?: number } = {},
): Promise<SubAgentResult> => {
  const max = opts.maxIterations ?? 8;
  const subset = buildToolSubset(def.toolNames);
  if (subset.length === 0) {
    log.warn(`Sub-agente ${def.name} sin tools registradas. Verificá nombres.`);
  }
  const messages: MessageParam[] = [{ role: 'user', content: goal }];
  const toolCalls: SubAgentResult['toolCalls'] = [];
  const model = def.preferFastModel ? env.modelFast : env.modelPrimary;
  let iter = 0;
  let finalText = '';

  while (iter < max) {
    iter += 1;
    const response = await claude.messages.create({
      model,
      max_tokens: 4500,
      system: def.systemPrompt(brand),
      tools: subset,
      messages,
    });
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') {
      finalText = response.content
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      break;
    }
    if (response.stop_reason !== 'tool_use') {
      log.warn(`Sub-agente ${def.name}: stop_reason=${response.stop_reason}`);
      break;
    }

    const toolResults: Array<{
      type: 'tool_result';
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }> = [];

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const tool = findTool(block.name);
      const start = Date.now();
      if (!tool) {
        toolCalls.push({ name: block.name, ok: false, durationMs: Date.now() - start });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: `Tool ${block.name} no registrada` }),
          is_error: true,
        });
        continue;
      }
      try {
        const data = await tool.handler(block.input as Record<string, unknown>, brand);
        const durationMs = Date.now() - start;
        toolCalls.push({ name: block.name, ok: true, durationMs });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(data).slice(0, 10000),
        });
      } catch (err) {
        const durationMs = Date.now() - start;
        toolCalls.push({ name: block.name, ok: false, durationMs });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: (err as Error).message }),
          is_error: true,
        });
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }
  if (!finalText) finalText = `[${def.name}: max iteraciones sin cierre]`;
  return { subagent: def.name, finalText, iterations: iter, toolCalls };
};
