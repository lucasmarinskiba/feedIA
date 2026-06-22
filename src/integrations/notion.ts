/**
 * Notion integration — consulta bases de datos de Notion v1 API.
 * Usa NOTION_API_KEY. En DRY_RUN o sin credenciales devuelve datos simulados.
 */

import { log } from '../agent/logger.js';

export interface NotionQuery {
  databaseId: string;
  filter?: Record<string, unknown>;
}

export interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_API_KEY = process.env['NOTION_API_KEY'] ?? '';
const DRY_RUN = process.env['DRY_RUN'] === 'true';

const buildHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${NOTION_API_KEY}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
});

const mockQuery = (query: NotionQuery): NotionPage[] => {
  log.info(`[Notion] MOCK query database ${query.databaseId}`);
  return [
    {
      id: 'mock-page-1',
      properties: {
        Name: { title: [{ plain_text: 'Cliente Demo' }] },
        Instagram: { rich_text: [{ plain_text: '@cliente_demo' }] },
        Email: { email: 'demo@example.com' },
        Stage: { select: { name: ' prospecto_calido' } },
        'Last Interaction': { date: { start: new Date().toISOString().slice(0, 10) } },
        Notes: { rich_text: [{ plain_text: 'Interesado en servicio premium. Presupuesto $500/mes.' }] },
        Tags: { multi_select: [{ name: 'instagram' }, { name: 'paithon_labs' }] },
      },
    },
  ];
};

export const queryNotionDatabase = async (query: NotionQuery): Promise<NotionPage[]> => {
  if (DRY_RUN || !NOTION_API_KEY) {
    return mockQuery(query);
  }

  try {
    const response = await fetch(`${NOTION_API_BASE}/databases/${query.databaseId}/query`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(query.filter ? { filter: query.filter } : {}),
    });

    if (!response.ok) {
      const text = await response.text();
      log.warn(`[Notion] API error ${response.status}: ${text}`);
      return [];
    }

    const data = (await response.json()) as { results?: Array<{ id: string; properties: Record<string, unknown> }> };
    return (data.results ?? []).map((page) => ({
      id: page.id,
      properties: page.properties,
    }));
  } catch (err) {
    log.warn(`[Notion] Query failed: ${(err as Error).message}`);
    return [];
  }
};
