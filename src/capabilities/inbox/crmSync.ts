import { syncLeadToCrm } from '../../integrations/crm.js';
import { log } from '../../agent/logger.js';
import type { LeadQualification } from './leads.js';

export interface CrmRecord {
  remitente: string;
  email?: string;
  telefono?: string;
  fuente: 'instagram-dm';
  score: number;
  notas: string;
  siguientePaso: string;
  capturadoEn: string;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;

export const extractContactData = (texto: string): { email?: string; telefono?: string } => {
  const result: { email?: string; telefono?: string } = {};
  const email = texto.match(EMAIL_RE)?.[0];
  const phone = texto.match(PHONE_RE)?.[0];
  if (email) result.email = email;
  if (phone) result.telefono = phone.replace(/\s+/g, ' ').trim();
  return result;
};

export const pushLeadToCrm = async (qualification: LeadQualification, rawTextHistorial: string): Promise<CrmRecord> => {
  const contact = extractContactData(rawTextHistorial);
  const record: CrmRecord = {
    remitente: qualification.remitente,
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.telefono ? { telefono: contact.telefono } : {}),
    fuente: 'instagram-dm',
    score: qualification.scoreInicial,
    notas: qualification.razonScore,
    siguientePaso: qualification.siguientePaso,
    capturadoEn: new Date().toISOString(),
  };
  log.info(`Sincronizando lead ${qualification.remitente} (score ${qualification.scoreInicial})`);
  await syncLeadToCrm(record);
  return record;
};
