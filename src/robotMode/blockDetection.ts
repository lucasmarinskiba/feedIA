/**
 * BlockDetection — Sistema de detección proactiva de penalizaciones de Instagram.
 *
 * Detecta señales de alerta en el navegador/respuestas de API y activa
 * el kill switch automático (emergency stop) para proteger la cuenta.
 *
 * Indicadores detectados:
 *   • Challenge de verificación ("Confirma tu identidad")
 *   • Action Blocked ("No puedes realizar esta acción")
 *   • Rate limit pages
 *   • CAPTCHA
 *   • Shadowban indicators (feed no muestra posts propios, reach caído)
 *   • Cuenta suspendida
 *   • "Unusual activity" warnings
 */

import { log } from '../agent/logger.js';
import { emergencyStop } from '../compliance/emergency.js';
import { sendAlert } from '../integrations/notifications.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type BlockSeverity = 'info' | 'warn' | 'critical';

export interface BlockIndicator {
  id: string;
  name: string;
  severity: BlockSeverity;
  patterns: RegExp[];
  description: string;
  autoPause: boolean;
}

export interface BlockScanResult {
  blocked: boolean;
  indicators: BlockIndicator[];
  matchedPatterns: string[];
  recommendation: string;
}

// ── Catálogo de indicadores ───────────────────────────────────────────────────

const BLOCK_INDICATORS: BlockIndicator[] = [
  {
    id: 'IG-CHALLENGE',
    name: 'Challenge de Verificación',
    severity: 'critical',
    patterns: [
      /confirma tu identidad/i,
      /verify your identity/i,
      /help us confirm/i,
      /we noticed unusual activity/i,
      /security check/i,
      /verificación de seguridad/i,
      /confirmar que eres tu/i,
    ],
    description: 'Instagram solicita verificación de identidad. La cuenta puede estar en riesgo de suspensión.',
    autoPause: true,
  },
  {
    id: 'IG-ACTION-BLOCKED',
    name: 'Action Blocked',
    severity: 'critical',
    patterns: [
      /action blocked/i,
      /acción bloqueada/i,
      /no puedes realizar esta acción/i,
      /you can't perform this action/i,
      /try again later/i,
      /inténtalo de nuevo más tarde/i,
      /restricting certain activity/i,
      /restringimos ciertas actividades/i,
    ],
    description: 'Instagram ha bloqueado temporalmente acciones (like, comment, follow, DM).',
    autoPause: true,
  },
  {
    id: 'IG-CAPTCHA',
    name: 'CAPTCHA Detected',
    severity: 'critical',
    patterns: [
      /captcha/i,
      /i'm not a robot/i,
      /no soy un robot/i,
      /verify you are a human/i,
      /comprueba que no eres un robot/i,
    ],
    description: 'Instagram muestra CAPTCHA. Señal clara de detección de automatización.',
    autoPause: true,
  },
  {
    id: 'IG-SUSPENDED',
    name: 'Cuenta Suspendida',
    severity: 'critical',
    patterns: [
      /account suspended/i,
      /cuenta suspendida/i,
      /your account has been disabled/i,
      /tu cuenta ha sido desactivada/i,
      /learn more about why/i,
    ],
    description: 'La cuenta ha sido suspendida o desactivada por Instagram.',
    autoPause: true,
  },
  {
    id: 'IG-RATE-LIMIT',
    name: 'Rate Limit de Instagram',
    severity: 'warn',
    patterns: [
      /rate limit/i,
      /too many requests/i,
      /demasiadas solicitudes/i,
      /please wait a few minutes/i,
      /espera unos minutos/i,
      /slow down/i,
      /más despacio/i,
    ],
    description: 'Rate limit alcanzado. No es un ban pero requiere pausa.',
    autoPause: true,
  },
  {
    id: 'IG-SUSPECT',
    name: 'Comportamiento Sospechoso',
    severity: 'warn',
    patterns: [
      /unusual activity/i,
      /actividad inusual/i,
      /suspicious activity/i,
      /actividad sospechosa/i,
      /we've detected automated behavior/i,
      /hemos detectado comportamiento automatizado/i,
    ],
    description: 'Instagram detectó comportamiento que considera sospechoso.',
    autoPause: true,
  },
  {
    id: 'IG-LOGIN-REQUIRED',
    name: 'Sesión Expirada / Login Required',
    severity: 'warn',
    patterns: [
      /session expired/i,
      /sesión expirada/i,
      /please log in again/i,
      /inicia sesión de nuevo/i,
      /your session has expired/i,
    ],
    description: 'La sesión de Instagram expiró. Puede ser normal o indicio de bloqueo.',
    autoPause: false,
  },
];

// ── Shadowban heuristics (detección indirecta) ────────────────────────────────

export interface ShadowbanSignals {
  /** Alcance de los últimos posts comparado con el promedio */
  reachDropRatio: number;
  /** Si los posts no aparecen en hashtags */
  hashtagInvisible: boolean;
  /** Si los posts no aparecen en el feed de seguidores */
  feedInvisible: boolean;
  /** Si hay restricciones visibles en la cuenta */
  accountRestrictions: string[];
}

/**
 * Analiza señales indirectas de shadowban basadas en métricas.
 * Nota: esto requiere datos de analytics, no solo texto de página.
 */
