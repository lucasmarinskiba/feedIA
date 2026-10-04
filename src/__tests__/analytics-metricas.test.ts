import { describe, it, expect } from 'vitest';
import {
  distribucion,
  parsearDesgloseMeta,
  resumenDePosts,
  serieSeguidores,
} from '../capabilities/experience/analyticsMetricas.js';
import { analizarPosts, type PostCrudo } from '../capabilities/executive/postsMetricas.js';

const DIA = 86_400_000;
const AHORA = Date.parse('2026-10-04T12:00:00Z');

const post = (id: string, diasAtras: number, overrides: Partial<PostCrudo> = {}): PostCrudo => ({
  id,
  plataforma: 'instagram',
  formato: 'imagen',
  texto: `post ${id}`,
  url: `https://www.instagram.com/p/${id}/`,
  publicadoEn: new Date(AHORA - diasAtras * DIA).toISOString(),
  likes: 10,
  comentarios: 2,
  compartidos: 1,
  guardados: 1,
  alcance: 1000,
  duracionSeg: null,
  ...overrides,
});

describe('serieSeguidores', () => {
  it('ordena por fecha y conserva el último valor de cada día', () => {
    const serie = serieSeguidores([
      { capturedAt: '2026-10-02T20:00:00Z', followers: 120 },
      { capturedAt: '2026-10-01T09:00:00Z', followers: 100 },
      { capturedAt: '2026-10-02T08:00:00Z', followers: 110 },
    ]);
    expect(serie).toEqual([
      { fecha: '2026-10-01', seguidores: 100 },
      { fecha: '2026-10-02', seguidores: 120 },
    ]);
  });
});

describe('resumenDePosts', () => {
  it('suma solo la ventana de 30 días y excluye nulls de las sumas', () => {
    const posts = [post('a', 2), post('b', 10, { guardados: null, alcance: null }), post('c', 45)];
    const { posts: analizados, resumen } = analizarPosts(posts);
    const r = resumenDePosts(analizados, resumen, AHORA);
    expect(r.analizados).toBe(3);
    expect(r.ventana30d.publicaciones).toBe(2);
    expect(r.ventana30d.likes).toBe(20);
    expect(r.ventana30d.guardados).toBe(1);
    expect(r.ventana30d.alcance).toBe(1000);
  });

  it('devuelve null en sumas de campos que la red no entregó', () => {
    const { posts: analizados, resumen } = analizarPosts([
      post('a', 1, { guardados: null, compartidos: null, alcance: null }),
    ]);
    const r = resumenDePosts(analizados, resumen, AHORA);
    expect(r.ventana30d.guardados).toBeNull();
    expect(r.ventana30d.compartidos).toBeNull();
    expect(r.ventana30d.alcance).toBeNull();
  });

  it('calcula la frecuencia semanal sobre 30 días', () => {
    const posts = Array.from({ length: 6 }, (_, i) => post(`p${i}`, i + 1));
    const { posts: analizados, resumen } = analizarPosts(posts);
    expect(resumenDePosts(analizados, resumen, AHORA).frecuenciaSemanal).toBe(1.4);
  });

  it('devuelve los tres posts con mayor tasa de interacción', () => {
    const posts = [
      post('a', 1, { likes: 5 }),
      post('b', 2, { likes: 50 }),
      post('c', 3, { likes: 20 }),
      post('d', 4, { likes: 80 }),
      post('e', 5, { likes: 1 }),
    ];
    const { posts: analizados, resumen } = analizarPosts(posts);
    const top = resumenDePosts(analizados, resumen, AHORA).top.map((p) => p.id);
    expect(top).toEqual(['d', 'b', 'c']);
  });
});

describe('distribucion', () => {
  it('calcula porcentajes sobre el total y ordena de mayor a menor', () => {
    const d = distribucion([
      { etiqueta: 'Mujeres', valor: 30 },
      { etiqueta: 'Hombres', valor: 70 },
      { etiqueta: 'Sin especificar', valor: 0 },
    ]);
    expect(d).toEqual([
      { etiqueta: 'Hombres', valor: 70, pct: 70 },
      { etiqueta: 'Mujeres', valor: 30, pct: 30 },
    ]);
  });

  it('devuelve lista vacía sin valores positivos', () => {
    expect(distribucion([{ etiqueta: 'x', valor: 0 }])).toEqual([]);
  });
});

describe('parsearDesgloseMeta', () => {
  const respuesta = {
    data: [
      {
        total_value: {
          breakdowns: [
            {
              results: [
                { dimension_values: ['F'], value: 60 },
                { dimension_values: ['M'], value: 30 },
                { dimension_values: ['U'], value: 10 },
              ],
            },
          ],
        },
      },
    ],
  };

  it('traduce las claves con las etiquetas indicadas', () => {
    const d = parsearDesgloseMeta(respuesta, { F: 'Mujeres', M: 'Hombres', U: 'Sin especificar' });
    expect(d.map((i) => i.etiqueta)).toEqual(['Mujeres', 'Hombres', 'Sin especificar']);
    expect(d[0]?.pct).toBe(60);
  });

  it('devuelve lista vacía si Meta responde sin datos o con error', () => {
    expect(parsearDesgloseMeta(null)).toEqual([]);
    expect(parsearDesgloseMeta({ data: [] })).toEqual([]);
  });
});
