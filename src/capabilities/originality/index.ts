export {
  normalize,
  tokenize,
  shingles,
  jaccard,
  fingerprintHash,
  buildFingerprint,
  type ContentFingerprint,
} from './fingerprint.js';

export { saveFingerprint, listFingerprints, getFingerprint, clearOldFingerprints } from './store.js';

export {
  checkOriginality,
  registerPublished,
  checkAndRegister,
  type DraftToCheck,
  type OriginalityCheck,
} from './checker.js';
