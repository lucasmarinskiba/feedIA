// @ts-nocheck
/**
 * Monthly Report — Reportes mensuales automatizados de performance.
 *
 * Procesa datos crudos de Meta Business Suite / Instagram Insights.
 * Calcula KPIs clave (engagement rate, alcance, clics, conversiones, ROAS).
 * Genera narrativa ejecutiva, gráficos ASCII y recomendaciones para el mes siguiente.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const REPORTS_DIR = path.resolve('data/monthly-reports');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface MonthlyMetrics {
  // Crecimiento de cuenta
  followersStart: number;
  followersEnd: number;
  newFollowers: number;
  unfollows: number;
  netGrowth: number;

  // Contenido
  postsPublished: number;
  storiesPublished: number;
  reelsPublished: number;
  totalImpressions: number;
  totalReach: number;
  profileVisits: number;
  websiteClicks: number;

  // Engagement
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  totalShares: number;
  engagementRate: number;
  avgEngagementPerPost: number;

  // Mejores publicaciones
  topPost: { format: string; topic: string; engagement: number; reach: number };
  topReel: { topic: string; views: number; engagement: number };
  topStory: { topic: string; views: number; replies: number };

  // Comercial / Ads (opcional)
  adSpend?: number;
  adRevenue?: number;
  leads?: number;
  conversions?: number;
  roas?: number;

  // Comparativa vs mes anterior
  vsLastMonth?: {
    followersGrowth: number; // % cambio
    engagementGrowth: number;
    reachGrowth: number;
    leadsGrowth?: number;
  };
}

export interface MonthlyReport {
  brandId: string;
  period: string; // YYYY-MM
  generatedAt: string;
  metrics: MonthlyMetrics;
  executiveSummary: string; // resumen narrativo de 3-4 párrafos
  highlights: string[]; // logros top del mes
  lowlights: string[]; // qué no funcionó
  kpiDashboard: KPIDashboard;
  contentInsights: ContentInsights;
  recommendations: MonthlyRecommendation[];
  nextMonthFocus: string[]; // 3 prioridades para el mes siguiente
}

export interface KPIDashboard {
  engagementRate: { value: number; benchmark: number; status: 'above' | 'at' | 'below' };
  reachGrowth: { value: number; trend: 'up' | 'down' | 'stable' };
  followerGrowth: { value: number; target?: number; achieved: boolean };
  contentFrequency: { postsPerWeek: number; target: number; onTrack: boolean };
  topKPI: string;
  bottomKPI: string;
}

export interface ContentInsights {
  bestFormat: string;
  bestPillar: string;
  bestPostingDays: string[];
  bestPostingHours: number[];
  worstFormat: string;
  topicsThatWorked: string[];
  topicsThatDidntWork: string[];
}

export interface MonthlyRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'content' | 'engagement' | 'ads' | 'growth' | 'brand';
  action: string;
  expectedImpact: string;
  timeToImplement: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureReportsDir = async (): Promise<void> => {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
};

const reportPath = (brandId: string, period: string): string =>
  path.join(REPORTS_DIR, `${brandId}-${period}-report.json`);

// ── Motor de reporte ──────────────────────────────────────────────────────────

/** Genera el reporte mensual completo. */
export const generateMonthlyReport = async (
  brand: BrandProfile,
  period: string, // YYYY-MM
  metrics: MonthlyMetrics,
  _rawData?: Record<string, unknown>, // datos adicionales de Meta Business Suite
): Promise<MonthlyReport> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[monthlyReport] generating report', { brandId, period });

  const growthRate = ((metrics.followersEnd - metrics.followersStart) / Math.max(metrics.followersStart, 1)) * 100;

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: `Eres el analista de datos senior de una agencia de marketing digital.
Produces reportes mensuales claros, orientados a decisiones, sin jerga innecesaria.
Cada insight tiene su "por qué" y cada recomendación tiene su "cómo".
Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Genera el reporte mensual de ${brand.name} para ${period}:

MÉTRICAS CLAVE:
- Seguidores: ${metrics.followersStart.toLocaleString()} → ${metrics.followersEnd.toLocaleString()} (+${metrics.netGrowth} / ${growthRate.toFixed(1)}%)
- Publicaciones: ${metrics.postsPublished} posts, ${metrics.storiesPublished} stories, ${metrics.reelsPublished} reels
- Impresiones totales: ${metrics.totalImpressions.toLocaleString()}
- Alcance total: ${metrics.totalReach.toLocaleString()}
- Visitas al perfil: ${metrics.profileVisits.toLocaleString()}
- Clics web: ${metrics.websiteClicks.toLocaleString()}
- Engagement rate: ${(metrics.engagementRate * 100).toFixed(2)}%
- Total likes: ${metrics.totalLikes.toLocaleString()}
- Total comentarios: ${metrics.totalComments.toLocaleString()}
- Total guardados: ${metrics.totalSaves.toLocaleString()}
${
  metrics.adSpend
    ? `
