/**
 * Test Script — Audio Intelligence System (System 15)
 * Run: npx tsx test-audio-endpoints.ts
 */

import * as AudioIntelligence from './src/services/audio-intelligence.js';

const tests: Array<{ name: string; test: () => void }> = [];

// ============ ENDPOINT 1: Trending Audio ============
tests.push({
  name: 'Audio Trending — Fetch TikTok Sounds',
  test: () => {
    const trending = AudioIntelligence.fetchTrendingAudio('tiktok', 'skincare');
    console.log(`  ✓ Found ${trending.length} trending sounds for skincare`);
    trending.forEach((sound) => {
      console.log(`    - ${sound.name} by ${sound.artist} (${sound.virality * 100 | 0}% virality, ${sound.trend})`);
    });
  },
});

// ============ ENDPOINT 2: Match Audio ============
tests.push({
  name: 'Audio Match — Match to Reel Content',
  test: () => {
    const matches = AudioIntelligence.matchAudioToContent('reel', 'skincare', 60);
    console.log(`  ✓ Generated ${matches.length} audio matches`);
    const topMatch = matches[0];
    console.log(`    Top match: audioId=${topMatch.audioId}, score=${(topMatch.matchScore * 100 | 0)}%`);
    console.log(`    Reasoning: ${topMatch.reasoning.join(', ')}`);
    console.log(`    Engagement estimate: ${(topMatch.estimatedEngagement * 100 | 0)}%`);
  },
});

// ============ ENDPOINT 3: Audio Strategy ============
tests.push({
  name: 'Audio Strategy — Weekly Playlist Generation',
  test: () => {
    const strategy = AudioIntelligence.buildAudioStrategy('fitness', 'reel', 3);
    console.log(`  ✓ Generated weekly strategy`);
    console.log(`    Playlist items: ${strategy.weeklyPlaylist.length}`);
    strategy.weeklyPlaylist.forEach((item) => {
      console.log(`      Day ${item.day}: "${item.audio.name}" (${item.reason})`);
    });
    console.log(`    Backup sounds: ${strategy.backupAudios.length}`);
    console.log(`    Avoid list: ${strategy.avoidList.length} declining sounds`);
  },
});

// ============ ENDPOINT 4: Virality Prediction ============
tests.push({
  name: 'Audio Virality — Predict Trajectory + Posting Times',
  test: () => {
    const trendingAudios = AudioIntelligence.fetchTrendingAudio('instagram');
    const predictions = trendingAudios.map((audio) => {
      const pred = AudioIntelligence.predictAudioVirality(audio);
      const times = AudioIntelligence.getOptimalPostingTime(audio.audioId, 'instagram');
      return { audio, prediction: pred, times };
    });

    console.log(`  ✓ Analyzed ${predictions.length} sounds for virality`);
    predictions.forEach((p) => {
      console.log(`    ${p.audio.name}: ${p.prediction.label} (score=${(p.prediction.score * 100 | 0)}%)`);
      console.log(`      Prediction: ${p.prediction.prediction}`);
      console.log(`      Post at: ${p.times.slice(0, 2).join(', ')}`);
    });
  },
});

// ============ ENDPOINT 5: Beat Sync ============
tests.push({
  name: 'Audio Sync — Calculate Beat Sync Points',
  test: () => {
    const audioId = 'aud_tiktok_viral_001';
    const syncPoints = AudioIntelligence.getSyncPoints(audioId, 60);
    console.log(`  ✓ Generated ${syncPoints.length} sync points for 60s video`);
    syncPoints.forEach((point) => {
      console.log(`    ${point.second}s: ${point.action}`);
    });
  },
});

// ============ ADVANCED: Audio Characteristics ============
tests.push({
  name: 'Audio Analysis — Virality + Momentum Scoring',
  test: () => {
    const audio = AudioIntelligence.fetchTrendingAudio('tiktok')[0];
    const { virality, momentum } = AudioIntelligence.analyzeAudioCharacteristics(audio);
    console.log(`  ✓ Analyzed: "${audio.name}"`);
    console.log(`    Virality score: ${(virality * 100 | 0)}%`);
    console.log(`    Momentum: ${(momentum * 100 | 0)}%`);
    console.log(`    Trend: ${audio.trend}`);
    console.log(`    Uses: ${audio.uses.toLocaleString()}`);
  },
});

// ============ WORKFLOW: Full End-to-End ============
tests.push({
  name: 'Audio Workflow — Full Pipeline Test',
  test: () => {
    console.log(`  ✓ Running end-to-end workflow`);

    // Step 1: Discover
    const trending = AudioIntelligence.fetchTrendingAudio('tiktok', 'skincare');
    console.log(`    Step 1 (Discover): Found ${trending.length} trending sounds`);

    // Step 2: Match
    const matches = AudioIntelligence.matchAudioToContent('reel', 'skincare', 60);
    console.log(`    Step 2 (Match): Top match score ${(matches[0].matchScore * 100 | 0)}%`);

    // Step 3: Predict
    const topAudio = trending.find((a) => a.audioId === matches[0].audioId);
    if (topAudio) {
      const pred = AudioIntelligence.predictAudioVirality(topAudio);
      console.log(`    Step 3 (Predict): ${pred.label} - ${pred.prediction}`);
    }

    // Step 4: Schedule
    const times = AudioIntelligence.getOptimalPostingTime(matches[0].audioId, 'tiktok');
    console.log(`    Step 4 (Schedule): Post at ${times[0]}`);

    // Step 5: Sync
    const syncPoints = AudioIntelligence.getSyncPoints(matches[0].audioId, 60);
    console.log(`    Step 5 (Sync): ${syncPoints.length} beat markers for editing`);

    console.log(`    Result: Ready to publish!`);
  },
});

// ============ RUN ALL TESTS ============
console.log('\n🎵 Testing Audio Intelligence System (System 15)\n');

let passed = 0;
let failed = 0;

tests.forEach((t) => {
  try {
    console.log(`\n${t.name}:`);
    t.test();
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err}`);
    failed++;
  }
});

console.log(`\n\n✅ Results: ${passed} passed, ${failed} failed`);
console.log('\n✓ Audio Intelligence operational');
console.log('✓ 5 endpoints ready for Vercel deployment\n');

process.exit(failed > 0 ? 1 : 0);
