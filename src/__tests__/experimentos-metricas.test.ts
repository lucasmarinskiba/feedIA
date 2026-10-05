import { describe, it, expect } from 'vitest';
import {
  asignarPublicacion,
  compararVariantes,
  crearExperimentoBorrador,
  errorAlIniciar,
  normalCdf,
  progresoDe,
  resultadoDe,
  validarEntrada,
  type Experimento,
  type PublicacionExperimento,
  type ResumenVariante,
} from '../capabilities/executive/experimentosMetricas.js';

const CUANDO = '2026-10-04T12:00:00.000Z';

const publicacion = (id: string, alcance: number, guardados: number): PublicacionExperimento => ({
  id,
  plataforma: 'instagram',
  formato: 'carrusel',
  titulo: `Post ${id}`,
  url: null,
  publicadoEn: CUANDO,
  alcance,
  likes: 0,
  guardados,
  compartidos: 0,
  interacciones: guardados,
});

const entrada = {
  hipotesis: 'Si uso carruseles, suben los guardados por alcance.',
  variable: 'Formato',
  metrica: 'guardados' as const,
  umbralMejora: 10,
  duracionDias: 14,
  nombreA: 'Imagen',
  nombreB: 'Carrusel',
};

const experimentoCon = (postsA: string[], postsB: string[]): Experimento => {
  const exp = crearExperimentoBorrador('exp-1', entrada, CUANDO);
  exp.variantes.A.postIds = postsA;
  exp.variantes.B.postIds = postsB;
  return exp;
};

const resumen = (nombre: string, asignadas: number, alcance: number, valor: number): ResumenVariante => ({
  nombre,
  asignadas,
  conDatos: asignadas,
  alcance,
  valor,
  tasa: alcance > 0 ? valor / alcance : null,
});

