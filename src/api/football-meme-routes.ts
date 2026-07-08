/**
 * Football Meme Routes
 * Generate viral football carousel designs
 * @433 style: post-goal, rivalry, mockery, iconic moments
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { promptRefinementEngine } from '../services/prompt-refinement-engine.js';
import { qualityValidator } from '../services/quality-validator.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

// Football meme prompt templates by category
const FOOTBALL_TEMPLATES = {
  'post-goal': `[PLAYER_NAME] just scored. Instant viral moment.
Design: Hero shot close-up celebration. [PLAYER_NAME] face ecstasy. Stadium lights bokeh behind.
Background: Blurred crowd, goal stadium, celebration energy.
Overlay: Trophy glow, ball trajectory, motion lines.
Text: "[TEXT_OVERLAY]" — Bold [FONT_STYLE] font, [COLOR], [POSITION]
Team colors: [TEAM] primary + gold accents.
Emotion: [EMOTION]. Raw celebration. Viral energy.`,

  'rivalry-mock': `[COUNTRY_A] beat [COUNTRY_B]. Mockery time.
Design: [MEME_TYPE] visual. Rivalry energy.
[COUNTRY_A] celebrating over defeated [COUNTRY_B].
Background: [DESIGN_STYLE] aesthetic.
Text: "[TEXT_OVERLAY]" — Impact font, [COLOR], center or side placement
Colors: [COUNTRY_A] flag colors vs [COUNTRY_B] desaturated.
Tone: Victory, disrespect, comedy. No mercy.`,

  'player-comparison': `[PLAYER_NAME] vs [LEGEND_PLAYER]. Eternal debate.
Design: Split-screen or overlay. Both elevated.
Left: [PLAYER_NAME], glowing, modern era.
Right: [LEGEND_PLAYER], ghosted, legendary aura.
Text: "THE DEBATE WILL NEVER END" or "[PLAYER_NAME] > [LEGEND_PLAYER]"
Colors: [TEAM] colors for [PLAYER_NAME], neutral for legend.
Stats overlay: Goals, assists, trophies visible.
Vibe: Respect, competitive, admiration.`,

  'iconic-moment': `[MOMENT_NAME]: [YEAR]. Frozen in time.
Design: Cinematic. Epic. Trophy or stadium background.
Player mid-action: Goal, save, trophy lift.
Background: Crowd roar energy. Lights. Drama.
Text: "GOAL OF THE CENTURY" or "[TEAM] GLORY"
Colors: Warm (gold, orange) for triumph. Cool (blue, purple) for drama.
Composition: Central subject, stadium edges, motion implied.`,

  'underdog-triumph': `[UNDERDOG_TEAM] beat [GIANT_TEAM]. Impossible dream.
Design: David vs Goliath visual. Small vs large.
Underdog player celebrating over giant opposition.
Background: Stadium exploding with joy.
Text: "[UNDERDOG_TEAM] MADE HISTORY" — Bold, oversized
Colors: Underdog colors BRIGHT, giant colors FADED.
Emotion: Shock, inspiration, belief in impossible.`,
};

/**
 * POST /api/football/generate
 * Generate single football meme prompt
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const {
      category = 'post-goal',
      playerName,
      team,
      rivalTeam,
      country,
      rivalCountry,
      moment = 'goal',
      emotion = 'ecstasy',
      designStyle = 'cinematic',
      trophy,
      memeType = 'hero-shot',
      textOverlay = 'DEFAULT TEXT',
      fontSize = 'bold',
      textColor = 'white',
      textPosition = 'center',
      fontStyle = 'impact',
      year,
      comedyLevel = 'high',
    } = req.body;

    if (!playerName && !country) {
      return res.status(400).json({ error: 'playerName or country required' });
    }

    log.info('[FootballMeme] Generation requested', { category, playerName, country });

    // Get template
    let template = FOOTBALL_TEMPLATES[category as keyof typeof FOOTBALL_TEMPLATES] || FOOTBALL_TEMPLATES['post-goal'];

    // Replace placeholders
    template = template
      .replace(/\[PLAYER_NAME\]/g, playerName || '[PLAYER]')
      .replace(/\[TEAM\]/g, team || '[TEAM]')
      .replace(/\[RIVAL_TEAM\]/g, rivalTeam || '[RIVAL]')
      .replace(/\[COUNTRY_A\]/g, country || '[COUNTRY_A]')
      .replace(/\[COUNTRY_B\]/g, rivalCountry || '[COUNTRY_B]')
      .replace(/\[MOMENT\]/g, moment)
      .replace(/\[EMOTION\]/g, emotion)
      .replace(/\[DESIGN_STYLE\]/g, designStyle)
      .replace(/\[TROPHY\]/g, trophy || 'trophy')
      .replace(/\[MEME_TYPE\]/g, memeType)
      .replace(/\[TEXT_OVERLAY\]/g, textOverlay)
      .replace(/\[FONT_STYLE\]/g, fontStyle)
      .replace(/\[COLOR\]/g, textColor)
      .replace(/\[POSITION\]/g, textPosition)
      .replace(/\[YEAR\]/g, year || new Date().getFullYear().toString())
      .replace(/\[LEGEND_PLAYER\]/g, 'Pele/Maradona/Messi')
      .replace(/\[MOMENT_NAME\]/g, moment)
      .replace(/\[UNDERDOG_TEAM\]/g, playerName || team || '[UNDERDOG]')
      .replace(/\[GIANT_TEAM\]/g, rivalTeam || '[GIANT]');

    // Validate quality
    const validation = await qualityValidator.validatePrompt(template);

    // Refine if needed
    let finalPrompt = template;
    if (!validation.passed) {
      const refinement = await promptRefinementEngine.refinePrompt(template);
      finalPrompt = refinement.refinedPrompt;
    }

    return res.json({
      status: 'success',
      prompt: finalPrompt,
      category,
      parameters: {
        player: playerName,
        team,
        rivalTeam,
        country,
        emotion,
        designStyle,
        textOverlay,
        textFormat: { font: fontStyle, color: textColor, size: fontSize, position: textPosition },
      },
      quality: {
        score: validation.score,
        passed: validation.passed,
      },
      style: '@433',
      nextStep: 'Send to /api/quality/expand-refine for variation generation',
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[FootballMeme] Generation failed', error);
    return res.status(500).json({ error: 'Generation failed', message: String(error) });
  }
});

/**
 * POST /api/football/batch-generate
 * Generate multiple football meme prompts
 */
