/**
 * Acciones de las herramientas IA: qué crea o mueve cada una (piezas en el calendario, movimientos
 * de horarios, proyectos, OKR o experimentos), a qué destinos puede enviarse y los respaldos de
 * texto de las que no dependen de la IA. Las fechas las calcula planificación; el texto lo escribe
 * la IA o el respaldo.
 */

import type {
  AccionCreacion,
  ContextoAccion,
  Destino,
  DefinicionBase,
  HerramientaDef,
  ResultadoHerramienta,
} from './herramientasCatalogo.js';
import {
  movimientosOptimizar,
  movimientosReprogramar,
  planificarSlots,
  piezaUnica,
  type FormatoPieza,
  type PiezaCreacion,
  type PlataformaPieza,
} from './herramientasPlanificacion.js';

type Valores = Record<string, string | number>;
type Respaldo = NonNullable<HerramientaDef['respaldo']>;
type Accion = (ctx: ContextoAccion) => AccionCreacion;

const DIA_MS = 86_400_000;
const FORMATOS_PIEZA: FormatoPieza[] = ['reel', 'carrusel', 'imagen', 'historia'];

const texto = (v: Valores, clave: string): string => String(v[clave] ?? '').trim();
const numero = (v: Valores, clave: string, defecto: number): number => {
  const n = typeof v[clave] === 'number' ? (v[clave] as number) : Number(v[clave]);
  return Number.isFinite(n) && n > 0 ? n : defecto;
};

const plataformaElegida = (v: Valores): PlataformaPieza =>
  texto(v, 'plataforma') === 'tiktok' ? 'tiktok' : 'instagram';

const formatoDeCaption = (v: Valores): FormatoPieza => {
  const f = texto(v, 'formato');
  if (f === 'carrusel') return 'carrusel';
  if (f === 'imagen') return 'imagen';
  return 'reel';
};

const formatoDestino = (f: string): FormatoPieza => {
  if (f === 'carrusel') return 'carrusel';
  if (f === 'post') return 'imagen';
  if (f === 'historia') return 'historia';
  return 'reel';
};

const plataformasConectadas = (c: ContextoAccion['conexiones']): PlataformaPieza[] => {
  const out: PlataformaPieza[] = [];
  if (c.instagram) out.push('instagram');
  if (c.tiktok) out.push('tiktok');
  return out.length > 0 ? out : ['instagram'];
};

const formatosDeCuenta = (ctx: ContextoAccion): FormatoPieza[] => {
  const formatos = ctx.contexto.formatos
    .map((f) => (f.formato === 'video' ? 'reel' : f.formato))
    .filter((f): f is FormatoPieza => (FORMATOS_PIEZA as string[]).includes(f));
  return formatos.length > 0 ? formatos : ['reel', 'carrusel'];
};

const momentosDe = (ctx: ContextoAccion) => ctx.contexto.momentos.map((m) => ({ dia: m.dia, franja: m.franja }));

const unaPieza =
  (
    formato: (v: Valores) => FormatoPieza,
    plataforma: (v: Valores) => PlataformaPieza,
    titulo: (v: Valores) => string,
  ): Accion =>
  (ctx) => ({
    tipo: 'piezas',
    piezas: [
      piezaUnica({
        titulo: titulo(ctx.valores),
        formato: formato(ctx.valores),
        plataforma: plataforma(ctx.valores),
        caption: '',
      }),
    ],
  });

const isoFecha = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const etiquetaMetrica: Record<string, string> = {
  'seguidores-instagram': 'seguidores de Instagram',
  'seguidores-tiktok': 'seguidores de TikTok',
  'piezas-creadas': 'piezas creadas',
  'carruseles-publicados': 'carruseles publicados',
};

