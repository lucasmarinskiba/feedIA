/**
 * Multi-Agent Orchestration API Routes
 * /api/orchestrate/* — Art Director ↔ Carousel Designer collaboration
 */

import { Router, Request, Response } from 'express';
import {
  startCollaboration,
  artDirectorProposal,
  carouselDesignerResponse,
  artDirectorRefine,
  carouselDesignerValidate,
  getConversationHistory,
  getSession,
  runCollaborationLoop,
  type DesignBrief,
} from '../services/multi-agent-orchestrator.js';

const router = Router();

/**
 * POST /api/orchestrate/start
 * Start collaboration session between Art Director and Carousel Designer
 *
 * Request:
 * {
 *   "userId": "user-123",
 *   "brief": {
 *     "topic": "Premium skincare carousel",
 *     "format": "carousel",
 *     "style": "luxury minimalist",
 *     "constraints": ["max 10 slides", "mobile-first"],
 *     "targetAudience": "beauty enthusiasts 25-45"
 *   }
 * }
 *
 * Response:
 * {
 *   "sessionId": "session_user-123_...",
 *   "status": "active",
 *   "topic": "Premium skincare carousel",
 *   "iterations": 0
 * }
 */
router.post('/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, brief } = req.body as { userId: string; brief: DesignBrief };

    if (!userId || !brief) {
      res.status(400).json({ error: 'userId and brief required' });
      return;
    }

    const session = startCollaboration(userId, brief);

    console.log('[MultiAgentOrchestrator] Session started:', { sessionId: session.id, topic: brief.topic });

    res.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      topic: session.topic,
      iterations: session.iterations,
      message: `Collaboration started. Art Director proposing design for: ${brief.topic}`,
    });
  } catch (err) {
    console.error('[MultiAgentOrchestrator] Start failed:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/orchestrate/:sessionId/art-director-proposal
 * Art Director sends initial design proposal
 *
 * Request:
 * {
 *   "concept": "Premium skincare ritual with natural ingredients",
 *   "visualStyle": "luxury minimalist",
 *   "mood": "aspirational, calming"
 * }
 */
router.post('/:sessionId/art-director-proposal', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { concept, visualStyle, mood } = req.body;

    const message = await artDirectorProposal(sessionId, { concept, visualStyle, mood });

    res.json({
      success: true,
      messageId: message.id,
      from: message.from,
      to: message.to,
      content: message.content,
      message: 'Art Director proposal sent to Carousel Designer',
    });
  } catch (err) {
    console.error('[ArtDirectorProposal] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/orchestrate/:sessionId/carousel-designer-response
 * Carousel Designer responds with feasibility feedback
 *
 * Request:
 * {
 *   "feasibility": "Highly feasible",
 *   "suggestions": ["Use 8-10 frames", "Consistent color palette"],
 *   "concerns": ["Mobile text readability"]
 * }
 */
router.post('/:sessionId/carousel-designer-response', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { feasibility, suggestions, concerns } = req.body;

    const message = await carouselDesignerResponse(sessionId, { feasibility, suggestions, concerns });

    res.json({
      success: true,
      messageId: message.id,
      from: message.from,
      to: message.to,
      content: message.content,
      message: 'Carousel Designer feedback sent back to Art Director',
    });
  } catch (err) {
    console.error('[CarouselDesignerResponse] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/orchestrate/:sessionId/art-director-refine
 * Art Director refines design based on feedback
 *
 * Request:
 * {
 *   "adjustments": ["Reduced to 8 frames", "Applied WCAG AA standards"],
 *   "revisedConcept": "8-frame luxury skincare carousel with premium animations"
 * }
 */
router.post('/:sessionId/art-director-refine', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { adjustments, revisedConcept } = req.body;

    const message = await artDirectorRefine(sessionId, { adjustments, revisedConcept });

    res.json({
      success: true,
      messageId: message.id,
      from: message.from,
      to: message.to,
      content: message.content,
      message: 'Art Director refinements sent for validation',
    });
  } catch (err) {
    console.error('[ArtDirectorRefine] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/orchestrate/:sessionId/carousel-designer-validate
 * Carousel Designer validates final design
 *
 * Request:
 * {
 *   "isValid": true,
 *   "readiness": "production",
 *   "notes": "All accessibility checks passed. Ready for generation pipeline."
 * }
 */
router.post('/:sessionId/carousel-designer-validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { isValid, readiness, notes } = req.body;

    const message = await carouselDesignerValidate(sessionId, { isValid, readiness, notes });

    res.json({
      success: true,
      messageId: message.id,
      from: message.from,
      to: message.to,
      content: message.content,
      isValid,
      readiness,
      message: isValid && readiness === 'production' ? '✅ DESIGN APPROVED FOR PRODUCTION' : '🔄 NEEDS REVISION',
    });
  } catch (err) {
    console.error('[CarouselDesignerValidate] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/orchestrate/:sessionId/history
 * Get full conversation history
 */
router.get('/:sessionId/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const history = getConversationHistory(sessionId);
    const session = getSession(sessionId);

    if (!session) {
      res.status(404).json({ error: `Session ${sessionId} not found` });
      return;
    }

    res.json({
      success: true,
      sessionId,
      topic: session.topic,
      status: session.status,
      iterations: session.iterations,
      messageCount: history.length,
      messages: history,
    });
  } catch (err) {
    console.error('[ConversationHistory] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/orchestrate/:sessionId/session
 * Get session details
 */
router.get('/:sessionId/session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = getSession(sessionId);

    if (!session) {
      res.status(404).json({ error: `Session ${sessionId} not found` });
      return;
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        userId: session.userId,
        topic: session.topic,
        status: session.status,
        iterations: session.iterations,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (err) {
    console.error('[SessionDetails] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/orchestrate/run-full-loop
 * Run complete collaboration loop (automated)
 *
 * Request:
 * {
 *   "userId": "user-123",
 *   "brief": { topic, format, style, ... }
 * }
 */
router.post('/run-full-loop', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, brief } = req.body as { userId: string; brief: DesignBrief };

    if (!userId || !brief) {
      res.status(400).json({ error: 'userId and brief required' });
      return;
    }

    const result = await runCollaborationLoop(userId, brief);

    res.json({
      success: true,
      sessionId: result.sessionId,
      status: result.status,
      iterations: result.iterations,
      finalDesign: result.finalDesign,
      message: `Collaboration complete. Design ready for production (${result.iterations} refinement cycles).`,
    });
  } catch (err) {
    console.error('[RunFullLoop] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
