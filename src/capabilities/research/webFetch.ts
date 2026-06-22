/**
 * Web Fetch — lectura best-effort de una página pública
 * ─────────────────────────────────────────────────────────────────────────
 * Permite que el sistema "consulte la fuente" cuando tiene una URL concreta
 * (ej: el newsroom de Meta, un blog de la industria) y la lea como texto.
 * No es un buscador: necesita la URL. Para sintetizar usa askProfessor.
 *
 * Endurecido: sólo http/https, sin hosts privados/loopback (anti-SSRF),
 * timeout corto, tamaño capado, HTML→texto plano.
 */

const BLOCKED_HOST = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0$|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;
const MAX_BYTES = 600_000;
const TIMEOUT_MS = 12_000;

export interface WebFetchResult {
  ok: boolean;
  url: string;
  status?: number;
  title?: string;
  text?: string;
  error?: string;
}

const htmlToText = (html: string): { title?: string; text: string } => {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return { title, text };
};

export const webFetch = async (rawUrl: string): Promise<WebFetchResult> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, url: rawUrl, error: 'URL inválida' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, url: rawUrl, error: 'Solo http/https permitido' };
  }
  if (BLOCKED_HOST.test(url.hostname)) {
    return { ok: false, url: rawUrl, error: 'Host no permitido (red privada/loopback)' };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: ac.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'FeedIA-Research/1.0', accept: 'text/html,text/plain,*/*' },
    });
    const ct = res.headers.get('content-type') ?? '';
    if (!/text\/html|text\/plain|application\/json|application\/xml/i.test(ct)) {
      return { ok: false, url: rawUrl, status: res.status, error: `Tipo no soportado: ${ct || 'desconocido'}` };
    }
    const raw = (await res.text()).slice(0, MAX_BYTES);
    const { title, text } = /html/i.test(ct) ? htmlToText(raw) : { title: undefined, text: raw.trim() };
    return {
      ok: res.ok,
      url: res.url || rawUrl,
      status: res.status,
      title,
      text: text.slice(0, 8000),
    };
  } catch (err) {
    const e = err as Error;
    return { ok: false, url: rawUrl, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(timer);
  }
};
