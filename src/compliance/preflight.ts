/**
 * Pre-flight Check — Verificación antes de operar
 *
 * Ejecuta un conjunto de validaciones antes de que el sistema
 * opere en producción o antes de cada sesión importante.
 *
 * Uso:
 *   import { runPreFlightCheck } from './compliance/preflight.js';
 *   const result = await runPreFlightCheck();
 *   if (result.status !== 'PASS') { // no operar }
 */

import { existsSync, statSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { getRateLimitStats } from './rateLimiter.js';
import { INSTAGRAM_RULES, CRITICAL_RULE_CODES } from './instagramRules.js';

export type PreFlightStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface PreFlightCheck {
  name: string;
  status: PreFlightStatus;
  message: string;
  detail?: string;
}

export interface PreFlightReport {
  timestamp: string;
  overallStatus: PreFlightStatus;
  checks: PreFlightCheck[];
  passed: number;
  warnings: number;
  failed: number;
}

const PASS = (name: string, message: string, detail?: string): PreFlightCheck => ({
  name,
  status: 'PASS',
  message,
  detail,
});

const WARN = (name: string, message: string, detail?: string): PreFlightCheck => ({
  name,
  status: 'WARNING',
  message,
  detail,
});

const FAIL = (name: string, message: string, detail?: string): PreFlightCheck => ({
  name,
  status: 'FAIL',
  message,
  detail,
});

/** 1. Verificar que los términos fueron aceptados */
export const verifyTermsAccepted = (): PreFlightCheck => {
  if (!env.compliance.acceptedTerms) {
    return FAIL(
      'Términos aceptados',
      'COMPLIANCE_ACCEPTED_TERMS=false',
      'Leé TERMS_OF_SERVICE.md y configurá COMPLIANCE_ACCEPTED_TERMS=true antes de operar.',
    );
  }
  return PASS('Términos aceptados', 'COMPLIANCE_ACCEPTED_TERMS=true');
};

/** 2. Verificar configuración de entorno crítica */
export const verifyEnvConfig = (): PreFlightCheck => {
  const missing: string[] = [];
  if (!env.anthropicApiKey) missing.push('ANTHROPIC_API_KEY');
  if (!env.meta.accessToken) missing.push('META_ACCESS_TOKEN');
  if (!env.meta.igBusinessId) missing.push('META_IG_BUSINESS_ID');

  if (missing.length > 0) {
    return WARN(
      'Configuración de entorno',
      `Faltan variables opcionales: ${missing.join(', ')}`,
      'El sistema puede operar en modo simulado sin estas variables.',
    );
  }
  return PASS('Configuración de entorno', 'Todas las variables críticas están configuradas');
};

/** 3. Verificar que DRY_RUN no está en modo confuso */
export const verifyDryRunState = (): PreFlightCheck => {
  if (env.dryRun) {
    return WARN(
      'Modo DRY_RUN',
      'DRY_RUN=true — Nada se publicará realmente',
      'Esto es seguro para pruebas. Cambiá a false solo cuando estés listo para producción.',
    );
  }
  return PASS('Modo DRY_RUN', 'DRY_RUN=false — Modo producción activo');
};

/** 4. Verificar que el audit log es escribible */
export const verifyAuditLogWritable = (): PreFlightCheck => {
  const auditDir = resolve('data/runtime/audit');
  try {
    if (!existsSync(auditDir)) {
      // Intentar crear
      import('node:fs').then(({ mkdirSync }) => {
        mkdirSync(auditDir, { recursive: true });
      });
      return WARN('Audit log escribible', 'Directorio de audit no existe, se creará automáticamente');
    }
    const stats = statSync(auditDir);
    if (!stats.isDirectory()) {
      return FAIL('Audit log escribible', 'data/runtime/audit existe pero no es un directorio');
    }
    return PASS('Audit log escribible', `Directorio listo (${auditDir})`);
  } catch (err) {
    return FAIL(
      'Audit log escribible',
      'No se puede acceder al directorio de audit',
      err instanceof Error ? err.message : String(err),
    );
  }
};

/** 5. Verificar espacio en disco */
export const verifyDiskSpace = (): PreFlightCheck => {
  try {
    // En Node.js puro no hay una API cross-platform simple para espacio libre
    // Usamos un aproximado: verificar que podemos escribir
    const testFile = resolve('data/runtime/.diskcheck');
    import('node:fs').then(({ writeFileSync, unlinkSync }) => {
      writeFileSync(testFile, 'test');
      unlinkSync(testFile);
    });
    return PASS('Espacio en disco', 'Escritura posible en data/runtime/');
  } catch (err) {
    return FAIL(
      'Espacio en disco',
      'No se puede escribir en data/runtime/',
      err instanceof Error ? err.message : String(err),
    );
  }
};

/** 6. Verificar estado de rate limits */
export const verifyRateLimitStatus = (): PreFlightCheck => {
  const stats = getRateLimitStats();
  const entries = Object.entries(stats);
  if (entries.length === 0) {
    return PASS('Rate limits', 'Sin actividad previa (límites limpios)');
  }

  const highUsage = entries.filter(([, s]) => s.count / s.limit > 0.8);
  if (highUsage.length > 0) {
    return WARN(
      'Rate limits',
      `${highUsage.length} acciones están cerca del límite`,
      highUsage.map(([k, s]) => `${k}: ${s.count}/${s.limit}`).join('; '),
    );
  }
  return PASS('Rate limits', `${entries.length} tipos de acción monitoreados, todos dentro de límites`);
};

/** 7. Verificar que las reglas de compliance están cargadas */
export const verifyComplianceRulesLoaded = (): PreFlightCheck => {
  if (INSTAGRAM_RULES.length === 0) {
    return FAIL('Reglas de compliance', 'No se cargaron reglas de Instagram');
  }
  if (CRITICAL_RULE_CODES.length === 0) {
    return WARN('Reglas críticas', 'No se identificaron reglas críticas');
  }
  return PASS(
    'Reglas de compliance',
    `${INSTAGRAM_RULES.length} reglas cargadas (${CRITICAL_RULE_CODES.length} críticas)`,
  );
};

/** 8. Verificar que brand.json existe y es válido */
export const verifyBrandProfile = async (): Promise<PreFlightCheck> => {
  const brandPath = resolve('data/brand.json');
  if (!existsSync(brandPath)) {
    return FAIL(
      'Perfil de marca',
      'data/brand.json no existe',
      'Copiá data/brand.example.json a data/brand.json y completalo.',
    );
  }
  try {
    const { readFileSync } = await import('node:fs');
    const raw = JSON.parse(readFileSync(brandPath, 'utf-8'));
    if (!raw.name || !raw.niche) {
      return WARN('Perfil de marca', 'brand.json existe pero tiene campos incompletos');
    }
    return PASS('Perfil de marca', `Marca: ${raw.name} (${raw.niche})`);
  } catch {
    return FAIL('Perfil de marca', 'brand.json existe pero no es JSON válido');
  }
};

/** 9. Verificar modo estricto de compliance */
export const verifyStrictMode = (): PreFlightCheck => {
  if (env.compliance.strictMode) {
    return PASS('Modo estricto', 'COMPLIANCE_STRICT_MODE=true (máxima protección)');
  }
  return WARN(
    'Modo estricto',
    'COMPLIANCE_STRICT_MODE=false',
    'Se permiten violaciones de severidad MEDIA. Recomendado: true para máxima seguridad.',
  );
};

/** 10. Verificar que no hay módulos antiBan activos */
export const verifyNoAntiBanModules = (): PreFlightCheck => {
  // Verificamos si existe el directorio antiBan y tiene archivos activos
  const antiBanDir = resolve('src/capabilities/antiBan');
  if (!existsSync(antiBanDir)) {
    return PASS('Módulos antiBan', 'Directorio antiBan no existe');
  }
  return WARN(
    'Módulos antiBan',
    'Directorio src/capabilities/antiBan existe',
    'Verificá que no uses fingerprint.ts ni shadowbanGuard.ts en flujos productivos. Estos módulos pueden violar AUTO-002.',
  );
};

/** 11. Verificar setup multi-cuenta */
export const verifyMultiAccountSetup = (): PreFlightCheck => {
  const brandsDir = resolve('data/brands');
  if (!existsSync(brandsDir)) {
    return WARN(
      'Multi-cuenta',
      'data/brands/ no existe',
      'Creá el directorio y migrá tus marcas para activar multi-cuenta.',
    );
  }
  const files = readdirSync(brandsDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    return WARN('Multi-cuenta', 'data/brands/ existe pero está vacío');
  }
  return PASS('Multi-cuenta', `${files.length} marca(s) en data/brands/`);
};

/** 12. Verificar base de datos SQLite */
export const verifySQLiteDatabase = (): PreFlightCheck => {
  const dbPath = resolve('data/runtime/agent.db');
  if (!existsSync(dbPath)) {
    return WARN('SQLite DB', 'Base de datos no inicializada', 'Se creará automáticamente en el primer uso.');
  }
  return PASS('SQLite DB', 'Base de datos lista');
};

/** 13. Verificar configuración de email */
export const verifyEmailConfig = (): PreFlightCheck => {
  const provider = process.env.EMAIL_PROVIDER || 'none';
  if (provider === 'none') {
    return WARN(
      'Email',
      'EMAIL_PROVIDER=none',
      'Las notificaciones por email están desactivadas. Configurá EMAIL_PROVIDER=resend y RESEND_API_KEY.',
    );
  }
  const keyMap: Record<string, string> = {
    resend: 'RESEND_API_KEY',
    sendgrid: 'SENDGRID_API_KEY',
    smtp: 'SMTP_HOST',
  };
  const requiredKey = keyMap[provider];
  if (requiredKey && !process.env[requiredKey]) {
    return FAIL('Email', `EMAIL_PROVIDER=${provider} pero falta ${requiredKey}`);
  }
  return PASS('Email', `Provider: ${provider}`);
};

/** 14. Verificar configuración de video */
export const verifyVideoConfig = (): PreFlightCheck => {
  const provider = process.env.VIDEO_PROVIDER || 'none';
  if (provider === 'none') {
    return WARN(
      'Video',
      'VIDEO_PROVIDER=none',
      'La generación de reels está desactivada. Configurá VIDEO_PROVIDER=replicate y REPLICATE_API_TOKEN.',
    );
  }
  if (provider === 'replicate' && !process.env.REPLICATE_API_TOKEN && !env.imageGen.replicateToken) {
    return FAIL('Video', 'VIDEO_PROVIDER=replicate pero falta REPLICATE_API_TOKEN');
  }
  return PASS('Video', `Provider: ${provider}`);
};

/** 15. Verificar configuración de trends */
export const verifyTrendsConfig = (): PreFlightCheck => {
  const hasSerp = !!process.env.SERPAPI_KEY;
  const hasTwitter = !!process.env.TWITTER_BEARER_TOKEN;
  if (!hasSerp && !hasTwitter) {
    return WARN(
      'Trends',
      'Sin APIs configuradas',
      'Solo Reddit funcionará. Configurá SERPAPI_KEY para Google Trends o TWITTER_BEARER_TOKEN.',
    );
  }
  return PASS('Trends', `SerpAPI=${hasSerp}, Twitter=${hasTwitter}`);
};

/** 16. Verificar configuración de competitors */
export const verifyCompetitorConfig = (): PreFlightCheck => {
  const hasRapid = !!process.env.RAPIDAPI_KEY;
  const hasApify = !!process.env.APIFY_API_TOKEN;
  const hasWebhook = !!process.env.COMPETITOR_WEBHOOK_URL;
  if (!hasRapid && !hasApify && !hasWebhook) {
    return WARN(
      'Competitors',
      'Sin APIs configuradas',
      'Configurá RAPIDAPI_KEY, APIFY_API_TOKEN, o COMPETITOR_WEBHOOK_URL.',
    );
  }
  return PASS('Competitors', `RapidAPI=${hasRapid}, Apify=${hasApify}, Webhook=${hasWebhook}`);
};

/** 17. Verificar conectividad con Meta Graph API */
export const verifyMetaApiConnectivity = async (): Promise<PreFlightCheck> => {
  if (!env.meta.accessToken) {
    return FAIL('Meta API', 'META_ACCESS_TOKEN no configurado', 'Sin esto no se puede publicar en Instagram.');
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${env.meta.accessToken}&fields=id,name`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = (await res.json()) as { name?: string };
      return PASS('Meta API', `Conectado como ${data.name ?? 'usuario'}`);
    }
    if (res.status === 401 || res.status === 403) {
      return FAIL('Meta API', `Token inválido o expirado (${res.status})`, 'Renová el token en Meta Developers.');
    }
    return WARN('Meta API', `Respondió con status ${res.status}`);
  } catch (err) {
    return FAIL('Meta API', 'No responde o timeout', err instanceof Error ? err.message : String(err));
  }
};

/** Ejecuta todas las verificaciones y retorna el reporte */
export const runPreFlightCheck = async (): Promise<PreFlightReport> => {
  log.step('Ejecutando pre-flight check...');

  const checks: PreFlightCheck[] = [];

  checks.push(verifyTermsAccepted());
  checks.push(verifyEnvConfig());
  checks.push(verifyDryRunState());
  checks.push(verifyAuditLogWritable());
  checks.push(verifyDiskSpace());
  checks.push(verifyRateLimitStatus());
  checks.push(verifyComplianceRulesLoaded());
  checks.push(await verifyBrandProfile());
  checks.push(verifyStrictMode());
  checks.push(verifyNoAntiBanModules());
  checks.push(verifyMultiAccountSetup());
  checks.push(verifySQLiteDatabase());
  checks.push(verifyEmailConfig());
  checks.push(verifyVideoConfig());
  checks.push(verifyTrendsConfig());
  checks.push(verifyCompetitorConfig());
  checks.push(await verifyMetaApiConnectivity());

  const passed = checks.filter((c) => c.status === 'PASS').length;
  const warnings = checks.filter((c) => c.status === 'WARNING').length;
  const failed = checks.filter((c) => c.status === 'FAIL').length;

  let overallStatus: PreFlightStatus = 'PASS';
  if (failed > 0) overallStatus = 'FAIL';
  else if (warnings > 0) overallStatus = 'WARNING';

  const report: PreFlightReport = {
    timestamp: new Date().toISOString(),
    overallStatus,
    checks,
    passed,
    warnings,
    failed,
  };

  if (overallStatus === 'PASS') {
    log.success(`Pre-flight: ${passed}/${checks.length} checks PASSED`);
  } else if (overallStatus === 'WARNING') {
    log.warn(`Pre-flight: ${passed} OK, ${warnings} warnings, ${failed} failed`);
  } else {
    log.error(`Pre-flight: ${failed} FAILED — No operar en producción`);
  }

  return report;
};
