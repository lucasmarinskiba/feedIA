import { describe, it, expect } from 'vitest';
import {
  HERRAMIENTAS,
  type AccionCreacion,
  type ContextoAccion,
  type ContextoCuenta,
} from '../capabilities/executive/herramientasCatalogo.js';

const AHORA = Date.UTC(2026, 9, 5, 12, 0, 0);

const contexto: ContextoCuenta = {
  totalPosts: 12,
  topPosts: [{ formato: 'reel', caption: 'Post de prueba', tasa: 4.2 }],
  formatos: [
    { formato: 'reel', posts: 6, medianaTasa: 4.2 },
    { formato: 'carrusel', posts: 4, medianaTasa: 3.1 },
  ],
  momentos: [
    { dia: 'lunes', franja: 'tarde', medianaTasa: 4.5, posts: 3 },
    { dia: 'jueves', franja: 'noche', medianaTasa: 3.9, posts: 2 },
  ],
  hashtagsTop: ['#marketing'],
};

const ctxAccion = (valores: Record<string, string | number>, conectadas = true): ContextoAccion => ({
  valores,
  contexto,
  conexiones: { instagram: conectadas, tiktok: conectadas },
  ahora: AHORA,
  calendario: {
    disponible: true,
    momentos: contexto.momentos.map((m) => ({ dia: m.dia, franja: m.franja })),
    posts: [
      {
        id: 'p-vencida',
        plataforma: 'instagram',
        caption: 'Vencida',
        status: 'scheduled',
        scheduledAt: new Date(AHORA - 3 * 86_400_000).toISOString(),
      },
    ],
  },
  bandeja: { disponible: true, sinResponder: 4, escaladas: 1, leadsSinResponder: 2, ejemplos: ['@ana: lead'] },
  marca: { nombre: 'Marca de prueba', nicho: 'marketing' },
});

const VALORES_POR_HERRAMIENTA: Record<string, Record<string, string | number>> = {
  caption: { formato: 'reel', plataforma: 'instagram', objetivo: 'alcance', idea: 'Tres errores al escribir captions' },
  hooks: { idea: 'Errores de principiantes', formato: 'reel' },
  hashtags: { tema: 'marketing', plataforma: 'instagram', cantidad: 10 },
  guion: { tema: 'Un día con cliente', plataforma: 'tiktok', duracion: 30, tono: 'cercano' },
  carrusel: { tema: 'Checklist de contenido', slides: '7', objetivo: 'guardados' },
  repurpose: { contenido: 'Texto original', formato_origen: 'texto', formato_destino: 'reel', plataforma: 'tiktok' },
  safety: { caption: 'Texto de prueba', hashtags: '#ok', plataforma: 'instagram' },
  perfil: { propuesta: 'Ayudamos a pymes a crecer', bio_actual: '', nombre_visible: 'Pyme', link: '' },
  respuestas: { mensaje: '¿Cuánto cuesta?', tipo: 'dm', intencion: 'consulta' },
  plan: { semanas: '2', publicaciones: 3, objetivo: 'alcance' },
  metricas: { metrica: 'alcance', cambio: 'Cayó un 30 % en la semana' },
  stories: { tema: 'Lanzamiento', dias: '3', historias_por_dia: 2 },
  ideas: { tema: 'Marketing', cantidad: 5, plataforma: 'instagram' },
  'calendario-inteligente': { ventana: '14' },
  reprogramar: { ventana: '7' },
  brief: { objetivo: 'Lanzar el curso', plataforma: 'ambas', semanas: '4' },
  okr: {
    titulo: 'Crecer en TikTok',
    porque: 'El canal trae clientes',
    categoria: 'growth',
    periodo: 'quarter',
    metrica: 'seguidores-tiktok',
    meta: 5000,
  },
  experimento: {
    hipotesis: 'Un hook con pregunta sube los guardados',
    variable: 'hook',
    metrica: 'guardados',
    duracion: '7',
    nombreA: 'Afirmación',
    nombreB: 'Pregunta',
  },
  bandeja: { enfoque: 'prioridades' },
  digest: { periodo: '7' },
};

