export {
  runComputerUseSession,
  takeScreenshot,
  clickMouse,
  typeText,
  pressKey,
  scrollAt,
  moveMouse,
  getScreenDimensions,
  type ComputerUseOptions,
  type ComputerUseResult,
  type ScreenDimensions,
} from './controller.js';

export {
  navegarInstagram,
  interactuarConPost,
  leerFeed,
  buscarCuentaOHashtag,
  leerDMs,
  verPerfil,
  verNotificaciones,
  INSTAGRAM_UI_ZONES,
  type InstagramNavigationOptions,
  type InstagramZone,
} from './instagramNavigator.js';

// ── Natural-language planning layer (NL instruction → auditable action plan)
export { planComputerUse, planInternalNavigation, type ComputerAction, type ComputerPlan } from './planner.js';

export {
  INSTAGRAM_UI,
  INSTAGRAM_ROUTES,
  getTarget,
  listTargets,
  resolveTargetByName,
  type UiTarget,
  type Gesture,
} from './uiMap.js';

// ── Optional live executor (Playwright via dynamic import, graceful fallback)
export {
  executePlan,
  isLiveRuntimeAvailable,
  listComputerRuns,
  resumeSession,
  getPendingSessions,
  type ExecResult,
  type ExecStepResult,
  type ExecOptions,
} from './executor.js';

// ── Live Theater: el usuario MIRA al sistema operar (SSE en vivo)
export { startWatchSession, subscribeWatch, listWatchSessions, type CuEvent, type WatchResult } from './liveSession.js';

// ── Guion específico de Canva (carrusel) — para el Teatro en vivo
export { planCanvaCarousel, type CanvaSlide } from './canvaPlan.js';

// ── Guion específico de CapCut (reel/video) — para el Teatro en vivo
export { planCapCutVideo, type CapCutBeat } from './capcutPlan.js';

export { computerUseLiveEnabled, isComputerUseLiveAvailable } from './anthropicDriver.js';

// ── Instagram Actions API (high-level wrappers with DryRun gates)
export {
  darLike,
  comentarEnPost,
  publicarPost,
  publicarHistoria,
  publicarReel,
  seguirCuenta,
  enviarDM,
  responderDMsPendientes,
  editarPerfil,
  realizarBeaconEngagement,
  procesarNotificaciones,
  leerInsights,
  moderarComentariosDePost,
  interactuarConTendencia,
  crearHighlight,
  auditarPerfil,
  verAnaliticasPost,
} from './instagramActions.js';

// ── Selector Health (automated DOM rot detection)
export {
  runFullHealthCheck,
  getLatestHealthReport,
  isTargetHealthy,
  getBestSelector,
  type HealthReport,
  type TargetHealth,
  type SelectorCheck,
} from './selectorHealth.js';

// ── Computer Vision: coordinate resolver for desktop automation
export {
  resolveWithPlaywright,
  resolveWithRoi,
  resolveDefault,
  resolveCoordinates,
  type CvResult,
} from './computerVision.js';
