import type { BrandProfile } from '../../config/types.js';

export interface FeedbackEvent {
  timestamp: string;
  type: 'engagement' | 'generation' | 'validation';
  metric: string;
  value: number;
}

export class FeedbackLoop {
  private brand: BrandProfile;
  private events: FeedbackEvent[] = [];
  private metricsCache: Record<string, any> = {};

  constructor(brand: BrandProfile) {
    this.brand = brand;
  }

  recordEvent(type: FeedbackEvent['type'], metric: string, value: number): void {
    this.events.push({
      timestamp: new Date().toISOString(),
      type,
      metric,
      value,
    });
  }

  async recordMetrics(data: { batchId: string; prompts: any[]; metrics: any }): Promise<void> {
    this.metricsCache[data.batchId] = {
      timestamp: new Date().toISOString(),
      ...data,
    };
  }

  async getOptimizedConfig(): Promise<Record<string, any>> {
    return {
      style: 'balanced',
      temperature: 0.7,
      maxTokens: 512,
      occasionWeights: { trabajo: 0.4, amigos: 0.3, temática: 0.3 },
      qualityThreshold: 0.85,
    };
  }

  async getMetrics(batchId: string): Promise<any> {
    return this.metricsCache[batchId] || null;
  }

  getEvents(): FeedbackEvent[] {
    return this.events;
  }

  analyze(): { average: number; trend: string } {
    if (this.events.length === 0) {
      return { average: 0, trend: 'none' };
    }
    const average = this.events.reduce((sum, e) => sum + e.value, 0) / this.events.length;
    return { average, trend: average > 0.5 ? 'positive' : 'negative' };
  }
}
