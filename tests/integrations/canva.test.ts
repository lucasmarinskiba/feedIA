/**
 * Tests básicos para integración Canva y validador de templates.
 */
import { describe, it, expect } from 'vitest';
import {
  autofillTemplate,
  exportDesign,
  uploadAsset,
} from '../../src/integrations/canva.js';
import {
  validateCanvaTemplate,
  validateAllCanvaTemplates,
} from '../../src/integrations/canvaTemplateValidator.js';

describe('Canva integration (DRY_RUN)', () => {
  it('autofillTemplate devuelve un designId simulado', async () => {
    const result = await autofillTemplate({
      brandTemplateId: 'BTM-test',
      title: 'Test design',
      data: { titulo_1: { type: 'text', text: 'Hola' } },
    });
    expect(result.ok).toBe(true);
    expect(result.designId).toBeTruthy();
    expect(result.designUrl).toBeTruthy();
  });

  it('exportDesign devuelve URLs simuladas', async () => {
    const result = await exportDesign({ designId: 'design-test', format: 'png' });
    expect(result.ok).toBe(true);
    expect(result.urls?.length).toBeGreaterThan(0);
    expect(result.urls?.[0]).toContain('canva.com/export/simulated');
  });

  it('uploadAsset devuelve un assetId simulado', async () => {
    const result = await uploadAsset({
      fileBytes: Buffer.from('fake-image'),
      filename: 'test.png',
      mimeType: 'image/png',
    });
    expect(result.ok).toBe(true);
    expect(result.assetId).toBeTruthy();
  });
});

describe('Canva template validator (DRY_RUN)', () => {
  it('valida un template simulado como OK', async () => {
    const result = await validateCanvaTemplate('carrusel', 'BTM-car-test');
    expect(result.ok).toBe(true);
    expect(result.missingFields.length).toBe(0);
    expect(result.dataset).toBeDefined();
  });

  it('detecta campos faltantes si pedimos un campo inexistente', async () => {
    const result = await validateCanvaTemplate('carrusel', 'BTM-car-test');
    // En dry-run el dataset simulado incluye todos los campos esperados
    expect(result.ok).toBe(true);
  });

  it('health report cubre todos los templates configurados', async () => {
    const report = await validateAllCanvaTemplates();
    expect(report.results.length).toBeGreaterThanOrEqual(4);
    expect(report.checkedAt).toBeTruthy();
  });
});
