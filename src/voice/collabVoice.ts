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

export const evaluateCreator = async (handle: string): Promise<VoiceActionResult> => {
  const actionType = 'collab.evaluate';
  log.info(`[collabVoice] evaluateCreator invoked for @${handle}`);
  try {
    const collab = await import('../capabilities/collab/index.js');
    const brand = loadBrandProfile();

    const observation: import('../capabilities/collab/manager.js').CreatorObservation = {
      handle,
      nichoDeclarado: 'desconocido',
      ejemplosContenido: [],
    };

    const prospects = await collab.procesarObservaciones(brand, [observation]);
    const prospect = prospects[0];

    if (!prospect) {
      return {
        ok: false,
        spokenResponse: response(
          `No pude evaluar a @${handle}. Revisá el handle e intentá de nuevo.`,
          `Could not evaluate @${handle}. Check the handle and try again.`,
        ),
        actionType,
        executed: false,
        detail: { handle },
      };
    }

    return {
      ok: true,
      spokenResponse: response(
        `@${handle}: alineación ${prospect.alineacion}/100, riesgo ${prospect.riesgoMarca}. Estado: ${prospect.status}.`,
        `@${handle}: alignment ${prospect.alineacion}/100, risk ${prospect.riesgoMarca}. Status: ${prospect.status}.`,
      ),
      actionType,
      executed: true,
      detail: { prospect },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[collabVoice] evaluateCreator error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(`Error evaluando a @${handle}.`, `Error evaluating @${handle}.`),
      actionType,
      executed: false,
      detail: { error: msg, handle },
    };
  }
};

export const sendOutreach = async (prospectIds?: string[]): Promise<VoiceActionResult> => {
  const actionType = 'collab.outreach';
  log.info(`[collabVoice] sendOutreach invoked for ${prospectIds?.length ?? 'all'} prospects`);
  try {
    const collab = await import('../capabilities/collab/index.js');

    const targets =
      prospectIds && prospectIds.length > 0
        ? prospectIds
        : collab.listByStatus
          ? collab.listByStatus('evaluado').map((p: { id: string }) => p.id)
          : [];

    if (!targets.length) {
      return {
        ok: false,
        spokenResponse: response(
          'No hay prospects evaluados para enviar outreach. Evaluá creadores primero.',
          'No evaluated prospects to send outreach. Evaluate creators first.',
        ),
        actionType,
        executed: false,
        detail: {},
      };
    }

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const id of targets) {
      if (collab.enviarOutreach) {
        const r = await collab.enviarOutreach(id);
        results.push({ id, ...r });
      }
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return {
      ok: true,
      spokenResponse: response(
        `Outreach enviado: ${sent} exitosos, ${failed} fallidos.`,
        `Outreach sent: ${sent} successful, ${failed} failed.`,
      ),
      actionType,
      executed: true,
      detail: { sent, failed, results },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[collabVoice] sendOutreach error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error enviando outreach. Revisá los prospects e intentá de nuevo.',
        'Error sending outreach. Check prospects and try again.',
      ),
      actionType,
      executed: false,
      detail: { error: msg, prospectIds },
    };
  }
};

export const listProspects = async (): Promise<VoiceActionResult> => {
  const actionType = 'collab.listProspects';
  log.debug('[collabVoice] listProspects invoked');
  try {
    const collab = await import('../capabilities/collab/index.js');
    const all = collab.loadProspects ? collab.loadProspects() : [];

    const byStatus: Record<string, number> = {};
    for (const p of all) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    }

    return {
      ok: true,
      spokenResponse: response(
        `Prospects totales: ${all.length}. ${Object.entries(byStatus)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}.`,
        `Total prospects: ${all.length}. ${Object.entries(byStatus)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: { total: all.length, byStatus, prospects: all },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[collabVoice] listProspects error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error listando prospects.', 'Error listing prospects.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const negotiateWithCreator = async (handle: string, message?: string): Promise<VoiceActionResult> => {
  const actionType = 'collab.negotiate';
  log.info(`[collabVoice] negotiateWithCreator invoked for @${handle}`);
  try {
    const collab = await import('../capabilities/collab/index.js');
    const brand = loadBrandProfile();

    const prospects = collab.loadProspects ? collab.loadProspects() : [];
    const prospect = prospects.find((p: { handle: string }) => p.handle === handle);

    if (!prospect) {
      return {
        ok: false,
        spokenResponse: response(
          `@${handle} no está en la lista de prospects. Evalualo primero.`,
          `@${handle} is not in the prospects list. Evaluate them first.`,
        ),
        actionType,
        executed: false,
        detail: { handle },
      };
    }

    if (!message) {
      return {
        ok: true,
        spokenResponse: response(
          `@${handle} está en conversación. Pasame el mensaje recibido para generar respuesta.`,
          `@${handle} is in conversation. Pass me the received message to generate a reply.`,
        ),
        actionType,
        executed: false,
        detail: { prospect },
      };
    }

    const negotiation = await collab.responderNegociacion(brand, prospect, message);

    return {
      ok: true,
      spokenResponse: response(
        `Negociación con @${handle}: sentimiento ${negotiation.sentimiento}. Siguiente paso: ${negotiation.siguientePaso}.`,
        `Negotiation with @${handle}: sentiment ${negotiation.sentimiento}. Next step: ${negotiation.siguientePaso}.`,
      ),
      actionType,
      executed: true,
      detail: { negotiation },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[collabVoice] negotiateWithCreator error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(`Error en negociación con @${handle}.`, `Error in negotiation with @${handle}.`),
      actionType,
      executed: false,
      detail: { error: msg, handle },
    };
  }
};

export const getNextSteps = async (): Promise<VoiceActionResult> => {
  const actionType = 'collab.nextSteps';
  log.info('[collabVoice] getNextSteps invoked');
  try {
    const collab = await import('../capabilities/collab/index.js');

    const enConversacion = collab.listByStatus ? collab.listByStatus('en-conversacion') : [];
    const outreachEnviado = collab.listByStatus ? collab.listByStatus('outreach-enviado') : [];
    const evaluados = collab.listByStatus ? collab.listByStatus('evaluado') : [];

    const steps: string[] = [];
    if (enConversacion.length) {
      steps.push(`Responder ${enConversacion.length} conversaciones activas`);
    }
    if (outreachEnviado.length) {
      steps.push(`Seguimiento de ${outreachEnviado.length} outreach enviados`);
    }
    if (evaluados.length) {
      steps.push(`Enviar outreach a ${evaluados.length} prospects evaluados`);
    }

    return {
      ok: true,
      spokenResponse: response(
        steps.length
          ? `Próximos pasos de colaboración: ${steps.join('; ')}.`
          : 'No hay pasos pendientes de colaboración. Evaluá nuevos creadores.',
        steps.length
          ? `Next collaboration steps: ${steps.join('; ')}.`
          : 'No pending collaboration steps. Evaluate new creators.',
      ),
      actionType,
      executed: true,
      detail: { enConversacion, outreachEnviado, evaluados },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[collabVoice] getNextSteps error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error obteniendo próximos pasos de colaboración.',
        'Error getting next collaboration steps.',
      ),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
