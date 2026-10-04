/**
 * Auditoría semanal: puntaje por área y prioridades a partir de datos ya leídos. Función pura.
 * Cada regla es explícita. Un área sin datos no puntúa (puntaje null) y no entra al promedio.
 */

export type BandaAuditoria = 'excelente' | 'bueno' | 'aceptable' | 'riesgo' | 'critico' | 'sin-datos';

export interface AccionAuditoria {
  label: string;
  tipo: 'tab' | 'ruta';
  valor: string;
}

export interface AreaAuditoria {
  id: string;
  nombre: string;
  puntaje: number | null;
  banda: BandaAuditoria;
  observaciones: string[];
  impacto: string;
  accion: AccionAuditoria;
}

export interface PrioridadAuditoria {
  rank: number;
  titulo: string;
  porque: string;
  resultadoEsperado: string;
  accion: AccionAuditoria;
}

export interface DatosCuentaAuditoria {
  plataforma: 'instagram' | 'tiktok';
  conectado: boolean;
  error: string | null;
  seguidoresSemana: number | null;
  seguidoresSemanaPct: number | null;
  publicaciones30d: number;
  tasaMediana: number | null;
}

export interface DatosAuditoria {
  cuentas: DatosCuentaAuditoria[];
  objetivos: { total: number; enMeta: number; enRiesgo: number; atrasados: number; primerAtrasado: string | null };
  decisiones: {
    total: number;
    pendientes: number;
    pendientesUrgentes: number;
    expiradas: number;
    tiempoResolucionMin: number | null;
  };
  produccion: { acciones7d: number; misionesFallidas7d: number; carruselesEnRevision: number; piezas: number };
  comunidad: { total: number; sinResponder: number; escaladas: number; leadsSinResponder: number };
  economia: { ahorroUsd: number; gastosUsd: number };
}

const NOMBRE_RED = { instagram: 'Instagram', tiktok: 'TikTok' } as const;
const FRECUENCIA_REFERENCIA = 3;
const TASA_REFERENCIA = 4.5;
const DIAS_MES = 30;
const UMBRAL_PRIORIDAD = 70;

const acotar = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));
const promedio = (valores: number[]): number | null =>
  valores.length > 0 ? acotar(valores.reduce((s, v) => s + v, 0) / valores.length) : null;
const miles = (n: number): string => Math.round(n).toLocaleString('es-AR');
const porcentaje = (n: number): string => `${n.toFixed(1)}%`;

export const bandaDe = (puntaje: number | null): BandaAuditoria => {
  if (puntaje === null) return 'sin-datos';
  if (puntaje >= 85) return 'excelente';
  if (puntaje >= 70) return 'bueno';
  if (puntaje >= 55) return 'aceptable';
  if (puntaje >= 40) return 'riesgo';
  return 'critico';
};

const area = (
  id: string,
  nombre: string,
  puntaje: number | null,
  observaciones: string[],
  impacto: string,
  accion: AccionAuditoria,
): AreaAuditoria => ({ id, nombre, puntaje, banda: bandaDe(puntaje), observaciones, impacto, accion });

const areaCrecimiento = (cuentas: DatosCuentaAuditoria[]): AreaAuditoria => {
  const conectadas = cuentas.filter((c) => c.conectado);
  if (conectadas.length === 0) {
    return area(
      'crecimiento',
      'Crecimiento de cuentas',
      null,
      ['Ninguna cuenta conectada: no hay crecimiento para medir.'],
      'Medir y sostener el crecimiento de seguidores.',
      { label: 'Ver analytics', tipo: 'tab', valor: 'analytics' },
    );
  }
  const puntajes: number[] = [];
  const observaciones: string[] = [];
  for (const c of conectadas) {
    const nombre = NOMBRE_RED[c.plataforma];
    if (c.seguidoresSemanaPct === null || c.seguidoresSemana === null) {
      observaciones.push(`${nombre}: todavía no hay historial semanal de seguidores.`);
      continue;
    }
    const pct = c.seguidoresSemanaPct;
    puntajes.push(pct >= 2 ? 90 : pct > 0 ? 75 : pct <= -2 ? 35 : pct < 0 ? 45 : 60);
    const signo = c.seguidoresSemana > 0 ? '+' : '';
    observaciones.push(
      `${nombre}: ${signo}${miles(c.seguidoresSemana)} seguidores (${porcentaje(pct)}) en la última semana.`,
    );
  }
  return area(
    'crecimiento',
    'Crecimiento de cuentas',
    promedio(puntajes),
    observaciones,
    'Recuperar o sostener el crecimiento de seguidores.',
    { label: 'Ver analytics', tipo: 'tab', valor: 'analytics' },
  );
};