const ACCIONES: Record<string, Accion> = {
  caption: unaPieza(
    (v) => formatoDeCaption(v),
    (v) => plataformaElegida(v),
    (v) => texto(v, 'idea') || 'Caption',
  ),
  guion: unaPieza(
    () => 'reel',
    (v) => plataformaElegida(v),
    (v) => texto(v, 'tema') || 'Guion',
  ),
  carrusel: unaPieza(
    () => 'carrusel',
    () => 'instagram',
    (v) => texto(v, 'tema') || 'Carrusel',
  ),
  repurpose: unaPieza(
    (v) => formatoDestino(texto(v, 'formato_destino')),
    (v) => plataformaElegida(v),
    () => 'Pieza adaptada',
  ),
  plan: (ctx) => {
    const semanas = numero(ctx.valores, 'semanas', 1);
    const porSemana = numero(ctx.valores, 'publicaciones', 3);
    const objetivo = texto(ctx.valores, 'objetivo') || 'alcance';
    const slots = planificarSlots({ semanas, porSemana, momentos: momentosDe(ctx), desdeMs: ctx.ahora });
    const formatos = formatosDeCuenta(ctx);
    const plataformas = plataformasConectadas(ctx.conexiones);
    return {
      tipo: 'piezas',
      piezas: slots.map((scheduledAt, i) => ({
        ...piezaUnica({
          titulo: `Pieza ${i + 1} · ${objetivo}`,
          formato: formatos[i % formatos.length] ?? 'reel',
          plataforma: plataformas[i % plataformas.length] ?? 'instagram',
          caption: '',
        }),
        scheduledAt,
      })),
    };
  },
  stories: (ctx) => {
    const total = numero(ctx.valores, 'dias', 3) * numero(ctx.valores, 'historias_por_dia', 1);
    const tema = texto(ctx.valores, 'tema') || 'historias';
    const slots = planificarSlots({ semanas: 1, porSemana: total, momentos: momentosDe(ctx), desdeMs: ctx.ahora });
    const plataformas = plataformasConectadas(ctx.conexiones);
    return {
      tipo: 'piezas',
      piezas: slots.map((scheduledAt, i) => ({
        ...piezaUnica({
          titulo: `Historia ${i + 1} · ${tema}`,
          formato: 'historia',
          plataforma: plataformas[i % plataformas.length] ?? 'instagram',
          caption: '',
        }),
        scheduledAt,
      })),
    };
  },
  ideas: (ctx) => {
    const cantidad = numero(ctx.valores, 'cantidad', 5);
    const tema = texto(ctx.valores, 'tema') || 'tu nicho';
    const formatos = formatosDeCuenta(ctx);
    const plataforma = plataformaElegida(ctx.valores);
    return {
      tipo: 'piezas',
      piezas: Array.from({ length: cantidad }, (_, i) => ({
        ...piezaUnica({
          titulo: `Idea ${i + 1} · ${tema}`,
          formato: formatos[i % formatos.length] ?? 'reel',
          plataforma,
          caption: '',
        }),
        scheduledAt: null,
      })),
    };
  },
  'calendario-inteligente': (ctx) => ({
    tipo: 'movimientos',
    modo: 'optimizar',
    calendarioDisponible: ctx.calendario.disponible,
    movimientos: movimientosOptimizar(
      ctx.calendario.posts,
      ctx.calendario.momentos,
      ctx.ahora,
      numero(ctx.valores, 'ventana', 14),
    ),
  }),
  reprogramar: (ctx) => ({
    tipo: 'movimientos',
    modo: 'reprogramar',
    calendarioDisponible: ctx.calendario.disponible,
    movimientos: movimientosReprogramar(
      ctx.calendario.posts,
      ctx.calendario.momentos,
      ctx.ahora,
      numero(ctx.valores, 'ventana', 14),
    ),
  }),
  brief: (ctx) => {
    const semanas = numero(ctx.valores, 'semanas', 4);
    const objetivo = texto(ctx.valores, 'objetivo');
    const plataforma = texto(ctx.valores, 'plataforma');
    return {
      tipo: 'proyecto',
      nombre: objetivo.slice(0, 80) || 'Campaña',
      objetivo,
      plataforma: plataforma === 'instagram' || plataforma === 'tiktok' ? plataforma : 'ambas',
      tareas: [
        'Definir mensaje y audiencia',
        `Producir ${semanas * 3} piezas`,
        'Revisar y aprobar cada pieza',
        'Programar las piezas en el calendario',
        'Medir resultados y decidir qué repetir',
      ],
      inicio: isoFecha(ctx.ahora),
      fin: isoFecha(ctx.ahora + semanas * 7 * DIA_MS),
    };
  },
  okr: (ctx) => {
    const metrica = texto(ctx.valores, 'metrica');
    const meta = numero(ctx.valores, 'meta', 100);
    return {
      tipo: 'objetivo',
      titulo: texto(ctx.valores, 'titulo'),
      porque: texto(ctx.valores, 'porque'),
      categoria: texto(ctx.valores, 'categoria') || 'growth',
      periodo: (['month', 'quarter', 'year'].includes(texto(ctx.valores, 'periodo'))
        ? texto(ctx.valores, 'periodo')
        : 'quarter') as 'month' | 'quarter' | 'year',
      keyResults: [
        {
          descripcion: `Llegar a ${meta} ${etiquetaMetrica[metrica] ?? 'unidades'}`,
          fuente: metrica,
          metricType: 'count',
          unidad: '',
          direccion: 'increase',
          baseline: null,
          target: meta,
        },
      ],
    };
  },
  experimento: (ctx) => ({
    tipo: 'experimento',
    hipotesis: texto(ctx.valores, 'hipotesis'),
    variable: texto(ctx.valores, 'variable'),
    metrica: texto(ctx.valores, 'metrica'),
    umbralMejora: numero(ctx.valores, 'umbral', 10),
    duracionDias: numero(ctx.valores, 'duracion', 7),
    nombreA: texto(ctx.valores, 'nombreA'),
    nombreB: texto(ctx.valores, 'nombreB'),
  }),
};

