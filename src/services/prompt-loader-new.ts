import { carouselDB } from '../db/postgres.js';

export interface PromptRecord {
  id: string;
  text: string;
  batch: number;
  category: string;
  tags: string[];
}

export interface PromptFilter {
  batch?: number;
  category?: string;
  tags?: string[];
  limit?: number;
}

export interface PromptContext {
  prompt: PromptRecord;
  variations: PromptRecord[];
  brandContext: string;
  format: 'carousel' | 'reel' | 'story' | 'post';
}

interface PoolLike {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const getPool = () => {
  const db = carouselDB as unknown as Record<string, unknown>;
  return db.pool as PoolLike | undefined;
};

export const promptLoader = {
  async loadPrompt(batchId: number, promptId: string): Promise<PromptRecord | null> {
    try {
      const pool = getPool();
      if (!pool) return null;

      const result = await pool.query('SELECT * FROM prompts WHERE batch_id = $1 LIMIT 1', [batchId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0] as Record<string, unknown>;
      return {
        id: promptId,
        text: row.prompt_text as string,
        batch: row.batch_id as number,
        category: row.category as string,
        tags: (row.tags as string)?.split(',') || [],
      };
    } catch {
      return null;
    }
  },

  async queryPrompts(filter: PromptFilter): Promise<PromptRecord[]> {
    try {
      const pool = getPool();
      if (!pool) return [];

      let query = 'SELECT batch_id, category, prompt_text, tags FROM prompts WHERE 1=1';
      const params: unknown[] = [];
      let paramCount = 1;

      if (filter.batch) {
        query += ` AND batch_id = $${paramCount}`;
        params.push(filter.batch);
        paramCount += 1;
      }

      if (filter.category) {
        query += ` AND category = $${paramCount}`;
        params.push(filter.category);
        paramCount += 1;
      }

      if (filter.tags && filter.tags.length > 0) {
        query += ` AND tags && ARRAY[${filter.tags.map((t) => `'${t}'`).join(',')}]::text[]`;
      }

      query += ' ORDER BY RANDOM()';
      if (filter.limit) query += ` LIMIT ${filter.limit}`;

      const result = await pool.query(query, params);

      return (result.rows as Record<string, unknown>[]).map((row, idx) => ({
        id: `${row.batch_id}-${idx}`,
        text: row.prompt_text as string,
        batch: row.batch_id as number,
        category: row.category as string,
        tags: (row.tags as string)?.split(',') || [],
      }));
    } catch {
      return [];
    }
  },

  async getPromptContext(
    category: string,
    format: 'carousel' | 'reel' | 'story' | 'post',
    tags?: string[],
  ): Promise<PromptContext> {
    const prompts = await this.queryPrompts({ category, tags, limit: 20 });

    if (prompts.length === 0) {
      throw new Error(`No prompts found for category=${category}`);
    }

    const randomIndex = Math.floor(Math.random() * prompts.length);
    const primary = prompts[randomIndex]!;
    const variations = prompts.filter((_, i) => i !== randomIndex).slice(0, 3);

    const formatContext = {
      carousel: 'Pinterest carousel: hook text, value slides, CTA',
      reel: 'Instagram Reel: 15-30s, hook + value + retention motion',
      story: 'Instagram Story: vertical 9:16, text-light, swipe-up',
      post: 'Feed post: square, caption, hashtags',
    };

    return {
      prompt: primary,
      variations,
      brandContext: formatContext[format],
      format,
    };
  },

  async getBatchStats(): Promise<Record<string, unknown>> {
    try {
      const pool = getPool();
      if (!pool) return {};

      const result = await pool.query(`
        SELECT COUNT(*) as total_prompts, COUNT(DISTINCT batch_id) as total_batches
        FROM prompts
      `);

      return (result.rows[0] as Record<string, unknown>) || {};
    } catch {
      return {};
    }
  },
};
