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

interface CountRow {
  count: number;
}

export interface DatabaseStats {
  prompts: number;
  variations: number;
  images: number;
  content: number;
  timestamp: string;
}

export interface IFeedIADatabase {
  getConnection(): Database.Database;
  initialize(): Promise<void>;
  storePrompt(prompt: PromptRecord): boolean;
  storePromptsBatch(prompts: PromptRecord[]): number;
  storeUserImage(image: UserImageRecord): string | null;
  findMatchingPrompts(imageId: string, limit?: number): PromptVariationRecord[];
  storeVariation(variation: PromptVariationRecord): boolean;
  getPromptsByBatchCategory(batchId: string, category: string): PromptRecord[];
  getPromptsByBatch(batchId: string): PromptRecord[];
  getStats(): DatabaseStats;
  close(): void;
}

class FeedIADatabase implements IFeedIADatabase {
  private db: Database.Database;
  private initialized = false;

  // Prepared statements are compiled once (after schema init) and reused —
  // db.prepare() recompiles SQL on every call, which is wasted work on hot
  // paths like storePrompt/findMatchingPrompts under batch load.
  private statements!: {
    insertPrompt: Database.Statement;
    insertUserImage: Database.Statement;
    insertVariation: Database.Statement;
    findMatchingPrompts: Database.Statement;
    getPromptsByBatchCategory: Database.Statement;
    getPromptsByBatch: Database.Statement;
    countPrompts: Database.Statement;
    countVariations: Database.Statement;
    countImages: Database.Statement;
    countContent: Database.Statement;
  };

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
   * Initialize database schema + compile prepared statements
   */
  async initialize(): Promise<void> {
    try {
      const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      this.db.exec(schema);
      this.prepareStatements();
      this.initialized = true;
      log.info('[Database] Schema initialized');
    } catch (error) {
      log.error('[Database] Schema initialization failed', error);
      throw error;
    }
  }

  private prepareStatements(): void {
    this.statements = {
      insertPrompt: this.db.prepare(`
        INSERT INTO prompts (id, batch_id, category, base_template, placeholders, required_params, optional_params, specs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),
      insertUserImage: this.db.prepare(`
        INSERT INTO user_images (id, user_id, image_path, image_hash, features_json, embedding_vector)
        VALUES (?, ?, ?, ?, ?, ?)
      `),
      insertVariation: this.db.prepare(`
        INSERT INTO prompt_variations (id, prompt_id, variation_text, tone, emotional_arc, duration, version)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      findMatchingPrompts: this.db.prepare(`
        SELECT pv.* FROM prompt_variations pv
        INNER JOIN prompt_matches pm ON pv.id = pm.prompt_variation_id
        WHERE pm.user_image_id = ?
        ORDER BY pm.similarity_score DESC
        LIMIT ?
      `),
      getPromptsByBatchCategory: this.db.prepare(`
        SELECT * FROM prompts
        WHERE batch_id = ? AND category = ?
        LIMIT 100
      `),
      getPromptsByBatch: this.db.prepare(`
        SELECT * FROM prompts
        WHERE batch_id = ?
        ORDER BY id ASC
      `),
      countPrompts: this.db.prepare('SELECT COUNT(*) as count FROM prompts'),
      countVariations: this.db.prepare('SELECT COUNT(*) as count FROM prompt_variations'),
      countImages: this.db.prepare('SELECT COUNT(*) as count FROM user_images'),
      countContent: this.db.prepare('SELECT COUNT(*) as count FROM generated_content'),
    };
  }

  /**
   * Store prompt in database
   */
  storePrompt(prompt: PromptRecord): boolean {
    try {
      this.statements.insertPrompt.run(
        prompt.id,
        prompt.batch_id,
        prompt.category,
        prompt.base_template,
        prompt.placeholders,
        prompt.required_params,
        prompt.optional_params || null,
        prompt.specs || null,
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
      const insertStmt = this.statements.insertPrompt;

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
              prompt.specs || null,
            );
            count++;
          } catch (error) {
            log.warn('[Database] Skipped prompt on batch insert', { id: prompt.id, error });
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
      this.statements.insertUserImage.run(
        image.id,
        image.user_id || null,
        image.image_path,
        image.image_hash,
        image.features_json,
        image.embedding_vector || null,
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
      return this.statements.findMatchingPrompts.all(imageId, limit) as PromptVariationRecord[];
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
      this.statements.insertVariation.run(
        variation.id,
        variation.prompt_id,
        variation.variation_text,
        variation.tone || null,
        variation.emotional_arc || null,
        variation.duration || null,
        variation.version,
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
      return this.statements.getPromptsByBatchCategory.all(batchId, category) as PromptRecord[];
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
      return this.statements.getPromptsByBatch.all(batchId) as PromptRecord[];
    } catch (error) {
      log.error('[Database] Get batch prompts failed', { batchId, error });
      return [];
    }
  }

  /**
   * Get library statistics
   */
  getStats(): DatabaseStats {
    try {
      const promptCount = (this.statements.countPrompts.get() as CountRow).count;
      const variationCount = (this.statements.countVariations.get() as CountRow).count;
      const imageCount = (this.statements.countImages.get() as CountRow).count;
      const contentCount = (this.statements.countContent.get() as CountRow).count;

      return {
        prompts: promptCount,
        variations: variationCount,
        images: imageCount,
        content: contentCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      log.error('[Database] Stats query failed', error);
      return { prompts: 0, variations: 0, images: 0, content: 0, timestamp: new Date().toISOString() };
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

// Force mock database on Railway (ephemeral filesystem, no persistent SQLite)
const isRailway = !!process.env.RAILWAY_SERVICE_NAME;
if (isRailway) {
  log.warn('[Database] Running on Railway — using mock database (ephemeral filesystem)');
} else {
  try {
    feedIADatabaseInstance = new FeedIADatabase();
  } catch (error) {
    log.warn('[Database] Failed to initialize real database, using mock fallback', error);
  }
}

const mockDatabase: IFeedIADatabase = {
  getConnection: () => {
    throw new Error('[MockDatabase] getConnection unavailable — real DB not initialized');
  },
  initialize: async () => {
    log.warn('[MockDatabase] initialize called (real DB unavailable)');
    return Promise.resolve();
  },
  storePrompt: () => false,
  storePromptsBatch: () => 0,
  storeUserImage: () => null,
  findMatchingPrompts: () => [],
  storeVariation: () => false,
  getPromptsByBatchCategory: () => [],
  getPromptsByBatch: () => [],
  getStats: () => ({ prompts: 0, variations: 0, images: 0, content: 0, timestamp: new Date().toISOString() }),
  close: () => {
    log.info('[MockDatabase] close called');
  },
};

export const feedIADatabase: IFeedIADatabase = feedIADatabaseInstance ?? mockDatabase;
