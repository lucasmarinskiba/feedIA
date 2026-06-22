#!/usr/bin/env node
/**
 * Sprint 8 Validation — Agent Swarm + Predictive ML
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

console.log(chalk.bold('\n━━━ Sprint 8 Validation ━━━\n'));

// ── Agents ──────────────────────────────────────────────────────────
console.log(chalk.cyan('Agents:'));
const agentsSrc = read('src/capabilities/agents/integrationAgents.ts');
check('swarm-coordinator agent', agentsSrc.includes("'swarm-coordinator'"));
check('predictive-analyst agent', agentsSrc.includes("'predictive-analyst'"));
check('anomaly-hunter agent', agentsSrc.includes("'anomaly-hunter'"));
check('trend-forecaster agent', agentsSrc.includes("'trend-forecaster'"));

// ── Tools ───────────────────────────────────────────────────────────
console.log(chalk.cyan('\nTools:'));
const toolsSrc = read('src/agent/tools.ts');
check('swarm_create tool', toolsSrc.includes('swarm_create'));
check('swarm_run tool', toolsSrc.includes('swarm_run'));
check('swarm_status tool', toolsSrc.includes('swarm_status'));
check('swarm_list tool', toolsSrc.includes('swarm_list'));
check('swarm_consensus tool', toolsSrc.includes('swarm_consensus'));
check('decompose_task tool', toolsSrc.includes('decompose_task'));
check('agent_message tool', toolsSrc.includes('agent_message'));
check('predict_performance tool', toolsSrc.includes('predict_performance'));
check('predict_engagement tool', toolsSrc.includes('predict_engagement'));
check('forecast_trends tool', toolsSrc.includes('forecast_trends'));
check('detect_anomalies tool', toolsSrc.includes('detect_anomalies'));
check('benchmark_engagement tool', toolsSrc.includes('benchmark_engagement'));

// ── Playbooks ───────────────────────────────────────────────────────
console.log(chalk.cyan('\nPlaybooks:'));
const playbooksSrc = read('src/agent/playbooks/index.ts');
check('swarm-content-strike playbook', playbooksSrc.includes("id: 'swarm-content-strike'"));
check('predictive-weekly-review playbook', playbooksSrc.includes("id: 'predictive-weekly-review'"));

// ── Scheduler Jobs ──────────────────────────────────────────────────
console.log(chalk.cyan('\nScheduler Jobs:'));
const jobsSrc = read('src/scheduler/jobs.ts');
check('swarm-daily-orchestration job', jobsSrc.includes("name: 'swarm-daily-orchestration'"));
check('predictive-content-score job', jobsSrc.includes("name: 'predictive-content-score'"));
check('anomaly-daily-scan job', jobsSrc.includes("name: 'anomaly-daily-scan'"));
check('trend-forecast-weekly job', jobsSrc.includes("name: 'trend-forecast-weekly'"));
check('engagement-model-train job', jobsSrc.includes("name: 'engagement-model-train'"));
check('swarm-consensus-daily job', jobsSrc.includes("name: 'swarm-consensus-daily'"));

// ── CLI Commands ────────────────────────────────────────────────────
console.log(chalk.cyan('\nCLI Commands:'));
const cliSrc = read('src/cli.ts');
check('swarm-create CLI', cliSrc.includes("case 'swarm-create':"));
check('swarm-run CLI', cliSrc.includes("case 'swarm-run':"));
check('swarm-status CLI', cliSrc.includes("case 'swarm-status':"));
check('swarm-list CLI', cliSrc.includes("case 'swarm-list':"));
check('decompose-task CLI', cliSrc.includes("case 'decompose-task':"));
check('agent-message CLI', cliSrc.includes("case 'agent-message':"));
check('predict-content CLI', cliSrc.includes("case 'predict-content':"));
check('predict-engagement CLI', cliSrc.includes("case 'predict-engagement':"));
check('forecast-trends CLI', cliSrc.includes("case 'forecast-trends':"));
check('detect-anomalies CLI', cliSrc.includes("case 'detect-anomalies':"));
check('benchmark-nicho CLI', cliSrc.includes("case 'benchmark-nicho':"));

// ── Modules ─────────────────────────────────────────────────────────
console.log(chalk.cyan('\nModules:'));
check('swarm/swarmOrchestrator.ts', read('src/capabilities/swarm/swarmOrchestrator.ts').includes('createSwarm'));
check('swarm/agentConsensus.ts', read('src/capabilities/swarm/agentConsensus.ts').includes('resolveConsensus'));
check('swarm/taskDecomposer.ts', read('src/capabilities/swarm/taskDecomposer.ts').includes('decomposeTask'));
check('swarm/swarmMessageBus.ts', read('src/capabilities/swarm/swarmMessageBus.ts').includes('publishMessage'));
check(
  'predictive/performancePredictor.ts',
  read('src/capabilities/predictive/performancePredictor.ts').includes('predictPerformance'),
);
check(
  'predictive/trendForecaster.ts',
  read('src/capabilities/predictive/trendForecaster.ts').includes('forecastTrend'),
);
check(
  'predictive/anomalyDetector.ts',
  read('src/capabilities/predictive/anomalyDetector.ts').includes('detectAnomalies'),
);
check(
  'predictive/engagementModel.ts',
  read('src/capabilities/predictive/engagementModel.ts').includes('calculateEngagementScore'),
);

// ── Summary ─────────────────────────────────────────────────────────
console.log(chalk.bold(`\n━━━ Resultado: ${passed} passed, ${failed} failed ━━━\n`));
process.exit(failed > 0 ? 1 : 0);
