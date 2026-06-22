import { sendDm } from '../../integrations/meta.js';
import { log } from '../../agent/logger.js';
import {
  evaluate as complianceEvaluate,
  recordSuccess as complianceRecordSuccess,
  recordFailure as complianceRecordFailure,
  type GuardianContext,
} from '../../compliance/index.js';
import { enrollmentsListos, avanzarPaso, type SequenceEnrollment, type NurtureStep } from './sequences.js';

export interface NurtureSendResult {
  enrollmentId: string;
  igUserId: string;
  paso: number;
  enviado: boolean;
  error?: string;
}

const formatMessage = (paso: NurtureStep): string =>
  paso.ctaOpcional ? `${paso.mensaje}\n\n${paso.ctaOpcional}` : paso.mensaje;

export const ejecutarPasosListos = async (): Promise<NurtureSendResult[]> => {
  const listos = enrollmentsListos();
  log.info(`Nurture: ${listos.length} enrollments con paso pendiente`);
  const results: NurtureSendResult[] = [];
  for (const { enrollment, paso } of listos) {
    const message = formatMessage(paso);

    // Compliance check antes de enviar
    const complianceCtx: GuardianContext = {
      actor: `nurture:${enrollment.sequenceId}`,
      targetIgUserId: enrollment.igUserId,
      contentText: message,
      humanInitiated: false,
    };
    const complianceDecision = complianceEvaluate('nurture_sequence', complianceCtx);

    if (!complianceDecision.allowed) {
      log.error(`[COMPLIANCE] Nurture bloqueado para ${enrollment.igUserId}: ${complianceDecision.reason}`);
      results.push({
        enrollmentId: enrollment.enrollmentId,
        igUserId: enrollment.igUserId,
        paso: enrollment.pasoActual,
        enviado: false,
        error: `Compliance: ${complianceDecision.reason}`,
      });
      continue;
    }

    const r = await sendDm(enrollment.igUserId, message);
    if (r.ok) {
      avanzarPaso(enrollment.enrollmentId);
      complianceRecordSuccess('nurture_sequence', complianceCtx);
      results.push({
        enrollmentId: enrollment.enrollmentId,
        igUserId: enrollment.igUserId,
        paso: enrollment.pasoActual,
        enviado: true,
      });
      log.success(`Nurture: paso ${enrollment.pasoActual + 1} → ${enrollment.igUserId}`);
    } else {
      complianceRecordFailure('nurture_sequence', complianceCtx, r.error ?? 'Unknown error');
      results.push({
        enrollmentId: enrollment.enrollmentId,
        igUserId: enrollment.igUserId,
        paso: enrollment.pasoActual,
        enviado: false,
        ...(r.error ? { error: r.error } : {}),
      });
      log.warn(`Nurture falló a ${enrollment.igUserId}: ${r.error}`);
    }
  }
  return results;
};

export const procesarRespuestaUsuario = (enrollment: SequenceEnrollment): SequenceEnrollment | null => {
  enrollment.ultimaInteraccion = new Date().toISOString();
  return avanzarPaso(enrollment.enrollmentId);
};
