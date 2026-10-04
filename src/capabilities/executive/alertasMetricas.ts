/**
 * Alertas ejecutivas: reglas explícitas sobre datos ya leídos. Función pura. Las alertas no se
 * guardan: aparecen mientras la condición sea cierta y desaparecen cuando se resuelve.
 */

export type SeveridadAlerta = 'critica' | 'alta' | 'media' | 'info';
export type FuenteAlerta =
  | 'cuentas'
  | 'decisiones'
  | 'okr'
  | 'comunidad'
  | 'produccion'
  | 'economia'
  | 'auditoria'
  | 'autopilot';

export interface AccionAlerta {
  label: string;
  tipo: 'tab' | 'ruta';
  valor: string;
}

export interface Alerta {
  id: string;
  codigo: string;
  fuente: FuenteAlerta;
  severidad: SeveridadAlerta;
  titulo: string;
  detalle: string;
  plataforma: 'instagram' | 'tiktok' | null;
  accion: AccionAlerta;
  cuando: string;
}

export interface DatosAlertas {
  cuentas: Array<{
    plataforma: 'instagram' | 'tiktok';
    conectado: boolean;
    error: string | null;
    seguidoresSemanaPct: number | null;
    tasaMediana: number | null;
    publicaciones30d: number;
  }>;
  decisiones: {
    pendientesCriticas: number;
    pendientesAltas: number;
    expiradas7d: number;
    primeraPendiente: string | null;
  };
  okr: { atrasados: number; enRiesgo: number; primerAtrasado: string | null };
  comunidad: { sinResponder: number; escaladas: number; leadsSinResponder: number };
  produccion: { misionesFallidas7d: number; carruselesEnRevision: number };
  economia: { ahorroUsd: number; gastosUsd: number };
  auditoria: Array<{ nombre: string; puntaje: number }>;
  autopilot: Array<{
    plataforma: 'instagram' | 'tiktok';
    senal: string;
    severidad: 'critical' | 'high' | 'medium' | 'low';
    evidencia: string;
  }>;
}

const NOMBRE_RED = { instagram: 'Instagram', tiktok: 'TikTok' } as const;
const ORDEN: Record<SeveridadAlerta, number> = { critica: 0, alta: 1, media: 2, info: 3 };
const UMBRAL_CAIDA_SEGUIDORES = -2;
const UMBRAL_INTERACCION_BAJA = 2;
const MIN_POSTS_INTERACCION = 5;
const UMBRAL_REVISION = 5;
const UMBRAL_BANDEJA = 10;
const PUNTAJE_CRITICO_AUDITORIA = 40;

const miles = (n: number): string => Math.round(n).toLocaleString('es-AR');

const alerta = (
  fuente: FuenteAlerta,
  codigo: string,
  severidad: SeveridadAlerta,
  titulo: string,
  detalle: string,
  accion: AccionAlerta,
  cuando: string,
  plataforma: Alerta['plataforma'] = null,
): Alerta => ({
  id: `${fuente}:${codigo}`,
  codigo,
  fuente,
  severidad,
  titulo,
  detalle,
  plataforma,
  accion,
  cuando,
});

const ACCION_CUENTAS: AccionAlerta = { label: 'Revisar cuentas', tipo: 'ruta', valor: 'settings' };
const ACCION_ANALYTICS: AccionAlerta = { label: 'Ver analytics', tipo: 'tab', valor: 'analytics' };
const ACCION_POSTS: AccionAlerta = { label: 'Ver análisis de posts', tipo: 'tab', valor: 'posts' };
const ACCION_DECISIONES: AccionAlerta = { label: 'Ver decisiones', tipo: 'tab', valor: 'decisions' };
const ACCION_OKR: AccionAlerta = { label: 'Ver OKRs', tipo: 'tab', valor: 'okrs' };
const ACCION_INBOX: AccionAlerta = { label: 'Abrir inbox', tipo: 'ruta', valor: 'inbox' };
const ACCION_COMANDOS: AccionAlerta = { label: 'Ver centro de comandos', tipo: 'tab', valor: 'commandCenter' };
const ACCION_REPORTES: AccionAlerta = { label: 'Ver reporte', tipo: 'ruta', valor: 'reportes' };
const ACCION_AUDIT: AccionAlerta = { label: 'Ver auditoría', tipo: 'tab', valor: 'audit' };

