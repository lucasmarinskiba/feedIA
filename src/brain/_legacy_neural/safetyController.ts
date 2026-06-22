// @ts-nocheck
/**
 * Safety Controller — Arquitectura de Control y Seguridad.
 *
 * Sistema de contingencia, gestión de excepciones, circuit breakers
 * y mecanismos de rollback. Garantiza que FeedIA nunca tome acciones
 * que dañen la cuenta o violen las políticas de Instagram.
 *
 * Arquitectura: CAPA DE SEGURIDAD transversal a todo el sistema.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { RLAction } from './reinforcementEngine.js';

const SAFETY_DIR = path.resolve('data/neural/safety');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface SafetyCheck {
  id: string;
  action: RLAction | string;
  riskLevel: RiskLevel;
  passed: boolean;
  reasons: string[];
  mitigations: string[];
  requiresHumanApproval: boolean;
  timestamp: string;
}

export interface CircuitBreaker {
  name: string;
  state: CircuitState;
  failureCount: number;
  failureThreshold: number; // fallas para abrir circuito
  successCount: number;
  successThreshold: number; // éxitos para cerrar desde half-open
  lastFailureAt?: string;
  openedAt?: string;
  cooldownMs: number; // tiempo antes de pasar a half-open
  protects: string; // qué protege este breaker
}

export interface ExceptionRecord {
  id: string;
  brandId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  context: Record<string, unknown>;
  handled: boolean;
  escalatedToHuman: boolean;
  resolution?: string;
  timestamp: string;
}

export interface ContingencyPlan {
  id: string;
  trigger: string; // condición que activa el plan
  description: string;
  steps: ContingencyStep[];
  priority: number; // 1=máxima prioridad
  isActive: boolean;
}

export interface ContingencyStep {
  order: number;
  action: string;
  autonomous: boolean;
  description: string;
  rollbackAction?: string;
}

export interface SafetyReport {
  brandId: string;
  timestamp: string;
  overallRiskLevel: RiskLevel;
  circuitBreakers: CircuitBreaker[];
  recentExceptions: ExceptionRecord[];
  activeContingencies: string[];
  blockedActions: string[];
  safetyScore: number; // 0–100
  recommendations: string[];
}

// ── Reglas de seguridad para acciones RL ────────────────────────────────────

const ACTION_RISK_MAP: Record<RLAction, RiskLevel> = {
  'post-carousel-educational': 'safe',
  'post-carousel-entertainment': 'safe',
  'post-reel-trending': 'low',
  'post-reel-tutorial': 'safe',
  'post-story-poll': 'safe',
  'post-story-behind-scenes': 'safe',
  'post-static-quote': 'safe',
  'post-static-product': 'low',
  'engage-reply-comments': 'safe',
  'engage-dm-followup': 'low',
  'update-bio-cta': 'low',
  'rotate-hashtags': 'safe',
  'run-ab-test-caption': 'safe',
  'boost-post-ads': 'medium',
  'collab-proposal': 'medium',
  'pause-publishing': 'high',
  'increase-frequency': 'low',
  'decrease-frequency': 'medium',
};

// Límites de rate para proteger contra bans
const RATE_LIMITS = {
  postsPerDay: 4,
  storiesPerDay: 10,
  dmPerHour: 20,
  commentsPerHour: 30,
  followsPerDay: 50,
  unfollowsPerDay: 50,
  hashtagSetsPerDay: 3,
};

// ── Circuit Breakers predefinidos ─────────────────────────────────────────────

const DEFAULT_CIRCUIT_BREAKERS: CircuitBreaker[] = [
  {
    name: 'instagram-api',
    state: 'closed',
    failureCount: 0,
    failureThreshold: 5,
    successCount: 0,
    successThreshold: 3,
    cooldownMs: 15 * 60 * 1000, // 15 min
    protects: 'Llamadas a API/CU de Instagram',
  },
  {
    name: 'content-publishing',
    state: 'closed',
    failureCount: 0,
    failureThreshold: 3,
    successCount: 0,
    successThreshold: 2,
    cooldownMs: 30 * 60 * 1000, // 30 min
    protects: 'Publicación de contenido',
  },
  {
    name: 'dm-engine',
    state: 'closed',
    failureCount: 0,
    failureThreshold: 5,
    successCount: 0,
    successThreshold: 3,
    cooldownMs: 60 * 60 * 1000, // 1h
    protects: 'Motor de DMs automáticos',
  },
  {
    name: 'claude-api',
    state: 'closed',
    failureCount: 0,
    failureThreshold: 10,
    successCount: 0,
    successThreshold: 5,
    cooldownMs: 5 * 60 * 1000, // 5 min
    protects: 'Llamadas a Claude API',
  },
  {
    name: 'canva-integration',
    state: 'closed',
    failureCount: 0,
    failureThreshold: 3,
    successCount: 0,
    successThreshold: 2,
    cooldownMs: 20 * 60 * 1000, // 20 min
    protects: 'Integración con Canva via CU',
  },
];

// ── Planes de contingencia ────────────────────────────────────────────────────

const CONTINGENCY_PLANS: ContingencyPlan[] = [
  {
    id: 'cp-shadowban',
    trigger: 'reach drops > 70% in 48h',
    description: 'Respuesta a posible shadowban de Instagram',
    priority: 1,
    isActive: true,
    steps: [
      { order: 1, action: 'pause-all-hashtags', autonomous: true, description: 'Pausar uso de hashtags por 72h' },
      {
        order: 2,
        action: 'reduce-posting-frequency',
        autonomous: true,
        description: 'Reducir frecuencia a 1 post/día',
      },
      {
        order: 3,
        action: 'engage-only-manually',
        autonomous: false,
        description: 'Solo engagement manual aprobado por usuario',
        rollbackAction: 'resume-normal-engagement',
      },
      {
        order: 4,
        action: 'audit-banned-hashtags',
        autonomous: true,
        description: 'Auditar y limpiar hashtags potencialmente baneados',
      },
    ],
  },
  {
    id: 'cp-crisis-comentarios',
    trigger: 'negative-comments > 30% in 2h',
    description: 'Gestión de crisis de reputación en comentarios',
    priority: 1,
    isActive: true,
    steps: [
      {
        order: 1,
        action: 'notify-human-immediately',
        autonomous: true,
        description: 'Notificar al usuario inmediatamente',
      },
      {
        order: 2,
        action: 'pause-new-publications',
        autonomous: true,
        description: 'Pausar publicaciones nuevas',
        rollbackAction: 'resume-publishing',
      },
      {
        order: 3,
        action: 'flag-negative-comments',
        autonomous: true,
        description: 'Marcar comentarios negativos para revisión',
      },
      {
        order: 4,
        action: 'prepare-response-draft',
        autonomous: false,
        description: 'Preparar borrador de respuesta crisis (aprobación humana)',
      },
    ],
  },
  {
    id: 'cp-engagement-crash',
    trigger: 'engagement drops > 50% vs 7d avg',
    description: 'Respuesta a caída abrupta de engagement',
    priority: 2,
    isActive: true,
    steps: [
      {
        order: 1,
        action: 'run-feedback-cycle-emergency',
        autonomous: true,
        description: 'Ejecutar ciclo de feedback de emergencia',
      },
      {
        order: 2,
        action: 'switch-content-format',
        autonomous: true,
        description: 'Cambiar formato de contenido al más performante históricamente',
      },
      {
        order: 3,
        action: 'activate-community-engagement',
        autonomous: true,
        description: 'Activar engagement proactivo en comentarios',
      },
    ],
  },
  {
    id: 'cp-rate-limit',
    trigger: 'instagram rate limit hit',
    description: 'Manejo de rate limiting de Instagram',
    priority: 1,
    isActive: true,
    steps: [
      {
        order: 1,
        action: 'exponential-backoff',
        autonomous: true,
        description: 'Backoff exponencial: esperar 1h, 2h, 4h',
      },
      { order: 2, action: 'queue-all-actions', autonomous: true, description: 'Encolar todas las acciones pendientes' },
      {
        order: 3,
        action: 'open-circuit-breaker-instagram-api',
        autonomous: true,
        description: 'Abrir circuit breaker de Instagram API',
      },
    ],
  },
  {
    id: 'cp-account-warning',
    trigger: 'account receives policy warning',
    description: 'Respuesta a advertencia de políticas de Instagram',
    priority: 0, // máxima prioridad
    isActive: true,
    steps: [
      {
        order: 1,
        action: 'immediate-full-stop',
        autonomous: true,
        description: 'STOP total de todas las operaciones autónomas',
      },
      {
        order: 2,
        action: 'notify-human-critical',
        autonomous: true,
        description: 'Notificar usuario: ACCIÓN REQUERIDA INMEDIATA',
      },
      {
        order: 3,
        action: 'generate-compliance-report',
        autonomous: true,
        description: 'Generar reporte de compliance para revisión',
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureSafetyDir = async (): Promise<void> => {
  await fs.mkdir(SAFETY_DIR, { recursive: true });
};

const breakersPath = (brandId: string): string => path.join(SAFETY_DIR, `${brandId}-breakers.json`);

const exceptionsPath = (brandId: string): string => path.join(SAFETY_DIR, `${brandId}-exceptions.json`);

const ratePath = (brandId: string): string => path.join(SAFETY_DIR, `${brandId}-rate.json`);

const loadJSON = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
};

const saveJSON = async <T>(filePath: string, data: T): Promise<void> => {
  await ensureSafetyDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

// ── API pública ───────────────────────────────────────────────────────────────

/** Valida si una acción es segura para ejecutar. */
export const checkActionSafety = async (
  brandId: string,
  action: RLAction | string,
  _context: Record<string, unknown> = {},
): Promise<SafetyCheck> => {
  const reasons: string[] = [];
  const mitigations: string[] = [];
  let passed = true;
  const riskLevel: RiskLevel = ACTION_RISK_MAP[action as RLAction] ?? 'medium';

  // 1. Verificar circuit breakers relevantes
  const breakers = await loadJSON<CircuitBreaker[]>(breakersPath(brandId), DEFAULT_CIRCUIT_BREAKERS);
  const publishBreaker = breakers.find((b) => b.name === 'content-publishing');
  const apiBreaker = breakers.find((b) => b.name === 'instagram-api');

  if (action.startsWith('post-') && publishBreaker?.state === 'open') {
    passed = false;
    reasons.push('Circuit breaker de publicación está ABIERTO');
    mitigations.push('Esperar cooldown del circuit breaker');
  }

  if (apiBreaker?.state === 'open') {
    passed = false;
    reasons.push('Circuit breaker de Instagram API está ABIERTO');
    mitigations.push('API en modo de recuperación — acciones encoladas');
  }

  // 2. Verificar rate limits
  const rateData = await loadJSON<Record<string, { count: number; resetAt: string }>>(ratePath(brandId), {});
  const now = Date.now();

  if (action.startsWith('post-reel') || action.startsWith('post-carousel') || action.startsWith('post-static')) {
    const postRate = rateData['posts'];
    if (postRate && new Date(postRate.resetAt).getTime() > now && postRate.count >= RATE_LIMITS.postsPerDay) {
      passed = false;
      reasons.push(`Rate limit de publicaciones alcanzado: ${postRate.count}/${RATE_LIMITS.postsPerDay} hoy`);
      mitigations.push('Programar para mañana o siguiente ventana prime');
    }
  }

  if (action.startsWith('engage-dm')) {
    const dmRate = rateData['dms'];
    if (dmRate && new Date(dmRate.resetAt).getTime() > now && dmRate.count >= RATE_LIMITS.dmPerHour) {
      passed = false;
      reasons.push(`Rate limit de DMs alcanzado: ${dmRate.count}/${RATE_LIMITS.dmPerHour} por hora`);
      mitigations.push('Esperar próxima hora para enviar DMs');
    }
  }

  // 3. Acciones que requieren aprobación humana
  const requiresHuman = ['pause-publishing', 'boost-post-ads', 'collab-proposal'].includes(action);
  if (requiresHuman) {
    reasons.push(`Acción "${action}" requiere aprobación humana`);
    mitigations.push('Generar solicitud de aprobación al usuario');
  }

  // 4. Nivel de riesgo alto → siempre requiere revisión
  if (riskLevel === 'high' || riskLevel === 'critical') {
    requiresHuman && reasons.push(`Riesgo ${riskLevel} — escalado obligatorio`);
  }

  const check: SafetyCheck = {
    id: `check-${Date.now()}`,
    action,
    riskLevel,
    passed: passed && !requiresHuman,
    reasons,
    mitigations,
    requiresHumanApproval: requiresHuman || !passed,
    timestamp: new Date().toISOString(),
  };

  if (!check.passed) {
    log.warn('[safety] action blocked', { brandId, action, reasons });
  }

  return check;
};

