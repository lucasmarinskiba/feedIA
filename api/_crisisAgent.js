/**
 * Crisis Agent — detección + escalación de crisis de marca.
 *
 * Monitorea menciones críticas, tweets negativos virales, etc.
 * Clasifica por severidad, dispara protocolo de respuesta, circuit-breaker
 * para crisis muy grandes (stop auto-publishing, notify human).
 *
 * Integración: usa Mention Tracker + cron-based check.
 */

import { getMentionStats, getCriticalMentions } from './_mentionTracker.js';
import { getProfile, saveProfile } from './_accountMemory.js';
import { askLLM } from './_llm.js';
import { triggerCrisisAlert } from './_crisisAlerts.js';

// ── Severidad de crisis ───────────────────────────────────────────────────────

const CRISIS_LEVELS = {
  CLEAR: { level: 0, name: 'clear', color: 'green' },
  WARNING: { level: 1, name: 'warning', color: 'yellow' },
  ELEVATED: { level: 2, name: 'elevated', color: 'orange' },
  CRITICAL: { level: 3, name: 'critical', color: 'red' },
  CATASTROPHIC: { level: 4, name: 'catastrophic', color: 'darkred' },
};

// ── Evaluación de severidad ───────────────────────────────────────────────────

const computeCrisisSeverity = async (stats) => {
  const {
    total = 0,
    last30Days = 0,
    sentiment = {},
    importance = {},
    unacknowledged = 0,
    influencerMentions = 0,
  } = stats || {};

  let score = 0;
  const triggers = [];

  // Trigger: menciones críticas pendientes
  if (importance.critical > 2) {
    score += 30;
    triggers.push(`${importance.critical} critical unacknowledged mentions`);
  }
  if (importance.critical > 5) {
    score += 20;
    triggers.push('Multiple critical mentions (5+)');
  }

  // Trigger: sentimiento muy negativo
  const negativeRatio = sentiment.critical + (sentiment.negative || 0);
  if (last30Days > 0 && negativeRatio / last30Days > 0.3) {
    score += 25;
    triggers.push(`High negative ratio (${Math.round((negativeRatio / last30Days) * 100)}%)`);
  }

  // Trigger: influencers mencionando negativamente
  if (influencerMentions > 3) {
    score += 20;
    triggers.push(`${influencerMentions} influencer mentions`);
  }

  // Trigger: respuesta rate bajo
  const responseRate = total > 0 ? ((total - unacknowledged) / total) * 100 : 100;
  if (responseRate < 30 && unacknowledged > 5) {
    score += 15;
    triggers.push(`Low response rate (${Math.round(responseRate)}%, ${unacknowledged} unacknowledged)`);
  }

  // Trigger: volumen anómalo
  const avgDaily = last30Days / 30;
  if (avgDaily > 50 && last30Days > 100) {
    score += 20;
    triggers.push(`High volume (${last30Days} last 30 days, avg ${Math.round(avgDaily)}/day)`);
  }

  // Mapear score a nivel de crisis
  let level = CRISIS_LEVELS.CLEAR;
  if (score >= 80) level = CRISIS_LEVELS.CATASTROPHIC;
  else if (score >= 60) level = CRISIS_LEVELS.CRITICAL;
  else if (score >= 40) level = CRISIS_LEVELS.ELEVATED;
  else if (score >= 20) level = CRISIS_LEVELS.WARNING;

  return { score, level, triggers };
};

// ── Protocol de respuesta según severidad ─────────────────────────────────────

const getResponseProtocol = (severity) => {
  const { level, name } = severity;

  if (level === CRISIS_LEVELS.CLEAR.level) {
    return {
      action: 'monitor',
      description: 'Situation normal. Continue regular monitoring.',
      autoPublish: true,
      escalateToHuman: false,
      responseTime: null,
    };
  }

  if (level === CRISIS_LEVELS.WARNING.level) {
    return {
      action: 'alert',
      description: 'Elevated attention needed. Monitor closely.',
      autoPublish: true,
      escalateToHuman: false,
      responseTime: '2 hours',
      recommendations: ['Increase mention monitoring frequency', 'Prepare rapid response templates'],
    };
  }

  if (level === CRISIS_LEVELS.ELEVATED.level) {
    return {
      action: 'standby',
      description: 'Potential crisis emerging. Activate response team.',
      autoPublish: true, // Still allow, but with additional tone checks
      escalateToHuman: true,
      escalationLevel: 'manager',
      responseTime: '30 minutes',
      recommendations: [
        'Notify crisis manager',
        'Prepare press statement',
        'Monitor social trending',
        'Prepare FAQ responses for common questions',
      ],
    };
  }

  if (level === CRISIS_LEVELS.CRITICAL.level) {
    return {
      action: 'crisis-mode',
      description: 'Crisis detected. Activate emergency protocol.',
      autoPublish: false, // CIRCUIT BREAKER: stop auto-publishing
      escalateToHuman: true,
      escalationLevel: 'exec',
      responseTime: 'IMMEDIATE',
      circuitBreakerActive: true,
      recommendations: [
        'IMMEDIATE: Notify C-suite',
        'Pause all scheduled posts (circuit breaker active)',
        'Assign crisis manager',
        'Prepare apology/response statement',
        'Monitor trending closely',
        'Engage legal if needed',
      ],
    };
  }

  if (level === CRISIS_LEVELS.CATASTROPHIC.level) {
    return {
      action: 'full-lockdown',
      description: 'CATASTROPHIC CRISIS. Full emergency response.',
      autoPublish: false, // HARD CIRCUIT BREAKER
      escalateToHuman: true,
      escalationLevel: 'ceo',
      responseTime: 'IMMEDIATE',
      circuitBreakerActive: true,
      notificationChannel: ['email', 'webhook', 'sms'],
      recommendations: [
        'IMMEDIATE: CEO + PR director notified',
        'PAUSE all social activity immediately',
        'Activate crisis management team',
        'Call emergency board meeting if needed',
        'Prepare major public statement',
        'Consider media outreach',
        'Engage PR firm + legal',
        'Setup media monitoring 24/7',
      ],
    };
  }

  return {
    action: 'unknown',
    autoPublish: true,
    escalateToHuman: false,
  };
};

