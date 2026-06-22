import esLocale from './locales/es.js';
import enLocale from './locales/en.js';
import ptLocale from './locales/pt.js';

export type SupportedLocale = 'es-AR' | 'es-ES' | 'en-US' | 'en-GB' | 'pt-BR' | 'fr-FR' | 'de-DE' | 'it-IT';

type Locale = typeof esLocale;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LOCALES: Record<string, any> = {
  'es-AR': esLocale,
  'es-ES': esLocale,
  es: esLocale,
  'en-US': enLocale,
  'en-GB': enLocale,
  en: enLocale,
  'pt-BR': ptLocale,
  pt: ptLocale,
};

let currentLocale: SupportedLocale = (process.env['FEEDIA_LANGUAGE'] ?? 'es-AR') as SupportedLocale;

export const setLocale = (locale: SupportedLocale): void => {
  currentLocale = locale;
};

export const getLocale = (): SupportedLocale => currentLocale;

export const t = (key: keyof Locale): string => {
  const locale = LOCALES[currentLocale] ?? LOCALES['es-AR']!;
  return (locale[key] as string) ?? key;
};

export const detectLocaleFromText = (text: string): SupportedLocale => {
  const lower = text.toLowerCase();
  // Patrones de detección rápida por vocabulario
  if (/\b(olá|obrigad[ao]|por\s+favor|sim|não|você|conta|crescer)\b/.test(lower)) return 'pt-BR';
  if (/\b(hello|hey|please|thanks?|account|followers|grow)\b/.test(lower)) return 'en-US';
  if (/\b(hola|gracias|por\s+favor|sí|cuenta|seguidores|crecer)\b/.test(lower)) return 'es-AR';
  return currentLocale;
};

export const listSupportedLocales = (): Array<{ code: SupportedLocale; name: string }> => [
  { code: 'es-AR', name: 'Español (Argentina)' },
  { code: 'es-ES', name: 'Español (España)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'it-IT', name: 'Italiano' },
];
