import { env } from '../../config/index.js';
import type { UserContext } from './conversationMemory.js';
import { autoRepliesToday } from './conversationMemory.js';

export type BlockReason =
  | 'auto-reply-deshabilitado'
  | 'horario-silencio'
  | 'limite-diario-usuario'
  | 'usuario-escalado'
  | 'patron-sensible'
  | 'datos-personales-detectados'
  | 'precio-confirmacion'
  | 'queja-grave'
  | 'amenaza'
  | 'pregunta-ambigua'
  | 'historial-largo-sin-resolver';

export interface RailsDecision {
  permitir: boolean;
  motivos: BlockReason[];
  notas: string;
}

const SENSITIVE_PATTERNS: Array<{ regex: RegExp; reason: BlockReason }> = [
  {
    regex: /(?:dni|cuit|cuil|pasaporte|cbu|tarjeta|crédito|cvv|contraseña|password)/i,
    reason: 'datos-personales-detectados',
  },
  {
    regex: /(?:cuánto cuesta|cuánto sale|precio final|cotiza(?:cion|r)|presupuesto cerrado)/i,
    reason: 'precio-confirmacion',
  },
  { regex: /(?:estafa|robaron|fraude|denuncia|abogado|demanda|consumidor)/i, reason: 'queja-grave' },
  { regex: /(?:te voy a|matar|amenaza|hijo de|reventar)/i, reason: 'amenaza' },
  { regex: /(?:contrato|firma|legal|términos del acuerdo)/i, reason: 'precio-confirmacion' },
];

const isQuietHour = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  const start = env.bot.quietHoursStart;
  const end = env.bot.quietHoursEnd;
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
};

export const evaluateRails = (ctx: UserContext, mensajeEntrante: string): RailsDecision => {
  const motivos: BlockReason[] = [];

  if (!env.bot.autoReplyEnabled) motivos.push('auto-reply-deshabilitado');
  if (isQuietHour()) motivos.push('horario-silencio');
  if (ctx.escaladoAHumano) motivos.push('usuario-escalado');
  if (autoRepliesToday(ctx) >= env.bot.maxAutoRepliesPerUserPerDay) {
    motivos.push('limite-diario-usuario');
  }

  for (const { regex, reason } of SENSITIVE_PATTERNS) {
    if (regex.test(mensajeEntrante)) motivos.push(reason);
  }

  const turnosUsuario = ctx.turnos.filter((t) => t.rol === 'usuario').length;
  const turnosResolutorios = ctx.turnos.filter((t) => t.rol === 'marca').length;
  if (turnosUsuario >= 4 && turnosResolutorios === 0) {
    motivos.push('historial-largo-sin-resolver');
  }

  return {
    permitir: motivos.length === 0,
    motivos,
    notas: motivos.length ? `Bloqueado por: ${motivos.join(', ')}` : 'OK para respuesta automática',
  };
};
