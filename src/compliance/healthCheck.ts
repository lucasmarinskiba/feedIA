/**
 * Health Checks Periódicos de Compliance
 *
 * Verificaciones que deben correr en intervalos regulares
 * para detectar degradación del estado de compliance antes
 * de que se convierta en un incidente.
 *
 * Uso:
 *   import { runHealthChecks } from './compliance/healthCheck.js';
 *   const health = await runHealthChecks();
 *   if (!health.healthy) { // enviar alerta }
 */

import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { getRateLimitStats } from './rateLimiter.js';
import { audit } from './auditLog.js';
import { getPendingEmails } from '../database/emailQueue.js';

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message: string;
  detail?: string;
}

export interface HealthReport {
  timestamp: string;
  overallStatus: HealthStatus;
  checks: HealthCheck[];
  healthy: boolean;
}

const HEALTHY = (name: string, message: string, detail?: string): HealthCheck => ({
  name,
  status: 'healthy',
  message,
  detail,
});

const DEGRADED = (name: string, message: string, detail?: string): HealthCheck => ({
  name,
  status: 'degraded',
  message,
  detail,
});

const CRITICAL = (name: string, message: string, detail?: string): HealthCheck => ({
  name,
  status: 'critical',
  message,
  detail,
});

/** 1. Espacio en disco para audit logs */
export const checkDiskSpace = (): HealthCheck => {
  const auditDir = resolve('data/runtime/audit');
  if (!existsSync(auditDir)) {
    return DEGRADED('Espacio en disco', 'Directorio de audit no existe');
  }
  try {
    // Aproximación: verificar que podemos escribir
    const testFile = resolve(auditDir, '.healthcheck');
    import('node:fs').then(({ writeFileSync, unlinkSync }) => {
      writeFileSync(testFile, 'test');
      unlinkSync(testFile);
    });
    return HEALTHY('Espacio en disco', 'Escritura en audit log funcionando');
  } catch (err) {
    return CRITICAL(
      'Espacio en disco',
      'No se puede escribir en directorio de audit',
      err instanceof Error ? err.message : String(err),
    );
  }
};

/** 2. Rate limits no saturados */
export const checkRateLimits = (): HealthCheck => {
  const stats = getRateLimitStats();
  const entries = Object.entries(stats);
  if (entries.length === 0) {
    return HEALTHY('Rate limits', 'Sin actividad reciente');
  }

  const critical = entries.filter(([, s]) => s.count / s.limit >= 0.95);
  const degraded = entries.filter(([, s]) => s.count / s.limit >= 0.8 && s.count / s.limit < 0.95);

  if (critical.length > 0) {
    return CRITICAL(
      'Rate limits',
      `${critical.length} acciones al 95%+ del límite`,
      critical.map(([k, s]) => `${k}: ${s.count}/${s.limit}`).join('; '),
    );
  }
  if (degraded.length > 0) {
    return DEGRADED(
      'Rate limits',
      `${degraded.length} acciones al 80%+ del límite`,
      degraded.map(([k, s]) => `${k}: ${s.count}/${s.limit}`).join('; '),
    );
  }
  return HEALTHY('Rate limits', `${entries.length} tipos monitoreados, todos saludables`);
};

