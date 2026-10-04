import { describe, it, expect } from 'vitest';
import {
  caracteristicasDe,
  historialDesdePosts,
  predecirContenido,
  type EntradaContenido,
  type PostHistorial,
} from '../capabilities/executive/predictorModelo.js';
import type { PostCrudo } from '../capabilities/executive/postsMetricas.js';

const entrada = (overrides: Partial<EntradaContenido> = {}): EntradaContenido => ({
  plataforma: 'instagram',
  formato: 'reel',
  caption: 'Hacé tu calendario hoy',
  hashtags: [],
  hora: 19,
  dia: 'martes',
  duracionSeg: null,
  ...overrides,
});

const historial = (
  n: number,
  opciones: {
    conPreguntaTasa?: number;
    sinPreguntaTasa?: number;
    formato?: PostHistorial['formato'];
    tiempo?: boolean;
  } = {},
): PostHistorial[] =>
  Array.from({ length: n }, (_, i) => {
    const pregunta = i % 2 === 0;
    return {
      id: `p${i}`,
      plataforma: 'instagram',
      formato: opciones.formato ?? 'reel',
      captionCompleto: pregunta ? '¿Cómo hacer tu calendario?' : 'Hacé tu calendario hoy',
      publicadoEn: new Date(Date.UTC(2026, 8, 1 + (i % 28), 22)).toISOString(),
      duracionSeg: null,
      tasaInteraccion: pregunta
        ? (opciones.conPreguntaTasa ?? 10) + (i % 3) * 0.5
        : (opciones.sinPreguntaTasa ?? 4) + (i % 3) * 0.5,
      alcance: 1000 + (i % 5) * 200,
      tiempoVisualizacionSeg: opciones.tiempo ? 6 + (i % 4) : null,
    };
  });

describe('caracteristicasDe', () => {
  it('clasifica el hook, el llamado a la acción y el largo', () => {
    const pregunta = caracteristicasDe({
      formato: 'reel',
      caption: '¿Cómo automatizo mi marketing?',
      hashtagsExtra: [],
      hora: 19,
      dia: 'martes',
      duracionSeg: null,
    });
    expect(pregunta.hook).toBe('pregunta');
    const numero = caracteristicasDe({
      formato: 'reel',
      caption: '5 errores al elegir nicho',
      hashtagsExtra: [],
      hora: 9,
      dia: 'lunes',
      duracionSeg: null,
    });
    expect(numero.hook).toBe('numero');
    expect(numero.franja).toBe('mañana');
    const contraste = caracteristicasDe({
      formato: 'carrusel',
      caption: 'Nadie te cuenta esto de Instagram. Guardá este post',
      hashtagsExtra: [],
      hora: 3,
      dia: null,
      duracionSeg: null,
    });
    expect(contraste.hook).toBe('contraste');
    expect(contraste.cta).toBe('con-cta');
    expect(contraste.franja).toBe('madrugada');
    expect(contraste.dia).toBe('sin-dato');
    expect(contraste.largo).toBe('corto');
  });

  it('cuenta hashtags sin repetir y agrupa por tramos', () => {
    const c = caracteristicasDe({
      formato: 'imagen',
      caption: 'Texto #marketing #IA',
      hashtagsExtra: ['marketing', '#instagram'],
      hora: 20,
      dia: 'jueves',
      duracionSeg: null,
    });
    expect(c.hashtags).toBe('1-4');
  });

  it('solo mide duración en reels y videos', () => {
    expect(
      caracteristicasDe({ formato: 'reel', caption: 'x', hashtagsExtra: [], hora: null, dia: null, duracionSeg: 25 })
        .duracion,
    ).toBe('16-30s');
    expect(
      caracteristicasDe({
        formato: 'carrusel',
        caption: 'x',
        hashtagsExtra: [],
        hora: null,
        dia: null,
        duracionSeg: 25,
      }).duracion,
    ).toBe('no-aplica');
  });
});

