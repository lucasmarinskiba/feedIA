/**
 * Android Emulator de FeedIA — soporte para BlueStacks/MEmu/LDPlayer/Genymotion.
 *
 * Permite a FeedIA controlar la app móvil de Instagram (que tiene features que
 * la versión web no tiene: collab posts, stickers de Stories avanzados, Reels
 * con audio nativo, etc.) usando ADB sobre un emulador Android en el desktop.
 *
 * Soporta:
 *   - BlueStacks (más popular, ADB en puerto 5555)
 *   - MEmu (puerto 21503)
 *   - LDPlayer (puerto 5555+)
 *   - Genymotion (puerto 5555)
 *   - Emuladores AVD nativos
 */

import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import { launchApp } from './appLauncher.js';

const EMULATOR_STORE = join(process.cwd(), 'data', 'android-emulators.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EmulatorType = 'bluestacks' | 'memu' | 'ldplayer' | 'genymotion' | 'avd' | 'nox';

export interface EmulatorInstance {
  id: string;
  type: EmulatorType;
  name: string;
  adbHost: string; // ej: "127.0.0.1"
  adbPort: number; // ej: 5555
  deviceId: string; // "127.0.0.1:5555"
  isRunning: boolean;
  installedApps: string[]; // package names
  lastUsedAt?: string;
}

interface EmulatorStore {
  instances: EmulatorInstance[];
  defaultEmulatorId?: string;
  lastUpdated: string;
}

const DEFAULT_STORE: EmulatorStore = { instances: [], lastUpdated: new Date().toISOString() };

const DEFAULT_PORTS: Record<EmulatorType, number> = {
  bluestacks: 5555,
  memu: 21503,
  ldplayer: 5555,
  genymotion: 5555,
  avd: 5554,
  nox: 62001,
};

const KNOWN_INSTALL_PATHS: Record<EmulatorType, string[]> = {
  bluestacks: [
    'C:\\Program Files\\BlueStacks_nxt\\HD-Player.exe',
    'C:\\Program Files\\BlueStacks\\HD-Player.exe',
    'C:\\Program Files (x86)\\BlueStacks_nxt\\HD-Player.exe',
  ],
  memu: ['C:\\Program Files\\Microvirt\\MEmu\\MEmu.exe'],
  ldplayer: ['C:\\LDPlayer\\LDPlayer9\\dnplayer.exe', 'C:\\Program Files\\LDPlayer\\LDPlayer9\\dnplayer.exe'],
  genymotion: ['C:\\Program Files\\Genymobile\\Genymotion\\genymotion.exe'],
  avd: [],
  nox: ['C:\\Program Files (x86)\\Nox\\bin\\Nox.exe'],
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): EmulatorStore => {
  try {
    ensureDir();
    if (!existsSync(EMULATOR_STORE)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(EMULATOR_STORE, 'utf8')) as EmulatorStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: EmulatorStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(EMULATOR_STORE, JSON.stringify(store, null, 2), 'utf8');
};

// ── Detección de instalación ──────────────────────────────────────────────────

export const detectInstalledEmulators = (): Array<{ type: EmulatorType; path: string; isInstalled: boolean }> => {
  const types: EmulatorType[] = ['bluestacks', 'memu', 'ldplayer', 'genymotion', 'avd', 'nox'];
  return types.map((type) => {
    const paths = KNOWN_INSTALL_PATHS[type] ?? [];
    const found = paths.find((p) => existsSync(p));
    return { type, path: found ?? '', isInstalled: Boolean(found) };
  });
};

// ── ADB helpers ───────────────────────────────────────────────────────────────

const isAdbAvailable = (): boolean => {
  try {
    execSync('adb version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const adbExec = (deviceId: string, command: string, timeoutMs = 15000): string => {
  if (env.dryRun) {
    log.warn(`[AndroidEmulator] DRY RUN ADB: ${command}`);
    return '[DRY RUN]';
  }
  try {
    return execSync(`adb -s ${deviceId} ${command}`, { encoding: 'utf8', timeout: timeoutMs }).trim();
  } catch (err) {
    log.warn(`[AndroidEmulator] adb error: ${(err as Error).message.slice(0, 200)}`);
    return '';
  }
};

export const adbConnect = (host: string, port: number): boolean => {
  if (!isAdbAvailable()) {
    log.warn('[AndroidEmulator] ADB no está instalado. Instalar Android Platform Tools.');
    return false;
  }
  try {
    const result = execSync(`adb connect ${host}:${port}`, { encoding: 'utf8', timeout: 10000 });
    return result.includes('connected') || result.includes('already connected');
  } catch (err) {
    log.warn(`[AndroidEmulator] adb connect ${host}:${port} falló: ${(err as Error).message}`);
    return false;
  }
};

export const listAdbDevices = (): Array<{ deviceId: string; status: 'device' | 'offline' | 'unauthorized' }> => {
  if (!isAdbAvailable()) return [];
  try {
    const output = execSync('adb devices', { encoding: 'utf8' });
    const lines = output.split('\n').slice(1);
    const devices: Array<{ deviceId: string; status: 'device' | 'offline' | 'unauthorized' }> = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [id, status] = trimmed.split(/\s+/);
      if (id && status) devices.push({ deviceId: id, status: status as 'device' | 'offline' | 'unauthorized' });
    }
    return devices;
  } catch {
    return [];
  }
};

// ── Registro y launch de emulador ─────────────────────────────────────────────

export const registerEmulator = (input: {
  type: EmulatorType;
  name: string;
  adbHost?: string;
  adbPort?: number;
}): EmulatorInstance => {
  const store = loadStore();
  const id = `emu-${Date.now()}-${Math.floor(Math.random() * 999)}`;
  const adbHost = input.adbHost ?? '127.0.0.1';
  const adbPort = input.adbPort ?? DEFAULT_PORTS[input.type];
  const instance: EmulatorInstance = {
    id,
    type: input.type,
    name: input.name,
    adbHost,
    adbPort,
    deviceId: `${adbHost}:${adbPort}`,
    isRunning: false,
    installedApps: [],
  };
  store.instances.push(instance);
  if (!store.defaultEmulatorId) store.defaultEmulatorId = id;
  saveStore(store);
  log.info(`[AndroidEmulator] Emulador registrado: ${input.name} (${input.type}, ${instance.deviceId})`);
  return instance;
};

export const launchEmulator = async (emulatorId: string): Promise<{ ok: boolean; error?: string }> => {
  const store = loadStore();
  const instance = store.instances.find((e) => e.id === emulatorId);
  if (!instance) return { ok: false, error: 'Emulator no encontrado' };

  if (env.dryRun) {
    log.warn('[AndroidEmulator] DRY RUN: simulando launch');
    instance.isRunning = true;
    saveStore(store);
    return { ok: true };
  }

  // Encontrar ejecutable
  const paths = KNOWN_INSTALL_PATHS[instance.type] ?? [];
  const exePath = paths.find((p) => existsSync(p));
  if (!exePath) {
    return { ok: false, error: `Emulador ${instance.type} no encontrado en el sistema` };
  }

  try {
    const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
    child.unref();
    // Esperar a que el emulador arranque
    await new Promise<void>((resolve) => setTimeout(resolve, 15000));
    // Conectar ADB
    const connected = adbConnect(instance.adbHost, instance.adbPort);
    instance.isRunning = connected;
    instance.lastUsedAt = new Date().toISOString();
    saveStore(store);
    return { ok: connected, error: connected ? undefined : 'ADB no conectó al emulador después del launch' };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
};

export const stopEmulator = (emulatorId: string): { ok: boolean; error?: string } => {
  const store = loadStore();
  const instance = store.instances.find((e) => e.id === emulatorId);
  if (!instance) return { ok: false, error: 'no encontrado' };
  if (env.dryRun) {
    instance.isRunning = false;
    saveStore(store);
    return { ok: true };
  }
  try {
    adbExec(instance.deviceId, 'emu kill');
    instance.isRunning = false;
    saveStore(store);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
};

// ── Acciones de control móvil ─────────────────────────────────────────────────

export interface MobileTapOptions {
  x: number;
  y: number;
}
export interface MobileSwipeOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  durationMs?: number;
}
export interface MobileTypeOptions {
  text: string;
}
export interface MobileKeyOptions {
  keycode: string;
} // ej: 'KEYCODE_BACK', 'KEYCODE_HOME'

export const mobileTap = (deviceId: string, opts: MobileTapOptions): boolean => {
  const out = adbExec(deviceId, `shell input tap ${opts.x} ${opts.y}`);
  return !out.includes('error');
};

export const mobileSwipe = (deviceId: string, opts: MobileSwipeOptions): boolean => {
  const dur = opts.durationMs ?? 300;
  const out = adbExec(deviceId, `shell input swipe ${opts.x1} ${opts.y1} ${opts.x2} ${opts.y2} ${dur}`);
  return !out.includes('error');
};

export const mobileType = (deviceId: string, opts: MobileTypeOptions): boolean => {
  // ADB requiere escapar espacios como %s, etc.
  const escaped = opts.text.replace(/ /g, '%s').replace(/'/g, "\\'");
  const out = adbExec(deviceId, `shell input text "${escaped}"`);
  return !out.includes('error');
};

export const mobilePressKey = (deviceId: string, opts: MobileKeyOptions): boolean => {
  const out = adbExec(deviceId, `shell input keyevent ${opts.keycode}`);
  return !out.includes('error');
};

export const mobileBack = (deviceId: string): boolean => mobilePressKey(deviceId, { keycode: 'KEYCODE_BACK' });
export const mobileHome = (deviceId: string): boolean => mobilePressKey(deviceId, { keycode: 'KEYCODE_HOME' });

// ── Screenshot del emulador ───────────────────────────────────────────────────

export const mobileScreenshot = (deviceId: string): { ok: boolean; path?: string; error?: string } => {
  if (env.dryRun) return { ok: true, path: '[DRY RUN]' };
  try {
    const localPath = join(tmpdir(), `feedia-mobile-${Date.now()}.png`);
    execSync(`adb -s ${deviceId} shell screencap -p /sdcard/feedia-shot.png`);
    execSync(`adb -s ${deviceId} pull /sdcard/feedia-shot.png "${localPath}"`);
    return { ok: true, path: localPath };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
};

// ── App management en el emulador ─────────────────────────────────────────────

export const listInstalledApps = (deviceId: string): string[] => {
  const out = adbExec(deviceId, 'shell pm list packages');
  return out
    .split('\n')
    .map((l) => l.replace('package:', '').trim())
    .filter(Boolean);
};

export const launchAppOnDevice = (deviceId: string, packageName: string): boolean => {
  const out = adbExec(deviceId, `shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
  return out.includes('Events injected: 1');
};

export const stopAppOnDevice = (deviceId: string, packageName: string): boolean => {
  const out = adbExec(deviceId, `shell am force-stop ${packageName}`);
  return !out.includes('error');
};

export const isAppInstalled = (deviceId: string, packageName: string): boolean => {
  const apps = listInstalledApps(deviceId);
  return apps.includes(packageName);
};

// ── Instagram específico ──────────────────────────────────────────────────────

export const INSTAGRAM_PACKAGE = 'com.instagram.android';
export const TIKTOK_PACKAGE = 'com.zhiliaoapp.musically';
export const CANVA_ANDROID_PACKAGE = 'com.canva.editor';

export const launchInstagramOnEmulator = async (
  emulatorId?: string,
): Promise<{ ok: boolean; deviceId?: string; error?: string }> => {
  const store = loadStore();
  const instance = emulatorId
    ? store.instances.find((e) => e.id === emulatorId)
    : (store.instances.find((e) => e.id === store.defaultEmulatorId) ?? store.instances[0]);

  if (!instance) return { ok: false, error: 'No hay emuladores registrados' };

  // Asegurar emulador corriendo
  if (!instance.isRunning) {
    const launchResult = await launchEmulator(instance.id);
    if (!launchResult.ok) return { ok: false, error: launchResult.error };
  }

  if (!isAppInstalled(instance.deviceId, INSTAGRAM_PACKAGE)) {
    return { ok: false, deviceId: instance.deviceId, error: 'Instagram app no está instalada en el emulador' };
  }

  const launched = launchAppOnDevice(instance.deviceId, INSTAGRAM_PACKAGE);
  return { ok: launched, deviceId: instance.deviceId, error: launched ? undefined : 'falló launch' };
};

// ── Pipeline: Canva Android → IG Android ─────────────────────────────────────

export const runMobileCanvaToInstagram = async (
  emulatorId: string,
  options: { instruction: string },
): Promise<{ ok: boolean; deviceId: string; screenshot?: string; error?: string }> => {
  const store = loadStore();
  const instance = store.instances.find((e) => e.id === emulatorId);
  if (!instance) return { ok: false, deviceId: '', error: 'emulador no encontrado' };

  // Asegurar corriendo
  if (!instance.isRunning) {
    const r = await launchEmulator(emulatorId);
    if (!r.ok) return { ok: false, deviceId: instance.deviceId, error: r.error };
  }

  // Launch Canva Android si está instalado, sino Instagram directo
  if (isAppInstalled(instance.deviceId, CANVA_ANDROID_PACKAGE)) {
    launchAppOnDevice(instance.deviceId, CANVA_ANDROID_PACKAGE);
    await new Promise<void>((r) => setTimeout(r, 5000));
  } else {
    log.info('[AndroidEmulator] Canva Android no instalado, abriendo Instagram directo');
    launchAppOnDevice(instance.deviceId, INSTAGRAM_PACKAGE);
    await new Promise<void>((r) => setTimeout(r, 4000));
  }

  // Captura final
  const shot = mobileScreenshot(instance.deviceId);
  log.info(`[AndroidEmulator] Mobile workflow: ${options.instruction}`);

  return { ok: true, deviceId: instance.deviceId, screenshot: shot.path };
};

// ── Consultas ────────────────────────────────────────────────────────────────

export const listEmulators = (): EmulatorInstance[] => loadStore().instances;

export const getEmulator = (id: string): EmulatorInstance | null =>
  loadStore().instances.find((e) => e.id === id) ?? null;

export const getDefaultEmulator = (): EmulatorInstance | null => {
  const store = loadStore();
  if (!store.defaultEmulatorId) return store.instances[0] ?? null;
  return store.instances.find((e) => e.id === store.defaultEmulatorId) ?? null;
};

export const setDefaultEmulator = (id: string): boolean => {
  const store = loadStore();
  if (!store.instances.find((e) => e.id === id)) return false;
  store.defaultEmulatorId = id;
  saveStore(store);
  return true;
};

export const refreshEmulatorStatus = (): { running: number; offline: number; total: number } => {
  const store = loadStore();
  const adbDevices = listAdbDevices();
  const adbDeviceIds = new Set(adbDevices.filter((d) => d.status === 'device').map((d) => d.deviceId));

  let running = 0;
  let offline = 0;
  for (const inst of store.instances) {
    inst.isRunning = adbDeviceIds.has(inst.deviceId);
    if (inst.isRunning) running++;
    else offline++;
  }
  saveStore(store);
  return { running, offline, total: store.instances.length };
};

// ── Snapshot ─────────────────────────────────────────────────────────────────

export const getAndroidEmulatorSnapshot = (): {
  installed: Array<{ type: EmulatorType; isInstalled: boolean }>;
  registered: number;
  running: number;
  adbAvailable: boolean;
  adbDevices: number;
} => {
  const installed = detectInstalledEmulators().map(({ type, isInstalled }) => ({ type, isInstalled }));
  const store = loadStore();
  const running = store.instances.filter((e) => e.isRunning).length;
  return {
    installed,
    registered: store.instances.length,
    running,
    adbAvailable: isAdbAvailable(),
    adbDevices: listAdbDevices().length,
  };
};

// ── Auto-setup: detectar e instalar BlueStacks o sugerir ────────────────────

export const autoSetupEmulator = async (): Promise<{
  detected: ReturnType<typeof detectInstalledEmulators>;
  adbAvailable: boolean;
  recommended: EmulatorType;
  setupInstructions: string;
}> => {
  const detected = detectInstalledEmulators();
  const adbAvailable = isAdbAvailable();
  const firstInstalled = detected.find((d) => d.isInstalled);

  let setupInstructions = '';
  if (!adbAvailable) {
    setupInstructions += 'Instalar Android Platform Tools (ADB):\n';
    setupInstructions += '  - Descargar de https://developer.android.com/tools/releases/platform-tools\n';
    setupInstructions += '  - Agregar al PATH del sistema\n\n';
  }
  if (!firstInstalled) {
    setupInstructions += 'Instalar un emulador Android (recomendado BlueStacks):\n';
    setupInstructions += '  - Descargar BlueStacks 5 de https://www.bluestacks.com/\n';
    setupInstructions += '  - Instalar y configurar root mode si querés controlar todo\n';
    setupInstructions += '  - Instalar Instagram app desde la Play Store\n';
  } else {
    setupInstructions += `Detectado: ${firstInstalled.type}\nPróximo paso: registrar con registerEmulator() y conectar ADB.`;
  }

  return {
    detected,
    adbAvailable,
    recommended: firstInstalled?.type ?? 'bluestacks',
    setupInstructions,
  };
};

// ── Re-export para tools.ts ────────────────────────────────────────────────────

export const launchAppHelper = launchApp;
