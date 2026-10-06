/**
 * Respaldos por reglas de las herramientas de estrategia y operación (plan, historias, ideas, calendario,
 * brief, OKR, experimentos, métricas, bandeja y resumen). Usan el historial real de la cuenta, las fechas
 * elegidas, la cadencia programada y el estado de la bandeja. Función pura.
 */

import type {
  AccionCreacion,
  ContextoAccion,
  ContextoCuenta,
  ResultadoHerramienta,
  SeccionResultado,
} from './herramientasCatalogo.js';
import type { PiezaCreacion } from './herramientasPlanificacion.js';

type Valores = Record<string, string | number>;
type Respaldo = (
  valores: Valores,
  contexto: ContextoCuenta,
  ctx: ContextoAccion,
  accion: AccionCreacion,
) => ResultadoHerramienta;

const AVISO = 'Respaldo por reglas: la IA no respondió. Revisá antes de usarlo.';
const ZONA = 'America/Argentina/Buenos_Aires';
const DIA_MS = 86_400_000;
const PILARES = ['Educar', 'Mostrar el proceso', 'Prueba social', 'Conversión', 'Comunidad'];
const CTA_POR_PILAR: Record<string, string> = {
  Educar: 'Guardalo para volver a verlo.',
  'Mostrar el proceso': 'Contá cómo lo harías vos.',
  'Prueba social': 'Mandá tu caso por DM.',
  Conversión: 'Escribinos por DM y te contamos.',
  Comunidad: 'Respondé con tu experiencia.',
};
const GANCHOS = [
  (t: string) => `Lo que nadie cuenta sobre ${t}`,
  (t: string) => `3 señales de que ${t} te conviene`,
  (t: string) => `Cómo empezar con ${t} sin gastar de más`,
  (t: string) => `El error más común con ${t}`,
  (t: string) => `Un día real con ${t}`,
];
const TIPOS_HISTORIA = ['Encuesta', 'Pregunta', 'Quiz', 'Detrás de escena', 'Enlace o CTA', 'Slider'];
const FORMATOS_PESADOS = ['video', 'carrusel'];
const PUBLICACIONES_POR_VARIANTE = 3;

const texto = (v: Valores, clave: string): string => String(v[clave] ?? '').trim();
const numero = (v: Valores, clave: string, defecto: number): number => {
  const n = Number(v[clave]);
  return Number.isFinite(n) && n > 0 ? n : defecto;
};

const cuandoLegible = (iso: string): string =>
  new Date(iso).toLocaleString('es-AR', {
    timeZone: ZONA,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const diaLocal = (iso: string): string => new Date(iso).toLocaleDateString('en-CA', { timeZone: ZONA });

const franjaDe = (iso: string): { dia: string; franja: string } | null => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const dia = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, weekday: 'long' }).format(ms).toLowerCase();
  const hora =
    Number(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: 'numeric', hour12: false }).format(ms)) % 24;
  const franja = hora < 6 ? 'madrugada' : hora < 12 ? 'mañana' : hora < 15 ? 'mediodía' : hora < 19 ? 'tarde' : 'noche';
  return { dia, franja };
};

/** Cuánto rinde la franja propuesta según el historial de la cuenta. */
const rindeFranja = (iso: string, contexto: ContextoCuenta): string => {
  const f = franjaDe(iso);
  if (!f) return '';
  const momento = contexto.momentos.find((m) => m.dia === f.dia && m.franja === f.franja);
  return momento
    ? `${f.dia} ${f.franja}: mediana ${momento.medianaTasa} % en ${momento.posts} publicaciones`
    : `${f.dia} ${f.franja}: sin historial en esa franja`;
};

const lineaPieza = (p: PiezaCreacion): string =>
  `${p.titulo} · ${p.plataforma} · ${p.formato}${p.scheduledAt ? ` · ${cuandoLegible(p.scheduledAt)}` : ' · borrador sin fecha'}`;

const piezasDe = (accion: AccionCreacion): PiezaCreacion[] => (accion.tipo === 'piezas' ? accion.piezas : []);

const pesadasPorDia = (piezas: PiezaCreacion[]): string[] => {
  const conteo = new Map<string, number>();
  for (const p of piezas) {
    if (!p.scheduledAt || !FORMATOS_PESADOS.includes(p.formato)) continue;
    const dia = diaLocal(p.scheduledAt);
    conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
  }
  return [...conteo.entries()].filter(([, n]) => n > 1).map(([dia]) => dia);
};

