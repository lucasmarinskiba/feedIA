export * from './types.js';
export { PipelineRunner, type PipelineConfig } from './pipeline.js';
export {
  BaseEngine,
  type StudioEngine,
  CanvaEngine,
  ImageGenEngine,
  CapCutEngine,
  InShotEngine,
  AdobeExpressEngine,
  FigmaEngine,
} from './engines/index.js';

import { PipelineRunner } from './pipeline.js';
import {
  CanvaEngine,
  ImageGenEngine,
  CapCutEngine,
  InShotEngine,
  AdobeExpressEngine,
  FigmaEngine,
} from './engines/index.js';

let _defaultRunner: PipelineRunner | null = null;

export const getDefaultRunner = (): PipelineRunner => {
  if (!_defaultRunner) {
    _defaultRunner = new PipelineRunner();
    _defaultRunner.registerEngine(new CanvaEngine());
    _defaultRunner.registerEngine(new ImageGenEngine());
    _defaultRunner.registerEngine(new CapCutEngine());
    _defaultRunner.registerEngine(new InShotEngine());
    _defaultRunner.registerEngine(new AdobeExpressEngine());
    _defaultRunner.registerEngine(new FigmaEngine());
  }
  return _defaultRunner;
};

export const resetDefaultRunner = (): void => {
  _defaultRunner = null;
};
