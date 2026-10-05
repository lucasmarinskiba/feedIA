/**
 * Junta ejecutiva: cálculos para el Resumen (programación, efecto de arrastre, desvíos, balance de
 * formatos, series comparativas y decisiones). Función pura: no toca red ni disco.
 */

export type PlataformaJunta = 'instagram' | 'tiktok';

export interface PostJunta {
  plataforma: PlataformaJunta;
  publicadoEn: string;
  formato: string;
  tasa: number | null;
  horaLocal: number | null;
}

export interface ProgramadoJunta {
  plataforma: PlataformaJunta;
  formato: string;
  scheduledAt: string | null;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
}

const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;
const VENTANA_ARRASTRE_MS = 24 * HORA_MS;
const MIN_GRUPO = 2;

const mediana = (valores: number[]): number | null => {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 === 0 ? ((orden[medio - 1] ?? 0) + (orden[medio] ?? 0)) / 2 : (orden[medio] ?? 0);
};

const redondear = (n: number, d = 2): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export const franjaDeHora = (h: number): string => {
  if (h < 6) return 'madrugada';
  if (h < 12) return 'mañana';
  if (h < 15) return 'mediodía';
  if (h < 19) return 'tarde';
  return 'noche';
};

export interface EfectoArrastre {
  conArrastre: { n: number; medianaTasa: number | null };
  sinArrastre: { n: number; medianaTasa: number | null };
  diferenciaPct: number | null;
  mejorSeguidor: { formato: string; n: number; medianaTasa: number } | null;
  lectura: string;
}

/**
 * Efecto de arrastre (lead-in): cómo rinde una publicación que sigue, dentro de 24 h, a otra que
 * fue fuerte (tasa mayor o igual a la mediana de la cuenta). Compara contra las que no siguen a
 * una fuerte. Se calcula por plataforma, para no mezclar audiencias.
 */
export const efectoArrastre = (posts: PostJunta[]): EfectoArrastre => {
  const conTasa = posts.filter((p) => p.tasa !== null);
  const medianaGeneral = mediana(conTasa.map((p) => p.tasa as number)) ?? 0;
  const conArrastre: Array<{ tasa: number; formato: string }> = [];
  const sinArrastre: number[] = [];
  for (const plataforma of ['instagram', 'tiktok'] as const) {
    const serie = conTasa
      .filter((p) => p.plataforma === plataforma)
      .sort((a, b) => Date.parse(a.publicadoEn) - Date.parse(b.publicadoEn));
    for (let i = 1; i < serie.length; i++) {
      const actual = serie[i];
      const previo = serie[i - 1];
      if (!actual || !previo || actual.tasa === null || previo.tasa === null) continue;
      const dentro = Date.parse(actual.publicadoEn) - Date.parse(previo.publicadoEn) <= VENTANA_ARRASTRE_MS;
      if (dentro && previo.tasa >= medianaGeneral) conArrastre.push({ tasa: actual.tasa, formato: actual.formato });
      else sinArrastre.push(actual.tasa);
    }
  }
  const tasasCon = conArrastre.map((x) => x.tasa);
  const medCon = mediana(tasasCon);
  const medSin = mediana(sinArrastre);
  const diferenciaPct =
    medCon !== null && medSin !== null && medSin > 0 ? redondear(((medCon - medSin) / medSin) * 100, 0) : null;
  const porFormatoSeguidor = new Map<string, number[]>();
  for (const x of conArrastre)
    porFormatoSeguidor.set(x.formato, [...(porFormatoSeguidor.get(x.formato) ?? []), x.tasa]);
  const mejorSeguidor =
    [...porFormatoSeguidor.entries()]
      .filter(([, tasas]) => tasas.length >= MIN_GRUPO)
      .map(([formato, tasas]) => ({
        formato,
        n: tasas.length,
        medianaTasa: redondear(mediana(tasas) ?? 0, 4),
      }))
      .sort((a, b) => b.medianaTasa - a.medianaTasa)[0] ?? null;
  let lectura = 'Sin datos suficientes para medir el arrastre entre publicaciones.';
  if (tasasCon.length >= MIN_GRUPO && sinArrastre.length >= MIN_GRUPO && diferenciaPct !== null) {
    lectura =
      diferenciaPct >= 5
        ? `Publicar detrás de un post fuerte suma ${diferenciaPct} % de tasa: conviene encadenarlos dentro de 24 h.`
        : diferenciaPct <= -5
          ? `Las publicaciones que siguen a una fuerte rinden ${Math.abs(diferenciaPct)} % menos: no las pegues a continuación, separalas.`
          : 'El arrastre entre publicaciones no cambia el resultado de forma clara en tu cuenta.';
  }
  return {
    conArrastre: { n: tasasCon.length, medianaTasa: medCon === null ? null : redondear(medCon, 4) },
    sinArrastre: { n: sinArrastre.length, medianaTasa: medSin === null ? null : redondear(medSin, 4) },
    diferenciaPct,
    mejorSeguidor,
    lectura,
  };
};

export interface FranjaRendimiento {
  franja: string;
  posts: number;
  medianaTasa: number;
}

