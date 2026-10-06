/**
 * Acciones de las herramientas IA: qué crea o mueve cada una (piezas en el calendario, movimientos
 * de horarios, proyectos, OKR o experimentos), a qué destinos puede enviarse y los respaldos de
 * texto de las que no dependen de la IA. Las fechas las calcula planificación; el texto lo escribe
 * la IA o el respaldo.
 */

import type {
  AccionCreacion,
  ComplementoResultado,
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
import { parsearTranscripcion, planEdicion, type PlanEdicion } from './herramientasEdicion.js';
import { respaldoRespuestas } from './respuestasRespaldo.js';
import {
  respaldoCarrusel,
  respaldoHashtags,
  respaldoHooks,
  respaldoPerfil,
  respaldoRepurpose,
  respaldoSafety,
} from './respaldosContenido.js';
import {
  respaldoBandeja,
  respaldoBrief,
  respaldoCalendarioInteligente,
  respaldoDigest,
  respaldoExperimento,
  respaldoIdeas,
  respaldoMetricas,
  respaldoOkr,
  respaldoPlan,
  respaldoReprogramar,
  respaldoStories,
} from './respaldosEstrategia.js';
import { prepararRespuestas, type TipoCanal } from './respuestasTriaje.js';

type Valores = Record<string, string | number>;
type Respaldo = NonNullable<HerramientaDef['respaldo']>;
type Accion = (ctx: ContextoAccion) => AccionCreacion;
type Complemento = NonNullable<HerramientaDef['complemento']>;

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

const CTA_POR_OBJETIVO: Record<string, string> = {
  alcance: 'Compartilo con alguien que lo necesite.',
  engagement: 'Contame en los comentarios qué te pasa a vos con esto.',
  guardados: 'Guardalo para cuando te haga falta.',
  leads: 'Escribime por DM con la palabra "info" y te cuento cómo aplicarlo a tu caso.',
  ventas: 'Si querés verlo aplicado a tu caso, escribime por DM.',
};

const respaldoCaption: Respaldo = (valores, contexto, ctx) => {
  const idea = texto(valores, 'idea');
  const objetivo = texto(valores, 'objetivo');
  const desdeMaterial =
    ctx.material?.herramientaId === 'hooks'
      ? ctx.material.texto
          .split('\n')
          .map((l) => l.trim())
          .find((l) => l.startsWith('- '))
          ?.slice(2)
      : undefined;
  const gancho = desdeMaterial ?? `${idea}: lo que casi nadie te cuenta.`;
  const cuerpo =
    'Hay un paso concreto que cambia el resultado. Te lo muestro y te digo cómo medir si funciona en tu caso.';
  const cta = CTA_POR_OBJETIVO[objetivo] ?? CTA_POR_OBJETIVO['engagement'] ?? '';
  const hashtags = contexto.hashtagsTop.slice(0, 5).join(' ');
  const caption = [gancho, '', cuerpo, '', cta, ...(hashtags ? ['', hashtags] : [])].join('\n');
  return {
    titulo: 'Caption listo para revisar',
    secciones: [
      { titulo: 'Caption', tipo: 'copiable', contenido: caption },
      {
        titulo: 'Estructura',
        tipo: 'texto',
        contenido: `Gancho de contraste, cuerpo concreto y un CTA para el objetivo "${objetivo}".`,
      },
    ],
    notas: [
      'Respaldo por reglas: la IA no respondió. Reemplazá el cuerpo por un ejemplo real de tu cuenta.',
      ...(ctx.material ? [`Partió de: ${ctx.material.nombre}.`] : []),
    ],
  };
};

const respaldoGuion: Respaldo = (valores) => {
  const tema = texto(valores, 'tema');
  const duracion = numero(valores, 'duracion', 30);
  const beats = Math.max(2, Math.floor(duracion / 3) - 1);
  const pasos = Array.from({ length: beats }, (_, i) => {
    const desde = i * 3;
    const hasta = (i + 1) * 3;
    const accion =
      i === 0
        ? `Mostrá el problema concreto de ${tema}`
        : i === beats - 1
          ? `Cerrá el ejemplo con el resultado de ${tema}`
          : `Paso ${i} sobre ${tema}: una acción, un dato o una comparación`;
    return `${desde}-${hasta} s: ${accion}`;
  });
  return {
    titulo: `Guion de ${duracion} segundos`,
    secciones: [
      {
        titulo: 'Hook (0-2 s)',
        tipo: 'texto',
        contenido: `En pantalla: "${tema.slice(0, 60)}". Voz: una frase que promete algo concreto sobre el tema.`,
      },
      { titulo: 'Desarrollo', tipo: 'lista', contenido: pasos },
      {
        titulo: 'Cierre (últimos 3 s)',
        tipo: 'copiable',
        contenido: 'Una pregunta o un CTA concreto: ¿Qué te pasa a vos con esto? Contalo abajo.',
      },
      {
        titulo: 'B-roll sugerido',
        tipo: 'lista',
        contenido: ['Plano de vos hablando a cámara', 'Pantalla o producto en uso', 'Un texto grande por cada punto'],
      },
      {
        titulo: 'Tomas para generar con IA (prompts)',
        tipo: 'lista',
        contenido: pasos.map((paso, i) => {
          const plano = PLANOS_VIDEO[i % PLANOS_VIDEO.length] ?? 'plano medio';
          const accion = paso.slice(paso.indexOf(': ') + 2);
          return `Toma ${i + 1} (${plano}, vertical 9:16, unos 3 s): ${accion}. Luz natural, fondo simple, sin texto en pantalla, mismo personaje en todas las tomas.`;
        }),
      },
    ],
    notas: [
      'Respaldo por reglas: la IA no respondió. Ajustá el guion a tu voz.',
      `Duración objetivo: ${duracion} s.`,
      'Cada toma se genera por separado y se revisa clip por clip: ningún generador de video da el resultado garantizado.',
    ],
  };
};

const PLANOS_VIDEO = ['primer plano', 'plano medio', 'plano detalle', 'plano general'];

const segundosTexto = (segundos: number): string => `${segundos.toFixed(1).replace('.', ',')} s`;
const tiempoCorto = (segundos: number): string => {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos - minutos * 60;
  return `${String(minutos).padStart(2, '0')}:${resto.toFixed(1).padStart(4, '0').replace('.', ',')}`;
};
const MAX_CORTES_EN_RESULTADO = 20;

const seccionesDeEdicion = (plan: PlanEdicion): ComplementoResultado => {
  const ahorro = Math.max(0, plan.duracionOriginal - plan.duracionFinal);
  const cortes = plan.cortes
    .slice(0, MAX_CORTES_EN_RESULTADO)
    .map(
      (c) =>
        `${tiempoCorto(c.inicio)} → ${tiempoCorto(c.fin)} · ${c.motivo === 'silencio' ? 'silencio' : 'muletilla'} (${segundosTexto(c.fin - c.inicio)})`,
    );
  return {
    secciones: [
      {
        titulo: 'Edición propuesta',
        tipo: 'texto',
        contenido: `Duración ${segundosTexto(plan.duracionOriginal)} → ${segundosTexto(plan.duracionFinal)} (ahorro ${segundosTexto(ahorro)}). Muletillas quitadas: ${plan.muletillas}. Silencios recortados: ${plan.silencios}.`,
      },
      {
        titulo: 'Cortes',
        tipo: 'lista',
        contenido: cortes.length > 0 ? cortes : ['No hay silencios ni muletillas para cortar.'],
      },
      { titulo: 'Subtítulos (SRT, ya ajustados al video editado)', tipo: 'copiable', contenido: plan.subtitulosSrt },
      {
        titulo: 'Comando de edición (FFmpeg)',
        tipo: 'copiable',
        contenido: plan.ffmpeg ?? 'Hay demasiados cortes para un solo comando: editá por partes.',
      },
    ],
    notas: [
      'Los cortes salen de los tiempos de la transcripción: revisá el video antes de exportar.',
      'El comando asume entrada.mp4 con pista de video y de audio. Si no tiene audio, quitá las partes de audio.',
      'El comando termina donde termina la transcripción: si el video sigue, agregá ese tramo al final.',
    ],
  };
};

const complementoGuion: Complemento = (valores) => {
  const transcripcion = texto(valores, 'transcripcion');
  if (!transcripcion) return null;
  const segmentos = parsearTranscripcion(transcripcion);
  if (segmentos.length === 0) {
    return {
      secciones: [],
      notas: [
        'La transcripción no tiene tiempos: pegá el SRT o líneas que empiecen con [mm:ss] para recortar y subtitular.',
      ],
    };
  }
  const plan = planEdicion(segmentos);
  if (!plan) {
    return {
      secciones: [],
      notas: ['No queda contenido después de quitar silencios y muletillas: revisá la transcripción.'],
    };
  }
  return seccionesDeEdicion(plan);
};

const COMPLEMENTOS: Record<string, Complemento> = {
  guion: complementoGuion,
};

const tipoDeCanal = (valores: Valores): TipoCanal => (valores['tipo'] === 'dm' ? 'dm' : 'comentario');

const respaldoRespuestasHerramienta: Respaldo = (valores, _contexto, ctx) => {
  const preparacion =
    ctx.respuestas ??
    prepararRespuestas(texto(valores, 'mensaje'), tipoDeCanal(valores), valores['intencion'], ctx.conocimiento ?? []);
  return respaldoRespuestas(preparacion, tipoDeCanal(valores));
};

const RESPALDOS: Record<string, Respaldo> = {
  caption: respaldoCaption,
  guion: respaldoGuion,
  respuestas: respaldoRespuestasHerramienta,
  hooks: (valores) => respaldoHooks(valores),
  hashtags: (valores, contexto) => respaldoHashtags(valores, contexto),
  safety: (valores) => respaldoSafety(valores),
  carrusel: (valores) => respaldoCarrusel(valores),
  repurpose: (valores) => respaldoRepurpose(valores),
  perfil: (valores) => respaldoPerfil(valores),
  plan: respaldoPlan,
  stories: respaldoStories,
  ideas: respaldoIdeas,
  'calendario-inteligente': respaldoCalendarioInteligente,
  reprogramar: respaldoReprogramar,
  brief: respaldoBrief,
  okr: respaldoOkr,
  experimento: respaldoExperimento,
  metricas: respaldoMetricas,
  bandeja: respaldoBandeja,
  digest: respaldoDigest,
};

const dePropiedad = <T>(mapa: Record<string, T>, clave: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(mapa, clave) ? mapa[clave] : undefined;

/** Une la definición base con su acción, destinos y respaldo. */
export const ENSAMBLAR_HERRAMIENTA = (def: DefinicionBase): HerramientaDef => {
  const accion = dePropiedad(ACCIONES, def.id);
  const respaldo = dePropiedad(RESPALDOS, def.id) ?? def.respaldo;
  const complemento = dePropiedad(COMPLEMENTOS, def.id);
  return {
    ...def,
    destinos: DESTINOS[def.id] ?? ['copiar'],
    ...(accion ? { accion } : {}),
    ...(respaldo ? { respaldo } : {}),
    ...(complemento ? { complemento } : {}),
  };
};
