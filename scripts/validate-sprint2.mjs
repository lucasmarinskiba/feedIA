/**
 * Script de validación del Sprint 2
 * Verifica que todos los componentes estén registrados:
 *  - Agents: canva-operator, capcut-operator, video-generation-operator, visual-pipeline-orchestrator
 *  - Playbooks: canva-to-instagram, ai-video-to-reel
 *  - Tools: canva_create_design, capcut_create_project, runway_generate_video, heygen_create_avatar_video, orchestrate_canva_to_instagram, orchestrate_ai_video_to_reel
 *  - Scheduler jobs: canva-daily-design, capcut-weekly-reel, video-ai-generate
 *  - CLI commands: canva-create, canva-export, capcut-create, capcut-export, runway-generate, heygen-create
 *  - Operators: CanvaWebOperator, CapCutWebOperator, RunwayOperator, HeyGenOperator
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

function grepRegex(filePath, regex) {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, 'utf-8');
  return regex.test(content);
}

// ── Agent Registry ──────────────────────────────────────────
const registryPath = join(root, 'src', 'capabilities', 'agents', 'integrationAgents.ts');
const agents = ['canva-operator', 'capcut-operator', 'video-generation-operator', 'visual-pipeline-orchestrator'];
agents.forEach((a) => {
  if (grepContains(registryPath, `'${a}'`)) pass(`Agente "${a}" registrado`);
  else fail(`Agente "${a}" NO encontrado en integrationAgents.ts`);
});

// ── Playbooks ──────────────────────────────────────────────
const playbooksPath = join(root, 'src', 'agent', 'playbooks', 'index.ts');
const playbooks = ['canva-to-instagram', 'ai-video-to-reel'];
playbooks.forEach((p) => {
  if (grepContains(playbooksPath, `id: '${p}'`)) pass(`Playbook "${p}" registrado`);
  else fail(`Playbook "${p}" NO encontrado en playbooks/index.ts`);
});

// ── Tools ──────────────────────────────────────────────────
const toolsPath = join(root, 'src', 'agent', 'tools.ts');
const tools = [
  'canva_create_design',
  'canva_export_design',
  'canva_create_carousel',
  'capcut_create_project',
  'capcut_add_captions',
  'capcut_export_video',
  'runway_generate_video',
  'runway_image_to_video',
  'heygen_create_avatar_video',
  'video_generate_reel',
  'instagram_publish_post',
  'instagram_publish_reel',
  'instagram_publish_story',
  'instagram_publish_health',
  'browser_navigate',
  'antidetect_check',
];
tools.forEach((t) => {
  if (grepContains(toolsPath, `'${t}'`)) pass(`Tool "${t}" registrado`);
  else fail(`Tool "${t}" NO encontrado en tools.ts`);
});

// ── Scheduler Jobs ─────────────────────────────────────────
const jobsPath = join(root, 'src', 'scheduler', 'jobs.ts');
const jobs = ['canva-daily-design', 'capcut-weekly-reel', 'video-ai-generate'];
jobs.forEach((j) => {
  if (grepContains(jobsPath, `name: '${j}'`)) pass(`Scheduler job "${j}" registrado`);
  else fail(`Scheduler job "${j}" NO encontrado en jobs.ts`);
});

// ── CLI Commands ───────────────────────────────────────────
const cliPath = join(root, 'src', 'cli.ts');
const cliCommands = [
  'canva-create',
  'canva-export',
  'capcut-create',
  'capcut-export',
  'runway-generate',
  'heygen-create',
];
cliCommands.forEach((c) => {
  if (grepContains(cliPath, `case '${c}':`)) pass(`CLI command "${c}" registrado`);
  else fail(`CLI command "${c}" NO encontrado en cli.ts`);
});

// ── Operators ──────────────────────────────────────────────
const ops = [
  {
    path: join(root, 'src', 'browserOperators', 'canva', 'canvaWebOperator.ts'),
    className: 'CanvaWebOperator',
    method: 'createDesign',
  },
  {
    path: join(root, 'src', 'browserOperators', 'capcut', 'capcutWebOperator.ts'),
    className: 'CapCutWebOperator',
    method: 'createProject',
  },
  {
    path: join(root, 'src', 'browserOperators', 'runway', 'runwayOperator.ts'),
    className: 'RunwayOperator',
    method: 'generateVideo',
  },
  {
    path: join(root, 'src', 'browserOperators', 'heygen', 'heygenOperator.ts'),
    className: 'HeyGenOperator',
    method: 'createVideo',
  },
];
ops.forEach((op) => {
  if (!existsSync(op.path)) {
    fail(`Operator file ${op.path} NO existe`);
    return;
  }
  const content = readFileSync(op.path, 'utf-8');
  if (!content.includes(`class ${op.className}`)) {
    fail(`Clase ${op.className} NO encontrada en ${op.path}`);
    return;
  }
  if (!content.includes(`async ${op.method}`)) {
    fail(`Método ${op.method}() NO encontrado en ${op.className}`);
    return;
  }
  pass(`Operator ${op.className} con método ${op.method}()`);
});

// ── Build Check ────────────────────────────────────────────
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
if (pkg.scripts?.verify) pass('Script "verify" definido en package.json');
else fail('Script "verify" NO definido en package.json');

// Summary
console.log('\n──────────────────────────────');
console.log('Validación del Sprint 2 completada.');
