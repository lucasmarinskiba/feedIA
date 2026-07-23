export type Intent = 'content' | 'sales' | 'community' | 'product' | 'multi-agent' | 'custom' | 'help' | 'config';

export interface IntentResult {
  intent: Intent;
  confidence: number;
  reasoning: string;
  selectedSkill: string;
  selectedAgent?: string;
  selectedGenerator?: string;
  relatedSkills: string[];
  metadata: Record<string, unknown>;
}

export interface OrchestrationRequest {
  userRequest: string;
  context?: {
    userId?: string;
    sessionId?: string;
    previousIntents?: Intent[];
    metadata?: Record<string, unknown>;
  };
}

export interface OrchestrationStep {
  stepType: 'skill-lookup' | 'agent-invocation' | 'generator-exec' | 'feedback-loop';
  skillName: string;
  agentName?: string;
  generatorName?: string;
  input: Record<string, unknown>;
  expectedOutput?: string;
}

export interface OrchestrationPlan {
  requestId: string;
  intent: Intent;
  steps: OrchestrationStep[];
  estimatedDuration: number;
  fallbackPlan?: OrchestrationPlan;
}

export interface ExecutionResult {
  planId: string;
  status: 'success' | 'partial' | 'failed';
  stepResults: StepResult[];
  finalOutput?: Record<string, unknown>;
  error?: string;
  executedAt: Date;
  duration: number;
}

export interface StepResult {
  stepIndex: number;
  stepType: string;
  skillName: string;
  status: 'success' | 'failed' | 'skipped';
  output?: Record<string, unknown>;
  error?: string;
  duration: number;
}