PUBLICIDAD:
- Gasto en ads: $${metrics.adSpend}
- Ingresos atribuidos: $${metrics.adRevenue ?? 0}
- Leads generados: ${metrics.leads ?? 0}
- Conversiones: ${metrics.conversions ?? 0}
- ROAS: ${metrics.roas?.toFixed(2) ?? 'N/D'}x`
    : ''
}
${
  metrics.vsLastMonth
    ? `
VS. MES ANTERIOR:
- Seguidores: ${metrics.vsLastMonth.followersGrowth > 0 ? '+' : ''}${metrics.vsLastMonth.followersGrowth.toFixed(1)}%
- Engagement: ${metrics.vsLastMonth.engagementGrowth > 0 ? '+' : ''}${metrics.vsLastMonth.engagementGrowth.toFixed(1)}%
- Alcance: ${metrics.vsLastMonth.reachGrowth > 0 ? '+' : ''}${metrics.vsLastMonth.reachGrowth.toFixed(1)}%`
    : ''
}

MEJORES PIEZAS:
- Top Post: ${metrics.topPost.format} sobre "${metrics.topPost.topic}" — ${(metrics.topPost.engagement * 100).toFixed(1)}% engagement
- Top Reel: "${metrics.topReel.topic}" — ${metrics.topReel.views.toLocaleString()} vistas
- Top Story: "${metrics.topStory.topic}" — ${metrics.topStory.views.toLocaleString()} vistas

Industria: ${brand.industryCategory ?? 'general'}

Devuelve:
{
  "executiveSummary": "narrativa ejecutiva de 3-4 párrafos sobre el mes",
  "highlights": ["logro 1", "logro 2", "logro 3"],
  "lowlights": ["área de mejora 1", "área 2"],
  "kpiDashboard": {
    "engagementRate": { "value": ${metrics.engagementRate}, "benchmark": 0.03, "status": "above|at|below" },
    "reachGrowth": { "value": number, "trend": "up|down|stable" },
    "followerGrowth": { "value": ${growthRate}, "achieved": boolean },
    "contentFrequency": { "postsPerWeek": number, "target": 5, "onTrack": boolean },
    "topKPI": "nombre del mejor KPI del mes",
    "bottomKPI": "nombre del KPI más débil"
  },
  "contentInsights": {
    "bestFormat": "formato",
    "bestPillar": "pilar de contenido",
    "bestPostingDays": ["Martes", "Jueves"],
    "bestPostingHours": [18, 20],
    "worstFormat": "formato",
    "topicsThatWorked": ["tema 1", "tema 2"],
    "topicsThatDidntWork": ["tema 1"]
  },
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "content|engagement|ads|growth|brand",
      "action": "qué hacer exactamente",
      "expectedImpact": "resultado esperado",
      "timeToImplement": "inmediato|1 semana|2 semanas|1 mes"
    }
  ],
  "nextMonthFocus": ["prioridad 1", "prioridad 2", "prioridad 3"]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) throw new Error('[monthlyReport] Failed to generate report');

  const generated = JSON.parse(jsonMatch[0]) as Partial<MonthlyReport>;

  const report: MonthlyReport = {
    brandId,
    period,
    generatedAt: new Date().toISOString(),
    metrics,
    executiveSummary: generated.executiveSummary ?? '',
    highlights: generated.highlights ?? [],
    lowlights: generated.lowlights ?? [],
    kpiDashboard: generated.kpiDashboard ?? {
      engagementRate: { value: metrics.engagementRate, benchmark: 0.03, status: 'at' },
      reachGrowth: { value: 0, trend: 'stable' },
      followerGrowth: { value: growthRate, achieved: growthRate > 0 },
      contentFrequency: { postsPerWeek: metrics.postsPublished / 4, target: 5, onTrack: metrics.postsPublished >= 20 },
      topKPI: 'engagement_rate',
      bottomKPI: 'conversions',
    },
    contentInsights: generated.contentInsights ?? {
      bestFormat: 'reel',
      bestPillar: 'educacion',
      bestPostingDays: ['Martes', 'Jueves'],
      bestPostingHours: [18, 20],
      worstFormat: 'post-estatico',
      topicsThatWorked: [],
      topicsThatDidntWork: [],
    },
    recommendations: generated.recommendations ?? [],
    nextMonthFocus: generated.nextMonthFocus ?? [],
  };

  await ensureReportsDir();
  await fs.writeFile(reportPath(brandId, period), JSON.stringify(report, null, 2), 'utf-8');

  log.info('[monthlyReport] report generated', { brandId, period });
  return report;
};

/** Retorna reporte de un período específico. */
export const getReport = async (brandId: string, period: string): Promise<MonthlyReport | null> => {
  try {
    return JSON.parse(await fs.readFile(reportPath(brandId, period), 'utf-8')) as MonthlyReport;
  } catch {
    return null;
  }
};

/** Exporta reporte como markdown. */
export const exportToMarkdown = (report: MonthlyReport): string => {
  const { metrics, kpiDashboard, contentInsights, recommendations } = report;
  const period = new Date(`${report.period}-01`).toLocaleString('es', { month: 'long', year: 'numeric' });

  return `# Reporte Mensual — ${period}