/** Publicaciones programadas por semana en los próximos 30 días: la cadencia real del calendario. */
const cadenciaSemanal = (ctx: ContextoAccion): number => {
  if (!ctx.calendario.disponible) return 0;
  const hasta = ctx.ahora + 30 * DIA_MS;
  const programadas = ctx.calendario.posts.filter((p) => {
    if (p.status !== 'scheduled' || !p.scheduledAt) return false;
    const cuando = Date.parse(p.scheduledAt);
    return cuando >= ctx.ahora && cuando <= hasta;
  }).length;
  return programadas / (30 / 7);
};

export const respaldoPlan: Respaldo = (valores, contexto, _ctx, accion) => {
  const piezas = piezasDe(accion);
  const semanas = numero(valores, 'semanas', 1);
  const porSemana = numero(valores, 'publicaciones', 3);
  const objetivo = texto(valores, 'objetivo');
  const top = contexto.formatos[0];
  const notas = [
    contexto.momentos.length > 0
      ? 'Los horarios salen de los días y franjas que mejor rinden en tu cuenta.'
      : 'Sin historial: los horarios son sugeridos, no medidos en tu cuenta.',
  ];
  const dobles = pesadasPorDia(piezas);
  if (dobles.length > 0) notas.push(`Hay días con dos piezas pesadas (${dobles.join(', ')}): movelas para no saturar.`);
  return {
    titulo: `Plan de ${semanas} semana(s), ${porSemana} publicaciones por semana`,
    secciones: [
      { titulo: 'Calendario', tipo: 'lista', contenido: piezas.map(lineaPieza) },
      {
        titulo: 'Brief por pieza',
        tipo: 'lista',
        contenido: piezas.map(
          (p, i) =>
            `${PILARES[i % PILARES.length]} · ${p.formato}: gancho con Hook Factory, CTA para "${objetivo || 'tu objetivo'}"`,
        ),
      },
      {
        titulo: 'Por qué estos formatos',
        tipo: 'texto',
        contenido: top
          ? `${top.formato} es el formato que mejor rinde en tu cuenta (mediana ${top.medianaTasa} %). El resto del plan mantiene variedad de pilares.`
          : 'Sin historial: los formatos siguen una rotación pareja.',
      },
    ],
    notas,
  };
};

export const respaldoStories: Respaldo = (valores, _contexto, _ctx, accion) => {
  const dias = numero(valores, 'dias', 3);
  const porDia = numero(valores, 'historias_por_dia', 2);
  const tema = texto(valores, 'tema');
  const guion = Array.from({ length: dias }, (_, d) => {
    const historias = Array.from(
      { length: porDia },
      (_, h) => TIPOS_HISTORIA[(d * porDia + h) % TIPOS_HISTORIA.length],
    );
    return `Día ${d + 1}: ${historias.join(' → ')}`;
  });
  const secciones: SeccionResultado[] = [
    { titulo: 'Guion por día', tipo: 'lista', contenido: guion },
    { titulo: 'Calendario', tipo: 'lista', contenido: piezasDe(accion).map(lineaPieza) },
  ];
  if (tema) {
    secciones.push({
      titulo: 'Preguntas para los stickers',
      tipo: 'lista',
      contenido: Array.from({ length: dias }, (_, d) => `Día ${d + 1}: ¿Qué te gustaría saber sobre ${tema}?`),
    });
  }
  return {
    titulo: `Historias para ${dias} día(s)${tema ? `: ${tema}` : ''}`,
    secciones,
    notas: [
      'Alterná encuesta, pregunta y detrás de escena para sostener la interacción.',
      'Las respuestas a preguntas y encuestas pasan a la bandeja: respondelas el mismo día.',
    ],
  };
};

