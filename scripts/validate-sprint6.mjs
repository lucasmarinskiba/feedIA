#!/usr/bin/env node
/**
 * Sprint 6 Validation — TikTok Native + Audio AI
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

console.log(chalk.bold('\n━━━ Sprint 6 Validation ━━━\n'));

// ── Agents ──────────────────────────────────────────────────────────
console.log(chalk.cyan('Agents:'));
const agentsSrc = read('src/capabilities/agents/integrationAgents.ts');
check('tiktok-native-specialist agent', agentsSrc.includes("'tiktok-native-specialist'"));
check('tiktok-shop-operator agent', agentsSrc.includes("'tiktok-shop-operator'"));
check('audio-producer agent', agentsSrc.includes("'audio-producer'"));
check('voice-brand-manager agent', agentsSrc.includes("'voice-brand-manager'"));
check('sound-curator agent', agentsSrc.includes("'sound-curator'"));

// ── Tools ───────────────────────────────────────────────────────────
console.log(chalk.cyan('\nTools:'));
const toolsSrc = read('src/agent/tools.ts');
check('tiktok_fetch_trends tool', toolsSrc.includes('tiktok_fetch_trends'));
check('tiktok_get_sounds tool', toolsSrc.includes('tiktok_get_sounds'));
check('tiktok_get_templates tool', toolsSrc.includes('tiktok_get_templates'));
check('tiktok_calculate_fyp_score tool', toolsSrc.includes('tiktok_calculate_fyp_score'));
check('tiktok_generate_optimization_plan tool', toolsSrc.includes('tiktok_generate_optimization_plan'));
check('tiktok_get_blueprint tool', toolsSrc.includes('tiktok_get_blueprint'));
check('tiktok_detect_beats tool', toolsSrc.includes('tiktok_detect_beats'));
check('tiktok_generate_sync_points tool', toolsSrc.includes('tiktok_generate_sync_points'));
check('tiktok_generate_edl tool', toolsSrc.includes('tiktok_generate_edl'));
check('audio_generate_music tool', toolsSrc.includes('audio_generate_music'));
check('audio_generate_sfx tool', toolsSrc.includes('audio_generate_sfx'));
check('audio_synthesize_speech tool', toolsSrc.includes('audio_synthesize_speech'));
check('audio_clone_voice tool', toolsSrc.includes('audio_clone_voice'));
check('audio_list_voices tool', toolsSrc.includes('audio_list_voices'));
check('audio_generate_voiceover tool', toolsSrc.includes('audio_generate_voiceover'));
check('audio_dub_video tool', toolsSrc.includes('audio_dub_video'));
check('audio_create_sound_design tool', toolsSrc.includes('audio_create_sound_design'));
check('audio_get_recipe tool', toolsSrc.includes('audio_get_recipe'));
check('audio_get_sfx_preset tool', toolsSrc.includes('audio_get_sfx_preset'));

// ── Playbooks ───────────────────────────────────────────────────────
console.log(chalk.cyan('\nPlaybooks:'));
const playbooksSrc = read('src/agent/playbooks/index.ts');
check('tiktok-viral-factory playbook', playbooksSrc.includes("id: 'tiktok-viral-factory'"));
check('audio-production-pipeline playbook', playbooksSrc.includes("id: 'audio-production-pipeline'"));

// ── Scheduler Jobs ──────────────────────────────────────────────────
console.log(chalk.cyan('\nScheduler Jobs:'));
const jobsSrc = read('src/scheduler/jobs.ts');
check('tiktok-trend-scout job', jobsSrc.includes("name: 'tiktok-trend-scout'"));
check('tiktok-fyp-optimizer job', jobsSrc.includes("name: 'tiktok-fyp-optimizer'"));
check('tiktok-analytics-sync job', jobsSrc.includes("name: 'tiktok-analytics-sync'"));
check('tiktok-content-producer job', jobsSrc.includes("name: 'tiktok-content-producer'"));
check('audio-music-generate job', jobsSrc.includes("name: 'audio-music-generate'"));
check('audio-sfx-pack-generate job', jobsSrc.includes("name: 'audio-sfx-pack-generate'"));

// ── CLI Commands ────────────────────────────────────────────────────
console.log(chalk.cyan('\nCLI Commands:'));
const cliSrc = read('src/cli.ts');
check('tiktok-trends CLI', cliSrc.includes("case 'tiktok-trends':"));
check('tiktok-sounds CLI', cliSrc.includes("case 'tiktok-sounds':"));
check('tiktok-templates CLI', cliSrc.includes("case 'tiktok-templates':"));
check('tiktok-blueprint CLI', cliSrc.includes("case 'tiktok-blueprint':"));
check('tiktok-fyp-score CLI', cliSrc.includes("case 'tiktok-fyp-score':"));
check('audio-music CLI', cliSrc.includes("case 'audio-music':"));
check('audio-voiceover CLI', cliSrc.includes("case 'audio-voiceover':"));
check('audio-sfx CLI', cliSrc.includes("case 'audio-sfx':"));
check('audio-sound-design CLI', cliSrc.includes("case 'audio-sound-design':"));
check('audio-dub CLI', cliSrc.includes("case 'audio-dub':"));

// ── Modules ─────────────────────────────────────────────────────────
console.log(chalk.cyan('\nModules:'));
check('tiktok/trendEngine.ts', read('src/capabilities/tiktok/trendEngine.ts').includes('TikTokTrend'));
check('tiktok/fypOptimizer.ts', read('src/capabilities/tiktok/fypOptimizer.ts').includes('calculateFYPScore'));
check('tiktok/videoTemplates.ts', read('src/capabilities/tiktok/videoTemplates.ts').includes('TikTokTemplate'));
check('tiktok/soundSync.ts', read('src/capabilities/tiktok/soundSync.ts').includes('detectBeats'));
check('tiktok/analytics.ts', read('src/capabilities/tiktok/analytics.ts').includes('TikTokVideoMetrics'));
check('audio/musicGeneration.ts', read('src/capabilities/audio/musicGeneration.ts').includes('generateMusic'));
check('audio/sfxGeneration.ts', read('src/capabilities/audio/sfxGeneration.ts').includes('generateSFX'));
check('audio/voiceCloning.ts', read('src/capabilities/audio/voiceCloning.ts').includes('synthesizeSpeech'));
check('audio/autoDubbing.ts', read('src/capabilities/audio/autoDubbing.ts').includes('dubVideo'));
check('audio/soundDesign.ts', read('src/capabilities/audio/soundDesign.ts').includes('SoundDesignProject'));

// ── Summary ─────────────────────────────────────────────────────────
console.log(chalk.bold(`\n━━━ Resultado: ${passed} passed, ${failed} failed ━━━\n`));
process.exit(failed > 0 ? 1 : 0);
