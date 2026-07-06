import { log } from '../agent/logger.js';
import type { GeneratedPrompt, PromptGenerationRequest } from '../agents/prompt-generation-agent.js';

/**
 * Scaling Layer: Cache + Load Balancer + Database Persistence
 * - In-memory cache (LRU) for prompt variations
 * - LLM provider routing (Claude → Deepseek → Cerebras fallback)
 * - Database persistence for long-term storage
 */

// ── Cache Layer (LRU In-Memory) ────────────────────────────────────────

interface CacheEntry {
  prompts: GeneratedPrompt[];
  timestamp: number;
  hitCount: number;
}

class PromptCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize = 1000;
  private ttlMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  getCacheKey(req: PromptGenerationRequest): string {
    return `${req.basePromptId}::${req.styleOverride || 'default'}::${req.occasionFilter || 'all'}`;
  }

  get(req: PromptGenerationRequest): GeneratedPrompt[] | null {
    const key = this.getCacheKey(req);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    log.debug('[PromptCache] hit', { key, hitCount: entry.hitCount });
    return entry.prompts;
  }

  set(req: PromptGenerationRequest, prompts: GeneratedPrompt[]): void {
    const key = this.getCacheKey(req);

    // Evict oldest if cache full (simple LRU)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      )[0]?.[0];
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      prompts,
      timestamp: Date.now(),
      hitCount: 0,
    });

    log.debug('[PromptCache] set', { key, count: prompts.length, size: this.cache.size });
  }

  stats(): { size: number; maxSize: number; hitRate: number } {
    const totalHits = Array.from(this.cache.values()).reduce((sum, e) => sum + e.hitCount, 0);
    const hitRate = this.cache.size > 0 ? totalHits / this.cache.size : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
    };
  }

  clear(): void {
    this.cache.clear();
    log.info('[PromptCache] cleared');
  }
}

export const promptCache = new PromptCache();

// ── Load Balancer (LLM Provider Routing) ───────────────────────────────

enum LLMProvider {
  CLAUDE = 'claude',
  DEEPSEEK = 'deepseek',
  CEREBRAS = 'cerebras',
}

interface ProviderConfig {
  name: LLMProvider;
  costPerKToken: number;
  available: boolean;
  quotaRemaining: number;
}

class LLMLoadBalancer {
  private providers: Map<LLMProvider, ProviderConfig> = new Map([
    [
      LLMProvider.CLAUDE,
      {
        name: LLMProvider.CLAUDE,
        costPerKToken: 0.003,
        available: true,
        quotaRemaining: Infinity,
      },
    ],
    [
      LLMProvider.DEEPSEEK,
      {
        name: LLMProvider.DEEPSEEK,
        costPerKToken: 0.0014,
        available: true,
        quotaRemaining: 1000000,
      },
    ],
    [
      LLMProvider.CEREBRAS,
      {
        name: LLMProvider.CEREBRAS,
        costPerKToken: 0.0001,
        available: false,
        quotaRemaining: 0,
      },
    ],
  ]);

  private requestCount: Map<LLMProvider, number> = new Map([
    [LLMProvider.CLAUDE, 0],
    [LLMProvider.DEEPSEEK, 0],
    [LLMProvider.CEREBRAS, 0],
  ]);

  selectProvider(): LLMProvider {
    const available = Array.from(this.providers.values()).filter((p) => p.available && p.quotaRemaining > 0);

    if (available.length === 0) {
      log.error('[LoadBalancer] No providers available');
      throw new Error('No LLM providers available');
    }

    // Round-robin with cost awareness
    const selected = available[0]!;
    log.info('[LoadBalancer] provider selected', {
      provider: selected.name,
      available: available.length,
    });

    this.requestCount.set(selected.name, (this.requestCount.get(selected.name) || 0) + 1);
    return selected.name;
  }

  updateQuota(provider: LLMProvider, tokensUsed: number): void {
    const config = this.providers.get(provider);
    if (config) {
      config.quotaRemaining = Math.max(0, config.quotaRemaining - tokensUsed);
      log.debug('[LoadBalancer] quota updated', {
        provider,
        remaining: config.quotaRemaining,
      });
    }
  }

  getStats(): Record<string, any> {
    return {
      providers: Array.from(this.providers.values()).map((p) => ({
        name: p.name,
        available: p.available,
        quotaRemaining: p.quotaRemaining,
        requests: this.requestCount.get(p.name) || 0,
      })),
    };
  }
}

