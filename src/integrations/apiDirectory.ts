/**
 * Directorio de APIs públicas y gratuitas.
 * Fuentes:
 * - publicapis.io — catálogo curado de APIs públicas
 * - freeapi.app — APIs REST gratuitas con auth simple
 */

export interface ApiEntry {
  name: string;
  description: string;
  category: string;
  url: string;
  auth: 'none' | 'apiKey' | 'oauth' | 'bearerToken';
  https: boolean;
  cors: boolean | null;
  link: string;
}

export interface ApiSearchResult {
  ok: boolean;
  entries: ApiEntry[];
  total: number;
  source: string;
  error?: string;
}

// ── publicapis.io ──────────────────────────────────────────────────────────
const PUBLICAPIS_BASE = 'https://api.publicapis.org';

export const searchPublicApis = async (query: string, category?: string): Promise<ApiSearchResult> => {
  try {
    const params = new URLSearchParams();
    if (query) params.set('title', query);
    if (category) params.set('category', category);
    params.set('https', 'true');

    const response = await fetch(`${PUBLICAPIS_BASE}/entries?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { ok: false, entries: [], total: 0, source: 'publicapis.io', error: `${response.status}` };
    }

    const data = (await response.json()) as {
      count: number;
      entries: Array<{
        API: string;
        Description: string;
        Category: string;
        Auth: string;
        HTTPS: boolean;
        Cors: string;
        Link: string;
      }>;
    };

    const entries: ApiEntry[] = (data.entries ?? []).map((e) => ({
      name: e.API,
      description: e.Description,
      category: e.Category,
      url: e.Link,
      auth: (e.Auth || 'none') as ApiEntry['auth'],
      https: e.HTTPS,
      cors: e.Cors === 'yes' ? true : e.Cors === 'no' ? false : null,
      link: e.Link,
    }));

    return { ok: true, entries, total: data.count, source: 'publicapis.io' };
  } catch (err) {
    return { ok: false, entries: [], total: 0, source: 'publicapis.io', error: (err as Error).message };
  }
};

export const getPublicApiCategories = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${PUBLICAPIS_BASE}/categories`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];
    const data = (await response.json()) as string[];
    return data;
  } catch {
    return [];
  }
};

// ── freeapi.app ────────────────────────────────────────────────────────────
const FREEAPI_BASE = 'https://api.freeapi.app/api/v1';

export interface FreeApiProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  thumbnail: string;
}

export interface FreeApiUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  image: string;
}