export const mejoresFranjas = (posts: PostJunta[]): FranjaRendimiento[] => {
  const grupos = new Map<string, number[]>();
  for (const p of posts) {
    if (p.tasa === null || p.horaLocal === null) continue;
    const franja = franjaDeHora(p.horaLocal);
    grupos.set(franja, [...(grupos.get(franja) ?? []), p.tasa]);
  }
  return [...grupos.entries()]
    .filter(([, tasas]) => tasas.length >= MIN_GRUPO)
    .map(([franja, tasas]) => ({ franja, posts: tasas.length, medianaTasa: redondear(mediana(tasas) ?? 0, 4) }))
    .sort((a, b) => b.medianaTasa - a.medianaTasa)
    .slice(0, 3);
};

const ZONA_JUNTA = 'America/Argentina/Buenos_Aires';
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
const INDICE_DIA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const diaSemanaDe = (iso: string): number | null => {
  if (!Number.isFinite(Date.parse(iso))) return null;
  const corto = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: ZONA_JUNTA }).format(new Date(iso));
  return INDICE_DIA[corto] ?? null;
};

export interface DiaRendimiento {
  dia: string;
  posts: number;
  medianaTasa: number;
}

export const mejoresDias = (posts: PostJunta[]): DiaRendimiento[] => {
  const grupos = new Map<number, number[]>();
  for (const p of posts) {
    if (p.tasa === null) continue;
    const dia = diaSemanaDe(p.publicadoEn);
    if (dia === null) continue;
    grupos.set(dia, [...(grupos.get(dia) ?? []), p.tasa]);
  }
  return [...grupos.entries()]
    .filter(([, tasas]) => tasas.length >= MIN_GRUPO)
    .map(([dia, tasas]) => ({
      dia: DIAS_SEMANA[dia] ?? '',
      posts: tasas.length,
      medianaTasa: redondear(mediana(tasas) ?? 0, 4),
    }))
    .sort((a, b) => b.medianaTasa - a.medianaTasa)
    .slice(0, 3);
};

export const franjasPorPlataforma = (posts: PostJunta[]): Record<PlataformaJunta, FranjaRendimiento[]> => ({
  instagram: mejoresFranjas(posts.filter((p) => p.plataforma === 'instagram')),
  tiktok: mejoresFranjas(posts.filter((p) => p.plataforma === 'tiktok')),
});

export interface DiagnosticoProgramacion {
  proximos14Dias: number;
  vencidos: number;
  fallidosUltimos14Dias: number;
  disciplinaPct: number | null;
  porDia: Array<{ dia: string; posts: number }>;
  porFormato: Array<{
    formato: string;
    planificados: number;
    sharePlanPct: number;
    tasaHistorica: number | null;
    recomendacion: string | null;
  }>;
}

const FORMATOS_PROGRAMACION = ['reel', 'carrusel', 'imagen', 'historia'] as const;

const diaIso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Diagnóstico de la programación: agenda de los próximos 14 días por día y formato, vencidos
 * (programados que ya pasaron y no se publicaron), fallidos, disciplina de publicación en 30 días
 * y balance de formatos frente al rendimiento histórico de cada uno.
 */
export const diagnosticoProgramacion = (
  programados: ProgramadoJunta[],
  historial: PostJunta[],
  ahora: number,
): DiagnosticoProgramacion => {
  const fin = ahora + 14 * DIA_MS;
  const enVentana = programados.filter((p) => {
    const t = p.scheduledAt ? Date.parse(p.scheduledAt) : NaN;
    return Number.isFinite(t) && t >= ahora && t <= fin && (p.status === 'scheduled' || p.status === 'publishing');
  });
  const vencidos = programados.filter((p) => {
    const t = p.scheduledAt ? Date.parse(p.scheduledAt) : NaN;
    return Number.isFinite(t) && t < ahora - HORA_MS && p.status === 'scheduled';
  }).length;
  const hace14 = ahora - 14 * DIA_MS;
  const fallidos = programados.filter((p) => {
    const t = p.scheduledAt ? Date.parse(p.scheduledAt) : NaN;
    return p.status === 'failed' && Number.isFinite(t) && t >= hace14;
  }).length;
  const hace30 = ahora - 30 * DIA_MS;
  const cerrados30 = programados.filter((p) => {
    const t = p.scheduledAt ? Date.parse(p.scheduledAt) : NaN;
    return Number.isFinite(t) && t >= hace30 && ['published', 'failed', 'cancelled'].includes(p.status);
  });
  const publicados30 = cerrados30.filter((p) => p.status === 'published').length;
  const disciplinaPct = cerrados30.length > 0 ? Math.round((publicados30 / cerrados30.length) * 100) : null;

  const porDiaMapa = new Map<string, number>();
  for (const p of enVentana) {
    const dia = diaIso(Date.parse(p.scheduledAt as string));
    porDiaMapa.set(dia, (porDiaMapa.get(dia) ?? 0) + 1);
  }
  const porDia = [...porDiaMapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, posts]) => ({ dia, posts }));

  const tasaPorFormato = new Map<string, number[]>();
  for (const p of historial) {
    if (p.tasa === null) continue;
    tasaPorFormato.set(p.formato, [...(tasaPorFormato.get(p.formato) ?? []), p.tasa]);
  }
  const medianasFormato = new Map<string, number>();
  for (const [formato, tasas] of tasaPorFormato) {
    if (tasas.length >= MIN_GRUPO) medianasFormato.set(formato, mediana(tasas) ?? 0);
  }
  const mejorFormato = [...medianasFormato.entries()].sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  const totalPlan = enVentana.length;
  const porFormato = FORMATOS_PROGRAMACION.map((formato) => {
    const planificados = enVentana.filter((p) => p.formato === formato).length;
    const sharePlanPct = totalPlan > 0 ? Math.round((planificados / totalPlan) * 100) : 0;
    const tasa = medianasFormato.get(formato) ?? null;
    let recomendacion: string | null = null;
    if (mejorFormato === formato && totalPlan > 0 && sharePlanPct < 35) {
      recomendacion = `${formato} es el formato que más rinde y sólo ocupa ${sharePlanPct} % de tu agenda: sumá piezas.`;
    }
    return {
      formato,
      planificados,
      sharePlanPct,
      tasaHistorica: tasa === null ? null : redondear(tasa, 4),
      recomendacion,
    };
  });

  return {
    proximos14Dias: enVentana.length,
    vencidos,
    fallidosUltimos14Dias: fallidos,
    disciplinaPct,
    porDia,
    porFormato,
  };
};