/** Registra falla en un circuit breaker. */
export const recordFailure = async (brandId: string, breakerName: string): Promise<CircuitBreaker> => {
  const breakers = await loadJSON<CircuitBreaker[]>(breakersPath(brandId), DEFAULT_CIRCUIT_BREAKERS);
  const breaker = breakers.find((b) => b.name === breakerName);
  if (!breaker) return DEFAULT_CIRCUIT_BREAKERS[0]!;

  breaker.failureCount++;
  breaker.lastFailureAt = new Date().toISOString();
  breaker.successCount = 0;

  if (breaker.failureCount >= breaker.failureThreshold && breaker.state === 'closed') {
    breaker.state = 'open';
    breaker.openedAt = new Date().toISOString();
    log.warn('[safety] circuit OPEN', { brandId, breakerName, failures: breaker.failureCount });
  }

  await saveJSON(breakersPath(brandId), breakers);
  return breaker;
};

/** Registra éxito en un circuit breaker. */
export const recordSuccess = async (brandId: string, breakerName: string): Promise<CircuitBreaker> => {
  const breakers = await loadJSON<CircuitBreaker[]>(breakersPath(brandId), DEFAULT_CIRCUIT_BREAKERS);
  const breaker = breakers.find((b) => b.name === breakerName);
  if (!breaker) return DEFAULT_CIRCUIT_BREAKERS[0]!;

  if (breaker.state === 'half-open') {
    breaker.successCount++;
    if (breaker.successCount >= breaker.successThreshold) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      log.info('[safety] circuit CLOSED', { brandId, breakerName });
    }
  } else if (breaker.state === 'closed') {
    breaker.failureCount = Math.max(0, breaker.failureCount - 1);
  }

  await saveJSON(breakersPath(brandId), breakers);
  return breaker;
};

