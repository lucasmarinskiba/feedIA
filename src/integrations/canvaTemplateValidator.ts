/**
 * Canva Template Validator — verifica que los Brand Templates configurados
 * existan y contengan los campos de autofill que FeedIA espera.
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { getCanvaAccessToken } from './canva.js';

const CANVA_API = 'https://api.canva.com/rest/v1';

export interface CanvaTemplateDataset {
  [fieldName: string]: { type: 'text' | 'image' | 'chart' };
}

export interface TemplateValidationResult {
  ok: boolean;
  templateId: string;
  name: string;
  missingFields: string[];
  unexpectedFields?: string[];
  dataset?: CanvaTemplateDataset;
  error?: string;
}

export interface TemplateHealthReport {
  ok: boolean;
  checkedAt: string;
  results: TemplateValidationResult[];
}

export type TemplateFormat = 'carrusel' | 'reel' | 'historia' | 'postImagen';

const TEMPLATE_REQUIRED_FIELDS: Record<TemplateFormat, string[]> = {
  carrusel: ['hashtags'],
  reel: ['hook_visual', 'cta', 'audio_sugerido'],
  historia: [],
  postImagen: ['post_headline', 'post_body', 'post_cta'],
};

const buildDynamicRequiredFields = (format: TemplateFormat): string[] => {
  const base = [...TEMPLATE_REQUIRED_FIELDS[format]];
  if (format === 'carrusel') {
    for (let i = 1; i <= 10; i += 1) {
      base.push(`titulo_${i}`, `cuerpo_${i}`);
    }
  }
  if (format === 'reel') {
    for (let i = 1; i <= 8; i += 1) {
      base.push(`texto_pantalla_${i}`, `broll_${i}`);
    }
  }
  if (format === 'historia') {
    for (let i = 1; i <= 5; i += 1) {
      base.push(`story_${i}`);
    }
  }
  return base;
};

export const getBrandTemplateDataset = async (
  templateId: string,
  userHandle?: string,
): Promise<{ ok: boolean; dataset?: CanvaTemplateDataset; error?: string }> => {
  if (env.dryRun) {
    // Simulamos un dataset completo para facilitar pruebas
    const simulated: CanvaTemplateDataset = {};
    const allFields = buildDynamicRequiredFields('carrusel')
      .concat(buildDynamicRequiredFields('reel'))
      .concat(buildDynamicRequiredFields('historia'))
      .concat(buildDynamicRequiredFields('postImagen'));
    for (const field of [...new Set(allFields)]) {
      simulated[field] = { type: field.startsWith('broll') ? 'image' : 'text' };
    }
    return { ok: true, dataset: simulated };
  }

  const token = await getCanvaAccessToken(userHandle);
  if (!token) return { ok: false, error: 'Canva no configurado' };

  try {
    const res = await fetch(`${CANVA_API}/brand-templates/${encodeURIComponent(templateId)}/dataset`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Canva dataset ${res.status}: ${body.slice(0, 200)}` };
    }
    const json = (await res.json()) as { dataset?: CanvaTemplateDataset };
    return { ok: true, dataset: json.dataset ?? {} };
  } catch (err) {
    return { ok: false, error: `Network error: ${(err as Error).message}` };
  }
};

export const validateCanvaTemplate = async (
  format: TemplateFormat,
  templateId: string,
  userHandle?: string,
): Promise<TemplateValidationResult> => {
  const required = buildDynamicRequiredFields(format);
  const datasetResult = await getBrandTemplateDataset(templateId, userHandle);
  if (!datasetResult.ok || !datasetResult.dataset) {
    return {
      ok: false,
      templateId,
      name: format,
      missingFields: required,
      error: datasetResult.error,
    };
  }

  const dataset = datasetResult.dataset;
  const missingFields = required.filter((f) => !dataset[f]);
  const unexpectedFields = Object.keys(dataset).filter((f) => !required.includes(f) && !f.startsWith('__'));

  if (missingFields.length > 0) {
    log.warn(`[CanvaValidator] Template ${format} (${templateId}) missing fields: ${missingFields.join(', ')}`);
  }

  return {
    ok: missingFields.length === 0,
    templateId,
    name: format,
    missingFields,
    unexpectedFields,
    dataset,
  };
};

export const validateAllCanvaTemplates = async (userHandle?: string): Promise<TemplateHealthReport> => {
  const templates: { format: TemplateFormat; id: string | undefined }[] = [
    { format: 'carrusel', id: env.canva.templates.carrusel },
    { format: 'reel', id: env.canva.templates.reel },
    { format: 'historia', id: env.canva.templates.historia },
    { format: 'postImagen', id: env.canva.templates.postImagen },
  ];

  const results: TemplateValidationResult[] = [];
  for (const { format, id } of templates) {
    if (!id) {
      results.push({
        ok: false,
        templateId: '(no configurado)',
        name: format,
        missingFields: buildDynamicRequiredFields(format),
        error: `CANVA_TEMPLATE_${format.toUpperCase()} no definido`,
      });
      continue;
    }
    results.push(await validateCanvaTemplate(format, id, userHandle));
  }

  const ok = results.every((r) => r.ok);
  return { ok, checkedAt: new Date().toISOString(), results };
};

export const logTemplateHealthReport = (report: TemplateHealthReport): void => {
  const status = report.ok ? '✅ OK' : '⚠️ FALTAN CAMPOS';
  log.info(`[CanvaValidator] Health check ${status} (${report.checkedAt})`);
  for (const r of report.results) {
    log.info(`  ${r.name}: ${r.ok ? 'OK' : 'FAIL'} — ${r.templateId}`);
    if (r.missingFields.length) log.info(`    missing: ${r.missingFields.join(', ')}`);
    if (r.error) log.info(`    error: ${r.error}`);
  }
};