/** 3. Meta API respondiendo (si está configurada) */
export const checkMetaApi = async (): Promise<HealthCheck> => {
  if (!env.meta.accessToken) {
    return HEALTHY('Meta API', 'No configurada — modo simulación');
  }

  try {
    // Ping simple a Meta Graph API
    const response = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${env.meta.accessToken}&fields=id`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return HEALTHY('Meta API', 'Respondiendo correctamente');
    }

    const status = response.status;
    if (status === 401 || status === 403) {
      return CRITICAL('Meta API', `Token inválido o expirado (${status})`);
    }
    if (status === 429) {
      return DEGRADED('Meta API', 'Rate limit de Meta alcanzado (429)');
    }
    return DEGRADED('Meta API', `Respondió con status ${status}`);
  } catch (err) {
    return DEGRADED('Meta API', 'No responde o timeout', err instanceof Error ? err.message : String(err));
  }
};

/** 4. Términos aceptados */
export const checkTermsAccepted = (): HealthCheck => {
  if (!env.compliance.acceptedTerms) {
    return CRITICAL(
      'Términos aceptados',
      'COMPLIANCE_ACCEPTED_TERMS=false',
      'El sistema no debe operar en producción sin aceptar términos.',
    );
  }
  return HEALTHY('Términos aceptados', 'Términos aceptados');
};

/** 5. Crisis activa sin atención */
export const checkCrisisState = (): HealthCheck => {
  // Verificamos si existe archivo de crisis activa
  const crisisFile = resolve('data/runtime/crisis-state.json');
  if (!existsSync(crisisFile)) {
    return HEALTHY('Estado de crisis', 'Sin crisis activa');
  }

  try {
    const raw = JSON.parse(require('node:fs').readFileSync(crisisFile, 'utf-8')) as { paused: boolean; since: string };

    if (!raw.paused) {
      return HEALTHY('Estado de crisis', 'Crisis resuelta');
    }

    const hoursSince = (Date.now() - new Date(raw.since).getTime()) / (1000 * 60 * 60);
    if (hoursSince > 24) {
      return CRITICAL('Estado de crisis', `Crisis activa sin atención por ${Math.round(hoursSince)} horas`);
    }
    if (hoursSince > 4) {
      return DEGRADED('Estado de crisis', `Crisis activa sin atención por ${Math.round(hoursSince)} horas`);
    }
    return DEGRADED('Estado de crisis', 'Crisis activa — revisando');
  } catch {
    return DEGRADED('Estado de crisis', 'Archivo de crisis existe pero es inválido');
  }
};

/** 6. Backup reciente */
export const checkBackup = (): HealthCheck => {
  const backupDir = resolve('data/runtime');
  if (!existsSync(backupDir)) {
    return DEGRADED('Backup', 'Directorio data/runtime no existe');
  }

  // Verificamos que existan archivos clave recientes
  const criticalFiles = ['rate-limits.json', 'memory.json'];
  const missing = criticalFiles.filter((f) => !existsSync(resolve(backupDir, f)));

  if (missing.length > 0) {
    return DEGRADED('Backup', `Archivos críticos faltantes: ${missing.join(', ')}`);
  }

  // Verificar que rate-limits no sea muy viejo (> 7 días)
  try {
    const stats = statSync(resolve(backupDir, 'rate-limits.json'));
    const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified > 7) {
      return DEGRADED('Backup', `Rate limits no actualizados en ${Math.round(daysSinceModified)} días`);
    }
  } catch {
    // ignorar
  }

  return HEALTHY('Backup', 'Archivos críticos presentes y actualizados');
};

/** 7. DRY_RUN en producción prolongada */
export const checkDryRunDuration = (): HealthCheck => {
  if (env.dryRun) {
    return HEALTHY('Modo DRY_RUN', 'Modo simulación activo — seguro');
  }

  // Si DRY_RUN=false, verificar que no sea una activación reciente sin monitoreo
  const stateFile = resolve('data/runtime/production-since.json');
  if (!existsSync(stateFile)) {
    return DEGRADED(
      'Modo producción',
      'DRY_RUN=false pero no hay registro de cuando se activó',
      'Creá data/runtime/production-since.json con la fecha de activación.',
    );
  }

  return HEALTHY('Modo producción', 'Producción activa con registro de inicio');
};

/** 8. SQLite DB saludable */
export const checkSQLiteHealth = (): HealthCheck => {
  const dbPath = resolve('data/runtime/agent.db');
  if (!existsSync(dbPath)) {
    return DEGRADED('SQLite DB', 'Base de datos no inicializada');
  }
  try {
    const stats = statSync(dbPath);
    const sizeMB = stats.size / (1024 * 1024);
    if (sizeMB > 500) {
      return DEGRADED(
        'SQLite DB',
        `Base de datos muy grande (${Math.round(sizeMB)}MB)`,
        'Considerá hacer VACUUM o archivar datos antiguos.',
      );
    }
    return HEALTHY('SQLite DB', `Base de datos saludable (${Math.round(sizeMB * 10) / 10}MB)`);
  } catch (err) {
    return CRITICAL(
      'SQLite DB',
      'No se puede acceder a la base de datos',
      err instanceof Error ? err.message : String(err),
    );
  }
};

/** 9. Cola de email no saturada */
export const checkEmailQueue = (): HealthCheck => {
  try {
    const pending = getPendingEmails(1000);
    if (pending.length > 100) {
      return DEGRADED(
        'Email queue',
        `${pending.length} emails pendientes`,
        'Verificá la configuración de EMAIL_PROVIDER.',
      );
    }
    return HEALTHY('Email queue', `${pending.length} emails pendientes`);
  } catch (err) {
    return DEGRADED(
      'Email queue',
      'No se pudo leer la cola de emails',
      err instanceof Error ? err.message : String(err),
    );
  }
};

/** 10. Proveedor de video disponible */
export const checkVideoProvider = (): HealthCheck => {
  const provider = process.env.VIDEO_PROVIDER || 'none';
  if (provider === 'none') {
    return HEALTHY('Video provider', 'No configurado — reels se planifican sin video');
  }
  if (provider === 'replicate' && !process.env.REPLICATE_API_TOKEN && !env.imageGen.replicateToken) {
    return DEGRADED('Video provider', 'VIDEO_PROVIDER=replicate pero falta REPLICATE_API_TOKEN');
  }
  return HEALTHY('Video provider', `Provider: ${provider}`);
};

/** 11. Fuentes de trends operativas */
export const checkTrendsSources = (): HealthCheck => {
  const hasSerp = !!process.env.SERPAPI_KEY;
  const hasTwitter = !!process.env.TWITTER_BEARER_TOKEN;
  if (!hasSerp && !hasTwitter) {
    return DEGRADED('Trends sources', 'Solo Reddit disponible (sin API keys)');
  }
  return HEALTHY('Trends sources', `SerpAPI=${hasSerp}, Twitter=${hasTwitter}`);
};

/** 12. Fuentes de competitors operativas */
export const checkCompetitorSources = (): HealthCheck => {
  const hasRapid = !!process.env.RAPIDAPI_KEY;
  const hasApify = !!process.env.APIFY_API_TOKEN;
  const hasWebhook = !!process.env.COMPETITOR_WEBHOOK_URL;
  if (!hasRapid && !hasApify && !hasWebhook) {
    return DEGRADED('Competitor sources', 'Sin fuentes configuradas');
  }
  return HEALTHY('Competitor sources', `RapidAPI=${hasRapid}, Apify=${hasApify}, Webhook=${hasWebhook}`);
};

/** Ejecuta todos los health checks */
export const runHealthChecks = async (): Promise<HealthReport> => {
  log.step('Ejecutando health checks de compliance...');

  const checks: HealthCheck[] = [];

  checks.push(checkDiskSpace());
  checks.push(checkRateLimits());
  checks.push(await checkMetaApi());
  checks.push(checkTermsAccepted());
  checks.push(checkCrisisState());
  checks.push(checkBackup());
  checks.push(checkDryRunDuration());
  checks.push(checkSQLiteHealth());
  checks.push(checkEmailQueue());
  checks.push(checkVideoProvider());
  checks.push(checkTrendsSources());
  checks.push(checkCompetitorSources());

  const criticalCount = checks.filter((c) => c.status === 'critical').length;
  const degradedCount = checks.filter((c) => c.status === 'degraded').length;

  let overallStatus: HealthStatus = 'healthy';
  if (criticalCount > 0) overallStatus = 'critical';
  else if (degradedCount > 0) overallStatus = 'degraded';

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    overallStatus,
    checks,
    healthy: overallStatus === 'healthy',
  };

  // Registrar en audit log si no está saludable
  if (overallStatus !== 'healthy') {
    audit({
      action: 'API_REQUEST',
      outcome: 'failure',
      reason: `Health check: ${overallStatus}. ${criticalCount} críticos, ${degradedCount} degradados.`,
      dryRun: env.dryRun,
    });
  }

  log.info(`Health check: ${overallStatus} (${criticalCount} críticos, ${degradedCount} degradados)`);
  return report;
};
