/**
 * Clasificación de fallos de envío. Decide QUÉ hace el outbox después de un error, que es lo que
 * separa una cola útil de una que reintenta a ciegas:
 *
 *  - `rate-limited`: hay que esperar; no gasta un intento (no es un error de la respuesta).
 *  - `hold`: el problema es de toda la cuenta o del sistema (token vencido, modo emergencia, acción
 *    bloqueada por Meta). Reintentar YA empeora las cosas: se pausa el despacho entero.
 *  - `transient`: puede funcionar en un rato; reintento con backoff hasta agotar intentos.
 *  - `permanent`: reintentar no cambia nada (comentario borrado, contenido que compliance rechaza).
 *
 * `replyToComment` devuelve solo un string (`error`) más, si la red respondió, `code` y `status`.
 * Se prefiere lo estructurado (código de Meta) y se cae a patrones del texto para lo demás.
 */

export interface SendResult {
  ok: boolean;
  error?: string;
  /** Código de Meta tal cual lo arma metaApiClient: "código/subcódigo/tipo", p. ej. "100/33/GraphMethodException". */
  code?: string;
  /** HTTP status si la red respondió. */
  status?: number;
}

export type FailureClass =
  | { kind: 'rate-limited'; code: string; message: string; waitMs: number }
  | { kind: 'hold'; code: string; message: string; waitMs: number }
  | { kind: 'transient'; code: string; message: string }
  | { kind: 'permanent'; code: string; message: string };

const SEC = 1000;
const MIN = 60 * SEC;

/** "100/33/GraphMethodException" → [100, 33] */
const numericParts = (code: string | undefined): number[] =>
  (code ?? '')
    .split('/')
    .map((p) => Number(p))
    .filter((n) => Number.isInteger(n));

const rateLimited = (code: string, message: string, waitMs: number): FailureClass => ({
  kind: 'rate-limited',
  code,
  message,
  waitMs,
});
const hold = (code: string, message: string, waitMs: number): FailureClass => ({ kind: 'hold', code, message, waitMs });
const transient = (code: string, message: string): FailureClass => ({ kind: 'transient', code, message });
const permanent = (code: string, message: string): FailureClass => ({ kind: 'permanent', code, message });

const fromMetaCode = (parts: number[], message: string): FailureClass | null => {
  const [main, sub] = parts;
  if (main === undefined) return null;

  if ([190, 102, 463, 467].includes(main)) return hold('auth', message, 10 * MIN); // token vencido/revocado
  if ([4, 17, 32, 613].includes(main)) return rateLimited('meta-rate-limit', message, 15 * MIN);
  if (main === 341) return rateLimited('meta-app-limit', message, 30 * MIN);
  if (main === 368) return hold('action-blocked', message, 60 * MIN); // Meta bloqueó la acción: no insistir
  if (main === 10 || (main >= 200 && main <= 299)) return hold('permissions', message, 15 * MIN);
  if (main === 100) return permanent(sub === 33 ? 'comment-unavailable' : 'invalid-request', message);
  if (main === 1 || main === 2) return transient('meta-temporary', message);
  return null;
};

const fromStatus = (status: number | undefined, message: string): FailureClass | null => {
  if (status === undefined) return null;
  if (status === 429) return rateLimited('http-429', message, 15 * MIN);
  if (status === 0 || (status >= 500 && status <= 599)) return transient(`http-${status}`, message);
  if (status >= 400) return permanent(`http-${status}`, message);
  return null;
};

export const classifySendFailure = (result: SendResult): FailureClass => {
  const message = (result.error ?? 'error sin detalle').slice(0, 500);

  const structured = fromMetaCode(numericParts(result.code), message) ?? fromStatus(result.status, message);
  if (structured) return structured;

  // Ritmo propio (compliance): el texto trae los segundos exactos o, si no, se espera conservadoramente.
  const wait = /debe esperar (\d+)\s*s/i.exec(message);
  if (wait) return rateLimited('compliance-spacing', message, Number(wait[1]) * SEC);
  if (/l[ií]mite de \d+ acciones\/hora|l[ií]mite diario/i.test(message)) {
    return rateLimited('compliance-cap', message, 5 * MIN);
  }

  // Estado del sistema: no es culpa de esta respuesta.
  if (/estado de emergencia/i.test(message)) return hold('emergency', message, MIN);
  if (/t[eé]rminos de compliance no aceptados/i.test(message)) return hold('terms-not-accepted', message, 5 * MIN);
  if (/modo pausado/i.test(message)) return hold('glassbox-paused', message, 5 * MIN);

  // Rechazos de contenido o de supervisión: reintentar da lo mismo.
  if (/rechazado por supervisor|timeout de aprobaci[oó]n|bloqueado por compliance|^compliance:/i.test(message)) {
    return permanent('compliance-blocked', message);
  }

  // Sin código estructurado (p. ej. un mensaje suelto de Meta).
  if (/does not exist|has been deleted|no existe|unsupported (post|get) request/i.test(message)) {
    return permanent('comment-unavailable', message);
  }
  if (/rate limit|too many (calls|requests)|request limit/i.test(message)) {
    return rateLimited('meta-rate-limit', message, 15 * MIN);
  }
  if (/invalid oauth|access token|session has expired/i.test(message)) return hold('auth', message, 10 * MIN);
  if (/fetch failed|network|econn|etimedout|enotfound|socket|abort|timeout/i.test(message)) {
    return transient('network', message);
  }

  // Lo desconocido se reintenta, pero acotado: al agotar intentos queda en `failed` para una persona.
  return transient('unknown', message);
};
