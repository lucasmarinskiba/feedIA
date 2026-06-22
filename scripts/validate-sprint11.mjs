#!/usr/bin/env node
/**
 * Sprint 11 Validation — Self-Improvement + AR
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

console.log(chalk.bold('\n━━━ Sprint 11 Validation ━━━\n'));

// ── Agents ──────────────────────────────────────────────────────────
console.log(chalk.cyan('Agents:'));
const agentsSrc = read('src/capabilities/agents/integrationAgents.ts');
check('self-improvement-engine agent', agentsSrc.includes("'self-improvement-engine'"));
check('feedback-collector agent', agentsSrc.includes("'feedback-collector'"));
check('strategy-tuner agent', agentsSrc.includes("'strategy-tuner'"));
check('ar-creator agent', agentsSrc.includes("'ar-creator'"));

// ── Tools ───────────────────────────────────────────────────────────
console.log(chalk.cyan('\nTools:'));
const toolsSrc = read('src/agent/tools.ts');
check('agent_self_improve tool', toolsSrc.includes('agent_self_improve'));
check('self_improve_record tool', toolsSrc.includes('self_improve_record'));
check('self_improve_analyze tool', toolsSrc.includes('self_improve_analyze'));
check('self_improve_suggest tool', toolsSrc.includes('self_improve_suggest'));
check('feedback_collect tool', toolsSrc.includes('feedback_collect'));
check('feedback_apply tool', toolsSrc.includes('feedback_apply'));
check('performance_review tool', toolsSrc.includes('performance_review'));
check('ar_filter_create tool', toolsSrc.includes('ar_filter_create'));
check('ar_preview_generate tool', toolsSrc.includes('ar_preview_generate'));
check('ar_effect_compose tool', toolsSrc.includes('ar_effect_compose'));
check('ar_export tool', toolsSrc.includes('ar_export'));
check('ar_campaign_plan tool', toolsSrc.includes('ar_campaign_plan'));

// ── Playbooks ───────────────────────────────────────────────────────
console.log(chalk.cyan('\nPlaybooks:'));
const playbooksSrc = read('src/agent/playbooks/index.ts');
check('self-improvement-cycle playbook', playbooksSrc.includes("id: 'self-improvement-cycle'"));
check('ar-campaign-launch playbook', playbooksSrc.includes("id: 'ar-campaign-launch'"));

// ── Scheduler Jobs ──────────────────────────────────────────────────
console.log(chalk.cyan('\nScheduler Jobs:'));
const jobsSrc = read('src/scheduler/jobs.ts');
check('feedback-daily-collect job', jobsSrc.includes("name: 'feedback-daily-collect'"));
check('performance-weekly-review job', jobsSrc.includes("name: 'performance-weekly-review'"));
check('strategy-auto-tune job', jobsSrc.includes("name: 'strategy-auto-tune'"));
check('ar-filter-refresh job', jobsSrc.includes("name: 'ar-filter-refresh'"));
check('ar-preview-check job', jobsSrc.includes("name: 'ar-preview-check'"));
check('ar-campaign-track job', jobsSrc.includes("name: 'ar-campaign-track'"));

// ── CLI Commands ────────────────────────────────────────────────────
console.log(chalk.cyan('\nCLI Commands:'));
const cliSrc = read('src/cli.ts');
check('self-improve CLI', cliSrc.includes("case 'self-improve':"));
check('feedback-collect CLI', cliSrc.includes("case 'feedback-collect':"));
check('performance-review CLI', cliSrc.includes("case 'performance-review':"));
check('strategy-tune CLI', cliSrc.includes("case 'strategy-tune':"));
check('ar-filter CLI', cliSrc.includes("case 'ar-filter':"));
check('ar-preview CLI', cliSrc.includes("case 'ar-preview':"));
check('ar-effect CLI', cliSrc.includes("case 'ar-effect':"));
check('ar-export CLI', cliSrc.includes("case 'ar-export':"));
check('ar-campaign CLI', cliSrc.includes("case 'ar-campaign':"));
check('ar-assets CLI', cliSrc.includes("case 'ar-assets':"));

// ── Modules ─────────────────────────────────────────────────────────
console.log(chalk.cyan('\nModules:'));
check(
  'selfImprove/feedbackEngine.ts',
  read('src/capabilities/selfImprove/feedbackEngine.ts').includes('collectSignal'),
);
check(
  'selfImprove/performanceReview.ts',
  read('src/capabilities/selfImprove/performanceReview.ts').includes('generateReview'),
);
check('selfImprove/autoTuner.ts', read('src/capabilities/selfImprove/autoTuner.ts').includes('suggestTuning'));
check('ar/arFilterGenerator.ts', read('src/capabilities/ar/arFilterGenerator.ts').includes('generateFilter'));
check('ar/arEffectComposer.ts', read('src/capabilities/ar/arEffectComposer.ts').includes('composeSequence'));
check('ar/arPreview.ts', read('src/capabilities/ar/arPreview.ts').includes('generatePreview'));

// ── Summary ─────────────────────────────────────────────────────────
console.log(chalk.bold(`\n━━━ Resultado: ${passed} passed, ${failed} failed ━━━\n`));
process.exit(failed > 0 ? 1 : 0);