export const respaldoIdeas: Respaldo = (valores, contexto, _ctx, accion) => {
  const tema = texto(valores, 'tema') || 'tu nicho';
  const piezas = piezasDe(accion);
  const formatos = contexto.formatos.map((f) => f.formato);
  const orden = formatos.length > 0 ? formatos : ['reel', 'carrusel', 'post'];
  return {
    titulo: `Banco de ${piezas.length} ideas sobre ${tema}`,
    secciones: [
      {
        titulo: 'Ideas por pilar',
        tipo: 'lista',
        contenido: piezas.map((p, i) => {
          const pilar = PILARES[i % PILARES.length] ?? 'Educar';
          const gancho = GANCHOS[i % GANCHOS.length]?.(tema) ?? tema;
          return `${pilar} · ${p.formato} · gancho: ${gancho} · CTA: ${CTA_POR_PILAR[pilar] ?? ''}`;
        }),
      },
      {
        titulo: 'Formato sugerido',
        tipo: 'texto',
        contenido: `Empezá por ${orden[0]}${orden[1] ? ` y después ${orden[1]}` : ''}: son los formatos que más rinden en tu cuenta.`,
      },
    ],
    notas: [
      'Las ideas quedan como borradores sin fecha: asignales horario cuando las conviertas en piezas.',
      'Cada idea sale del tema y del formato que mejor rinde: no copia captions de tu historial.',
    ],
  };
};

