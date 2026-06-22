#!/usr/bin/env node
/**
 * Sprint 5 Validation — Monetización & Paid Growth Engine
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

console.log(chalk.bold('\n━━━ Sprint 5 Validation ━━━\n'));

// ── Agents ──────────────────────────────────────────────────────────
console.log(chalk.cyan('Agents:'));
const agentsSrc = read('src/capabilities/agents/integrationAgents.ts');
check('paid-media-manager definido', agentsSrc.includes("'paid-media-manager'"));
check('conversion-strategist definido', agentsSrc.includes("'conversion-strategist'"));
check('sales-pipeline-operator definido', agentsSrc.includes("'sales-pipeline-operator'"));
check('analytics-inspector definido', agentsSrc.includes("'analytics-inspector'"));

// ── Tools ───────────────────────────────────────────────────────────
console.log(chalk.cyan('\nTools:'));
const toolsSrc = read('src/agent/tools.ts');
check('meta_ads_create_campaign tool', toolsSrc.includes('meta_ads_create_campaign'));
check('meta_ads_get_campaigns tool', toolsSrc.includes('meta_ads_get_campaigns'));
check('meta_ads_get_insights tool', toolsSrc.includes('meta_ads_get_insights'));
check('meta_ads_optimize_budget tool', toolsSrc.includes('meta_ads_optimize_budget'));
check('meta_ads_boost_post tool', toolsSrc.includes('meta_ads_boost_post'));
check('pipeline_add_deal tool', toolsSrc.includes('pipeline_add_deal'));
check('pipeline_advance_deal tool', toolsSrc.includes('pipeline_advance_deal'));
check('pipeline_get_summary tool', toolsSrc.includes('pipeline_get_summary'));
check('revenue_get_attribution tool', toolsSrc.includes('revenue_get_attribution'));
check('revenue_content_roas tool', toolsSrc.includes('revenue_content_roas'));
check('lead_score_calculate tool', toolsSrc.includes('lead_score_calculate'));
check('lead_get_by_score tool', toolsSrc.includes('lead_get_by_score'));
check('offer_create_scarcity tool', toolsSrc.includes('offer_create_scarcity'));
check('offer_create_bundle tool', toolsSrc.includes('offer_create_bundle'));
check('smart_boost_detector tool', toolsSrc.includes('smart_boost_detector'));

// ── Playbooks ───────────────────────────────────────────────────────
console.log(chalk.cyan('\nPlaybooks:'));
const playbooksSrc = read('src/agent/playbooks/index.ts');
check('smart-boost-loop playbook', playbooksSrc.includes("id: 'smart-boost-loop'"));
check('paid-media-weekly-review playbook', playbooksSrc.includes("id: 'paid-media-weekly-review'"));

// ── Scheduler Jobs ──────────────────────────────────────────────────
console.log(chalk.cyan('\nScheduler Jobs:'));
const jobsSrc = read('src/scheduler/jobs.ts');
check('smart-boost-detector job', jobsSrc.includes("name: 'smart-boost-detector'"));
check('campaign-performance-daily job', jobsSrc.includes("name: 'campaign-performance-daily'"));
check('campaign-audit-weekly job', jobsSrc.includes("name: 'campaign-audit-weekly'"));
check('budget-optimizer job', jobsSrc.includes("name: 'budget-optimizer'"));
check('lead-score-sync job', jobsSrc.includes("name: 'lead-score-sync'"));
check('sales-funnel-daily job', jobsSrc.includes("name: 'sales-funnel-daily'"));
check('revenue-attribution-weekly job', jobsSrc.includes("name: 'revenue-attribution-weekly'"));

// ── CLI Commands ────────────────────────────────────────────────────
console.log(chalk.cyan('\nCLI Commands:'));
const cliSrc = read('src/cli.ts');
check('meta-campaign-listar CLI', cliSrc.includes("case 'meta-campaign-listar':"));
check('meta-campaign-crear CLI', cliSrc.includes("case 'meta-campaign-crear':"));
check('meta-campaign-insights CLI', cliSrc.includes("case 'meta-campaign-insights':"));
check('meta-campaign-optimizar CLI', cliSrc.includes("case 'meta-campaign-optimizar':"));
check('meta-budget-rebalance CLI', cliSrc.includes("case 'meta-budget-rebalance':"));
check('sales-pipeline CLI', cliSrc.includes("case 'sales-pipeline':"));
check('sales-deal-agregar CLI', cliSrc.includes("case 'sales-deal-agregar':"));
check('sales-deal-mover CLI', cliSrc.includes("case 'sales-deal-mover':"));
check('sales-deal-cerrar CLI', cliSrc.includes("case 'sales-deal-cerrar':"));
check('attribution-reporte CLI', cliSrc.includes("case 'attribution-reporte':"));
check('revenue-content-roas CLI', cliSrc.includes("case 'revenue-content-roas':"));
check('smart-boost CLI', cliSrc.includes("case 'smart-boost':"));
check('campaign-weekly-review CLI', cliSrc.includes("case 'campaign-weekly-review':"));

// ── Modules ─────────────────────────────────────────────────────────
console.log(chalk.cyan('\nModules:'));
check('metaAds.ts existe', read('src/integrations/metaAds.ts').includes('createCampaign'));
check('pipelineCRM.ts existe', read('src/capabilities/pipelineCRM.ts').includes('addDeal'));
check('revenueAttribution.ts existe', read('src/capabilities/revenueAttribution.ts').includes('recordAttribution'));

// ── Summary ─────────────────────────────────────────────────────────
console.log(chalk.bold(`\n━━━ Resultado: ${passed} passed, ${failed} failed ━━━\n`));
process.exit(failed > 0 ? 1 : 0);