const DESTINOS: Record<string, Destino[]> = {
  caption: ['calendario', 'copiar'],
  hooks: ['copiar'],
  hashtags: ['copiar'],
  guion: ['calendario', 'copiar'],
  carrusel: ['calendario', 'copiar'],
  repurpose: ['calendario', 'copiar'],
  safety: ['copiar'],
  perfil: ['copiar'],
  respuestas: ['copiar'],
  plan: ['calendario', 'copiar'],
  metricas: ['bitacora', 'copiar'],
  stories: ['calendario', 'copiar'],
  ideas: ['calendario', 'copiar'],
  'calendario-inteligente': ['calendario'],
  reprogramar: ['calendario'],
  brief: ['proyecto', 'copiar'],
  okr: ['objetivo', 'copiar'],
  experimento: ['experimento', 'copiar'],
  bandeja: ['bitacora', 'copiar'],
  digest: ['bitacora', 'copiar'],
};

const cuandoLegible = (iso: string): string =>
  new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const lineaPieza = (p: PiezaCreacion): string =>
  `${p.titulo} · ${p.plataforma} · ${p.formato}${p.scheduledAt ? ` · ${cuandoLegible(p.scheduledAt)}` : ' · borrador sin fecha'}`;

const respaldoPiezas = (titulo: string, piezas: PiezaCreacion[], notas: string[]): ResultadoHerramienta => ({
  titulo,
  secciones: [{ titulo: 'Calendario', tipo: 'lista', contenido: piezas.map(lineaPieza) }],
  notas,
});

const respaldoPlan: Respaldo = (valores, contexto, ctx, accion) => {
  const piezas = accion.tipo === 'piezas' ? accion.piezas : [];
  const semanas = numero(valores, 'semanas', 1);
  const porSemana = numero(valores, 'publicaciones', 3);
  const notas = [
    contexto.momentos.length > 0
      ? 'Los horarios salen de los días y franjas que mejor rinden en tu cuenta.'
      : 'Sin historial: los horarios son sugeridos, no medidos en tu cuenta.',
  ];
  if (!ctx.conexiones.instagram && !ctx.conexiones.tiktok)
    notas.push('No hay cuentas conectadas: las piezas quedan en borrador hasta que conectes una red.');
  return respaldoPiezas(`Plan de ${semanas} semana(s), ${porSemana} publicaciones por semana`, piezas, notas);
};

