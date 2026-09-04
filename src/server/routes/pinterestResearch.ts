/**
 * Pinterest Research API
 *
 * User-facing endpoints for importing Pinterest pin analysis
 * POST /api/research/pinterest/import
 * POST /api/research/pinterest/library
 * GET /api/research/pinterest/template
 */

import type { Express, Request, Response } from 'express';
import { log } from '../../agent/logger.js';
import {
  importPinAnalysis,
  buildResearchLibrary,
  generatePinterestResearchTemplate,
  applyResearchToBrain,
  type PinterestPinAnalysis,
} from '../../capabilities/research/pinterestResearchImporter.js';

// This file previously targeted a `RouteHandler`/`Record<string,
// RouteHandler>` convention (`ctx: {req, res, ...}`, one argument) from
// ../http.ts, with handlers written as if they were plain Express
// `(req, res)` — the two are incompatible signatures, papered over with
// `as unknown as RouteHandler`. Turns out neither mattered: nothing in
// the app ever imports `../http.ts`'s router or `pinterestResearchRoutes`
// (confirmed: grepped the whole src tree) — these 3 endpoints, and the
// log line below that claimed "Routes registered: 3 endpoints" at import
// time, were never actually reachable. Rewritten as real Express
// handlers and registered from server.ts (registerPinterestResearchRoutes),
// matching every other working route file (e.g. api/user-routes.ts).

// ── POST /api/research/pinterest/import ────────────────────────────

export const importPinterestPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const pinData: PinterestPinAnalysis = req.body;

    if (!pinData.pinUrl || !pinData.analysis) {
      res.status(400).json({
        error: 'Missing required fields: pinUrl, analysis',
      });
      return;
    }

    log.info(`[API] Pinterest pin import: ${pinData.title}`);

    const imported = importPinAnalysis(pinData);

    res.status(200).json({
      success: true,
      pinUrl: imported.pinUrl,
      title: imported.title,
      inspirationLevel: imported.inspirationLevel,
      engagement: imported.engagement,
    });
  } catch (error) {
    log.error(`[API] Pinterest import error: ${error}`);
    res.status(500).json({error: 'Import failed'});
  }
};

// ── POST /api/research/pinterest/library ───────────────────────────

 
export const buildPinterestLibrary = async (req: Request, res: Response): Promise<void> => {
  try {
    const {pins} = req.body;

    if (!Array.isArray(pins) || pins.length === 0) {
      res.status(400).json({
        error: 'pins must be array of PinterestPinAnalysis',
      });
      return;
    }

    log.info(`[API] Building research library from ${pins.length} pins`);

    const library = buildResearchLibrary(pins);
    const brainUpdate = applyResearchToBrain(library);

    res.status(200).json({
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
    res.status(500).json({error: 'Library build failed'});
  }
};

// ── GET /api/research/pinterest/template ───────────────────────────

 
export const getPinterestTemplate = async (_req: Request, res: Response): Promise<void> => {
  try {
    log.info('[API] Pinterest research template requested');

    const template = generatePinterestResearchTemplate();

    res.status(200).json({
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
    res.status(500).json({error: 'Template generation failed'});
  }
};

// ── Mount routes on the real Express app ────────────────────────────

export const registerPinterestResearchRoutes = (app: Express): void => {
  app.post('/api/research/pinterest/import', importPinterestPin);
  app.post('/api/research/pinterest/library', buildPinterestLibrary);
  app.get('/api/research/pinterest/template', getPinterestTemplate);
  log.info('[Pinterest Research API] Routes registered: 3 endpoints');
};
