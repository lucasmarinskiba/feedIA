/**
 * Compliance Validator Engine
 * Auto-check content against FTC/GDPR/platform rules → flag violations
 */

export interface ComplianceCheck {
  checkId: string;
  contentId: string;
  content: string;
  platform: string;
  violations: Array<{ rule: string; severity: 'critical' | 'warning' | 'info'; description: string }>;
  complianceScore: number;
  isApproved: boolean;
  recommendations: string[];
}

export interface ComplianceRule {
  ruleId: string;
  category: string;
  rule: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  platform: string;
}

const complianceRules: ComplianceRule[] = [
  {
    ruleId: 'ftc_disclosure',
    category: 'FTC',
    rule: 'Sponsored content must disclose #ad or #sponsored',
    severity: 'critical',
    description: 'FTC requires clear disclosure of paid partnerships',
    platform: 'all',
  },
  {
    ruleId: 'medical_claims',
    category: 'Health',
    rule: 'No unsubstantiated medical claims',
    severity: 'critical',
    description: 'Cannot claim products cure/treat/prevent medical conditions',
    platform: 'all',
  },
  {
    ruleId: 'gdpr_consent',
    category: 'GDPR',
    rule: 'Collect email requires consent statement',
    severity: 'critical',
    description: 'GDPR requires explicit opt-in for data collection',
    platform: 'all',
  },
  {
    ruleId: 'hate_speech',
    category: 'Community',
    rule: 'No hate speech or discrimination',
    severity: 'critical',
    description: 'Platform prohibits hateful content',
    platform: 'all',
  },
  {
    ruleId: 'misleading_claims',
    category: 'Marketing',
    rule: 'Avoid misleading before-afters without disclaimers',
    severity: 'warning',
    description: 'Before-afters must include "results not typical" disclaimer',
    platform: 'instagram',
  },
  {
    ruleId: 'copyright',
    category: 'IP',
    rule: 'Verify copyright/music rights',
    severity: 'warning',
    description: 'Ensure all content licensed or original',
    platform: 'all',
  },
];

const complianceChecks: Map<string, ComplianceCheck> = new Map();

export const validateContent = (contentId: string, content: string, platform: string): ComplianceCheck => {
  const violations: Array<{ rule: string; severity: 'critical' | 'warning' | 'info'; description: string }> = [];

  // Check each rule
  complianceRules.forEach((ruleConfig) => {
    if (ruleConfig.platform !== 'all' && ruleConfig.platform !== platform) return;

    let flagged = false;

    if (ruleConfig.ruleId === 'ftc_disclosure' && content.toLowerCase().includes('buy') && !content.includes('#ad') && !content.includes('#sponsored')) {
      flagged = true;
    }

    if (ruleConfig.ruleId === 'medical_claims' && content.toLowerCase().match(/cure|treat|prevent|medication/)) {
      flagged = true;
    }

    if (ruleConfig.ruleId === 'gdpr_consent' && content.includes('email') && !content.includes('privacy') && !content.includes('consent')) {
      flagged = true;
    }

    if (ruleConfig.ruleId === 'hate_speech' && content.toLowerCase().match(/hate|racist|discrimination/)) {
      flagged = true;
    }

    if (ruleConfig.ruleId === 'misleading_claims' && content.toLowerCase().includes('before') && content.toLowerCase().includes('after') && !content.includes('results not typical')) {
      flagged = true;
    }

    if (flagged) {
      violations.push({
        rule: ruleConfig.rule,
        severity: ruleConfig.severity,
        description: ruleConfig.description,
      });
    }
  });

  // Compliance score (higher is better)
  const criticalViolations = violations.filter((v) => v.severity === 'critical').length;
  const warningViolations = violations.filter((v) => v.severity === 'warning').length;
  const complianceScore = Math.max(0, 100 - criticalViolations * 30 - warningViolations * 10);

  // Recommendations
  const recommendations: string[] = [];
  if (criticalViolations > 0) recommendations.push('Fix critical violations before posting');
  if (warningViolations > 0) recommendations.push('Review warning violations');
  if (content.length < 50) recommendations.push('Consider adding more context to reduce ambiguity');
  if (!content.includes('link') && !content.includes('bio')) recommendations.push('Add CTA link for clickthrough tracking');

  const checkId = `comp_${contentId}_${Date.now()}`;
  const check: ComplianceCheck = {
    checkId,
    contentId,
    content,
    platform,
    violations,
    complianceScore,
    isApproved: complianceScore >= 70,
    recommendations,
  };

  complianceChecks.set(checkId, check);
  console.log('[ComplianceValidator] Content checked:', { contentId, score: complianceScore, approved: check.isApproved });

  return check;
};

export const batchValidate = (contents: Array<{ contentId: string; text: string; platform: string }>): Array<ComplianceCheck> => contents.map((c) => validateContent(c.contentId, c.text, c.platform));

export const getComplianceStats = (): { totalChecked: number; approvalRate: number; commonViolations: string[] } => {
  const checks = Array.from(complianceChecks.values());

  if (checks.length === 0) {
    return { totalChecked: 0, approvalRate: 100, commonViolations: [] };
  }

  const approved = checks.filter((c) => c.isApproved).length;
  const approvalRate = Math.round((approved / checks.length) * 100);

  const violationCounts: Record<string, number> = {};
  checks.forEach((c) => {
    c.violations.forEach((v) => {
      violationCounts[v.rule] = (violationCounts[v.rule] ?? 0) + 1;
    });
  });

  const commonViolations = Object.entries(violationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rule]) => rule);

  return { totalChecked: checks.length, approvalRate, commonViolations };
};

export const getApprovedContent = (limit: number = 10): ComplianceCheck[] => Array.from(complianceChecks.values())
    .filter((c) => c.isApproved)
    .sort((a, b) => b.complianceScore - a.complianceScore)
    .slice(0, limit);
