import { generateMotionGraphic, generateTextRevealLottie, generateZoomPulseLottie, listMotionGraphics } from './src/capabilities/creativeSuite/motionGraphics.js';

const r = generateMotionGraphic({ type: 'text_reveal', text: 'Hook poderoso', width: 1080, height: 1920 });
console.log('text_reveal ok:', r.lottie.v, r.lottie.w, r.lottie.h, r.lottie.layers.length);
console.log('text found:', r.lottie.layers.some(l => l.nm === 'Hook poderoso' || l.t?.d?.k?.[0]?.s?.t === 'Hook poderoso'));

const z = generateMotionGraphic({ type: 'zoom', width: 1080, height: 1920 });
console.log('zoom ok:', z.lottie.nm, z.lottie.layers.length);

const list = listMotionGraphics();
console.log('list count:', list.length, 'types:', list.map(g => g.type).join(','));
