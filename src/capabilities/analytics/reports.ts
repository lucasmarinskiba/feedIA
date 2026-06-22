import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import { sendAlert } from '../../integrations/notifications.js';
import type { BrandProfile } from '../../config/types.js';
import type { PerformanceSnapshot } from './insights.js';

export interface WeeklyReport {
  resumenEjecutivo: string;
  victorias: string[];
  patronesPositivos: string[];
  patronesNegativos: string[];
  hipotesisPorRevisar: string[];
  experimentosSemanaProx: Array<{ idea: string; metricaObjetivo: string; razon: string }>;
  alertasOperativas: string[];
}

export const generateWeeklyReport = async (
  brand: BrandProfile,
  snapshot: PerformanceSnapshot,
  alertasDetectadas: string[],
): Promise<WeeklyReport> => {
  const prompt = `Actuá como analista de performance de Instagram. Generá un reporte semanal accionable, no un PDF lleno de cifras.

${brandContext(brand)}

VENTANA: ${snapshot.ventana.desde} → ${snapshot.ventana.hasta}
POSTS ANALIZADOS: ${snapshot.posts.length}
BENCHMARKS PROMEDIO:
${JSON.stringify(snapshot.benchmarks, null, 2)}

TOP 5 (por saves+shares+comments):
${
  snapshot.topPerformers
    .map(
      (p) =>
        `- ${p.postId} (${p.format}, ${p.publishedAt.split('T')[0]}): saves=${p.metrics.saves} shares=${p.metrics.shares} comments=${p.metrics.comments}`,
    )
    .join('\n') || '(sin datos)'
}

BAJO RENDIMIENTO:
${
  snapshot.bajoRendimiento
    .map((p) => `- ${p.postId} (${p.format}): saves=${p.metrics.saves} shares=${p.metrics.shares}`)
    .join('\n') || '(sin datos)'
}

CUENTA:
${snapshot.cuenta ? JSON.stringify(snapshot.cuenta, null, 2) : '(sin datos)'}

ALERTAS DETECTADAS:
${alertasDetectadas.map((a) => `- ${a}`).join('\n') || '(ninguna)'}

Reglas:
- Resumen ejecutivo: 3-4 líneas máximo. Una persona ocupada lo tiene que entender en 20 segundos.
- Victorias: lo que se demuestra con datos, no opiniones.
- Patrones positivos: qué hacer más.
- Patrones negativos: qué dejar de hacer (con cuidado, no descartar formato entero por 1 mal post).
- Experimentos: 2-4 ideas concretas para la semana próxima con métrica objetivo.

JSON:
{
  "resumenEjecutivo": "...",
  "victorias": ["..."],
  "patronesPositivos": ["..."],
  "patronesNegativos": ["..."],
  "hipotesisPorRevisar": ["..."],
  "experimentosSemanaProx": [
    { "idea": "...", "metricaObjetivo": "ej: saves > 200 en 48h", "razon": "..." }
  ],
  "alertasOperativas": ["..."]
}`;
  const report = await askJson<WeeklyReport>(prompt, { maxTokens: 4000 });
  return report;
};

export const sendWeeklyReportAlert = async (
  brand: BrandProfile,
  report: WeeklyReport,
  snapshot: PerformanceSnapshot,
): Promise<void> => {
  const body = [
    `*${brand.name}* — semana ${snapshot.ventana.desde.split('T')[0]} a ${snapshot.ventana.hasta.split('T')[0]}`,
    '',
    report.resumenEjecutivo,
    '',
    `*Victorias*\n${report.victorias.map((v) => `• ${v}`).join('\n')}`,
    '',
    `*Experimentos próximos*\n${report.experimentosSemanaProx
      .map((e) => `• ${e.idea} → ${e.metricaObjetivo}`)
      .join('\n')}`,
  ].join('\n');
  await sendAlert({
    severity: 'reporte',
    title: 'Reporte semanal IG',
    body,
    metadata: {
      posts: snapshot.posts.length,
      followersDelta: snapshot.cuenta?.followersDelta ?? 'N/A',
      alertas: report.alertasOperativas.length,
    },
  });
};
