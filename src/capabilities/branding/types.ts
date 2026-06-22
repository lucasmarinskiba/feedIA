export interface BrandStrategy {
  vision: string;
  mission: string;
  values: string[];
  promise: string;
  positioning: string;
  story: string;
  personality: string[];
  archetype: string;
  architecture: string;
  differentiators: string[];
  experiencePrinciples: string[];
  targetPersonas: TargetPersona[];
  brandVoiceRules: BrandVoiceRule[];
  visualUsageRules: VisualUsageRule[];
}

export interface TargetPersona {
  name: string;
  description: string;
  pains: string[];
  desires: string[];
  platforms: string[];
}

export interface BrandVoiceRule {
  situation: string;
  tone: string;
  examples: string[];
  forbidden: string[];
}

export interface VisualUsageRule {
  element: string;
  allowedContexts: string[];
  forbiddenContexts: string[];
  usageNotes: string;
}

export interface BrandRule {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  condition: string;
  checker: (context: BrandRuleContext) => BrandRuleViolation | null;
}

export interface BrandRuleContext {
  content?: {
    title?: string;
    description?: string;
    caption?: string;
    format?: string;
    colorsUsed?: string[];
    fontsUsed?: string[];
    iconography?: string[];
    images?: string[];
    textBlocks?: number;
    imageBlocks?: number;
    density?: string;
  };
  asset?: {
    type?: string;
    name?: string;
    url?: string;
    usageRules?: string[];
  };
  interaction?: {
    channel?: string;
    responseTime?: number;
    tone?: string;
    personalized?: boolean;
  };
  brand: {
    name: string;
    strategy: BrandStrategy;
    visual: {
      palette: string[];
      typography: string[];
      style: string;
      mood: string;
      allowedIconography: string[];
      forbiddenIconography: string[];
    };
    voice: {
      tone: string[];
      forbidden: string[];
    };
  };
}

export interface BrandRuleViolation {
  ruleId: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  field: string;
}

export interface BrandRuleEvaluation {
  passed: boolean;
  score: number;
  threshold: number;
  violations: BrandRuleViolation[];
  warnings: BrandRuleViolation[];
  info: BrandRuleViolation[];
  byCategory: Record<string, { passed: boolean; score: number; violations: BrandRuleViolation[] }>;
}
