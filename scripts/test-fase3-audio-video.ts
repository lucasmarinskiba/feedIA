#!/usr/bin/env node
/**
 * Script manual para validar Fase 3: video IA, cost tracking, audio mix y mux.
 */

import { produceReel } from '../src/capabilities/videoEngine/videoProducer.js';
import { getTotalVideoCostUsd } from '../src/capabilities/videoEngine/usageTracker.js';
import { generateAudioForVideo } from '../src/capabilities/audioEngine/audioMixer.js';
import { muxAudioVideo } from '../src/capabilities/videoEngine/audioVideoMixer.js';
import type { ReelScript } from '../src/capabilities/content/reel.js';

const script: ReelScript = {
  hookVisual: 'Mirá este truco',
  beats: [],
  caption: 'Aprendé a hacer crecer tu marca en 30 segundos.',
  hashtags: ['#marketing'],
  cta: 'Seguime para más',
  audioSugerido: 'upbeat',
  duracionSegundos: 15,
  notasRetencion: '',
};

async function main(): Promise<void> {
  console.log('1) Produciendo video IA (DRY_RUN)...');
  const video = await produceReel(script, 'crecimiento en Instagram', 'TestBrand', {
    style: 'broll',
    maxCostUsd: 5,
  });
  console.log(JSON.stringify(video, null, 2));

  console.log('\n2) Costo acumulado hoy:', getTotalVideoCostUsd({ brandName: 'TestBrand' }));

  console.log('\n3) Generando audio completo...');
  const audio = await generateAudioForVideo({
    scriptText: `${script.hookVisual}. ${script.caption}. ${script.cta}`,
    contentType: 'education',
    durationSec: video.durationSec,
    mood: 'upbeat',
    sfx: ['pop'],
  });
  console.log(JSON.stringify(audio, null, 2));

  if (video.videoUrl && audio.audioUrl) {
    console.log('\n4) Mezclando audio + video...');
    const mux = await muxAudioVideo({ videoUrl: video.videoUrl, audioUrl: audio.audioUrl });
    console.log(JSON.stringify(mux, null, 2));
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
