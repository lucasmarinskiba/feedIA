import { MIN_POSTS_PREDICCION } from './predictorModelo.js';

export type EstadoAsiento = 'listo' | 'parcial' | 'sin-datos';
export type ConfianzaMesa = 'sin-datos' | 'baja' | 'media';

export interface AsientoMesa {
  rol: string;
  pregunta: string;
  respuesta: string;
  estado: EstadoAsiento;
  evidencia: { muestra: number; confianza: ConfianzaMesa };
  faltantes: string[];
}

export interface ObjetivoMesa {
  titulo: string;
  progresoPct: number;
  progresoEsperadoPct: number | null;
  resultadosTotal: number;
  resultadosQueLlegan: number;
}

export interface EntradaMesa {
  totalPosts: number;
  seguidoresTotal: number | null;
  crecimientoPct: number | null;
  decisiones: { pendientes: number; criticas: number; masAntiguaHoras: number } | null;
  programacion: { proximos14Dias: number; vencidos: number; fallidos: number } | null;
  objetivos: ObjetivoMesa[] | null;
}

export interface MesaEjecutiva {
  asientos: AsientoMesa[];
  resumen: Record<EstadoAsiento, number>;
}

// "alta" no se asigna acá: exige validar el modelo con sus errores, cosa que la junta no hace.
const confianzaDe = (muestra: number): ConfianzaMesa => {
  if (muestra === 0) return 'sin-datos';
  if (muestra < MIN_POSTS_PREDICCION) return 'baja';
  return 'media';
};

const promedio = (valores: number[]): number =>
  valores.length === 0 ? 0 : Math.round(valores.reduce((s, v) => s + v, 0) / valores.length);

const direccion = (e: EntradaMesa, muestra: number): AsientoMesa => {
  const base = {
    rol: 'Dirección general',
    pregunta: '¿Vamos contra los objetivos del período?',
    evidencia: { muestra, confianza: confianzaDe(muestra) },
  };
  const objetivos = e.objetivos ?? [];
  if (objetivos.length === 0) {
    return {
      ...base,
      respuesta: 'No hay objetivos activos.',
      estado: 'sin-datos',
      faltantes: ['Cargar al menos un objetivo con resultados clave medibles'],
    };
  }
  const resultados = objetivos.reduce((s, o) => s + o.resultadosTotal, 0);
  const llegan = objetivos.reduce((s, o) => s + o.resultadosQueLlegan, 0);
  const esperados = objetivos.map((o) => o.progresoEsperadoPct).filter((v): v is number => v !== null);
  const referencia = esperados.length ? ` frente a ${promedio(esperados)}% esperado` : '';
  const respuesta = `${objetivos.length} objetivo(s) activo(s). Progreso medio ${promedio(objetivos.map((o) => o.progresoPct))}%${referencia}. ${llegan} de ${resultados} resultados clave proyectan llegar a la meta.`;
  if (resultados === 0) {
    return { ...base, respuesta, estado: 'parcial', faltantes: ['Los objetivos no tienen resultados clave medibles'] };
  }
  return { ...base, respuesta, estado: 'listo', faltantes: [] };
};

const crecimiento = (e: EntradaMesa, muestra: number): AsientoMesa => {
  const base = {
    rol: 'Crecimiento',
    pregunta: '¿Crecemos y en qué plataforma?',
    evidencia: { muestra, confianza: confianzaDe(muestra) },
  };
  if (e.seguidoresTotal === null && e.crecimientoPct === null) {
    return {
      ...base,
      respuesta: 'Sin lectura de seguidores.',
      estado: 'sin-datos',
      faltantes: ['Conectar Instagram o TikTok para leer seguidores'],
    };
  }
  const seguidores = e.seguidoresTotal === null ? 'sin dato' : e.seguidoresTotal.toLocaleString('es-AR');
  if (e.crecimientoPct === null) {
    return {
      ...base,
      respuesta: `Seguidores: ${seguidores}. Sin historial suficiente para medir el crecimiento del período.`,
      estado: 'parcial',
      faltantes: ['Historial de seguidores para medir el crecimiento del período'],
    };
  }
  const signo = e.crecimientoPct >= 0 ? '+' : '';
  return {
    ...base,
    respuesta: `Seguidores: ${seguidores}. Crecimiento: ${signo}${e.crecimientoPct}% en el período.`,
    estado: 'listo',
    faltantes: [],
  };
};