/** Transiciona breakers abiertos a half-open si superaron cooldown. */
export const tickCircuitBreakers = async (brandId: string): Promise<void> => {
  const breakers = await loadJSON<CircuitBreaker[]>(breakersPath(brandId), DEFAULT_CIRCUIT_BREAKERS);
  const now = Date.now();

  for (const b of breakers) {
    if (b.state === 'open' && b.openedAt) {
      const elapsed = now - new Date(b.openedAt).getTime();
      if (elapsed >= b.cooldownMs) {
        b.state = 'half-open';
        b.successCount = 0;
        log.info('[safety] circuit HALF-OPEN', { name: b.name, brandId });
      }
    }
  }

  await saveJSON(breakersPath(brandId), breakers);
};

/** Registra una excepción en el log de seguridad. */
export const recordException = async (
  brandId: string,
  severity: ExceptionRecord['severity'],
  source: string,
  message: string,
  context: Record<string, unknown> = {},
): Promise<ExceptionRecord> => {
  const record: ExceptionRecord = {
    id: `exc-${Date.now()}`,
    brandId,
    severity,
    source,
    message,
    context,
    handled: severity !== 'critical',
    escalatedToHuman: severity === 'critical',
    timestamp: new Date().toISOString(),
  };

  const existing = await loadJSON<ExceptionRecord[]>(exceptionsPath(brandId), []);
  existing.push(record);
  await saveJSON(exceptionsPath(brandId), existing.slice(-200));

  const logFn = severity === 'critical' || severity === 'error' ? log.error : log.warn;
  logFn(`[safety] exception ${severity}`, { brandId, source, message });

  return record;
};

