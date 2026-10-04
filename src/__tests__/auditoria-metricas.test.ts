import { describe, it, expect } from 'vitest';
import {
  bandaDe,
  evaluarAreas,
  prioridadesDe,
  puntajeGeneral,
  resumenReglas,
  type DatosAuditoria,
} from '../capabilities/executive/auditoriaMetricas.js';

const sinDatos = (): DatosAuditoria => ({
  cuentas: [
    {
      plataforma: 'instagram',
      conectado: false,
      error: null,
      seguidoresSemana: null,
      seguidoresSemanaPct: null,
      publicaciones30d: 0,
      tasaMediana: null,
    },
    {
      plataforma: 'tiktok',
      conectado: false,
      error: null,
      seguidoresSemana: null,
      seguidoresSemanaPct: null,
      publicaciones30d: 0,
      tasaMediana: null,
    },
  ],
  objetivos: { total: 0, enMeta: 0, enRiesgo: 0, atrasados: 0, primerAtrasado: null },
  decisiones: { total: 0, pendientes: 0, pendientesUrgentes: 0, expiradas: 0, tiempoResolucionMin: null },
  produccion: { acciones7d: 0, misionesFallidas7d: 0, carruselesEnRevision: 0, piezas: 0 },
  comunidad: { total: 0, sinResponder: 0, escaladas: 0, leadsSinResponder: 0 },
  economia: { ahorroUsd: 0, gastosUsd: 0 },
});

const area = (datos: DatosAuditoria, id: string) => {
  const found = evaluarAreas(datos).find((a) => a.id === id);
  if (!found) throw new Error(`área ${id} no encontrada`);
  return found;
};

describe('bandaDe', () => {
  it('mapea los puntajes a bandas en sus cortes', () => {
    expect(bandaDe(null)).toBe('sin-datos');
    expect(bandaDe(85)).toBe('excelente');
    expect(bandaDe(70)).toBe('bueno');
    expect(bandaDe(55)).toBe('aceptable');
    expect(bandaDe(40)).toBe('riesgo');
    expect(bandaDe(39)).toBe('critico');
  });
});

describe('evaluarAreas sin datos', () => {
  it('no puntúa las áreas sin datos, y conexiones siempre puntúa', () => {
    const areas = evaluarAreas(sinDatos());
    for (const a of areas.filter((x) => x.id !== 'conexiones')) {
      expect(a.puntaje).toBeNull();
      expect(a.banda).toBe('sin-datos');
    }
    expect(area(sinDatos(), 'conexiones').puntaje).toBe(40);
  });
});

describe('reglas por área', () => {
  it('objetivos: el puntaje sube con objetivos en meta y baja con atrasados', () => {
    const d = sinDatos();
    d.objetivos = { total: 3, enMeta: 1, enRiesgo: 1, atrasados: 1, primerAtrasado: 'Crecer en Reels' };
    const a = area(d, 'objetivos');
    expect(a.puntaje).toBe(40);
    expect(a.banda).toBe('riesgo');
    expect(a.observaciones.some((o) => o.includes('Crecer en Reels'))).toBe(true);
  });

  it('decisiones: penaliza las pendientes urgentes', () => {
    const d = sinDatos();
    d.decisiones = { total: 5, pendientes: 3, pendientesUrgentes: 2, expiradas: 0, tiempoResolucionMin: null };
    expect(area(d, 'decisiones').puntaje).toBe(71);
  });

  it('comunidad: resta por escaladas y leads calificados sin respuesta', () => {
    const d = sinDatos();
    d.comunidad = { total: 10, sinResponder: 3, escaladas: 1, leadsSinResponder: 1 };
    expect(area(d, 'comunidad').puntaje).toBe(80);
  });

  it('economía: el ratio ahorro/gasto determina la banda', () => {
    const d = sinDatos();
    d.economia = { ahorroUsd: 1000, gastosUsd: 100 };
    expect(area(d, 'economia').puntaje).toBe(95);
    d.economia = { ahorroUsd: 300, gastosUsd: 100 };
    expect(area(d, 'economia').puntaje).toBe(70);
  });

  it('crecimiento: se basa en el cambio semanal de seguidores', () => {
    const d = sinDatos();
    d.cuentas[0] = {
      plataforma: 'instagram',
      conectado: true,
      error: null,
      seguidoresSemana: -40,
      seguidoresSemanaPct: -2.5,
      publicaciones30d: 0,
      tasaMediana: null,
    };
    const a = area(d, 'crecimiento');
    expect(a.puntaje).toBe(35);
    expect(a.observaciones[0]).toContain('-40 seguidores');
  });
});

describe('puntajeGeneral y prioridades', () => {
  it('promedia solo las áreas con datos y devuelve sin-datos si no hay ninguna', () => {
    expect(puntajeGeneral(evaluarAreas(sinDatos()).filter((a) => a.puntaje === null)).puntaje).toBeNull();
    const d = sinDatos();
    d.economia = { ahorroUsd: 1000, gastosUsd: 100 };
    const general = puntajeGeneral(evaluarAreas(d));
    expect(general.puntaje).toBe(Math.round((95 + 40) / 2));
  });

  it('prioriza hasta tres áreas bajo 70, de la peor a la menos mala', () => {
    const d = sinDatos();
    d.objetivos = { total: 3, enMeta: 1, enRiesgo: 1, atrasados: 1, primerAtrasado: 'X' };
    d.decisiones = { total: 5, pendientes: 4, pendientesUrgentes: 4, expiradas: 2, tiempoResolucionMin: null };
    d.produccion = { acciones7d: 12, misionesFallidas7d: 2, carruselesEnRevision: 0, piezas: 3 };
    const prioridades = prioridadesDe(evaluarAreas(d));
    expect(prioridades.length).toBeLessThanOrEqual(3);
    expect(prioridades.map((p) => p.rank)).toEqual(prioridades.map((_, i) => i + 1));
    const puntajes = prioridades.map(
      (p) => evaluarAreas(d).find((a) => a.nombre.toLowerCase() === p.titulo.replace('Atender ', ''))?.puntaje ?? 0,
    );
    expect([...puntajes].sort((x, y) => x - y)).toEqual(puntajes);
  });

  it('el resumen de reglas avisa cuando no hay datos y nombra la primera prioridad', () => {
    expect(resumenReglas({ puntaje: null, banda: 'sin-datos' }, [], [])).toContain('Todavía no hay datos suficientes');
    const d = sinDatos();
    d.objetivos = { total: 2, enMeta: 0, enRiesgo: 0, atrasados: 2, primerAtrasado: 'Y' };
    const areas = evaluarAreas(d);
    const general = puntajeGeneral(areas);
    const texto = resumenReglas(general, areas, prioridadesDe(areas));
    expect(texto).toContain(`Puntaje general ${general.puntaje}/100`);
    expect(texto).toContain('atender objetivos');
  });
});
