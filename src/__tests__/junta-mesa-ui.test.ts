import { describe, expect, it } from 'vitest';
import { construirMesa } from '../capabilities/executive/mesaEjecutiva.js';
import { mesaHtml } from '../server/static/views/junta.js';

describe('mesaHtml', () => {
  it('renderiza los siete asientos con su estado y faltantes', () => {
    const mesa = construirMesa({
      totalPosts: 5,
      seguidoresTotal: 1200,
      crecimientoPct: null,
      decisiones: null,
      programacion: null,
      objetivos: null,
    });
    const html = mesaHtml(mesa);
    expect(html).toContain('id="jt-mesa"');
    expect(html).toContain('Dirección general');
    expect(html).toContain('Sin datos');
    expect(html).toContain('Faltan 3 publicación(es)');
    expect(html).not.toMatch(/undefined|null|NaN/);
  });

  it('escapa el contenido que viene del backend', () => {
    const html = mesaHtml({
      asientos: [
        {
          rol: '<img src=x onerror=alert(1)>',
          pregunta: 'p',
          respuesta: 'r',
          estado: 'listo',
          evidencia: { muestra: 0, confianza: 'sin-datos' },
          faltantes: [],
        },
      ],
      resumen: { listo: 1, parcial: 0, 'sin-datos': 0 },
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('sin mesa no renderiza nada', () => {
    expect(mesaHtml(undefined)).toBe('');
  });
});
