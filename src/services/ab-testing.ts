/**
 * A/B Testing Framework
 * Auto-run split tests → statistically validate winning variants
 */

export interface TestVariant {
  variantId: string;
  label: string;
  description: string;
  traffic: number; // % of audience
  engagement: number;
  conversions: number;
  sampleSize: number;
  engagementRate: number;
  conversionRate: number;
}

export interface ABTest {
  testId: string;
  name: string;
  hypothesis: string;
  control: TestVariant;
  variants: TestVariant[];
  startDate: string;
  endDate?: string;
  status: 'running' | 'complete' | 'inconclusive';
  statisticalSignificance: number;
  winner?: TestVariant;
  confidenceLevel: number;
}

export interface TestResult {
  testId: string;
  winner?: string;
  pValue: number;
  effectSize: number;
  confidenceLevel: number;
  recommendation: string;
  minSampleSizeReached: boolean;
}

// Test database (in-memory; DB in production)
const runningTests: Map<string, ABTest> = new Map();
const completedTests: Map<string, ABTest> = new Map();

const MIN_SAMPLE_SIZE = 500; // Min conversions per variant
const CONFIDENCE_THRESHOLD = 0.95; // 95% confidence

export const createTest = (
  name: string,
  hypothesis: string,
  controlLabel: string,
  variantLabels: string[]
): ABTest => {
  const testId = `test_${Date.now()}`;
  const traffic = 100 / (variantLabels.length + 1);

  const control: TestVariant = {
    variantId: `${testId}_control`,
    label: controlLabel,
    description: 'Control variant (current version)',
    traffic,
    engagement: 0,
    conversions: 0,
    sampleSize: 0,
    engagementRate: 0,
    conversionRate: 0,
  };

  const variants: TestVariant[] = variantLabels.map((label, idx) => ({
    variantId: `${testId}_var_${idx + 1}`,
    label,
    description: `Variant ${idx + 1}`,
    traffic,
    engagement: 0,
    conversions: 0,
    sampleSize: 0,
    engagementRate: 0,
    conversionRate: 0,
  }));

  const test: ABTest = {
    testId,
    name,
    hypothesis,
    control,
    variants,
    startDate: new Date().toISOString(),
    status: 'running',
    statisticalSignificance: 0,
    confidenceLevel: 0,
  };

  runningTests.set(testId, test);
  console.log('[ABTesting] Test created:', { testId, name, variants: variants.length + 1 });

  return test;
};

export const recordTestResults = (
  testId: string,
  variantId: string,
  engagement: number,
  conversions: number,
  sampleSize: number
): void => {
  const test = runningTests.get(testId);
  if (!test) {
    throw new Error(`Test ${testId} not found`);
  }

  if (variantId === test.control.variantId) {
    test.control.engagement += engagement;
    test.control.conversions += conversions;
    test.control.sampleSize += sampleSize;
    test.control.engagementRate = test.control.engagement / Math.max(test.control.sampleSize, 1);
    test.control.conversionRate = test.control.conversions / Math.max(test.control.sampleSize, 1);
  } else {
    const variant = test.variants.find((v) => v.variantId === variantId);
    if (variant) {
      variant.engagement += engagement;
      variant.conversions += conversions;
      variant.sampleSize += sampleSize;
      variant.engagementRate = variant.engagement / Math.max(variant.sampleSize, 1);
      variant.conversionRate = variant.conversions / Math.max(variant.sampleSize, 1);
    }
  }

  console.log('[ABTesting] Results recorded:', { testId, variantId, conversions });
};