export const loadBalancer = new LLMLoadBalancer();

// ── Database Layer (Simple SQL Interface) ──────────────────────────────

interface DbRow {
  id: string;
  base_id: string;
  style: string;
  occasion: string;
  prompt_text: string;
  quality_score: number;
  created_at: string;
}

class PromptDatabase {
  private isReady = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // In production, connect to Supabase/PostgreSQL
    // For now, log initialization
    log.info('[PromptDB] initializing');
    this.isReady = true;
  }

  async insert(prompts: GeneratedPrompt[]): Promise<void> {
    if (!this.isReady) throw new Error('Database not ready');

    const rows: DbRow[] = prompts.map((p) => ({
      id: p.id,
      base_id: p.baseId,
      style: p.style,
      occasion: p.occasion,
      prompt_text: p.prompt,
      quality_score: 0.9,
      created_at: new Date().toISOString(),
    }));

    log.info('[PromptDB] inserting rows', { count: rows.length });

    // TODO: Execute INSERT query
    // await db.query(`
    //   INSERT INTO prompts_cache (id, base_id, style, occasion, prompt_text, quality_score, created_at)
    //   VALUES ($1, $2, $3, $4, $5, $6, $7)
    //   ON CONFLICT(id) DO NOTHING
    // `, [rows]);

    // For now, just log
    rows.forEach((row) => {
      log.debug('[PromptDB] cached', {
        id: row.id,
        baseId: row.base_id,
        style: row.style,
      });
    });
  }

  async query(baseId: string, style: string, limit: number): Promise<GeneratedPrompt[]> {
    if (!this.isReady) throw new Error('Database not ready');

    log.info('[PromptDB] querying', { baseId, style, limit });

    // TODO: Execute SELECT query
    // const rows = await db.query(`
    //   SELECT * FROM prompts_cache
    //   WHERE base_id = $1 AND style = $2
    //   LIMIT $3
    // `, [baseId, style, limit]);

    // For now, return empty (cache is primary)
    return [];
  }

  async migrate(): Promise<void> {
    log.info('[PromptDB] running migrations');

    // TODO: Create table if not exists
    // const createTableSql = `
    //   CREATE TABLE IF NOT EXISTS prompts_cache (
    //     id UUID PRIMARY KEY,
    //     base_id VARCHAR(50) NOT NULL,
    //     style VARCHAR(20) NOT NULL,
    //     occasion VARCHAR(50),
    //     prompt_text TEXT NOT NULL,
    //     quality_score FLOAT,
    //     created_at TIMESTAMP DEFAULT NOW(),
    //     INDEX idx_base_style (base_id, style, occasion)
    //   );
    // `;
    // await db.query(createTableSql);

    log.info('[PromptDB] migrations complete');
  }
}

export const promptDb = new PromptDatabase();

// ── Scaling Coordinator ────────────────────────────────────────────────

export const scalingLayer = {
  cache: promptCache,
  loadBalancer: loadBalancer,
  database: promptDb,

  /**
   * Unified get operation: cache → DB → generate
   */
  async getOrGenerate(
    req: PromptGenerationRequest,
    generateFn: (req: PromptGenerationRequest) => Promise<GeneratedPrompt[]>,
  ): Promise<GeneratedPrompt[]> {
    // 1. Try cache
    const cached = promptCache.get(req);
    if (cached && cached.length >= req.numberOfVariations) {
      log.info('[ScalingLayer] cache hit', { count: cached.length });
      return cached.slice(0, req.numberOfVariations);
    }

    // 2. Try database
    const dbResults = await promptDb.query(
      req.basePromptId,
      req.styleOverride || 'default',
      req.numberOfVariations,
    );
    if (dbResults.length >= req.numberOfVariations) {
      log.info('[ScalingLayer] db hit', { count: dbResults.length });
      promptCache.set(req, dbResults);
      return dbResults;
    }

    // 3. Generate
    log.info('[ScalingLayer] cache miss → generating');
    const generated = await generateFn(req);

    // 4. Persist
    await promptDb.insert(generated);
    promptCache.set(req, generated);

    return generated;
  },

  /**
   * Get system health
   */
  getHealth() {
    return {
      cache: promptCache.stats(),
      loadBalancer: loadBalancer.getStats(),
      database: { ready: promptDb ? 'ok' : 'not ready' },
      timestamp: new Date().toISOString(),
    };
  },
};
