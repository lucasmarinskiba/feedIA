#!/usr/bin/env node
/**
 * Sprint 9 Validation — Real-Time Infrastructure
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

console.log(chalk.bold('\n━━━ Sprint 9 Validation ━━━\n'));

// ── Agents ──────────────────────────────────────────────────────────
console.log(chalk.cyan('Agents:'));
const agentsSrc = read('src/capabilities/agents/integrationAgents.ts');
check('realtime-operator agent', agentsSrc.includes("'realtime-operator'"));
check('event-dispatcher agent', agentsSrc.includes("'event-dispatcher'"));
check('live-monitor agent', agentsSrc.includes("'live-monitor'"));
check('webhook-handler agent', agentsSrc.includes("'webhook-handler'"));

// ── Tools ───────────────────────────────────────────────────────────
console.log(chalk.cyan('\nTools:'));
const toolsSrc = read('src/agent/tools.ts');
check('realtime_publish_event tool', toolsSrc.includes('realtime_publish_event'));
check('realtime_subscribe tool', toolsSrc.includes('realtime_subscribe'));
check('realtime_get_events tool', toolsSrc.includes('realtime_get_events'));
check('websocket_broadcast tool', toolsSrc.includes('websocket_broadcast'));
check('websocket_get_connections tool', toolsSrc.includes('websocket_get_connections'));
check('sse_emit tool', toolsSrc.includes('sse_emit'));
check('live_stream_start tool', toolsSrc.includes('live_stream_start'));
check('live_stream_status tool', toolsSrc.includes('live_stream_status'));
check('webhook_register tool', toolsSrc.includes('webhook_register'));
check('webhook_receive tool', toolsSrc.includes('webhook_receive'));
check('webhook_list tool', toolsSrc.includes('webhook_list'));
check('webhook_retry tool', toolsSrc.includes('webhook_retry'));
check('webhook_stats tool', toolsSrc.includes('webhook_stats'));
check('push_notify tool', toolsSrc.includes('push_notify'));
check('health_pulse tool', toolsSrc.includes('health_pulse'));
check('realtime_metrics tool', toolsSrc.includes('realtime_metrics'));

// ── Playbooks ───────────────────────────────────────────────────────
console.log(chalk.cyan('\nPlaybooks:'));
const playbooksSrc = read('src/agent/playbooks/index.ts');
check('realtime-crisis-response playbook', playbooksSrc.includes("id: 'realtime-crisis-response'"));
check('live-launch-monitor playbook', playbooksSrc.includes("id: 'live-launch-monitor'"));

// ── Scheduler Jobs ──────────────────────────────────────────────────
console.log(chalk.cyan('\nScheduler Jobs:'));
const jobsSrc = read('src/scheduler/jobs.ts');
check('realtime-health-pulse job', jobsSrc.includes("name: 'realtime-health-pulse'"));
check('event-bus-cleanup job', jobsSrc.includes("name: 'event-bus-cleanup'"));
check('live-stream-monitor job', jobsSrc.includes("name: 'live-stream-monitor'"));
check('webhook-retry-failed job', jobsSrc.includes("name: 'webhook-retry-failed'"));
check('realtime-analytics-flush job', jobsSrc.includes("name: 'realtime-analytics-flush'"));
check('push-digest-realtime job', jobsSrc.includes("name: 'push-digest-realtime'"));

// ── CLI Commands ────────────────────────────────────────────────────
console.log(chalk.cyan('\nCLI Commands:'));
const cliSrc = read('src/cli.ts');
check('realtime-publish CLI', cliSrc.includes("case 'realtime-publish':"));
check('realtime-subscribe CLI', cliSrc.includes("case 'realtime-subscribe':"));
check('realtime-events CLI', cliSrc.includes("case 'realtime-events':"));
check('websocket-broadcast CLI', cliSrc.includes("case 'websocket-broadcast':"));
check('websocket-connections CLI', cliSrc.includes("case 'websocket-connections':"));
check('live-stream-start CLI', cliSrc.includes("case 'live-stream-start':"));
check('live-stream-status CLI', cliSrc.includes("case 'live-stream-status':"));
check('webhook-register CLI', cliSrc.includes("case 'webhook-register':"));
check('webhook-list CLI', cliSrc.includes("case 'webhook-list':"));
check('health-pulse CLI', cliSrc.includes("case 'health-pulse':"));

// ── Modules ─────────────────────────────────────────────────────────
console.log(chalk.cyan('\nModules:'));
check('realtime/eventBus.ts', read('src/capabilities/realtime/eventBus.ts').includes('publishEvent'));
check('realtime/webSocketHub.ts', read('src/capabilities/realtime/webSocketHub.ts').includes('broadcast'));
check('realtime/liveStream.ts', read('src/capabilities/realtime/liveStream.ts').includes('startStream'));
check('realtime/webhookReceiver.ts', read('src/capabilities/realtime/webhookReceiver.ts').includes('registerEndpoint'));
check('realtime/pushNotifier.ts', read('src/capabilities/realtime/pushNotifier.ts').includes('sendPush'));
check('realtime/healthMonitor.ts', read('src/capabilities/realtime/healthMonitor.ts').includes('recordPulse'));
check('realtime/realtimeAnalytics.ts', read('src/capabilities/realtime/realtimeAnalytics.ts').includes('recordMetric'));
check('realtime/sseBroadcaster.ts', read('src/capabilities/realtime/sseBroadcaster.ts').includes('emitEvent'));

// ── Summary ─────────────────────────────────────────────────────────
console.log(chalk.bold(`\n━━━ Resultado: ${passed} passed, ${failed} failed ━━━\n`));
process.exit(failed > 0 ? 1 : 0);