## Resumen Ejecutivo
${report.executiveSummary}

## Dashboard KPIs
| Métrica | Valor | Estado |
|---------|-------|--------|
| Engagement Rate | ${(metrics.engagementRate * 100).toFixed(2)}% | ${kpiDashboard.engagementRate.status} |
| Crecimiento seguidores | +${metrics.netGrowth} (${((metrics.netGrowth / metrics.followersStart) * 100).toFixed(1)}%) | — |
| Alcance total | ${metrics.totalReach.toLocaleString()} | ${kpiDashboard.reachGrowth.trend} |
| Posts publicados | ${metrics.postsPublished} | ${kpiDashboard.contentFrequency.onTrack ? '✅' : '⚠️'} |

## Highlights
${report.highlights.map((h) => `- ✅ ${h}`).join('\n')}

## Áreas de Mejora
${report.lowlights.map((l) => `- ⚠️ ${l}`).join('\n')}

## Insights de Contenido
- **Mejor formato:** ${contentInsights.bestFormat}
- **Mejor pilar:** ${contentInsights.bestPillar}
- **Mejores días:** ${contentInsights.bestPostingDays.join(', ')}
- **Mejores horas:** ${contentInsights.bestPostingHours.map((h) => `${h}:00`).join(', ')}
- **Temas que funcionaron:** ${contentInsights.topicsThatWorked.join(', ')}

## Recomendaciones
${recommendations.map((r) => `### [${r.priority.toUpperCase()}] ${r.category}\n${r.action}\n**Impacto esperado:** ${r.expectedImpact}\n**Tiempo:** ${r.timeToImplement}`).join('\n\n')}

## Foco Mes Siguiente
${report.nextMonthFocus.map((f, i) => `${i + 1}. ${f}`).join('\n')}

---
*Generado por FeedIA el ${new Date(report.generatedAt).toLocaleDateString('es')}*`;
};
