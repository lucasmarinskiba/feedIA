import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyzeNicho } from '../strategy/nichoAnalysis.js';
import { planSemana } from '../ops/scheduler.js';
import { briefToPublish, type BriefOutcome } from './briefToPublish.js';
import { exportIcs, type CalendarEvent } from '../../integrations/calendar.js';
import { sendAlert } from '../../integrations/notifications.js';
import { log } from '../../agent/logger.js';
import { getAutonomyLevel } from '../../os/cmoCore.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';
import type { WeeklyPlan } from '../ops/scheduler.js';

export interface WeeklyAutopilotResult {
  plan: WeeklyPlan;
  outcomes: BriefOutcome[];
  icsPath: string;
  pendientesAprobacion: number;
  publicados: number;
}

const isBriefable = (formato: ContentFormat): formato is 'reel' | 'carrusel' =>
  formato === 'reel' || formato === 'carrusel';

export const runWeeklyAutopilot = async (
  brand: BrandProfile,
  options: { dryRunBrief?: boolean; bestHours?: string[] } = {},
): Promise<WeeklyAutopilotResult> => {
  log.step('Autopilot semanal: arranca');

  const ideas = await analyzeNicho(brand);
  const inputIdeas = ideas.ideas.slice(0, 7).map((i) => ({
    idea: i.concepto,
    formatoSugerido: i.formato as ContentFormat,
  }));

  const plan = await planSemana(brand, inputIdeas, options.bestHours);
  log.success(`Plan generado: ${plan.cantidadPosts} posts en ${plan.slots.length} slots`);

  const outcomes: BriefOutcome[] = [];
  for (const slot of plan.slots) {
    if (!isBriefable(slot.formato)) {
      log.info(`Slot ${slot.diaSemana} ${slot.horaLocal} (${slot.formato}) — saltado en autopilot`);
      continue;
    }
    const autonomy = getAutonomyLevel();
    const modoConfianza =
      autonomy === 'fully_autonomous' || (options.dryRunBrief === false && autonomy === 'semi_autonomous');
    const outcome = await briefToPublish(brand, {
      idea: slot.tema,
      formato: slot.formato,
      scheduledAt: slot.isoDateTime,
      requiereAprobacionHumana: options.dryRunBrief ?? !modoConfianza,
      modoConfianza,
    });
    outcomes.push(outcome);
  }

  const events: CalendarEvent[] = plan.slots.map((s, idx) => {
    const start = new Date(s.isoDateTime);
    const end = new Date(start.getTime() + 30 * 60_000);
    return {
      uid: `autopilot-${plan.semanaDel}-${idx}`,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      title: `[IG] ${s.formato} — ${s.tema.slice(0, 60)}`,
      description: `Prioridad: ${s.prioridad}\nRazón: ${s.razon}`,
    };
  });
  const icsPath = exportIcs(`Plan IG ${brand.name} ${plan.semanaDel}`, events);

  mkdirSync(resolve('output'), { recursive: true });
  const trace = resolve(`output/autopilot-${plan.semanaDel}.json`);
  writeFileSync(trace, JSON.stringify({ plan, outcomes }, null, 2), 'utf-8');

  const pendientes = outcomes.filter((o) => o.pendienteAprobacion).length;
  const publicados = outcomes.filter((o) => o.publicacion?.ok).length;

  await sendAlert({
    severity: 'reporte',
    title: `Plan semanal listo (${brand.name})`,
    body: `Semana del ${plan.semanaDel}\n• ${plan.cantidadPosts} posts y ${plan.cantidadStories} stories\n• ${pendientes} esperan tu aprobación\n• ${publicados} publicados/agendados\n• Calendario: ${icsPath}`,
    metadata: {
      slots: plan.slots.length,
      pendientes,
      publicados,
    },
  });

  log.success(`Autopilot completo. Trace: ${trace}`);
  return { plan, outcomes, icsPath, pendientesAprobacion: pendientes, publicados };
};