const movimientosComo = (
  titulo: string,
  sinMovimientos: string,
  accion: AccionCreacion,
  etiquetaFecha: (m: { actual: string | null; propuesto: string }) => string,
): ResultadoHerramienta => {
  if (accion.tipo !== 'movimientos') return { titulo, secciones: [], notas: [] };
  const lineas = accion.movimientos.map(
    (m) => `${m.caption.slice(0, 60) || 'Pieza sin texto'} · ${etiquetaFecha(m)} · ${m.motivo}`,
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

export const respaldoCalendarioInteligente: Respaldo = (_valores, contexto, _ctx, accion) =>
  movimientosComo('Tu calendario ya está en los mejores horarios', 'Sin piezas para mover', accion, (m) => {
    const rinde = rindeFranja(m.propuesto, contexto);
    const cuando = m.actual
      ? `de ${cuandoLegible(m.actual)} a ${cuandoLegible(m.propuesto)}`
      : `sin fecha → ${cuandoLegible(m.propuesto)}`;
    return `${cuando} · ${rinde}`;
  });

export const respaldoReprogramar: Respaldo = (_valores, contexto, ctx, accion) => {
  const atraso = (iso: string | null): string => {
    if (!iso) return 'sin fecha';
    const dias = Math.max(0, Math.round((ctx.ahora - Date.parse(iso)) / DIA_MS));
    return `vencida hace ${dias} día(s)`;
  };
  return movimientosComo('No hay piezas vencidas', 'Sin piezas vencidas para reubicar', accion, (m) => {
    const rinde = rindeFranja(m.propuesto, contexto);
    return `${atraso(m.actual)} → ${cuandoLegible(m.propuesto)} · ${rinde}`;
  });
};

const fechasFases = (inicio: string | null, fin: string | null): string[] => {
  const nombres = ['Preparar', 'Lanzar', 'Medir', 'Ajustar'];
  if (!inicio || !fin) return nombres;
  const desde = Date.parse(inicio);
  const hasta = Date.parse(fin);
  if (!Number.isFinite(desde) || !Number.isFinite(hasta) || hasta <= desde) return nombres;
  const paso = (hasta - desde) / nombres.length;
  return nombres.map((nombre, i) => {
    const a = new Date(desde + i * paso).toISOString().slice(0, 10);
    const b = new Date(desde + (i + 1) * paso - DIA_MS).toISOString().slice(0, 10);
    return `${nombre} (del ${a} al ${b})`;
  });
};

export const respaldoBrief: Respaldo = (valores, contexto, _ctx, accion) => {
  const objetivo = texto(valores, 'objetivo');
  const proyecto = accion.tipo === 'proyecto' ? accion : null;
  const top = contexto.formatos[0];
  return {
    titulo: `Brief: ${objetivo.slice(0, 100)}`,
    secciones: [
      { titulo: 'Objetivo', tipo: 'texto', contenido: objetivo },
      { titulo: 'Fases', tipo: 'lista', contenido: fechasFases(proyecto?.inicio ?? null, proyecto?.fin ?? null) },
      { titulo: 'Tareas', tipo: 'lista', contenido: proyecto?.tareas ?? [] },
      {
        titulo: 'Checklist de lanzamiento',
        tipo: 'lista',
        contenido: [
          'Revisá cada caption con Safety Check antes de programarlo.',
          'Dejá lista la base de respuestas de Respuestas IA para las preguntas que van a llegar.',
          'Definí quién atiende las escaladas y en cuánto tiempo.',
          'Medí a los 7 y a los 14 días con Métricas explicadas.',
        ],
      },
      {
        titulo: 'Métrica de éxito',
        tipo: 'texto',
        contenido: top
          ? `Superar la mediana actual de ${top.formato} (${top.medianaTasa} %) durante la campaña.`
          : 'Sin historial: definí una línea base en la primera semana y medí contra ella.',
      },
    ],
    notas: ['Se crea como proyecto en Junta ejecutiva para seguir el avance de cada tarea.'],
  };
};

export const respaldoOkr: Respaldo = (valores, contexto, _ctx, accion) => {
  const top = contexto.formatos[0];
  return {
    titulo: `OKR: ${texto(valores, 'titulo')}`,
    secciones: [
      { titulo: 'Por qué importa', tipo: 'texto', contenido: texto(valores, 'porque') },
      {
        titulo: 'Resultados clave',
        tipo: 'lista',
        contenido:
          accion.tipo === 'objetivo'
            ? accion.keyResults.map(
                (k) =>
                  `${k.descripcion} · fuente ${k.fuente} · meta ${k.target} (${k.direccion === 'increase' ? 'subir' : 'bajar'})`,
              )
            : [],
      },
      {
        titulo: 'Línea base de tu cuenta',
        tipo: 'texto',
        contenido: top
          ? `${top.formato}: mediana de interacción ${top.medianaTasa} % en ${top.posts} publicaciones.`
          : 'Todavía sin historial: la primera medición es la línea base.',
      },
      {
        titulo: 'Cómo se mide',
        tipo: 'texto',
        contenido:
          'Revisalo cada semana en Analytics. Si la meta no se mueve en tres semanas, cambiá la estrategia, no solo la meta.',
      },
    ],
    notas: ['Se valida al crear: si la meta no es razonable o faltan datos, el sistema devuelve el motivo.'],
  };
};

export const respaldoExperimento: Respaldo = (valores, contexto, ctx, accion) => {
  const exp = accion.tipo === 'experimento' ? accion : null;
  const duracion = exp?.duracionDias ?? numero(valores, 'duracion', 7);
  const cadencia = cadenciaSemanal(ctx);
  const necesarias = PUBLICACIONES_POR_VARIANTE * 2;
  const diasNecesarios = cadencia > 0 ? Math.ceil(necesarias / (cadencia / 7)) : null;
  const factibilidad =
    diasNecesarios === null
      ? `No hay piezas programadas: para ${necesarias} publicaciones (${PUBLICACIONES_POR_VARIANTE} por variante) programá la cadencia primero.`
      : `Con ${cadencia.toFixed(1).replace('.', ',')} publicaciones por semana programadas, la prueba necesita unos ${diasNecesarios} día(s) para ${PUBLICACIONES_POR_VARIANTE} publicaciones por variante.`;
  const riesgos = [
    'Cambiar otra variable durante la prueba invalida el resultado.',
    contexto.totalPosts < 10
      ? 'Tu historial es corto: una diferencia chica puede ser ruido.'
      : 'Tu historial alcanza para comparar medianas entre variantes.',
  ];
  const notas = [
    'Se registra en Experimentos con el estado de borrador: iniciá la prueba cuando las dos variantes estén listas.',
  ];
  if (diasNecesarios !== null && duracion < diasNecesarios) {
    notas.push(
      `La duración elegida (${duracion} días) es menor que lo necesario: la prueba puede no llegar a una conclusión.`,
    );
  }
  return {
    titulo: `Experimento: ${texto(valores, 'hipotesis').slice(0, 120)}`,
    secciones: [
      { titulo: 'Pre-registro', tipo: 'texto', contenido: `Hipótesis: ${texto(valores, 'hipotesis')}` },
      {
        titulo: 'Variantes',
        tipo: 'texto',
        contenido: `A: ${texto(valores, 'nombreA')} · B: ${texto(valores, 'nombreB')}`,
      },
      {
        titulo: 'Medición',
        tipo: 'texto',
        contenido: exp
          ? `Métrica: ${exp.metrica}. Duración: ${exp.duracionDias} días. Muestra mínima: ${PUBLICACIONES_POR_VARIANTE} publicaciones por variante antes de decidir.`
          : '',
      },
      { titulo: 'Factibilidad', tipo: 'texto', contenido: factibilidad },
      {
        titulo: 'Criterio de decisión',
        tipo: 'lista',
        contenido: [
          `Si B supera a A en ${exp?.umbralMejora ?? 10} % o más, adoptá B.`,
          'Si la diferencia es menor, no concluyas: repetí con más muestra.',
          'Si A gana, guardá la lección en la bitácora.',
        ],
      },
      { titulo: 'Riesgos', tipo: 'lista', contenido: riesgos },
    ],
    notas,
  };
};

const CAUSA_BAJA = /(cay|baj|menos|perd|dismin)/i;

export const respaldoMetricas: Respaldo = (valores, contexto, ctx) => {
  const metrica = texto(valores, 'metrica');
  const cambio = texto(valores, 'cambio');
  const contextoExtra = texto(valores, 'contexto');
  const top = contexto.formatos[0];
  const mejorMomento = contexto.momentos[0];
  const causas: string[] = [];
  if (contexto.totalPosts < 8) {
    causas.push(
      'Historial corto: con pocas publicaciones cualquier cambio parece grande. Verificar: contá cuántas publicaciones hubo en cada semana.',
    );
  }
  if (top) {
    causas.push(
      `Formato: ${top.formato} es el que mejor rinde (${top.medianaTasa} %). Si se publicó menos de ese formato, puede explicar el cambio. Verificar: compará formatos de las dos semanas en Análisis posts.`,
    );
  }
  if (mejorMomento) {
    causas.push(
      `Horario: tus mejores franjas son ${mejorMomento.dia} ${mejorMomento.franja}. Si el cambio pasó fuera de esas franjas, puede ser el horario. Verificar: horario de las publicaciones de la última semana.`,
    );
  }
  causas.push(
    'Ruido o tendencia: las variaciones de una o dos semanas son comunes. Verificar: esperá tres semanas antes de sacar conclusiones.',
  );
  const direccion = CAUSA_BAJA.test(cambio) ? 'bajó' : 'cambió';
  const notas = [AVISO, 'Las causas son hipótesis: se confirman con los posts, no con esta explicación.'];
  if (!CAUSA_BAJA.test(cambio) && !/(sub|aument|crec|mejor|más)/i.test(cambio)) {
    notas.push('El cambio no indica dirección: describí cuánto y en qué período.');
  }
  if (!ctx.conexiones.instagram && !ctx.conexiones.tiktok)
    notas.push('Sin cuentas conectadas no hay datos nuevos para verificar.');
  const secciones: SeccionResultado[] = [
    { titulo: 'Lo observado', tipo: 'texto', contenido: `${metrica} ${direccion}: ${cambio}` },
    { titulo: 'Causas probables (de más a menos probable)', tipo: 'lista', contenido: causas },
    {
      titulo: 'Qué no sabemos',
      tipo: 'texto',
      contenido: contextoExtra || 'Falta el contexto de qué se publicó en el período.',
    },
  ];
  return { titulo: `Explicación: ${metrica}`, secciones, notas };
};

export const respaldoBandeja: Respaldo = (valores, _contexto, ctx) => {
  const { sinResponder, escaladas, leadsSinResponder } = ctx.bandeja;
  const orden = [
    escaladas > 0 ? `Escaladas (${escaladas}): asignalas a una persona hoy.` : null,
    leadsSinResponder > 0
      ? `Leads (${leadsSinResponder}): respondé por DM con Respuestas IA y pasalos a la bandeja.`
      : null,
    sinResponder > 0
      ? `Resto sin responder (${sinResponder}): respondé con Respuestas IA; las de riesgo se escalan solas.`
      : null,
  ].filter((paso): paso is string => paso !== null);
  const siguiente =
    escaladas > 0
      ? 'Asigná las escaladas a una persona hoy: no las dejes para después.'
      : leadsSinResponder > 0
        ? 'Respondé los leads con Respuestas IA (tipo DM) y después pasalos a la bandeja.'
        : 'No hay nada urgente: revisá las respuestas aprobadas y mantené la cadencia.';
  return {
    titulo: 'Resumen de la bandeja',
    secciones: [
      {
        titulo: 'Pendientes',
        tipo: 'lista',
        contenido: [
          `${sinResponder} conversación(es) sin responder`,
          `${escaladas} necesitan una persona`,
          `${leadsSinResponder} lead(s) calificado(s) sin respuesta`,
        ],
      },
      {
        titulo: 'Orden de atención',
        tipo: 'lista',
        contenido: orden.length > 0 ? orden : ['Nada pendiente en la bandeja.'],
      },
      {
        titulo: 'Atender primero',
        tipo: 'lista',
        contenido: ctx.bandeja.ejemplos.length > 0 ? ctx.bandeja.ejemplos : ['Nada urgente en la bandeja.'],
      },
      { titulo: 'Siguiente paso', tipo: 'texto', contenido: siguiente },
    ],
    notas: ctx.bandeja.disponible
      ? [`Enfoque: ${texto(valores, 'enfoque') || 'prioridades'}.`]
      : ['La bandeja no está disponible en este momento.'],
  };
};

const comparacionSemanal = (contexto: ContextoCuenta): string => {
  const { ultimos7, anteriores7 } = contexto.semanas ?? {
    ultimos7: { posts: 0, medianaTasa: null },
    anteriores7: { posts: 0, medianaTasa: null },
  };
  if (ultimos7.medianaTasa === null || anteriores7.medianaTasa === null) {
    return `Sin datos suficientes para comparar: ${ultimos7.posts} publicación(es) en los últimos 7 días y ${anteriores7.posts} en los 7 anteriores.`;
  }
  const cambio =
    anteriores7.medianaTasa === 0
      ? null
      : ((ultimos7.medianaTasa - anteriores7.medianaTasa) / anteriores7.medianaTasa) * 100;
  const sentido =
    cambio === null ? '' : cambio >= 0 ? `, subió ${cambio.toFixed(0)} %` : `, bajó ${Math.abs(cambio).toFixed(0)} %`;
  return `Mediana de interacción: ${ultimos7.medianaTasa} % en los últimos 7 días contra ${anteriores7.medianaTasa} % en los 7 anteriores${sentido}.`;
};

export const respaldoDigest: Respaldo = (valores, contexto, ctx) => {
  const top = contexto.formatos[0];
  const bajo = contexto.formatos.length > 1 ? contexto.formatos[contexto.formatos.length - 1] : undefined;
  const { posts, disponible } = ctx.calendario;
  const proximos = posts.filter((p) => {
    if (p.status !== 'scheduled' || !p.scheduledAt) return false;
    const cuando = Date.parse(p.scheduledAt);
    return cuando >= ctx.ahora && cuando < ctx.ahora + 7 * DIA_MS;
  }).length;
  const borradores = posts.filter((p) => p.status === 'draft').length;
  const pendientes = ctx.bandeja;
  return {
    titulo: `Resumen de los últimos ${texto(valores, 'periodo') || '7'} días`,
    secciones: [
      {
        titulo: 'Contenido',
        tipo: 'texto',
        contenido: top
          ? `Llevás ${contexto.totalPosts} publicaciones analizadas. ${top.formato} es el que mejor rinde (${top.medianaTasa} %)${bajo && bajo.formato !== top.formato ? `; ${bajo.formato} es el más bajo (${bajo.medianaTasa} %)` : ''}.`
          : `Todavía no hay publicaciones analizadas (${contexto.totalPosts}).`,
      },
      {
        titulo: 'Semana contra semana',
        tipo: 'texto',
        contenido: comparacionSemanal(contexto),
      },
      {
        titulo: 'Calendario',
        tipo: 'texto',
        contenido: disponible
          ? `${proximos} programada(s) en los próximos 7 días y ${borradores} borrador(es) sin enviar.`
          : 'El calendario no está disponible en este servidor.',
      },
      {
        titulo: 'Bandeja',
        tipo: 'texto',
        contenido: `${pendientes.sinResponder} sin responder, ${pendientes.escaladas} escaladas y ${pendientes.leadsSinResponder} leads calificados esperando respuesta.`,
      },
      {
        titulo: 'Próximo paso',
        tipo: 'texto',
        contenido:
          pendientes.leadsSinResponder > 0
            ? 'Respondé primero a los leads calificados: son la acción con más impacto esta semana.'
            : 'Mantené la cadencia del calendario y repetí el formato que mejor rinde.',
      },
    ],
    notas: ['Cifras tomadas de tu cuenta, del calendario y de la bandeja en este momento.'],
  };
};
