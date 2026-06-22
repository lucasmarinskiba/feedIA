/**
 * App Launcher de FeedIA — abre/cierra aplicaciones de escritorio programáticamente.
 *
 * Permite al sistema Computer Use empezar workflows desde cero: abre Chrome,
 * navega a Canva, abre Photoshop, lanza Figma, etc. — todo sin asumir nada del
 * estado inicial del escritorio.
 *
 * Soporta Windows (default), macOS y Linux.
 */

import { execSync, spawn } from 'node:child_process';
import { platform } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { takeScreenshot } from './controller.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type SupportedApp =
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'brave'
  | 'safari'
  | 'canva-desktop'
  | 'photoshop'
  | 'figma-desktop'
  | 'paint'
  | 'explorer' // file explorer
  | 'terminal'
  | 'notepad'
  | 'screen-recorder';

export type OS = 'win32' | 'darwin' | 'linux';

export interface LaunchOptions {
  url?: string; // si app es navegador
  filePath?: string; // archivo a abrir
  newWindow?: boolean; // forzar ventana nueva
  fullscreen?: boolean;
  waitForReadyMs?: number; // tiempo a esperar después de lanzar
  args?: string[]; // args adicionales al ejecutable
}

export interface LaunchResult {
  ok: boolean;
  app: SupportedApp;
  os: OS;
  pid?: number;
  screenshotPath?: string;
  durationMs: number;
  command: string;
  error?: string;
}

export interface CloseResult {
  ok: boolean;
  app: SupportedApp;
  closedCount: number;
  error?: string;
}

// ── Detección de OS y rutas conocidas ────────────────────────────────────────

const getOS = (): OS => platform() as OS;

