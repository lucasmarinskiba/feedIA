import express, { type Request, type Response } from 'express';
import { getOrchestrationService } from '../../services/orchestration-service';
import type { OrchestrationRequest } from '../../types/intent';

const router = express.Router();

interface OrchestrateRequestBody {
  userRequest: string;
  userId?: string;
  sessionId?: string;
  previousIntents?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * POST /api/orchestrate
 * Main orchestration endpoint: user request → intent classification → execution
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as OrchestrateRequestBody;

    if (!body.userRequest || typeof body.userRequest !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid userRequest field',
        example: { userRequest: 'Create offer for ADHD task manager' },
      });
    }

    const orchestrationService = getOrchestrationService();

    const request: OrchestrationRequest = {
      userRequest: body.userRequest,
      context: {
        userId: body.userId,
        sessionId: body.sessionId,
        previousIntents: undefined,
        metadata: body.metadata,
      },
    };

    const result = await orchestrationService.orchestrate(request);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[/api/orchestrate] Error:', err);
    return res.status(500).json({
      success: false,
      error: String(err),
      message: 'Orchestration failed',
    });
  }
});

export default router;
