import { describe, it, expect } from 'vitest';
import {
  HERRAMIENTAS,
  type AccionCreacion,
  type ContextoAccion,
  type ContextoCuenta,
  type HerramientaDef,
} from '../capabilities/executive/herramientasCatalogo.js';
import { prepararRespuestas } from '../capabilities/executive/respuestasTriaje.js';

const AHORA = Date.UTC(2026, 9, 5, 12, 0, 0);

const contexto: ContextoCuenta = {
  totalPosts: 12,
  topPosts: [{ formato: 'reel', caption: 'Post de prueba', tasa: 4.2 }],
  formatos: [
    { formato: 'reel', posts: 6, medianaTasa: 4.2 },
    { formato: 'carrusel', posts: 4, medianaTasa: 3.1 },
  ],
  momentos: [{ dia: 'lunes', franja: 'tarde', medianaTasa: 4.5, posts: 3 }],
  hashtagsTop: ['#marketing', '#pymes'],
};

const ctxAccion = (valores: Record<string, string | number>, accion?: AccionCreacion): ContextoAccion => ({
  valores,
  contexto,
  conexiones: { instagram: true, tiktok: false },
  ahora: AHORA,
  calendario: { disponible: true, momentos: [], posts: [] },
  bandeja: { disponible: true, sinResponder: 2, escaladas: 1, leadsSinResponder: 1, ejemplos: ['@ana: lead'] },
  marca: { nombre: 'Marca', nicho: 'marketing' },
  respuestas: null,
  conocimiento: [],
});

/** Valores válidos mínimos: la primera opción de cada select y un texto genérico. */
const valoresMinimos = (h: HerramientaDef): Record<string, string | number> => {
  const v: Record<string, string | number> = {};
  for (const campo of h.campos.filter((c) => c.requerido)) {
    if (campo.tipo === 'select') v[campo.id] = campo.opciones?.[0] ?? '';
    else if (campo.tipo === 'numero') v[campo.id] = campo.min ?? 1;
    else v[campo.id] = 'Tema de prueba para la herramienta';
  }
  return v;
};

describe('todas las herramientas funcionan sin IA', () => {
  for (const h of HERRAMIENTAS) {
    it(`${h.id} tiene respaldo y devuelve contenido`, () => {
      expect(h.respaldo, h.id).toBeTypeOf('function');
      const valores = valoresMinimos(h);
      const ctx = ctxAccion(valores);
      const accion = h.accion ? h.accion(ctx) : ({ tipo: 'ninguna' } as AccionCreacion);
      const r = h.respaldo?.(valores, contexto, ctx, accion);
      expect(r?.titulo, h.id).toBeTruthy();
      expect((r?.secciones.length ?? 0) + (r?.notas.length ?? 0), h.id).toBeGreaterThan(0);
    });
  }
});

const herramienta = (id: string): HerramientaDef => {
  const h = HERRAMIENTAS.find((x) => x.id === id);
  if (!h) throw new Error(`falta ${id}`);
  return h;
};

const correr = (id: string, valores: Record<string, string | number>, accion?: AccionCreacion) => {
  const h = herramienta(id);
  const ctx = ctxAccion(valores);
  return h.respaldo?.(valores, contexto, ctx, accion ?? ({ tipo: 'ninguna' } as AccionCreacion));
};

