import { describe, it, expect } from 'vitest';
import { HERRAMIENTAS } from '../capabilities/executive/herramientasCatalogo.js';
import { materialDe, siguientesDe, valoresHeredados } from '../capabilities/executive/herramientasCadena.js';

describe('siguientesDe', () => {
  it('solo sugiere herramientas que existen', () => {
    const ids = new Set(HERRAMIENTAS.map((h) => h.id));
    for (const h of HERRAMIENTAS) {
      for (const siguiente of siguientesDe(h.id)) expect(ids.has(siguiente), `${h.id} → ${siguiente}`).toBe(true);
    }
  });

  it('ninguna herramienta se sugiere a sí misma', () => {
    for (const h of HERRAMIENTAS) expect(siguientesDe(h.id)).not.toContain(h.id);
  });

  it('un id desconocido o heredado de Object no devuelve cadena', () => {
    expect(siguientesDe('constructor')).toEqual([]);
    expect(siguientesDe('no-existe')).toEqual([]);
  });

  it('los hooks alimentan caption, guion y carrusel', () => {
    expect(siguientesDe('hooks')).toEqual(['caption', 'guion', 'carrusel']);
  });
});

describe('materialDe', () => {
  it('incluye título, secciones y elementos de lista', () => {
    const material = materialDe({
      id: 'cre-1',
      herramientaId: 'hooks',
      nombre: 'Hook Factory',
      resultado: {
        titulo: 'Hooks para IA',
        secciones: [{ titulo: 'Ganchos', tipo: 'lista', contenido: ['Primer gancho', 'Segundo gancho'] }],
        notas: [],
      },
    });
    expect(material.creacionId).toBe('cre-1');
    expect(material.texto).toContain('Hooks para IA');
    expect(material.texto).toContain('- Primer gancho');
  });

  it('recorta el material largo para no inflar el prompt', () => {
    const material = materialDe({
      id: 'cre-2',
      herramientaId: 'guion',
      nombre: 'Guion',
      resultado: {
        titulo: 'Guion',
        secciones: [{ titulo: 'Texto', tipo: 'texto', contenido: 'x'.repeat(5000) }],
        notas: [],
      },
    });
    expect(material.texto.length).toBeLessThanOrEqual(1500);
  });
});

describe('valoresHeredados', () => {
  const campos = HERRAMIENTAS.find((h) => h.id === 'caption')?.campos ?? [];

  it('pasa la idea de la creación de origen al campo idea de la siguiente', () => {
    expect(valoresHeredados({ tema: 'Marketing para pymes' }, campos)).toEqual({ idea: 'Marketing para pymes' });
  });

  it('descarta opciones de select que la herramienta destino no admite', () => {
    const valores = valoresHeredados({ formato: 'podcast', plataforma: 'instagram' }, campos);
    expect(valores).toEqual({ plataforma: 'instagram' });
  });

  it('conserva los números cuando el campo es numérico', () => {
    const campoNumero = HERRAMIENTAS.find((h) => h.id === 'ideas')?.campos ?? [];
    expect(valoresHeredados({ cantidad: 5 }, campoNumero)).toEqual({ cantidad: 5 });
  });
});
