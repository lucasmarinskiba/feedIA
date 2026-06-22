import { log } from '../../agent/logger.js';
import { publishToInstagram } from '../../integrations/meta.js';
import { insertABTest, updateABTest, getABTest, listABTestsByAccount } from '../../database/index.js';
import { calculateTestResult, hasMinimumSampleSize } from './engine.js';
import type { ABTest, ABVariant } from './types.js';

export interface ABTestRunRequest {
  accountId: string;
  name: string;
  hypothesis: string;
  variants: Array<{
    name: string;
    caption: string;
    mediaUrls: string[];
    format: 'reel' | 'imagen' | 'carrusel' | 'historia';
  }>;
}

/**
 * Creates and starts an A/B test by publishing variants.
 */
export const startABTest = async (req: ABTestRunRequest): Promise<ABTest> => {
  const testId = `ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const variants: ABVariant[] = req.variants.map((v, i) => ({
    id: `${testId}-v${i}`,
    name: v.name,
    impressions: 0,
    engagements: 0,
    conversions: 0,
  }));

  const test: ABTest = {
    id: testId,
    accountId: req.accountId,
    name: req.name,
    hypothesis: req.hypothesis,
    status: 'running',
    variants,
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  insertABTest(test);

  // Publish each variant
  for (let i = 0; i < req.variants.length; i++) {
    const v = req.variants[i]!;
    try {
      const result = await publishToInstagram({
        format: v.format,
        caption: v.caption,
        mediaUrls: v.mediaUrls,
      });
      if (result.ok && result.postId) {
        variants[i]!.postId = result.postId;
        log.info(`A/B test variant ${v.name} published: ${result.postId}`);
      } else {
        log.error(`Failed to publish variant ${v.name}: ${result.error}`);
      }
    } catch (err) {
      log.error(`Error publishing variant ${v.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Update with post IDs
  updateABTest(testId, { variants });

  return { ...test, variants };
};

/**
 * Evaluates a running A/B test using real metrics from Meta Insights.
 * Call this periodically (e.g., daily) to update results.
 */
export const evaluateABTest = async (testId: string): Promise<ABTest> => {
  const testRecord = getABTest(testId);
  if (!testRecord) throw new Error(`A/B test ${testId} not found`);
  if (testRecord.status !== 'running') return testRecord as ABTest;

  // Fetch metrics for each variant's post
  const { fetchPostInsights } = await import('../../integrations/insightsApi.js');
  const since = testRecord.startedAt ?? new Date(Date.now() - 7 * 86400000).toISOString();

  const insights = await fetchPostInsights(since);

  const updatedVariants = (testRecord.variants ?? []).map((v) => {
    const postId = (v as ABVariant).postId;
    if (!postId) return v as ABVariant;
    const insight = insights.find((i) => i.postId === postId);
    if (!insight) return v;
    return {
      ...v,
      impressions: insight.metrics.impresiones,
      engagements: insight.metrics.likes + insight.metrics.comments + insight.metrics.shares + insight.metrics.saves,
      conversions: insight.metrics.profileVisits ?? 0,
    };
  });

  // Check if we have enough data
  if (hasMinimumSampleSize(updatedVariants, 100)) {
    const result = calculateTestResult(updatedVariants, 0.95);
    if (result.isSignificant) {
      updateABTest(testId, {
        status: 'completed',
        winner: result.winner ?? undefined,
        confidence: result.confidence,
        endedAt: new Date().toISOString(),
        variants: updatedVariants,
      });
      log.info(`A/B test ${testId} completed. Winner: ${result.winner} (${result.confidence * 100}% confidence)`);
    } else {
      updateABTest(testId, { variants: updatedVariants });
    }
  } else {
    updateABTest(testId, { variants: updatedVariants });
  }

  return getABTest(testId) as ABTest;
};

export const listABTests = (accountId: string): ABTest[] => listABTestsByAccount(accountId) as ABTest[];
