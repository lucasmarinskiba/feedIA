import { afterEach, describe, expect, it } from 'vitest';
import type { PostJunta } from '../capabilities/executive/juntaMetricas.js';
import {
  compararPiloto,
  guardarPiloto,
  leerPiloto,
  quitarPiloto,
  validarPiloto,
  type Piloto,
} from '../capabilities/executive/pilotoEjecutivo.js';

const AHORA = Date.parse('2026-10-08T12:00:00Z');
const piloto: Piloto = {
  nombre: 'Piloto FeedIA',
  desde: '2026-09-01',
  hipotesis: 'Más guardados con carruseles',
  creadoEn: '2026-09-01T00:00:00.000Z',
  actualizadoEn: '2026-09-01T00:00:00.000Z',
};

const post = (fecha: string, tasa: number | null): PostJunta => ({
  plataforma: 'instagram',
  publicadoEn: fecha,
  formato: 'carrusel',
  tasa,
  horaLocal: 12,
});

const antesDelInicio = (n: number, tasa: number): PostJunta[] =>
  Array.from({ length: n }, (_, i) =>
    post(new Date(Date.parse('2026-07-01T12:00:00Z') + i * 86_400_000).toISOString(), tasa),
  );

const despuesDelInicio = (n: number, tasa: number): PostJunta[] =>
  Array.from({ length: n }, (_, i) =>
    post(new Date(Date.parse('2026-09-02T12:00:00Z') + i * 86_400_000).toISOString(), tasa),
  );

describe('validarPiloto', () => {
  it('rechaza nombre corto', () => {
    expect(validarPiloto({ nombre: 'ab', desde: '2026-09-01' }, AHORA).ok).toBe(false);
  });

  it('rechaza fecha con formato inválido', () => {
    expect(validarPiloto({ nombre: 'Piloto', desde: '01/09/2026' }, AHORA).ok).toBe(false);
  });

  it('rechaza una fecha de inicio futura', () => {
    const r = validarPiloto({ nombre: 'Piloto', desde: '2026-10-09' }, AHORA);
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining('futura') });
  });

  it('rechaza una fecha más vieja que dos años', () => {
    const r = validarPiloto({ nombre: 'Piloto', desde: '2020-01-01' }, AHORA);
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining('antigua') });
  });

  it('acepta y limpia los campos válidos', () => {
    const r = validarPiloto({ nombre: '  Piloto X  ', desde: '2026-09-01', hipotesis: ' algo ' }, AHORA);
    expect(r).toEqual({ ok: true, valor: { nombre: 'Piloto X', desde: '2026-09-01', hipotesis: 'algo' } });
  });
});

describe('compararPiloto', () => {
  it('sin publicaciones no compara y dice qué falta', () => {
    const c = compararPiloto({ piloto, posts: [], ahora: AHORA });
    expect(c.listo).toBe(false);
    expect(c.deltaPp).toBeNull();
    expect(c.faltantes.some((f) => f.includes('anteriores al inicio'))).toBe(true);
    expect(c.faltantes.some((f) => f.includes('después del inicio'))).toBe(true);
  });

  it('clasifica por fecha de inicio y descarta posts futuros', () => {
    const posts = [...antesDelInicio(3, 0.02), ...despuesDelInicio(4, 0.05), post('2026-10-20T12:00:00Z', 0.9)];
    const c = compararPiloto({ piloto, posts, ahora: AHORA });
    expect(c.antes.publicaciones).toBe(3);
    expect(c.despues.publicaciones).toBe(4);
  });

  it('con 8 publicaciones de cada lado compara la tasa mediana', () => {
    const posts = [...antesDelInicio(8, 0.02), ...despuesDelInicio(8, 0.05)];
    const c = compararPiloto({ piloto, posts, ahora: AHORA });
    expect(c.listo).toBe(true);
    expect(c.antes.tasaMediana).toBe(2);
    expect(c.despues.tasaMediana).toBe(5);
    expect(c.deltaPp).toBe(3);
    expect(c.lectura).toContain('pasó de 2% a 5% (+3 pp)');
  });

  it('siempre aclara que es correlación y no causa', () => {
    const c = compararPiloto({
      piloto,
      posts: [...antesDelInicio(8, 0.02), ...despuesDelInicio(8, 0.03)],
      ahora: AHORA,
    });
    expect(c.lectura).toContain('no prueba de causa');
  });

  it('una caída de tasa se muestra con signo negativo', () => {
    const c = compararPiloto({
      piloto,
      posts: [...antesDelInicio(8, 0.05), ...despuesDelInicio(8, 0.02)],
      ahora: AHORA,
    });
    expect(c.deltaPp).toBe(-3);
    expect(c.lectura).toContain('(-3 pp)');
  });

  it('ignora posts sin tasa al calcular la mediana, sin inventarla', () => {
    const posts = [
      ...antesDelInicio(8, 0.02),
      ...despuesDelInicio(8, 0.05).map((p, i) => (i < 3 ? { ...p, tasa: null } : p)),
    ];
    const c = compararPiloto({ piloto, posts, ahora: AHORA });
    expect(c.despues.tasaMediana).toBe(5);
    expect(c.despues.publicaciones).toBe(8);
  });

  it('sin tasas en una ventana no compara aunque haya publicaciones', () => {
    const posts = [...antesDelInicio(8, null), ...despuesDelInicio(8, 0.05)];
    const c = compararPiloto({ piloto, posts, ahora: AHORA });
    expect(c.listo).toBe(false);
    expect(c.antes.tasaMediana).toBeNull();
  });

  it('avisa cuando el piloto tiene menos de 14 días', () => {
    const reciente = { ...piloto, desde: '2026-10-01' };
    const c = compararPiloto({ piloto: reciente, posts: [], ahora: AHORA });
    expect(c.faltantes.some((f) => f.includes('Conviene esperar 2 semanas'))).toBe(true);
  });
});

describe('persistencia del piloto', () => {
  const marca = `test-piloto-${Date.now()}`;
  afterEach(async () => {
    await quitarPiloto(marca);
  });

  it('guarda, lee, reemplaza y quita sin perder la fecha de creación', async () => {
    expect(await leerPiloto(marca)).toBeNull();
    const primero = await guardarPiloto(marca, { nombre: 'Piloto A', desde: '2026-09-01', hipotesis: '' });
    const segundo = await guardarPiloto(marca, { nombre: 'Piloto B', desde: '2026-09-05', hipotesis: 'x' });
    expect(segundo.nombre).toBe('Piloto B');
    expect(segundo.creadoEn).toBe(primero.creadoEn);
    expect((await leerPiloto(marca))?.nombre).toBe('Piloto B');
    await quitarPiloto(marca);
    expect(await leerPiloto(marca)).toBeNull();
  });
});