const areaContenido = (cuentas: DatosCuentaAuditoria[]): AreaAuditoria => {
  const puntajes: number[] = [];
  const observaciones: string[] = [];
  for (const c of cuentas.filter((x) => x.conectado && x.publicaciones30d > 0)) {
    const nombre = NOMBRE_RED[c.plataforma];
    const frecuencia = (c.publicaciones30d / DIAS_MES) * 7;
    let puntaje = frecuencia >= FRECUENCIA_REFERENCIA ? 85 : frecuencia >= 1.5 ? 70 : frecuencia >= 0.5 ? 50 : 30;
    let detalle = `${nombre}: publicás ${frecuencia.toFixed(1)} veces por semana (referencia interna: ${FRECUENCIA_REFERENCIA})`;
    if (c.tasaMediana !== null) {
      puntaje += c.tasaMediana >= TASA_REFERENCIA ? 10 : c.tasaMediana < 2 ? -10 : 0;
      detalle += ` y la tasa de interacción mediana es ${porcentaje(c.tasaMediana)}`;
    }
    puntajes.push(acotar(puntaje));
    observaciones.push(`${detalle}.`);
  }
  if (observaciones.length === 0) {
    observaciones.push('Todavía no hay publicaciones con métricas en los últimos 30 días.');
  }
  return area(
    'contenido',
    'Contenido y publicación',
    promedio(puntajes),
    observaciones,
    'Subir la frecuencia y la interacción por publicación.',
    { label: 'Ver análisis de posts', tipo: 'tab', valor: 'posts' },
  );
};

const areaObjetivos = (o: DatosAuditoria['objetivos']): AreaAuditoria => {
  if (o.total === 0) {
    return area(
      'objetivos',
      'Objetivos (OKR)',
      null,
      ['Todavía no hay objetivos activos.'],
      'Acercar los resultados clave a su meta.',
      { label: 'Crear objetivo', tipo: 'tab', valor: 'okrs' },
    );
  }
  const puntaje = acotar((100 * (o.enMeta + 0.5 * o.enRiesgo)) / o.total - 10 * o.atrasados);
  const observaciones = [
    `${o.enMeta} de ${o.total} objetivos en meta; ${o.enRiesgo} en riesgo y ${o.atrasados} atrasado(s).`,
  ];
  if (o.primerAtrasado) observaciones.push(`Atrasado: «${o.primerAtrasado}».`);
  return area('objetivos', 'Objetivos (OKR)', puntaje, observaciones, 'Acercar los resultados clave a su meta.', {
    label: 'Ver OKRs',
    tipo: 'tab',
    valor: 'okrs',
  });
};