router.post('/batch-generate', async (req: Request, res: Response) => {
  try {
    const { category = 'post-goal', count = 5, parameters } = req.body;

    if (!parameters || parameters.length === 0) {
      return res.status(400).json({ error: 'parameters array required' });
    }

    log.info('[FootballMeme] Batch generation requested', { category, count });

    const prompts = [];
    for (const param of parameters.slice(0, count)) {
      const response = await (req as any).app.locals.footballMemeGenerator?.({
        category,
        ...param,
      });
      if (response) prompts.push(response);
    }

    return res.json({
      status: 'success',
      category,
      promptCount: prompts.length,
      prompts,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[FootballMeme] Batch generation failed', error);
    return res.status(500).json({ error: 'Batch generation failed' });
  }
});

/**
 * GET /api/football/categories
 * List football meme categories + templates
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      categories: [
        {
          name: 'post-goal',
          description: 'Post-goal celebration designs',
          count: 500,
          template: 'Hero shot, celebration close-up, trophy glow',
        },
        {
          name: 'rivalry-mock',
          description: 'Rivalry mockery (Pharaoh memes, trophy robbery, etc)',
          count: 400,
          template: 'Split winner/loser, victory energy, disrespect',
        },
        {
          name: 'player-comparison',
          description: 'Player vs legend comparison',
          count: 400,
          template: 'Split-screen, both glowing, stats overlay, debate',
        },
        {
          name: 'iconic-moment',
          description: 'Legendary moments frozen in design',
          count: 300,
          template: 'Cinematic, epic, trophy/stadium background',
        },
        {
          name: 'culture-mockery',
          description: 'Football culture jokes',
          count: 200,
          template: 'Position stereotypes, diving accusations, coach rage',
        },
        {
          name: 'underdog-triumph',
          description: 'Small team beats giant',
          count: 100,
          template: 'David vs Goliath, impossible dream, inspiration',
        },
        {
          name: 'keeper-blooper',
          description: 'Goalkeeper moments (howlers/heroic)',
          count: 50,
          template: 'Keeper flying, ball trajectory, drama',
        },
        {
          name: 'penalty-drama',
          description: 'Clutch penalties or misses',
          count: 50,
          template: 'Keeper vs striker, moment of truth, emotion',
        },
      ],
      totalPrompts: 2000,
      style: '@433 (Bold typography, photo composites, split-screen)',
      parameterFields: [
        'playerName',
        'team',
        'rivalTeam',
        'country',
        'rivalCountry',
        'moment',
        'emotion',
        'designStyle',
        'memeType',
        'textOverlay',
        'textColor',
        'fontStyle',
        'textPosition',
      ],
    });
  } catch (error) {
    log.error('[FootballMeme] Categories check failed', error);
    res.status(500).json({ error: 'Categories check failed' });
  }
});

/**
 * GET /api/football/health
 * Football meme service health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      service: 'football-meme-generator',
      batch: 'batch-98',
      totalPrompts: 2000,
      categories: 8,
      style: '@433 viral aesthetic',
      capabilities: [
        'Post-goal celebration designs',
        'Rivalry mockery (Pharaoh memes, trophy robbery)',
        'Player comparisons (Messi vs Ronaldo style)',
        'Iconic historical moments',
        'Football culture jokes',
        'Underdog triumph narratives',
        'Goalkeeper drama',
        'Penalty moment tension',
      ],
      parameterization: '12 adaptable fields (player, team, country, emotion, design, text, colors)',
      nextStep: 'POST /api/football/generate to create prompts',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[FootballMeme] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
