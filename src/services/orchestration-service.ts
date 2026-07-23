import { v4 as uuidv4 } from 'uuid';
import type { ExecutionResult, IntentResult, OrchestrationRequest } from '../types/intent';
import { getMaestroSelector } from '../core/maestro-selector';
import { getOrchestrationEngine } from '../core/orchestration-engine';
import type { StepResultRecord } from '../db/schema';

export interface OrchestrationResponse {
  runId: string;
  intent: string;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed';
  confidence: number;
  reasoning: string;
  executionDuration: number;
  stepCount: number;
  outputs?: Record<string, unknown>;
  error?: string;
}

interface Database {
  run?: (sql: string, params?: unknown[]) => void;
  get?: (sql: string, params?: unknown[]) => unknown;
}

export class OrchestrationService {
  private maestro = getMaestroSelector();
  private engine = getOrchestrationEngine();
  private db?: Database;

  constructor(database?: Database) {
    this.db = database;
  }

  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    const runId = uuidv4();
    const startTime = Date.now();

    try {
      // Step 1: Classify intent
      const intentResult = await this.maestro.classify(request);

      // Record run start
      if (this.db) {
        this.recordRunStart(runId, request.userRequest, intentResult);
      }

      // Step 2: Build orchestration plan
      const plan = this.engine.buildPlan(intentResult);

      // Step 3: Execute plan
      const executionResult = await this.engine.executePlan(plan);

      // Step 4: Save results to database
      if (this.db) {
        this.recordRunCompletion(runId, executionResult, intentResult);
      }

      // Step 5: Build response
      return this.buildResponse(runId, intentResult, executionResult, Date.now() - startTime);
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[OrchestrationService] Orchestration failed for run ${runId}:`, err);

      if (this.db) {
        this.recordRunError(runId, String(err));
      }

      return {
        runId,
        intent: 'error',
        status: 'failed',
        confidence: 0,
        reasoning: 'Orchestration failed',
        executionDuration: duration,
        stepCount: 0,
        error: String(err),
      };
    }
  }

  async generateOffer(params: {
    product: string;
    targetCustomer: string;
    uniqueAdvantage: string;
    painPoints: string[];
    priceRange: { min: number; target: number; max: number };
  }): Promise<OrchestrationResponse> {
    const request: OrchestrationRequest = {
      userRequest: `Create offer for: ${params.product}. Target: ${params.targetCustomer}. Unique advantage: ${params.uniqueAdvantage}.`,
      context: {
        metadata: {
          generatorType: 'offer-generator',
          params,
        },
      },
    };

    return this.orchestrate(request);
  }

  async generateGrowthPlan(params: {
    growthTarget: Record<string, number>;
    currentState: Record<string, number>;
    product: string;
    targetCustomer: string;
    positioning: string;
  }): Promise<OrchestrationResponse> {
    const request: OrchestrationRequest = {
      userRequest: `Generate 90-day growth plan. Target: ${JSON.stringify(params.growthTarget)}. Current: ${JSON.stringify(params.currentState)}.`,
      context: {
        metadata: {
          generatorType: 'growth-plan-generator',
          params,
        },
      },
    };

    return this.orchestrate(request);
  }

  async generateSalesSystem(params: {
    prospectProfile: Record<string, unknown>;
    offer: Record<string, unknown>;
    prospectList: Array<{ name: string; email: string; urgency: string }>;
  }): Promise<OrchestrationResponse> {
    const request: OrchestrationRequest = {
      userRequest: `Create sales system for: ${params.prospectList.length} prospects. Offer: ${JSON.stringify(params.offer)}.`,
      context: {
        metadata: {
          generatorType: 'sales-system-generator',
          params,
        },
      },
    };

    return this.orchestrate(request);
  }

  async generateCommunityCharter(params: {
    purpose: string;
    targetMember: Record<string, unknown>;
    identity: Record<string, unknown>;
    growthGoal: Record<string, number>;
  }): Promise<OrchestrationResponse> {
    const request: OrchestrationRequest = {
      userRequest: `Create community charter. Purpose: ${params.purpose}. Growth goal: ${JSON.stringify(params.growthGoal)}.`,
      context: {
        metadata: {
          generatorType: 'community-charter-generator',
          params,
        },
      },
    };

    return this.orchestrate(request);
  }

  async generateProductRoadmap(params: {
    hedgehog: string;
    customerInsights: Record<string, unknown>;
    positioning: Record<string, unknown>;
  }): Promise<OrchestrationResponse> {
    const request: OrchestrationRequest = {
      userRequest: `Generate 90-day product roadmap. Hedgehog: ${params.hedgehog}.`,
      context: {
        metadata: {
          generatorType: 'product-roadmap-generator',
          params,
        },
      },
    };

    return this.orchestrate(request);
  }

  private buildResponse(
    runId: string,
    intentResult: IntentResult,
    executionResult: ExecutionResult,
    duration: number,
  ): OrchestrationResponse {
    return {
      runId,
      intent: intentResult.intent,
      status: executionResult.status,
      confidence: intentResult.confidence,
      reasoning: intentResult.reasoning,
      executionDuration: duration,
      stepCount: executionResult.stepResults.length,
      outputs: executionResult.finalOutput,
    };
  }

  private recordRunStart(runId: string, _userRequest: string, intentResult: IntentResult): void {
    if (!this.db) return;

    try {
      // Would insert into database
      console.log(`[OrchestrationService] Run ${runId} started: ${intentResult.intent}`);
    } catch (err) {
      console.error(`[OrchestrationService] Failed to record run start:`, err);
    }
  }

  private recordRunCompletion(runId: string, executionResult: ExecutionResult, _intentResult: IntentResult): void {
    if (!this.db) return;

    try {
      // Would update database with final status and results
      console.log(
        `[OrchestrationService] Run ${runId} completed: ${executionResult.status} (${executionResult.duration}ms)`,
      );

      // Save step results
      for (const stepResult of executionResult.stepResults) {
        // Would insert record with these fields into database
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _record = {
          id: uuidv4(),
          run_id: runId,
          step_index: stepResult.stepIndex,
          step_type: stepResult.stepType,
          skill_name: stepResult.skillName,
          status: stepResult.status,
          output_data: stepResult.output ? JSON.stringify(stepResult.output) : undefined,
          error_message: stepResult.error,
          duration_ms: stepResult.duration,
          created_at: new Date().toISOString(),
        } as StepResultRecord;
      }
    } catch (err) {
      console.error(`[OrchestrationService] Failed to record run completion:`, err);
    }
  }

  private recordRunError(runId: string, error: string): void {
    if (!this.db) return;

    try {
      // Would update database with error status
      console.log(`[OrchestrationService] Run ${runId} failed: ${error}`);
    } catch (err) {
      console.error(`[OrchestrationService] Failed to record run error:`, err);
    }
  }
}

export const getOrchestrationService = (database?: Database): OrchestrationService =>
  new OrchestrationService(database);
