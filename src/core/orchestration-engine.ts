import { v4 as uuidv4 } from 'uuid';
import type {
  Intent,
  IntentResult,
  OrchestrationPlan,
  OrchestrationStep,
  ExecutionResult,
  StepResult,
} from '../types/intent';
import { getSkillRegistry } from '../services/skill-registry';

export class OrchestrationEngine {
  private registry: ReturnType<typeof getSkillRegistry>;

  constructor() {
    this.registry = getSkillRegistry();
  }

  buildPlan(intentResult: IntentResult): OrchestrationPlan {
    const planId = uuidv4();
    const steps: OrchestrationStep[] = [];

    // Step 1: Load the primary skill
    steps.push({
      stepType: 'skill-lookup',
      skillName: intentResult.selectedSkill,
      input: { intent: intentResult.intent },
      expectedOutput: 'Skill loaded and ready',
    });

    // Step 2: If agent exists, invoke it
    if (intentResult.selectedAgent) {
      steps.push({
        stepType: 'agent-invocation',
        skillName: intentResult.selectedAgent,
        agentName: intentResult.selectedAgent,
        input: {
          intent: intentResult.intent,
          relatedSkills: intentResult.relatedSkills,
        },
        expectedOutput: 'Agent invoked with context',
      });
    }

    // Step 3: If generator exists, execute it
    if (intentResult.selectedGenerator) {
      steps.push({
        stepType: 'generator-exec',
        skillName: intentResult.selectedGenerator,
        generatorName: intentResult.selectedGenerator,
        agentName: intentResult.selectedAgent,
        input: {
          generatorType: intentResult.selectedGenerator,
          context: intentResult.metadata,
        },
        expectedOutput: 'Generated output ready',
      });
    }

    // Step 4: Feedback loop (optional, for complex intents)
    if (intentResult.confidence < 0.7 || intentResult.intent === 'multi-agent') {
      steps.push({
        stepType: 'feedback-loop',
        skillName: 'maestro-selector',
        input: {
          confidence: intentResult.confidence,
          requiresReclassification: true,
        },
      });
    }

    const estimatedDuration = steps.length * 2; // rough estimate: 2s per step

    return {
      requestId: planId,
      intent: intentResult.intent,
      steps,
      estimatedDuration,
      fallbackPlan: intentResult.intent === 'multi-agent' ? this.buildFallbackPlan(intentResult.intent) : undefined,
    };
  }

  private buildFallbackPlan(intent: Intent): OrchestrationPlan {
    return {
      requestId: uuidv4(),
      intent: 'help',
      steps: [
        {
          stepType: 'skill-lookup',
          skillName: 'help',
          input: { reason: 'Primary plan failed', originalIntent: intent },
        },
      ],
      estimatedDuration: 1,
    };
  }

  async executePlan(plan: OrchestrationPlan): Promise<ExecutionResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];

    if (!plan.steps || plan.steps.length === 0) {
      return {
        planId: plan.requestId,
        status: 'failed',
        stepResults: [],
        error: 'No steps in plan',
        executedAt: new Date(),
        duration: Date.now() - startTime,
      };
    }

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (!step) continue;

      const stepStartTime = Date.now();

      try {
        const result = await this.executeStep(step, i);
        stepResults.push(result);

        // Early exit on critical failure
        if (result.status === 'failed' && step.stepType !== 'feedback-loop') {
          console.error(`[OrchestrationEngine] Step ${i} failed, aborting plan`);
          break;
        }
      } catch (err) {
        console.error(`[OrchestrationEngine] Step ${i} error:`, err);
        stepResults.push({
          stepIndex: i,
          stepType: step.stepType,
          skillName: step.skillName,
          status: 'failed',
          error: String(err),
          duration: Date.now() - stepStartTime,
        });
        break;
      }
    }

    const duration = Date.now() - startTime;

    const overallStatus = stepResults.every((r) => r.status === 'success')
      ? 'success'
      : stepResults.some((r) => r.status === 'success')
        ? 'partial'
        : 'failed';

    return {
      planId: plan.requestId,
      status: overallStatus,
      stepResults,
      executedAt: new Date(),
      duration,
    };
  }

  private async executeStep(step: OrchestrationStep, stepIndex: number): Promise<StepResult> {
    const startTime = Date.now();

    try {
      // Step 1: Load skill
      if (step.stepType === 'skill-lookup') {
        const skill = this.registry.getSkill(step.skillName);
        if (!skill) {
          return {
            stepIndex,
            stepType: step.stepType,
            skillName: step.skillName,
            status: 'failed',
            error: `Skill not found: ${step.skillName}`,
            duration: Date.now() - startTime,
          };
        }

        return {
          stepIndex,
          stepType: step.stepType,
          skillName: step.skillName,
          status: 'success',
          output: {
            skillName: skill.name,
            skillType: skill.type,
            description: skill.description,
          },
          duration: Date.now() - startTime,
        };
      }

      // Step 2: Agent invocation (placeholder - would call actual agent)
      if (step.stepType === 'agent-invocation') {
        return {
          stepIndex,
          stepType: step.stepType,
          skillName: step.skillName,
          status: 'success',
          output: {
            agentName: step.agentName,
            activated: true,
            context: step.input,
          },
          duration: Date.now() - startTime,
        };
      }

      // Step 3: Generator execution (placeholder - would call actual generator)
      if (step.stepType === 'generator-exec') {
        const generator = this.registry.getSkill(step.generatorName || step.skillName);
        if (!generator) {
          return {
            stepIndex,
            stepType: step.stepType,
            skillName: step.skillName,
            status: 'failed',
            error: `Generator not found: ${step.generatorName}`,
            duration: Date.now() - startTime,
          };
        }

        return {
          stepIndex,
          stepType: step.stepType,
          skillName: step.skillName,
          status: 'success',
          output: {
            generatorName: generator.name,
            outputType: 'generated-content',
            ready: true,
          },
          duration: Date.now() - startTime,
        };
      }

      // Step 4: Feedback loop
      if (step.stepType === 'feedback-loop') {
        return {
          stepIndex,
          stepType: step.stepType,
          skillName: step.skillName,
          status: 'success',
          output: {
            feedbackCollected: true,
            reclassificationNeeded: step.input.requiresReclassification,
          },
          duration: Date.now() - startTime,
        };
      }

      return {
        stepIndex,
        stepType: step.stepType,
        skillName: step.skillName,
        status: 'skipped',
        duration: Date.now() - startTime,
      };
    } catch (err) {
      return {
        stepIndex,
        stepType: step.stepType,
        skillName: step.skillName,
        status: 'failed',
        error: String(err),
        duration: Date.now() - startTime,
      };
    }
  }
}

export const getOrchestrationEngine = (): OrchestrationEngine => new OrchestrationEngine();
