import { describe, it, expect } from 'vitest';
import { HERRAMIENTAS } from '../capabilities/executive/herramientasCatalogo.js';
import { parsearTranscripcion, planEdicion, type Segmento } from '../capabilities/executive/herramientasEdicion.js';

const SRT = `1
00:00:01,000 --> 00:00:02,500
Hola a todos

2
00:00:03,000 --> 00:00:05,000
eh
`;

describe('parsearTranscripcion', () => {
  it('lee bloques SRT con sus tiempos y su texto', () => {
    const segmentos = parsearTranscripcion(SRT);
    expect(segmentos).toEqual([
      { inicio: 1, fin: 2.5, texto: 'Hola a todos' },
      { inicio: 3, fin: 5, texto: 'eh' },
    ]);
  });

  it('lee líneas con [mm:ss] y estima el fin por palabras sin pasar del siguiente inicio', () => {
    const segmentos = parsearTranscripcion('[00:01] Hola\n[00:05] Chau');
    expect(segmentos.map((s) => [s.inicio, s.fin])).toEqual([
      [1, 2.5],
      [5, 6.5],
    ]);
  });

  it('una línea corta seguida de un silencio deja un hueco que se puede cortar', () => {
    const plan = planEdicion(parsearTranscripcion('[00:00] Hoy hablamos de IA hoy\n[00:10] Chau'));
    expect(plan?.silencios).toBe(1);
  });

  it('un texto sin tiempos no produce segmentos', () => {
    expect(parsearTranscripcion('hola como estas')).toEqual([]);
  });
});

describe('planEdicion', () => {
  const segmentos: Segmento[] = [
    { inicio: 0, fin: 2, texto: 'Hola a todos' },
    { inicio: 4, fin: 6, texto: 'eh' },
    { inicio: 7, fin: 9, texto: 'hoy hablamos de IA' },
  ];

  it('corta el silencio dejando una pausa corta y quita la muletilla completa', () => {
    const plan = planEdicion(segmentos);
    expect(plan).not.toBeNull();
    expect(plan?.silencios).toBe(1);
    expect(plan?.muletillas).toBe(1);
    expect(plan?.cortes.map((c) => c.motivo)).toEqual(['silencio', 'muletilla']);
    expect(plan?.conservado).toEqual([
      { inicio: 0, fin: 2.15 },
      { inicio: 6.85, fin: 9 },
    ]);
    expect(plan?.duracionOriginal).toBe(9);
    expect(plan?.duracionFinal).toBe(4.3);
  });

  it('ajusta los subtítulos al video editado', () => {
    const plan = planEdicion(segmentos);
    expect(plan?.subtitulosSrt).toContain('00:00:00,000 --> 00:00:02,000\nHola a todos');
    expect(plan?.subtitulosSrt).toContain('00:00:02,300 --> 00:00:04,300\nHoy hablamos de IA');
    expect(plan?.subtitulosSrt).not.toContain('eh');
  });

  it('arma el comando de FFmpeg con un tramo por corte conservado', () => {
    const plan = planEdicion(segmentos);
    expect(plan?.ffmpeg).toContain('trim=start=0.000:end=2.150');
    expect(plan?.ffmpeg).toContain('trim=start=6.850:end=9.000');
    expect(plan?.ffmpeg).toContain('concat=n=2:v=1:a=1');
  });

  it('capitaliza el subtítulo después de quitar la muletilla del comienzo', () => {
    const plan = planEdicion([{ inicio: 0, fin: 2, texto: 'Eh, hola a todos' }]);
    expect(plan?.subtitulosSrt).toContain('Hola a todos');
  });

  it('sin contenido útil devuelve null', () => {
    expect(planEdicion([{ inicio: 0, fin: 1, texto: 'eh' }])).toBeNull();
  });

  it('una pausa menor al umbral no se corta', () => {
    const plan = planEdicion([
      { inicio: 0, fin: 2, texto: 'uno' },
      { inicio: 2.4, fin: 4, texto: 'dos' },
    ]);
    expect(plan?.silencios).toBe(0);
    expect(plan?.conservado).toEqual([{ inicio: 0, fin: 4 }]);
  });
});

describe('complemento de Guion', () => {
  const guion = HERRAMIENTAS.find((h) => h.id === 'guion');

  it('sin transcripción no agrega nada', () => {
    expect(guion?.complemento?.({ tema: 'x' })).toBeNull();
  });

  it('con transcripción agrega cortes, subtítulos y comando', () => {
    const extra = guion?.complemento?.({ tema: 'x', transcripcion: SRT });
    expect(extra?.secciones.map((s) => s.titulo)).toEqual([
      'Edición propuesta',
      'Cortes',
      'Subtítulos (SRT, ya ajustados al video editado)',
      'Comando de edición (FFmpeg)',
    ]);
  });

  it('una transcripción sin tiempos avisa en vez de inventar cortes', () => {
    const extra = guion?.complemento?.({ tema: 'x', transcripcion: 'hola como estas' });
    expect(extra?.secciones).toEqual([]);
    expect(extra?.notas[0]).toMatch(/no tiene tiempos/);
  });
});