describe('predecirContenido', () => {
  it('sin historial no inventa números', () => {
    const p = predecirContenido([], entrada());
    expect(p.confianza).toBe('sin-datos');
    expect(p.tasaInteraccion).toBeNull();
    expect(p.alcance).toBeNull();
    expect(p.probabilidades.superarMediana).toBeNull();
    expect(p.recomendaciones.some((r) => r.includes('Conectá tu cuenta'))).toBe(true);
  });

  it('aprende el efecto real del hook con pregunta sobre el historial', () => {
    const h = historial(30);
    const conPregunta = predecirContenido(h, entrada({ caption: '¿Cómo hacer tu calendario?' }));
    const sinPregunta = predecirContenido(h, entrada({ caption: 'Hacé tu calendario hoy' }));
    expect(conPregunta.tasaInteraccion).not.toBeNull();
    expect(sinPregunta.tasaInteraccion).not.toBeNull();
    expect((conPregunta.tasaInteraccion?.p50 ?? 0) / (sinPregunta.tasaInteraccion?.p50 ?? 1)).toBeGreaterThan(1.5);
    expect(conPregunta.factores.some((f) => f.factor.includes('pregunta') && f.efecto === 'positivo')).toBe(true);
  });

  it('recomienda el hook que rinde mejor en la cuenta cuando el contenido usa otro', () => {
    const p = predecirContenido(historial(30), entrada({ caption: 'Hacé tu calendario hoy' }));
    expect(p.recomendaciones.some((r) => r.includes('pregunta'))).toBe(true);
  });

  it('las probabilidades son coherentes: superar la mediana es más probable que entrar al top 25%', () => {
    const p = predecirContenido(historial(30), entrada());
    expect(p.probabilidades.superarMediana).not.toBeNull();
    expect(p.probabilidades.superarMediana ?? 0).toBeGreaterThanOrEqual(p.probabilidades.entreLosMejores25 ?? 0);
    expect(p.probabilidades.superarMediana ?? -1).toBeGreaterThanOrEqual(0);
    expect(p.probabilidades.superarMediana ?? 101).toBeLessThanOrEqual(100);
  });

  it('el rango va de menor a mayor', () => {
    const p = predecirContenido(historial(30), entrada());
    expect(p.tasaInteraccion?.p10 ?? 0).toBeLessThanOrEqual(p.tasaInteraccion?.p50 ?? 0);
    expect(p.tasaInteraccion?.p50 ?? 0).toBeLessThanOrEqual(p.tasaInteraccion?.p90 ?? 0);
  });

  it('con pocos posts la confianza es baja y no hay probabilidades', () => {
    const p = predecirContenido(historial(5), entrada());
    expect(p.confianza).toBe('baja');
    expect(p.probabilidades.superarMediana).toBeNull();
    expect(p.tasaInteraccion).toBeNull();
  });

  it('con historial suficiente la confianza sube a media o alta', () => {
    const p = predecirContenido(historial(25), entrada());
    expect(['media', 'alta']).toContain(p.confianza);
  });

  it('la retención solo se predice con reels que tienen tiempo de visualización', () => {
    const sin = predecirContenido(historial(20), entrada());
    expect(sin.retencion.disponible).toBe(false);
    expect(sin.retencion.motivo).toContain('no devolvió tiempo de visualización');

    const con = predecirContenido(historial(20, { tiempo: true }), entrada());
    expect(con.retencion.disponible).toBe(true);
    expect(con.retencion.tiempoVisualizacionSeg?.p50 ?? 0).toBeGreaterThan(0);

    const carrusel = predecirContenido(historial(20, { tiempo: true }), entrada({ formato: 'carrusel' }));
    expect(carrusel.retencion.disponible).toBe(false);
  });

  it('TikTok no expone retención', () => {
    const tt = historial(20).map((p) => ({ ...p, plataforma: 'tiktok' as const }));
    const p = predecirContenido(tt, entrada({ plataforma: 'tiktok' }));
    expect(p.retencion.disponible).toBe(false);
    expect(p.retencion.motivo).toContain('TikTok no expone');
  });
});

describe('historialDesdePosts', () => {
  it('usa el caption completo y cae al texto de la primera línea si falta', () => {
    const base: PostCrudo = {
      id: '1',
      plataforma: 'instagram',
      formato: 'reel',
      texto: 'Primera línea',
      url: null,
      publicadoEn: '2026-10-01T12:00:00Z',
      likes: 10,
      comentarios: 2,
      compartidos: 1,
      guardados: 1,
      alcance: 1000,
      duracionSeg: null,
    };
    const [conCaption, sinCaption] = historialDesdePosts([{ ...base, captionCompleto: 'Caption completo #tag' }, base]);
    expect(conCaption?.captionCompleto).toBe('Caption completo #tag');
    expect(sinCaption?.captionCompleto).toBe('Primera línea');
    expect(conCaption?.tasaInteraccion).toBeCloseTo(1.4, 5);
  });
});
