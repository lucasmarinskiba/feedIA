/**
 * Anthropic Computer Use — driver real (opcional, con gate de seguridad)
 * ─────────────────────────────────────────────────────────────────────────
 * Conecta el bucle agéntico de Computer Use de Anthropic: el modelo ve
 * capturas de pantalla y emite acciones (mover mouse, click, tipear, scroll)
 * que ESTE driver ejecuta de verdad sobre un navegador real (Playwright,
 * import dinámico opcional) y devuelve la captura siguiente. Cada acción y
 * cada screenshot REAL se transmiten al teatro en vivo (mismo canal SSE).
 *
 * Doble gate de seguridad — sólo corre en vivo si TODO se cumple:
 *   • env COMPUTER_USE_LIVE=true                (opt-in explícito)
 *   • ANTHROPIC_API_KEY presente y real
 *   • Playwright instalado (actuador disponible)
 * Si algo falta → no disponible y el teatro sigue en modo simulado (intacto).
 *
 * Nunca lanza hacia el teatro: cualquier fallo degrada a la simulación.
 */

import { claude } from '../../agent/claude.js';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';
import type { CuEvent } from './liveSession.js';
import { actionGate } from '../../glassbox/index.js';
import {
  compressScreenshot,
  pruneMessageHistory,
  withCacheBreakpoint,
  clampCoordinate,
  detectActionLoop,
  clearActionHistory,
  shouldAbortNoProgress,
  newUsage,
  accumulateUsage,
  type TokenUsage,
  type MessageWithCache,
} from './cuOptimizer.js';
import { startWatchdog, stopWatchdog, cancelSession, withActionTimeout, withTurnTimeout } from './cuWatchdog.js';
import { withRetry } from '../../auth/retryHelper.js';

const BETA = process.env['COMPUTER_USE_BETA'] ?? 'computer-use-2025-01-24';
const TOOL_TYPE = process.env['COMPUTER_USE_TOOL'] ?? 'computer_20250124';
const DISP_W = Number(process.env['COMPUTER_USE_WIDTH'] ?? 1280);
const DISP_H = Number(process.env['COMPUTER_USE_HEIGHT'] ?? 800);
const MAX_TURNS = Math.max(2, Number(process.env['COMPUTER_USE_MAX_TURNS'] ?? 14));
const HEADLESS = process.env['COMPUTER_USE_HEADLESS'] === 'true';

// Optimization flags (default ON, can disable via env)
const ENABLE_COMPRESSION = process.env['CU_COMPRESS_SCREENSHOTS'] !== 'false';
const ENABLE_PRUNING = process.env['CU_PRUNE_HISTORY'] !== 'false';
const ENABLE_CACHING = process.env['CU_PROMPT_CACHING'] !== 'false';
const KEEP_LAST_SHOTS = Number(process.env['CU_KEEP_LAST_SCREENSHOTS'] ?? 4);
const MAX_EMPTY_TURNS = Number(process.env['CU_MAX_EMPTY_TURNS'] ?? 3);

// Expose cancellation API
export { cancelSession as cancelAnthropicCuSession } from './cuWatchdog.js';

/** Check barato (sin cargar Playwright): env + API key. */
export const computerUseLiveEnabled = (): boolean =>
  process.env['COMPUTER_USE_LIVE'] === 'true' && !!env.anthropicApiKey && !env.anthropicApiKey.startsWith('sk-invalid');

/* ── Actuador (Playwright opcional) ──────────────────────────────────────── */

interface ActAction {
  action: string;
  coordinate?: [number, number];
  text?: string;
}
interface Actuator {
  width: number;
  height: number;
  screenshotB64: () => Promise<string>;
  perform: (a: ActAction) => Promise<{ note: string; x?: number; y?: number }>;
  close: () => Promise<void>;
}

interface PwPage {
  goto: (u: string) => Promise<unknown>;
  screenshot: (o?: unknown) => Promise<Buffer>;
  mouse: {
    move: (x: number, y: number) => Promise<unknown>;
    click: (x: number, y: number, o?: unknown) => Promise<unknown>;
    wheel: (x: number, y: number) => Promise<unknown>;
  };
  keyboard: { type: (t: string) => Promise<unknown>; press: (k: string) => Promise<unknown> };
  waitForTimeout: (ms: number) => Promise<unknown>;
}
interface PwBrowser {
  newPage: () => Promise<unknown>;
  close: () => Promise<void>;
}

