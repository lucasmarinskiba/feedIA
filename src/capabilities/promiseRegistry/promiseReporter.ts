/**
 * Promise Reporter — genera reportes "Promesa vs Realidad" para clientes.
 */

import type { PromiseContract } from './promiseRegistry.js';
import { getPromiseProjections, type PromiseProjection } from './promiseTracker.js';

export interface PromiseReport {
  generatedAt: string;
  clientName: string;
  summary: {
    active: number;
    onTrack: number;
    atRisk: number;
    breached: number;
    fulfilled: number;
  };
  promises: Array<{
    id: string;
    title: string;
    description: string;
    status: PromiseContract['status'];
    progress: number;
    target: number;
    unit: string;
    deadline: string;
    daysRemaining: number;
    projection: PromiseProjection;
    compensation?: string;
  }>;
}

export const generatePromiseReport = (promises: PromiseContract[]): PromiseReport => {
  const now = new Date().toISOString();

  const active = promises.filter((p) => ['pending', 'active', 'on-track', 'at-risk'].includes(p.status));
  const onTrack = promises.filter((p) => p.status === 'on-track');
  const atRisk = promises.filter((p) => p.status === 'at-risk');
  const breached = promises.filter((p) => p.status === 'breached');
  const fulfilled = promises.filter((p) => p.status === 'fulfilled');

  return {
    generatedAt: now,
    clientName: promises[0]?.clientName ?? 'Cliente',
    summary: {
      active: active.length,
      onTrack: onTrack.length,
      atRisk: atRisk.length,
      breached: breached.length,
      fulfilled: fulfilled.length,
    },
    promises: promises.map((p) => {
      const projection = getPromiseProjections(p);
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        progress: p.progress,
        target: p.metric.target,
        unit: p.metric.unit,
        deadline: p.deadline,
        daysRemaining: projection.daysRemaining,
        projection,
        compensation: p.status === 'breached' ? p.compensation.description : undefined,
      };
    }),
  };
};

export const promiseReportToMarkdown = (report: PromiseReport): string => {
  const lines: string[] = [];
  lines.push(`# 📜 Reporte de Promesas — ${report.clientName}`);
  lines.push(`_Generado: ${new Date(report.generatedAt).toLocaleDateString('es-AR')}_`);
  lines.push('');

  lines.push('## Resumen');
  lines.push(`- ✅ Cumplidas: ${report.summary.fulfilled}`);
  lines.push(`- 🟢 En curso (saludables): ${report.summary.onTrack}`);
  lines.push(`- 🟡 En riesgo: ${report.summary.atRisk}`);
  lines.push(`- 🔴 Incumplidas: ${report.summary.breached}`);
  lines.push('');

  if (report.promises.length === 0) {
    lines.push('No hay promesas registradas.');
    return lines.join('\n');
  }

  for (const p of report.promises) {
    const emoji =
      p.status === 'fulfilled'
        ? '🏆'
        : p.status === 'on-track'
          ? '🟢'
          : p.status === 'at-risk'
            ? '🟡'
            : p.status === 'breached'
              ? '🔴'
              : '⏳';

    lines.push(`## ${emoji} ${p.title}`);
    lines.push(`**Descripción:** ${p.description}`);
    lines.push(`**Progreso:** ${p.progress}% de ${p.target} ${p.unit}`);
    lines.push(
      `**Proyección:** ${p.projection.projectedValue} ${p.unit} (${p.projection.projectedProgress}%) al vencimiento`,
    );
    lines.push(`**Días restantes:** ${p.daysRemaining}`);
    lines.push(`**Riesgo:** ${p.projection.riskScore}/100`);
    if (p.compensation) {
      lines.push(`**Compensación:** ${p.compensation}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('_Este reporte es generado automáticamente por el sistema de accountability. Sin filtros, sin excusas._');
  return lines.join('\n');
};
