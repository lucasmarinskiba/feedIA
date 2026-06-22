/**
 * Computer Vision — Coordinate Resolver for Desktop Automation
 * ─────────────────────────────────────────────────────────────────────────
 * Finds on-screen coordinates for UI targets so the desktop controller
 * doesn't operate blindly. Supports two backends:
 *
 *   1. Playwright browser  → uses DOM boundingBox() (most precise)
 *   2. Desktop fallback    → uses resolution-based region-of-interest
 *
 * In the future this module can be extended with real CV (OCR, object
 * detection, color matching) by swapping the resolver implementation.
 */

import { getScreenDimensions } from './controller.js';
import type { UiTarget } from './uiMap.js';

export interface CvResult {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number; // 0-1
  method: 'playwright-bbox' | 'roi-estimate' | 'default-center';
}

/* ── Playwright resolver (most accurate) ───────────────────────────────── */

interface PwLocator {
  first: () => {
    boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null>;
  };
}

export const resolveWithPlaywright = async (
  page: { locator: (s: string) => PwLocator },
  target: UiTarget,
): Promise<CvResult | null> => {
  for (const sel of target.selectors) {
    try {
      const box = await page.locator(sel).first().boundingBox();
      if (box) {
        return {
          x: Math.round(box.x + box.width / 2),
          y: Math.round(box.y + box.height / 2),
          width: Math.round(box.width),
          height: Math.round(box.height),
          confidence: 0.95,
          method: 'playwright-bbox',
        };
      }
    } catch {
      // selector not found, try next
    }
  }
  return null;
};

/* ── Desktop ROI resolver (resolution-based heuristic) ─────────────────── */

interface RegionOfInterest {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Regions of interest for Instagram Web on desktop.
 * Coordinates are ratios (0-1) of screen width/height.
 * These assume the browser is maximized or reasonably large.
 */
const ROI_MAP: Record<string, RegionOfInterest> = {
  // Left sidebar navigation
  home: { xMin: 0.0, xMax: 0.12, yMin: 0.08, yMax: 0.18 },
  search: { xMin: 0.0, xMax: 0.12, yMin: 0.15, yMax: 0.25 },
  explore: { xMin: 0.0, xMax: 0.12, yMin: 0.22, yMax: 0.32 },
  reels: { xMin: 0.0, xMax: 0.12, yMin: 0.29, yMax: 0.39 },
  messages: { xMin: 0.0, xMax: 0.12, yMin: 0.36, yMax: 0.46 },
  notifications: { xMin: 0.0, xMax: 0.12, yMin: 0.43, yMax: 0.53 },
  create: { xMin: 0.0, xMax: 0.12, yMin: 0.5, yMax: 0.6 },
  profile: { xMin: 0.0, xMax: 0.12, yMin: 0.57, yMax: 0.67 },

  // Feed area (center)
  like: { xMin: 0.25, xMax: 0.75, yMin: 0.45, yMax: 0.75 },
  'comment-open': { xMin: 0.25, xMax: 0.75, yMin: 0.45, yMax: 0.75 },
  save: { xMin: 0.6, xMax: 0.75, yMin: 0.45, yMax: 0.75 },
  share: { xMin: 0.6, xMax: 0.75, yMin: 0.45, yMax: 0.75 },

  // Stories bar (top)
  'story-bar': { xMin: 0.15, xMax: 0.85, yMin: 0.05, yMax: 0.15 },
  'story-first': { xMin: 0.15, xMax: 0.3, yMin: 0.05, yMax: 0.15 },

  // Profile header
  'follow-btn': { xMin: 0.25, xMax: 0.45, yMin: 0.18, yMax: 0.28 },
  'edit-profile': { xMin: 0.25, xMax: 0.45, yMin: 0.18, yMax: 0.28 },
  bio: { xMin: 0.25, xMax: 0.55, yMin: 0.22, yMax: 0.32 },

  // Creation flow
  'create-select-file': { xMin: 0.3, xMax: 0.7, yMin: 0.3, yMax: 0.6 },
  'create-next': { xMin: 0.8, xMax: 0.98, yMin: 0.02, yMax: 0.1 },
  'create-caption': { xMin: 0.25, xMax: 0.75, yMin: 0.3, yMax: 0.6 },
  'create-share': { xMin: 0.8, xMax: 0.98, yMin: 0.02, yMax: 0.1 },
};

export const resolveWithRoi = (target: UiTarget): CvResult | null => {
  const roi = ROI_MAP[target.id];
  if (!roi) return null;

  const dims = getScreenDimensions();
  const x = Math.round(dims.width * (roi.xMin + Math.random() * (roi.xMax - roi.xMin)));
  const y = Math.round(dims.height * (roi.yMin + Math.random() * (roi.yMax - roi.yMin)));

  return {
    x,
    y,
    width: Math.round(dims.width * (roi.xMax - roi.xMin) * 0.3),
    height: Math.round(dims.height * (roi.yMax - roi.yMin) * 0.3),
    confidence: 0.6,
    method: 'roi-estimate',
  };
};

/**
 * Default center of screen — last resort.
 */
export const resolveDefault = (): CvResult => {
  const dims = getScreenDimensions();
  return {
    x: Math.round(dims.width / 2),
    y: Math.round(dims.height / 2),
    width: 50,
    height: 50,
    confidence: 0.3,
    method: 'default-center',
  };
};

/**
 * Unified resolver — tries Playwright first, then ROI, then default.
 */
export const resolveCoordinates = async (
  target: UiTarget,
  page?: { locator: (s: string) => PwLocator },
): Promise<CvResult> => {
  if (page) {
    const pw = await resolveWithPlaywright(page, target);
    if (pw) return pw;
  }
  const roi = resolveWithRoi(target);
  if (roi) return roi;
  return resolveDefault();
};
