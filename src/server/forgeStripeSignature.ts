import { createHmac, timingSafeEqual } from 'node:crypto';

/** Tolerancia anti-replay recomendada por Stripe (5 minutos). */
const TOLERANCIA_SEGUNDOS = 300;

/**
 * Verifica la cabecera `Stripe-Signature` (`t=<ts>,v1=<hmac>[,v1=...]`) sobre los bytes crudos del body.
 * Fail-closed: cualquier formato inválido, secreto vacío o timestamp fuera de tolerancia devuelve false.
 */
export const verificarFirmaStripe = (
  rawBody: Buffer,
  cabecera: string,
  secreto: string,
  ahoraSegundos: number = Math.floor(Date.now() / 1000),
): boolean => {
  if (!secreto || !cabecera || rawBody.length === 0) return false;

  const pares = cabecera.split(',').map((parte): [string, string] => {
    const indice = parte.indexOf('=');
    return indice === -1 ? [parte, ''] : [parte.slice(0, indice), parte.slice(indice + 1)];
  });

  const timestamp = pares.find(([clave]) => clave === 't')?.[1] ?? '';
  const firmasRecibidas = pares.filter(([clave]) => clave === 'v1').map(([, valor]) => valor);
  if (!timestamp || firmasRecibidas.length === 0) return false;

  const instante = Number(timestamp);
  if (!Number.isFinite(instante) || Math.abs(ahoraSegundos - instante) > TOLERANCIA_SEGUNDOS) return false;

  const firmaEsperada = createHmac('sha256', secreto).update(`${timestamp}.`).update(rawBody).digest();

  return firmasRecibidas.some((firma) => {
    if (!/^[0-9a-f]+$/i.test(firma)) return false;
    const bufferFirma = Buffer.from(firma, 'hex');
    return bufferFirma.length === firmaEsperada.length && timingSafeEqual(bufferFirma, firmaEsperada);
  });
};