export interface SemanaSerie {
  semana: string;
  instagram: { posts: number; medianaTasa: number | null };
  tiktok: { posts: number; medianaTasa: number | null };
}

/** Serie semanal comparativa: mediana de tasa por plataforma y semana (lunes a domingo, UTC). */
export const serieSemanal = (posts: PostJunta[], semanas: number, ahora: number): SemanaSerie[] => {
  const lunes = (ms: number): number => {
    const d = new Date(ms);
    const dia = (d.getUTCDay() + 6) % 7;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dia);
  };
  const inicio = lunes(ahora) - (semanas - 1) * 7 * DIA_MS;
  const buckets = new Map<number, { instagram: number[]; tiktok: number[] }>();
  for (let i = 0; i < semanas; i++) buckets.set(inicio + i * 7 * DIA_MS, { instagram: [], tiktok: [] });
  for (const p of posts) {
    const t = Date.parse(p.publicadoEn);
    if (!Number.isFinite(t) || p.tasa === null) continue;
    const clave = lunes(t);
    const b = buckets.get(clave);
    if (b) b[p.plataforma].push(p.tasa);
  }
  return [...buckets.entries()].map(([ms, b]) => ({
    semana: new Date(ms).toISOString().slice(0, 10),
    instagram: {
      posts: b.instagram.length,
      medianaTasa: mediana(b.instagram) === null ? null : redondear(mediana(b.instagram) as number, 4),
    },
    tiktok: {
      posts: b.tiktok.length,
      medianaTasa: mediana(b.tiktok) === null ? null : redondear(mediana(b.tiktok) as number, 4),
    },
  }));
};

export type TonoJunta = 'bien' | 'atencion' | 'alerta' | 'neutral';

export interface AccionJunta {
  tono: TonoJunta;
  texto: string;
}

const ETIQUETA_ORIGEN_DECISION: Record<string, string> = {
  'proactive-agent': 'Agente proactivo',
  'anomaly-detector': 'Detector de anomalías',
  council: 'Consejo de agentes',
  'goal-replan': 'Replanificación de metas',
  'ad-spend': 'Inversión publicitaria',
  'content-safety': 'Seguridad de contenido',
  'community-crisis': 'Crisis en comunidad',
  'opportunity-window': 'Ventana de oportunidad',
  'experiment-result': 'Resultado de experimento',
  'carousel-factory': 'Carousel Factory',
  'comment-brain': 'Comment Brain',
  'swarm-conductor': 'Swarm Conductor',
  'social-connector': 'Conector de redes',
  'budget-guardian': 'Guardián de presupuesto',
  'okr-tracker': 'Seguimiento OKR',
  'ig-autopilot': 'Instagram Autopilot',
  'tt-autopilot': 'TikTok Autopilot',
};

export const etiquetaOrigen = (origen: string): string => ETIQUETA_ORIGEN_DECISION[origen] ?? origen;

export interface DecisionJunta {
  id: string;
  urgency: string;
  source: string;
  createdAt: string;
}

export interface StatsDecisionesJunta {
  pending: number;
  approved: number;
  rejected: number;
  avgResolutionMinutes: number;
  byUrgency: Record<string, number>;
  bySourceResolution: Record<string, { approved: number; rejected: number }>;
}

export interface OrigenDecision {
  origen: string;
  origenLabel: string;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  tasaAprobacionPct: number | null;
}

export interface ResumenDecisiones {
  pendientes: number;
  criticas: number;
  altas: number;
  aprobadasUltimos30: number;
  rechazadasUltimos30: number;
  tasaAprobacionPct: number | null;
  tiempoRespuestaMin: number;
  esperandoMas24h: number;
  porOrigen: OrigenDecision[];
}

