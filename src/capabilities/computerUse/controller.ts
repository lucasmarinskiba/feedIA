import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ContentBlock, MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import { claude } from '../../agent/claude.js';

// claude.messages.create with computer-use beta requires bypassing strict TS types
// because SDK ^0.32 beta types don't yet expose computer_20250124.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const claudeAny = claude as any;
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import { actionGate } from '../../glassbox/index.js';
import type { ComputerPlan, ComputerAction } from './planner.js';
import { resolveWithRoi, resolveDefault } from './computerVision.js';

export interface ComputerUseOptions {
  goal: string;
  context?: string;
  displayWidth?: number;
  displayHeight?: number;
  maxIterations?: number;
}

export interface ComputerUseResult {
  ok: boolean;
  summary: string;
  actionsExecuted: number;
  error?: string;
  finalScreenshotBase64?: string;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

const runPowerShell = (script: string, timeoutMs = 15000): string => {
  const scriptPath = join(tmpdir(), `fedia-ps-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
  writeFileSync(scriptPath, script, 'utf8');
  try {
    return execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
      timeout: timeoutMs,
      windowsHide: true,
    })
      .toString()
      .trim();
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch {
      /* ignore */
    }
  }
};

export const getScreenDimensions = (): ScreenDimensions => {
  try {
    const output = runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
Write-Output "$($screen.Width)x$($screen.Height)"
`);
    const [w, h] = output.split('x').map(Number);
    return { width: w || 1920, height: h || 1080 };
  } catch {
    return { width: 1920, height: 1080 };
  }
};

export const takeScreenshot = (): { path: string; base64: string } => {
  const path = join(tmpdir(), `fedia-shot-${Date.now()}.png`);
  runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save("${path.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`);
  const base64 = readFileSync(path).toString('base64');
  try {
    unlinkSync(path);
  } catch {
    /* ignore */
  }
  return { path, base64 };
};

export const moveMouse = (x: number, y: number): void => {
  runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(x)}, ${Math.round(y)})
`);
};

export const clickMouse = (
  x: number,
  y: number,
  button: 'left' | 'right' | 'middle' = 'left',
  double = false,
): void => {
  const downFlag = button === 'right' ? '0x0008' : button === 'middle' ? '0x0020' : '0x0002';
  const upFlag = button === 'right' ? '0x0010' : button === 'middle' ? '0x0040' : '0x0004';
  const clicks = double ? 2 : 1;
  runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FediaMouseOps {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(x)}, ${Math.round(y)})
Start-Sleep -Milliseconds 80
for ($i = 0; $i -lt ${clicks}; $i++) {
    [FediaMouseOps]::mouse_event(${downFlag}, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 40
    [FediaMouseOps]::mouse_event(${upFlag}, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 40
}
`);
};

export const typeText = (text: string): void => {
  // Use clipboard paste for reliability with special characters
  const escaped = text.replace(/'/g, "''");
  runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Clipboard]::SetText('${escaped}')
[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 100
`);
};

export const pressKey = (key: string): void => {
  const keyMap: Record<string, string> = {
    Return: '{ENTER}',
    enter: '{ENTER}',
    Tab: '{TAB}',
    Escape: '{ESC}',
    BackSpace: '{BACKSPACE}',
    Delete: '{DELETE}',
    Up: '{UP}',
    Down: '{DOWN}',
    Left: '{LEFT}',
    Right: '{RIGHT}',
    Page_Up: '{PGUP}',
    Page_Down: '{PGDN}',
    Home: '{HOME}',
    End: '{END}',
    F5: '{F5}',
    space: ' ',
    'ctrl+a': '^a',
    'ctrl+c': '^c',
    'ctrl+v': '^v',
    'ctrl+z': '^z',
    'ctrl+t': '^t',
    'ctrl+l': '^l',
    'ctrl+w': '^w',
  };
  const mapped = keyMap[key] ?? `{${key.toUpperCase()}}`;
  runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${mapped.replace(/'/g, "''")}')
`);
};

