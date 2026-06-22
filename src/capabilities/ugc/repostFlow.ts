import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sendDm } from '../../integrations/meta.js';
import { sendAlert } from '../../integrations/notifications.js';
import { log } from '../../agent/logger.js';
import type { UgcDecision } from './detector.js';

export type PermissionStatus = 'no-solicitado' | 'solicitado' | 'aprobado' | 'rechazado' | 'expirado';

export interface UgcRecord {
  id: string;
  autor: string;
  decision: UgcDecision;
  status: PermissionStatus;
  permisoSolicitadoEn?: string;
  permisoRespuestaEn?: string;
  republicadoEn?: string;
  notas: string;
}

const STORE = resolve('data/runtime/ugc.json');

const loadStore = (): UgcRecord[] => {
  if (!existsSync(STORE)) return [];
  return JSON.parse(readFileSync(STORE, 'utf-8')) as UgcRecord[];
};

const saveStore = (records: UgcRecord[]): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
  writeFileSync(STORE, JSON.stringify(records, null, 2), 'utf-8');
};

const newId = (): string => `ugc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const registrarUgc = (decision: UgcDecision): UgcRecord => {
  const records = loadStore();
  const exists = records.find(
    (r) => r.autor === decision.candidato.autor && r.decision.candidato.texto === decision.candidato.texto,
  );
  if (exists) return exists;
  const record: UgcRecord = {
    id: newId(),
    autor: decision.candidato.autor,
    decision,
    status: 'no-solicitado',
    notas: '',
  };
  records.push(record);
  saveStore(records);
  return record;
};

export const solicitarPermiso = async (recordId: string): Promise<{ ok: boolean; error?: string }> => {
  const records = loadStore();
  const record = records.find((r) => r.id === recordId);
  if (!record) return { ok: false, error: 'Record no encontrado' };
  if (record.status !== 'no-solicitado') {
    return { ok: false, error: `status=${record.status}, no se vuelve a pedir permiso` };
  }
  if (!record.decision.borradorMensajePermiso) {
    return { ok: false, error: 'No hay borrador de mensaje de permiso' };
  }
  const dmResult = await sendDm(record.autor, record.decision.borradorMensajePermiso);
  if (!dmResult.ok) {
    return { ok: false, error: dmResult.error ?? 'No se pudo enviar DM' };
  }
  record.status = 'solicitado';
  record.permisoSolicitadoEn = new Date().toISOString();
  saveStore(records);
  log.success(`Permiso UGC solicitado a ${record.autor}`);
  return { ok: true };
};

export const marcarRespuesta = (
  recordId: string,
  status: 'aprobado' | 'rechazado',
  nota?: string,
): UgcRecord | null => {
  const records = loadStore();
  const record = records.find((r) => r.id === recordId);
  if (!record) return null;
  record.status = status;
  record.permisoRespuestaEn = new Date().toISOString();
  if (nota) record.notas = nota;
  saveStore(records);
  return record;
};

export const expirarSolicitudesViejas = (diasUmbral = 7): UgcRecord[] => {
  const records = loadStore();
  const now = Date.now();
  const expirados: UgcRecord[] = [];
  for (const r of records) {
    if (r.status === 'solicitado' && r.permisoSolicitadoEn) {
      const dias = Math.floor((now - new Date(r.permisoSolicitadoEn).getTime()) / 86400_000);
      if (dias >= diasUmbral) {
        r.status = 'expirado';
        expirados.push(r);
      }
    }
  }
  if (expirados.length) saveStore(records);
  return expirados;
};

export const listarPorEstado = (status: PermissionStatus): UgcRecord[] =>
  loadStore().filter((r) => r.status === status);

export const notificarUgcAprobado = async (record: UgcRecord): Promise<void> => {
  await sendAlert({
    severity: 'info',
    title: `UGC aprobado por @${record.autor}`,
    body: `Listo para republicar en formato(s): ${record.decision.formatosSugeridos.join(', ')}\n\n"${record.decision.candidato.texto.slice(0, 200)}"`,
    metadata: { autor: record.autor, prioridad: record.decision.prioridad, id: record.id },
  });
};
