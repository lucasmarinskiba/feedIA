/**
 * Outreach Orchestrator
 * ─────────────────────────────────────────────────────────────────────────
 * High-level API the rest of the system uses to fire outreach sequences:
 *
 *   • startSequence — pick template, render placeholders, enqueue to store
 *   • pickWinningVariant — pure A/B winner picker from past performance
 *   • summarizeOutreach — aggregated metrics for dashboards
 *
 * The actual sending of DMs to Meta is left to the integrations layer; this
 * module produces the rendered messages + tracks state.
 */

import {
  OUTREACH_TEMPLATES,
  getOutreachById,
  recommendOutreach,
  renderStep,
  type OutreachTemplate,
  type OutreachTrigger,
} from './templates.js';
import {
  enqueueOutreach,
  computeVariantPerformance,
  listOutreach,
  type OutreachInstance,
  type VariantPerformance,
} from './store.js';

export interface StartSequenceParams {
  /** Direct template id, or omit + provide trigger. */
  templateId?: string;
  trigger?: OutreachTrigger;
  recipientHandle: string;
  /** Values to substitute into {placeholders}. */
  values?: Record<string, string>;
  /** Override variant if not letting the orchestrator pick. */
  variantLabel?: string;
}

export const startSequence = (params: StartSequenceParams): OutreachInstance | null => {
  const fromId = params.templateId ? getOutreachById(params.templateId) : undefined;
  const fromTrigger = params.trigger ? recommendOutreach(params.trigger) : null;
  const template: OutreachTemplate | null = fromId ?? fromTrigger ?? null;
  if (!template) return null;

  // Pick the variant — explicit override, or winning variant from history,
  // or first variant.
  let chosenVariant = template.variants[0];
  if (params.variantLabel) {
    const explicit = template.variants.find((v) => v.label === params.variantLabel);
    if (explicit) chosenVariant = explicit;
  } else if (template.variants.length > 1) {
    const winner = pickWinningVariant(template.id);
    const w = winner ? template.variants.find((v) => v.label === winner.variantLabel) : null;
    if (w) chosenVariant = w;
  }

  if (!chosenVariant) return null;

  const values = params.values ?? {};
  const renderedSteps = chosenVariant.steps.map((s) => ({
    stepNumber: s.step,
    rendered: renderStep(s, values),
  }));

  return enqueueOutreach({
    templateId: template.id,
    variantLabel: chosenVariant.label,
    recipientHandle: params.recipientHandle,
    renderedSteps,
    context: values,
  });
};

/**
 * Pick the variant with the highest observed reply rate for a given template,
 * but only if it has enough sample size to be statistically meaningful.
 * Returns null otherwise (caller should use first variant).
 */
export const pickWinningVariant = (templateId: string, minSampleSize = 10): VariantPerformance | null => {
  const perf = computeVariantPerformance().filter((p) => p.templateId === templateId && p.totalSent >= minSampleSize);
  if (perf.length === 0) return null;
  return perf.slice().sort((a, b) => b.replyRate - a.replyRate)[0]!;
};

export interface OutreachSummary {
  total: number;
  inProgress: number;
  replied: number;
  dropped: number;
  overallReplyRate: number;
  byTemplate: Array<{
    templateId: string;
    name: string;
    sent: number;
    replied: number;
    replyRate: number;
  }>;
  variantPerformance: VariantPerformance[];
}

export const summarizeOutreach = (): OutreachSummary => {
  const all = listOutreach();
  const total = all.length;
  const inProgress = all.filter((i) => i.outcome === 'in-progress').length;
  const replied = all.filter((i) => i.outcome === 'reply').length;
  const dropped = all.filter((i) => i.outcome === 'dropped').length;
  const overallReplyRate = total === 0 ? 0 : +(replied / total).toFixed(3);

  const byTemplate = OUTREACH_TEMPLATES.map((t) => {
    const subset = all.filter((i) => i.templateId === t.id);
    const sent = subset.length;
    const rep = subset.filter((i) => i.outcome === 'reply').length;
    return {
      templateId: t.id,
      name: t.name,
      sent,
      replied: rep,
      replyRate: sent === 0 ? 0 : +(rep / sent).toFixed(3),
    };
  }).filter((row) => row.sent > 0);

  return {
    total,
    inProgress,
    replied,
    dropped,
    overallReplyRate,
    byTemplate,
    variantPerformance: computeVariantPerformance(),
  };
};