export const scrollAt = (x: number, y: number, direction: 'up' | 'down', clicks = 3): void => {
  const delta = direction === 'up' ? clicks * 120 : -(clicks * 120);
  runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FediaScrollOps {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    public const uint MOUSEEVENTF_WHEEL = 0x0800;
}
"@
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(x)}, ${Math.round(y)})
Start-Sleep -Milliseconds 60
[FediaScrollOps]::mouse_event([FediaScrollOps]::MOUSEEVENTF_WHEEL, 0, 0, [uint32]${delta}, 0)
`);
};

const executeComputerAction = async (
  action: Record<string, unknown>,
  sessionGoal: string,
): Promise<{ base64?: string; error?: string; blocked?: boolean }> => {
  try {
    const type = action['type'] as string;

    if (type === 'screenshot') {
      const shot = takeScreenshot();
      return { base64: shot.base64 };
    }

    // GlassBox gate para acciones físicas (no screenshots)
    const actionDescription = `ComputerUse [${type}]: ${JSON.stringify(action).slice(0, 120)}`;
    const screenshot = type === 'screenshot' ? undefined : takeScreenshot().base64;
    const gateResult = await actionGate(
      `computer_${type}`,
      actionDescription,
      async () => {
        if (type === 'mouse_move') {
          const [x, y] = action['coordinate'] as [number, number];
          moveMouse(x, y);
          return {};
        }

        if (type === 'left_click') {
          const [x, y] = action['coordinate'] as [number, number];
          clickMouse(x, y, 'left');
          return {};
        }

        if (type === 'right_click') {
          const [x, y] = action['coordinate'] as [number, number];
          clickMouse(x, y, 'right');
          return {};
        }

        if (type === 'middle_click') {
          const [x, y] = action['coordinate'] as [number, number];
          clickMouse(x, y, 'middle');
          return {};
        }

        if (type === 'double_click') {
          const [x, y] = action['coordinate'] as [number, number];
          clickMouse(x, y, 'left', true);
          return {};
        }

        if (type === 'left_click_drag') {
          const [sx, sy] = action['start_coordinate'] as [number, number];
          const [ex, ey] = action['coordinate'] as [number, number];
          runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FediaDragOps {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(sx)}, ${Math.round(sy)})
Start-Sleep -Milliseconds 60
[FediaDragOps]::mouse_event(0x0002, 0, 0, 0, 0)
Start-Sleep -Milliseconds 80
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(ex)}, ${Math.round(ey)})
Start-Sleep -Milliseconds 60
[FediaDragOps]::mouse_event(0x0004, 0, 0, 0, 0)
`);
          return {};
        }

        if (type === 'type') {
          typeText(action['text'] as string);
          return {};
        }

        if (type === 'key') {
          pressKey(action['text'] as string);
          return {};
        }

        if (type === 'scroll') {
          const [x, y] = action['coordinate'] as [number, number];
          const dir = (action['direction'] as string) === 'up' ? 'up' : 'down';
          scrollAt(x, y, dir, (action['scroll_direction_count'] as number) ?? 3);
          return {};
        }

        if (type === 'wait') {
          const ms = typeof action['duration'] === 'number' ? action['duration'] : 1000;
          execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { timeout: ms + 2000 });
          return {};
        }

        return { error: `Acción de computadora desconocida: ${type}` };
      },
      {
        source: 'computer-use-desktop',
        correlationId: `cu-${sessionGoal.slice(0, 30)}-${Date.now()}`,
        actionCategory: 'api_request',
        screenshot,
      },
    );

    if (!gateResult.ok) {
      return { error: gateResult.reason ?? 'Bloqueado por GlassBox', blocked: gateResult.blocked };
    }
    return gateResult.result as { base64?: string; error?: string };
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Sesión de uso de computadora con Claude como piloto.
 * Claude recibe capturas de pantalla y decide qué acciones tomar.
 */
