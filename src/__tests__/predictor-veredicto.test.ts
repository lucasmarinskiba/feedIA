import { describe, it, expect } from 'vitest';
import { predecirContenido, veredictoDe, type PostHistorial } from '../capabilities/executive/predictorModelo.js';

const DIA = 86_400_000;
const LUNES_12_UTC = Date.UTC(2026, 9, 5, 12, 0, 0);
const rango = { p10: 1.2, p50: 3.4, p90: 6.1 };

describe('veredictoDe', () => {
  it('pide más historial cuando no hay modelo', () => {
    const v = veredictoDe({
      tasaInteraccion: null,
      probabilidades: { superarMediana: null },
      medianas: { tasaInteraccion: null },
      confianza: 'sin-datos',
    });
    expect(v.nivel).toBe('sin-datos');
    expect(v.texto).toContain('al menos 8 publicaciones');
  });

  it('anuncia que va a rendir por encima cuando la probabilidad es alta', () => {
    const v = veredictoDe({
      tasaInteraccion: rango,
      probabilidades: { superarMediana: 75 },
      medianas: { tasaInteraccion: 2.8 },
      confianza: 'alta',
    });
    expect(v).toMatchObject({ nivel: 'fuerte', titulo: 'Va a rendir por encima de tu mediana' });
    expect(v.texto).toBe(
      'Esperá entre 1.2 % y 6.1 % de interacción (tu mediana es 2.8 %). Hay 75 % de chances de superarla.',
    );
  });

  it('avisa que rendirá por debajo y sugiere revisar factores', () => {
    const v = veredictoDe({
      tasaInteraccion: rango,
      probabilidades: { superarMediana: 20 },
      medianas: { tasaInteraccion: 2.8 },
      confianza: 'media',
    });
    expect(v.nivel).toBe('debil');
    expect(v.texto).toContain('revisá los factores antes de publicar');
  });

  it('agrega la advertencia cuando la confianza es baja', () => {
    const v = veredictoDe({
      tasaInteraccion: rango,
      probabilidades: { superarMediana: 50 },
      medianas: { tasaInteraccion: null },
      confianza: 'baja',
    });
    expect(v.nivel).toBe('promedio');
    expect(v.texto).toContain('poco firme');
  });
});

describe('predecirContenido · veredicto y mejor momento por formato', () => {
  const historial: PostHistorial[] = Array.from({ length: 12 }, (_, i) => ({
    id: `p${i}`,
    plataforma: 'instagram',
    formato: 'reel',
    captionCompleto: `Post ${i} con un gancho claro y una pregunta al final`,
    publicadoEn: new Date(LUNES_12_UTC + i * 7 * DIA).toISOString(),
    duracionSeg: 20,
    tasaInteraccion: 1 + (i % 6),
    alcance: 500 + i * 10,
    tiempoVisualizacionSeg: null,
  }));

  it('devuelve veredicto y el mejor momento para el formato pedido', () => {
    const p = predecirContenido(historial, {
      plataforma: 'instagram',
      formato: 'reel',
      caption: 'Un caption nuevo',
      hashtags: [],
      hora: null,
      dia: null,
      duracionSeg: 20,
    });
    expect(['fuerte', 'promedio', 'debil']).toContain(p.veredicto.nivel);
    expect(p.mejorMomentoFormato).toMatchObject({ dia: 'lunes' });
  });

  it('no sugiere momento para un formato sin publicaciones en el historial', () => {
    const p = predecirContenido(historial, {
      plataforma: 'instagram',
      formato: 'carrusel',
      caption: 'Un carrusel nuevo',
      hashtags: [],
      hora: null,
      dia: null,
      duracionSeg: null,
    });
    expect(p.mejorMomentoFormato).toBeNull();
  });
});
