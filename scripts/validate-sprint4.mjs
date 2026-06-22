/**
 * Script de validación del Sprint 4
 * Verifica que todos los componentes estén registrados:
 *  - Agents: multi-platform-publisher, repurposing-specialist
 *  - Playbooks: instagram-to-everywhere, daily-repurpose-queue
 *  - Tools: upload_to_tiktok, upload_to_youtube_shorts, upload_to_linkedin, upload_to_x,
 *           repurpose_post_for_platform
 *  - Scheduler jobs: repurpose-daily, cross-platform-publish-queue, platform-health-check
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
const agents = ['multi-platform-publisher', 'repurposing-specialist'];
agents.forEach((a) => {
  if (grepContains(registryPath, `'${a}'`)) pass(`Agente "${a}" registrado`);
  else fail(`Agente "${a}" NO encontrado en integrationAgents.ts`);
});

// ── Playbooks ──────────────────────────────────────────────
const playbooksPath = join(root, 'src', 'agent', 'playbooks', 'index.ts');
const playbooks = ['instagram-to-everywhere', 'daily-repurpose-queue'];
playbooks.forEach((p) => {
  if (grepContains(playbooksPath, `id: '${p}'`)) pass(`Playbook "${p}" registrado`);
  else fail(`Playbook "${p}" NO encontrado en playbooks/index.ts`);
});

// ── Tools ──────────────────────────────────────────────────
const toolsPath = join(root, 'src', 'agent', 'tools.ts');
const tools = [
  'upload_to_tiktok',
  'upload_to_youtube_shorts',
  'upload_to_linkedin',
  'upload_to_x',
  'repurpose_post_for_platform',
];
tools.forEach((t) => {
  if (grepContains(toolsPath, `'${t}'`)) pass(`Tool "${t}" registrado`);
  else fail(`Tool "${t}" NO encontrado en tools.ts`);
});

// ── Scheduler Jobs ─────────────────────────────────────────
const jobsPath = join(root, 'src', 'scheduler', 'jobs.ts');
const jobs = ['repurpose-daily', 'cross-platform-publish-queue', 'platform-health-check'];
jobs.forEach((j) => {
  if (grepContains(jobsPath, `name: '${j}'`)) pass(`Scheduler job "${j}" registrado`);
  else fail(`Scheduler job "${j}" NO encontrado en jobs.ts`);
});

// ── Build Check ────────────────────────────────────────────
try {
  execSync('npm run verify', { cwd: root, stdio: 'pipe', timeout: 300000 });
  pass('Build (npm run verify) pasa sin errores');
} catch (err) {
  fail('Build (npm run verify) FALLÓ');
  console.error(err.stdout?.toString() ?? err.message);
}

// Summary
console.log('\n──────────────────────────────');
console.log('Validación del Sprint 4 completada.');
