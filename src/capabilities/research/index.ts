/**
 * Research — kit de autoservicio del sistema
 * ─────────────────────────────────────────────────────────────────────────
 * Las herramientas con las que el sistema "se sirve a sí mismo": apuntes
 * vivos (ledger), calculadora determinista, lectura de fuentes (webFetch),
 * consulta al profesor (askProfessor) y sesiones de estudio del panorama.
 */

export {
  recordLedgerEntry,
  queryLedger,
  pruneLedger,
  formatLedgerAsPrompt,
  type LedgerEntry,
  type LedgerTopic,
  type LedgerConfidence,
} from './ledger.js';

export { igCalc, type IgCalcOp } from './calc.js';
export { webFetch, type WebFetchResult } from './webFetch.js';
export { askProfessor, type ConsultResult } from './consult.js';
export { runStudySession, type StudyReport, type StudyFinding } from './study.js';
