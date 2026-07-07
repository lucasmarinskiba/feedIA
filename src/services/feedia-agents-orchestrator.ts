/**
 * FeedIA Agents Orchestrator
 * Coordinates specialized agents for maximum efficiency
 * Parallel processing, task delegation, result aggregation
 */

import { log } from '../agent/logger.js';
import { feedIADatabase } from '../db/database.js';
import { qualityValidator } from './quality-validator.js';
import { promptRefinementEngine } from './prompt-refinement-engine.js';
import { characterStabilityService } from './character-stability.js';
import { batchExpansionWorker } from './batch-expansion-worker.js';

interface AgentTask {
  id: string;
  type: 'content-generation' | 'quality-validation' | 'consistency-check' | 'refinement' | 'analytics';
  payload: Record<string, any>;
  priority: number; // 1-10, higher = more urgent
  createdAt: string;
  completedAt?: string;
  result?: Record<string, any>;
  error?: string;
}

interface AgentMetrics {
  agentId: string;
  tasksCompleted: number;
  averageLatency: number;
  errorRate: number;
  successRate: number;
  specialization: string;
}

class FeedIAAgentsOrchestrator {
  private agents: Map<string, AgentMetrics> = new Map();
  private taskQueue: AgentTask[] = [];
  private activetasks: Map<string, AgentTask> = new Map();
  private completedTasks: AgentTask[] = [];

  /**
   * Initialize specialized agents
   */
  initializeAgents(): void {
    const agents: AgentMetrics[] = [
      {
        agentId: 'content-generator-001',
        tasksCompleted: 0,
        averageLatency: 0,
        errorRate: 0,
        successRate: 100,
        specialization: 'Content Generation (video/carousel/story)',
      },
      {
        agentId: 'quality-validator-001',
        tasksCompleted: 0,
        averageLatency: 0,
        errorRate: 0,
        successRate: 100,
        specialization: 'Quality Validation (ortografia/faces/products/environments)',
      },
      {
        agentId: 'consistency-enforcer-001',
        tasksCompleted: 0,
        averageLatency: 0,
        errorRate: 0,
        successRate: 100,
        specialization: 'Consistency Locks (character/product/environment)',
      },
      {
        agentId: 'refinement-engine-001',
        tasksCompleted: 0,
        averageLatency: 0,
        errorRate: 0,
        successRate: 100,
        specialization: 'Prompt Refinement (cinematography patterns + artistic standards)',
      },
      {
        agentId: 'analytics-engine-001',
        tasksCompleted: 0,
        averageLatency: 0,
        errorRate: 0,
        successRate: 100,
        specialization: 'Analytics (metrics, optimization, performance)',
      },
      {
        agentId: 'batch-processor-001',
        tasksCompleted: 0,
        averageLatency: 0,
        errorRate: 0,
        successRate: 100,
        specialization: 'Batch Processing (queue management, rate limiting)',
      },
    ];

    for (const agent of agents) {
      this.agents.set(agent.agentId, agent);
    }

    log.info('[Orchestrator] Agents initialized', { count: agents.length });
  }

  /**
   * Submit task to orchestrator
   */
  submitTask(
    type: AgentTask['type'],
    payload: Record<string, any>,
    priority: number = 5
  ): string {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const task: AgentTask = {
      id: taskId,
      type,
      payload,
      priority,
      createdAt: new Date().toISOString(),
    };

    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    log.info('[Orchestrator] Task submitted', { taskId, type, priority });

    return taskId;
  }

  /**
   * Process task queue (auto-delegate to specialized agents)
   */
  async processQueue(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) break;

      this.activeTasksmake.set(task.id, task);

