/**
 * FeedIA Database Layer
 * SQLite initialization + prompt storage + image indexing
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { log } from '../agent/logger.js';

const DB_PATH = process.env.DB_PATH || './feedia.db';

interface PromptRecord {
  id: string;
  batch_id: string;
  category: string;
  base_template: string;
  placeholders: string;
  required_params: string;
  optional_params?: string;
  specs?: string;
}

interface UserImageRecord {
  id: string;
  user_id?: string;
  image_path: string;
  image_hash: string;
  features_json: string;
  embedding_vector?: string;
}

interface PromptVariationRecord {
  id: string;
  prompt_id: string;
  variation_text: string;
  tone?: string;
  emotional_arc?: string;
  duration?: number;
  version: number;
}

class FeedIADatabase {
  private db: Database.Database;
  private initialized = false;

  constructor() {
    try {
      this.db = new Database(DB_PATH);
      this.db.pragma('journal_mode = WAL'); // Write-ahead logging
      this.db.pragma('foreign_keys = ON');
      log.info('[Database] Connected', { path: DB_PATH });
    } catch (error) {
      log.error('[Database] Connection failed', error);
      throw error;
    }
  }

  /**
   * Get database connection
   */
  getConnection(): Database.Database {
    return this.db;
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    try {
      const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      this.db.exec(schema);
      this.initialized = true;
      log.info('[Database] Schema initialized');
    } catch (error) {
      log.error('[Database] Schema initialization failed', error);
      throw error;
    }
  }

  /**
   * Store prompt in database
   */
  storePrompt(prompt: PromptRecord): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO prompts (id, batch_id, category, base_template, placeholders, required_params, optional_params, specs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        prompt.id,
        prompt.batch_id,
        prompt.category,
        prompt.base_template,
        prompt.placeholders,
        prompt.required_params,
        prompt.optional_params || null,
        prompt.specs || null
      );

      return true;
    } catch (error) {
      log.error('[Database] Store prompt failed', { id: prompt.id, error });
      return false;
    }
  }

  /**
   * Store batch of prompts (transaction)
   */
  storePromptsBatch(prompts: PromptRecord[]): number {
    try {
      const insertStmt = this.db.prepare(`
        INSERT INTO prompts (id, batch_id, category, base_template, placeholders, required_params, optional_params, specs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = this.db.transaction((batch: PromptRecord[]) => {
        let count = 0;
        for (const prompt of batch) {
          try {
            insertStmt.run(
              prompt.id,
              prompt.batch_id,
              prompt.category,
              prompt.base_template,
              prompt.placeholders,
              prompt.required_params,
              prompt.optional_params || null,
              prompt.specs || null
            );
            count++;
          } catch (e) {
            log.warn('[Database] Skipped prompt on batch insert', { id: prompt.id });
          }
        }
        return count;
      });

      const stored = transaction(prompts);
      log.info('[Database] Batch stored', { count: stored, total: prompts.length });
      return stored;
    } catch (error) {
      log.error('[Database] Batch store failed', error);
      return 0;
    }
  }

  /**
   * Store user image + extract features
   */
  storeUserImage(image: UserImageRecord): string | null {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_images (id, user_id, image_path, image_hash, features_json, embedding_vector)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        image.id,
        image.user_id || null,
        image.image_path,
        image.image_hash,
        image.features_json,
        image.embedding_vector || null
      );

      log.info('[Database] Image stored', { id: image.id, user: image.user_id });
      return image.id;
    } catch (error) {
      log.error('[Database] Store image failed', error);
      return null;
    }
  }

  /**
   * Find matching prompts for user image (similarity search)
   */
  findMatchingPrompts(imageId: string, limit: number = 50): PromptVariationRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT pv.* FROM prompt_variations pv
        INNER JOIN prompt_matches pm ON pv.id = pm.prompt_variation_id
        WHERE pm.user_image_id = ?
        ORDER BY pm.similarity_score DESC
        LIMIT ?
      `);

      const results = stmt.all(imageId, limit) as PromptVariationRecord[];
      return results;
    } catch (error) {
      log.error('[Database] Find matching prompts failed', { imageId, error });
      return [];
    }
  }

  /**
   * Store prompt variation (LLM-expanded)
   */
  storeVariation(variation: PromptVariationRecord): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO prompt_variations (id, prompt_id, variation_text, tone, emotional_arc, duration, version)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        variation.id,
        variation.prompt_id,
        variation.variation_text,
        variation.tone || null,
        variation.emotional_arc || null,
        variation.duration || null,
        variation.version
      );

      return true;
    } catch (error) {
      log.error('[Database] Store variation failed', error);
      return false;
    }
  }

  /**
   * Get prompts by batch + category
   */
  getPromptsByBatchCategory(batchId: string, category: string): PromptRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM prompts
        WHERE batch_id = ? AND category = ?
        LIMIT 100
      `);

      return stmt.all(batchId, category) as PromptRecord[];
    } catch (error) {
      log.error('[Database] Get prompts failed', { batchId, category, error });
      return [];
    }
  }

  /**
   * Get all prompts in a batch (for expansion)
   */
  getPromptsByBatch(batchId: string): PromptRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM prompts
        WHERE batch_id = ?
        ORDER BY id ASC
      `);

      return stmt.all(batchId) as PromptRecord[];
    } catch (error) {
      log.error('[Database] Get batch prompts failed', { batchId, error });
      return [];
    }
  }

  /**
   * Get library statistics
   */
  getStats(): Record<string, any> {
    try {
      const promptCount = (this.db.prepare('SELECT COUNT(*) as count FROM prompts').get() as any).count;
      const variationCount = (this.db.prepare('SELECT COUNT(*) as count FROM prompt_variations').get() as any).count;
      const imageCount = (this.db.prepare('SELECT COUNT(*) as count FROM user_images').get() as any).count;
      const contentCount = (this.db.prepare('SELECT COUNT(*) as count FROM generated_content').get() as any).count;

      return {
        prompts: promptCount,
        variations: variationCount,
        images: imageCount,
        content: contentCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      log.error('[Database] Stats query failed', error);
      return {};
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    try {
      this.db.close();
      log.info('[Database] Connection closed');
    } catch (error) {
      log.error('[Database] Close failed', error);
    }
  }
}

// Initialize database with graceful fallback when better-sqlite3 native module is unavailable
// (e.g. on Vercel serverless where native bindings may not be bundled).
// The fallback returns safe no-op values so routes don't crash entirely.
let feedIADatabaseInstance: FeedIADatabase | null = null;

try {
  feedIADatabaseInstance = new FeedIADatabase();
} catch (error) {
  log.warn('[Database] Failed to initialize real database, using mock fallback', error);
}

const mockDatabase = {
  initialize: async () => {
    log.warn('[MockDatabase] initialize called (real DB unavailable)');
    return Promise.resolve();
  },
  storeUserImage: () => false,
  storePrompt: () => false,
  findMatchingPrompts: () => [],
  getPromptsByBatch: () => [],
  storeVariation: () => false,
  getStats: () => ({ tables: 0, totalRecords: 0 }),
  close: () => {
    log.info('[MockDatabase] close called');
  },
};

export const feedIADatabase = (feedIADatabaseInstance || mockDatabase) as FeedIADatabase;