export const resumenDecisiones = (
  stats: StatsDecisionesJunta,
  pendientes: DecisionJunta[],
  ahora: number,
): ResumenDecisiones => {
  const decididas = stats.approved + stats.rejected;
  const pendientesPorOrigen = new Map<string, number>();
  for (const d of pendientes) pendientesPorOrigen.set(d.source, (pendientesPorOrigen.get(d.source) ?? 0) + 1);
  const origenes = new Set([...Object.keys(stats.bySourceResolution), ...pendientesPorOrigen.keys()]);
  const porOrigen = [...origenes]
    .map((origen): OrigenDecision => {
      const r = stats.bySourceResolution[origen] ?? { approved: 0, rejected: 0 };
      const decididasOrigen = r.approved + r.rejected;
      return {
        origen,
        origenLabel: etiquetaOrigen(origen),
        pendientes: pendientesPorOrigen.get(origen) ?? 0,
        aprobadas: r.approved,
        rechazadas: r.rejected,
        tasaAprobacionPct: decididasOrigen > 0 ? Math.round((r.approved / decididasOrigen) * 100) : null,
      };
    })
    .sort((a, b) => b.pendientes + b.aprobadas + b.rechazadas - (a.pendientes + a.aprobadas + a.rechazadas));
  return {
    pendientes: stats.pending,
    criticas: stats.byUrgency['critical'] ?? 0,
    altas: stats.byUrgency['high'] ?? 0,
    aprobadasUltimos30: stats.approved,
    rechazadasUltimos30: stats.rejected,
    tasaAprobacionPct: decididas > 0 ? Math.round((stats.approved / decididas) * 100) : null,
    tiempoRespuestaMin: stats.avgResolutionMinutes,
    esperandoMas24h: pendientes.filter((d) => ahora - Date.parse(d.createdAt) > 24 * HORA_MS).length,
    porOrigen,
  };
};

/** Lecturas de la cola: qué esperar, qué tan rápido respondés y qué agentes aciertan o no. */
export const lecturasDecisiones = (r: ResumenDecisiones): AccionJunta[] => {
  const out: AccionJunta[] = [];
  if (r.esperandoMas24h > 0)
    out.push({ tono: 'alerta', texto: `${r.esperandoMas24h} decisión(es) llevan más de 24 h sin respuesta.` });
  if (r.tiempoRespuestaMin > 240)
    out.push({
      tono: 'atencion',
      texto: `Tardás unas ${Math.round(r.tiempoRespuestaMin / 60)} h en responder de media: respondé el mismo día para que las propuestas sigan vigentes.`,
    });
  for (const o of r.porOrigen) {
    const decididas = o.aprobadas + o.rechazadas;
    if (o.tasaAprobacionPct === null || decididas < 3) continue;
    if (o.tasaAprobacionPct <= 30)
      out.push({
        tono: 'atencion',
        texto: `${o.origenLabel} acierta poco: aprobás solo el ${o.tasaAprobacionPct} % de sus propuestas. Revisá sus umbrales.`,
      });
    else if (o.tasaAprobacionPct >= 80 && decididas >= 5)
      out.push({
        tono: 'bien',
        texto: `${o.origenLabel} acierta: aprobás el ${o.tasaAprobacionPct} % de sus propuestas.`,
      });
  }
  if (r.pendientes === 0 && out.length === 0)
    out.push({ tono: 'bien', texto: 'No hay decisiones esperando tu respuesta.' });
  return out.slice(0, 5);
};

const ETIQUETA_FUENTE_OKR: Record<string, string> = {
  manual: 'Carga manual',
  'seguidores-instagram': 'Seguidores de Instagram (automático)',
  'seguidores-tiktok': 'Seguidores de TikTok (automático)',
  'piezas-creadas': 'Piezas creadas (automático)',
  'carruseles-publicados': 'Carruseles publicados (automático)',
  'comentarios-revisados': 'Comentarios revisados (automático)',
};

const ETIQUETA_TENDENCIA_OKR: Record<string, string> = {
  accelerating: 'Acelera',
  steady: 'Estable',
  decelerating: 'Desacelera',
  stalled: 'Estancado',
};

const ETIQUETA_ESTADO_OKR: Record<string, string> = {
  'on-track': 'En camino',
  'at-risk': 'En riesgo',
  behind: 'Atrasado',
  ahead: 'Adelantado',
  completed: 'Completado',
  abandoned: 'Abandonado',
};

const ETIQUETA_PERIODO_OKR: Record<string, string> = { month: 'Mes', quarter: 'Trimestre', year: 'Año' };

export const etiquetasOKR = {
  fuente: (fuente: string): string => ETIQUETA_FUENTE_OKR[fuente] ?? fuente,
  tendencia: (tendencia: string): string => ETIQUETA_TENDENCIA_OKR[tendencia] ?? tendencia,
  estado: (estado: string): string => ETIQUETA_ESTADO_OKR[estado] ?? estado,
  periodo: (periodo: string): string => ETIQUETA_PERIODO_OKR[periodo] ?? periodo,
};

/** Porcentaje del período que ya transcurrió; es el avance que cabría esperar a esta altura. */
export const progresoEsperado = (inicio: string | null, fin: string | null, ahora: number): number | null => {
  const a = inicio ? Date.parse(inicio) : NaN;
  const b = fin ? Date.parse(fin) : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.min(100, Math.max(0, Math.round(((ahora - a) / (b - a)) * 100)));
};

export interface TareaJunta {
  texto: string;
  hecha: boolean;
}

export interface ProyectoJunta {
  inicio: string | null;
  fin: string | null;
  estado: string;
  tareas: TareaJunta[];
}