const COMMON_WIN_PATHS: Record<SupportedApp, string[]> = {
  chrome: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env['LOCALAPPDATA'] ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
  ],
  edge: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  firefox: ['C:\\Program Files\\Mozilla Firefox\\firefox.exe', 'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'],
  brave: [
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    join(process.env['LOCALAPPDATA'] ?? '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
  ],
  safari: [],
  'canva-desktop': [
    join(process.env['LOCALAPPDATA'] ?? '', 'Programs\\Canva\\Canva.exe'),
    join(process.env['LOCALAPPDATA'] ?? '', 'Canva\\Canva.exe'),
  ],
  photoshop: [
    'C:\\Program Files\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe',
    'C:\\Program Files\\Adobe\\Adobe Photoshop 2023\\Photoshop.exe',
    'C:\\Program Files\\Adobe\\Adobe Photoshop 2025\\Photoshop.exe',
  ],
  'figma-desktop': [join(process.env['LOCALAPPDATA'] ?? '', 'Figma\\Figma.exe')],
  paint: ['C:\\Windows\\System32\\mspaint.exe'],
  explorer: ['C:\\Windows\\explorer.exe'],
  terminal: ['C:\\Windows\\System32\\cmd.exe', 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'],
  notepad: ['C:\\Windows\\System32\\notepad.exe'],
  'screen-recorder': [],
};

export const findExecutablePath = (app: SupportedApp): string | null => {
  const os = getOS();
  if (os !== 'win32') return null;
  const candidates = COMMON_WIN_PATHS[app] ?? [];
  for (const path of candidates) {
    if (path && existsSync(path)) return path;
  }
  return null;
};

const isAppRunning = (app: SupportedApp): boolean => {
  const os = getOS();
  try {
    if (os === 'win32') {
      const processNames: Record<SupportedApp, string> = {
        chrome: 'chrome.exe',
        edge: 'msedge.exe',
        firefox: 'firefox.exe',
        brave: 'brave.exe',
        safari: 'safari.exe',
        'canva-desktop': 'Canva.exe',
        photoshop: 'Photoshop.exe',
        'figma-desktop': 'Figma.exe',
        paint: 'mspaint.exe',
        explorer: 'explorer.exe',
        terminal: 'cmd.exe',
        notepad: 'notepad.exe',
        'screen-recorder': 'OBS.exe',
      };
      const name = processNames[app];
      if (!name) return false;
      const result = execSync(`tasklist /FI "IMAGENAME eq ${name}" /FO CSV /NH`, { encoding: 'utf8' });
      return result.includes(name);
    }
    if (os === 'darwin') {
      const result = execSync(`pgrep -i "${app}"`, { encoding: 'utf8' });
      return result.trim().length > 0;
    }
    if (os === 'linux') {
      const result = execSync(`pgrep -i "${app}"`, { encoding: 'utf8' });
      return result.trim().length > 0;
    }
  } catch {
    return false;
  }
  return false;
};

// ── Launch ────────────────────────────────────────────────────────────────────

export const launchApp = async (app: SupportedApp, options: LaunchOptions = {}): Promise<LaunchResult> => {
  const start = Date.now();
  const os = getOS();
  let command = '';

  try {
    let pid: number | undefined;

    if (os === 'win32') {
      // Caso especial: navegadores con URL
      if ((app === 'chrome' || app === 'edge' || app === 'firefox' || app === 'brave') && options.url) {
        const exe = findExecutablePath(app);
        if (!exe) {
          // Fallback: usar 'start' y dejar que Windows resuelva
          const browser = app === 'edge' ? 'microsoft-edge' : app;
          command = `start ${browser} "${options.url}"`;
          execSync(command, { shell: 'cmd.exe' });
        } else {
          const args: string[] = [];
          if (options.newWindow) args.push('--new-window');
          if (options.fullscreen) args.push('--start-fullscreen');
          args.push(...(options.args ?? []));
          args.push(options.url);
          const child = spawn(exe, args, { detached: true, stdio: 'ignore' });
          child.unref();
          pid = child.pid;
          command = `${exe} ${args.join(' ')}`;
        }
      }
      // Apps con filePath
      else if (options.filePath) {
        const exe = findExecutablePath(app);
        if (exe) {
          const child = spawn(exe, [...(options.args ?? []), options.filePath], { detached: true, stdio: 'ignore' });
          child.unref();
          pid = child.pid;
          command = `${exe} ${options.filePath}`;
        } else {
          command = `start "" "${options.filePath}"`;
          execSync(command, { shell: 'cmd.exe' });
        }
      }
      // Otras apps por nombre
      else {
        const exe = findExecutablePath(app);
        if (exe) {
          const child = spawn(exe, options.args ?? [], { detached: true, stdio: 'ignore' });
          child.unref();
          pid = child.pid;
          command = exe;
        } else {
          // Fallback con start
          command = `start ${app}`;
          execSync(command, { shell: 'cmd.exe' });
        }
      }
    } else if (os === 'darwin') {
      if (app === 'chrome') command = `open -a "Google Chrome"${options.url ? ` "${options.url}"` : ''}`;
      else if (app === 'safari') command = `open -a "Safari"${options.url ? ` "${options.url}"` : ''}`;
      else if (app === 'edge') command = `open -a "Microsoft Edge"${options.url ? ` "${options.url}"` : ''}`;
      else if (app === 'firefox') command = `open -a "Firefox"${options.url ? ` "${options.url}"` : ''}`;
      else command = `open -a "${app}"${options.filePath ? ` "${options.filePath}"` : ''}`;
      execSync(command);
    } else {
      // Linux
      const args: string[] = [];
      if (options.url) args.push(options.url);
      else if (options.filePath) args.push(options.filePath);
      command = `${app} ${args.join(' ')}`;
      const child = spawn(app, args, { detached: true, stdio: 'ignore' });
      child.unref();
      pid = child.pid;
    }

    // Esperar a que la app esté lista
    const waitMs = options.waitForReadyMs ?? 3000;
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));

    // Screenshot post-launch
    let screenshotPath: string | undefined;
    try {
      const shot = takeScreenshot();
      screenshotPath = shot.path;
    } catch (err) {
      log.debug(`[AppLauncher] No se pudo capturar screenshot: ${(err as Error).message}`);
    }

    log.info(`[AppLauncher] ${app} lanzado${options.url ? ` con URL ${options.url}` : ''} (PID ${pid ?? 'detached'})`);

    return {
      ok: true,
      app,
      os,
      pid,
      screenshotPath,
      durationMs: Date.now() - start,
      command,
    };
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[AppLauncher] Falló lanzar ${app}: ${msg}`);
    return {
      ok: false,
      app,
      os,
      durationMs: Date.now() - start,
      command,
      error: msg,
    };
  }
};

// ── Close ─────────────────────────────────────────────────────────────────────

export const closeApp = (app: SupportedApp): CloseResult => {
  const os = getOS();
  try {
    if (os === 'win32') {
      const processName: Record<SupportedApp, string> = {
        chrome: 'chrome.exe',
        edge: 'msedge.exe',
        firefox: 'firefox.exe',
        brave: 'brave.exe',
        safari: 'safari.exe',
        'canva-desktop': 'Canva.exe',
        photoshop: 'Photoshop.exe',
        'figma-desktop': 'Figma.exe',
        paint: 'mspaint.exe',
        explorer: 'explorer.exe',
        terminal: 'cmd.exe',
        notepad: 'notepad.exe',
        'screen-recorder': 'OBS.exe',
      };
      const name = processName[app];
      if (!name) return { ok: false, app, closedCount: 0, error: 'app sin process name conocido' };
      execSync(`taskkill /IM "${name}" /F`, { stdio: 'ignore' });
      log.info(`[AppLauncher] ${app} cerrado`);
      return { ok: true, app, closedCount: 1 };
    }
    if (os === 'darwin') {
      execSync(`osascript -e 'quit app "${app}"'`);
      return { ok: true, app, closedCount: 1 };
    }
    if (os === 'linux') {
      execSync(`pkill -i "${app}"`);
      return { ok: true, app, closedCount: 1 };
    }
  } catch (err) {
    return { ok: false, app, closedCount: 0, error: (err as Error).message };
  }
  return { ok: false, app, closedCount: 0, error: 'OS no soportado' };
};

// ── Helpers de alto nivel ─────────────────────────────────────────────────────

export const openBrowserWithUrl = async (
  url: string,
  browser: 'chrome' | 'edge' | 'firefox' | 'brave' = 'chrome',
): Promise<LaunchResult> => launchApp(browser, { url, waitForReadyMs: 4000 });

export const openCanva = async (templateUrl?: string, browser: 'chrome' | 'edge' = 'chrome'): Promise<LaunchResult> =>
  launchApp(browser, { url: templateUrl ?? 'https://www.canva.com/', waitForReadyMs: 5000 });

export const openFigma = async (designUrl?: string, browser: 'chrome' | 'edge' = 'chrome'): Promise<LaunchResult> =>
  launchApp(browser, { url: designUrl ?? 'https://www.figma.com/', waitForReadyMs: 5000 });

export const openPhotopea = async (browser: 'chrome' | 'edge' = 'chrome'): Promise<LaunchResult> =>
  launchApp(browser, { url: 'https://www.photopea.com/', waitForReadyMs: 5000 });

export const openInstagramWeb = async (browser: 'chrome' | 'edge' = 'chrome'): Promise<LaunchResult> =>
  launchApp(browser, { url: 'https://www.instagram.com/', waitForReadyMs: 4000 });

export const ensureAppRunning = async (
  app: SupportedApp,
  options: LaunchOptions = {},
): Promise<{ wasRunning: boolean; result: LaunchResult }> => {
  if (isAppRunning(app)) {
    log.debug(`[AppLauncher] ${app} ya está corriendo`);
    return {
      wasRunning: true,
      result: { ok: true, app, os: getOS(), durationMs: 0, command: 'already-running' },
    };
  }
  const result = await launchApp(app, options);
  return { wasRunning: false, result };
};

// ── Status ────────────────────────────────────────────────────────────────────

export const getAppStatus = (
  app: SupportedApp,
): {
  isRunning: boolean;
  isInstalled: boolean;
  executablePath: string | null;
} => ({
  isRunning: isAppRunning(app),
  isInstalled: findExecutablePath(app) !== null,
  executablePath: findExecutablePath(app),
});

export const listInstalledApps = (): Array<{ app: SupportedApp; isInstalled: boolean; isRunning: boolean }> => {
  const apps: SupportedApp[] = [
    'chrome',
    'edge',
    'firefox',
    'brave',
    'canva-desktop',
    'photoshop',
    'figma-desktop',
    'paint',
    'explorer',
    'notepad',
  ];
  return apps.map((app) => ({
    app,
    isInstalled: findExecutablePath(app) !== null,
    isRunning: isAppRunning(app),
  }));
};

// ── Bring window to front ─────────────────────────────────────────────────────

export const focusApp = (app: SupportedApp): { ok: boolean; error?: string } => {
  const os = getOS();
  try {
    if (os === 'win32') {
      const processName: Record<string, string> = {
        chrome: 'chrome',
        edge: 'msedge',
        firefox: 'firefox',
        brave: 'brave',
        'canva-desktop': 'Canva',
        photoshop: 'Photoshop',
        'figma-desktop': 'Figma',
        paint: 'mspaint',
        notepad: 'notepad',
        explorer: 'explorer',
      };
      const procName = processName[app];
      if (!procName) return { ok: false, error: 'app sin process name' };
      // Usar PowerShell para activar ventana
      const psCommand = `(Get-Process -Name "${procName}" -ErrorAction SilentlyContinue | Select-Object -First 1).MainWindowHandle | ForEach-Object { Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W { [DllImport(\\"user32.dll\\")] public static extern bool SetForegroundWindow(IntPtr h); }'; [W]::SetForegroundWindow($_) }`;
      execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'ignore' });
      return { ok: true };
    }
    if (os === 'darwin') {
      execSync(`osascript -e 'tell application "${app}" to activate'`);
      return { ok: true };
    }
    if (os === 'linux') {
      execSync(`wmctrl -a "${app}"`);
      return { ok: true };
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  return { ok: false, error: 'OS no soportado' };
};