const operaciones = (e: EntradaMesa, muestra: number): AsientoMesa => {
  const base = {
    rol: 'Operaciones',
    pregunta: '¿Qué decisiones están esperando a alguien?',
    evidencia: { muestra, confianza: confianzaDe(muestra) },
  };
  if (!e.decisiones) {
    return {
      ...base,
      respuesta: 'La cola de decisiones no está disponible.',
      estado: 'sin-datos',
      faltantes: ['Restablecer la cola de decisiones'],
    };
  }
  const { pendientes, criticas, masAntiguaHoras } = e.decisiones;
  if (pendientes === 0) {
    return { ...base, respuesta: 'Sin decisiones pendientes.', estado: 'listo', faltantes: [] };
  }
  return {
    ...base,
    respuesta: `${pendientes} decisión(es) pendiente(s), ${criticas} crítica(s). La más antigua lleva ${masAntiguaHoras} h.`,
    estado: 'listo',
    faltantes: [],
  };
};

const produccion = (e: EntradaMesa, muestra: number): AsientoMesa => {
  const base = {
    rol: 'Producción',
    pregunta: '¿Qué sale en las próximas dos semanas y qué se nos está cayendo?',
    evidencia: { muestra, confianza: confianzaDe(muestra) },
  };
  if (!e.programacion) {
    return {
      ...base,
      respuesta: 'El calendario de publicaciones no está disponible.',
      estado: 'sin-datos',
      faltantes: ['Activar el almacenamiento de publicaciones programadas'],
    };
  }
  const { proximos14Dias, vencidos, fallidos } = e.programacion;
  const respuesta = `${proximos14Dias} publicación(es) programada(s) para los próximos 14 días. ${vencidos} vencida(s) sin publicar y ${fallidos} fallida(s) en los últimos 14 días.`;
  if (proximos14Dias === 0) {
    return { ...base, respuesta, estado: 'parcial', faltantes: ['No hay nada programado para los próximos 14 días'] };
  }
  if (vencidos > 0 || fallidos > 0) {
    return {
      ...base,
      respuesta,
      estado: 'parcial',
      faltantes: [
        ...(vencidos > 0 ? [`${vencidos} publicación(es) vencida(s) sin publicar`] : []),
        ...(fallidos > 0 ? [`${fallidos} publicación(es) fallida(s) para revisar`] : []),
      ],
    };
  }
  return { ...base, respuesta, estado: 'listo', faltantes: [] };
};

const datos = (muestra: number): AsientoMesa => {
  const confianza = confianzaDe(muestra);
  const base = {
    rol: 'Datos',
    pregunta: '¿Cuánto podemos confiar en estos números?',
    evidencia: { muestra, confianza },
  };
  if (muestra === 0) {
    return {
      ...base,
      respuesta: 'Todavía no hay publicaciones analizadas.',
      estado: 'sin-datos',
      faltantes: [`Acumular al menos ${MIN_POSTS_PREDICCION} publicaciones con métricas`],
    };
  }
  if (muestra < MIN_POSTS_PREDICCION) {
    return {
      ...base,
      respuesta: `${muestra} publicación(es) analizadas. Confianza ${confianza}.`,
      estado: 'parcial',
      faltantes: [`Faltan ${MIN_POSTS_PREDICCION - muestra} publicación(es) para una lectura con confianza media`],
    };
  }
  return {
    ...base,
    respuesta: `${muestra} publicación(es) analizadas. Confianza ${confianza}.`,
    estado: 'listo',
    faltantes: [],
  };
};

const cumplimiento = (muestra: number): AsientoMesa => ({
  rol: 'Cumplimiento y marca',
  pregunta: '¿Alguna publicación promete resultados o toca temas de riesgo?',
  respuesta: 'La junta no revisa el texto de las publicaciones. Safety Check revisa cada pieza por separado.',
  estado: 'parcial',
  evidencia: { muestra, confianza: confianzaDe(muestra) },
  faltantes: ['Revisión humana de promesas de salud, resultados o garantías antes de publicar'],
});

const finanzas = (muestra: number): AsientoMesa => ({
  rol: 'Finanzas',
  pregunta: '¿Cuánto cuesta producir y cuánto margen deja cada plan?',
  respuesta: 'La junta no muestra el costo de IA por cuenta ni el margen por plan.',
  estado: 'sin-datos',
  evidencia: { muestra, confianza: confianzaDe(muestra) },
  faltantes: ['Exponer el costo de IA por cuenta y el margen por plan en la junta'],
});

export const construirMesa = (e: EntradaMesa): MesaEjecutiva => {
  const muestra = e.totalPosts;
  const asientos = [
    direccion(e, muestra),
    crecimiento(e, muestra),
    operaciones(e, muestra),
    produccion(e, muestra),
    datos(muestra),
    cumplimiento(muestra),
    finanzas(muestra),
  ];
  const resumen: Record<EstadoAsiento, number> = { listo: 0, parcial: 0, 'sin-datos': 0 };
  for (const a of asientos) resumen[a.estado] += 1;
  return { asientos, resumen };
};