export const analyzeTest = (testId: string): TestResult => {
  const test = runningTests.get(testId);
  if (!test) {
    throw new Error(`Test ${testId} not found`);
  }

  // Check if sufficient sample size
  const minSampleReached = test.control.sampleSize >= MIN_SAMPLE_SIZE && test.variants.every((v) => v.sampleSize >= MIN_SAMPLE_SIZE);

  // Calculate statistical significance (simplified Chi-square test)
  let pValue = 1.0; // Default: no significance
  let winner: TestVariant | undefined;
  let maxConversionRate = test.control.conversionRate;
  winner = test.control;

  test.variants.forEach((variant) => {
    if (variant.conversionRate > maxConversionRate) {
      maxConversionRate = variant.conversionRate;
      winner = variant;
    }

    // Simplified p-value calculation
    const controlSuccess = test.control.conversions;
    const variantSuccess = variant.conversions;
    const totalTests = test.control.sampleSize + variant.sampleSize;

    if (totalTests > 0) {
      const chi2 = Math.pow(controlSuccess - variantSuccess, 2) / (controlSuccess + variantSuccess + 1);
      pValue = Math.min(1.0, 1 - chi2 / 10); // Normalized
    }
  });

  // Effect size (Cohen's h for proportions)
  const effectSize = Math.abs(
    2 * Math.asin(Math.sqrt(test.control.conversionRate)) - 2 * Math.asin(Math.sqrt(maxConversionRate))
  );

  const confidenceLevel = Math.min(CONFIDENCE_THRESHOLD, Math.max(0, 1 - pValue));

  // Determine status
  if (minSampleReached && pValue < 0.05) {
    test.status = 'complete';
    test.winner = winner;
    completedTests.set(testId, test);
    runningTests.delete(testId);
  } else if (test.control.sampleSize > 100000) {
    // Inconclusive after large sample
    test.status = 'inconclusive';
  }

  const recommendation =
    pValue < 0.05
      ? `Variant "${winner?.label}" is statistically significant (${(confidenceLevel * 100).toFixed(0)}% confidence). Recommend rollout.`
      : minSampleReached
        ? `No significant difference detected. Continue current variant or increase sample size.`
        : `Test still running. Need ~${Math.max(0, MIN_SAMPLE_SIZE - Math.min(test.control.sampleSize, ...test.variants.map((v) => v.sampleSize)))} more samples.`;

  return {
    testId,
    winner: winner?.variantId,
    pValue,
    effectSize,
    confidenceLevel,
    recommendation,
    minSampleSizeReached: minSampleReached,
  };
};

export const getActiveTests = (): ABTest[] => Array.from(runningTests.values());

export const getCompletedTests = (): ABTest[] => Array.from(completedTests.values());

export const getTestInsights = (testId: string): { winnerReason: string; rolloutStrategy: string; nextTest: string } => {
  const test = completedTests.get(testId) || runningTests.get(testId);
  if (!test || !test.winner) {
    return {
      winnerReason: 'No clear winner yet',
      rolloutStrategy: 'Continue running test',
      nextTest: 'Recommend testing different hypothesis',
    };
  }

  const uplift = ((test.winner.conversionRate - test.control.conversionRate) / test.control.conversionRate) * 100;

  let rolloutStrategy = 'Gradual rollout: 10% → 25% → 50% → 100%';
  if (uplift > 50) rolloutStrategy = 'Immediate full rollout recommended';
  if (uplift < 10) rolloutStrategy = 'Consider regional rollout first';

  return {
    winnerReason: `"${test.winner.label}" outperforms control by ${uplift.toFixed(1)}% in conversions`,
    rolloutStrategy,
    nextTest: `Test next variable: ${['CTA text', 'thumbnail style', 'posting frequency', 'audience segment'][Math.floor(Math.random() * 4)]}`,
  };
};

export const multivariatePrioritization = (
  testIds: string[]
): Array<{ testId: string; priority: number; expectedImpact: number }> => testIds.map((id) => {
    const test = completedTests.get(id) || runningTests.get(id);
    if (!test || !test.winner) {
      return { testId: id, priority: 0, expectedImpact: 0 };
    }

    const uplift = ((test.winner.conversionRate - test.control.conversionRate) / test.control.conversionRate) * 100;
    const priority = Math.min(100, uplift * test.confidenceLevel);

    return { testId: id, priority, expectedImpact: uplift };
  });