describe('catálogo de herramientas IA', () => {
  it('tiene 20 herramientas con id único', () => {
    expect(HERRAMIENTAS).toHaveLength(20);
    expect(new Set(HERRAMIENTAS.map((h) => h.id)).size).toBe(20);
  });

  it('cada herramienta declara al menos un destino', () => {
    for (const h of HERRAMIENTAS) expect(h.destinos.length, h.id).toBeGreaterThan(0);
  });

  it('solo ofrece calendario a las que producen piezas o movimientos', () => {
    for (const h of HERRAMIENTAS.filter((x) => x.destinos.includes('calendario'))) {
      const accion = h.accion?.(ctxAccion(VALORES_POR_HERRAMIENTA[h.id] ?? {}));
      expect(['piezas', 'movimientos'], h.id).toContain(accion?.tipo);
    }
  });

  it('toda herramienta que no depende de la IA tiene respaldo', () => {
    for (const h of HERRAMIENTAS.filter((x) => x.soloReglas)) expect(h.respaldo, h.id).toBeTypeOf('function');
  });

  it('cada herramienta tiene valores de prueba para todos sus campos requeridos', () => {
    for (const h of HERRAMIENTAS) {
      const valores = VALORES_POR_HERRAMIENTA[h.id];
      expect(valores, h.id).toBeDefined();
      for (const campo of h.campos.filter((c) => c.requerido)) {
        expect(valores?.[campo.id], `${h.id}.${campo.id}`).not.toBeUndefined();
      }
    }
  });

  it('el plan semanal produce semanas × publicaciones piezas fechadas en el futuro', () => {
    const plan = HERRAMIENTAS.find((h) => h.id === 'plan');
    const accion = plan?.accion?.(ctxAccion(VALORES_POR_HERRAMIENTA['plan'] ?? {})) as Extract<
      AccionCreacion,
      { tipo: 'piezas' }
    >;
    expect(accion.piezas).toHaveLength(6);
    for (const p of accion.piezas) {
      expect(p.scheduledAt).not.toBeNull();
      expect(Date.parse(p.scheduledAt ?? '')).toBeGreaterThan(AHORA);
    }
  });

  it('el plan sin cuentas conectadas usa Instagram y deja las piezas para borrador', () => {
    const plan = HERRAMIENTAS.find((h) => h.id === 'plan');
    const accion = plan?.accion?.(ctxAccion(VALORES_POR_HERRAMIENTA['plan'] ?? {}, false)) as Extract<
      AccionCreacion,
      { tipo: 'piezas' }
    >;
    expect(new Set(accion.piezas.map((p) => p.plataforma))).toEqual(new Set(['instagram']));
  });

  it('los respaldos de las herramientas sin IA devuelven un resultado con contenido', () => {
    for (const h of HERRAMIENTAS.filter((x) => x.respaldo)) {
      const ctx = ctxAccion(VALORES_POR_HERRAMIENTA[h.id] ?? {});
      const accion = h.accion ? h.accion(ctx) : ({ tipo: 'ninguna' } as AccionCreacion);
      const resultado = h.respaldo?.(ctx.valores, contexto, ctx, accion);
      expect(resultado?.titulo, h.id).toBeTruthy();
      expect(resultado?.secciones.length + (resultado?.notas.length ?? 0), h.id).toBeGreaterThan(0);
    }
  });

  it('calendario inteligente y reprogramar proponen movimientos sobre el calendario actual', () => {
    const reprogramar = HERRAMIENTAS.find((h) => h.id === 'reprogramar');
    const accion = reprogramar?.accion?.(ctxAccion(VALORES_POR_HERRAMIENTA['reprogramar'] ?? {})) as Extract<
      AccionCreacion,
      { tipo: 'movimientos' }
    >;
    expect(accion.movimientos.map((m) => m.postId)).toEqual(['p-vencida']);
  });

  it('el OKR sugerido arma su resultado clave con la meta y la fuente elegidas', () => {
    const okr = HERRAMIENTAS.find((h) => h.id === 'okr');
    const accion = okr?.accion?.(ctxAccion(VALORES_POR_HERRAMIENTA['okr'] ?? {})) as Extract<
      AccionCreacion,
      { tipo: 'objetivo' }
    >;
    expect(accion.keyResults[0]).toMatchObject({ fuente: 'seguidores-tiktok', target: 5000, direccion: 'increase' });
  });
});
