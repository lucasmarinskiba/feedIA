import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import type { CrmRecord } from '../capabilities/inbox/crmSync.js';

const syncToNotion = async (record: CrmRecord): Promise<boolean> => {
  if (!env.crm.apiKey || !env.crm.databaseId) {
    log.warn('Notion no configurado (CRM_API_KEY o CRM_DATABASE_ID faltantes).');
    return false;
  }
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.crm.apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: env.crm.databaseId },
      properties: {
        Name: { title: [{ text: { content: record.remitente } }] },
        Email: record.email ? { email: record.email } : { rich_text: [{ text: { content: '' } }] },
        Score: { number: record.score },
        Source: { select: { name: record.fuente } },
        NextStep: { rich_text: [{ text: { content: record.siguientePaso } }] },
        Notes: { rich_text: [{ text: { content: record.notas } }] },
      },
    }),
  });
  if (!res.ok) {
    log.error(`Notion respondió ${res.status}: ${await res.text()}`);
    return false;
  }
  return true;
};

export const syncLeadToCrm = async (record: CrmRecord): Promise<boolean> => {
  if (env.dryRun) {
    log.info(`[DRY RUN] Sincronizaría lead a CRM (${env.crm.provider}): ${record.remitente}`);
    return true;
  }
  switch (env.crm.provider) {
    case 'notion':
      return syncToNotion(record);
    case 'hubspot':
    case 'salesforce':
      log.warn(`Provider ${env.crm.provider} pendiente de implementación.`);
      return false;
    case 'none':
    default:
      log.warn('CRM_PROVIDER=none. Lead no sincronizado.');
      return false;
  }
};