const loadActuator = async (baseUrl: string): Promise<Actuator | null> => {
  try {
    const mod = await import(/* @vite-ignore */ 'playwright' as string).catch(() => null);
    const chromium = (mod as { chromium?: { launch: (o?: unknown) => Promise<PwBrowser> } } | null)?.chromium;
    if (!chromium) return null;
    const browser = await chromium.launch({ headless: HEADLESS });
    const page = (await browser.newPage()) as PwPage;
    await page.goto(baseUrl);
    let lastX = Math.round(DISP_W / 2);
    let lastY = Math.round(DISP_H / 2);
    return {
      width: DISP_W,
      height: DISP_H,
      screenshotB64: async (): Promise<string> => (await page.screenshot({ type: 'png' })).toString('base64'),
      perform: async (a): Promise<{ note: string; x?: number; y?: number }> => {
        const [x, y] = a.coordinate ?? [lastX, lastY];
        const description = `AnthropicCU ${a.action}${a.text ? `: "${a.text.slice(0, 40)}"` : ''} @ (${x}, ${y})`;

        const shotB64 = await page.screenshot({ type: 'png' }).then((b) => b.toString('base64'));
        const gateResult = await actionGate(
          `anthropic_${a.action}`,
          description,
          async () => {
            switch (a.action) {
              case 'mouse_move':
                lastX = x;
                lastY = y;
                await page.mouse.move(x, y);
                return { note: `Mover cursor a (${x}, ${y})`, x, y };
              case 'left_click':
              case 'double_click':
                lastX = x;
                lastY = y;
                await page.mouse.click(x, y, a.action === 'double_click' ? { clickCount: 2 } : undefined);
                return { note: `Click en (${x}, ${y})`, x, y };
              case 'type':
                await page.keyboard.type(a.text ?? '');
                return { note: `Tipear: ${a.text ?? ''}`, x: lastX, y: lastY };
              case 'key':
                await page.keyboard.press(a.text ?? 'Enter');
                return { note: `Tecla: ${a.text ?? 'Enter'}`, x: lastX, y: lastY };
              case 'scroll':
                await page.mouse.wheel(0, 600);
                return { note: 'Scroll', x: lastX, y: lastY };
              case 'cursor_position':
                return { note: 'Leer posición del cursor', x: lastX, y: lastY };
              default:
                return { note: `Acción ${a.action}`, x: lastX, y: lastY };
            }
          },
          {
            source: 'computer-use-anthropic',
            correlationId: `cu-anthropic-${Date.now()}`,
            actionCategory: 'api_request',
            screenshot: shotB64,
          },
        );

        if (!gateResult.ok) {
          return { note: `GlassBox bloqueó: ${gateResult.reason ?? 'sin razón'}`, x: lastX, y: lastY };
        }
        return gateResult.result as { note: string; x?: number; y?: number };
      },
      close: async (): Promise<void> => {
        try {
          await browser.close();
        } catch {
          /* ignore */
        }
      },
    };
  } catch {
    return null;
  }
};

export const isComputerUseLiveAvailable = async (): Promise<boolean> => {
  if (!computerUseLiveEnabled()) return false;
  const act = await loadActuator('about:blank');
  if (!act) return false;
  await act.close();
  return true;
};

/* ── Bucle agéntico de Anthropic Computer Use ───────────────────────────── */

interface BetaBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: { action?: string; coordinate?: [number, number]; text?: string };
}
interface BetaMsg {
  stop_reason: string | null;
  content: BetaBlock[];
}
type BetaMessages = {
  create: (body: unknown) => Promise<BetaMsg>;
};

/**
 * Corre la instrucción con Computer Use REAL, empujando eventos al teatro.
 * Devuelve true si llegó a correr en vivo; false si no estaba disponible.
 *
 * Optimizaciones aplicadas:
 *   - Image compression (JPEG 70% + resize a 1280px)        → ~80% menos bytes/imagen
 *   - Prompt caching (system + tool def)                     → ~90% menos input tokens turn 2+
 *   - History pruning (mantener últimas N screenshots)       → contexto no explota
 *   - Watchdog timeouts (acción/turn/sesión)                 → no se cuelga
 *   - Loop detection (acción repetida 3x = abort)            → no entra en loops
 *   - Adaptive abort (N turns sin progreso = stop)           → no gasta tokens en vano
 *   - Coordinate sanitization                                → no rompe Playwright
 *   - Retry exponencial para errores transitorios            → robusto a rate limits
 *   - Cancellation mid-run vía sessionId                     → emergency stop funciona
 *   - Token usage tracking + cost calculation                → métricas reales
 */