export interface AnalisisProyecto {
  tono: TonoJunta;
  etiqueta: string;
  diasRestantes: number | null;
  progresoRealPct: number;
  progresoEsperadoPct: number | null;
  desfasePts: number | null;
  proximaTarea: string | null;
}

/** Compara lo hecho con lo que correspondería según las fechas del proyecto. */
export const analizarProyecto = (p: ProyectoJunta, ahora: number): AnalisisProyecto => {
  const total = p.tareas.length;
  const hechas = p.tareas.filter((t) => t.hecha).length;
  const progresoRealPct = total === 0 ? 0 : Math.round((hechas / total) * 100);
  const proximaTarea = p.tareas.find((t) => !t.hecha)?.texto ?? null;
  const finMs = p.fin ? Date.parse(p.fin) : NaN;
  const diasRestantes = Number.isFinite(finMs) ? Math.ceil((finMs - ahora) / DIA_MS) : null;
  const progresoEsperadoPct = progresoEsperado(p.inicio, p.fin, ahora);
  const desfasePts = progresoEsperadoPct === null ? null : progresoRealPct - progresoEsperadoPct;
  const base = { diasRestantes, progresoRealPct, progresoEsperadoPct, desfasePts, proximaTarea };
  if (p.estado === 'completado') return { ...base, tono: 'bien', etiqueta: 'Completado' };
  if (p.estado === 'pausado') return { ...base, tono: 'neutral', etiqueta: 'Pausado' };
  if (total === 0) return { ...base, tono: 'neutral', etiqueta: 'Sin tareas' };
  if (diasRestantes !== null && diasRestantes < 0 && progresoRealPct < 100)
    return { ...base, tono: 'alerta', etiqueta: 'Vencido' };
  if (desfasePts === null) return { ...base, tono: 'neutral', etiqueta: 'Sin fechas completas' };
  if (desfasePts <= -25) return { ...base, tono: 'alerta', etiqueta: 'Atrasado' };
  if (desfasePts <= -10) return { ...base, tono: 'atencion', etiqueta: 'Algo atrasado' };
  if (desfasePts >= 10) return { ...base, tono: 'bien', etiqueta: 'Adelantado' };
  return { ...base, tono: 'bien', etiqueta: 'Al día' };
};

export interface ResumenProyectos {
  total: number;
  enCurso: number;
  completados: number;
  vencidos: number;
  atrasados: number;
  tareasPct: number;
}

export const resumenProyectos = (
  lista: Array<{ estado: string; tareas: TareaJunta[]; analisis: AnalisisProyecto }>,
): ResumenProyectos => {
  const tareas = lista.flatMap((p) => p.tareas);
  const hechas = tareas.filter((t) => t.hecha).length;
  return {
    total: lista.length,
    enCurso: lista.filter((p) => p.estado === 'en-curso').length,
    completados: lista.filter((p) => p.estado === 'completado').length,
    vencidos: lista.filter((p) => p.analisis.etiqueta === 'Vencido').length,
    atrasados: lista.filter((p) => p.analisis.etiqueta === 'Atrasado' || p.analisis.etiqueta === 'Algo atrasado')
      .length,
    tareasPct: tareas.length === 0 ? 0 : Math.round((hechas / tareas.length) * 100),
  };
};

export interface CuentaPlataforma {
  seguidores: number | null;
  crecimientoPct: number | null;
}

export interface FilaPlataforma {
  plataforma: PlataformaJunta;
  etiqueta: string;
  seguidores: number | null;
  crecimientoPct: number | null;
  publicaciones30d: number;
  publicacionesPrev30d: number;
  tasaMediana30d: number | null;
  tasaMedianaPrev30d: number | null;
  variacionTasaPct: number | null;
}

export interface ComparativaPlataformas {
  filas: FilaPlataforma[];
  lecturas: AccionJunta[];
}

const ETIQUETA_PLATAFORMA: Record<PlataformaJunta, string> = { instagram: 'Instagram', tiktok: 'TikTok' };

const variacionPct = (actual: number | null, previo: number | null): number | null =>
  actual !== null && previo !== null && previo > 0 ? Math.round(((actual - previo) / previo) * 100) : null;

/** Instagram frente a TikTok: últimos 30 días contra los 30 anteriores. */
export const comparativaPlataformas = (
  posts: PostJunta[],
  cuentas: Record<PlataformaJunta, CuentaPlataforma>,
  ahora: number,
): ComparativaPlataformas => {
  const hace30 = ahora - 30 * DIA_MS;
  const hace60 = ahora - 60 * DIA_MS;
  const filas = (['instagram', 'tiktok'] as const).map((plataforma): FilaPlataforma => {
    const propios = posts.filter((p) => p.plataforma === plataforma);
    const instanteMs = (p: PostJunta): number => Date.parse(p.publicadoEn);
    const actuales = propios.filter((p) => instanteMs(p) >= hace30 && instanteMs(p) <= ahora);
    const previos = propios.filter((p) => instanteMs(p) >= hace60 && instanteMs(p) < hace30);
    const tasaActual = mediana(actuales.flatMap((p) => (p.tasa === null ? [] : [p.tasa])));
    const tasaPrevia = mediana(previos.flatMap((p) => (p.tasa === null ? [] : [p.tasa])));
    return {
      plataforma,
      etiqueta: ETIQUETA_PLATAFORMA[plataforma],
      seguidores: cuentas[plataforma].seguidores,
      crecimientoPct: cuentas[plataforma].crecimientoPct,
      publicaciones30d: actuales.length,
      publicacionesPrev30d: previos.length,
      tasaMediana30d: tasaActual === null ? null : redondear(tasaActual, 4),
      tasaMedianaPrev30d: tasaPrevia === null ? null : redondear(tasaPrevia, 4),
      variacionTasaPct: variacionPct(tasaActual, tasaPrevia),
    };
  });
  return { filas, lecturas: lecturasPlataformas(filas) };
};

