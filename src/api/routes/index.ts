import express from 'express';
import orchestrateRouter from './orchestrate';
import generatorsRouter from './generators';

const router = express.Router();

// Main orchestration endpoint
router.use('/orchestrate', orchestrateRouter);

// Direct generator endpoints
router.use('/generators', generatorsRouter);

// Health check
router.get('/health', (req, res) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Info endpoint
router.get('/info', (req, res) => {
  return res.json({
    name: 'FeedIA',
    version: '2.0.0',
    features: ['orchestration', 'skill-registry', 'maestro-selector', 'generators'],
  });
});

export default router;
