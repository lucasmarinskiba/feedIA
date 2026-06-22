/**
 * Chrome Profile Manager de FeedIA — perfiles dedicados por cuenta/marca.
 *
 * Resuelve el problema de logins repetidos: cada marca/cuenta tiene su propio
 * perfil de Chrome con cookies, extensiones y sesiones persistentes. Canva, IG,
 * Figma, Adobe Express, etc. quedan logueados para siempre.
 *
 * Además genera la estructura de una extensión Chrome opcional que inyecta
 * helpers visuales (resalta el cursor, muestra qué acción está pasando).
 */

import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';
import { log } from '../../agent/logger.js';
import { findExecutablePath } from './appLauncher.js';
import { env } from '../../config/index.js';

const PROFILES_STORE_PATH = join(process.cwd(), 'data', 'chrome-profiles', 'profiles.json');
const PROFILES_BASE_DIR = join(process.cwd(), 'data', 'chrome-profiles', 'data');
const EXTENSION_DIR = join(process.cwd(), 'data', 'chrome-profiles', 'extension');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ChromeProfile {
  id: string; // identificador interno
  name: string; // nombre legible (ej: "@miempresa")
  brandName?: string; // marca asociada
  profileDir: string; // ruta al user-data-dir
  loggedInServices: string[]; // servicios donde sabemos que hay login (canva, instagram, figma, etc.)
  pinnedTabs: string[]; // URLs que se abren siempre con el perfil
  extensionsLoaded: string[]; // IDs/paths de extensiones cargadas
  defaultBrowser: 'chrome' | 'edge' | 'brave';
  lastUsedAt?: string;
  createdAt: string;
  active: boolean;
  notes: string[];
}

interface ProfilesStore {
  version: number;
  profiles: ChromeProfile[];
  defaultProfileId?: string;
  lastUpdated: string;
}

