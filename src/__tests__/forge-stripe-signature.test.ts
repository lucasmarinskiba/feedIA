import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verificarFirmaStripe } from '../server/forgeStripeSignature.js';

const SECRETO = 'whsec_test_secreto';
const AHORA = 1_800_000_000;
const payload = Buffer.from(JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' }));

const firmar = (cuerpo: Buffer, timestamp: number, secreto: string = SECRETO): string => {
  const firma = createHmac('sha256', secreto).update(`${timestamp}.`).update(cuerpo).digest('hex');
  return `t=${timestamp},v1=${firma}`;
};

describe('verificarFirmaStripe', () => {
  it('acepta firma válida dentro de la tolerancia', () => {
    expect(verificarFirmaStripe(payload, firmar(payload, AHORA), SECRETO, AHORA)).toBe(true);
  });

  it('acepta si alguna de varias firmas v1 coincide', () => {
    const valida = firmar(payload, AHORA).split(',v1=')[1] ?? '';
    const cabecera = `t=${AHORA},v1=${'0'.repeat(64)},v1=${valida}`;
    expect(verificarFirmaStripe(payload, cabecera, SECRETO, AHORA)).toBe(true);
  });

  it('rechaza firma hecha con otro secreto', () => {
    expect(verificarFirmaStripe(payload, firmar(payload, AHORA, 'whsec_otro'), SECRETO, AHORA)).toBe(false);
  });

  it('rechaza body alterado después de firmar', () => {
    const alterado = Buffer.from(payload.toString().replace('evt_1', 'evt_2'));
    expect(verificarFirmaStripe(alterado, firmar(payload, AHORA), SECRETO, AHORA)).toBe(false);
  });

  it('rechaza timestamp fuera de la tolerancia de 5 minutos (replay)', () => {
    const viejo = AHORA - 301;
    expect(verificarFirmaStripe(payload, firmar(payload, viejo), SECRETO, AHORA)).toBe(false);
  });

  it('rechaza cabecera malformada', () => {
    expect(verificarFirmaStripe(payload, 'basura', SECRETO, AHORA)).toBe(false);
    expect(verificarFirmaStripe(payload, `t=${AHORA}`, SECRETO, AHORA)).toBe(false);
    expect(verificarFirmaStripe(payload, `t=${AHORA},v1=zzzz`, SECRETO, AHORA)).toBe(false);
    expect(verificarFirmaStripe(payload, `t=abc,v1=00`, SECRETO, AHORA)).toBe(false);
  });

  it('fail-closed: sin secreto, cabecera o body no verifica nada', () => {
    expect(verificarFirmaStripe(payload, firmar(payload, AHORA), '', AHORA)).toBe(false);
    expect(verificarFirmaStripe(payload, '', SECRETO, AHORA)).toBe(false);
    expect(verificarFirmaStripe(Buffer.alloc(0), firmar(payload, AHORA), SECRETO, AHORA)).toBe(false);
  });
});
