/**
 * Scheduler: estado de cada job (activo, pausado, con error), próxima ejecución en la zona de la
 * marca y descripción legible del cron. Función pura: no toca red ni disco.
 */

import cron from 'node-cron';

export const ZONA_SCHEDULER_DEFECTO = 'America/Argentina/Buenos_Aires';

export interface JobBase {
  name: string;
  description: string;
  defaultCron: string;
}

export interface OverrideJob {
  name: string;
  cron: string;
  enabled: boolean;
}

export interface RegistroEjecucion {
  name: string;
  startedAt: string;
  durationMs: number;
  ok: boolean;
  error?: string;
}

export type EstadoJob = 'activo' | 'pausado' | 'con-error' | 'sin-ejecuciones';

export interface VistaJob {
  nombre: string;
  descripcion: string;
  cronEfectivo: string;
  cronDefault: string;
  cronLegible: string;
  personalizado: boolean;
  habilitado: boolean;
  estado: EstadoJob;
  proximaEjecucion: string | null;
  ultimaEjecucion: { cuando: string; ok: boolean; error: string | null; duracionMs: number } | null;
  ejecuciones24h: number;
  errores24h: number;
}

export interface ResumenScheduler {
  total: number;
  activos: number;
  pausados: number;
  conError: number;
  ejecuciones24h: number;
  errores24h: number;
  proximaEjecucion: string | null;
}

const MINUTO_MS = 60_000;
const HORA_MS = 3_600_000;
const HORIZONTE_HORAS = 24 * 7;
const VENTANA_24H_MS = 24 * HORA_MS;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const pad = (n: number): string => String(n).padStart(2, '0');

const esSoloNumero = (texto: string): boolean => /^\d+$/.test(texto);

export const describirCron = (expr: string): string => {
  if (!cron.validate(expr)) return 'Expresión inválida';
  const [min, hora, dia, mes, dow] = expr.trim().split(/\s+/);
  if (min === undefined || hora === undefined || dia === undefined || mes === undefined || dow === undefined) {
    return 'Horario personalizado';
  }
  if (expr.trim() === '* * * * *') return 'Cada minuto';
  const paso = /^\*\/(\d+)$/.exec(min);
  if (paso && hora === '*' && dia === '*' && mes === '*' && dow === '*') {
    return `Cada ${paso[1]} minutos`;
  }
  if (min === '0' && hora === '*' && dia === '*' && mes === '*' && dow === '*') return 'Cada hora en punto';
  const pasoHora = /^\*\/(\d+)$/.exec(hora);
  if (min === '0' && pasoHora && dia === '*' && mes === '*' && dow === '*') {
    return `Cada ${pasoHora[1]} horas`;
  }
  const horas = hora.split(',');
  if (esSoloNumero(min) && horas.every(esSoloNumero) && dia === '*' && mes === '*') {
    const horario = horas.map((h) => `${pad(Number(h))}:${pad(Number(min))}`).join(' y ');
    if (dow === '*') return `Todos los días a las ${horario}`;
    if (dow === '1-5') return `De lunes a viernes a las ${horario}`;
    if (dow === '0,6' || dow === '6,0') return `Fines de semana a las ${horario}`;
    if (esSoloNumero(dow) && Number(dow) >= 0 && Number(dow) <= 7) {
      return `Cada ${DIAS[Number(dow) % 7]} a las ${horario}`;
    }
  }
  return 'Horario personalizado';
};

interface CronParseado {
  minutos: Set<number>;
  horas: Set<number>;
  dias: Set<number>;
  meses: Set<number>;
  semanas: Set<number>;
  diaRestringido: boolean;
  semanaRestringida: boolean;
}

const expandirCampo = (campo: string, min: number, max: number): Set<number> => {
  const valores = new Set<number>();
  for (const parte of campo.split(',')) {
    const [rango, pasoTexto] = parte.split('/');
    const paso = pasoTexto === undefined ? 1 : Number(pasoTexto);
    let desde = min;
    let hasta = max;
    if (rango !== '*' && rango !== undefined) {
      const [a, b] = rango.split('-');
      desde = Number(a);
      hasta = b === undefined ? (pasoTexto === undefined ? desde : max) : Number(b);
    }
    for (let v = desde; v <= hasta; v += paso) valores.add(v === 7 ? 0 : v);
  }
  return valores;
};

const parsearCron = (expr: string): CronParseado | null => {
  if (!cron.validate(expr)) return null;
  const [min, hora, dia, mes, dow] = expr.trim().split(/\s+/);
  if (!min || !hora || !dia || !mes || !dow) return null;
  return {
    minutos: expandirCampo(min, 0, 59),
    horas: expandirCampo(hora, 0, 23),
    dias: expandirCampo(dia, 1, 31),
    meses: expandirCampo(mes, 1, 12),
    semanas: expandirCampo(dow, 0, 6),
    diaRestringido: dia !== '*',
    semanaRestringida: dow !== '*',
  };
};

const formateadores = new Map<string, Intl.DateTimeFormat>();

