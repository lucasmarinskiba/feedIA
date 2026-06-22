/**
 * Motion Graphics — genera animaciones Lottie simples para textos y elementos.
 */

import type { MotionGraphic } from './types.js';

export interface LottieAnimation {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm: string;
  layers: unknown[];
  assets: unknown[];
}

const baseLottie = (w: number, h: number, name: string): LottieAnimation => ({
  v: '5.7.0',
  fr: 30,
  ip: 0,
  op: 90,
  w,
  h,
  nm: name,
  layers: [],
  assets: [],
});

export const generateTextRevealLottie = (text: string, width = 1080, height = 1920): LottieAnimation => {
  const lottie = baseLottie(width, height, 'text-reveal');
  lottie.layers = [
    {
      ddd: 0,
      ind: 1,
      ty: 5, // text layer
      nm: text,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0] },
            { t: 30, s: [100] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [width / 2, height / 2, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [80, 80, 100] },
            { t: 30, s: [100, 100, 100] },
          ],
        },
      },
      t: {
        d: {
          k: [
            {
              s: {
                s: 72,
                f: 'Inter',
                t: text,
                j: 2, // center
                tr: 0,
                lh: 86.4,
                ls: 0,
                fc: [0.07, 0.07, 0.07],
              },
            },
          ],
        },
      },
    },
  ];
  return lottie;
};

export const generateZoomPulseLottie = (width = 1080, height = 1920): LottieAnimation => {
  const lottie = baseLottie(width, height, 'zoom-pulse');
  lottie.layers = [
    {
      ddd: 0,
      ind: 1,
      ty: 4, // shape layer
      nm: 'pulse',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [width / 2, height / 2, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100, 100] },
            { t: 45, s: [110, 110, 100] },
            { t: 90, s: [100, 100, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', s: { a: 0, k: [200, 200] }, p: { a: 0, k: [0, 0] } },
            { ty: 'fl', c: { a: 0, k: [1, 0, 0.33, 1] } },
          ],
        },
      ],
    },
  ];
  return lottie;
};

export const generateMotionGraphic = (opts: {
  type: MotionGraphic['type'];
  text?: string;
  width?: number;
  height?: number;
}): { lottie: LottieAnimation; json: string } => {
  const { type, text = '', width = 1080, height = 1920 } = opts;

  let lottie: LottieAnimation;
  switch (type) {
    case 'text_reveal':
      lottie = generateTextRevealLottie(text, width, height);
      break;
    case 'zoom':
    case 'pulse':
      lottie = generateZoomPulseLottie(width, height);
      break;
    default:
      lottie = generateTextRevealLottie(text, width, height);
  }

  return { lottie, json: JSON.stringify(lottie) };
};

export const listMotionGraphics = (): MotionGraphic[] => [
  { id: 'mg-text-reveal', name: 'Text Reveal', type: 'text_reveal', durationSec: 3, params: {} },
  { id: 'mg-zoom', name: 'Zoom Pulse', type: 'zoom', durationSec: 3, params: {} },
  { id: 'mg-pulse', name: 'Pulse', type: 'pulse', durationSec: 3, params: {} },
];