export const runComputerUseSession = async (
  _brand: BrandProfile,
  opts: ComputerUseOptions,
): Promise<ComputerUseResult> => {
  const dims = getScreenDimensions();
  const displayWidth = opts.displayWidth ?? dims.width;
  const displayHeight = opts.displayHeight ?? dims.height;
  const maxIter = opts.maxIterations ?? 20;
  let actionsExecuted = 0;
  let finalBase64: string | undefined;

  const systemPrompt = `Sos FeedIA Computer Agent, especializado en controlar Instagram en Windows 11 como un community manager humano experto.

${opts.context ? `${opts.context}\n` : ''}

## Principios de operación (CRÍTICOS)

### Comportamiento humano
- Movés el cursor de forma natural (no teletransportación)
- Esperás 1-3 segundos entre acciones para que la UI responda
- Leés la pantalla antes de hacer clic — nunca hacés clic "a ciegas"
- Si la página está cargando, esperás con wait() antes de continuar
- Si un elemento no está visible, hacés scroll para encontrarlo

### Navegación en Instagram Desktop
- La barra de navegación está en el LADO IZQUIERDO de la pantalla
- Ícono de CASA = Feed | LUPA = Buscar | BRÚJULA = Explorar | CLAQUETA = Reels
- BURBUJA/AVIÓN = DMs | CORAZÓN = Notificaciones | CRUZ(+)/CREAR = Nuevo contenido | CÍRCULO = Perfil
- Para abrir una URL: Ctrl+L en el navegador → escribir la URL → Enter
- Para buscar: clic en la lupa → escribir en el campo → seleccionar resultado
- Las stories se ven haciendo clic en los círculos de la barra de historias (arriba del feed)

### Verificación antes de actuar
- Siempre tomá un screenshot ANTES de hacer clic para confirmar que ves el elemento
- Después de cada acción importante, tomá un screenshot para verificar el resultado
- Si una acción falla, intentá el camino alternativo. Si falla 2 veces, reportar error.

### Seguridad (reglas absolutas — NUNCA violar)
- Nunca eliminar cuentas, posts ya publicados, o conversaciones de DMs
- Nunca publicar contenido sin haber verificado el texto completo primero
- Si aparece un CAPTCHA, VERIFICACIÓN DE IDENTIDAD, o solicitud de contraseña → DETENER y reportar
- Si hay un error de Instagram (rate limit, cuenta suspendida, verificación pendiente) → DETENER y reportar
- Nunca acceder a configuraciones de pago o facturación

### Para publicar contenido
1. Verificar que el archivo de media existe antes de intentar subirlo
2. Copiar el caption exactamente como se proporciona (sin modificar hashtags ni texto)
3. Verificar el post ANTES de hacer clic en "Compartir/Publicar"
4. Esperar la confirmación de publicación exitosa
5. Tomar screenshot del post publicado como evidencia

Sistema operativo: Windows 11 | Resolución: ${displayWidth}x${displayHeight}
Si Instagram no está abierto: abrir Chrome → navegar a instagram.com`;

  const initialShot = takeScreenshot();
  finalBase64 = initialShot.base64;

  const messages: MessageParam[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Objetivo: ${opts.goal}\n\nEsta es la pantalla actual:`,
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: initialShot.base64,
          },
        },
      ],
    },
  ];

  for (let iter = 0; iter < maxIter; iter++) {
    log.debug(`[ComputerUse] Iteración ${iter + 1}/${maxIter}`);

    // SDK ^0.32 beta types don't expose computer_20250124 yet — using claudeAny to bypass
    const response = await claudeAny.beta.messages.create({
      model: env.modelPrimary,
      max_tokens: 4096,
      system: systemPrompt,
      betas: ['computer-use-2025-01-24'],
      tools: [
        {
          type: 'computer_20250124',
          name: 'computer',
          display_width_px: displayWidth,
          display_height_px: displayHeight,
          display_number: 1,
        },
      ],
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalText = (response.content as any[])
        .filter((b: ContentBlock) => b.type === 'text')
        .map((b: Extract<ContentBlock, { type: 'text' }>) => b.text)
        .join('\n');
      log.success(`[ComputerUse] Tarea completada en ${iter + 1} iteraciones, ${actionsExecuted} acciones`);
      return {
        ok: true,
        summary: finalText || `Tarea completada: ${opts.goal}`,
        actionsExecuted,
        finalScreenshotBase64: finalBase64,
      };
    }

    if (response.stop_reason !== 'tool_use') {
      log.warn(`[ComputerUse] stop_reason inesperado: ${response.stop_reason}`);
      break;
    }

    const toolResults: MessageParam['content'] = [];

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const action = block.input as Record<string, unknown>;
      log.step(`[ComputerUse] → ${String(action['type'] ?? block.name)}`);

      const result = await executeComputerAction(action, opts.goal);
      actionsExecuted += 1;

      if (result.base64) {
        finalBase64 = result.base64;
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: result.base64 },
            },
          ],
        } as unknown as never);
      } else if (result.error) {
        log.error(`[ComputerUse] Error en acción: ${result.error}`);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Error: ${result.error}`,
          is_error: true,
        } as unknown as never);
      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: 'Acción ejecutada correctamente.',
        } as unknown as never);
      }

      // Human-like pause between actions: 600ms-2000ms random to avoid bot detection
      const actionType = String(action['type'] ?? '');
      const pauseMs =
        actionType === 'screenshot'
          ? 300 // screenshots = rápido
          : actionType === 'left_click' || actionType === 'right_click'
            ? 800 + Math.random() * 1200 // clicks = 800-2000ms
            : actionType === 'type'
              ? 400 + Math.random() * 600 // typing = 400-1000ms
              : actionType === 'scroll'
                ? 600 + Math.random() * 800 // scroll = 600-1400ms
                : 500 + Math.random() * 700; // otros = 500-1200ms
      await new Promise<void>((r) => setTimeout(r, pauseMs));
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return {
    ok: false,
    summary: `[ComputerUse] Alcanzó el máximo de iteraciones (${maxIter}) sin completar: ${opts.goal}`,
    actionsExecuted,
    finalScreenshotBase64: finalBase64,
  };
};

