/**
 * Script de validación del Sprint 3
 * Verifica que todos los componentes estén registrados:
 *  - Agents: community-manager, dm-operator, lead-nurturer, autopilot-orchestrator
 *  - Playbooks: post-engagement-loop, weekly-performance-review, full-autopilot-week
 *  - Tools: push_lead_crm, growth_beacon_comments, bot_auto_reply, nurture_ready_enrollments,
 *           nurture_advance_step, analytics_account_summary, analytics_extract_patterns, analytics_best_time
 *  - Scheduler jobs: dm-triage-hourly, lead-nurture-batch, anomaly-scan, community-daily-engagement, autopilot-weekly
 *  - Build: npm run verify pasa
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const fail = (msg) => {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
};
const pass = (msg) => console.log(`✅ ${msg}`);

function grepContains(filePath, pattern) {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, 'utf-8');
  return content.includes(pattern);
}

// ── Agent Registry ──────────────────────────────────────────
const registryPath = join(root, 'src', 'capabilities', 'agents', 'integrationAgents.ts');
const agents = ['community-manager', 'dm-operator', 'lead-nurturer', 'autopilot-orchestrator'];
agents.forEach((a) => {
  if (grepContains(registryPath, `'${a}'`)) pass(`Agente "${a}" registrado`);
  else fail(`Agente "${a}" NO encontrado en integrationAgents.ts`);
});

// ── Playbooks ──────────────────────────────────────────────
const playbooksPath = join(root, 'src', 'agent', 'playbooks', 'index.ts');
const playbooks = ['post-engagement-loop', 'weekly-performance-review', 'full-autopilot-week'];
playbooks.forEach((p) => {
  if (grepContains(playbooksPath, `id: '${p}'`)) pass(`Playbook "${p}" registrado`);
  else fail(`Playbook "${p}" NO encontrado en playbooks/index.ts`);
});

// ── Tools ──────────────────────────────────────────────────
const toolsPath = join(root, 'src', 'agent', 'tools.ts');
const tools = [
  'push_lead_crm',
  'growth_beacon_comments',
  'bot_auto_reply',
  'nurture_ready_enrollments',
  'nurture_advance_step',
  'analytics_account_summary',
  'analytics_extract_patterns',
  'analytics_best_time',
];
tools.forEach((t) => {
  if (grepContains(toolsPath, `'${t}'`)) pass(`Tool "${t}" registrado`);
  else fail(`Tool "${t}" NO encontrado en tools.ts`);
});

// ── Scheduler Jobs ─────────────────────────────────────────
const jobsPath = join(root, 'src', 'scheduler', 'jobs.ts');
const jobs = [
  'dm-triage-hourly',
  'lead-nurture-batch',
  'anomaly-scan',
  'community-daily-engagement',
  'autopilot-weekly',
];
jobs.forEach((j) => {
  if (grepContains(jobsPath, `name: '${j}'`)) pass(`Scheduler job "${j}" registrado`);
  else fail(`Scheduler job "${j}" NO encontrado en jobs.ts`);
});

// ── Build Check ────────────────────────────────────────────
try {
  execSync('npm run verify', { cwd: root, stdio: 'pipe', timeout: 120000 });
  pass('Build (npm run verify) pasa sin errores');
} catch (err) {
  fail('Build (npm run verify) FALLÓ');
  console.error(err.stdout?.toString() ?? err.message);
}

// Summary
console.log('\n──────────────────────────────');
console.log('Validación del Sprint 3 completada.');
