import { describe, it, expect } from 'vitest';
import {
  reglasEspecialistas,
  validarIdeasIA,
  type ContextoEspecialistas,
  type DatosPlataformaEspecialista,
} from '../capabilities/executive/propuestasEspecialistas.js';

const sinConexion = (plataforma: 'instagram' | 'tiktok'): DatosPlataformaEspecialista => ({
  plataforma,
  conectado: false,
  analizados: 0,
  baseSuficiente: false,
  tasaMediana: null,
  tasaUltimos5: null,
  tasaAnteriores: null,
  mejorFormato: null,
  porFormato: [],
  mejorHora: null,
  duracionMedianaSeg: null,
  retencionMedianaSeg: null,
});

const contextoVacio = (): ContextoEspecialistas => ({
  marca: 'Paithon',
  nicho: 'automatización',
  plataformas: [sinConexion('instagram'), sinConexion('tiktok')],
});

describe('reglasEspecialistas sin datos', () => {
  it('genera buenas prácticas de los cuatro agentes y cubre los tres objetivos', () => {
    const props = reglasEspecialistas(contextoVacio());
    const agentes = new Set(props.map((p) => p.agente));
    const objetivos = new Set(props.map((p) => p.objetivo));
    expect(agentes).toEqual(new Set(['ada', 'tomi', 'cami', 'max']));
    expect(objetivos).toEqual(new Set(['exposicion', 'retencion', 'gusto']));
    expect(props.every((p) => p.base === 'buenas-practicas')).toBe(true);
  });

  it('cada propuesta trae paso, señal y acción', () => {
    for (const p of reglasEspecialistas(contextoVacio())) {
      expect(p.paso.length).toBeGreaterThan(10);
      expect(p.senal.length).toBeGreaterThan(5);
      expect(p.accion.label.length).toBeGreaterThan(0);
    }
  });
});

describe('reglasEspecialistas con datos', () => {
  it('propone subir el formato que más rinde en Instagram y cita la tasa', () => {
    const ctx = contextoVacio();
    ctx.plataformas[0] = {
      ...sinConexion('instagram'),
      conectado: true,
      analizados: 12,
      baseSuficiente: true,
      mejorFormato: 'reel',
      porFormato: [
        { formato: 'reel', posts: 6, tasaMediana: 0.041, alcanceMediano: 900 },
        { formato: 'imagen', posts: 6, tasaMediana: 0.012, alcanceMediano: 300 },
      ],
    };
    const props = reglasEspecialistas(ctx);
    const formato = props.find((p) => p.id === 'esp-ada-formato-reel');
    expect(formato?.base).toBe('datos');
    expect(formato?.dato).toMatch(/4,10 %/);
    expect(formato?.gancho).toMatch(/Primer segundo/);
    expect(formato?.estructura.length).toBeGreaterThan(2);
  });

  it('detecta que los reels se dejan a la mitad y propone adelantar el payoff', () => {
    const ctx = contextoVacio();
    ctx.plataformas[0] = {
      ...sinConexion('instagram'),
      conectado: true,
      baseSuficiente: true,
      analizados: 8,
      retencionMedianaSeg: 4,
      duracionMedianaSeg: 15,
    };
    const props = reglasEspecialistas(ctx);
    const ret = props.find((p) => p.id === 'esp-ada-retencion-reels');
    expect(ret?.objetivo).toBe('retencion');
    expect(ret?.dato).toMatch(/27 %/);
  });

  it('pide acortar videos de TikTok largos', () => {
    const ctx = contextoVacio();
    ctx.plataformas[1] = {
      ...sinConexion('tiktok'),
      conectado: true,
      baseSuficiente: true,
      analizados: 8,
      duracionMedianaSeg: 48,
    };
    const props = reglasEspecialistas(ctx);
    expect(props.find((p) => p.id === 'esp-tomi-duracion')?.titulo).toMatch(/15–25/);
  });

  it('avisa cuando la tasa de TikTok viene bajando', () => {
    const ctx = contextoVacio();
    ctx.plataformas[1] = {
      ...sinConexion('tiktok'),
      conectado: true,
      baseSuficiente: true,
      analizados: 10,
      tasaUltimos5: 0.01,
      tasaAnteriores: 0.03,
    };
    const props = reglasEspecialistas(ctx);
    const caida = props.find((p) => p.id === 'esp-tomi-caida-reciente');
    expect(caida?.objetivo).toBe('gusto');
    expect(caida?.prioridad).toBe('alta');
  });

  it('ordena por prioridad: las altas primero', () => {
    const ctx = contextoVacio();
    ctx.plataformas[1] = {
      ...sinConexion('tiktok'),
      conectado: true,
      baseSuficiente: true,
      analizados: 10,
      duracionMedianaSeg: 50,
    };
    const props = reglasEspecialistas(ctx);
    expect(props[0]?.prioridad).toBe('alta');
  });
});

describe('validarIdeasIA', () => {
  it('descarta ideas con agente u objetivo inválidos o sin paso', () => {
    const raw = [
      { agente: 'zeta', objetivo: 'gusto', titulo: 'x', paso: 'algo concreto', senal: 'métrica' },
      { agente: 'ada', objetivo: 'viralidad', titulo: 'x', paso: 'algo concreto', senal: 'métrica' },
      { agente: 'ada', objetivo: 'retencion', titulo: 'Título válido', paso: '', senal: 'métrica' },
    ];
    expect(validarIdeasIA(raw, contextoVacio())).toEqual([]);
  });

  it('acepta una idea válida y la marca como buena práctica sin datos', () => {
    const raw = [
      {
        agente: 'tomi',
        objetivo: 'retencion',
        titulo: 'Cerrá con una respuesta',
        paso: 'Terminá con una respuesta que cambia si lo volvés a mirar.',
        gancho: 'Primer segundo: texto grande con la pregunta.',
        estructura: ['0–1 s: gancho', '1–15 s: el punto', 'final: loop'],
        senal: 'Videos vistos completos.',
      },
    ];
    const salida = validarIdeasIA(raw, contextoVacio());
    expect(salida).toHaveLength(1);
    expect(salida[0]?.base).toBe('buenas-practicas');
    expect(salida[0]?.agente).toBe('tomi');
    expect(salida[0]?.estructura).toHaveLength(3);
  });

  it('limita la cantidad de ideas de la IA a 8', () => {
    const raw = Array.from({ length: 12 }, (_, i) => ({
      agente: 'max',
      objetivo: 'gusto',
      titulo: `Idea ${i}`,
      paso: 'Algo concreto que hacer.',
      senal: 'Métrica',
    }));
    expect(validarIdeasIA(raw, contextoVacio())).toHaveLength(8);
  });
});