export const analyzeShadowbanSignals = (
  signals: ShadowbanSignals,
): { shadowbanLikely: boolean; confidence: number; reasons: string[] } => {
  const reasons: string[] = [];
  let score = 0;

  if (signals.reachDropRatio < 0.3) {
    reasons.push(`Alcance cayó ${(signals.reachDropRatio * 100).toFixed(0)}% del promedio`);
    score += 30;
  }
  if (signals.hashtagInvisible) {
    reasons.push('Posts no visibles en hashtags');
    score += 25;
  }
  if (signals.feedInvisible) {
    reasons.push('Posts no aparecen en feed de seguidores');
    score += 25;
  }
  if (signals.accountRestrictions.length > 0) {
    reasons.push(`Restricciones detectadas: ${signals.accountRestrictions.join(', ')}`);
    score += 20;
  }

  return {
    shadowbanLikely: score >= 50,
    confidence: score,
    reasons,
  };
};

// ── Escaneo de texto / página ─────────────────────────────────────────────────

/**
 * Escanea un texto (HTML, mensaje de error, etc.) buscando indicadores de bloqueo.
 */
export const scanForBlocks = (text: string): BlockScanResult => {
  const matched: BlockIndicator[] = [];
  const matchedPatterns: string[] = [];

  for (const indicator of BLOCK_INDICATORS) {
    for (const pattern of indicator.patterns) {
      if (pattern.test(text)) {
        if (!matched.includes(indicator)) {
          matched.push(indicator);
        }
        matchedPatterns.push(`${indicator.id}: ${pattern.source}`);
        break;
      }
    }
  }

  const critical = matched.some((m) => m.severity === 'critical');

  return {
    blocked: matched.length > 0,
    indicators: matched,
    matchedPatterns,
    recommendation: critical
      ? 'PAUSAR INMEDIATAMENTE. Activar emergency stop y revisar la cuenta manualmente.'
      : matched.length > 0
        ? 'Reducir velocidad de operación y monitorear de cerca.'
        : 'No se detectaron indicadores de bloqueo.',
  };
};

// ── Kill Switch ───────────────────────────────────────────────────────────────

let killSwitchEnabled = true;

export const setKillSwitch = (enabled: boolean): void => {
  killSwitchEnabled = enabled;
  log.info(`[BlockDetection] Kill switch ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
};

export const isKillSwitchEnabled = (): boolean => killSwitchEnabled;

/**
 * Activa el kill switch: pausa TODAS las operaciones y alerta.
 * Llama a emergencyStop automáticamente.
 */
export const triggerKillSwitch = async (reason: string, indicators: BlockIndicator[]): Promise<void> => {
  log.error(`[BlockDetection] KILL SWITCH ACTIVADO: ${reason}`);
  log.error(`Indicadores: ${indicators.map((i) => i.name).join(', ')}`);

  if (!killSwitchEnabled) {
    log.warn('[BlockDetection] Kill switch está desactivado. Solo se enviará alerta.');
    await sendAlert({
      severity: 'crisis',
      title: '⚠️ Bloqueo detectado (kill switch OFF)',
      body: `${reason}\n\nIndicadores: ${indicators.map((i) => i.name).join(', ')}`,
    });
    return;
  }

  await emergencyStop({
    reason: `BlockDetection: ${reason}`,
    initiatedBy: 'robot_mode_kill_switch',
  });
};

// ── API de conveniencia para el RobotModeRouter ───────────────────────────────

/**
 * Verifica una respuesta de API de Meta o texto de página web.
 * Si detecta bloqueo crítico, activa el kill switch.
 */
export const checkResponseForBlocks = async (responseText: string, context: string): Promise<BlockScanResult> => {
  const result = scanForBlocks(responseText);

  if (result.blocked) {
    const critical = result.indicators.filter((i) => i.severity === 'critical' && i.autoPause);
    const warnings = result.indicators.filter((i) => i.severity === 'warn' && i.autoPause);

    log.warn(`[BlockDetection] Bloqueo detectado en ${context}: ${result.indicators.map((i) => i.name).join(', ')}`);

    if (critical.length > 0) {
      await triggerKillSwitch(`Bloqueo crítico en ${context}`, critical);
    } else if (warnings.length > 0) {
      // Para warnings, solo alertar pero también pausar
      log.warn('[BlockDetection] Warning detectado. Enviando alerta y pausando...');
      await sendAlert({
        severity: 'warn',
        title: `⚠️ Warning de Instagram en ${context}`,
        body: `${result.recommendation}\n\nIndicadores: ${warnings.map((i) => i.name).join(', ')}`,
      });
    }
  }

  return result;
};

/**
 * Verifica salud general antes de iniciar una sesión de robot.
 */
export const preSessionHealthCheck = async (lastReachMetrics?: {
  current: number;
  average: number;
}): Promise<{ ok: boolean; warnings: string[] }> => {
  const warnings: string[] = [];

  if (lastReachMetrics) {
    const ratio = lastReachMetrics.current / Math.max(lastReachMetrics.average, 1);
    const shadowban = analyzeShadowbanSignals({
      reachDropRatio: ratio,
      hashtagInvisible: false,
      feedInvisible: false,
      accountRestrictions: [],
    });

    if (shadowban.shadowbanLikely) {
      warnings.push(`Posible shadowban detectado: ${shadowban.reasons.join('; ')}`);
      await sendAlert({
        severity: 'warn',
        title: '⚠️ Posible shadowban detectado',
        body: shadowban.reasons.join('\n'),
      });
    }
  }

  return { ok: warnings.length === 0, warnings };
};
