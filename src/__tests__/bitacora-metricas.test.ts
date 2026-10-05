import { describe, it, expect } from 'vitest';
import {
  agruparPorDia,
  aCsv,
  contarPorCategoria,
  filtrarEventos,
  limitarEventos,
  type EventoBitacora,
} from '../capabilities/executive/bitacoraMetricas.js';

const evento = (id: string, cuando: string, overrides: Partial<EventoBitacora> = {}): EventoBitacora => ({
  id,
  cuando,
  categoria: 'decision',
  titulo: `Evento ${id}`,
  detalle: 'Detalle',
  actor: 'vos',
  resultado: null,
  ...overrides,
});

const eventos: EventoBitacora[] = [
  evento('a', '2026-10-03T15:00:00.000Z', { categoria: 'okr', titulo: 'Objetivo creado: Crecer' }),
  evento('b', '2026-10-04T10:00:00.000Z', { categoria: 'decision', titulo: 'Publicar campaña', resultado: 'Aprobada' }),
  evento('c', '2026-10-04T12:00:00.000Z', { categoria: 'cuentas', titulo: 'Instagram conectada', actor: 'vos' }),
];

describe('filtrarEventos', () => {
  it('filtra por categoría', () => {
    expect(filtrarEventos(eventos, { categoria: 'okr' }).map((e) => e.id)).toEqual(['a']);
  });

  it('busca en título, detalle, actor y resultado sin distinguir mayúsculas', () => {
    expect(filtrarEventos(eventos, { texto: 'APROBADA' }).map((e) => e.id)).toEqual(['b']);
    expect(filtrarEventos(eventos, { texto: 'instagram' }).map((e) => e.id)).toEqual(['c']);
  });

  it('sin filtros devuelve todo', () => {
    expect(filtrarEventos(eventos, {})).toHaveLength(3);
  });
});

describe('agruparPorDia', () => {
  it('agrupa por día con los días y eventos más recientes primero', () => {
    const grupos = agruparPorDia(eventos);
    expect(grupos.map((g) => g.eventos.length)).toEqual([2, 1]);
    expect(grupos[0]?.eventos[0]?.id).toBe('c');
  });
});

describe('contarPorCategoria', () => {
  it('cuenta cada categoría y deja en cero las que no tienen eventos', () => {
    const conteo = contarPorCategoria(eventos);
    expect(conteo.decision).toBe(1);
    expect(conteo.okr).toBe(1);
    expect(conteo.autopilot).toBe(0);
  });
});

describe('aCsv', () => {
  it('escapa comas, comillas y saltos de línea, y ordena del más reciente al más antiguo', () => {
    const csv = aCsv([
      evento('x', '2026-10-04T10:00:00.000Z', { titulo: 'Decisión, con "comillas"', detalle: 'línea\nnueva' }),
      evento('y', '2026-10-03T10:00:00.000Z'),
    ]);
    const lineas = csv.split('\n');
    expect(lineas[0]).toBe('cuando,categoria,titulo,detalle,actor,resultado');
    expect(csv).toContain('"Decisión, con ""comillas"""');
    expect(lineas[1]?.startsWith('2026-10-04')).toBe(true);
  });
});

describe('limitarEventos', () => {
  it('acota el límite entre 1 y 500', () => {
    expect(limitarEventos(0)).toBe(1);
    expect(limitarEventos(10_000)).toBe(500);
    expect(limitarEventos(25.7)).toBe(25);
    expect(limitarEventos(Number.NaN)).toBe(1);
  });
});