const respaldoStories: Respaldo = (valores, _contexto, _ctx, accion) =>
  respaldoPiezas(`Historias para ${numero(valores, 'dias', 3)} día(s)`, accion.tipo === 'piezas' ? accion.piezas : [], [
    'Alterná encuesta, pregunta y detrás de escena para sostener la interacción.',
  ]);

const respaldoIdeas: Respaldo = (valores, _contexto, _ctx, accion) => {
  const piezas = accion.tipo === 'piezas' ? accion.piezas : [];
  return {
    titulo: `Banco de ${piezas.length} ideas sobre ${texto(valores, 'tema') || 'tu nicho'}`,
    secciones: [{ titulo: 'Ideas', tipo: 'lista', contenido: piezas.map((p) => `${p.titulo} · ${p.formato}`) }],
    notas: ['Las ideas quedan como borradores sin fecha: asignales horario cuando las conviertas en piezas.'],
  };
};

const respaldoMovimientos =
  (titulo: string, sinMovimientos: string): Respaldo =>
  (_valores, _contexto, _ctx, accion) => {
    if (accion.tipo !== 'movimientos') return { titulo, secciones: [], notas: [] };
    const lineas = accion.movimientos.map(
      (m) =>
        `${m.caption.slice(0, 60) || 'Pieza sin texto'} · ${m.actual ? `de ${cuandoLegible(m.actual)}` : 'sin fecha'} a ${cuandoLegible(m.propuesto)} · ${m.motivo}`,
    );
    return {
      titulo: accion.movimientos.length > 0 ? `${accion.movimientos.length} pieza(s) para reubicar` : sinMovimientos,
      secciones: lineas.length > 0 ? [{ titulo: 'Movimientos', tipo: 'lista', contenido: lineas }] : [],
      notas: !accion.calendarioDisponible
        ? ['El calendario no está disponible en este servidor: no se pudo leer ni mover piezas.']
        : accion.movimientos.length === 0
          ? [`${sinMovimientos}. Revisamos la ventana elegida y no hay cambios que proponer.`]
          : [],
    };
  };

const respaldoBrief: Respaldo = (valores, _contexto, _ctx, accion) => ({
  titulo: `Brief: ${texto(valores, 'objetivo').slice(0, 100)}`,
  secciones: [
    { titulo: 'Objetivo', tipo: 'texto', contenido: texto(valores, 'objetivo') },
    { titulo: 'Tareas', tipo: 'lista', contenido: accion.tipo === 'proyecto' ? accion.tareas : [] },
  ],
  notas: ['Se crea como proyecto en Junta ejecutiva para seguir el avance de cada tarea.'],
});

const respaldoOkr: Respaldo = (valores, _contexto, _ctx, accion) => ({
  titulo: `OKR: ${texto(valores, 'titulo')}`,
  secciones: [
    { titulo: 'Por qué importa', tipo: 'texto', contenido: texto(valores, 'porque') },
    {
      titulo: 'Resultados clave',
      tipo: 'lista',
      contenido:
        accion.tipo === 'objetivo' ? accion.keyResults.map((k) => `${k.descripcion} (fuente: ${k.fuente})`) : [],
    },
  ],
  notas: ['Se valida al crear: si la meta no es razonable o faltan datos, el sistema devuelve el motivo.'],
});

