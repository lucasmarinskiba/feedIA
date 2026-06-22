import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';

export interface VoiceActionResult {
  ok: boolean;
  spokenResponse: string;
  actionType: string;
  executed: boolean;
  detail?: unknown;
}

const response = (esMsg: string, enMsg: string): string => {
  const brand = loadBrandProfile();
  const locale = brand.audience.locale ?? 'es-AR';
  return locale.startsWith('es') ? esMsg : enMsg;
};

export const scoutUGC = async (): Promise<VoiceActionResult> => {
  const actionType = 'ugc.scout';
  log.info('[ugcVoice] scoutUGC invoked');
  try {
    const ugc = await import('../capabilities/ugc/index.js');
    const brand = loadBrandProfile();

    const candidates: import('../capabilities/ugc/detector.js').UgcCandidate[] = [];

    const decisions = await ugc.evaluarUgc(brand, candidates);

    const viable = decisions.filter((d) => d.vale);
    const highRisk = decisions.filter((d) => d.riesgoLegal === 'alto');

    return {
      ok: true,
      spokenResponse: response(
        `Scouting UGC completado. ${viable.length} candidatos viables encontrados. ${highRisk.length} con riesgo legal alto.`,
        `UGC scouting complete. ${viable.length} viable candidates found. ${highRisk.length} with high legal risk.`,
      ),
      actionType,
      executed: true,
      detail: { total: decisions.length, viable: viable.length, highRisk: highRisk.length, decisions },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[ugcVoice] scoutUGC error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error buscando candidatos UGC. Intentá de nuevo más tarde.',
        'Error scouting UGC candidates. Try again later.',
      ),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const evaluateUGC = async (candidateId: string): Promise<VoiceActionResult> => {
  const actionType = 'ugc.evaluate';
  log.info(`[ugcVoice] evaluateUGC invoked for ${candidateId}`);
  try {
    const ugc = await import('../capabilities/ugc/index.js');

    const records = ugc.listarPorEstado ? ugc.listarPorEstado('no-solicitado') : [];
    const record = records.find((r: { id: string }) => r.id === candidateId);

    if (!record) {
      return {
        ok: false,
        spokenResponse: response(
          `Candidato UGC ${candidateId} no encontrado.`,
          `UGC candidate ${candidateId} not found.`,
        ),
        actionType,
        executed: false,
        detail: { candidateId },
      };
    }

    const risk = record.decision.riesgoLegal;
    const permissionNeeded = record.decision.permisoNecesario;

    return {
      ok: true,
      spokenResponse: response(
        `Evaluación de ${candidateId}: riesgo legal ${risk}. ${permissionNeeded ? 'Se necesita permiso.' : 'No hace falta permiso.'}`,
        `Evaluation of ${candidateId}: legal risk ${risk}. ${permissionNeeded ? 'Permission needed.' : 'No permission needed.'}`,
      ),
      actionType,
      executed: true,
      detail: { record },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[ugcVoice] evaluateUGC error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error evaluando candidato UGC.', 'Error evaluating UGC candidate.'),
      actionType,
      executed: false,
      detail: { error: msg, candidateId },
    };
  }
};

export const requestPermission = async (candidateId: string): Promise<VoiceActionResult> => {
  const actionType = 'ugc.requestPermission';
  log.info(`[ugcVoice] requestPermission invoked for ${candidateId}`);
  try {
    const ugc = await import('../capabilities/ugc/index.js');

    if (!ugc.solicitarPermiso) {
      return {
        ok: false,
        spokenResponse: response(
          'La funcionalidad de solicitar permiso no está disponible.',
          'The permission request feature is not available.',
        ),
        actionType,
        executed: false,
        detail: { candidateId },
      };
    }

    const result = await ugc.solicitarPermiso(candidateId);

    if (!result.ok) {
      return {
        ok: false,
        spokenResponse: response(
          `No se pudo solicitar permiso para ${candidateId}: ${result.error ?? 'error desconocido'}.`,
          `Could not request permission for ${candidateId}: ${result.error ?? 'unknown error'}.`,
        ),
        actionType,
        executed: false,
        detail: { candidateId, error: result.error },
      };
    }

    return {
      ok: true,
      spokenResponse: response(
        `Permiso solicitado exitosamente para ${candidateId}. Esperando respuesta.`,
        `Permission successfully requested for ${candidateId}. Awaiting response.`,
      ),
      actionType,
      executed: true,
      detail: { candidateId },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[ugcVoice] requestPermission error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error solicitando permiso UGC.', 'Error requesting UGC permission.'),
      actionType,
      executed: false,
      detail: { error: msg, candidateId },
    };
  }
};

export const repostUGC = async (candidateId: string): Promise<VoiceActionResult> => {
  const actionType = 'ugc.repost';
  log.info(`[ugcVoice] repostUGC invoked for ${candidateId}`);
  try {
    const ugc = await import('../capabilities/ugc/index.js');

    const records = ugc.listarPorEstado ? ugc.listarPorEstado('aprobado') : [];
    const record = records.find((r: { id: string }) => r.id === candidateId);

    if (!record) {
      return {
        ok: false,
        spokenResponse: response(
          `No encontré contenido UGC aprobado con ID ${candidateId}.`,
          `No approved UGC content found with ID ${candidateId}.`,
        ),
        actionType,
        executed: false,
        detail: { candidateId },
      };
    }

    return {
      ok: true,
      spokenResponse: response(
        `UGC de ${record.autor} listo para repostear en formato ${record.decision.formatosSugeridos.join(', ')}.`,
        `UGC from ${record.autor} ready to repost in format ${record.decision.formatosSugeridos.join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: { record },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[ugcVoice] repostUGC error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error preparando reposteo UGC.', 'Error preparing UGC repost.'),
      actionType,
      executed: false,
      detail: { error: msg, candidateId },
    };
  }
};

export const listPendingUGC = async (): Promise<VoiceActionResult> => {
  const actionType = 'ugc.listPending';
  log.debug('[ugcVoice] listPendingUGC invoked');
  try {
    const ugc = await import('../capabilities/ugc/index.js');

    const pending = ugc.listarPorEstado ? ugc.listarPorEstado('solicitado') : [];
    const noSolicitado = ugc.listarPorEstado ? ugc.listarPorEstado('no-solicitado') : [];

    return {
      ok: true,
      spokenResponse: response(
        `UGC pendiente: ${pending.length} esperando respuesta, ${noSolicitado.length} sin solicitar permiso.`,
        `Pending UGC: ${pending.length} awaiting response, ${noSolicitado.length} permission not yet requested.`,
      ),
      actionType,
      executed: true,
      detail: { pending, noSolicitado, total: pending.length + noSolicitado.length },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[ugcVoice] listPendingUGC error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error listando UGC pendiente.', 'Error listing pending UGC.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
