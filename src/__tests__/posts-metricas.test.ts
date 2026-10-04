import { describe, it, expect } from 'vitest';
import { analizarPosts, mediana, tasaDeInteraccion, type PostCrudo } from '../capabilities/executive/postsMetricas.js';

const post = (id: string, overrides: Partial<PostCrudo> = {}): PostCrudo => ({
  id,
  plataforma: 'instagram',
  formato: 'imagen',
  texto: `post ${id}`,
  url: null,
  publicadoEn: `2026-09-${String(10 + Number(id.replace(/\D/g, '') || 0)).padStart(2, '0')}T15:00:00Z`,
  likes: 10,
  comentarios: 0,
  compartidos: 0,
  guardados: 0,
  alcance: 1000,
  duracionSeg: null,
  ...overrides,
});

describe('mediana', () => {
  it('devuelve null sin valores y promedia el par central', () => {
    expect(mediana([])).toBeNull();
    expect(mediana([1, 3, 2])).toBe(2);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });
});

describe('tasaDeInteraccion', () => {
  it('suma likes, comentarios, compartidos y guardados sobre el alcance', () => {
    expect(tasaDeInteraccion(post('a', { likes: 5, comentarios: 3, compartidos: 1, guardados: 1, alcance: 100 }))).toBe(
      10,
    );
  });

  it('devuelve null sin alcance', () => {
    expect(tasaDeInteraccion(post('a', { alcance: null }))).toBeNull();
    expect(tasaDeInteraccion(post('a', { alcance: 0 }))).toBeNull();
  });
});

describe('analizarPosts', () => {
  it('no compara cuando hay menos de 3 posts con métricas', () => {
    const { posts, resumen } = analizarPosts([post('1'), post('2')]);
    expect(resumen.baseSuficiente).toBe(false);
    expect(resumen.mejorFormato).toBeNull();
    expect(posts.every((p) => p.veredicto === 'sin-base')).toBe(true);
  });

  it('marca destacado, escondido y bajo según la mediana de la cuenta', () => {
    const base = [
      post('1', { likes: 10, alcance: 1000 }),
      post('2', { likes: 10, alcance: 1000 }),
      post('3', { likes: 10, alcance: 1000 }),
    ];
    const destacado = post('4', { likes: 60, alcance: 1200 });
    const escondido = post('5', { likes: 60, alcance: 300 });
    const bajo = post('6', { likes: 1, alcance: 1000 });
    const { posts } = analizarPosts([...base, destacado, escondido, bajo]);
    const porId = Object.fromEntries(posts.map((p) => [p.id, p.veredicto]));
    expect(porId['4']).toBe('destacado');
    expect(porId['5']).toBe('escondido');
    expect(porId['6']).toBe('bajo');
    expect(porId['1']).toBe('normal');
  });

  it('excluye de las medianas los posts sin alcance', () => {
    const { posts, resumen } = analizarPosts([post('1'), post('2'), post('3'), post('4', { alcance: null })]);
    expect(posts.find((p) => p.id === '4')?.veredicto).toBe('sin-datos');
    expect(resumen.analizados).toBe(4);
    expect(resumen.tasaMediana).toBeCloseTo(1, 5);
  });

  it('elige formato ganador solo con al menos dos posts de ese formato', () => {
    const { resumen } = analizarPosts([
      post('1', { formato: 'reel', likes: 50 }),
      post('2', { formato: 'reel', likes: 40 }),
      post('3', { formato: 'imagen' }),
      post('4', { formato: 'imagen' }),
      post('5', { formato: 'carrusel', likes: 90 }),
    ]);
    expect(resumen.mejorFormato).toBe('reel');
  });

  it('ordena los posts del más reciente al más antiguo', () => {
    const { posts } = analizarPosts([post('1'), post('2'), post('3')]);
    const fechas = posts.map((p) => Date.parse(p.publicadoEn));
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
  });
});
