/**
 * StealthProfile — Genera perfiles de navegador realistas y únicos por sesión.
 * Cada perfil es determinístico para la sesión pero diferente entre sesiones.
 */

export interface StealthConfig {
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezone: string;
  geolocation: { latitude: number; longitude: number };
  colorDepth: number;
  pixelDepth: number;
  platform: string;
  deviceMemory: number;
  hardwareConcurrency: number;
}

const USER_AGENTS = [
  // Chrome Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  // Edge Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  // Chrome macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  // Firefox Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
  { width: 1680, height: 1050 },
];

const TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'Europe/Madrid',
];

const GEOLOCATIONS = [
  { latitude: -34.6037, longitude: -58.3816 }, // Buenos Aires
  { latitude: -33.4489, longitude: -70.6693 }, // Santiago
  { latitude: 19.4326, longitude: -99.1332 }, // Ciudad de México
  { latitude: 4.711, longitude: -74.0721 }, // Bogotá
  { latitude: -12.0464, longitude: -77.0428 }, // Lima
  { latitude: 40.4168, longitude: -3.7038 }, // Madrid
];

function pickRandom<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('pickRandom: array vacío');
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export const applyStealthProfile = (): StealthConfig => {
  const ua = pickRandom(USER_AGENTS);
  const viewport = pickRandom(VIEWPORTS);
  const tz = pickRandom(TIMEZONES);
  const geo = pickRandom(GEOLOCATIONS);

  return {
    userAgent: ua,
    viewport,
    locale: 'es-AR',
    timezone: tz,
    geolocation: geo,
    colorDepth: 24,
    pixelDepth: 24,
    platform: ua.includes('Windows') ? 'Win32' : ua.includes('Macintosh') ? 'MacIntel' : 'Linux x86_64',
    deviceMemory: pickRandom([4, 8, 16]),
    hardwareConcurrency: pickRandom([4, 8, 12]),
  };
};

export const getBrowserFingerprint = (config: StealthConfig): string => {
  const parts = [
    config.userAgent,
    `${config.viewport.width}x${config.viewport.height}`,
    config.locale,
    config.timezone,
    String(config.deviceMemory),
    String(config.hardwareConcurrency),
  ];
  return parts.join('|');
};
