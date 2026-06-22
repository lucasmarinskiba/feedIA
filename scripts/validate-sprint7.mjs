#!/usr/bin/env node
/**
 * Sprint 7 Validation — Neural Brain Revival + Vector DB
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

console.log(chalk.bold('\n━━━ Sprint 7 Validation ━━━\n'));

// ── Agents ──────────────────────────────────────────────────────────
console.log(chalk.cyan('Agents:'));
const agentsSrc = read('src/capabilities/agents/integrationAgents.ts');
check('neural-brain-operator agent', agentsSrc.includes("'neural-brain-operator'"));
check('attention-router agent', agentsSrc.includes("'attention-router'"));
check('memory-curator agent', agentsSrc.includes("'memory-curator'"));
check('brand-memory-keeper agent', agentsSrc.includes("'brand-memory-keeper'"));

// ── Tools ───────────────────────────────────────────────────────────
console.log(chalk.cyan('\nTools:'));
const toolsSrc = read('src/agent/tools.ts');
check('neural_attention_rank tool', toolsSrc.includes('neural_attention_rank'));
check('neural_attention_select tool', toolsSrc.includes('neural_attention_select'));
check('neural_memory_record tool', toolsSrc.includes('neural_memory_record'));
check('neural_memory_recall tool', toolsSrc.includes('neural_memory_recall'));
check('neural_memory_stats tool', toolsSrc.includes('neural_memory_stats'));
check('neural_learning_record tool', toolsSrc.includes('neural_learning_record'));
check('neural_learning_analyze tool', toolsSrc.includes('neural_learning_analyze'));
check('neural_focus_start tool', toolsSrc.includes('neural_focus_start'));
check('neural_focus_end tool', toolsSrc.includes('neural_focus_end'));
check('neural_focus_interrupt tool', toolsSrc.includes('neural_focus_interrupt'));
check('vector_store_add tool', toolsSrc.includes('vector_store_add'));
check('vector_store_query tool', toolsSrc.includes('vector_store_query'));
check('vector_store_stats tool', toolsSrc.includes('vector_store_stats'));
check('rag_query tool', toolsSrc.includes('rag_query'));
check('rag_ingest_knowledge tool', toolsSrc.includes('rag_ingest_knowledge'));
check('rag_ingest_faq tool', toolsSrc.includes('rag_ingest_faq'));
check('semantic_search tool', toolsSrc.includes('semantic_search'));

// ── Playbooks ───────────────────────────────────────────────────────
console.log(chalk.cyan('\nPlaybooks:'));
const playbooksSrc = read('src/agent/playbooks/index.ts');
check('neural-memory-cycle playbook', playbooksSrc.includes("id: 'neural-memory-cycle'"));
check('rag-knowledge-ops playbook', playbooksSrc.includes("id: 'rag-knowledge-ops'"));

// ── Scheduler Jobs ──────────────────────────────────────────────────
console.log(chalk.cyan('\nScheduler Jobs:'));
const jobsSrc = read('src/scheduler/jobs.ts');
check('neural-memory-consolidate job', jobsSrc.includes("name: 'neural-memory-consolidate'"));
check('neural-learning-sync job', jobsSrc.includes("name: 'neural-learning-sync'"));
check('vector-store-cleanup job', jobsSrc.includes("name: 'vector-store-cleanup'"));
check('rag-knowledge-sync job', jobsSrc.includes("name: 'rag-knowledge-sync'"));
check('semantic-search-index job', jobsSrc.includes("name: 'semantic-search-index'"));
check('attention-routing-daily job', jobsSrc.includes("name: 'attention-routing-daily'"));

// ── CLI Commands ────────────────────────────────────────────────────
console.log(chalk.cyan('\nCLI Commands:'));
const cliSrc = read('src/cli.ts');
check('neural-memory-stats CLI', cliSrc.includes("case 'neural-memory-stats':"));
check('neural-memory-recall CLI', cliSrc.includes("case 'neural-memory-recall':"));
check('neural-memory-record CLI', cliSrc.includes("case 'neural-memory-record':"));
check('neural-learning-analyze CLI', cliSrc.includes("case 'neural-learning-analyze':"));
check('neural-focus-start CLI', cliSrc.includes("case 'neural-focus-start':"));
check('neural-focus-end CLI', cliSrc.includes("case 'neural-focus-end':"));
check('vector-store-query CLI', cliSrc.includes("case 'vector-store-query':"));
check('vector-store-add CLI', cliSrc.includes("case 'vector-store-add':"));
check('rag-query CLI', cliSrc.includes("case 'rag-query':"));
check('rag-ingest CLI', cliSrc.includes("case 'rag-ingest':"));
check('semantic-search CLI', cliSrc.includes("case 'semantic-search':"));

// ── Modules ─────────────────────────────────────────────────────────
console.log(chalk.cyan('\nModules:'));
check('neural/memoryGateway.ts', read('src/capabilities/neural/memoryGateway.ts').includes('recordEpisodic'));
check('neural/attentionEngine.ts', read('src/capabilities/neural/attentionEngine.ts').includes('rankTasks'));
check('neural/learningLoop.ts', read('src/capabilities/neural/learningLoop.ts').includes('recordOutcome'));
check('neural/decisionCortex.ts', read('src/capabilities/neural/decisionCortex.ts').includes('makeDecision'));
check('memory/vectorStore.ts', read('src/capabilities/memory/vectorStore.ts').includes('addDocument'));
check('memory/embeddings.ts', read('src/capabilities/memory/embeddings.ts').includes('generateTextEmbedding'));
check('memory/ragEngine.ts', read('src/capabilities/memory/ragEngine.ts').includes('queryRAG'));
check('memory/semanticSearch.ts', read('src/capabilities/memory/semanticSearch.ts').includes('searchSimilar'));

// ── Summary ─────────────────────────────────────────────────────────
console.log(chalk.bold(`\n━━━ Resultado: ${passed} passed, ${failed} failed ━━━\n`));
process.exit(failed > 0 ? 1 : 0);
