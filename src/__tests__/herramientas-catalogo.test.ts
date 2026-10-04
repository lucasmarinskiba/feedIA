import { describe, it, expect } from 'vitest';
import {
  HERRAMIENTAS,
  auditoriaReglas,
  herramientaPorId,
  validarEntrada,
  validarResultado,
  type ContextoCuenta,
} from '../capabilities/executive/herramientasCatalogo.js';

const contextoVacio: ContextoCuenta = { totalPosts: 0, topPosts: [], formatos: [], momentos: [], hashtagsTop: [] };

const def = (id: string) => {
  const d = herramientaPorId(id);
  if (!d) throw new Error(`herramienta ${id} no existe`);
  return d;
};

describe('catálogo', () => {
  it('tiene once herramientas con id único, rol, reglas y campos', () => {
    expect(HERRAMIENTAS).toHaveLength(11);
    expect(new Set(HERRAMIENTAS.map((h) => h.id)).size).toBe(11);
    for (const h of HERRAMIENTAS) {
      expect(h.rol.length).toBeGreaterThan(10);
      expect(h.reglas.length).toBeGreaterThanOrEqual(3);
      expect(h.campos.length).toBeGreaterThan(0);
    }
  });

  it('Safety Check siempre usa reglas, nunca IA', () => {
    expect(def('safety').soloReglas).toBe(true);
  });
});

describe('validarEntrada', () => {
  it('exige los campos requeridos y recorta el texto', () => {
    expect(
      validarEntrada(def('caption'), { formato: 'reel', plataforma: 'instagram', objetivo: 'alcance', idea: '   ' }),
    ).toEqual({
      ok: false,
      error: 'Idea del contenido es obligatorio',
    });
    const ok = validarEntrada(def('caption'), {
      formato: 'reel',
      plataforma: 'instagram',
      objetivo: 'alcance',
      idea: '  Mi idea  ',
    });
    expect(ok).toEqual({
      ok: true,
      valores: { formato: 'reel', plataforma: 'instagram', objetivo: 'alcance', idea: 'Mi idea' },
    });
  });

  it('rechaza opciones fuera de la lista y números fuera de rango', () => {
    expect(
      validarEntrada(def('caption'), { formato: 'story', plataforma: 'instagram', objetivo: 'alcance', idea: 'x' }),
    ).toEqual({
      ok: false,
      error: 'Formato: opción inválida',
    });
    expect(validarEntrada(def('plan'), { semanas: '1', publicaciones: 9, objetivo: 'alcance' })).toEqual({
      ok: false,
      error: 'Publicaciones por semana debe ser un número entero entre 1 y 7',
    });
  });
});

describe('validarResultado', () => {
  it('rechaza lo que no tiene la forma esperada', () => {
    expect(validarResultado('texto suelto')).toBeNull();
    expect(validarResultado({ titulo: 'x', secciones: [] })).toBeNull();
  });

  it('acepta el contrato y limita secciones', () => {
    const secciones = Array.from({ length: 15 }, (_, i) => ({ titulo: `s${i}`, tipo: 'texto', contenido: 'ok' }));
    const r = validarResultado({ titulo: 'Plan', secciones, notas: ['nota'] });
    expect(r?.secciones).toHaveLength(12);
    expect(r?.notas).toEqual(['nota']);
  });

  it('descarta listas vacías y tipos desconocidos pasan como texto', () => {
    const r = validarResultado({
      titulo: 'T',
      secciones: [
        { titulo: 'vacía', tipo: 'lista', contenido: [] },
        { titulo: 'rara', tipo: 'otra', contenido: 'hola' },
      ],
    });
    expect(r?.secciones).toEqual([{ titulo: 'rara', tipo: 'texto', contenido: 'hola' }]);
  });
});

describe('auditoriaReglas', () => {
  it('marca engagement bait como riesgo alto', () => {
    const r = auditoriaReglas('Etiquetá a alguien que necesite esto', []);
    expect(r.nivel).toBe('alto');
    expect(r.hallazgos[0]?.severidad).toBe('alta');
  });

  it('marca promesas absolutas como riesgo medio', () => {
    expect(auditoriaReglas('Este método es 100% seguro', []).nivel).toBe('medio');
  });

  it('marca más de 30 hashtags como riesgo alto y genéricos como medio', () => {
    const muchos = Array.from({ length: 31 }, (_, i) => `#tag${i}`);
    expect(auditoriaReglas('Texto', muchos).nivel).toBe('alto');
    expect(auditoriaReglas('Texto', ['#love', '#marketing']).nivel).toBe('medio');
  });

  it('avisa que los links no son clickeables', () => {
    expect(auditoriaReglas('Mirá https://ejemplo.com', []).nivel).toBe('bajo');
  });

  it('no encuentra nada en un caption limpio', () => {
    expect(auditoriaReglas('Hoy te cuento cómo organizo mi semana de contenido.', ['#marketing']).nivel).toBe(
      'ninguno',
    );
  });
});

describe('respaldos deterministas', () => {
  it('Hashtag Lab usa los hashtags de tus posts cuando existen', () => {
    const r = def('hashtags').respaldo?.(
      { tema: 'marketing', cantidad: 6 },
      { ...contextoVacio, hashtagsTop: ['#ia', '#marca'] },
    );
    expect(r?.secciones.some((s) => s.tipo === 'copiable' && String(s.contenido).includes('#ia'))).toBe(true);
    const sinHistorial = def('hashtags').respaldo?.({ tema: 'marketing' }, contextoVacio);
    expect(sinHistorial?.secciones.some((s) => s.tipo === 'copiable')).toBe(false);
  });

  it('Hook Factory devuelve cinco ganchos', () => {
    const r = def('hooks').respaldo?.({ idea: 'organizar el contenido', formato: 'reel' }, contextoVacio);
    const ganchos = r?.secciones[0]?.contenido;
    expect(Array.isArray(ganchos) ? ganchos : []).toHaveLength(5);
  });

  it('Plan semanal crea semanas × publicaciones y usa los momentos reales', () => {
    const contexto: ContextoCuenta = {
      ...contextoVacio,
      momentos: [{ dia: 'martes', franja: 'noche', medianaTasa: 8, posts: 4 }],
      formatos: [{ formato: 'reel', posts: 5, medianaTasa: 7 }],
    };
    const r = def('plan').respaldo?.({ semanas: '2', publicaciones: 3, objetivo: 'alcance' }, contexto);
    const items = r?.secciones[0]?.contenido;
    expect(Array.isArray(items) ? items : []).toHaveLength(6);
    expect(Array.isArray(items) && items[0]?.includes('martes 20:00')).toBe(true);
  });
});
