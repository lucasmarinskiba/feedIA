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
  const conArrastre: number[] = [];
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
      if (dentro && previo.tasa >= medianaGeneral) conArrastre.push(actual.tasa);
      else sinArrastre.push(actual.tasa);
    }
  }
  const medCon = mediana(conArrastre);
  const medSin = mediana(sinArrastre);
  const diferenciaPct =
    medCon !== null && medSin !== null && medSin > 0 ? redondear(((medCon - medSin) / medSin) * 100, 0) : null;
  let lectura = 'Sin datos suficientes para medir el arrastre entre publicaciones.';
  if (conArrastre.length >= MIN_GRUPO && sinArrastre.length >= MIN_GRUPO && diferenciaPct !== null) {
    lectura =
      diferenciaPct >= 5
        ? `Publicar detrás de un post fuerte suma ${diferenciaPct} % de tasa: conviene encadenarlos dentro de 24 h.`
        : diferenciaPct <= -5
          ? `Las publicaciones que siguen a una fuerte rinden ${Math.abs(diferenciaPct)} % menos: no las pegues a continuación, separalas.`
          : 'El arrastre entre publicaciones no cambia el resultado de forma clara en tu cuenta.';
  }
  return {
    conArrastre: { n: conArrastre.length, medianaTasa: medCon === null ? null : redondear(medCon, 4) },
    sinArrastre: { n: sinArrastre.length, medianaTasa: medSin === null ? null : redondear(medSin, 4) },
    diferenciaPct,
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

export interface ResumenDecisiones {
  pendientes: number;
  criticas: number;
  altas: number;
  aprobadasUltimos30: number;
  rechazadasUltimos30: number;
  tasaAprobacionPct: number | null;
}

export const resumenDecisiones = (stats: {
  pending: number;
  approved: number;
  rejected: number;
  byUrgency: Record<string, number>;
}): ResumenDecisiones => {
  const decididas = stats.approved + stats.rejected;
  return {
    pendientes: stats.pending,
    criticas: stats.byUrgency['critical'] ?? 0,
    altas: stats.byUrgency['high'] ?? 0,
    aprobadasUltimos30: stats.approved,
    rechazadasUltimos30: stats.rejected,
    tasaAprobacionPct: decididas > 0 ? Math.round((stats.approved / decididas) * 100) : null,
  };
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