const areaDecisiones = (d: DatosAuditoria['decisiones']): AreaAuditoria => {
  if (d.total === 0 && d.pendientes === 0) {
    return area(
      'decisiones',
      'Decisiones',
      null,
      ['Todavía no hay decisiones registradas.'],
      'Destrabar las decisiones que esperan tu aprobación.',
      { label: 'Ver decisiones', tipo: 'tab', valor: 'decisions' },
    );
  }
  const otrasPendientes = Math.max(0, d.pendientes - d.pendientesUrgentes);
  let puntaje =
    90 - Math.min(40, 8 * d.pendientesUrgentes) - Math.min(15, 3 * otrasPendientes) - Math.min(20, 4 * d.expiradas);
  if (d.tiempoResolucionMin !== null && d.tiempoResolucionMin > 24 * 60) puntaje -= 10;
  const observaciones = [
    `${d.pendientes} decisiones esperan tu aprobación (${d.pendientesUrgentes} de urgencia alta o crítica).`,
  ];
  if (d.expiradas > 0) observaciones.push(`${d.expiradas} decisiones expiraron sin respuesta.`);
  if (d.tiempoResolucionMin !== null) {
    observaciones.push(`Tiempo medio de resolución: ${miles(d.tiempoResolucionMin)} min.`);
  }
  return area(
    'decisiones',
    'Decisiones',
    acotar(puntaje),
    observaciones,
    'Destrabar las decisiones que esperan tu aprobación.',
    { label: 'Ver decisiones', tipo: 'tab', valor: 'decisions' },
  );
};

const areaProduccion = (p: DatosAuditoria['produccion']): AreaAuditoria => {
  if (p.acciones7d === 0 && p.piezas === 0) {
    return area(
      'produccion',
      'Producción y equipo',
      null,
      ['Sin actividad registrada en los últimos 7 días.'],
      'Reducir fallas y acelerar la producción.',
      { label: 'Ver centro de comandos', tipo: 'tab', valor: 'commandCenter' },
    );
  }
  const bonusActividad = p.acciones7d >= 20 ? 10 : p.acciones7d >= 5 ? 5 : 0;
  const bonusPiezas = p.piezas > 0 ? 5 : 0;
  const puntaje =
    70 + bonusActividad + bonusPiezas - Math.min(40, 8 * p.misionesFallidas7d) - (p.carruselesEnRevision > 5 ? 10 : 0);
  const observaciones = [`${miles(p.acciones7d)} acciones en 7 días y ${miles(p.piezas)} piezas producidas.`];
  if (p.misionesFallidas7d > 0) observaciones.push(`${p.misionesFallidas7d} misión(es) fallida(s) en 7 días.`);
  if (p.carruselesEnRevision > 0) observaciones.push(`${p.carruselesEnRevision} carrusel(es) esperando revisión.`);
  return area(
    'produccion',
    'Producción y equipo',
    acotar(puntaje),
    observaciones,
    'Reducir fallas y acelerar la producción.',
    { label: 'Ver centro de comandos', tipo: 'tab', valor: 'commandCenter' },
  );
};

const areaComunidad = (c: DatosAuditoria['comunidad']): AreaAuditoria => {
  if (c.total === 0) {
    return area(
      'comunidad',
      'Comunidad y leads',
      null,
      ['Todavía no hay conversaciones en la bandeja.'],
      'Responder a tiempo y no perder leads.',
      { label: 'Abrir inbox', tipo: 'ruta', valor: 'inbox' },
    );
  }
  const puntaje =
    95 -
    Math.min(40, 4 * Math.max(0, c.sinResponder - 3)) -
    Math.min(20, 5 * c.escaladas) -
    Math.min(30, 10 * c.leadsSinResponder);
  const observaciones = [
    `${c.sinResponder} conversaciones sin responder; ${c.escaladas} escalada(s) a una persona; ${c.leadsSinResponder} lead(s) calificado(s) sin respuesta.`,
  ];
  return area(
    'comunidad',
    'Comunidad y leads',
    acotar(puntaje),
    observaciones,
    'Responder a tiempo y no perder leads.',
    { label: 'Abrir inbox', tipo: 'ruta', valor: 'inbox' },
  );
};

