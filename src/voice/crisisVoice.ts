import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';

export interface VoiceActionResult {
  ok: boolean;
  spokenResponse: string;
  actionType: string;
  executed: boolean;
  detail?: unknown;
}

const es = (msg: string): string => msg;
const en = (msg: string): string => msg;

const response = (esMsg: string, enMsg: string): string => {
  const brand = loadBrandProfile();
  const locale = brand.audience.locale ?? 'es-AR';
  return locale.startsWith('es') ? es(esMsg) : en(enMsg);
};

export const checkCrisisStatus = async (): Promise<VoiceActionResult> => {
  const actionType = 'crisis.check';
  log.info('[crisisVoice] checkCrisisStatus invoked');
  try {
    const crisis = await import('../capabilities/crisis/index.js');
    const state = crisis.getCrisisState();
    const paused = crisis.isPausado ? crisis.isPausado() : state.publicacionesPausadas;

    if (paused) {
      return {
        ok: true,
        spokenResponse: response(
          'Atención: las publicaciones están pausadas por crisis activa. Revisá el estado antes de reanudar.',
          'Attention: publishing is paused due to an active crisis. Review the status before resuming.',
        ),
        actionType,
        executed: true,
        detail: { state, paused: true },
      };
    }

    return {
      ok: true,
      spokenResponse: response(
        'No hay crisis activa. Todo está bajo control por ahora.',
        'No active crisis. Everything is under control for now.',
      ),
      actionType,
      executed: true,
      detail: { state, paused: false },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[crisisVoice] checkCrisisStatus error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'No pude verificar el estado de crisis. Revisá manualmente.',
        'I could not check the crisis status. Please review manually.',
      ),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const pausePublishing = async (): Promise<VoiceActionResult> => {
  const actionType = 'crisis.pause';
  log.info('[crisisVoice] pausePublishing invoked');
  try {
    const crisis = await import('../capabilities/crisis/index.js');
    const state = crisis.getCrisisState();
    state.publicacionesPausadas = true;

    return {
      ok: true,
      spokenResponse: response(
        'Publicaciones pausadas. No se publicará nada hasta nueva orden.',
        'Publishing paused. Nothing will be posted until further notice.',
      ),
      actionType,
      executed: true,
      detail: { state },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[crisisVoice] pausePublishing error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error al pausar publicaciones. Intentá de nuevo.',
        'Error pausing publishing. Please try again.',
      ),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const resumePublishing = async (): Promise<VoiceActionResult> => {
  const actionType = 'crisis.resume';
  log.info('[crisisVoice] resumePublishing invoked');
  try {
    const crisis = await import('../capabilities/crisis/index.js');
    const state = crisis.reanudarPublicaciones ? crisis.reanudarPublicaciones() : crisis.getCrisisState();

    return {
      ok: true,
      spokenResponse: response(
        'Publicaciones reanudadas. El calendario sigue su curso normal.',
        'Publishing resumed. The calendar continues as normal.',
      ),
      actionType,
      executed: true,
      detail: { state },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[crisisVoice] resumePublishing error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error al reanudar publicaciones. Revisá el estado manualmente.',
        'Error resuming publishing. Please check the status manually.',
      ),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const evaluateRecentComments = async (postId?: string, comments?: string[]): Promise<VoiceActionResult> => {
  const actionType = 'crisis.evaluateComments';
  log.info('[crisisVoice] evaluateRecentComments invoked');
  try {
    const brand = loadBrandProfile();
    const crisis = await import('../capabilities/crisis/index.js');
    const targetPostId = postId ?? 'unknown-post';
    const targetComments = comments ?? [];

    if (!targetComments.length) {
      return {
        ok: true,
        spokenResponse: response(
          'No recibí comentarios para evaluar. Pasame los comentarios y el post ID.',
          'I did not receive comments to evaluate. Pass me the comments and post ID.',
        ),
        actionType,
        executed: false,
        detail: { postId: targetPostId },
      };
    }

    const result = await crisis.ejecutarCrisisCheck(brand, {
      postId: targetPostId,
      comentariosRecientes: targetComments,
    });

    const hasCrisis = result.state.publicacionesPausadas;

    return {
      ok: true,
      spokenResponse: response(
        hasCrisis
          ? 'Detecté señales de crisis en los comentarios. Publiqué pausado por precaución.'
          : 'Los comentarios no muestran riesgo de crisis por ahora.',
        hasCrisis
          ? 'I detected crisis signals in the comments. Publishing paused as a precaution.'
          : 'The comments show no crisis risk for now.',
      ),
      actionType,
      executed: true,
      detail: { result: result.resultado.finalText, state: result.state },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[crisisVoice] evaluateRecentComments error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error evaluando comentarios. Revisá manualmente por si hay crisis.',
        'Error evaluating comments. Please review manually for any crisis.',
      ),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const getCrisisState = async (): Promise<VoiceActionResult> => {
  const actionType = 'crisis.getState';
  log.debug('[crisisVoice] getCrisisState invoked');
  try {
    const crisis = await import('../capabilities/crisis/index.js');
    const state = crisis.getCrisisState();

    return {
      ok: true,
      spokenResponse: response(
        `Estado de crisis: publicaciones pausadas: ${state.publicacionesPausadas ? 'sí' : 'no'}. Posts en observación: ${state.postsEnObservacion.length}.`,
        `Crisis status: publishing paused: ${state.publicacionesPausadas ? 'yes' : 'no'}. Posts under watch: ${state.postsEnObservacion.length}.`,
      ),
      actionType,
      executed: true,
      detail: { state },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[crisisVoice] getCrisisState error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('No pude obtener el estado de crisis.', 'Could not retrieve the crisis state.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const draftCrisisResponse = async (type: 'humble' | 'factual' | 'brief'): Promise<VoiceActionResult> => {
  const actionType = 'crisis.draftResponse';
  log.info(`[crisisVoice] draftCrisisResponse invoked with type=${type}`);
  try {
    const brand = loadBrandProfile();
    const toneMap: Record<string, string> = {
      humble: 'humilde, asumiendo responsabilidad si aplica',
      factual: 'factual, corrigiendo desinformación sin atacar',
      brief: 'breve, sin darle engagement al troll',
    };

    const spoken = response(
      `Borrador de respuesta tipo ${type}: ${toneMap[type] ?? toneMap.brief}. Revisalo antes de publicar.`,
      `Draft response type ${type}: ${toneMap[type] ?? toneMap.brief}. Review before posting.`,
    );

    return {
      ok: true,
      spokenResponse: spoken,
      actionType,
      executed: true,
      detail: {
        type,
        brand: brand.name,
        tone: toneMap[type] ?? toneMap.brief,
        draft: `[${type.toUpperCase()}] Respuesta de crisis para ${brand.name}. Requiere revisión humana antes de publicar.`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[crisisVoice] draftCrisisResponse error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error generando borrador de respuesta. Escribilo manualmente.',
        'Error generating response draft. Please write it manually.',
      ),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
