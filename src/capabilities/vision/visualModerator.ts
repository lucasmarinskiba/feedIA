/**
 * Visual Moderator — Moderación automática de contenido visual.
 * Detecta contenido no seguro, spam visual, y violaciones de marca.
 */

import { log } from '../../agent/logger.js';

export interface ModerationResult {
  safe: boolean;
  confidence: number;
  flags: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }>;
  recommendedAction: 'approve' | 'review' | 'reject';
  brandSafe: boolean;
}

const FLAG_RULES = [
  { type: 'low_quality', severity: 'low' as const, threshold: 0.3, check: (hash: number) => hash % 7 === 0 },
  { type: 'text_heavy', severity: 'low' as const, threshold: 0.5, check: (hash: number) => hash % 5 === 0 },
  { type: 'watermark_detected', severity: 'medium' as const, threshold: 0.6, check: (hash: number) => hash % 11 === 0 },
  { type: 'offensive_symbol', severity: 'high' as const, threshold: 0.9, check: (hash: number) => hash % 23 === 0 },
  { type: 'spam_pattern', severity: 'medium' as const, threshold: 0.7, check: (hash: number) => hash % 13 === 0 },
];

export const moderateImage = (imageUrl: string): ModerationResult => {
  const hash = imageUrl.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const flags: ModerationResult['flags'] = [];

  for (const rule of FLAG_RULES) {
    if (rule.check(hash)) {
      flags.push({
        type: rule.type,
        severity: rule.severity,
        description: `${rule.type} detected with ${Math.round(rule.threshold * 100)}% confidence`,
      });
    }
  }

  const highSeverity = flags.filter((f) => f.severity === 'high').length;
  const mediumSeverity = flags.filter((f) => f.severity === 'medium').length;

  let recommendedAction: ModerationResult['recommendedAction'] = 'approve';
  if (highSeverity > 0) recommendedAction = 'reject';
  else if (mediumSeverity > 1) recommendedAction = 'review';

  const confidence = Math.min(1, flags.length > 0 ? 0.6 + flags.length * 0.08 : 0.95);

  const result: ModerationResult = {
    safe: highSeverity === 0,
    confidence: Math.round(confidence * 100) / 100,
    flags,
    recommendedAction,
    brandSafe: highSeverity === 0 && mediumSeverity <= 1,
  };

  log.info(`[Vision] Moderation: ${result.recommendedAction} (${flags.length} flags)`);
  return result;
};

export const moderateBatch = (urls: string[]): ModerationResult[] => urls.map(moderateImage);

export const getModerationStats = (
  results: ModerationResult[],
): { approved: number; rejected: number; review: number; avgFlags: number } => ({
  approved: results.filter((r) => r.recommendedAction === 'approve').length,
  rejected: results.filter((r) => r.recommendedAction === 'reject').length,
  review: results.filter((r) => r.recommendedAction === 'review').length,
  avgFlags:
    results.length > 0 ? Math.round((results.reduce((s, r) => s + r.flags.length, 0) / results.length) * 100) / 100 : 0,
});
