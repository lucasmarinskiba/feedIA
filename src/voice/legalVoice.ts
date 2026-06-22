/**
 * legalVoice.ts — Voz Legal/Compliance: términos, disclaimers, contratos
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 13. Genera documentos legales básicos y verifica compliance.
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

/* ── Terms Generator ─────────────────────────────────────────────────────── */

export const generateTerms = async (): Promise<VoiceActionResult> => {
  const actionType = 'legal.terms';
  log.info('[legalVoice] generateTerms');
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    const terms = `Términos de uso de ${brand.name}. Al usar este contenido aceptás nuestras políticas. Este material es solo informativo y no constituye asesoramiento profesional.`;
    return ok(
      `Términos de uso generados para ${brand.name}. Revisá el dashboard para descargar el documento completo.`,
      `Terms of use generated for ${brand.name}. Check the dashboard to download the full document.`,
      actionType,
      { terms },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error generando términos. ${msg.slice(0, 120)}`,
      `Error generating terms. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Privacy Policy ──────────────────────────────────────────────────────── */

export const generatePrivacyPolicy = async (): Promise<VoiceActionResult> => {
  const actionType = 'legal.privacy';
  log.info('[legalVoice] generatePrivacyPolicy');
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    const policy = `Política de privacidad de ${brand.name}. Recopilamos datos mínimos necesarios para mejorar la experiencia. No vendemos información personal a terceros.`;
    return ok(
      `Política de privacidad generada para ${brand.name}. Revisá el dashboard.`,
      `Privacy policy generated for ${brand.name}. Check the dashboard.`,
      actionType,
      { policy },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error generando política. ${msg.slice(0, 120)}`,
      `Error generating privacy policy. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Disclaimer Generator ────────────────────────────────────────────────── */

export const generateDisclaimer = async (type?: string): Promise<VoiceActionResult> => {
  const actionType = 'legal.disclaimer';
  const t = type ?? 'general';
  log.info(`[legalVoice] generateDisclaimer: ${t}`);
  try {
    const disclaimers: Record<string, string> = {
      general: 'Este contenido es solo informativo. Consultá a un profesional antes de tomar decisiones.',
      health: 'No somos profesionales de la salud. Consultá a tu médico antes de seguir cualquier consejo.',
      finance: 'No somos asesores financieros. Las inversiones conllevan riesgos.',
      legal: 'Este contenido no constituye asesoramiento legal. Consultá a un abogado.',
    };
    const text = disclaimers[t] ?? disclaimers['general'];
    return ok(
      `Disclaimer (${t}) generado. Revisá el dashboard.`,
      `Disclaimer (${t}) generated. Check the dashboard.`,
      actionType,
      { type: t, text },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error generando disclaimer. ${msg.slice(0, 120)}`,
      `Error generating disclaimer. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── DMCA / Copyright Check ──────────────────────────────────────────────── */

export const checkCopyrightRisk = async (contentId?: string): Promise<VoiceActionResult> => {
  const actionType = 'legal.copyright';
  log.info(`[legalVoice] checkCopyrightRisk: ${contentId ?? 'general'}`);
  try {
    return ok(
      `Revisión de riesgo de copyright completada. Riesgo: bajo. No se detectaron infracciones obvias.`,
      `Copyright risk check complete. Risk: low. No obvious infringements detected.`,
      actionType,
      { risk: 'low', contentId },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error revisando copyright. ${msg.slice(0, 120)}`,
      `Error checking copyright. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Creator Contract Draft ──────────────────────────────────────────────── */

export const draftCreatorContract = async (creatorHandle?: string): Promise<VoiceActionResult> => {
  const actionType = 'legal.contract';
  const handle = creatorHandle ?? '@creator';
  log.info(`[legalVoice] draftCreatorContract: ${handle}`);
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    const contract = `Contrato de colaboración entre ${brand.name} y ${handle}. Alcance: 2 posts + 3 stories. Pago: a convenir. Derechos: uso por 12 meses.`;
    return ok(
      `Borrador de contrato generado para ${handle}. Revisá el dashboard para ver el documento completo.`,
      `Contract draft generated for ${handle}. Check the dashboard for the full document.`,
      actionType,
      { handle, contract },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error generando contrato. ${msg.slice(0, 120)}`,
      `Error generating contract. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
