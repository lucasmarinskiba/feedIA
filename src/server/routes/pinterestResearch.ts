/**
 * Pinterest Research API
 *
 * User-facing endpoints for importing Pinterest pin analysis
 * POST /api/research/pinterest/import
 * POST /api/research/pinterest/library
 * GET /api/research/pinterest/template
 */

import type { RouteHandler } from '../http.js';
import { json } from '../http.js';
import { log } from '../../agent/logger.js';
import {
  importPinAnalysis,
  buildResearchLibrary,
  generatePinterestResearchTemplate,
  applyResearchToBrain,
  type PinterestPinAnalysis,
} from '../../capabilities/research/pinterestResearchImporter.js';

// ── POST /api/research/pinterest/import ────────────────────────────

export const importPinterestPin: RouteHandler = async ({ res, body }) => {
  try {
    const pinData = (body ?? {}) as Partial<PinterestPinAnalysis>;

    if (!pinData.pinUrl || !pinData.analysis) {
      json(res, 400, {
        error: 'Missing required fields: pinUrl, analysis',
      });
      return;
    }

    log.info(`[API] Pinterest pin import: ${pinData.title}`);

    const imported = importPinAnalysis(pinData as PinterestPinAnalysis);

    json(res, 200, {
      success: true,
      pinUrl: imported.pinUrl,
      title: imported.title,
      inspirationLevel: imported.inspirationLevel,
      engagement: imported.engagement,
    });
  } catch (error) {
    log.error(`[API] Pinterest import error: ${error}`);
    json(res, 500, {error: 'Import failed'});
  }
};

// ── POST /api/research/pinterest/library ───────────────────────────

export const buildPinterestLibrary: RouteHandler = async ({ res, body }) => {
  try {
    const {pins} = (body ?? {}) as { pins?: PinterestPinAnalysis[] };

    if (!Array.isArray(pins) || pins.length === 0) {
      json(res, 400, {
        error: 'pins must be array of PinterestPinAnalysis',
      });
      return;
    }

    log.info(`[API] Building research library from ${pins.length} pins`);

    const library = buildResearchLibrary(pins);
    const brainUpdate = applyResearchToBrain(library);

    json(res, 200, {
      success: true,
      pinsAnalyzed: library.pins.length,
      topFonts: library.aggregated.topFonts.slice(0, 5),
      topColors: library.aggregated.topColors.slice(0, 5),
      topStrategies: library.aggregated.topStrategies.slice(0, 5),
      topApps: library.aggregated.topApps.slice(0, 5),
      averageEngagement: library.aggregated.averageEngagement,
      recommendedFonts: library.aggregated.recommendedFonts,
      recommendedPalettes: library.aggregated.recommendedPalettes,
      brainRules: brainUpdate.rules,
      brainRecommendations: brainUpdate.recommendations,
    });
  } catch (error) {
    log.error(`[API] Library build error: ${error}`);
    json(res, 500, {error: 'Library build failed'});
  }
};

// ── GET /api/research/pinterest/template ───────────────────────────

export const getPinterestTemplate: RouteHandler = async ({ res }) => {
  try {
    log.info('[API] Pinterest research template requested');

    const template = generatePinterestResearchTemplate();

    json(res, 200, {
      success: true,
      template,
      instructions: `
1. Visit each Pinterest pin link from your list
2. Manually analyze the pin:
   - Note fonts used (headlines, body, scripts)
   - Extract color palette (use Coolors.co color picker)
   - Identify layout strategy (image bg, overlay, side-by-side, etc)
   - List visual elements (images, mockups, icons, graphics)
   - Document copy strategies (hook style, technique, CTA)
   - Note apps mentioned in comments or pin description
   - Record resource sources (image sites, font sources, mockup tools)
3. Fill in the JSON template above
4. POST to /api/research/pinterest/import
5. After 5-10 pins, POST collection to /api/research/pinterest/library
6. FeedIA brain learns the patterns and applies to new content
      `,
    });
  } catch (error) {
    log.error(`[API] Template error: ${error}`);
    json(res, 500, {error: 'Template generation failed'});
  }
};

// ── Export routes for mounting ─────────────────────────────────────

export const pinterestResearchRoutes = {
  'POST /api/research/pinterest/import': importPinterestPin,
  'POST /api/research/pinterest/library': buildPinterestLibrary,
  'GET /api/research/pinterest/template': getPinterestTemplate,
};

log.info('[Pinterest Research API] Routes registered: 3 endpoints');
