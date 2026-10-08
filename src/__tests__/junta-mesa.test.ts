import { describe, expect, it } from 'vitest';
import { construirMesa, type EntradaMesa } from '../capabilities/executive/mesaEjecutiva.js';

const completa: EntradaMesa = {
  totalPosts: 30,
  seguidoresTotal: 12500,
  crecimientoPct: 4,
  decisiones: { pendientes: 3, criticas: 1, masAntiguaHoras: 26 },
  programacion: { proximos14Dias: 9, vencidos: 0, fallidos: 0 },
  objetivos: [
    {
      titulo: 'Crecer en Instagram',
      progresoPct: 40,
      progresoEsperadoPct: 50,
      resultadosTotal: 2,
      resultadosQueLlegan: 1,
    },
  ],
};

const vacia: EntradaMesa = {
  totalPosts: 0,
  seguidoresTotal: null,
  crecimientoPct: null,
  decisiones: null,
  programacion: null,
  objetivos: null,
};

const asiento = (m: ReturnType<typeof construirMesa>, rol: string) => {
  const a = m.asientos.find((x) => x.rol === rol);
  if (!a) throw new Error(`falta asiento ${rol}`);
  return a;
};

describe('construirMesa', () => {
  it('siempre arma los siete asientos en el mismo orden', () => {
    const m = construirMesa(vacia);
    expect(m.asientos.map((a) => a.rol)).toEqual([
      'Dirección general',
      'Crecimiento',
      'Operaciones',
      'Producción',
      'Datos',
      'Cumplimiento y marca',
      'Finanzas',
    ]);
  });

  it('el resumen suma exactamente la cantidad de asientos', () => {
    const m = construirMesa(completa);
    expect(m.resumen.listo + m.resumen.parcial + m.resumen['sin-datos']).toBe(m.asientos.length);
  });

  it('sin datos ningún asiento inventa una respuesta con números', () => {
    const m = construirMesa(vacia);
    for (const a of m.asientos) {
      expect(a.respuesta).not.toMatch(/\d+ (publicación|objetivo|decisión)/);
    }
    expect(asiento(m, 'Crecimiento').estado).toBe('sin-datos');
    expect(asiento(m, 'Crecimiento').faltantes.length).toBeGreaterThan(0);
  });

  it('confianza baja por debajo del umbral del predictor, nunca alta', () => {
    const pocas = construirMesa({ ...completa, totalPosts: 3 });
    expect(asiento(pocas, 'Datos').evidencia.confianza).toBe('baja');
    expect(asiento(pocas, 'Datos').faltantes[0]).toMatch(/Faltan 5 publicación/);

    const muchas = construirMesa({ ...completa, totalPosts: 50 });
    expect(asiento(muchas, 'Datos').evidencia.confianza).toBe('media');
    for (const a of muchas.asientos) expect(a.evidencia.confianza).not.toBe('alta');
  });

  it('dirección: el progreso se resume con promedio y cuenta resultados que llegan a la meta', () => {
    const d = asiento(construirMesa(completa), 'Dirección general');
    expect(d.respuesta).toContain('Progreso medio 40% frente a 50% esperado');
    expect(d.respuesta).toContain('1 de 2 resultados clave');
    expect(d.estado).toBe('listo');
  });

  it('dirección: objetivos sin resultados medibles quedan en parcial con faltante', () => {
    const m = construirMesa({
      ...completa,
      objetivos: [{ titulo: 'x', progresoPct: 0, progresoEsperadoPct: 0, resultadosTotal: 0, resultadosQueLlegan: 0 }],
    });
    const d = asiento(m, 'Dirección general');
    expect(d.estado).toBe('parcial');
    expect(d.faltantes).toContain('Los objetivos no tienen resultados clave medibles');
  });

  it('dirección: sin progreso esperado (período sin fechas) no muestra una referencia inventada', () => {
    const d = asiento(
      construirMesa({
        ...completa,
        objetivos: [
          { titulo: 'x', progresoPct: 30, progresoEsperadoPct: null, resultadosTotal: 1, resultadosQueLlegan: 1 },
        ],
      }),
      'Dirección general',
    );
    expect(d.respuesta).toContain('Progreso medio 30%.');
    expect(d.respuesta).not.toContain('esperado');
  });

  it('crecimiento: seguidores sin historial queda parcial, no inventa porcentaje', () => {
    const c = asiento(construirMesa({ ...completa, crecimientoPct: null }), 'Crecimiento');
    expect(c.estado).toBe('parcial');
    expect(c.respuesta).toContain('Sin historial suficiente');
    expect(c.respuesta).not.toMatch(/%/);
  });

  it('crecimiento: signo explícito cuando es positivo', () => {
    expect(asiento(construirMesa(completa), 'Crecimiento').respuesta).toContain('+4%');
  });

  it('producción: vencidas y fallidas pasan a parcial con faltantes concretos', () => {
    const p = asiento(
      construirMesa({ ...completa, programacion: { proximos14Dias: 4, vencidos: 2, fallidos: 1 } }),
      'Producción',
    );
    expect(p.estado).toBe('parcial');
    expect(p.faltantes).toEqual([
      '2 publicación(es) vencida(s) sin publicar',
      '1 publicación(es) fallida(s) para revisar',
    ]);
  });

  it('producción: calendario no disponible queda sin datos', () => {
    expect(asiento(construirMesa(vacia), 'Producción').estado).toBe('sin-datos');
  });

  it('cumplimiento y finanzas siempre dejan explícito lo que la junta no mide', () => {
    const m = construirMesa(completa);
    expect(asiento(m, 'Cumplimiento y marca').faltantes[0]).toMatch(/Revisión humana/);
    expect(asiento(m, 'Finanzas').estado).toBe('sin-datos');
  });

  it('operaciones: cola vacía es listo, no alerta', () => {
    const o = asiento(
      construirMesa({ ...completa, decisiones: { pendientes: 0, criticas: 0, masAntiguaHoras: 0 } }),
      'Operaciones',
    );
    expect(o.respuesta).toBe('Sin decisiones pendientes.');
    expect(o.estado).toBe('listo');
  });
});