export const runAnthropicComputerUse = async (
  instruction: string,
  emit: (ev: CuEvent) => void,
  opts: { baseUrl?: string; sessionId?: string; abortSignal?: AbortSignal } = {},
): Promise<boolean> => {
  if (!computerUseLiveEnabled()) return false;
  const actuator = await loadActuator(opts.baseUrl ?? 'https://www.instagram.com');
  if (!actuator) return false;

  const betaMessages = (claude as unknown as { beta?: { messages?: BetaMessages } }).beta?.messages;
  if (!betaMessages) {
    await actuator.close();
    return false;
  }

  const sessionId = opts.sessionId ?? `cu-${Date.now()}`;
  const { isCancelled: wdCancelled } = startWatchdog(sessionId, {
    sessionTimeoutMs: 300_000,
    turnTimeoutMs: 60_000,
    actionTimeoutMs: 8_000,
  });

  // Permitir cancelación externa adicional
  if (opts.abortSignal) {
    opts.abortSignal.addEventListener('abort', () => cancelSession(sessionId, 'external-abort'));
  }

  emit({ kind: 'app-open', app: 'Navegador real (Computer Use)', note: `Ejecutando: "${instruction.slice(0, 90)}"` });

  const tool = {
    type: TOOL_TYPE,
    name: 'computer',
    display_width_px: actuator.width,
    display_height_px: actuator.height,
  };

  // System prompt cacheable
  const systemBlocks: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> = [
    {
      type: 'text',
      text: 'Sos un agente que opera una computadora para Instagram/creación de contenido. Trabajás paso a paso, sacás screenshot cuando necesitás ver la pantalla, y terminás cuando esté hecho. Sé EFICIENTE: minimizá acciones, no repitas screenshots innecesarios.',
    },
  ];
  const system = ENABLE_CACHING ? withCacheBreakpoint(systemBlocks) : systemBlocks;

  // Screenshot inicial comprimido
  const initialShot = await actuator.screenshotB64();
  const initialCompressed = ENABLE_COMPRESSION
    ? await compressScreenshot(initialShot, { maxWidth: DISP_W, jpegQuality: 70, forceJpeg: true })
    : { b64: initialShot, mediaType: 'image/png' as const, sizeBytes: initialShot.length, savedBytes: 0 };

  let messages: MessageWithCache[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: `Tarea: ${instruction}` },
        {
          type: 'image',
          source: { type: 'base64', media_type: initialCompressed.mediaType, data: initialCompressed.b64 },
        },
      ],
    },
  ];

  const usage: TokenUsage = newUsage();
  let ok = 0;
  let turn = 0;
  let consecutiveEmptyTurns = 0;
  let lastNoteForDedup = '';

  try {
    while (turn < MAX_TURNS) {
      if (wdCancelled() || opts.abortSignal?.aborted) {
        emit({ kind: 'act', step: turn, gesture: 'abort', target: 'session', narrate: 'Sesión cancelada' });
        break;
      }
      turn += 1;

      // Llamada con retry + timeout por turn
      const resp = await withTurnTimeout(
        sessionId,
        withRetry(
          () =>
            betaMessages.create({
              model: env.modelPrimary,
              max_tokens: 1400,
              betas: [BETA],
              tools: [tool],
              system,
              messages,
            }),
          { maxAttempts: 3, baseDelayMs: 1500, maxDelayMs: 15_000 },
          `cu-turn-${turn}`,
        ),
      );

      // Trackear usage si la API lo devuelve
      const respUsage = (
        resp as unknown as {
          usage?: {
            input_tokens?: number;
            output_tokens?: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
          };
        }
      ).usage;
      if (respUsage) {
        Object.assign(
          usage,
          accumulateUsage(usage, {
            inputTokens: respUsage.input_tokens ?? 0,
            outputTokens: respUsage.output_tokens ?? 0,
            cacheCreationTokens: respUsage.cache_creation_input_tokens ?? 0,
            cacheReadTokens: respUsage.cache_read_input_tokens ?? 0,
          }),
        );
      }

      messages.push({ role: 'assistant', content: resp.content });

      const toolUses = resp.content.filter((b) => b.type === 'tool_use');
      for (const b of resp.content) {
        if (b.type === 'text' && b.text?.trim()) {
          emit({ kind: 'act', step: turn, gesture: 'think', target: 'modelo', narrate: b.text.trim().slice(0, 220) });
        }
      }

      if (resp.stop_reason === 'end_turn' || toolUses.length === 0) {
        consecutiveEmptyTurns += 1;
        if (shouldAbortNoProgress(consecutiveEmptyTurns, MAX_EMPTY_TURNS)) {
          emit({
            kind: 'act',
            step: turn,
            gesture: 'auto-stop',
            target: 'sesión',
            narrate: `Sin acciones en ${consecutiveEmptyTurns} turns seguidos. Cerrando.`,
          });
          break;
        }
        if (resp.stop_reason === 'end_turn') break;
      } else {
        consecutiveEmptyTurns = 0;
      }

      // Procesar tool_use con timeout por acción + loop detection + coord clamp
      const toolResults: unknown[] = [];
      let abortDueToLoop = false;

      for (const tu of toolUses) {
        if (wdCancelled() || opts.abortSignal?.aborted) break;

        const a = tu.input ?? {};
        const action = a.action ?? 'screenshot';

        // Loop detection
        const loopCheck = detectActionLoop(sessionId, action, a.coordinate, a.text, turn);
        if (loopCheck.isLoop) {
          emit({
            kind: 'act',
            step: turn,
            gesture: 'loop-detected',
            target: 'agente',
            narrate: `Loop detectado: ${loopCheck.reason}. Abortando.`,
          });
          abortDueToLoop = true;
          break;
        }

        let note = `Acción: ${action}`;

        if (action !== 'screenshot') {
          // Sanitize coordinates
          const sanitizedCoord: [number, number] | undefined = a.coordinate
            ? clampCoordinate(a.coordinate[0], a.coordinate[1], actuator.width, actuator.height)
            : undefined;

          try {
            const r = await withActionTimeout(
              sessionId,
              actuator.perform({ action, coordinate: sanitizedCoord, text: a.text }),
            );
            note = r.note;
            if (typeof r.x === 'number' && typeof r.y === 'number') {
              emit({
                kind: 'cursor',
                x: Math.round((r.x / actuator.width) * 1000),
                y: Math.round((r.y / actuator.height) * 620),
                label: action,
              });
            }
            // Dedup repeated narrations
            if (note !== lastNoteForDedup) {
              emit({ kind: 'act', step: turn, gesture: action, target: 'pantalla real', narrate: note });
              lastNoteForDedup = note;
            }
            ok += 1;
          } catch (actErr) {
            note = `Acción falló: ${(actErr as Error).message}`;
            emit({ kind: 'act', step: turn, gesture: 'action-error', target: action, narrate: note });
          }
        }

        // Screenshot con compresión
        const rawB64 = await withActionTimeout(sessionId, actuator.screenshotB64(), 6000).catch(() => '');
        if (rawB64) {
          const compressed = ENABLE_COMPRESSION
            ? await compressScreenshot(rawB64, { maxWidth: DISP_W, jpegQuality: 70, forceJpeg: true })
            : { b64: rawB64, mediaType: 'image/png' as const, sizeBytes: rawB64.length, savedBytes: 0 };

          emit({ kind: 'screenshot', dataUri: `data:${compressed.mediaType};base64,${compressed.b64}` });
          emit({ kind: 'step-done', step: turn, status: 'ok', detail: note });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: [
              { type: 'image', source: { type: 'base64', media_type: compressed.mediaType, data: compressed.b64 } },
            ],
          });
        } else {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: [{ type: 'text', text: 'Screenshot failed to capture' }],
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });

      // Prune history para no explotar tokens
      if (ENABLE_PRUNING) {
        messages = pruneMessageHistory(messages, {
          keepLastScreenshots: KEEP_LAST_SHOTS,
          keepFirstNTurns: 1,
          maxTotalMessages: 40,
        });
      }

      if (abortDueToLoop) break;
    }
    emit({ kind: 'session-end', completed: true, ok, total: ok });
    log.success(
      `[CU-Live] OK (${ok} acciones, ${turn} turns, tokens: in=${usage.inputTokens} out=${usage.outputTokens} cache_read=${usage.cacheReadTokens} cost=$${usage.totalCostUsd.toFixed(4)})`,
    );
  } catch (err) {
    emit({
      kind: 'act',
      step: turn,
      gesture: 'error',
      target: 'computer-use',
      narrate: `Fallo: ${(err as Error).message}`,
    });
    emit({ kind: 'session-end', completed: false, ok, total: ok });
    log.warn(`[CU-Live] Falló: ${(err as Error).message}`);
  } finally {
    try {
      await actuator.close();
    } catch {
      /* ignore */
    }
    stopWatchdog(sessionId);
    clearActionHistory(sessionId);
  }
  return true;
};
