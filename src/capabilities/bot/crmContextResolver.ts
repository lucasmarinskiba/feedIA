/**
 * CRM Context Resolver — enriquece respuestas del bot con datos reales del CRM.
 *
 * Soporta Notion (implementado) y deja stubs para HubSpot/Salesforce.
 */

import { z } from 'zod';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';

export const CRMContactSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  handle: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  stage: z.string().optional(),
  lastInteraction: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string()).default({}),
});

export type CRMContact = z.infer<typeof CRMContactSchema>;

export interface CRMContextResult {
  found: boolean;
  contact?: CRMContact;
  context: string;
}

// Stub para HubSpot/Salesforce
const fetchFromHubSpot = async (_identifier: string): Promise<CRMContact | null> => {
  // TODO: implementar integración HubSpot
  return null;
};

const fetchFromNotion = async (identifier: string): Promise<CRMContact | null> => {
  if (!env.crm?.provider || env.crm.provider !== 'notion' || !env.crm.apiKey) {
    return null;
  }

  try {
    const { queryNotionDatabase } = await import('../../integrations/notion.js');
    const results = await queryNotionDatabase({
      databaseId: env.crm.databaseId ?? '',
      filter: {
        or: [
          { property: 'Instagram', rich_text: { contains: identifier } },
          { property: 'Name', title: { contains: identifier } },
        ],
      },
    });

    if (!results.length) return null;

    const page = results[0]!;
    const props = page.properties as Record<string, Record<string, unknown>>;

    const getPlainText = (key: string): string | undefined => {
      const prop = props[key];
      const title = prop?.title as Array<{ plain_text?: string }> | undefined;
      const richText = prop?.rich_text as Array<{ plain_text?: string }> | undefined;
      return title?.[0]?.plain_text ?? richText?.[0]?.plain_text;
    };

    const getSelect = (key: string): string | undefined => {
      const select = props[key]?.select as { name?: string } | undefined;
      return select?.name;
    };

    const getDate = (key: string): string | undefined => {
      const date = props[key]?.date as { start?: string } | undefined;
      return date?.start;
    };

    const getMultiSelect = (key: string): string[] => {
      const ms = props[key]?.multi_select as Array<{ name?: string }> | undefined;
      return ms?.map((t) => t.name ?? '').filter(Boolean) ?? [];
    };

    const getEmail = (key: string): string | undefined => {
      return (props[key]?.email as string | undefined) ?? undefined;
    };

    return CRMContactSchema.parse({
      id: page.id,
      name: getPlainText('Name') ?? identifier,
      handle: getPlainText('Instagram') ?? identifier,
      email: getEmail('Email'),
      stage: getSelect('Stage'),
      lastInteraction: getDate('Last Interaction'),
      notes: getPlainText('Notes'),
      tags: getMultiSelect('Tags'),
      customFields: {},
    });
  } catch (err) {
    log.warn(`[CRMContextResolver] Error Notion: ${(err as Error).message}`);
    return null;
  }
};

export const resolveCRMContext = async (identifier: string): Promise<CRMContextResult> => {
  if (!identifier) return { found: false, context: '' };

  let contact: CRMContact | null = null;

  if (env.crm?.provider === 'notion') {
    contact = await fetchFromNotion(identifier);
  } else if (env.crm?.provider === 'hubspot') {
    contact = await fetchFromHubSpot(identifier);
  }

  if (!contact) {
    return { found: false, context: '' };
  }

  const lines: string[] = [];
  lines.push(`CRM: contacto encontrado`);
  if (contact.name) lines.push(`Nombre: ${contact.name}`);
  if (contact.stage) lines.push(`Etapa: ${contact.stage}`);
  if (contact.lastInteraction) lines.push(`Última interacción: ${contact.lastInteraction}`);
  if (contact.notes) lines.push(`Notas: ${contact.notes}`);
  if (contact.tags.length > 0) lines.push(`Tags: ${contact.tags.join(', ')}`);
  if (Object.keys(contact.customFields).length > 0) {
    lines.push(
      `Campos: ${Object.entries(contact.customFields)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
    );
  }

  return {
    found: true,
    contact,
    context: lines.join('\n'),
  };
};
