/**
 * Types for the content-strategy engine's output. This module never
 * existed -- contentStrategyEngine.ts, index.ts, inputs/goalSignals.ts,
 * and opportunityScorer.ts all imported ContentPillar/ContentPlan/
 * StrategicBrief from './output/strategicBrief.js', which had no
 * corresponding file anywhere in the repo. Reconstructed from how each
 * type is actually built and consumed at every call site (the object
 * literals in contentStrategyEngine.ts's planNextContent, the exact
 * ContentPillar value set enumerated in inputs/goalSignals.ts), not
 * guessed -- every field here is one something already reads or writes.
 */

import type { ContentFormat } from '../../../config/types.js';

export type ContentPillar =
  | 'authority'
  | 'education'
  | 'entertainment'
  | 'community'
  | 'conversion'
  | 'awareness';

export interface StrategicBrief {
  id: string;
  topic: string;
  angle: string;
  format: ContentFormat;
  platforms: Array<'instagram' | 'tiktok'>;
  pillar: ContentPillar;
  why: string;
  estimatedEngagement: 'bajo' | 'medio' | 'alto';
  confidence: number;
  urgency: number;
  cta: string;
  hashtags: string[];
  bestHour: string;
  bestDay: string;
}

export interface ContentPlan {
  brandName: string;
  generatedAt: string;
  windowDays: number;
  briefs: StrategicBrief[];
  insights: string[];
}
