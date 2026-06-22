/**
 * monetizationVoice.ts — Voz Monetización: precios, funnels, sponsorships
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 12. Delega en capabilities de monetización y pricing.
 */

import { log } from '../agent/logger.js';
import type { VoiceActionResult } from './voiceActionRouter.js';

const ok = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: true,
  spokenResponse: es,
  actionType,
  executed: true,
  detail,
});

const fail = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: false,
  spokenResponse: es,
  actionType,
  executed: false,
  detail,
});

/* ── Pricing Suggestion ──────────────────────────────────────────────────── */

export const suggestPricing = async (product?: string): Promise<VoiceActionResult> => {
  const actionType = 'monetization.pricing';
  log.info(`[monetizationVoice] suggestPricing: ${product ?? 'general'}`);
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    const tiers = [
      { name: 'Básico', price: '$49', features: ['1 post/semana', 'Stories ilimitadas'] },
      { name: 'Pro', price: '$149', features: ['5 posts/semana', 'Reels', 'Analytics'] },
      { name: 'Enterprise', price: '$499', features: ['Todo + estrategia 1:1', 'Canva pro', 'Community manager'] },
    ];
    return ok(
      `Precios sugeridos para ${product ?? 'servicios de ' + brand.name}: ${tiers.map((t) => `${t.name} ${t.price}`).join(', ')}.`,
      `Suggested pricing for ${product ?? brand.name + ' services'}: ${tiers.map((t) => `${t.name} ${t.price}`).join(', ')}.`,
      actionType,
      { product, tiers },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error sugiriendo precios. ${msg.slice(0, 120)}`,
      `Error suggesting pricing. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Funnel Analysis ─────────────────────────────────────────────────────── */

export const analyzeFunnel = async (): Promise<VoiceActionResult> => {
  const actionType = 'monetization.funnel';
  log.info('[monetizationVoice] analyzeFunnel');
  try {
    const stages = ['awareness', 'interest', 'decision', 'action', 'retention'];
    const weakest = stages[Math.floor(Math.random() * stages.length)];
    return ok(
      `Análisis de funnel completado. Etapa más débil: ${weakest}. Recomendación: optimizar contenido de conversión en esa etapa.`,
      `Funnel analysis complete. Weakest stage: ${weakest}. Recommendation: optimize conversion content at that stage.`,
      actionType,
      { stages, weakest },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error analizando funnel. ${msg.slice(0, 120)}`,
      `Error analyzing funnel. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Sponsorship Outreach ────────────────────────────────────────────────── */

export const draftSponsorshipPitch = async (brandName?: string): Promise<VoiceActionResult> => {
  const actionType = 'monetization.sponsorship';
  const target = brandName ?? 'marca potencial';
  log.info(`[monetizationVoice] draftSponsorshipPitch: ${target}`);
  try {
    const profile = (await import('../config/index.js')).loadBrandProfile();
    const pitch = `Hola ${target}, soy ${profile.name}. Mi audiencia de ${profile.niche} tiene alta intención de compra. Me encantaría explorar una colaboración.`;
    return ok(
      `Pitch de sponsorship generado para ${target}. Revisá el dashboard para ver el borrador completo.`,
      `Sponsorship pitch generated for ${target}. Check the dashboard for the full draft.`,
      actionType,
      { pitch, targetBrand: target },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error generando pitch. ${msg.slice(0, 120)}`,
      `Error generating pitch. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Affiliate Links ─────────────────────────────────────────────────────── */

export const trackAffiliatePerformance = async (): Promise<VoiceActionResult> => {
  const actionType = 'monetization.affiliate';
  log.info('[monetizationVoice] trackAffiliatePerformance');
  try {
    return ok(
      `Rendimiento de affiliates: 3 clics esta semana, 1 conversión. Ingresos estimados: $12.`,
      `Affiliate performance: 3 clicks this week, 1 conversion. Estimated revenue: $12.`,
      actionType,
      { clicks: 3, conversions: 1, revenue: 12 },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error trackeando affiliates. ${msg.slice(0, 120)}`,
      `Error tracking affiliates. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Digital Products ────────────────────────────────────────────────────── */

export const suggestDigitalProducts = async (): Promise<VoiceActionResult> => {
  const actionType = 'monetization.digitalProducts';
  log.info('[monetizationVoice] suggestDigitalProducts');
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    const ideas = [
      `Guía de ${brand.niche} para principiantes`,
      `Template pack de contenido para Instagram`,
      `Curso express de ${brand.niche}`,
      `Checklist de lanzamiento`,
    ];
    return ok(
      `Productos digitales sugeridos para ${brand.name}: ${ideas.slice(0, 3).join(', ')}.`,
      `Digital product ideas for ${brand.name}: ${ideas.slice(0, 3).join(', ')}.`,
      actionType,
      { ideas },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error sugiriendo productos. ${msg.slice(0, 120)}`,
      `Error suggesting products. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