const lecturasPlataformas = (filas: FilaPlataforma[]): AccionJunta[] => {
  const out: AccionJunta[] = [];
  const conTasa = filas.filter((f) => f.tasaMediana30d !== null && f.tasaMediana30d > 0);
  if (conTasa.length === 2) {
    const [mayor, menor] = [...conTasa].sort((a, b) => (b.tasaMediana30d ?? 0) - (a.tasaMediana30d ?? 0));
    if (mayor && menor) {
      const diff = Math.round(((mayor.tasaMediana30d ?? 0) / (menor.tasaMediana30d ?? 1) - 1) * 100);
      if (diff >= 20)
        out.push({
          tono: 'bien',
          texto: `${mayor.etiqueta} rinde ${diff} % más que ${menor.etiqueta} en tasa de interacción por publicación.`,
        });
    }
  }
  for (const f of filas) {
    if (f.publicaciones30d === 0)
      out.push({ tono: 'alerta', texto: `${f.etiqueta} no publicó en los últimos 30 días.` });
    if (f.variacionTasaPct !== null && f.variacionTasaPct <= -15)
      out.push({
        tono: 'alerta',
        texto: `La tasa de ${f.etiqueta} bajó ${Math.abs(f.variacionTasaPct)} % frente a los 30 días anteriores.`,
      });
    if (f.variacionTasaPct !== null && f.variacionTasaPct >= 15)
      out.push({
        tono: 'bien',
        texto: `La tasa de ${f.etiqueta} subió ${f.variacionTasaPct} % frente a los 30 días anteriores.`,
      });
  }
  const conCrecimiento = filas.filter((f) => f.crecimientoPct !== null);
  if (conCrecimiento.length === 2) {
    const [a, b] = [...conCrecimiento].sort((x, y) => (y.crecimientoPct ?? 0) - (x.crecimientoPct ?? 0));
    const diferencia = Math.round((a?.crecimientoPct ?? 0) - (b?.crecimientoPct ?? 0));
    if (a && b && diferencia >= 5)
      out.push({
        tono: 'atencion',
        texto: `${a.etiqueta} crece ${diferencia} puntos más que ${b.etiqueta} en seguidores.`,
      });
  }
  return out.slice(0, 5);
};

export type FormatoCupo = 'carrusel' | 'historia' | 'video';

const FORMATOS_CUPO: readonly FormatoCupo[] = ['carrusel', 'historia', 'video'];
const ETIQUETA_CUPO: Record<FormatoCupo, string> = {
  carrusel: 'Carruseles',
  historia: 'Historias',
  video: 'Videos (reels y TikTok)',
};
const FORMATOS_PUBLICADOS_DE_CUPO: Record<FormatoCupo, readonly string[]> = {
  carrusel: ['carrusel'],
  historia: [],
  video: ['reel', 'video'],
};
const ETIQUETA_FORMATO: Record<string, string> = {
  reel: 'reels',
  carrusel: 'carruseles',
  imagen: 'imágenes',
  video: 'videos',
  historia: 'historias',
};

export const cupoDeFormato = (formato: string): FormatoCupo | null => {
  if (formato === 'carrusel' || formato === 'carousel') return 'carrusel';
  if (formato === 'historia' || formato === 'story') return 'historia';
  if (formato === 'reel' || formato === 'video') return 'video';
  return null;
};

const pctTexto = (fraccion: number): string => `${(fraccion * 100).toFixed(1).replace('.', ',')} %`;

const fechaCorta = (ms: number): string =>
  new Date(ms).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: ZONA_JUNTA });

export interface EntradaPlan {
  plan: string;
  precioUsd: number;
  cicloInicio: Date | null;
  cicloFin: Date | null;
  limites: Record<FormatoCupo, number>;
  usados: Record<FormatoCupo, number>;
}

export interface CupoFormato {
  formato: FormatoCupo;
  etiqueta: string;
  limite: number;
  usados: number;
  restantes: number;
  pctUsado: number;
  ritmoDiario: number;
  diasParaAgotar: number | null;
}

export interface CapacidadPlan {
  plan: string;
  precioUsd: number;
  diasRestantes: number;
  cicloFinTexto: string;
  cupos: CupoFormato[];
}

/** Ciclo de facturación; sin ciclo (plan gratuito) se usa el mes calendario. */
const cicloDe = (entrada: EntradaPlan, ahora: number): { inicio: number; fin: number } => {
  const d = new Date(ahora);
  const inicioMes = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const finMes = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  const inicio = entrada.cicloInicio?.getTime() ?? inicioMes;
  const fin = entrada.cicloFin?.getTime() ?? finMes;
  return fin > ahora && inicio < fin ? { inicio, fin } : { inicio: inicioMes, fin: finMes };
};