export const freeApiGetProducts = async (
  limit = 10,
  page = 1,
): Promise<{ ok: boolean; products: FreeApiProduct[]; total: number; error?: string }> => {
  try {
    const response = await fetch(`${FREEAPI_BASE}/public/randomproducts?page=${page}&limit=${limit}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ok: false, products: [], total: 0, error: `${response.status}` };
    const data = (await response.json()) as { data: { data: FreeApiProduct[]; total: number } };
    return { ok: true, products: data.data.data ?? [], total: data.data.total ?? 0 };
  } catch (err) {
    return { ok: false, products: [], total: 0, error: (err as Error).message };
  }
};

export const freeApiGetRandomQuote = async (): Promise<{
  ok: boolean;
  quote: string;
  author: string;
  error?: string;
}> => {
  try {
    const response = await fetch(`${FREEAPI_BASE}/public/randomquotes/quote/random`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { ok: false, quote: '', author: '', error: `${response.status}` };
    const data = (await response.json()) as { data: { content: string; author: string } };
    return { ok: true, quote: data.data.content, author: data.data.author };
  } catch (err) {
    return { ok: false, quote: '', author: '', error: (err as Error).message };
  }
};

export const freeApiGetRandomJoke = async (): Promise<{ ok: boolean; joke: string; error?: string }> => {
  try {
    const response = await fetch(`${FREEAPI_BASE}/public/randomjokes/joke/random`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { ok: false, joke: '', error: `${response.status}` };
    const data = (await response.json()) as { data: { content: string } };
    return { ok: true, joke: data.data.content };
  } catch (err) {
    return { ok: false, joke: '', error: (err as Error).message };
  }
};

// ── Catálogo curado de APIs para FeedIA ────────────────────────────────────
export const CURATED_APIS_FOR_FEEDIA = [
  // IA / ML
  {
    name: 'Groq',
    category: 'AI/LLM',
    url: 'https://api.groq.com',
    auth: 'apiKey',
    free: true,
    description: 'LLMs ultra-rápidos (LLaMA, Mixtral). Free tier generoso.',
  },
  {
    name: 'Hugging Face',
    category: 'AI/ML',
    url: 'https://api-inference.huggingface.co',
    auth: 'bearerToken',
    free: true,
    description: 'Miles de modelos de IA open-source.',
  },
  {
    name: 'OpenRouter',
    category: 'AI/LLM',
    url: 'https://openrouter.ai',
    auth: 'apiKey',
    free: true,
    description: 'Acceso a muchos LLMs. Modelos free disponibles.',
  },
  {
    name: 'Ollama',
    category: 'AI/Local',
    url: 'http://localhost:11434',
    auth: 'none',
    free: true,
    description: 'LLMs 100% locales sin internet.',
  },
  {
    name: 'Replicate',
    category: 'AI/Images',
    url: 'https://api.replicate.com',
    auth: 'apiKey',
    free: false,
    description: 'Generación de imágenes y video con modelos open-source.',
  },
  // BaaS / Base de datos
  {
    name: 'Supabase',
    category: 'BaaS',
    url: 'https://supabase.com',
    auth: 'apiKey',
    free: true,
    description: 'PostgreSQL + Auth + Storage. Free 500MB.',
  },
  {
    name: 'PocketBase',
    category: 'BaaS',
    url: 'https://pocketbase.io',
    auth: 'none',
    free: true,
    description: 'BaaS self-hosted en 1 ejecutable.',
  },
  {
    name: 'Firebase Firestore',
    category: 'BaaS',
    url: 'https://firebase.google.com',
    auth: 'apiKey',
    free: true,
    description: 'NoSQL en tiempo real de Google. Free tier.',
  },
  {
    name: 'Turso (SQLite)',
    category: 'DB',
    url: 'https://turso.tech',
    auth: 'apiKey',
    free: true,
    description: 'SQLite distribuido. Free 9GB.',
  },
  // Gateway / Comunicación
  {
    name: 'Resend',
    category: 'Email',
    url: 'https://resend.com',
    auth: 'apiKey',
    free: true,
    description: 'Email transaccional. 100 emails/día gratis.',
  },
  {
    name: 'Twilio (Free Trial)',
    category: 'SMS/Voice',
    url: 'https://twilio.com',
    auth: 'apiKey',
    free: false,
    description: 'SMS y llamadas. Trial con créditos.',
  },
  {
    name: 'Pushover',
    category: 'Notificaciones',
    url: 'https://pushover.net',
    auth: 'apiKey',
    free: true,
    description: 'Notificaciones push. Free 10.000/mes.',
  },
  // Contenido / Multimedia
  {
    name: 'Unsplash',
    category: 'Imágenes',
    url: 'https://api.unsplash.com',
    auth: 'apiKey',
    free: true,
    description: 'Fotos HD gratuitas. 50 reqs/hora gratis.',
  },
  {
    name: 'Pixabay',
    category: 'Imágenes',
    url: 'https://pixabay.com/api',
    auth: 'apiKey',
    free: true,
    description: 'Imágenes y videos libres de derechos.',
  },
  {
    name: 'Pexels',
    category: 'Imágenes',
    url: 'https://api.pexels.com',
    auth: 'apiKey',
    free: true,
    description: 'Fotos y videos profesionales gratis.',
  },
  // Tendencias / Social
  {
    name: 'Reddit API',
    category: 'Social',
    url: 'https://www.reddit.com/dev/api',
    auth: 'oauth',
    free: true,
    description: 'Tendencias y conversaciones por subreddit.',
  },
  {
    name: 'Google Trends (pytrends)',
    category: 'Tendencias',
    url: 'https://trends.google.com',
    auth: 'none',
    free: true,
    description: 'Tendencias de búsqueda globales (unofficial).',
  },
  {
    name: 'NewsAPI',
    category: 'Noticias',
    url: 'https://newsapi.org',
    auth: 'apiKey',
    free: true,
    description: 'Noticias globales. 100 reqs/día gratis.',
  },
  // Análisis
  {
    name: 'IP-API',
    category: 'Geolocalización',
    url: 'https://ip-api.com',
    auth: 'none',
    free: true,
    description: 'Geolocalización por IP. 1000 reqs/min gratis.',
  },
  {
    name: 'ExchangeRate-API',
    category: 'Finanzas',
    url: 'https://exchangerate-api.com',
    auth: 'apiKey',
    free: true,
    description: 'Tasas de cambio. 1500 reqs/mes gratis.',
  },
];
