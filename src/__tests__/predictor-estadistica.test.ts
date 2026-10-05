import { describe, it, expect } from 'vitest';
import {
  caracteristicasDe,
  predecirContenido,
  resumenHistorial,
  type EntradaContenido,
  type PostHistorial,
} from '../capabilities/executive/predictorModelo.js';

const LAMBDAS = [0.5, 1, 3, 8, 20];

const posts = (n: number): PostHistorial[] =>
  Array.from({ length: n }, (_, i) => {
    const conPregunta = i % 2 === 0;
    return {
      id: `p${i}`,
      plataforma: 'instagram' as const,
      formato: 'imagen' as const,
      captionCompleto: conPregunta ? '¿Cómo arrancás tu día? Guardalo.' : 'Una nota corta sobre el día a día.',
      publicadoEn: new Date(Date.UTC(2026, 8, 1) + i * 2 * 86_400_000 + 19 * 3_600_000).toISOString(),
      duracionSeg: null,
      tasaInteraccion: conPregunta ? 0.05 + (i % 3) * 0.002 : 0.01 + (i % 3) * 0.002,
      alcance: 1000,
      tiempoVisualizacionSeg: null,
    };
  });

const entrada = (caption: string): EntradaContenido => ({
  plataforma: 'instagram',
  formato: 'imagen',
  caption,
  hashtags: [],
  hora: 19,
  dia: 'martes',
  duracionSeg: null,
});

describe('predecirContenido: estadísticas del modelo', () => {
  const pred = predecirContenido(posts(30), entrada('¿Qué hacés para ahorrar tiempo? Guardalo.'));

  it('elige la regularización por validación cruzada entre las candidatas', () => {
    expect(LAMBDAS).toContain(pred.estadisticas.lambda);
  });

  it('reporta n y la calidad frente a predecir el promedio', () => {
    expect(pred.estadisticas.n).toBe(30);
    expect(pred.estadisticas.q2).not.toBeNull();
    expect(pred.estadisticas.q2 ?? 0).toBeGreaterThan(0);
    expect(pred.estadisticas.mejoraVsPromedioPct ?? 0).toBeGreaterThan(0);
  });

  it('calcula impacto porcentual de los factores con signo', () => {
    const pregunta = pred.factores.find((f) => f.factor === 'Hook en forma de pregunta');
    expect(pregunta).toBeDefined();
    expect(pregunta?.efecto).toBe('positivo');
    expect(pregunta?.impactoPct ?? 0).toBeGreaterThan(0);
  });

  it('la distribución del historial suma todos los posts', () => {
    const total = pred.distribucion.bins.reduce((s, b) => s + b.n, 0);
    expect(total).toBe(30);
    expect(pred.distribucion.bins).toHaveLength(8);
    expect(pred.distribucion.prediccionTasa).not.toBeNull();
  });

  it('sin historial no inventa estadísticas', () => {
    const vacia = predecirContenido([], entrada('hola'));
    expect(vacia.confianza).toBe('sin-datos');
    expect(vacia.estadisticas.n).toBe(0);
    expect(vacia.distribucion.bins).toEqual([]);
  });
});

describe('resumenHistorial', () => {
  it('agrupa por hook con mediana y comparación contra la mediana general', () => {
    const r = resumenHistorial(posts(30));
    const ig = r.plataformas.find((p) => p.plataforma === 'instagram');
    expect(ig?.posts).toBe(30);
    const pregunta = ig?.porHook.find((g) => g.clave === 'pregunta');
    expect(pregunta?.posts).toBe(15);
    expect(pregunta?.vsMediana ?? 0).toBeGreaterThan(1);
  });

  it('omite plataformas sin posts', () => {
    expect(resumenHistorial([]).plataformas).toEqual([]);
  });
});

describe('caracteristicasDe: recencia y números', () => {
  const base = {
    formato: 'imagen' as const,
    caption: 'Texto sin cifras',
    hashtagsExtra: [],
    hora: 10,
    dia: 'lunes',
    duracionSeg: null,
  };

  it('clasifica la recencia desde la publicación anterior', () => {
    expect(caracteristicasDe({ ...base, diasDesdeAnterior: 0.5 }).recencia).toBe('≤1d');
    expect(caracteristicasDe({ ...base, diasDesdeAnterior: 2 }).recencia).toBe('2-3d');
    expect(caracteristicasDe({ ...base, diasDesdeAnterior: 5 }).recencia).toBe('4-7d');
    expect(caracteristicasDe({ ...base, diasDesdeAnterior: 12 }).recencia).toBe('8d+');
    expect(caracteristicasDe({ ...base, diasDesdeAnterior: null }).recencia).toBe('sin-dato');
  });

  it('detecta captions con números', () => {
    expect(caracteristicasDe({ ...base, caption: 'Tres tips para ahorrar' }).numeros).toBe('sin-numeros');
    expect(caracteristicasDe({ ...base, caption: '3 tips para ahorrar' }).numeros).toBe('con-numeros');
  });
});