// ── Generar crisis report ─────────────────────────────────────────────────────

const generateCrisisReport = async (scope, accountId, severity, mentions) => {
  const { critical = [] } = mentions || {};

  const timeline = critical.slice(0, 5).map((m) => ({
    when: m.detectedAt,
    author: m.authorUsername,
    sentiment: m.sentiment,
    importance: m.importance,
    text: m.context,
  }));

  const protocol = getResponseProtocol(severity);

  return {
    timestamp: new Date().toISOString(),
    accountId,
    severityScore: severity.score,
    severityLevel: severity.level.name,
    triggers: severity.triggers,
    timelineLastCritical: timeline,
    protocol,
    generatedReport: `Crisis Report: ${severity.level.name.toUpperCase()}. Score: ${severity.score}/100. Triggers: ${severity.triggers.join(', ')}`,
  };
};

// ── Obtener/guardar crisis state ──────────────────────────────────────────────

const loadCrisisState = async (scope, accountId) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  return profile?.crisisState || { level: CRISIS_LEVELS.CLEAR.level, since: null, circuitBreakerActive: false };
};

const saveCrisisState = async (scope, accountId, crisisState) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  await saveProfile(scope, accountId, { ...profile, crisisState });
};

// ── Chequear crisis + generar report ──────────────────────────────────────────

export const assessCrisis = async (scope, accountId) => {
  const stats = await getMentionStats(scope, accountId).catch(() => ({}));
  const mentions = await getCriticalMentions(scope, accountId).catch(() => ({}));
  const severity = await computeCrisisSeverity(stats);
  const report = await generateCrisisReport(scope, accountId, severity, mentions);

  // Guardar estado de crisis
  const newState = {
    level: severity.level.level,
    since: new Date().toISOString(),
    circuitBreakerActive: report.protocol.circuitBreakerActive || false,
    lastSeverityScore: severity.score,
    lastTriggers: severity.triggers,
  };

  await saveCrisisState(scope, accountId, newState);

  // Dispara alertas si CRITICAL+
  if (report.protocol.circuitBreakerActive) {
    await triggerCrisisAlert(scope, accountId, report).catch(() => null);
  }

  return report;
};

// ── Evaluar si el circuit breaker debe activarse ────────────────────────────

export const shouldCircuitBreak = async (scope, accountId) => {
  const crisisState = await loadCrisisState(scope, accountId);
  return Boolean(crisisState.circuitBreakerActive);
};

// ── Resetear crisis state (cuando se resuelve) ───────────────────────────────

export const resolveCrisis = async (scope, accountId, resolution = '') => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  await saveProfile(scope, accountId, {
    ...profile,
    crisisState: { level: CRISIS_LEVELS.CLEAR.level, since: null, circuitBreakerActive: false },
    crisisLog: [...(profile.crisisLog || []), { resolvedAt: new Date().toISOString(), resolution }],
  });
  return { ok: true };
};

// ── Histórico de crisis ───────────────────────────────────────────────────────

export const getCrisisHistory = async (scope, accountId, limit = 20) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const history = profile.crisisLog || [];
  return history.slice(-limit);
};

// ── HTTP handler ──────────────────────────────────────────────────────────────

export const handleCrisisAgent = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  // GET /api/crisis/assess
  if (path === '/api/crisis/assess' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const report = await assessCrisis(scope, accountId).catch(() => null);
    return json(report ? 200 : 500, report || { ok: false, error: 'assess-failed' });
  }

  // GET /api/crisis/circuit-breaker
  if (path === '/api/crisis/circuit-breaker' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const active = await shouldCircuitBreak(scope, accountId);
    return json(200, { ok: true, circuitBreakerActive: active });
  }

  // POST /api/crisis/resolve
  if (path === '/api/crisis/resolve' && m === 'POST') {
    const { resolution } = body || {};
    const accountId = body?.accountId || scope;
    const result = await resolveCrisis(scope, accountId, resolution).catch(() => null);
    return json(result?.ok ? 200 : 500, result || { ok: false, error: 'resolve-failed' });
  }

  // GET /api/crisis/history
  if (path === '/api/crisis/history' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const limit = parseInt(req.query?.limit || '20', 10);
    const history = await getCrisisHistory(scope, accountId, limit).catch(() => []);
    return json(200, { ok: true, history });
  }

  return false;
};
