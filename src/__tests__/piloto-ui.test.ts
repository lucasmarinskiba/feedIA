import { describe, expect, it } from 'vitest';
import { pilotoHtml } from '../server/static/views/junta.js';

const comparacion = {
  dias: 40,
  listo: true,
  antes: { publicaciones: 8, tasaMediana: 2, porSemana: 2 },
  despues: { publicaciones: 9, tasaMediana: 5, porSemana: 3 },
  deltaPp: 3,
  lectura: 'La tasa mediana de interacción pasó de 2% a 5% (+3 pp).',
  faltantes: [],
};

describe('pilotoHtml', () => {
  it('sin piloto muestra el formulario para empezarlo', () => {
    const html = pilotoHtml({ piloto: null, comparacion: null });
    expect(html).toContain('id="jt-form-piloto"');
    expect(html).toContain('name="desde"');
    expect(html).not.toContain('Quitar piloto');
  });

  it('con piloto muestra antes, después, cambio y el botón para quitarlo', () => {
    const html = pilotoHtml({
      piloto: { nombre: 'Piloto A', desde: '2026-09-01', hipotesis: '', creadoEn: '', actualizadoEn: '' },
      comparacion,
    });
    expect(html).toContain('2%');
    expect(html).toContain('5%');
    expect(html).toContain('+3 pp');
    expect(html).toContain('data-jt-accion="quitar-piloto"');
    expect(html).not.toMatch(/undefined|null|NaN/);
  });

  it('muestra los faltantes de la comparación', () => {
    const html = pilotoHtml({
      piloto: { nombre: 'P', desde: '2026-09-01', hipotesis: '', creadoEn: '', actualizadoEn: '' },
      comparacion: {
        ...comparacion,
        listo: false,
        antes: { publicaciones: 3, tasaMediana: null, porSemana: null },
        deltaPp: null,
        faltantes: ['Faltan 5 publicación(es) después del inicio para comparar.'],
      },
    });
    expect(html).toContain('sin comparar');
    expect(html).toContain('Faltan 5 publicación(es)');
  });

  it('escapa el nombre y la hipótesis', () => {
    const html = pilotoHtml({
      piloto: { nombre: '<b>x</b>', desde: '2026-09-01', hipotesis: '<img src=x>', creadoEn: '', actualizadoEn: '' },
      comparacion,
    });
    expect(html).not.toContain('<b>x</b>');
    expect(html).not.toContain('<img src=x>');
  });
});