/* ── Desktop plan executor (executes a ComputerPlan on real Windows desktop) ─ */

export interface DesktopExecResult {
  ok: boolean;
  planInstruction: string;
  steps: Array<{ step: number; gesture: string; status: 'ok' | 'failed'; detail?: string }>;
  error?: string;
}

export const executePlanOnDesktop = async (plan: ComputerPlan): Promise<DesktopExecResult> => {
  const steps: DesktopExecResult['steps'] = [];

  for (const a of plan.actions) {
    try {
      const screenshot = takeScreenshot().base64;
      const gateResult = await actionGate(
        `desktop_${a.gesture}`,
        `${a.humanAction} (target: ${a.targetLabel})`,
        async () => {
          await runDesktopAction(a);
        },
        {
          source: 'computer-use-desktop-plan',
          correlationId: `cu-desktop-${Date.now()}`,
          actionCategory: 'api_request',
          screenshot,
        },
      );

      if (!gateResult.ok) {
        steps.push({
          step: a.step,
          gesture: a.gesture,
          status: 'failed',
          detail: `GlassBox: ${gateResult.reason ?? 'bloqueado'}`,
        });
      } else {
        steps.push({ step: a.step, gesture: a.gesture, status: 'ok', detail: a.humanAction });
      }

      // Human-like pause
      await new Promise<void>((r) => setTimeout(r, Math.min(a.pacingMs, 3000)));
    } catch (err) {
      steps.push({ step: a.step, gesture: a.gesture, status: 'failed', detail: (err as Error).message });
    }
  }

  const allOk = steps.every((s) => s.status === 'ok');
  return {
    ok: allOk,
    planInstruction: plan.instruction,
    steps,
    error: allOk ? undefined : `${steps.filter((s) => s.status === 'failed').length}/${steps.length} pasos fallaron`,
  };
};

const runDesktopAction = async (a: ComputerAction): Promise<void> => {
  const { getTarget } = await import('./uiMap.js');
  const target = getTarget(a.targetId);

  // Resolve coordinates: ROI for known targets, default for unknown
  let x = 0,
    y = 0;
  if (target) {
    const roi = resolveWithRoi(target);
    if (roi) {
      x = roi.x;
      y = roi.y;
    } else {
      const def = resolveDefault();
      x = def.x;
      y = def.y;
    }
  } else {
    const def = resolveDefault();
    x = def.x;
    y = def.y;
  }

  switch (a.gesture) {
    case 'navigate': {
      // Desktop: Ctrl+L → type URL → Enter
      pressKey('ctrl+l');
      await new Promise<void>((r) => setTimeout(r, 300));
      typeText(a.url ?? 'https://instagram.com');
      await new Promise<void>((r) => setTimeout(r, 200));
      pressKey('Return');
      await new Promise<void>((r) => setTimeout(r, 1500));
      break;
    }
    case 'click': {
      clickMouse(x, y, 'left');
      break;
    }
    case 'double-click': {
      clickMouse(x, y, 'left', true);
      break;
    }
    case 'type': {
      typeText(a.text ?? '');
      break;
    }
    case 'scroll': {
      scrollAt(x, y, 'down', 3);
      break;
    }
    case 'hover': {
      moveMouse(x, y);
      break;
    }
    case 'press': {
      pressKey('Return');
      break;
    }
    case 'wait': {
      await new Promise<void>((r) => setTimeout(r, 1000));
      break;
    }
    default:
      log.warn(`[DesktopAction] Gesto no soportado: ${a.gesture}`);
  }
};