const DEFAULT_STORE: ProfilesStore = {
  version: 1,
  profiles: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDirs = (): void => {
  const dirs = [join(process.cwd(), 'data', 'chrome-profiles'), PROFILES_BASE_DIR, EXTENSION_DIR];
  for (const dir of dirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
};

const loadStore = (): ProfilesStore => {
  try {
    ensureDirs();
    if (!existsSync(PROFILES_STORE_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(PROFILES_STORE_PATH, 'utf8')) as ProfilesStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: ProfilesStore): void => {
  ensureDirs();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(PROFILES_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── CRUD de perfiles ──────────────────────────────────────────────────────────

export interface CreateProfileInput {
  name: string;
  brandName?: string;
  defaultBrowser?: ChromeProfile['defaultBrowser'];
  pinnedTabs?: string[];
  loadFeediaExtension?: boolean; // cargar la extensión visual de FeedIA
}

export const createProfile = (input: CreateProfileInput): ChromeProfile => {
  const store = loadStore();
  const id = `profile-${Date.now()}-${Math.floor(Math.random() * 999)}`;
  const safeName = input.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const profileDir = join(PROFILES_BASE_DIR, `${id}-${safeName}`);

  ensureDirs();
  if (!existsSync(profileDir)) mkdirSync(profileDir, { recursive: true });

  // Si se pide la extensión, asegurar que existe en disco
  let extensionsLoaded: string[] = [];
  if (input.loadFeediaExtension) {
    const extPath = ensureFeediaExtension();
    if (extPath) extensionsLoaded = [extPath];
  }

  const profile: ChromeProfile = {
    id,
    name: input.name,
    brandName: input.brandName,
    profileDir,
    loggedInServices: [],
    pinnedTabs: input.pinnedTabs ?? ['https://www.instagram.com/', 'https://www.canva.com/', 'https://www.figma.com/'],
    extensionsLoaded,
    defaultBrowser: input.defaultBrowser ?? 'chrome',
    createdAt: new Date().toISOString(),
    active: false,
    notes: [],
  };

  store.profiles.push(profile);
  if (!store.defaultProfileId) store.defaultProfileId = id;
  saveStore(store);

  log.info(`[ChromeProfileManager] Perfil creado: ${profile.name} (${id})`);
  return profile;
};

export const getProfile = (id: string): ChromeProfile | null => loadStore().profiles.find((p) => p.id === id) ?? null;

export const findProfileByName = (name: string): ChromeProfile | null =>
  loadStore().profiles.find((p) => p.name === name) ?? null;

export const findProfileByBrand = (brandName: string): ChromeProfile | null =>
  loadStore().profiles.find((p) => p.brandName === brandName) ?? null;

export const listProfiles = (): ChromeProfile[] =>
  loadStore().profiles.sort((a, b) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''));

export const setDefaultProfile = (id: string): boolean => {
  const store = loadStore();
  if (!store.profiles.find((p) => p.id === id)) return false;
  store.defaultProfileId = id;
  saveStore(store);
  return true;
};

export const getDefaultProfile = (): ChromeProfile | null => {
  const store = loadStore();
  if (!store.defaultProfileId) return store.profiles[0] ?? null;
  return store.profiles.find((p) => p.id === store.defaultProfileId) ?? null;
};

export const markServiceLoggedIn = (profileId: string, service: string): ChromeProfile | null => {
  const store = loadStore();
  const profile = store.profiles.find((p) => p.id === profileId);
  if (!profile) return null;
  if (!profile.loggedInServices.includes(service)) profile.loggedInServices.push(service);
  profile.notes.push(`[${new Date().toISOString()}] Login confirmado en ${service}`);
  saveStore(store);
  return profile;
};

export const updateProfile = (
  id: string,
  updates: Partial<Pick<ChromeProfile, 'name' | 'brandName' | 'pinnedTabs' | 'notes'>>,
): ChromeProfile | null => {
  const store = loadStore();
  const profile = store.profiles.find((p) => p.id === id);
  if (!profile) return null;
  Object.assign(profile, updates);
  saveStore(store);
  return profile;
};

export const deleteProfile = (id: string, removeData = false): boolean => {
  const store = loadStore();
  const idx = store.profiles.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  const profile = store.profiles[idx]!;
  if (removeData && existsSync(profile.profileDir)) {
    try {
      const os = platform();
      if (os === 'win32') {
        execSync(`rmdir /S /Q "${profile.profileDir}"`, { shell: 'cmd.exe' });
      } else {
        execSync(`rm -rf "${profile.profileDir}"`);
      }
    } catch (err) {
      log.warn(`[ChromeProfileManager] No se pudo borrar ${profile.profileDir}: ${(err as Error).message}`);
    }
  }
  store.profiles.splice(idx, 1);
  if (store.defaultProfileId === id) store.defaultProfileId = store.profiles[0]?.id;
  saveStore(store);
  return true;
};

// ── Launch Chrome con perfil dedicado ─────────────────────────────────────────

export interface LaunchWithProfileOptions {
  url?: string;
  openPinnedTabs?: boolean;
  newWindow?: boolean;
  loadExtensions?: boolean;
  incognito?: boolean;
  startMinimized?: boolean;
}

export interface LaunchWithProfileResult {
  ok: boolean;
  profileId: string;
  pid?: number;
  command: string;
  error?: string;
}

export const launchWithProfile = (
  profileId: string,
  options: LaunchWithProfileOptions = {},
): LaunchWithProfileResult => {
  const profile = getProfile(profileId);
  if (!profile) return { ok: false, profileId, command: '', error: 'Profile not found' };

  if (env.dryRun) {
    log.warn('[ChromeProfileManager] DRY RUN: simulando launch con perfil');
    return { ok: true, profileId, command: '[DRY RUN]' };
  }

  const exe = findExecutablePath(profile.defaultBrowser);
  if (!exe) {
    return { ok: false, profileId, command: '', error: `${profile.defaultBrowser} no encontrado en el sistema` };
  }

  const args: string[] = [`--user-data-dir=${profile.profileDir}`];

  if (options.loadExtensions !== false && profile.extensionsLoaded.length > 0) {
    args.push(`--load-extension=${profile.extensionsLoaded.join(',')}`);
  }
  if (options.newWindow) args.push('--new-window');
  if (options.incognito) args.push('--incognito');
  if (options.startMinimized) args.push('--start-minimized');

  // Configuraciones útiles para automation
  args.push('--no-first-run');
  args.push('--no-default-browser-check');
  args.push('--disable-features=Translate');

  // URLs a abrir
  const urls: string[] = [];
  if (options.url) urls.push(options.url);
  if (options.openPinnedTabs && profile.pinnedTabs.length > 0) {
    urls.push(...profile.pinnedTabs);
  }
  if (urls.length > 0) args.push(...urls);

  try {
    const child = spawn(exe, args, { detached: true, stdio: 'ignore' });
    child.unref();
    log.info(
      `[ChromeProfileManager] Lanzado ${profile.defaultBrowser} con perfil "${profile.name}" (PID ${child.pid ?? 'detached'})`,
    );

    // Marcar como activo
    const store = loadStore();
    const stored = store.profiles.find((p) => p.id === profileId);
    if (stored) {
      stored.active = true;
      stored.lastUsedAt = new Date().toISOString();
      saveStore(store);
    }

    return {
      ok: true,
      profileId,
      pid: child.pid,
      command: `${exe} ${args.join(' ')}`,
    };
  } catch (err) {
    return { ok: false, profileId, command: `${exe} ${args.join(' ')}`, error: (err as Error).message };
  }
};

// ── Extensión Chrome de FeedIA (helper visual) ───────────────────────────────

const MANIFEST_CONTENT = JSON.stringify(
  {
    manifest_version: 3,
    name: 'FeedIA Visual Helper',
    version: '1.0.0',
    description: 'Asiste a FeedIA con feedback visual durante automatización (cursor highlight, action narration).',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>'],
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['cursor-highlight.js', 'action-narrator.js'],
        css: ['feedia.css'],
        run_at: 'document_idle',
      },
    ],
    background: {
      service_worker: 'background.js',
    },
    icons: {
      '128': 'icon.png',
    },
  },
  null,
  2,
);

const CURSOR_HIGHLIGHT_JS = `// FeedIA Cursor Highlight — destaca el cursor visualmente cuando hay actividad
(function() {
  const ring = document.createElement('div');
  ring.id = 'feedia-cursor-ring';
  ring.style.cssText = 'position:fixed;width:40px;height:40px;border:3px solid #3FB8C9;border-radius:50%;pointer-events:none;z-index:2147483647;opacity:0;transition:opacity 0.2s,transform 0.1s linear;box-shadow:0 0 20px rgba(63,184,201,0.6);';
  document.body.appendChild(ring);

  let timer;
  document.addEventListener('mousemove', (e) => {
    ring.style.left = (e.clientX - 20) + 'px';
    ring.style.top = (e.clientY - 20) + 'px';
    ring.style.opacity = '1';
    clearTimeout(timer);
    timer = setTimeout(() => { ring.style.opacity = '0'; }, 1500);
  });

  // Pulse on click
  document.addEventListener('mousedown', () => {
    ring.style.transform = 'scale(1.5)';
    ring.style.borderColor = '#E85A2C';
    setTimeout(() => { ring.style.transform = 'scale(1)'; ring.style.borderColor = '#3FB8C9'; }, 200);
  });
})();
`;

const ACTION_NARRATOR_JS = `// FeedIA Action Narrator — recibe mensajes desde background con qué está pasando
(function() {
  const banner = document.createElement('div');
  banner.id = 'feedia-action-banner';
  banner.style.cssText = 'position:fixed;top:20px;right:20px;max-width:340px;background:rgba(26,28,30,0.95);color:white;padding:14px 18px;border-radius:8px;font-family:-apple-system,system-ui,sans-serif;font-size:13px;z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,0.3);transform:translateX(120%);transition:transform 0.3s;border-left:4px solid #3FB8C9;';
  document.body.appendChild(banner);

  let banner_timer;
  window.addEventListener('feedia-action', (e) => {
    const detail = e.detail || {};
    banner.textContent = detail.message || 'Acción en curso...';
    banner.style.transform = 'translateX(0)';
    clearTimeout(banner_timer);
    banner_timer = setTimeout(() => { banner.style.transform = 'translateX(120%)'; }, detail.duration || 3500);
  });

  // Listen for storage updates
  chrome.storage?.onChanged?.addListener((changes) => {
    if (changes.currentAction) {
      const evt = new CustomEvent('feedia-action', { detail: changes.currentAction.newValue });
      window.dispatchEvent(evt);
    }
  });
})();
`;

const BACKGROUND_JS = `// FeedIA Background Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[FeedIA Extension] instalada');
});

// API para que herramientas externas inyecten narración (vía port o externalMessages si se configurara)
chrome.runtime.onMessage?.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'feedia-narrate' && msg.text) {
    chrome.storage.local.set({
      currentAction: { message: msg.text, duration: msg.duration || 3500 },
    });
    sendResponse({ ok: true });
  }
  return true;
});
`;

const FEEDIA_CSS = `/* FeedIA Visual Helper */
#feedia-cursor-ring,#feedia-action-banner{font-family:-apple-system,system-ui,sans-serif;}
`;

export const ensureFeediaExtension = (): string | null => {
  try {
    ensureDirs();
    const manifestPath = join(EXTENSION_DIR, 'manifest.json');
    if (!existsSync(manifestPath)) {
      writeFileSync(manifestPath, MANIFEST_CONTENT, 'utf8');
      writeFileSync(join(EXTENSION_DIR, 'cursor-highlight.js'), CURSOR_HIGHLIGHT_JS, 'utf8');
      writeFileSync(join(EXTENSION_DIR, 'action-narrator.js'), ACTION_NARRATOR_JS, 'utf8');
      writeFileSync(join(EXTENSION_DIR, 'background.js'), BACKGROUND_JS, 'utf8');
      writeFileSync(join(EXTENSION_DIR, 'feedia.css'), FEEDIA_CSS, 'utf8');
      log.info(`[ChromeProfileManager] Extensión FeedIA escrita en ${EXTENSION_DIR}`);
    }
    return EXTENSION_DIR;
  } catch (err) {
    log.warn(`[ChromeProfileManager] No se pudo crear extensión: ${(err as Error).message}`);
    return null;
  }
};

// ── Profile maintenance ───────────────────────────────────────────────────────

export const getProfileSize = (profileId: string): { sizeMB: number; fileCount: number } | null => {
  const profile = getProfile(profileId);
  if (!profile || !existsSync(profile.profileDir)) return null;

  let totalBytes = 0;
  let fileCount = 0;
  const walk = (dir: string): void => {
    try {
      const entries = readdirSync(dir);
      for (const e of entries) {
        const fullPath = join(dir, e);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) walk(fullPath);
          else {
            totalBytes += stat.size;
            fileCount++;
          }
        } catch {
          /* skip */
        }
      }
    } catch {
      /* skip */
    }
  };
  walk(profile.profileDir);

  return { sizeMB: Math.round((totalBytes / (1024 * 1024)) * 10) / 10, fileCount };
};

export const cleanProfileCache = (profileId: string): boolean => {
  const profile = getProfile(profileId);
  if (!profile) return false;
  try {
    const cacheDir = join(profile.profileDir, 'Default', 'Cache');
    if (existsSync(cacheDir)) {
      const os = platform();
      if (os === 'win32') {
        execSync(`rmdir /S /Q "${cacheDir}"`, { shell: 'cmd.exe' });
      } else {
        execSync(`rm -rf "${cacheDir}"`);
      }
    }
    log.info(`[ChromeProfileManager] Cache limpiado para ${profile.name}`);
    return true;
  } catch (err) {
    log.warn(`[ChromeProfileManager] No se pudo limpiar cache: ${(err as Error).message}`);
    return false;
  }
};

// ── Snapshot global ───────────────────────────────────────────────────────────

export const getProfilesSnapshot = (): {
  total: number;
  defaultProfile?: string;
  active: number;
  byBrowser: Record<string, number>;
  byLoginState: Record<string, number>;
  extensionInstalled: boolean;
} => {
  const store = loadStore();
  const byBrowser: Record<string, number> = {};
  const byLoginState: Record<string, number> = {};

  for (const p of store.profiles) {
    byBrowser[p.defaultBrowser] = (byBrowser[p.defaultBrowser] ?? 0) + 1;
    for (const svc of p.loggedInServices) byLoginState[svc] = (byLoginState[svc] ?? 0) + 1;
  }

  return {
    total: store.profiles.length,
    defaultProfile: store.defaultProfileId,
    active: store.profiles.filter((p) => p.active).length,
    byBrowser,
    byLoginState,
    extensionInstalled: existsSync(join(EXTENSION_DIR, 'manifest.json')),
  };
};

// ── Helper: launch con el perfil de marca ────────────────────────────────────

export const launchWithBrandProfile = (brandName: string, url?: string): LaunchWithProfileResult => {
  const profile = findProfileByBrand(brandName);
  if (!profile) {
    return { ok: false, profileId: '', command: '', error: `Sin perfil para marca ${brandName}` };
  }
  return launchWithProfile(profile.id, { url, openPinnedTabs: !url });
};

// ── Helper: crear perfil para marca ──────────────────────────────────────────

export const ensureProfileForBrand = (brandName: string): ChromeProfile => {
  const existing = findProfileByBrand(brandName);
  if (existing) return existing;
  return createProfile({
    name: brandName,
    brandName,
    loadFeediaExtension: true,
  });
};
