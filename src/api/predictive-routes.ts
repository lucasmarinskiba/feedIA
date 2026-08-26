import { Router, Request, Response } from 'express';
import {
  predictViralScore,
  predictChurnRisk,
  forecastROI,
  predictLeadConversion,
  runFullPredictiveAnalysis,
} from '../services/predictive-models.js';

const router = Router();

router.post('/viral', (req: Request, res: Response): void => {
  try {
    const { format, topic, historicalData } = req.body;
    if (!format || !topic) {
      res.status(400).json({ error: 'format + topic required' });
      return;
    }

    const mockData = [
      {
        format,
        topic,
        publications: 45,
        conversions: 18,
        revenue: 5400,
        cost: 450,
        engagement: 78,
        roi: 1100,
      },
      {
        format,
        topic,
        publications: 38,
        conversions: 15,
        revenue: 4800,
        cost: 380,
        engagement: 82,
        roi: 1160,
      },
    ];

    const prediction = predictViralScore(format, topic, historicalData || mockData);
    res.json(prediction);
    return;
  } catch (err) {
    res.status(500).json({ error: 'viral-prediction', message: String(err) });
    return;
  }
});

router.post('/churn', (req: Request, res: Response): void => {
  try {
    const { fanId, lastEngagementDays = 15, totalSpent = 250, engagementScore = 65, tier = 'silver' } = req.body;

    if (!fanId) {
      res.status(400).json({ error: 'fanId required' });
      return;
    }

    const prediction = predictChurnRisk(fanId, lastEngagementDays, totalSpent, engagementScore, tier);
    res.json(prediction);
    return;
  } catch (err) {
    res.status(500).json({ error: 'churn-prediction', message: String(err) });
    return;
  }
});

router.post('/roi-forecast', (req: Request, res: Response): void => {
  try {
    const { format, topic, historicalTimeline } = req.body;
    if (!format || !topic) {
      res.status(400).json({ error: 'format + topic required' });
      return;
    }

    const mockTimeline = [
      {
        format,
        topic,
        publications: 28,
        conversions: 8,
        revenue: 1920,
        cost: 365,
        engagement: 72,
        roi: 425,
      },
      {
        format,
        topic,
        publications: 35,
        conversions: 12,
        revenue: 2880,
        cost: 455,
        engagement: 78,
        roi: 533,
      },
      {
        format,
        topic,
        publications: 42,
        conversions: 9,
        revenue: 2160,
        cost: 525,
        engagement: 75,
        roi: 311,
      },
    ];

    const forecast = forecastROI(format, topic, historicalTimeline || mockTimeline);
    res.json(forecast);
    return;
  } catch (err) {
    res.status(500).json({ error: 'roi-forecast', message: String(err) });
    return;
  }
});

router.post('/lead-conversion', (req: Request, res: Response): void => {
  try {
    const {
      leadId,
      leadScore = 65,
      signalCount = 3,
      daysSinceCreation = 5,
      historicalConversionRate = 0.03,
    } = req.body;

    if (!leadId) {
      res.status(400).json({ error: 'leadId required' });
      return;
    }

    const prediction = predictLeadConversion(
      leadId,
      leadScore,
      signalCount,
      daysSinceCreation,
      historicalConversionRate,
    );
    res.json(prediction);
    return;
  } catch (err) {
    res.status(500).json({ error: 'lead-conversion-prediction', message: String(err) });
    return;
  }
});

router.post('/full-analysis', (req: Request, res: Response): void => {
  try {
    const { fanMetrics = {}, contentHistory = [], leads = {} } = req.body;

    const analysis = runFullPredictiveAnalysis(fanMetrics, contentHistory, leads);
    res.json(analysis);
    return;
  } catch (err) {
    res.status(500).json({ error: 'full-analysis', message: String(err) });
    return;
  }
});

router.get('/status', (req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    models: ['viral-score', 'churn-risk', 'roi-forecast', 'lead-conversion', 'full-analysis'],
    dataRequirements: {
      'viral-score': ['format', 'topic', 'historicalData'],
      'churn-risk': ['fanId', 'lastEngagementDays', 'totalSpent', 'engagementScore', 'tier'],
      'roi-forecast': ['format', 'topic', 'historicalTimeline'],
      'lead-conversion': ['leadId', 'leadScore', 'signalCount', 'daysSinceCreation'],
      'full-analysis': ['fanMetrics', 'contentHistory', 'leads'],
    },
  });
  return;
});

export default router;