describe('respaldos de contenido', () => {
  it('Hook Factory entrega cinco ganchos y su texto en pantalla', () => {
    const r = correr('hooks', { idea: 'automatizar respuestas', formato: 'reel' });
    const ganchos = r?.secciones.find((s) => s.titulo.startsWith('Ganchos'));
    expect(Array.isArray(ganchos?.contenido) ? ganchos.contenido.length : 0).toBe(5);
    expect(r?.secciones.some((s) => s.titulo === 'Texto en pantalla')).toBe(true);
  });

  it('Hashtag Lab arma una lista copiable con hashtags de tu historial', () => {
    const r = correr('hashtags', { tema: 'automatizacion para pymes', plataforma: 'instagram', cantidad: 6 });
    const copiable = r?.secciones.find((s) => s.tipo === 'copiable');
    expect(typeof copiable?.contenido === 'string' && copiable.contenido.startsWith('#')).toBe(true);
    expect(copiable?.contenido).toMatch(/#marketing/);
  });

  it('Safety Check informa la longitud y detecta hashtags repetidos', () => {
    const r = correr('safety', { caption: 'Hola a todos', hashtags: '#pymes #pymes', plataforma: 'instagram' });
    expect(r?.secciones.find((s) => s.titulo === 'Longitud')?.contenido).toMatch(/12 de 2200/);
    expect(JSON.stringify(r?.secciones)).toMatch(/Hashtags repetidos/);
  });

  it('Carrusel Builder arma la portada y un slide por cada paso más el cierre', () => {
    const r = correr('carrusel', { tema: 'contenido sin improvisar', slides: '7', objetivo: 'guardados' });
    const slides = r?.secciones.find((s) => s.titulo === 'Slides');
    expect(Array.isArray(slides?.contenido) ? slides.contenido.length : 0).toBe(6);
    expect(JSON.stringify(slides?.contenido)).toMatch(/Cierre: Guardalo/);
  });

  it('Repurposer a reel usa la tesis como hook y dice qué se pierde', () => {
    const contenido =
      'Automatizar respuestas ahorra tiempo. Hay que definir el tono primero. Después armás plantillas. Y al final revisás cada una. Esto sobra.';
    const r = correr('repurpose', { contenido, formato_origen: 'texto', formato_destino: 'reel' });
    const guion = r?.secciones.find((s) => s.titulo === 'Guion del reel');
    expect(Array.isArray(guion?.contenido) ? guion.contenido[0] : '').toMatch(/^0-2 s: Automatizar respuestas/);
    expect(JSON.stringify(r?.secciones)).toMatch(/quedan afuera/);
  });

  it('Profile AI arma una bio de hasta 150 caracteres con CTA', () => {
    const r = correr('perfil', {
      propuesta: 'Ayudamos a pymes a automatizar su atención al cliente sin perder el trato humano.',
      link: 'https://ejemplo.com',
    });
    const bio = r?.secciones.find((s) => s.titulo === 'Bio sugerida')?.contenido;
    expect(typeof bio === 'string' && bio.length <= 150).toBe(true);
    expect(bio).toMatch(/Link en bio/);
  });
});

describe('respaldos de estrategia y operación', () => {
  it('Métricas explicadas ordena causas y dice cómo verificar cada una', () => {
    const r = correr('metricas', { metrica: 'alcance', cambio: 'Cayó un 30 % en la semana' });
    const causas = r?.secciones.find((s) => s.titulo.startsWith('Causas'));
    expect(Array.isArray(causas?.contenido) ? causas.contenido.length : 0).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(causas?.contenido)).toMatch(/Verificar:/);
  });

  it('Reprogramar indica cuántos días lleva vencida cada pieza', () => {
    const vencida = new Date(AHORA - 3 * 86_400_000).toISOString();
    const accion: AccionCreacion = {
      tipo: 'movimientos',
      modo: 'reprogramar',
      calendarioDisponible: true,
      movimientos: [
        { postId: 'p1', plataforma: 'instagram', caption: 'Pieza', actual: vencida, propuesto: vencida, motivo: 'x' },
      ],
    };
    const r = correr('reprogramar', { ventana: '7' }, accion);
    expect(JSON.stringify(r?.secciones)).toMatch(/vencida hace 3 día\(s\)/);
  });

  it('Brief reparte el proyecto en cuatro fases con fechas', () => {
    const accion: AccionCreacion = {
      tipo: 'proyecto',
      nombre: 'Campaña',
      objetivo: 'Lanzar',
      plataforma: 'ambas',
      tareas: ['Definir mensaje'],
      inicio: '2026-10-01',
      fin: '2026-10-29',
    };
    const r = correr('brief', { objetivo: 'Lanzar el curso', plataforma: 'ambas', semanas: '4' }, accion);
    const fases = r?.secciones.find((s) => s.titulo === 'Fases');
    expect(Array.isArray(fases?.contenido) ? fases.contenido : []).toHaveLength(4);
    expect(JSON.stringify(fases?.contenido)).toMatch(/Preparar \(del 2026-10-01/);
  });

  it('Resumen semanal cuenta lo que hay en el calendario', () => {
    const ctx = ctxAccion({ periodo: '7' });
    ctx.calendario = {
      disponible: true,
      momentos: [],
      posts: [
        {
          id: 'a',
          plataforma: 'instagram',
          caption: 'x',
          status: 'scheduled',
          scheduledAt: new Date(AHORA + 86_400_000).toISOString(),
        },
        { id: 'b', plataforma: 'instagram', caption: 'y', status: 'draft', scheduledAt: null },
      ],
    };
    const r = herramienta('digest').respaldo?.({ periodo: '7' }, contexto, ctx, { tipo: 'ninguna' });
    expect(JSON.stringify(r?.secciones)).toMatch(/1 programada\(s\) en los próximos 7 días y 1 borrador/);
  });

  it('la bandeja con escaladas recomienda asignarlas a una persona', () => {
    const r = correr('bandeja', { enfoque: 'prioridades' });
    expect(JSON.stringify(r?.secciones)).toMatch(/Asigná las escaladas/);
  });

  it('Respuestas IA sin IA sigue marcando el triaje del mensaje', () => {
    const prep = prepararRespuestas('Me duele después del tratamiento', 'dm', 'auto', []);
    expect(prep.triaje.accion).toBe('escalar');
  });
});

describe('profundidad de los respaldos de estrategia', () => {
  const lunesTarde = new Date(Date.UTC(2026, 9, 5, 18, 0, 0)).toISOString();
  const diaFranja = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long' })
    .format(Date.parse(lunesTarde))
    .toLowerCase();

  it('calendario inteligente explica cuánto rinde la franja propuesta', () => {
    const accion: AccionCreacion = {
      tipo: 'movimientos',
      modo: 'optimizar',
      calendarioDisponible: true,
      movimientos: [
        { postId: 'p1', plataforma: 'instagram', caption: 'Pieza', actual: null, propuesto: lunesTarde, motivo: 'x' },
      ],
    };
    const r = correr('calendario-inteligente', { ventana: '14' }, accion);
    expect(JSON.stringify(r?.secciones)).toMatch(new RegExp(`${diaFranja} tarde: mediana 4\.5 %`));
  });

  it('el experimento calcula la factibilidad con la cadencia programada', () => {
    const ctx = ctxAccion({ hipotesis: 'Un hook con pregunta sube los guardados', duracion: '2' });
    ctx.calendario = {
      disponible: true,
      momentos: [],
      posts: [1, 2, 3, 4].map((d) => ({
        id: `p${d}`,
        plataforma: 'instagram' as const,
        caption: 'x',
        status: 'scheduled' as const,
        scheduledAt: new Date(AHORA + d * DIA_MS).toISOString(),
      })),
    };
    const r = herramienta('experimento').respaldo?.(
      { hipotesis: 'Un hook con pregunta sube los guardados', duracion: '2' },
      contexto,
      ctx,
      { tipo: 'ninguna' },
    );
    expect(JSON.stringify(r?.secciones)).toMatch(/publicaciones por semana programadas/);
    expect(r?.notas.join(' ')).toMatch(/menor que lo necesario/);
  });

  it('la bandeja pone primero las escaladas', () => {
    const r = correr('bandeja', { enfoque: 'prioridades' });
    const orden = r?.secciones.find((s) => s.titulo === 'Orden de atención');
    expect(Array.isArray(orden?.contenido) ? orden.contenido[0] : '').toMatch(/Escaladas/);
  });

  it('las historias proponen una pregunta de sticker por día cuando hay tema', () => {
    const r = correr('stories', { tema: 'lanzamiento', dias: '2', historias_por_dia: 2 });
    expect(r?.secciones.some((s) => s.titulo === 'Preguntas para los stickers')).toBe(true);
  });

  it('las ideas asignan pilar, gancho y CTA a cada idea', () => {
    const accion: AccionCreacion = {
      tipo: 'piezas',
      piezas: [piezaPrueba('Idea 1'), piezaPrueba('Idea 2')],
    };
    const r = correr('ideas', { tema: 'marketing', cantidad: 2, plataforma: 'instagram' }, accion);
    const ideas = r?.secciones.find((s) => s.titulo === 'Ideas por pilar');
    expect(Array.isArray(ideas?.contenido) ? ideas.contenido[0] : '').toMatch(/gancho: .+ · CTA: /);
  });

  it('el guion agrega prompts por toma para generar el video con IA', () => {
    const r = correr('guion', {
      tema: 'respuestas automáticas',
      plataforma: 'tiktok',
      duracion: '15',
      tono: 'cercano',
    });
    const tomas = r?.secciones.find((s) => s.titulo.startsWith('Tomas para generar'));
    expect(Array.isArray(tomas?.contenido) ? tomas.contenido.length : 0).toBeGreaterThan(0);
    expect(JSON.stringify(tomas?.contenido)).toMatch(/vertical 9:16/);
  });
});

const DIA_MS = 86_400_000;
const piezaPrueba = (titulo: string) => ({
  titulo,
  formato: 'reel' as const,
  plataforma: 'instagram' as const,
  caption: '',
  hashtags: [],
  scheduledAt: null,
});

describe('digest semana contra semana', () => {
  it('compara la mediana de los últimos 7 días contra los 7 anteriores', () => {
    const ctx = ctxAccion({ periodo: '7' });
    const r = herramienta('digest').respaldo?.(
      { periodo: '7' },
      { ...contexto, semanas: { ultimos7: { posts: 4, medianaTasa: 5 }, anteriores7: { posts: 3, medianaTasa: 4 } } },
      ctx,
      { tipo: 'ninguna' },
    );
    expect(JSON.stringify(r?.secciones)).toMatch(
      /5 % en los últimos 7 días contra 4 % en los 7 anteriores, subió 25 %/,
    );
  });

  it('avisa cuando no hay publicaciones suficientes para comparar', () => {
    const ctx = ctxAccion({ periodo: '7' });
    const r = herramienta('digest').respaldo?.(
      { periodo: '7' },
      {
        ...contexto,
        semanas: { ultimos7: { posts: 0, medianaTasa: null }, anteriores7: { posts: 2, medianaTasa: 3 } },
      },
      ctx,
      { tipo: 'ninguna' },
    );
    expect(JSON.stringify(r?.secciones)).toMatch(/Sin datos suficientes para comparar/);
  });
});
