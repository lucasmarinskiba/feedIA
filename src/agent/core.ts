import type { ContentBlock, MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import { claude } from './claude.js';
import { findTool, toolSpecs } from './tools.js';
import { brandContext } from './memory.js';
import { log } from './logger.js';
import { env } from '../config/index.js';
import type { BrandProfile, AgentRunOptions } from '../config/types.js';

const SYSTEM_PROMPT = (
  brand: BrandProfile,
): string => `Sos un agente CMO autónomo para Instagram, especializado en evitar burnout y dependencia de la app para tu cliente.

Trabajás para esta marca:
${brandContext(brand)}

Principios irrenunciables:
1. Nunca generes clickbait ni promesas vacías. La marca pierde más con un seguidor decepcionado que con uno menos.
2. Respetá el tono y palabras prohibidas: ${brand.voice.forbidden.join(', ') || 'sin restricciones'}.
3. Antes de publicar nada, validá calidad y coherencia con voz de marca.
4. Si una decisión tiene riesgo (legal, reputacional, financiero), marcala como "requiere humano" y devolvé control.
5. Optimizá guardados y compartidos antes que likes. Likes no compran nada.
6. Cuando dudes entre cantidad y calidad → calidad.

Modo de operación:
- Tenés acceso a herramientas para estrategia, copywriting, generación de contenido, tendencias, comunidad, inbox, reputación y ops.
- Llamá las herramientas en orden lógico. Por ejemplo: scout_tendencias → validar_angulos → analyze_nicho → crear_carrusel/reel → crear_caption → render_artifact → planificar_semana.
- No publiques (publicar_instagram) sin confirmación explícita del usuario, incluso en DRY_RUN.
- Cuando termines, devolvé un resumen ejecutivo: qué hiciste, qué hay listo para revisar, qué bloqueos encontraste.

Modo actual: ${env.dryRun ? 'DRY RUN (nada se publica)' : 'PRODUCCIÓN'}.`;

export interface AgentRunResult {
  finalText: string;
  iterations: number;
  toolCalls: Array<{ name: string; input: unknown; ok: boolean; durationMs: number }>;
}

export const runAgent = async (brand: BrandProfile, opts: AgentRunOptions): Promise<AgentRunResult> => {
  const max = opts.maxIterations ?? 12;
  const messages: MessageParam[] = [{ role: 'user', content: opts.goal }];
  const toolCalls: AgentRunResult['toolCalls'] = [];
  let iter = 0;
  let finalText = '';

  while (iter < max) {
    iter += 1;
    log.debug(`Iteración ${iter} del agente`);
    const response = await claude.messages.create({
      model: env.modelPrimary,
      max_tokens: 6000,
      system: SYSTEM_PROMPT(brand),
      tools: toolSpecs(),
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
      log.warn(`stop_reason inesperado: ${response.stop_reason}`);
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
        log.error(`Tool desconocida: ${block.name}`);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: `Tool ${block.name} no registrada` }),
          is_error: true,
        });
        toolCalls.push({
          name: block.name,
          input: block.input,
          ok: false,
          durationMs: Date.now() - start,
        });
        continue;
      }
      log.step(`→ ${block.name}`);
      try {
        const data = await tool.handler(block.input as Record<string, unknown>, brand);
        const durationMs = Date.now() - start;
        toolCalls.push({ name: block.name, input: block.input, ok: true, durationMs });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(data).slice(0, 12000),
        });
        log.success(`${block.name} ok (${durationMs}ms)`);
      } catch (err) {
        const durationMs = Date.now() - start;
        const message = (err as Error).message;
        toolCalls.push({ name: block.name, input: block.input, ok: false, durationMs });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: message }),
          is_error: true,
        });
        log.error(`${block.name} falló: ${message}`);
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  if (!finalText) {
    finalText = '[Agente alcanzó el máximo de iteraciones sin cierre explícito.]';
  }

  return { finalText, iterations: iter, toolCalls };
};
