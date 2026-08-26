/**
 * Compliance Validation Endpoints (System 8: Compliance)
 * POST /api/compliance/validate - Check content against FTC/GDPR rules
 * GET /api/compliance/:contentId - Get compliance report
 */

import type { Request, Response } from 'express';
import { query } from '../db/client.js';

interface ComplianceViolation {
  type: 'ftc' | 'gdpr' | 'platform';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

/**
 * FTC Compliance Rules
 */
const FTC_RULES = {
  disclaimers: {
    check: (text: string): boolean => {
      const disclosures = ['#ad', '#sponsored', '#partner', '#affiliate'];
      return disclosures.some((d) => text.toLowerCase().includes(d));
    },
    message: 'Missing FTC disclosure (#ad, #sponsored, #partner, #affiliate)',
    severity: 'error' as const,
  },
  truthfulness: {
    check: (text: string): boolean => !text.includes('guaranteed') || text.includes('*'),
    message: 'Unsubstantiated claim detected (use caveats like "*")',
    severity: 'warning' as const,
  },
};

/**
 * GDPR Compliance Rules
 */
const GDPR_RULES = {
  personalData: {
    check: (text: string): boolean => {
      const piiPatterns = [/\b\d{3}-\d{2}-\d{4}\b/, /email[\s:]*\S+@\S+/, /phone[\s:]*\d{10,}/i];
      return !piiPatterns.some((p) => p.test(text));
    },
    message: 'Potential PII detected (email, SSN, phone)',
    severity: 'error' as const,
  },
  consent: {
    check: (text: string): boolean => text.includes('cookie') && text.includes('consent'),
    message: 'Missing cookie/consent disclosure',
    severity: 'warning' as const,
  },
};

/**
 * POST /api/compliance/validate
 * Validate content against compliance rules
 */
export const validateCompliance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { contentId, text, checkTypes = ['ftc', 'gdpr'] } = req.body;

    if (!contentId || !text) {
      return res.status(400).json({ error: 'contentId and text required' });
      return;
    }

    const violations: ComplianceViolation[] = [];

    // FTC checks
    if (checkTypes.includes('ftc')) {
      if (!FTC_RULES.disclaimers.check(text)) {
        violations.push({
          type: 'ftc',
          severity: FTC_RULES.disclaimers.severity,
          message: FTC_RULES.disclaimers.message,
          suggestion: 'Add #ad or #sponsored to caption',
        });
      }

      if (!FTC_RULES.truthfulness.check(text)) {
        violations.push({
          type: 'ftc',
          severity: FTC_RULES.truthfulness.severity,
          message: FTC_RULES.truthfulness.message,
        });
      }
    }

    // GDPR checks
    if (checkTypes.includes('gdpr')) {
      if (!GDPR_RULES.personalData.check(text)) {
        violations.push({
          type: 'gdpr',
          severity: GDPR_RULES.personalData.severity,
          message: GDPR_RULES.personalData.message,
        });
      }

      if (!GDPR_RULES.consent.check(text) && text.toLowerCase().includes('collect')) {
        violations.push({
          type: 'gdpr',
          severity: GDPR_RULES.consent.severity,
          message: GDPR_RULES.consent.message,
        });
      }
    }

    // Store compliance check
    const checkId = crypto.randomUUID();
    const status = violations.some((v) => v.severity === 'error') ? 'failed' : 'passed';

    await query(
      `INSERT INTO compliance_checks (id, content_id, check_type, status, violations, checked_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [checkId, contentId, checkTypes.join(','), status, JSON.stringify(violations)]
    );

    return res.json({
      checkId,
      status,
      violations,
      canPublish: violations.filter((v) => v.severity === 'error').length === 0,
      summary: {
        errors: violations.filter((v) => v.severity === 'error').length,
        warnings: violations.filter((v) => v.severity === 'warning').length,
      },
    });
  } catch (err) {
    console.error('[Compliance] Validation error:', err);
    return res.status(500).json({ error: 'Validation failed' });
  }
};

/**
 * GET /api/compliance/:contentId
 * Get compliance report for content
 */
export const getComplianceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { contentId } = req.params;

    // Verify ownership
    const contentResult = await query(
      'SELECT * FROM content WHERE id = $1 AND user_id = $2',
      [contentId, userId]
    );

    if (contentResult.rowCount === 0) {
      return res.status(404).json({ error: 'Content not found' });
      return;
    }

    // Get compliance checks
    const checksResult = await query(
      'SELECT * FROM compliance_checks WHERE content_id = $1 ORDER BY checked_at DESC LIMIT 10',
      [contentId]
    );

    const checks = checksResult.rows.map((row: any) => ({
      id: row.id,
      type: row.check_type,
      status: row.status,
      violations: JSON.parse(row.violations),
      checkedAt: row.checked_at,
    }));

    // Summary
    const latestCheck = checks[0] || null;
    const allViolations = checks.flatMap((c: any) => c.violations);
    const uniqueViolations = Array.from(new Set(allViolations.map((v: any) => v.message)));

    return res.json({
      contentId,
      summary: {
        checksPerformed: checks.length,
        latestStatus: latestCheck?.status || 'not-checked',
        totalUniqueViolations: uniqueViolations.length,
        canPublish:
          latestCheck && !latestCheck.violations.some((v: any) => v.severity === 'error'),
      },
      checks,
      recentViolations: uniqueViolations.slice(0, 5),
    });
  } catch (err) {
    console.error('[Compliance] Report error:', err);
    return res.status(500).json({ error: 'Report retrieval failed' });
  }
};