const offsetZonaMs = (instante: number, zona: string): number => {
  let formateador = formateadores.get(zona);
  if (!formateador) {
    formateador = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formateadores.set(zona, formateador);
  }
  const partes = Object.fromEntries(formateador.formatToParts(new Date(instante)).map((p) => [p.type, p.value]));
  const comoUtc = Date.UTC(
    Number(partes['year']),
    Number(partes['month']) - 1,
    Number(partes['day']),
    Number(partes['hour']),
    Number(partes['minute']),
    Number(partes['second']),
  );
  return comoUtc - Math.floor(instante / 1000) * 1000;
};

export const siguienteEjecucion = (expr: string, desde: Date, zona: string = ZONA_SCHEDULER_DEFECTO): Date | null => {
  const p = parsearCron(expr);
  if (!p) return null;
  let t = (Math.floor(desde.getTime() / MINUTO_MS) + 1) * MINUTO_MS;
  const fin = t + HORIZONTE_HORAS * HORA_MS;
  let horaActual = Math.floor(t / HORA_MS);
  let offset = offsetZonaMs(t, zona);
  while (t <= fin) {
    if (Math.floor(t / HORA_MS) !== horaActual) {
      horaActual = Math.floor(t / HORA_MS);
      offset = offsetZonaMs(t, zona);
    }
    const local = new Date(t + offset);
    const minuto = local.getUTCMinutes();
    const hora = local.getUTCHours();
    const dia = local.getUTCDate();
    const mes = local.getUTCMonth() + 1;
    const semana = local.getUTCDay();
    const coincideDia =
      p.diaRestringido && p.semanaRestringida
        ? p.dias.has(dia) || p.semanas.has(semana)
        : p.dias.has(dia) && p.semanas.has(semana);
    if (p.minutos.has(minuto) && p.horas.has(hora) && p.meses.has(mes) && coincideDia) return new Date(t);
    t += MINUTO_MS;
  }
  return null;
};

const ultimoRegistro = (historial: RegistroEjecucion[], nombre: string): RegistroEjecucion | undefined =>
  historial.filter((r) => r.name === nombre).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];

export const construirVistaJobs = (
  jobs: JobBase[],
  overrides: OverrideJob[],
  historial: RegistroEjecucion[],
  ahora: Date,
  zona: string = ZONA_SCHEDULER_DEFECTO,
): VistaJob[] =>
  jobs.map((job) => {
    const override = overrides.find((o) => o.name === job.name);
    const habilitado = override ? override.enabled : true;
    const cronEfectivo = override?.cron ?? job.defaultCron;
    const proxima = habilitado ? siguienteEjecucion(cronEfectivo, ahora, zona) : null;
    const ultimo = ultimoRegistro(historial, job.name);
    const delJob = historial.filter((r) => r.name === job.name);
    const recientes = delJob.filter((r) => ahora.getTime() - Date.parse(r.startedAt) <= VENTANA_24H_MS);
    const estado: EstadoJob = !habilitado
      ? 'pausado'
      : !ultimo
        ? 'sin-ejecuciones'
        : ultimo.ok
          ? 'activo'
          : 'con-error';
    return {
      nombre: job.name,
      descripcion: job.description,
      cronEfectivo,
      cronDefault: job.defaultCron,
      cronLegible: describirCron(cronEfectivo),
      personalizado: override !== undefined,
      habilitado,
      estado,
      proximaEjecucion: proxima ? proxima.toISOString() : null,
      ultimaEjecucion: ultimo
        ? { cuando: ultimo.startedAt, ok: ultimo.ok, error: ultimo.error ?? null, duracionMs: ultimo.durationMs }
        : null,
      ejecuciones24h: recientes.length,
      errores24h: recientes.filter((r) => !r.ok).length,
    };
  });

export const resumirScheduler = (vistas: VistaJob[]): ResumenScheduler => {
  const proximas = vistas
    .map((v) => v.proximaEjecucion)
    .filter((x): x is string => x !== null)
    .sort();
  return {
    total: vistas.length,
    activos: vistas.filter((v) => v.habilitado).length,
    pausados: vistas.filter((v) => !v.habilitado).length,
    conError: vistas.filter((v) => v.estado === 'con-error').length,
    ejecuciones24h: vistas.reduce((s, v) => s + v.ejecuciones24h, 0),
    errores24h: vistas.reduce((s, v) => s + v.errores24h, 0),
    proximaEjecucion: proximas[0] ?? null,
  };
};

export const validarExpresionCron = (expr: unknown): { ok: true; valor: string } | { ok: false; error: string } => {
  if (typeof expr !== 'string') return { ok: false, error: 'La expresión cron debe ser texto.' };
  const limpia = expr.replace(/\u0000/g, '').trim();
  if (limpia.length === 0 || limpia.length > 100)
    return { ok: false, error: 'La expresión cron tiene un largo inválido.' };
  if (!cron.validate(limpia)) {
    return { ok: false, error: 'Expresión cron inválida. Usá 5 campos: minuto hora día mes día-de-semana.' };
  }
  return { ok: true, valor: limpia };
};
