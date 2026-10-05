/**
 * Scheduler visto desde la Sala: lee jobs, overrides e historial, y aplica cambios de
 * habilitado / horario. Los cambios quedan en el archivo de overrides y se aplican cuando
 * el daemon del scheduler arranca de nuevo.
 */

import type { BrandProfile } from '../../config/types.js';
import { jobs as definicionesJobs, findJob } from '../../scheduler/jobs.js';
import {
  loadOverrides,
  recentRuns,
  runJobByName,
  saveOverrides,
  schedulerActivo,
  type JobOverride,
  type JobRunRecord,
} from '../../scheduler/runner.js';
import { ZONA_SCHEDULER_DEFECTO, construirVistaJobs, resumirScheduler, type VistaJob } from './schedulerMetricas.js';

const HISTORIAL_LIMITE = 200;

export const estadoScheduler = (ahora: Date = new Date()) => {
  const overrides = loadOverrides();
  const historial: JobRunRecord[] = recentRuns(HISTORIAL_LIMITE);
  const vistas = construirVistaJobs(definicionesJobs, overrides, historial, ahora, ZONA_SCHEDULER_DEFECTO);
  return {
    activo: schedulerActivo(),
    zona: ZONA_SCHEDULER_DEFECTO,
    jobs: vistas,
    resumen: resumirScheduler(vistas),
    historial: historial.slice(0, 60),
  };
};

export const actualizarJob = (
  nombre: string,
  cambios: { habilitado?: boolean; cron?: string | null },
  ahora: Date = new Date(),
): { vista: VistaJob } | null => {
  const definicion = findJob(nombre);
  if (!definicion) return null;
  const overrides: JobOverride[] = loadOverrides();
  const restantes = overrides.filter((o) => o.name !== nombre);
  let siguientes: JobOverride[];
  if (cambios.cron === null) {
    siguientes = restantes;
  } else {
    const actual = overrides.find((o) => o.name === nombre) ?? {
      name: definicion.name,
      cron: definicion.defaultCron,
      enabled: true,
    };
    const nuevo: JobOverride = {
      name: definicion.name,
      cron: cambios.cron ?? actual.cron,
      enabled: cambios.habilitado ?? actual.enabled,
    };
    siguientes = [...restantes, nuevo];
  }
  saveOverrides(siguientes);
  const [vista] = construirVistaJobs(
    [definicion],
    siguientes,
    recentRuns(HISTORIAL_LIMITE),
    ahora,
    ZONA_SCHEDULER_DEFECTO,
  );
  return vista ? { vista } : null;
};

export const ejecutarJobAhora = (nombre: string, brand: BrandProfile): Promise<JobRunRecord> =>
  runJobByName(nombre, brand);

export const existeJob = (nombre: string): boolean => findJob(nombre) !== undefined;