const reglasCuentas = (datos: DatosAlertas, cuando: string): Alerta[] => {
  const out: Alerta[] = [];
  const conectadas = datos.cuentas.filter((c) => c.conectado);
  if (conectadas.length === 0) {
    out.push(
      alerta(
        'cuentas',
        'sin-cuentas',
        'info',
        'No hay cuentas conectadas',
        'Conectá Instagram o TikTok para medir crecimiento y performance.',
        ACCION_CUENTAS,
        cuando,
      ),
    );
  }
  for (const c of datos.cuentas) {
    const nombre = NOMBRE_RED[c.plataforma];
    if (!c.conectado && c.error === 'token_expired') {
      out.push(
        alerta(
          'cuentas',
          `conexion-vencida-${c.plataforma}`,
          'alta',
          `La conexión de ${nombre} venció`,
          'Sus métricas dejan de actualizarse hasta reconectarla.',
          ACCION_CUENTAS,
          cuando,
          c.plataforma,
        ),
      );
    }
    if (!c.conectado) continue;
    if (c.error) {
      out.push(
        alerta(
          'cuentas',
          `lectura-fallida-${c.plataforma}`,
          'media',
          `No pudimos leer las métricas de ${nombre}`,
          'La red no respondió en esta lectura; se reintenta sola.',
          ACCION_ANALYTICS,
          cuando,
          c.plataforma,
        ),
      );
    }
    if (c.seguidoresSemanaPct !== null && c.seguidoresSemanaPct <= UMBRAL_CAIDA_SEGUIDORES) {
      out.push(
        alerta(
          'cuentas',
          `seguidores-caen-${c.plataforma}`,
          'alta',
          `${nombre}: los seguidores bajaron ${c.seguidoresSemanaPct.toFixed(1)}% esta semana`,
          'Revisá qué formato dejó de rendir y respondé a la comunidad.',
          ACCION_ANALYTICS,
          cuando,
          c.plataforma,
        ),
      );
    }
    if (
      c.tasaMediana !== null &&
      c.publicaciones30d >= MIN_POSTS_INTERACCION &&
      c.tasaMediana < UMBRAL_INTERACCION_BAJA
    ) {
      out.push(
        alerta(
          'cuentas',
          `interaccion-baja-${c.plataforma}`,
          'media',
          `${nombre}: interacción mediana de ${c.tasaMediana.toFixed(1)}%`,
          `Basado en ${c.publicaciones30d} publicaciones de los últimos 30 días.`,
          ACCION_POSTS,
          cuando,
          c.plataforma,
        ),
      );
    }
  }
  return out;
};