const areaEconomia = (e: DatosAuditoria['economia']): AreaAuditoria => {
  if (e.gastosUsd <= 0 && e.ahorroUsd <= 0) {
    return area(
      'economia',
      'Economía e IA',
      null,
      ['Todavía no hay consumo de IA registrado.'],
      'Mantener el ahorro por encima del gasto de IA.',
      { label: 'Ver reporte', tipo: 'ruta', valor: 'reportes' },
    );
  }
  const ratio = e.gastosUsd > 0 ? e.ahorroUsd / e.gastosUsd : Number.POSITIVE_INFINITY;
  const puntaje = ratio >= 10 ? 95 : ratio >= 5 ? 85 : ratio >= 2 ? 70 : ratio >= 1 ? 55 : 35;
  return area(
    'economia',
    'Economía e IA',
    puntaje,
    [`Ahorro estimado USD ${miles(e.ahorroUsd)} frente a un gasto de IA de USD ${miles(e.gastosUsd)} (acumulado).`],
    'Mantener el ahorro por encima del gasto de IA.',
    { label: 'Ver reporte', tipo: 'ruta', valor: 'reportes' },
  );
};

const areaConexiones = (cuentas: DatosCuentaAuditoria[]): AreaAuditoria => {
  const puntajes: number[] = [];
  const observaciones: string[] = [];
  for (const c of cuentas) {
    const nombre = NOMBRE_RED[c.plataforma];
    if (!c.conectado && c.error === 'token_expired') {
      puntajes.push(30);
      observaciones.push(`${nombre}: la conexión venció. Volvé a conectarla.`);
    } else if (!c.conectado) {
      puntajes.push(40);
      observaciones.push(`${nombre}: no está conectado, así que no aparece en los reportes.`);
    } else if (c.error) {
      puntajes.push(60);
      observaciones.push(`${nombre}: conectado, pero no pudimos leer sus métricas en este momento.`);
    } else {
      puntajes.push(100);
      observaciones.push(`${nombre}: conectado y leyendo métricas.`);
    }
  }
  observaciones.push('TikTok no expone retención, completion ni alcance FYP: esos datos no se muestran.');
  return area(
    'conexiones',
    'Conexiones y datos',
    promedio(puntajes),
    observaciones,
    'Tener todas las cuentas conectadas y con datos completos.',
    { label: 'Revisar cuentas', tipo: 'ruta', valor: 'settings' },
  );
};

export const evaluarAreas = (datos: DatosAuditoria): AreaAuditoria[] => [
  areaCrecimiento(datos.cuentas),
  areaContenido(datos.cuentas),
  areaObjetivos(datos.objetivos),
  areaDecisiones(datos.decisiones),
  areaProduccion(datos.produccion),
  areaComunidad(datos.comunidad),
  areaEconomia(datos.economia),
  areaConexiones(datos.cuentas),
];

export const puntajeGeneral = (areas: AreaAuditoria[]): { puntaje: number | null; banda: BandaAuditoria } => {
  const puntaje = promedio(areas.map((a) => a.puntaje).filter((p): p is number => p !== null));
  return { puntaje, banda: bandaDe(puntaje) };
};

export const prioridadesDe = (areas: AreaAuditoria[]): PrioridadAuditoria[] =>
  areas
    .filter((a) => a.puntaje !== null && a.puntaje < UMBRAL_PRIORIDAD)
    .sort((a, b) => (a.puntaje ?? 0) - (b.puntaje ?? 0))
    .slice(0, 3)
    .map((a, i) => ({
      rank: i + 1,
      titulo: `Atender ${a.nombre.toLowerCase()}`,
      porque: a.observaciones[0] ?? '',
      resultadoEsperado: a.impacto,
      accion: a.accion,
    }));

export const resumenReglas = (
  general: { puntaje: number | null; banda: BandaAuditoria },
  areas: AreaAuditoria[],
  prioridades: PrioridadAuditoria[],
): string => {
  if (general.puntaje === null) {
    return 'Todavía no hay datos suficientes para puntuar la operación. Conectá tus cuentas y registrá objetivos para que la próxima auditoría tenga base.';
  }
  const conDatos = areas.filter((a) => a.puntaje !== null).length;
  const cierre =
    prioridades.length > 0
      ? `Lo primero que conviene atender: ${prioridades[0]?.titulo.toLowerCase() ?? ''}.`
      : 'No hay áreas en riesgo en los datos disponibles.';
  return `Puntaje general ${general.puntaje}/100 (${general.banda}). Áreas con datos: ${conDatos} de ${areas.length}. ${cierre}`;
};
