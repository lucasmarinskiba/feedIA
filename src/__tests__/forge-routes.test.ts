import { describe, it, expect } from 'vitest';
import {
  accionablesDesde,
  decisionDesde,
  entradaDesde,
  piezaDesde,
  recomendacionDesde,
} from '../server/forgeRoutes.js';
import type { ResumenHistorial, GrupoResumen } from '../capabilities/executive/predictorModelo.js';
import type { ScoreCard } from '../capabilities/contentScorer/scorer.js';
import type { HookScore } from '../capabilities/copywriting/hookLab.js';

const grupo = (clave: string, etiqueta: string, posts: number, vsMediana: number): GrupoResumen => ({
  clave,
  etiqueta,
  posts,
  tasaMediana: 0.03,
  vsMediana,
});

const resumenConDatos: ResumenHistorial = {
  plataformas: [
    {
      plataforma: 'instagram',
      posts: 12,
      medianaTasa: 0.03,
      porFormato: [grupo('reel', 'Reel', 5, 1.6), grupo('carrusel', 'Carrusel', 7, 1.1)],
      porFranja: [grupo('noche', 'Noche', 6, 1.3)],
      porHook: [grupo('pregunta', 'Pregunta', 4, 1.2)],
      porCta: [grupo('guardar', 'Guardar', 5, 1.4)],
    },
  ],
};

const scoreContenido: ScoreCard = {
  shareScore: 70,
  saveScore: 50,
  combinedScore: 58,
  band: 'aceptable',
  shareDrivers: ['identificación'],
  saveDrivers: ['valor práctico'],
  blockers: ['Falta CTA claro'],
  recommendations: ['Sumá una lista numerada'],
};

const scoreHookBase: HookScore = {
  hook: 'Cómo hacer X',
  score: 55,
  category: null,
  reasons: [],
  improvements: ['Usá un número concreto'],
};

describe('entradaDesde', () => {
  it('exige un tema', () => {
    expect(entradaDesde({ formato: 'reel' })).toEqual({ error: 'tema requerido' });
  });

  it('rechaza formatos fuera de carrusel, reel e historia', () => {
    const r = entradaDesde({ tema: 'x', formato: 'video' });
    expect(r).toEqual({ error: 'formato inválido (carrusel|reel|historia)' });
  });

  it('aplica defaults y limpia listas', () => {
    const r = entradaDesde({
      tema: '  marketing con IA  ',
      formato: 'carrusel',
      competidores: ['  tips  ', '', 7, 'tutorial'],
    });
    expect(r).toMatchObject({
      tema: 'marketing con IA',
      formato: 'carrusel',
      plataforma: 'instagram',
      objetivo: 'engagement',
      voz: 'cercano',
      hook: null,
      competidores: ['tips', 'tutorial'],
      ajustes: [],
    });
  });
});

describe('piezaDesde', () => {
  it('pide hook y caption (la caption no aplica a historias)', () => {
    expect(piezaDesde({ pieza: { formato: 'reel', caption: 'c' } })).toEqual({ error: 'pieza.hook requerido' });
    expect(piezaDesde({ pieza: { formato: 'reel', hook: 'h' } })).toEqual({ error: 'pieza.caption requerido' });
    const historia = piezaDesde({ pieza: { formato: 'historia', hook: 'h' } });
    expect('error' in historia).toBe(false);
  });

  it('descarta horas fuera de rango y normaliza el día', () => {
    const r = piezaDesde({ pieza: { formato: 'carrusel', hook: 'h', caption: 'c' }, hora: 25, dia: ' Martes ' });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.hora).toBeNull();
    expect(r.dia).toBe('martes');
  });
});

describe('recomendacionDesde', () => {
  it('avisa cuando la cuenta no tiene posts guardados en esa red', () => {
    const r = recomendacionDesde({ plataformas: [] }, 'tiktok', 'reel');
    expect(r.disponible).toBe(false);
    expect(r.elegido).toBeNull();
    expect(r.motivo).toContain('tiktok');
  });

  it('usa el historial real y marca cómo rindió el formato elegido', () => {
    const r = recomendacionDesde(resumenConDatos, 'instagram', 'carrusel');
    expect(r.disponible).toBe(true);
    expect(r.posts).toBe(12);
    expect(r.mejorFormato?.etiqueta).toBe('Reel');
    expect(r.elegido).toEqual({ etiqueta: 'Carrusel', posts: 7, vsMediana: 1.1 });
    expect(r.motivo).not.toContain('orientativo');
  });

  it('no hay "elegido" para historias, que el modelo no mide', () => {
    const r = recomendacionDesde(resumenConDatos, 'instagram', 'historia');
    expect(r.disponible).toBe(true);
    expect(r.elegido).toBeNull();
  });

  it('marca como orientativo un historial chico', () => {
    const chico: ResumenHistorial = {
      plataformas: [{ ...resumenConDatos.plataformas[0]!, posts: 3 }],
    };
    expect(recomendacionDesde(chico, 'instagram', 'reel').motivo).toContain('orientativo');
  });
});

describe('decisionDesde', () => {
  it('sólo dice "listo" cuando contenido y hook pasan el umbral y la cuenta no es débil', () => {
    expect(decisionDesde(70, 70, 'promedio')).toBe('listo');
    expect(decisionDesde(70, 70, 'sin-datos')).toBe('listo');
    expect(decisionDesde(70, 70, 'debil')).toBe('mejorar');
    expect(decisionDesde(59, 90, 'fuerte')).toBe('mejorar');
    expect(decisionDesde(90, 59, 'fuerte')).toBe('mejorar');
  });
});

describe('accionablesDesde', () => {
  it('une señales de contenido y hook sin repetir y con tope', () => {
    const r = accionablesDesde({ prediccion: null, contenido: scoreContenido, hook: scoreHookBase });
    expect(r).toEqual(['Usá un número concreto', 'Falta CTA claro', 'Sumá una lista numerada']);
  });

  it('no incluye recomendaciones del modelo sin datos suficientes', () => {
    const prediccionSinDatos = {
      veredicto: { nivel: 'sin-datos' },
      recomendaciones: ['Todavía hay pocos posts'],
      factores: [],
    } as unknown as Parameters<typeof accionablesDesde>[0]['prediccion'];
    const r = accionablesDesde({ prediccion: prediccionSinDatos, contenido: scoreContenido, hook: scoreHookBase });
    expect(r).not.toContain('Todavía hay pocos posts');
  });
});