export const alertasDe = (datos: DatosAlertas, cuando: string): Alerta[] => {
  const out: Alerta[] = [...reglasCuentas(datos, cuando)];

  const { decisiones, okr, comunidad, produccion, economia } = datos;
  if (decisiones.pendientesCriticas > 0) {
    out.push(
      alerta(
        'decisiones',
        'critica',
        'critica',
        `${decisiones.pendientesCriticas} decisión(es) de urgencia crítica esperan tu aprobación`,
        decisiones.primeraPendiente ?? '',
        ACCION_DECISIONES,
        cuando,
      ),
    );
  }
  if (decisiones.pendientesAltas > 0) {
    out.push(
      alerta(
        'decisiones',
        'alta',
        'alta',
        `${decisiones.pendientesAltas} decisión(es) de urgencia alta esperan aprobación`,
        'Aprobá o rechazá para que el equipo siga avanzando.',
        ACCION_DECISIONES,
        cuando,
      ),
    );
  }
  if (decisiones.expiradas7d > 0) {
    out.push(
      alerta(
        'decisiones',
        'expiradas',
        'media',
        `${decisiones.expiradas7d} decisión(es) expiraron sin respuesta`,
        'Revisá si esas acciones todavía hacen falta.',
        ACCION_DECISIONES,
        cuando,
      ),
    );
  }

  if (okr.atrasados > 0) {
    out.push(
      alerta(
        'okr',
        'atrasado',
        'alta',
        `${okr.atrasados} objetivo(s) atrasado(s)`,
        okr.primerAtrasado ? `Primero: «${okr.primerAtrasado}».` : '',
        ACCION_OKR,
        cuando,
      ),
    );
  }
  if (okr.enRiesgo > 0) {
    out.push(
      alerta(
        'okr',
        'en-riesgo',
        'media',
        `${okr.enRiesgo} objetivo(s) en riesgo`,
        'Revisá sus resultados clave antes de que se atrasen.',
        ACCION_OKR,
        cuando,
      ),
    );
  }

  if (comunidad.escaladas > 0) {
    out.push(
      alerta(
        'comunidad',
        'escalada',
        'alta',
        `${comunidad.escaladas} conversación(es) necesitan una persona`,
        'Quedaron marcadas para escalar: no las responde la automatización.',
        ACCION_INBOX,
        cuando,
      ),
    );
  }
  if (comunidad.leadsSinResponder > 0) {
    out.push(
      alerta(
        'comunidad',
        'lead-sin-responder',
        'alta',
        `${comunidad.leadsSinResponder} lead(s) calificado(s) sin respuesta`,
        'Responder en las primeras horas aumenta la conversión.',
        ACCION_INBOX,
        cuando,
      ),
    );
  }
  if (comunidad.sinResponder > UMBRAL_BANDEJA) {
    out.push(
      alerta(
        'comunidad',
        'bandeja-atrasada',
        'media',
        `${comunidad.sinResponder} conversaciones sin responder`,
        'La bandeja se está acumulando.',
        ACCION_INBOX,
        cuando,
      ),
    );
  }

  if (produccion.misionesFallidas7d > 0) {
    out.push(
      alerta(
        'produccion',
        'misiones-fallidas',
        'media',
        `${produccion.misionesFallidas7d} misión(es) fallaron en 7 días`,
        'Revisá la traza en el centro de comandos.',
        ACCION_COMANDOS,
        cuando,
      ),
    );
  }
  if (produccion.carruselesEnRevision > UMBRAL_REVISION) {
    out.push(
      alerta(
        'produccion',
        'revision-acumulada',
        'info',
        `${produccion.carruselesEnRevision} carruseles esperan revisión`,
        'Revisarlos libera la cola de publicación.',
        ACCION_COMANDOS,
        cuando,
      ),
    );
  }

  if (economia.gastosUsd > 0 && economia.ahorroUsd < economia.gastosUsd) {
    out.push(
      alerta(
        'economia',
        'ia-sin-retorno',
        'media',
        'El gasto de IA supera el ahorro estimado',
        `Ahorro USD ${miles(economia.ahorroUsd)} frente a un gasto de USD ${miles(economia.gastosUsd)} (acumulado).`,
        ACCION_REPORTES,
        cuando,
      ),
    );
  }

  for (const area of datos.auditoria.filter((a) => a.puntaje < PUNTAJE_CRITICO_AUDITORIA)) {
    out.push(
      alerta(
        'auditoria',
        `area-critica-${area.nombre.toLowerCase().replace(/\s+/g, '-')}`,
        'alta',
        `Auditoría: ${area.nombre} en nivel crítico`,
        `Puntaje ${area.puntaje}/100 en la última auditoría.`,
        ACCION_AUDIT,
        cuando,
      ),
    );
  }

  for (const s of datos.autopilot.filter((x) => x.severidad === 'critical' || x.severidad === 'high')) {
    out.push(
      alerta(
        'autopilot',
        `${s.plataforma}-${s.senal}`,
        s.severidad === 'critical' ? 'critica' : 'alta',
        `${NOMBRE_RED[s.plataforma]}: ${s.senal.replace(/-/g, ' ')}`,
        s.evidencia,
        { label: 'Ver autopilot', tipo: 'tab', valor: s.plataforma === 'instagram' ? 'igAutopilot' : 'ttAutopilot' },
        cuando,
        s.plataforma,
      ),
    );
  }

  return out.sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad] || a.titulo.localeCompare(b.titulo));
};