      try {
        const startTime = Date.now();

        // Delegate to specialized agent
        let result;
        switch (task.type) {
          case 'content-generation':
            result = await this.delegateContentGeneration(task);
            break;
          case 'quality-validation':
            result = await this.delegateQualityValidation(task);
            break;
          case 'consistency-check':
            result = await this.delegateConsistencyCheck(task);
            break;
          case 'refinement':
            result = await this.delegateRefinement(task);
            break;
          case 'analytics':
            result = await this.delegateAnalytics(task);
            break;
          default:
            throw new Error(`Unknown task type: ${task.type}`);
        }

        const latency = Date.now() - startTime;

        task.result = result;
        task.completedAt = new Date().toISOString();

        // Update agent metrics
        this.updateAgentMetrics(task.type, latency, true);

        this.completedTasks.push(task);
        this.activeTasksmake.delete(task.id);

        log.info('[Orchestrator] Task completed', { taskId: task.id, latency: `${latency}ms` });
      } catch (error) {
        task.error = String(error);
        task.completedAt = new Date().toISOString();

        this.updateAgentMetrics(task.type, 0, false);
        this.activeTasksmake.delete(task.id);

        log.error('[Orchestrator] Task failed', { taskId: task.id, error });
      }
    }
  }

  /**
   * Delegate content generation
   */
  private async delegateContentGeneration(task: AgentTask): Promise<Record<string, any>> {
    const { prompt, format, parameterization } = task.payload;

    // TODO: Call content generation service
    return {
      status: 'generated',
      format,
      contentUrl: '/generated/content',
    };
  }

  /**
   * Delegate quality validation
   */
  private async delegateQualityValidation(task: AgentTask): Promise<Record<string, any>> {
    const { promptText } = task.payload;

    const validation = await qualityValidator.validatePrompt(promptText);

    return {
      status: 'validated',
      score: validation.score,
      passed: validation.passed,
      issues: validation.issues,
    };
  }

  /**
   * Delegate consistency check
   */
  private async delegateConsistencyCheck(task: AgentTask): Promise<Record<string, any>> {
    const { seriesId, prompts } = task.payload;

    const report = await characterStabilityService.validateCharacterConsistency(seriesId, prompts);

    return {
      status: 'checked',
      ...report,
    };
  }

  /**
   * Delegate refinement
   */
  private async delegateRefinement(task: AgentTask): Promise<Record<string, any>> {
    const { promptText } = task.payload;

    const refinement = await promptRefinementEngine.refinePrompt(promptText);

    return {
      status: 'refined',
      improvement: refinement.qualityScoreImprovement,
      changesApplied: refinement.changes.length,
      refinedPrompt: refinement.refinedPrompt,
    };
  }

  /**
   * Delegate analytics
   */
  private async delegateAnalytics(task: AgentTask): Promise<Record<string, any>> {
    const { metricType } = task.payload;

    const stats = feedIADatabase.getStats();

    return {
      status: 'analyzed',
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update agent performance metrics
   */
  private updateAgentMetrics(
    agentType: AgentTask['type'],
    latency: number,
    success: boolean
  ): void {
    let agentId = '';

    switch (agentType) {
      case 'content-generation':
        agentId = 'content-generator-001';
        break;
      case 'quality-validation':
        agentId = 'quality-validator-001';
        break;
      case 'consistency-check':
        agentId = 'consistency-enforcer-001';
        break;
      case 'refinement':
        agentId = 'refinement-engine-001';
        break;
      case 'analytics':
        agentId = 'analytics-engine-001';
        break;
    }

    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.tasksCompleted++;
    agent.averageLatency = (agent.averageLatency * (agent.tasksCompleted - 1) + latency) / agent.tasksCompleted;

    if (success) {
      agent.successRate = 100;
    } else {
      agent.errorRate = (agent.errorRate * (agent.tasksCompleted - 1) + 1) / agent.tasksCompleted;
      agent.successRate = 100 - agent.errorRate * 100;
    }
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics(): AgentMetrics[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): AgentTask | null {
    return this.activeTasksmake.get(taskId) || this.completedTasks.find(t => t.id === taskId) || null;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): Record<string, any> {
    return {
      queued: this.taskQueue.length,
      active: this.activeTasksmake.size,
      completed: this.completedTasks.length,
      avgLatency: this.getAverageLatency(),
      successRate: this.getSuccessRate(),
    };
  }

  /**
   * Helper: Get average latency
   */
  private getAverageLatency(): number {
    const completed = this.completedTasks.filter(t => t.completedAt && !t.error);
    if (completed.length === 0) return 0;

    return (
      completed.reduce((sum, t) => {
        const start = new Date(t.createdAt).getTime();
        const end = new Date(t.completedAt!).getTime();
        return sum + (end - start);
      }, 0) / completed.length
    );
  }

  /**
   * Helper: Get success rate
   */
  private getSuccessRate(): number {
    const total = this.completedTasks.length;
    if (total === 0) return 100;

    const successful = this.completedTasks.filter(t => !t.error).length;
    return (successful / total) * 100;
  }
}

export const feedIAOrchestrator = new FeedIAAgentsOrchestrator();
