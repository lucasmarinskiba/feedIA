#!/usr/bin/env node
/**
 * Script de validación post-implementación
 * Verifica que todas las mejoras críticas estén configuradas correctamente
 */

import { env } from '../dist/config/index.js';
import { listAccounts, getPendingEmails } from '../dist/database/index.js';
import { listBrandIds, getActiveBrandId } from '../dist/config/accounts.js';

console.log('\n🔍 Validación de mejoras críticas\n');

// 1. Multi-cuenta
const brands = listBrandIds();
console.log(`✅ Multi-cuenta: ${brands.length} cuenta(s) configurada(s)`);
console.log(`   Activa: ${getActiveBrandId()}`);

// 2. SQLite
const accounts = listAccounts();
console.log(`✅ SQLite DB: ${accounts.length} cuenta(s) sincronizada(s)`);

// 3. Meta Graph API
const metaOk = !!(env.meta.accessToken && env.meta.igBusinessId);
console.log(
  metaOk ? '✅ Meta Graph API: configurada' : '⚠️  Meta Graph API: faltan META_ACCESS_TOKEN o META_IG_BUSINESS_ID',
);

// 4. Email
const emailProvider = process.env.EMAIL_PROVIDER || 'none';
console.log(emailProvider !== 'none' ? `✅ Email: ${emailProvider}` : '⚠️  Email: no configurado (set EMAIL_PROVIDER)');

// 5. Video
const videoProvider = process.env.VIDEO_PROVIDER || 'none';
console.log(videoProvider !== 'none' ? `✅ Video: ${videoProvider}` : '⚠️  Video: no configurado (set VIDEO_PROVIDER)');

// 6. Trends
const hasSerp = !!process.env.SERPAPI_KEY;
const hasTwitter = !!process.env.TWITTER_BEARER_TOKEN;
console.log(
  hasSerp || hasTwitter
    ? `✅ Trends: SerpAPI=${hasSerp}, Twitter=${hasTwitter}`
    : '⚠️  Trends: faltan SERPAPI_KEY y TWITTER_BEARER_TOKEN (Reddit funciona sin API key)',
);

// 7. Competitors
const hasRapid = !!process.env.RAPIDAPI_KEY;
const hasApify = !!process.env.APIFY_API_TOKEN;
console.log(
  hasRapid || hasApify
    ? `✅ Competitors: RapidAPI=${hasRapid}, Apify=${hasApify}`
    : '⚠️  Competitors: faltan RAPIDAPI_KEY y APIFY_API_TOKEN',
);

// 8. Email queue
const pendingEmails = getPendingEmails();
console.log(`📧 Emails en cola: ${pendingEmails.length}`);

// 9. DRY_RUN
console.log(
  env.dryRun ? '\n🛡️  DRY_RUN=true — nada se publica en producción' : '\n🚀 DRY_RUN=false — publicación EN VIVO activa',
);

console.log('\n💡 Próximos pasos:');
if (!metaOk) console.log('   → Configurar META_ACCESS_TOKEN y META_IG_BUSINESS_ID en .env');
if (emailProvider === 'none') console.log('   → Configurar EMAIL_PROVIDER y RESEND_API_KEY para notificaciones');
if (videoProvider === 'none') console.log('   → Configurar VIDEO_PROVIDER=replicate y REPLICATE_API_TOKEN para reels');
if (!hasRapid && !hasApify) console.log('   → Configurar RAPIDAPI_KEY para tracking de competidores');
if (!hasSerp) console.log('   → Configurar SERPAPI_KEY para Google Trends');
console.log('   → Ejecutar: node scripts/validate-setup.js\n');
