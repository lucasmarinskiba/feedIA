#!/usr/bin/env node
/**
 * Sprint 10 Validation — Computer Vision
 * Verifica: agents, tools, playbooks, jobs, CLI commands, modules
 */

import { readFileSync } from 'node:fs';
import chalk from 'chalk';

let passed = 0;
let failed = 0;

const check = (name, condition) => {
  if (condition) {
    passed++;
    console.log(chalk.green(`  ✓ ${name}`));
  } else {
    failed++;
    console.log(chalk.red(`  ✗ ${name}`));
  }
};

const read = (path) => {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return '';
  }
};

console.log(chalk.bold('\n━━━ Sprint 10 Validation ━━━\n'));

// ── Agents ──────────────────────────────────────────────────────────
console.log(chalk.cyan('Agents:'));
const agentsSrc = read('src/capabilities/agents/integrationAgents.ts');
check('vision-analyst agent', agentsSrc.includes("'vision-analyst'"));
check('content-moderator agent', agentsSrc.includes("'content-moderator'"));
check('visual-optimizer agent', agentsSrc.includes("'visual-optimizer'"));
check('ocr-specialist agent', agentsSrc.includes("'ocr-specialist'"));

// ── Tools ───────────────────────────────────────────────────────────
console.log(chalk.cyan('\nTools:'));
const toolsSrc = read('src/agent/tools.ts');
check('vision_analyze_image tool', toolsSrc.includes('vision_analyze_image'));
check('vision_detect_objects tool', toolsSrc.includes('vision_detect_objects'));
check('vision_extract_text tool', toolsSrc.includes('vision_extract_text'));
check('vision_analyze_faces tool', toolsSrc.includes('vision_analyze_faces'));
check('vision_compare_images tool', toolsSrc.includes('vision_compare_images'));
check('vision_auto_caption tool', toolsSrc.includes('vision_auto_caption'));
check('vision_moderate_image tool', toolsSrc.includes('vision_moderate_image'));
check('vision_extract_palette tool', toolsSrc.includes('vision_extract_palette'));
check('vision_check_brand_colors tool', toolsSrc.includes('vision_check_brand_colors'));
check('vision_batch_analyze tool', toolsSrc.includes('vision_batch_analyze'));
check('vision_find_similar tool', toolsSrc.includes('vision_find_similar'));
check('vision_moderate_batch tool', toolsSrc.includes('vision_moderate_batch'));
check('vision_face_compliance tool', toolsSrc.includes('vision_face_compliance'));
check('vision_suggest_colors tool', toolsSrc.includes('vision_suggest_colors'));

// ── Playbooks ───────────────────────────────────────────────────────
console.log(chalk.cyan('\nPlaybooks:'));
const playbooksSrc = read('src/agent/playbooks/index.ts');
check('visual-content-audit playbook', playbooksSrc.includes("id: 'visual-content-audit'"));
check('auto-moderation-pipeline playbook', playbooksSrc.includes("id: 'auto-moderation-pipeline'"));

// ── Scheduler Jobs ──────────────────────────────────────────────────
console.log(chalk.cyan('\nScheduler Jobs:'));
const jobsSrc = read('src/scheduler/jobs.ts');
check('vision-daily-content-audit job', jobsSrc.includes("name: 'vision-daily-content-audit'"));
check('auto-moderation-scan job', jobsSrc.includes("name: 'auto-moderation-scan'"));
check('visual-palette-sync job', jobsSrc.includes("name: 'visual-palette-sync'"));
check('ocr-batch-extract job', jobsSrc.includes("name: 'ocr-batch-extract'"));
check('face-check-compliance job', jobsSrc.includes("name: 'face-check-compliance'"));
check('similar-content-detection job', jobsSrc.includes("name: 'similar-content-detection'"));

// ── CLI Commands ────────────────────────────────────────────────────
console.log(chalk.cyan('\nCLI Commands:'));
const cliSrc = read('src/cli.ts');
check('vision-analyze CLI', cliSrc.includes("case 'vision-analyze':"));
check('vision-objects CLI', cliSrc.includes("case 'vision-objects':"));
check('vision-ocr CLI', cliSrc.includes("case 'vision-ocr':"));
check('vision-faces CLI', cliSrc.includes("case 'vision-faces':"));
check('vision-compare CLI', cliSrc.includes("case 'vision-compare':"));
check('vision-caption CLI', cliSrc.includes("case 'vision-caption':"));
check('vision-moderate CLI', cliSrc.includes("case 'vision-moderate':"));
check('vision-palette CLI', cliSrc.includes("case 'vision-palette':"));
check('vision-brand-check CLI', cliSrc.includes("case 'vision-brand-check':"));
check('vision-batch CLI', cliSrc.includes("case 'vision-batch':"));
check('vision-similar CLI', cliSrc.includes("case 'vision-similar':"));

// ── Modules ─────────────────────────────────────────────────────────
console.log(chalk.cyan('\nModules:'));
check('vision/imageAnalyzer.ts', read('src/capabilities/vision/imageAnalyzer.ts').includes('analyzeImage'));
check('vision/objectDetector.ts', read('src/capabilities/vision/objectDetector.ts').includes('detectObjects'));
check('vision/ocrEngine.ts', read('src/capabilities/vision/ocrEngine.ts').includes('extractText'));
check('vision/faceAnalyzer.ts', read('src/capabilities/vision/faceAnalyzer.ts').includes('analyzeFaces'));
check('vision/visualComparer.ts', read('src/capabilities/vision/visualComparer.ts').includes('compareImages'));
check('vision/autoCaption.ts', read('src/capabilities/vision/autoCaption.ts').includes('generateAutoCaption'));
check('vision/visualModerator.ts', read('src/capabilities/vision/visualModerator.ts').includes('moderateImage'));
check('vision/colorAnalyzer.ts', read('src/capabilities/vision/colorAnalyzer.ts').includes('extractPalette'));

// ── Summary ─────────────────────────────────────────────────────────
console.log(chalk.bold(`\n━━━ Resultado: ${passed} passed, ${failed} failed ━━━\n`));
process.exit(failed > 0 ? 1 : 0);