export const capacidadPlan = (entrada: EntradaPlan, ahora: number): CapacidadPlan => {
  const { inicio, fin } = cicloDe(entrada, ahora);
  const diasTranscurridos = Math.max(1, (ahora - inicio) / DIA_MS);
  const cupos = FORMATOS_CUPO.map((formato): CupoFormato => {
    const limite = entrada.limites[formato];
    const usados = entrada.usados[formato];
    const restantes = Math.max(0, limite - usados);
    const ritmoDiario = redondear(usados / diasTranscurridos, 2);
    let diasParaAgotar: number | null = null;
    if (limite > 0 && restantes === 0) diasParaAgotar = 0;
    else if (limite > 0 && ritmoDiario > 0) diasParaAgotar = Math.ceil(restantes / ritmoDiario);
    return {
      formato,
      etiqueta: ETIQUETA_CUPO[formato],
      limite,
      usados,
      restantes,
      pctUsado: limite > 0 ? Math.round((usados / limite) * 100) : 0,
      ritmoDiario,
      diasParaAgotar,
    };
  });
  return {
    plan: entrada.plan,
    precioUsd: entrada.precioUsd,
    diasRestantes: Math.max(0, Math.ceil((fin - ahora) / DIA_MS)),
    cicloFinTexto: fechaCorta(fin),
    cupos,
  };
};

export interface FilaAsignacion {
  formato: FormatoCupo;
  etiqueta: string;
  sugerido: number;
  programados: number;
  tasaHistorica: number | null;
  prioridad: number | null;
  sinCupo: boolean;
}

export interface AsignacionSugerida {
  ventanaDias: number;
  totalSugerido: number;
  totalProgramado: number;
  filas: FilaAsignacion[];
}

/**
 * Cuántas piezas de cada formato conviene producir y programar en la ventana, sin pasarse del cupo.
 * Reparte el cupo restante de forma proporcional a los días que quedan en el ciclo y ordena los
 * formatos por tasa histórica: la prioridad indica dónde poner primero las piezas.
 */
export const asignacionSugerida = (
  capacidad: CapacidadPlan,
  programados: ProgramadoJunta[],
  historial: PostJunta[],
  ahora: number,
  ventanaDias = 14,
): AsignacionSugerida => {
  const fin = ahora + ventanaDias * DIA_MS;
  const programadosPorCupo = new Map<FormatoCupo, number>();
  for (const p of programados) {
    const t = p.scheduledAt ? Date.parse(p.scheduledAt) : NaN;
    if (!Number.isFinite(t) || t < ahora || t > fin) continue;
    if (p.status !== 'scheduled' && p.status !== 'publishing') continue;
    const cupo = cupoDeFormato(p.formato);
    if (cupo) programadosPorCupo.set(cupo, (programadosPorCupo.get(cupo) ?? 0) + 1);
  }
  const tasaDeCupo = (cupo: FormatoCupo): number | null => {
    const tasas = historial
      .filter((p) => p.tasa !== null && FORMATOS_PUBLICADOS_DE_CUPO[cupo].includes(p.formato))
      .map((p) => p.tasa as number);
    return tasas.length >= MIN_GRUPO ? redondear(mediana(tasas) ?? 0, 4) : null;
  };
  const factor = Math.min(1, ventanaDias / Math.max(capacidad.diasRestantes, 1));
  const filas: FilaAsignacion[] = capacidad.cupos.map((c) => {
    const sinCupo = c.limite === 0;
    return {
      formato: c.formato,
      etiqueta: c.etiqueta,
      sugerido: sinCupo || c.restantes === 0 ? 0 : Math.max(1, Math.round(c.restantes * factor)),
      programados: programadosPorCupo.get(c.formato) ?? 0,
      tasaHistorica: tasaDeCupo(c.formato),
      prioridad: null,
      sinCupo,
    };
  });
  const conCupo = filas.filter((f) => f.sugerido > 0).sort((a, b) => (b.tasaHistorica ?? -1) - (a.tasaHistorica ?? -1));
  const prioridades = new Map(conCupo.map((f, i) => [f.formato, i + 1]));
  return {
    ventanaDias,
    totalSugerido: filas.reduce((s, f) => s + f.sugerido, 0),
    totalProgramado: filas.reduce((s, f) => s + f.programados, 0),
    filas: filas.map((f) => ({ ...f, prioridad: prioridades.get(f.formato) ?? null })),
  };
};

export interface AccionProgramacion {
  tono: 'alerta' | 'atencion' | 'bien';
  texto: string;
}

export interface ResumenProgramacion {
  tono: 'alerta' | 'atencion' | 'bien';
  titular: string;
  acciones: AccionProgramacion[];
}

