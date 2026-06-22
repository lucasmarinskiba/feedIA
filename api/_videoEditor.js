/**
 * Video Editor — outputs estructurados con beat-sync + captions + b-roll + VFX
 * según plan tier.
 *
 * No hace render real (Vercel timeout 60s). Genera SPEC editable que CapCut
 * o editor externo puede consumir.
 *
 * Plan tier determina:
 *   Pro+: beat-sync + auto-captions + b-roll
 *   Gold+: + motion graphics + transitions + sound design
 *   Premium: + VFX color grading + kinetic typography
 */

import { hasFeature, getFeature } from './_planFeatures.js';

const baseTimingTrack = (totalSec) => {
  const beats = [];
  // Asume 120 BPM = 0.5s per beat. Para reels casuales = 100 BPM = 0.6s.
  const bpm = 100;
  const beatInterval = 60 / bpm;
  for (let t = 0; t < totalSec; t += beatInterval) {
    beats.push({
      tSec: Math.round(t * 100) / 100,
      intensity: t % (beatInterval * 4) < beatInterval ? 'strong' : 'weak',
    });
  }
  return beats;
};

const autoCaptions = (script, totalSec) => {
  const words = (script || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const secPerWord = totalSec / words.length;
  const captions = [];
  for (let i = 0; i < words.length; i++) {
    const start = i * secPerWord;
    const end = (i + 1) * secPerWord;
    captions.push({
      text: words[i],
      startSec: Math.round(start * 100) / 100,
      endSec: Math.round(end * 100) / 100,
      style: i % 4 === 0 ? 'emphasized' : 'default',
    });
  }
  return captions;
};

const bRollSuggestions = (topic, totalSec) => {
  const numClips = Math.max(2, Math.floor(totalSec / 4));
  const suggestions = [];
  for (let i = 0; i < numClips; i++) {
    suggestions.push({
      tSec: Math.round((totalSec / numClips) * i * 100) / 100,
      durationSec: Math.round((totalSec / numClips) * 100) / 100,
      prompt: `B-roll de ${topic} — angle ${i + 1}, cinematic, depth of field`,
      type: i % 2 === 0 ? 'establishing' : 'detail',
    });
  }
  return suggestions;
};

const motionGraphics = (totalSec) => [
  { tSec: 0, type: 'text-reveal', duration: 0.8, params: { easing: 'ease-out', direction: 'bottom' } },
  { tSec: totalSec * 0.3, type: 'shape-transition', duration: 0.4, params: { shape: 'circle-wipe' } },
  { tSec: totalSec * 0.7, type: 'icon-pop', duration: 0.3, params: { icon: 'arrow-right' } },
  { tSec: totalSec - 1, type: 'cta-reveal', duration: 1, params: { style: 'bounce-in' } },
];

const transitions = (totalSec) => {
  const cuts = Math.floor(totalSec / 3);
  return Array.from({ length: cuts }, (_, i) => ({
    tSec: Math.round((i + 1) * 3 * 100) / 100,
    type: ['cut', 'zoom-in', 'slide-left', 'fade'][i % 4],
    durationFrames: 8,
  }));
};

const soundDesign = (totalSec) => [
  { tSec: 0, type: 'impact', file: 'whoosh-intro.mp3', volumeDb: -6 },
  { tSec: totalSec * 0.5, type: 'transition-fx', file: 'pop-mid.mp3', volumeDb: -8 },
  { tSec: totalSec - 0.5, type: 'outro-sting', file: 'sting-outro.mp3', volumeDb: -4 },
];

const vfxColorGrading = () => ({
  lut: 'cinematic-teal-orange',
  exposure: 0.1,
  contrast: 1.15,
  saturation: 1.08,
  highlights: -0.05,
  shadows: 0.1,
  notes: 'Color grade cinematic — teal in shadows, orange in highlights. Boost mid-tones.',
});

const kineticTypography = (script, totalSec) => {
  const sentences = (script || '').split(/[.!?]+/).filter((s) => s.trim());
  return sentences.map((s, i) => ({
    text: s.trim(),
    startSec: (totalSec / sentences.length) * i,
    durationSec: totalSec / sentences.length,
    animation: ['scale-up', 'slide-up', 'word-by-word', 'typewriter'][i % 4],
    font: 'Inter Bold',
    size: 'large',
    color: '#FFFFFF',
    outline: { color: '#000000', width: 2 },
  }));
};

/**
 * Main entry — genera VideoEditSpec según plan.
 */
export const generateVideoEditSpec = ({
  planId,
  script,
  topic,
  totalSec = 15,
  format = 'reel',
  platform = 'instagram',
}) => {
  const plan = planId || 'free';
  const spec = {
    planId: plan,
    format,
    platform,
    totalSec,
    audioTrack: { suggestedMood: 'energetic-uplifting', bpm: 100 },
    layers: [],
  };

  if (hasFeature(plan, 'video.beatSync')) {
    spec.beatTrack = baseTimingTrack(totalSec);
    spec.beatSyncEnabled = true;
  }
  if (hasFeature(plan, 'video.autoCaptions')) {
    spec.captions = autoCaptions(script, totalSec);
    spec.autoCaptionsEnabled = true;
  }
  if (hasFeature(plan, 'video.bRollAutomatic')) {
    spec.bRoll = bRollSuggestions(topic, totalSec);
    spec.bRollAutomaticEnabled = true;
  }
  if (hasFeature(plan, 'video.motionGraphics')) {
    spec.motionGraphics = motionGraphics(totalSec);
    spec.motionGraphicsEnabled = true;
  }
  if (hasFeature(plan, 'video.transitions')) {
    spec.transitions = transitions(totalSec);
  }
  if (hasFeature(plan, 'video.soundDesign')) {
    spec.soundDesign = soundDesign(totalSec);
  }
  if (hasFeature(plan, 'video.vfxColorGrading')) {
    spec.vfx = { colorGrading: vfxColorGrading() };
  }
  if (hasFeature(plan, 'video.kineticTypography')) {
    spec.kineticTypography = kineticTypography(script, totalSec);
  }
  const maxRes = getFeature(plan, 'video.maxResolution')?.value;
  spec.outputResolution = maxRes || '1080p';

  spec.exportFormats = {
    capcut: true, // JSON spec consumible por CapCut
    finalcut: hasFeature(plan, 'enterprise.apiAccess'), // FCPXML via API
    premiere: hasFeature(plan, 'enterprise.apiAccess'), // XML via API
  };

  return spec;
};

export const handleVideoEditor = async (req, res, path, m, body) => {
  if (path === '/api/video/edit-spec' && m === 'POST') {
    const { getSessionFromReq } = await import('./_users.js');
    const ctx = await getSessionFromReq(req);
    const planId = ctx?.user?.plan || 'free';
    const b = body || {};
    const spec = generateVideoEditSpec({
      planId,
      script: b.script || '',
      topic: b.topic || 'tu marca',
      totalSec: b.totalSec || 15,
      format: b.format || 'reel',
      platform: b.platform || 'instagram',
    });
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(spec));
    return true;
  }
  return false;
};
