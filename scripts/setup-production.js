#!/usr/bin/env node
/**
 * Setup interactivo para producción
 * Guía paso a paso para activar publicación real en Instagram
 */

import { createInterface } from 'node:readline';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../dist/config/index.js';
import { listBrandIds, getActiveBrandId } from '../dist/config/accounts.js';
import { listAccounts, getPendingEmails } from '../dist/database/index.js';
import { runPreFlightCheck } from '../dist/compliance/preflight.js';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise((resolve) => rl.question(q, resolve));

const green = (t) => `\x1b[32m${t}\x1b[0m`;
const yellow = (t) => `\x1b[33m${t}\x1b[0m`;
const red = (t) => `\x1b[31m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;

console.log(bold('\n╔══════════════════════════════════════════════════════════════╗'));
console.log(bold('║     SETUP PRODUCCIÓN — Agente IA Especialista Instagram      ║'));
console.log(bold('╚══════════════════════════════════════════════════════════════╝\n'));

const envPath = resolve('.env');
let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';

function setEnvVar(key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }
}

async function stepMetaApi() {
  console.log(bold('\n─── PASO 1: Meta Graph API (OBLIGATORIO para publicar) ───\n'));
  console.log('1. Andá a https://developers.facebook.com/apps');
  console.log('2. Creá una app tipo "Business" → agregá Instagram Graph API');
  console.log('3. Conectá tu cuenta de Instagram Business al app');
  console.log('4. En "Generador de tokens de acceso", generá un token');
  console.log('5. Copiá el IG Business ID (es el número largo del usuario de IG)\n');

  const token = await question('Meta Access Token: ');
  const igId = await question('IG Business ID: ');

  if (token && igId) {
    setEnvVar('META_ACCESS_TOKEN', token);
    setEnvVar('META_IG_BUSINESS_ID', igId);
    console.log(green('✅ Meta API configurada'));
  } else {
    console.log(yellow('⚠️  Saltado — recordá configurarlo antes de publicar'));
  }
}

async function stepEmail() {
  console.log(bold('\n─── PASO 2: Notificaciones por Email (RECOMENDADO) ───\n'));
  console.log('Opción más simple: Resend (gratis 100 emails/día)');
  console.log('1. Andá a https://resend.com/api-keys');
  console.log('2. Generá una API key');
  console.log('3. Copiala acá:\n');

  const key = await question('Resend API Key (dejá vacío para saltar): ');
  if (key) {
    setEnvVar('EMAIL_PROVIDER', 'resend');
    setEnvVar('RESEND_API_KEY', key);
    console.log(green('✅ Email configurado'));
  } else {
    console.log(yellow('⚠️  Saltado'));
  }
}

async function stepVideo() {
  console.log(bold('\n─── PASO 3: Generación de Video/Reels (OPCIONAL) ───\n'));
  console.log('Se usa Replicate (mismo token que imágenes)');
  console.log('1. Andá a https://replicate.com/account/api-tokens');
  console.log('2. Copiá el token (o usá el mismo que para imágenes):\n');

  const key = await question('Replicate API Token (dejá vacío para saltar): ');
  if (key) {
    setEnvVar('VIDEO_PROVIDER', 'replicate');
    setEnvVar('REPLICATE_API_TOKEN', key);
    console.log(green('✅ Video configurado'));
  } else {
    console.log(yellow('⚠️  Saltado'));
  }
}

async function stepTrends() {
  console.log(bold('\n─── PASO 4: Inteligencia de Tendencias (OPCIONAL) ───\n'));
  console.log('Para Google Trends: https://serpapi.com/manage-api-key');
  console.log('Para Twitter: https://developer.twitter.com/en/portal/dashboard\n');

  const serp = await question('SerpAPI Key (dejá vacío para saltar): ');
  if (serp) setEnvVar('SERPAPI_KEY', serp);

  const twitter = await question('Twitter Bearer Token (dejá vacío para saltar): ');
  if (twitter) setEnvVar('TWITTER_BEARER_TOKEN', twitter);

  if (serp || twitter) {
    console.log(green('✅ Trends configurado'));
  } else {
    console.log(yellow('⚠️  Saltado (Reddit funciona sin API key)'));
  }
}

async function stepCompetitors() {
  console.log(bold('\n─── PASO 5: Tracking de Competidores (OPCIONAL) ───\n'));
  console.log('Opción recomendada: RapidAPI Instagram Scraper');
  console.log('1. Andá a https://rapidapi.com/developer/dashboard');
  console.log('2. Suscribite a "Instagram Scraper API"');
  console.log('3. Copiá la API key:\n');

  const key = await question('RapidAPI Key (dejá vacío para saltar): ');
  if (key) {
    setEnvVar('RAPIDAPI_KEY', key);
    console.log(green('✅ Competidores configurado'));
  } else {
    console.log(yellow('⚠️  Saltado'));
  }
}

async function stepCompliance() {
  console.log(bold('\n─── PASO 6: Compliance y Seguridad ───\n'));

  const accepted = await question('¿Leíste TERMS_OF_SERVICE.md y aceptás los términos? (s/n): ');
  if (accepted.toLowerCase() === 's') {
    setEnvVar('COMPLIANCE_ACCEPTED_TERMS', 'true');
    console.log(green('✅ Términos aceptados'));
  } else {
    console.log(red('❌ DEBÉS leer y aceptar los términos antes de operar en producción.'));
    console.log('   El sistema se quedará en modo simulado.');
  }

  const dryRun = await question('¿Activar DRY_RUN=false (publicación REAL)? (s/n): ');
  if (dryRun.toLowerCase() === 's') {
    setEnvVar('DRY_RUN', 'false');
    console.log(green('✅ DRY_RUN=false — Publicación real activada'));
  } else {
    setEnvVar('DRY_RUN', 'true');
    console.log(yellow('⚠️  DRY_RUN=true — Modo simulación seguro'));
  }
}

async function main() {
  // Estado actual
  console.log('Estado actual:');
  const brands = listBrandIds();
  console.log(`  Cuentas: ${brands.length} (${getActiveBrandId()} activa)`);
  const accounts = listAccounts();
  console.log(`  SQLite: ${accounts.length} cuenta(s) sincronizada(s)`);
  console.log(`  Meta API: ${env.meta.accessToken ? green('CONFIGURADA') : red('FALTA')}`);
  console.log(`  DRY_RUN: ${env.dryRun ? yellow('true (simulación)') : red('false (REAL)')}`);

  const start = await question(bold('\n¿Empezar setup? (s/n): '));
  if (start.toLowerCase() !== 's') {
    console.log('Cancelado.');
    rl.close();
    return;
  }

  await stepMetaApi();
  await stepEmail();
  await stepVideo();
  await stepTrends();
  await stepCompetitors();
  await stepCompliance();

  // Guardar .env
  writeFileSync(envPath, envContent.trim() + '\n');
  console.log(green('\n✅ .env actualizado'));

  // Ejecutar preflight
  console.log(bold('\n─── Ejecutando pre-flight check ───\n'));
  const report = await runPreFlightCheck();
  const statusColor = report.overallStatus === 'PASS' ? green : report.overallStatus === 'WARNING' ? yellow : red;
  console.log(`Estado general: ${statusColor(report.overallStatus)}`);
  console.log(
    `Checks: ${green(report.passed.toString())} OK | ${yellow(report.warnings.toString())} WARN | ${red(report.failed.toString())} FAIL\n`,
  );

  for (const check of report.checks) {
    const color = check.status === 'PASS' ? green : check.status === 'WARNING' ? yellow : red;
    console.log(`${color(`[${check.status}]`)} ${check.name}`);
    if (check.detail) console.log(`      ${check.detail}`);
  }

  if (report.overallStatus === 'FAIL') {
    console.log(red('\n❌ Pre-flight FALLÓ — No operar en producción hasta resolver errores.'));
  } else if (report.overallStatus === 'WARNING') {
    console.log(yellow('\n⚠️  Pre-flight con advertencias — Podés operar pero revisá los warnings.'));
  } else {
    console.log(green('\n🚀 Pre-flight PASS — Sistema listo para producción.'));
  }

  console.log(bold('\nPróximo comando recomendado:'));
  console.log('  node scripts/validate-setup.js');
  console.log('  npm run dev preflight');
  console.log('  npm run dev health-check\n');

  rl.close();
}

main().catch((err) => {
  console.error(err.message);
  rl.close();
  process.exit(1);
});
