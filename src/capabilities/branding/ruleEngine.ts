import type { BrandProfile } from '../../config/types.js';
import type { BrandRuleContext, BrandRuleEvaluation, BrandRuleViolation, BrandStrategy } from './types.js';
import { ALL_BRAND_RULES } from './brandRules.js';

export const evaluateBrandRules = (
  content: BrandRuleContext['content'],
  asset: BrandRuleContext['asset'],
  interaction: BrandRuleContext['interaction'],
  brand: BrandProfile,
  strategy: BrandStrategy,
): BrandRuleEvaluation => {
  const context: BrandRuleContext = {
    content,
    asset,
    interaction,
    brand: {
      name: brand.name,
      strategy,
      visual: {
        palette: brand.visual.palette,
        typography: brand.visual.typography,
        style: brand.visual.style,
        mood: brand.visual.mood,
        allowedIconography: brand.visual.allowedIconography,
        forbiddenIconography: brand.visual.forbiddenIconography,
      },
      voice: {
        tone: brand.voice.tone,
        forbidden: brand.voice.forbidden,
      },
    },
  };

  const violations: BrandRuleViolation[] = [];
  const warnings: BrandRuleViolation[] = [];
  const info: BrandRuleViolation[] = [];
  const byCategory: Record<string, { passed: boolean; score: number; violations: BrandRuleViolation[] }> = {};

  const categories = ['visual', 'voice', 'strategy', 'experience', 'asset-usage'];
  for (const cat of categories) {
    byCategory[cat] = { passed: true, score: 100, violations: [] };
  }

  for (const rule of ALL_BRAND_RULES) {
    try {
      const violation = rule.checker(context);
      if (violation) {
        if (rule.severity === 'critical' || rule.severity === 'high') {
          violations.push(violation);
        } else if (rule.severity === 'medium') {
          warnings.push(violation);
        } else {
          info.push(violation);
        }

        const catData = byCategory[rule.category] ?? { passed: true, score: 100, violations: [] };
        catData.violations.push(violation);
        byCategory[rule.category] = catData;
      }
    } catch {
      // Ignorar errores de reglas individuales
    }
  }

  // Calcular scores por categoría
  for (const cat of categories) {
    const catData = byCategory[cat]!;
    const criticalCount = catData.violations.filter((v) => v.severity === 'critical').length;
    const highCount = catData.violations.filter((v) => v.severity === 'high').length;
    const mediumCount = catData.violations.filter((v) => v.severity === 'medium').length;
    const lowCount = catData.violations.filter((v) => v.severity === 'low').length;

    const deduction = criticalCount * 25 + highCount * 15 + mediumCount * 8 + lowCount * 3;
    catData.score = Math.max(0, 100 - deduction);
    catData.passed = catData.score >= 70;
    byCategory[cat] = catData;
  }

  // Score global
  const totalDeduction = violations.length * 15 + warnings.length * 5 + info.length * 1;
  const score = Math.max(0, 100 - totalDeduction);
  const threshold = 70;

  return {
    passed: score >= threshold && violations.length === 0,
    score,
    threshold,
    violations,
    warnings,
    info,
    byCategory,
  };
};

export const generateBrandRuleReport = (result: BrandRuleEvaluation): string => {
  const lines: string[] = [];
  lines.push(`📊 BRAND RULE EVALUATION REPORT`);
  lines.push(`Score: ${result.score}/100 | Threshold: ${result.threshold}`);
  lines.push(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push('');

  lines.push(`🚨 CRITICAL/HIGH (${result.violations.length}):`);
  for (const v of result.violations) {
    lines.push(`  [${v.severity.toUpperCase()}] ${v.ruleId} — ${v.message}`);
    lines.push(`    → ${v.suggestion}`);
  }
  lines.push('');

  lines.push(`⚠️ WARNINGS (${result.warnings.length}):`);
  for (const w of result.warnings) {
    lines.push(`  [${w.severity.toUpperCase()}] ${w.ruleId} — ${w.message}`);
    lines.push(`    → ${w.suggestion}`);
  }
  lines.push('');

  lines.push(`ℹ️ INFO (${result.info.length}):`);
  for (const i of result.info) {
    lines.push(`  [${i.severity.toUpperCase()}] ${i.ruleId} — ${i.message}`);
  }
  lines.push('');

  lines.push('📂 BY CATEGORY:');
  for (const [cat, data] of Object.entries(result.byCategory)) {
    lines.push(`  ${cat}: ${data.score}/100 ${data.passed ? '✅' : '❌'} (${data.violations.length} issues)`);
  }

  return lines.join('\n');
};
