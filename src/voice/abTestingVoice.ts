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

export const startABTest = async (variants: string[], description?: string): Promise<VoiceActionResult> => {
  const actionType = 'ab.start';
  log.info(`[abTestingVoice] startABTest invoked with ${variants.length} variants`);
  try {
    const ab = await import('../capabilities/abTesting/index.js');
    const brand = loadBrandProfile();

    if (variants.length < 2) {
      return {
        ok: false,
        spokenResponse: response(
          'Necesito al menos dos variantes para iniciar un test A/B.',
          'I need at least two variants to start an A/B test.',
        ),
        actionType,
        executed: false,
        detail: { variants },
      };
    }

    const test = await ab.startABTest({
      accountId: brand.name,
      name: description ?? `Test A/B ${new Date().toISOString().split('T')[0]}`,
      hypothesis: description ?? 'Comparar variantes de contenido',
      variants: variants.map((v, i) => ({
        name: `Variante ${i + 1}`,
        caption: v,
        mediaUrls: [],
        format: 'reel',
      })),
    });

    return {
      ok: true,
      spokenResponse: response(
        `Test A/B iniciado con ID ${test.id}. ${test.variants.length} variantes publicadas.`,
        `A/B test started with ID ${test.id}. ${test.variants.length} variants published.`,
      ),
      actionType,
      executed: true,
      detail: { testId: test.id, variants: test.variants.length, status: test.status },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[abTestingVoice] startABTest error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error iniciando el test A/B. Revisá los datos e intentá de nuevo.',
        'Error starting the A/B test. Check the data and try again.',
      ),
      actionType,
      executed: false,
      detail: { error: msg, variants },
    };
  }
};

export const getABTestStatus = async (testId: string): Promise<VoiceActionResult> => {
  const actionType = 'ab.status';
  log.info(`[abTestingVoice] getABTestStatus invoked for ${testId}`);
  try {
    const ab = await import('../capabilities/abTesting/index.js');

    const tests = ab.listABTests ? ab.listABTests(loadBrandProfile().name) : [];
    const test = tests.find((t: { id: string }) => t.id === testId);

    if (!test) {
      return {
        ok: false,
        spokenResponse: response(`No encontré el test A/B con ID ${testId}.`, `A/B test with ID ${testId} not found.`),
        actionType,
        executed: false,
        detail: { testId },
      };
    }

    return {
      ok: true,
      spokenResponse: response(
        `Test ${testId}: estado ${test.status}. Variantes: ${test.variants.length}.`,
        `Test ${testId}: status ${test.status}. Variants: ${test.variants.length}.`,
      ),
      actionType,
      executed: true,
      detail: { test },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[abTestingVoice] getABTestStatus error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error consultando el estado del test A/B.', 'Error checking the A/B test status.'),
      actionType,
      executed: false,
      detail: { error: msg, testId },
    };
  }
};

export const evaluateABTest = async (testId: string): Promise<VoiceActionResult> => {
  const actionType = 'ab.evaluate';
  log.info(`[abTestingVoice] evaluateABTest invoked for ${testId}`);
  try {
    const ab = await import('../capabilities/abTesting/index.js');
    const test = await ab.evaluateABTest(testId);

    const winner = test.winner ?? 'sin ganador aún';
    const confidence = test.confidence ? `${(test.confidence * 100).toFixed(1)}%` : 'N/A';

    return {
      ok: true,
      spokenResponse: response(
        `Evaluación del test ${testId}: ganador ${winner}. Confianza: ${confidence}.`,
        `A/B test ${testId} evaluation: winner ${winner}. Confidence: ${confidence}.`,
      ),
      actionType,
      executed: true,
      detail: { test },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[abTestingVoice] evaluateABTest error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error evaluando el test A/B. Intentá más tarde.',
        'Error evaluating the A/B test. Try again later.',
      ),
      actionType,
      executed: false,
      detail: { error: msg, testId },
    };
  }
};

export const cancelABTest = async (testId: string): Promise<VoiceActionResult> => {
  const actionType = 'ab.cancel';
  log.info(`[abTestingVoice] cancelABTest invoked for ${testId}`);
  try {
    const ab = await import('../capabilities/abTesting/index.js');

    const tests = ab.listABTests ? ab.listABTests(loadBrandProfile().name) : [];
    const test = tests.find((t: { id: string }) => t.id === testId);

    if (!test) {
      return {
        ok: false,
        spokenResponse: response(`Test A/B ${testId} no encontrado.`, `A/B test ${testId} not found.`),
        actionType,
        executed: false,
        detail: { testId },
      };
    }

    const { updateABTest } = await import('../database/index.js');
    updateABTest(testId, { status: 'cancelled', updatedAt: new Date().toISOString() });

    return {
      ok: true,
      spokenResponse: response(
        `Test A/B ${testId} cancelado. Las publicaciones ya hechas quedan activas.`,
        `A/B test ${testId} cancelled. Already published posts remain active.`,
      ),
      actionType,
      executed: true,
      detail: { testId, previousStatus: test.status },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[abTestingVoice] cancelABTest error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error cancelando el test A/B.', 'Error cancelling the A/B test.'),
      actionType,
      executed: false,
      detail: { error: msg, testId },
    };
  }
};

export const listABTests = async (): Promise<VoiceActionResult> => {
  const actionType = 'ab.list';
  log.debug('[abTestingVoice] listABTests invoked');
  try {
    const ab = await import('../capabilities/abTesting/index.js');
    const brand = loadBrandProfile();
    const tests = ab.listABTests ? ab.listABTests(brand.name) : [];

    const running = tests.filter((t: { status: string }) => t.status === 'running').length;
    const completed = tests.filter((t: { status: string }) => t.status === 'completed').length;

    return {
      ok: true,
      spokenResponse: response(
        `Tenés ${tests.length} tests A/B en total: ${running} activos, ${completed} completados.`,
        `You have ${tests.length} A/B tests total: ${running} running, ${completed} completed.`,
      ),
      actionType,
      executed: true,
      detail: { total: tests.length, running, completed, tests },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[abTestingVoice] listABTests error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error listando tests A/B.', 'Error listing A/B tests.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