/** Titular y acciones concretas de la programación, en lenguaje directo y ordenadas por urgencia. */
export const resumenProgramacion = (datos: {
  disponible: boolean;
  diagnostico: DiagnosticoProgramacion | null;
  capacidad: CapacidadPlan | null;
  asignacion: AsignacionSugerida | null;
  arrastre: EfectoArrastre;
  franjas: Record<PlataformaJunta, FranjaRendimiento[]>;
}): ResumenProgramacion => {
  const acciones: AccionProgramacion[] = [];
  const g = datos.diagnostico;
  if (g && g.vencidos > 0)
    acciones.push({
      tono: 'alerta',
      texto: `Reprogramá ${g.vencidos} publicación(es) vencida(s): ya pasó su hora y no salieron.`,
    });
  if (g && g.fallidosUltimos14Dias > 0)
    acciones.push({
      tono: 'alerta',
      texto: `Revisá ${g.fallidosUltimos14Dias} publicación(es) fallida(s) de los últimos 14 días y volvé a programarlas.`,
    });
  const a = datos.asignacion;
  if (datos.disponible && g && a && a.totalSugerido > 0 && g.proximos14Dias < a.totalSugerido) {
    acciones.push({
      tono: 'atencion',
      texto:
        g.proximos14Dias === 0
          ? `No hay piezas programadas para los próximos 14 días. Tu plan permite hasta ${a.totalSugerido}.`
          : `Tenés ${g.proximos14Dias} pieza(s) programada(s) en 14 días; tu plan permite hasta ${a.totalSugerido}.`,
    });
  }
  for (const c of datos.capacidad?.cupos ?? []) {
    if (c.limite === 0) continue;
    if (c.restantes === 0)
      acciones.push({
        tono: 'atencion',
        texto: `Se agotó tu cupo de ${c.etiqueta.toLowerCase()} este ciclo. Se renueva el ${datos.capacidad?.cicloFinTexto}.`,
      });
    else if (c.pctUsado >= 80)
      acciones.push({
        tono: 'atencion',
        texto: `Queda poco cupo de ${c.etiqueta.toLowerCase()} este ciclo (${c.restantes} sin usar). Usalo en lo que más rinde.`,
      });
  }
  const seguidor = datos.arrastre.mejorSeguidor;
  if (seguidor && datos.arrastre.diferenciaPct !== null && datos.arrastre.diferenciaPct >= 5) {
    acciones.push({
      tono: 'bien',
      texto: `Después de un post fuerte, publicá ${ETIQUETA_FORMATO[seguidor.formato] ?? seguidor.formato} dentro de 24 h: rinden ${pctTexto(seguidor.medianaTasa)} (${seguidor.n} casos).`,
    });
  }
  const mejorIg = datos.franjas.instagram[0];
  if (mejorIg)
    acciones.push({
      tono: 'bien',
      texto: `Tu mejor horario en Instagram es la ${mejorIg.franja} (${pctTexto(mejorIg.medianaTasa)} de interacción).`,
    });
  const tono = acciones.some((x) => x.tono === 'alerta') ? 'alerta' : acciones.length > 0 ? 'atencion' : 'bien';
  const titular =
    tono === 'alerta'
      ? 'Hay publicaciones con problemas que atender'
      : tono === 'atencion'
        ? 'La programación necesita algunos ajustes'
        : 'Tu programación está al día';
  return { tono, titular, acciones: acciones.slice(0, 4) };
};

export interface MensajeJunta {
  tono: 'alerta' | 'atencion' | 'bien';
  texto: string;
}

/** Mensajes de la junta: tres a cinco lecturas accionables, en orden de importancia. */
export const mensajesJunta = (datos: {
  decisiones: ResumenDecisiones;
  diagnostico: DiagnosticoProgramacion | null;
  arrastre: EfectoArrastre;
  okrPeorBrecha: string | null;
  seguidoresCrecimientoPct: number | null;
}): MensajeJunta[] => {
  const out: MensajeJunta[] = [];
  const d = datos.decisiones;
  if (d.criticas > 0)
    out.push({ tono: 'alerta', texto: `${d.criticas} decisión(es) crítica(s) esperan tu respuesta.` });
  else if (d.pendientes > 0)
    out.push({ tono: 'atencion', texto: `${d.pendientes} decisión(es) pendiente(s) en la cola.` });
  const g = datos.diagnostico;
  if (g) {
    if (g.vencidos > 0)
      out.push({
        tono: 'alerta',
        texto: `${g.vencidos} publicación(es) programadas se pasaron de hora sin publicarse.`,
      });
    if (g.fallidosUltimos14Dias > 0)
      out.push({
        tono: 'alerta',
        texto: `${g.fallidosUltimos14Dias} publicación(es) fallaron en los últimos 14 días.`,
      });
    if (g.proximos14Dias === 0) out.push({ tono: 'atencion', texto: 'La agenda de los próximos 14 días está vacía.' });
  }
  if (datos.arrastre.lectura && datos.arrastre.diferenciaPct !== null) {
    out.push({ tono: datos.arrastre.diferenciaPct >= 0 ? 'bien' : 'atencion', texto: datos.arrastre.lectura });
  }
  if (datos.okrPeorBrecha) out.push({ tono: 'atencion', texto: datos.okrPeorBrecha });
  if (datos.seguidoresCrecimientoPct !== null) {
    out.push({
      tono: datos.seguidoresCrecimientoPct >= 0 ? 'bien' : 'alerta',
      texto: `Seguidores: ${datos.seguidoresCrecimientoPct >= 0 ? '+' : ''}${datos.seguidoresCrecimientoPct} % en el período.`,
    });
  }
  return out.slice(0, 5);
};
