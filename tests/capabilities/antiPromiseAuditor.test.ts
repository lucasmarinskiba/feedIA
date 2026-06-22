/**
 * Tests básicos para Anti-Promise Auditor
 */
import { describe, it, expect } from 'vitest';
import {
  auditContentForEmptyPromises,
  generateSafeRewrite,
} from '../../src/capabilities/antiPromiseAuditor/antiPromiseAuditor.js';

describe('AntiPromiseAuditor', () => {
  it('detecta contenido limpio', () => {
    const clean = auditContentForEmptyPromises('Cómo organizar tu semana con 3 simples hábitos', [
      'Esta técnica me cambió la productividad',
    ]);
    expect(clean.verdict).toBe('clean');
    expect(clean.score).toBeGreaterThanOrEqual(90);
  });

  it('detecta hard promises', () => {
    const hard = auditContentForEmptyPromises(
      'Garantizado al 100% que vas a duplicar tus ventas en 7 días sin esfuerzo',
      ['El secreto que nadie te cuenta'],
    );
    expect(hard.verdict).toBe('hard-promise');
    expect(hard.matches.some((m) => m.severity === 'high')).toBe(true);
  });

  it('detecta soft promises', () => {
    const soft = auditContentForEmptyPromises('El mejor método para cambiar tu vida garantizado', []);
    expect(soft.verdict).toBe('soft-promise');
    expect(soft.matches.some((m) => m.severity === 'medium')).toBe(true);
  });

  it('generateSafeRewrite elimina frases riesgosas', () => {
    const rewrite = generateSafeRewrite('Garantizado al 100% que vas a duplicar tus ventas');
    expect(rewrite.toLowerCase()).not.toContain('garantizado al 100%');
  });
});
