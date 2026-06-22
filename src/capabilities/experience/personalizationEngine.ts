/**
 * Personalization Engine de FeedIA — el sistema como expresión personal.
 *
 * Todo lo que hace que el sistema se sienta TUYO: nombre custom del asistente,
 * tema visual, pack de sonidos, mascot, ringtones, fondos de pantalla,
 * frases personalizadas, inside jokes guardados, foto de perfil del owner.
 *
 * Filosofía: lo que personalizas, lo querés. La personalización es la diferencia
 * entre "una herramienta más" y "mi sistema".
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { THEME_CATALOG, MASCOT_CATALOG, SOUND_PACKS } from './welcomeExperience.js';
import type { BrandProfile } from '../../config/types.js';

const PERSONALIZATION_PATH = join(process.cwd(), 'data', 'experience', 'personalization.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ThemeId = keyof typeof THEME_CATALOG;
export type MascotId = keyof typeof MASCOT_CATALOG;
export type SoundPackId = keyof typeof SOUND_PACKS;

export interface UserPersonalization {
  userId: string;
  brandName: string;

  // Identidad del sistema
  systemName: string; // "Talía" por default, custom permitido
  mascot: MascotId;
  ownerNickname?: string; // cómo Talía debe llamarme

  // Visual
  theme: ThemeId;
  accentColorOverride?: string; // hex custom
  density: 'compact' | 'cozy' | 'spacious';
  fontStyle: 'modern' | 'classic' | 'playful' | 'tech';
  iconStyle: 'outline' | 'filled' | 'duotone' | 'rounded';

  // Audio
  soundPack: SoundPackId;
  notificationSound: 'subtle' | 'standard' | 'bold' | 'silent';
  successSound: 'chime' | 'fanfare' | 'pop' | 'silent';
  voicePersonality: 'amistosa' | 'profesional' | 'pícara' | 'mentora' | 'cómplice';

  // Comportamiento
  enableCelebrations: boolean;
  celebrationIntensity: 'subtle' | 'standard' | 'fiesta';
  enableNarration: boolean;
  enableEasterEggs: boolean;
  enableInsideJokes: boolean;
  morningRitualEnabled: boolean;
  eveningRitualEnabled: boolean;
  morningTime: string; // HH:MM
  eveningTime: string; // HH:MM

  // Lenguaje
  preferredLanguage: 'es-AR' | 'es-ES' | 'en-US' | 'pt-BR';
  formalityLevel: 'tú' | 'vos' | 'usted' | 'auto';
  emojiUsage: 'none' | 'sparse' | 'normal' | 'heavy';
  curseWordsAllowed: boolean; // ¿puedo putear?

  // Toques personales
  ownerPhotoUrl?: string; // foto del dueño
  customWallpaperUrl?: string;
  favoriteEmojis: string[];
  bannedTopics: string[]; // de qué NO hablar
  insideJokes: Array<{ context: string; jokeText: string; addedAt: string }>;
  customCommands: Array<{ trigger: string; response: string }>;
  privateNotes: string; // notas que el sistema lee pero el usuario edita

  // Metadata
  createdAt: string;
  updatedAt: string;
  customizationVersion: number; // cada vez que cambia algo importante
}

interface PersonalizationStore {
  version: number;
  users: UserPersonalization[];
  lastUpdated: string;
}

const DEFAULT_STORE: PersonalizationStore = {
  version: 1,
  users: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'experience');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): PersonalizationStore => {
  try {
    ensureDir();
    if (!existsSync(PERSONALIZATION_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(PERSONALIZATION_PATH, 'utf8')) as PersonalizationStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: PersonalizationStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(PERSONALIZATION_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Defaults inteligentes ────────────────────────────────────────────────────

const buildDefaultPersonalization = (userId: string, brandName: string): UserPersonalization => ({
  userId,
  brandName,
  systemName: 'Talía',
  mascot: 'talia-elegante',
  theme: 'sunset',
  density: 'cozy',
  fontStyle: 'modern',
  iconStyle: 'outline',
  soundPack: 'gentle',
  notificationSound: 'subtle',
  successSound: 'chime',
  voicePersonality: 'amistosa',
  enableCelebrations: true,
  celebrationIntensity: 'standard',
  enableNarration: true,
  enableEasterEggs: true,
  enableInsideJokes: true,
  morningRitualEnabled: true,
  eveningRitualEnabled: true,
  morningTime: '08:30',
  eveningTime: '21:00',
  preferredLanguage: 'es-AR',
  formalityLevel: 'vos',
  emojiUsage: 'normal',
  curseWordsAllowed: false,
  favoriteEmojis: ['✨', '🚀', '💛', '🎯'],
  bannedTopics: [],
  insideJokes: [],
  customCommands: [],
  privateNotes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  customizationVersion: 1,
});

// ── CRUD ──────────────────────────────────────────────────────────────────────

export const getPersonalization = (userId: string): UserPersonalization | null =>
  loadStore().users.find((u) => u.userId === userId) ?? null;

export const initPersonalization = (userId: string, brandName: string): UserPersonalization => {
  const store = loadStore();
  let existing = store.users.find((u) => u.userId === userId);
  if (existing) return existing;
  existing = buildDefaultPersonalization(userId, brandName);
  store.users.push(existing);
  saveStore(store);
  log.info(`[Personalization] Inicializado para ${userId}/${brandName}`);
  return existing;
};

export const updatePersonalization = (
  userId: string,
  updates: Partial<Omit<UserPersonalization, 'userId' | 'brandName' | 'createdAt' | 'customizationVersion'>>,
): UserPersonalization | null => {
  const store = loadStore();
  const user = store.users.find((u) => u.userId === userId);
  if (!user) return null;
  Object.assign(user, updates);
  user.updatedAt = new Date().toISOString();
  user.customizationVersion++;
  saveStore(store);
  log.debug(`[Personalization] ${userId} actualizado (${Object.keys(updates).length} props)`);
  return user;
};

export const resetToDefaults = (userId: string): UserPersonalization | null => {
  const store = loadStore();
  const user = store.users.find((u) => u.userId === userId);
  if (!user) return null;
  const fresh = buildDefaultPersonalization(userId, user.brandName);
  // Preservar identidad
  fresh.systemName = user.systemName;
  fresh.ownerNickname = user.ownerNickname;
  fresh.customizationVersion = user.customizationVersion + 1;
  Object.assign(user, fresh);
  saveStore(store);
  return user;
};

// ── Helpers de aplicación ─────────────────────────────────────────────────────

export const getThemeForUser = (userId: string): (typeof THEME_CATALOG)[ThemeId] | null => {
  const p = getPersonalization(userId);
  if (!p) return null;
  return THEME_CATALOG[p.theme] ?? null;
};

export const getMascotForUser = (userId: string): (typeof MASCOT_CATALOG)[MascotId] | null => {
  const p = getPersonalization(userId);
  if (!p) return null;
  return MASCOT_CATALOG[p.mascot] ?? null;
};

export const getEffectiveAccentColor = (userId: string): string => {
  const p = getPersonalization(userId);
  if (!p) return '#3FB8C9';
  if (p.accentColorOverride) return p.accentColorOverride;
  const theme = THEME_CATALOG[p.theme];
  return theme?.palette[0] ?? '#3FB8C9';
};

// ── Inside jokes ──────────────────────────────────────────────────────────────

export const addInsideJoke = (userId: string, context: string, jokeText: string): UserPersonalization | null => {
  const store = loadStore();
  const user = store.users.find((u) => u.userId === userId);
  if (!user) return null;
  user.insideJokes.push({ context, jokeText, addedAt: new Date().toISOString() });
  if (user.insideJokes.length > 50) user.insideJokes = user.insideJokes.slice(-50);
  user.updatedAt = new Date().toISOString();
  saveStore(store);
  log.info(`[Personalization] Inside joke agregado para ${userId}: "${jokeText.slice(0, 40)}..."`);
  return user;
};

export const getRelevantInsideJoke = (userId: string, currentContext: string): string | null => {
  const p = getPersonalization(userId);
  if (!p || !p.enableInsideJokes || p.insideJokes.length === 0) return null;
  // Match simple por keyword
  const matching = p.insideJokes.filter((j) =>
    currentContext.toLowerCase().includes(j.context.toLowerCase().split(' ')[0] ?? ''),
  );
  if (matching.length === 0) return null;
  const chosen = matching[Math.floor(Math.random() * matching.length)];
  return chosen?.jokeText ?? null;
};

// ── Comandos custom (atajos personalizados) ──────────────────────────────────

export const addCustomCommand = (userId: string, trigger: string, response: string): UserPersonalization | null => {
  const store = loadStore();
  const user = store.users.find((u) => u.userId === userId);
  if (!user) return null;
  // Reemplazar si ya existe
  const existing = user.customCommands.find((c) => c.trigger === trigger);
  if (existing) existing.response = response;
  else user.customCommands.push({ trigger, response });
  user.updatedAt = new Date().toISOString();
  saveStore(store);
  return user;
};

export const removeCustomCommand = (userId: string, trigger: string): UserPersonalization | null => {
  const store = loadStore();
  const user = store.users.find((u) => u.userId === userId);
  if (!user) return null;
  user.customCommands = user.customCommands.filter((c) => c.trigger !== trigger);
  user.updatedAt = new Date().toISOString();
  saveStore(store);
  return user;
};

export const matchCustomCommand = (userId: string, input: string): string | null => {
  const p = getPersonalization(userId);
  if (!p) return null;
  const cmd = p.customCommands.find((c) => input.toLowerCase().includes(c.trigger.toLowerCase()));
  return cmd?.response ?? null;
};

// ── Construir contexto personalizado para Talía ──────────────────────────────

export const buildPersonalContextForTalia = (userId: string, brand: BrandProfile): string => {
  const p = getPersonalization(userId);
  if (!p) return '';

  const mascot = MASCOT_CATALOG[p.mascot];
  const theme = THEME_CATALOG[p.theme];

  const insideJokesPreview =
    p.insideJokes
      .slice(-5)
      .map((j) => `- "${j.jokeText}"`)
      .join('\n') || '(ninguno)';
  const bannedTopicsList = p.bannedTopics.length > 0 ? p.bannedTopics.join(', ') : '(ninguno)';
  const favoriteEmojis = p.favoriteEmojis.join(' ');

  return `## Contexto personal del usuario

El usuario te conoce como **"${p.systemName}"** y vos le respondés desde la personalidad **${mascot?.name ?? 'Talía Elegante'}** (${mascot?.personality.join(', ') ?? 'profesional, cálida'}).

${p.ownerNickname ? `Llamalo "${p.ownerNickname}" (no usar siempre, solo cuando suene natural).` : ''}

### Cómo le gusta que le hables:
- Personalidad de voz: **${p.voicePersonality}**
- Formalidad: **${p.formalityLevel}** (${p.formalityLevel === 'vos' ? 'rioplatense' : p.formalityLevel === 'tú' ? 'tuteo' : p.formalityLevel === 'usted' ? 'formal' : 'auto-detectar'})
- Emojis: **${p.emojiUsage}**${p.favoriteEmojis.length > 0 ? ` (favoritos: ${favoriteEmojis})` : ''}
- Lenguaje fuerte permitido: **${p.curseWordsAllowed ? 'sí' : 'no'}**
- Tema visual actual: **${theme?.name ?? 'Sunset'}** (vibe: ${theme?.vibe ?? 'cálido'})

### Inside jokes recientes (úsalos cuando encaje, NO forces):
${insideJokesPreview}

### Temas que NO debe mencionar:
${bannedTopicsList}

### Comandos personalizados que el usuario configuró:
${p.customCommands.map((c) => `- "${c.trigger}" → ${c.response.slice(0, 80)}`).join('\n') || '(ninguno)'}

### Notas privadas del usuario (info que él dejó para que la tengas presente):
${p.privateNotes || '(vacío)'}

Marca: ${brand.name} | nicho: ${brand.niche}`;
};

// ── Listado de catalogs disponibles ──────────────────────────────────────────

export interface CatalogPreview {
  themes: Array<{ id: ThemeId; name: string; vibe: string; palette: string[] }>;
  mascots: Array<{ id: MascotId; name: string; emoji: string; personality: string[]; description: string }>;
  soundPacks: Array<{ id: SoundPackId; name: string; vibe: string }>;
  densities: Array<{ id: string; name: string; description: string }>;
  fonts: Array<{ id: string; name: string; description: string }>;
  iconStyles: Array<{ id: string; name: string }>;
}

export const getCatalogPreview = (): CatalogPreview => ({
  themes: (Object.entries(THEME_CATALOG) as Array<[ThemeId, (typeof THEME_CATALOG)[ThemeId]]>).map(([id, t]) => ({
    id,
    name: t.name,
    vibe: t.vibe,
    palette: t.palette,
  })),
  mascots: (Object.entries(MASCOT_CATALOG) as Array<[MascotId, (typeof MASCOT_CATALOG)[MascotId]]>).map(([id, m]) => ({
    id,
    name: m.name,
    emoji: m.emoji,
    personality: m.personality,
    description: m.description,
  })),
  soundPacks: (Object.entries(SOUND_PACKS) as Array<[SoundPackId, (typeof SOUND_PACKS)[SoundPackId]]>).map(
    ([id, s]) => ({
      id,
      name: s.name,
      vibe: s.vibe,
    }),
  ),
  densities: [
    { id: 'compact', name: 'Compacto', description: 'Mucho contenido por pantalla, eficiente' },
    { id: 'cozy', name: 'Cozy', description: 'Balance entre densidad y respiro' },
    { id: 'spacious', name: 'Espacioso', description: 'Pantalla calma, cero overwhelm' },
  ],
  fonts: [
    { id: 'modern', name: 'Modern', description: 'Inter / SF Pro — limpio y profesional' },
    { id: 'classic', name: 'Classic', description: 'Garamond / Merriweather — editorial' },
    { id: 'playful', name: 'Playful', description: 'Lobster / Pacifico — creativo' },
    { id: 'tech', name: 'Tech', description: 'JetBrains Mono — geek aesthetic' },
  ],
  iconStyles: [
    { id: 'outline', name: 'Outline' },
    { id: 'filled', name: 'Filled' },
    { id: 'duotone', name: 'Duotone' },
    { id: 'rounded', name: 'Rounded' },
  ],
});

// ── Statistics ───────────────────────────────────────────────────────────────

export const getPersonalizationSnapshot = (): {
  totalUsers: number;
  byTheme: Record<string, number>;
  byMascot: Record<string, number>;
  byVoicePersonality: Record<string, number>;
  totalInsideJokes: number;
  avgCustomizationVersion: number;
} => {
  const users = loadStore().users;
  const byTheme: Record<string, number> = {};
  const byMascot: Record<string, number> = {};
  const byVoice: Record<string, number> = {};
  let totalJokes = 0;
  let totalVersions = 0;

  for (const u of users) {
    byTheme[u.theme] = (byTheme[u.theme] ?? 0) + 1;
    byMascot[u.mascot] = (byMascot[u.mascot] ?? 0) + 1;
    byVoice[u.voicePersonality] = (byVoice[u.voicePersonality] ?? 0) + 1;
    totalJokes += u.insideJokes.length;
    totalVersions += u.customizationVersion;
  }

  return {
    totalUsers: users.length,
    byTheme,
    byMascot,
    byVoicePersonality: byVoice,
    totalInsideJokes: totalJokes,
    avgCustomizationVersion: users.length > 0 ? totalVersions / users.length : 0,
  };
};

// ── Export de configuración (para que el frontend la lea) ───────────────────

export const exportPersonalizationCSS = (userId: string): string => {
  const p = getPersonalization(userId);
  if (!p) return ':root { --accent: #3FB8C9; }';
  const theme = THEME_CATALOG[p.theme];
  const palette = theme?.palette ?? ['#3FB8C9', '#1A1C1E', '#FAFAFA'];
  const accent = p.accentColorOverride ?? palette[0]!;

  return `:root {
  --feedia-accent: ${accent};
  --feedia-bg: ${palette[1] ?? '#1A1C1E'};
  --feedia-surface: ${palette[4] ?? '#FAFAFA'};
  --feedia-color-1: ${palette[0]};
  --feedia-color-2: ${palette[1] ?? '#1A1C1E'};
  --feedia-color-3: ${palette[2] ?? '#737373'};
  --feedia-color-4: ${palette[3] ?? '#A3A3A3'};
  --feedia-color-5: ${palette[4] ?? '#FAFAFA'};
  --feedia-density: ${p.density === 'compact' ? '8px' : p.density === 'spacious' ? '24px' : '16px'};
  --feedia-font-family: ${
    p.fontStyle === 'classic'
      ? "'Merriweather', Georgia, serif"
      : p.fontStyle === 'playful'
        ? "'Pacifico', cursive"
        : p.fontStyle === 'tech'
          ? "'JetBrains Mono', monospace"
          : "'Inter', system-ui, sans-serif"
  };
}`;
};

export const exportPersonalizationState = (): PersonalizationStore => loadStore();
