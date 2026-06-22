import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export type SequenceTrigger =
  | 'nuevo-seguidor'
  | 'lead-frio'
  | 'lead-tibio'
  | 'cliente-nuevo'
  | 'reenganche-30d'
  | 'asistio-evento';

export interface NurtureStep {
  ordenDia: number;
  asunto: string;
  mensaje: string;
  ctaOpcional?: string;
  esperaSegundos: number;
  condicionAvance: 'siempre' | 'sin-respuesta' | 'con-respuesta';
}

export interface NurtureSequence {
  id: string;
  trigger: SequenceTrigger;
  nombre: string;
  pasos: NurtureStep[];
  creadoEn: string;
}

export interface SequenceEnrollment {
  enrollmentId: string;
  sequenceId: string;
  igUserId: string;
  pasoActual: number;
  inscritoEn: string;
  proximoEnvioEn: string;
  status: 'activo' | 'completado' | 'pausado' | 'baja';
  ultimaInteraccion?: string;
}

const SEQ_PATH = resolve('data/runtime/nurture-sequences.json');
const ENROLL_PATH = resolve('data/runtime/nurture-enrollments.json');

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const loadSeqs = (): NurtureSequence[] =>
  existsSync(SEQ_PATH) ? (JSON.parse(readFileSync(SEQ_PATH, 'utf-8')) as NurtureSequence[]) : [];
const saveSeqs = (s: NurtureSequence[]): void => {
  ensureDir();
  writeFileSync(SEQ_PATH, JSON.stringify(s, null, 2), 'utf-8');
};
const loadEnroll = (): SequenceEnrollment[] =>
  existsSync(ENROLL_PATH) ? (JSON.parse(readFileSync(ENROLL_PATH, 'utf-8')) as SequenceEnrollment[]) : [];
const saveEnroll = (e: SequenceEnrollment[]): void => {
  ensureDir();
  writeFileSync(ENROLL_PATH, JSON.stringify(e, null, 2), 'utf-8');
};

const newId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const diseñarSecuencia = async (
  brand: BrandProfile,
  trigger: SequenceTrigger,
  pasosDeseados: number,
): Promise<NurtureSequence> => {
  const prompt = `Actuá como diseñador de secuencias de nurturing por DM en Instagram.

${brandContext(brand)}

TRIGGER: ${trigger}
PASOS DESEADOS: ${pasosDeseados}

Reglas:
- Primer mensaje en ≤ 5 minutos del trigger. Mensajes posteriores espaciados por días, no horas (no spamear).
- Tono: humano, NO copy-paste de plantilla.
- Cada paso debe aportar valor antes de pedir nada (90% dar, 10% pedir).
- Si trigger=nuevo-seguidor: primer paso saluda + recurso útil; segundo paso (día 2-3) consulta abierta; tercero (día 5-7) ofrecimiento suave.
- Si trigger=lead-frío: reactivar con curiosidad, no recordar precios.
- "condicionAvance": "sin-respuesta" para no spamear cuando ya están conversando.

JSON:
{
  "id": "lo-genero-yo-luego",
  "trigger": "${trigger}",
  "nombre": "nombre corto descriptivo",
  "pasos": [
    {
      "ordenDia": 0,
      "asunto": "qué cubre este paso",
      "mensaje": "DM listo para enviar (max 4 oraciones)",
      "ctaOpcional": "CTA si corresponde",
      "esperaSegundos": 0,
      "condicionAvance": "siempre|sin-respuesta|con-respuesta"
    }
  ],
  "creadoEn": ""
}`;
  type Drafted = Omit<NurtureSequence, 'id' | 'creadoEn'>;
  const drafted = await askJson<Drafted>(prompt, { maxTokens: 3000 });
  const seq: NurtureSequence = {
    ...drafted,
    id: newId('seq'),
    creadoEn: new Date().toISOString(),
  };
  const all = loadSeqs();
  all.push(seq);
  saveSeqs(all);
  return seq;
};

export const inscribirEnSecuencia = (igUserId: string, trigger: SequenceTrigger): SequenceEnrollment | null => {
  const seq = loadSeqs().find((s) => s.trigger === trigger);
  if (!seq) return null;
  const firstStep = seq.pasos[0];
  if (!firstStep) return null;
  const enrollment: SequenceEnrollment = {
    enrollmentId: newId('enr'),
    sequenceId: seq.id,
    igUserId,
    pasoActual: 0,
    inscritoEn: new Date().toISOString(),
    proximoEnvioEn: new Date(Date.now() + firstStep.esperaSegundos * 1000).toISOString(),
    status: 'activo',
  };
  const all = loadEnroll();
  all.push(enrollment);
  saveEnroll(all);
  return enrollment;
};

export const enrollmentsListos = (): Array<{
  enrollment: SequenceEnrollment;
  paso: NurtureStep;
  sequence: NurtureSequence;
}> => {
  const now = Date.now();
  const enrollments = loadEnroll().filter((e) => e.status === 'activo' && new Date(e.proximoEnvioEn).getTime() <= now);
  const seqs = loadSeqs();
  const out: Array<{
    enrollment: SequenceEnrollment;
    paso: NurtureStep;
    sequence: NurtureSequence;
  }> = [];
  for (const enr of enrollments) {
    const seq = seqs.find((s) => s.id === enr.sequenceId);
    if (!seq) continue;
    const paso = seq.pasos[enr.pasoActual];
    if (!paso) continue;
    out.push({ enrollment: enr, paso, sequence: seq });
  }
  return out;
};

export const avanzarPaso = (enrollmentId: string): SequenceEnrollment | null => {
  const all = loadEnroll();
  const enr = all.find((e) => e.enrollmentId === enrollmentId);
  if (!enr) return null;
  const seq = loadSeqs().find((s) => s.id === enr.sequenceId);
  if (!seq) return null;
  enr.pasoActual += 1;
  if (enr.pasoActual >= seq.pasos.length) {
    enr.status = 'completado';
  } else {
    const next = seq.pasos[enr.pasoActual];
    if (next) enr.proximoEnvioEn = new Date(Date.now() + next.esperaSegundos * 1000).toISOString();
  }
  saveEnroll(all);
  return enr;
};

export const darDeBaja = (enrollmentId: string, motivo: string): SequenceEnrollment | null => {
  const all = loadEnroll();
  const enr = all.find((e) => e.enrollmentId === enrollmentId);
  if (!enr) return null;
  enr.status = 'baja';
  enr.ultimaInteraccion = `${new Date().toISOString()}: ${motivo}`;
  saveEnroll(all);
  return enr;
};

export const listarSecuencias = (): NurtureSequence[] => loadSeqs();
export const listarEnrollments = (status?: SequenceEnrollment['status']): SequenceEnrollment[] =>
  status ? loadEnroll().filter((e) => e.status === status) : loadEnroll();