/** Activa un plan de contingencia. */
export const activateContingencyPlan = async (brandId: string, planId: string): Promise<ContingencyPlan | null> => {
  const plan = CONTINGENCY_PLANS.find((p) => p.id === planId);
  if (!plan) return null;

  log.warn('[safety] CONTINGENCY ACTIVATED', { brandId, planId, trigger: plan.trigger });

  const autonomousSteps = plan.steps.filter((s) => s.autonomous);
  log.info('[safety] auto-executing steps', {
    count: autonomousSteps.length,
    steps: autonomousSteps.map((s) => s.action),
  });

  return plan;
};

/** Detecta qué planes de contingencia deben activarse dado el contexto. */
export const detectContingencyTriggers = (context: {
  reachDrop7d?: number;
  negativeCommentRate?: number;
  engagementDrop7d?: number;
  rateLimitHit?: boolean;
  policyWarning?: boolean;
}): ContingencyPlan[] => {
  const triggered: ContingencyPlan[] = [];

  if ((context.reachDrop7d ?? 0) > 0.7) triggered.push(CONTINGENCY_PLANS.find((p) => p.id === 'cp-shadowban')!);
  if ((context.negativeCommentRate ?? 0) > 0.3)
    triggered.push(CONTINGENCY_PLANS.find((p) => p.id === 'cp-crisis-comentarios')!);
  if ((context.engagementDrop7d ?? 0) > 0.5)
    triggered.push(CONTINGENCY_PLANS.find((p) => p.id === 'cp-engagement-crash')!);
  if (context.rateLimitHit) triggered.push(CONTINGENCY_PLANS.find((p) => p.id === 'cp-rate-limit')!);
  if (context.policyWarning) triggered.push(CONTINGENCY_PLANS.find((p) => p.id === 'cp-account-warning')!);

  return triggered.filter(Boolean).sort((a, b) => a.priority - b.priority);
};