const respaldoExperimento: Respaldo = (valores, _contexto, _ctx, accion) => ({
  titulo: `Experimento: ${texto(valores, 'hipotesis').slice(0, 120)}`,
  secciones: [
    {
      titulo: 'Variantes',
      tipo: 'texto',
      contenido: `A: ${texto(valores, 'nombreA')} · B: ${texto(valores, 'nombreB')}`,
    },
    {
      titulo: 'Medición',
      tipo: 'texto',
      contenido:
        accion.tipo === 'experimento'
          ? `Métrica: ${accion.metrica}. Duración: ${accion.duracionDias} días. Gana la variante que mejore al menos ${accion.umbralMejora} %.`
          : '',
    },
  ],
  notas: [
    'Se registra en Experimentos con el estado de borrador: iniciá la prueba cuando las dos variantes estén listas.',
  ],
});

const respaldoBandeja: Respaldo = (valores, _contexto, ctx) => ({
  titulo: 'Resumen de la bandeja',
  secciones: [
    {
      titulo: 'Pendientes',
      tipo: 'lista',
      contenido: [
        `${ctx.bandeja.sinResponder} conversación(es) sin responder`,
        `${ctx.bandeja.escaladas} necesitan una persona`,
        `${ctx.bandeja.leadsSinResponder} lead(s) calificado(s) sin respuesta`,
      ],
    },
    {
      titulo: 'Atender primero',
      tipo: 'lista',
      contenido: ctx.bandeja.ejemplos.length > 0 ? ctx.bandeja.ejemplos : ['Nada urgente en la bandeja.'],
    },
  ],
  notas: ctx.bandeja.disponible
    ? [`Enfoque: ${texto(valores, 'enfoque') || 'prioridades'}.`]
    : ['La bandeja no está disponible en este momento.'],
});

const respaldoDigest: Respaldo = (valores, contexto, ctx) => {
  const top = contexto.formatos[0];
  return {
    titulo: `Resumen de los últimos ${texto(valores, 'periodo') || '7'} días`,
    secciones: [
      {
        titulo: 'Contenido',
        tipo: 'texto',
        contenido: top
          ? `Llevás ${contexto.totalPosts} publicaciones analizadas. El formato que mejor rinde es ${top.formato}, con ${top.medianaTasa} % de interacción mediana.`
          : `Todavía no hay publicaciones analizadas (${contexto.totalPosts}).`,
      },
      {
        titulo: 'Bandeja',
        tipo: 'texto',
        contenido: `${ctx.bandeja.sinResponder} sin responder, ${ctx.bandeja.escaladas} escaladas y ${ctx.bandeja.leadsSinResponder} leads calificados esperando respuesta.`,
      },
      {
        titulo: 'Próximo paso',
        tipo: 'texto',
        contenido:
          ctx.bandeja.leadsSinResponder > 0
            ? 'Respondé primero a los leads calificados: son la acción con más impacto esta semana.'
            : 'Mantené la cadencia del calendario y revisá qué formato repetir la semana que viene.',
      },
    ],
    notas: ['Cifras tomadas de tu cuenta y de la bandeja en este momento.'],
  };
};

const RESPALDOS: Record<string, Respaldo> = {
  plan: respaldoPlan,
  stories: respaldoStories,
  ideas: respaldoIdeas,
  'calendario-inteligente': respaldoMovimientos(
    'Tu calendario ya está en los mejores horarios',
    'Sin piezas para mover',
  ),
  reprogramar: respaldoMovimientos('No hay piezas vencidas', 'Sin piezas vencidas para reubicar'),
  brief: respaldoBrief,
  okr: respaldoOkr,
  experimento: respaldoExperimento,
  bandeja: respaldoBandeja,
  digest: respaldoDigest,
};

const dePropiedad = <T>(mapa: Record<string, T>, clave: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(mapa, clave) ? mapa[clave] : undefined;

/** Une la definición base con su acción, destinos y respaldo. */
export const ENSAMBLAR_HERRAMIENTA = (def: DefinicionBase): HerramientaDef => {
  const accion = dePropiedad(ACCIONES, def.id);
  const respaldo = dePropiedad(RESPALDOS, def.id) ?? def.respaldo;
  return {
    ...def,
    destinos: DESTINOS[def.id] ?? ['copiar'],
    ...(accion ? { accion } : {}),
    ...(respaldo ? { respaldo } : {}),
  };
};