describe('normalCdf', () => {
  it('es 0.5 en el centro y simétrica', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
});

describe('validarEntrada', () => {
  it('acepta una entrada válida con valores por defecto', () => {
    const r = validarEntrada({ hipotesis: 'Si hago X, entonces Y.', variable: 'Formato', metrica: 'likes' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.umbralMejora).toBe(10);
      expect(r.valor.duracionDias).toBe(14);
      expect(r.valor.nombreA).toBe('Original');
      expect(r.valor.nombreB).toBe('Variante');
    }
  });

  it('rechaza hipótesis corta, métrica desconocida y rangos fuera de límite', () => {
    expect(validarEntrada({ ...entrada, hipotesis: 'corta' }).ok).toBe(false);
    expect(validarEntrada({ ...entrada, metrica: 'alcance' }).ok).toBe(false);
    expect(validarEntrada({ ...entrada, umbralMejora: 0 }).ok).toBe(false);
    expect(validarEntrada({ ...entrada, duracionDias: 61 }).ok).toBe(false);
    expect(validarEntrada({ ...entrada, duracionDias: 2.5 }).ok).toBe(false);
  });

  it('quita bytes nulos del texto', () => {
    const r = validarEntrada({ ...entrada, hipotesis: 'Si hago\u0000 X, entonces Y.' });
    expect(r.ok && r.valor.hipotesis).toBe('Si hago X, entonces Y.');
  });
});

describe('asignarPublicacion', () => {
  it('mueve una publicación entre variantes sin duplicarla y permite quitarla', () => {
    const exp = experimentoCon([], []);
    asignarPublicacion(exp, 'p1', 'A');
    asignarPublicacion(exp, 'p1', 'B');
    expect(exp.variantes.A.postIds).toEqual([]);
    expect(exp.variantes.B.postIds).toEqual(['p1']);
    asignarPublicacion(exp, 'p1', null);
    expect(exp.variantes.B.postIds).toEqual([]);
  });
});

describe('errorAlIniciar', () => {
  it('exige al menos dos publicaciones por variante', () => {
    expect(errorAlIniciar(experimentoCon(['a', 'b'], ['c']))).toMatch(/necesita al menos 2/);
    expect(errorAlIniciar(experimentoCon(['a', 'b'], ['c', 'd']))).toBeNull();
  });

  it('no inicia un experimento que ya no es borrador', () => {
    const exp = experimentoCon(['a', 'b'], ['c', 'd']);
    exp.estado = 'corriendo';
    expect(errorAlIniciar(exp)).toMatch(/borrador/);
  });
});

describe('compararVariantes', () => {
  it('declara ganador B cuando la mejora es grande y el alcance alcanza', () => {
    const r = compararVariantes(resumen('A', 2, 10000, 100), resumen('B', 2, 10000, 300), 10);
    expect(r.veredicto).toBe('gana-B');
    expect(r.probabilidadB).toBeGreaterThan(0.95);
    expect(r.diferenciaPct).toBeCloseTo(200, 6);
  });

  it('declara ganador A cuando la base supera a la prueba', () => {
    const r = compararVariantes(resumen('A', 2, 10000, 300), resumen('B', 2, 10000, 100), 10);
    expect(r.veredicto).toBe('gana-A');
    expect(r.probabilidadB).toBeLessThan(0.05);
  });

  it('no declara ganador si la diferencia es menor al umbral', () => {
    const r = compararVariantes(resumen('A', 2, 10000, 100), resumen('B', 2, 10000, 105), 10);
    expect(r.veredicto).toBe('sin-diferencia');
  });

  it('pide más datos cuando una variante no llega al alcance mínimo', () => {
    const r = compararVariantes(resumen('A', 2, 200, 10), resumen('B', 2, 10000, 300), 10);
    expect(r.veredicto).toBe('datos-insuficientes');
    expect(r.explicacion).toMatch(/Original|A/);
  });

  it('pide asignar publicaciones cuando una variante está vacía', () => {
    const r = compararVariantes(resumen('A', 0, 0, 0), resumen('B', 2, 10000, 300), 10);
    expect(r.veredicto).toBe('datos-insuficientes');
  });
});

describe('resultadoDe', () => {
  it('calcula la tasa por variante desde las publicaciones asignadas', () => {
    const exp = experimentoCon(['a1', 'a2'], ['b1', 'b2']);
    const pool = [
      publicacion('a1', 5000, 50),
      publicacion('a2', 5000, 50),
      publicacion('b1', 5000, 150),
      publicacion('b2', 5000, 150),
    ];
    const r = resultadoDe(exp, pool, CUANDO);
    expect(r.variantes.A.tasa).toBeCloseTo(0.01, 6);
    expect(r.variantes.B.tasa).toBeCloseTo(0.03, 6);
    expect(r.veredicto).toBe('gana-B');
    expect(r.faltantes).toBe(0);
  });

  it('cuenta las publicaciones asignadas que ya no están en el pool', () => {
    const exp = experimentoCon(['a1', 'a2', 'viejo'], ['b1', 'b2']);
    const pool = [
      publicacion('a1', 5000, 50),
      publicacion('a2', 5000, 50),
      publicacion('b1', 5000, 150),
      publicacion('b2', 5000, 150),
    ];
    const r = resultadoDe(exp, pool, CUANDO);
    expect(r.faltantes).toBe(1);
    expect(r.variantes.A.conDatos).toBe(2);
  });

  it('ignora publicaciones sin alcance medido', () => {
    const exp = experimentoCon(['a1', 'a2'], ['b1', 'b2']);
    const pool = [
      publicacion('a1', 0, 0),
      publicacion('a2', 5000, 50),
      publicacion('b1', 5000, 150),
      publicacion('b2', 5000, 150),
    ];
    const r = resultadoDe(exp, pool, CUANDO);
    expect(r.variantes.A.conDatos).toBe(1);
    expect(r.veredicto).toBe('datos-insuficientes');
  });
});

describe('progresoDe', () => {
  it('marca listo para cerrar cuando se cumple la duración', () => {
    const exp = experimentoCon(['a', 'b'], ['c', 'd']);
    exp.estado = 'corriendo';
    exp.iniciadoEn = '2026-09-20T12:00:00.000Z';
    const p = progresoDe(exp, new Date('2026-10-04T12:00:00.000Z'));
    expect(p).toEqual({ diasTranscurridos: 14, diasTotales: 14, listoParaCerrar: true });
  });

  it('devuelve null si el experimento no inició', () => {
    expect(progresoDe(experimentoCon([], []), new Date())).toBeNull();
  });
});