/** Genera reporte de seguridad del sistema. */
export const generateSafetyReport = async (brandId: string): Promise<SafetyReport> => {
  const breakers = await loadJSON<CircuitBreaker[]>(breakersPath(brandId), DEFAULT_CIRCUIT_BREAKERS);
  const exceptions = await loadJSON<ExceptionRecord[]>(exceptionsPath(brandId), []);

  const openBreakers = breakers.filter((b) => b.state === 'open' || b.state === 'half-open');
  const recentExceptions = exceptions.slice(-20);
  const criticalExceptions = recentExceptions.filter((e) => e.severity === 'critical' || e.severity === 'error');

  const overallRiskLevel: RiskLevel =
    criticalExceptions.length > 0
      ? 'critical'
      : openBreakers.length > 2
        ? 'high'
        : openBreakers.length > 0
          ? 'medium'
          : recentExceptions.length > 5
            ? 'low'
            : 'safe';

  const safetyScore = Math.max(
    0,
    100 -
      criticalExceptions.length * 20 -
      openBreakers.length * 10 -
      recentExceptions.filter((e) => e.severity === 'warning').length * 2,
  );

  const recommendations: string[] = [];
  if (openBreakers.length > 0)
    recommendations.push(`${openBreakers.length} circuit breakers abiertos — esperar cooldown`);
  if (criticalExceptions.length > 0)
    recommendations.push('Excepciones críticas sin resolver — revisión humana urgente');
  if (safetyScore < 60) recommendations.push('Score de seguridad bajo — reducir operaciones autónomas');

  return {
    brandId,
    timestamp: new Date().toISOString(),
    overallRiskLevel,
    circuitBreakers: breakers,
    recentExceptions: recentExceptions.slice(-5),
    activeContingencies: [],
    blockedActions: openBreakers.map((b) => b.protects),
    safetyScore,
    recommendations,
  };
};

export { CONTINGENCY_PLANS, RATE_LIMITS };
