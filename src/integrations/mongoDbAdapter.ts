/**
 * MongoDB Adapter — Persist carousel jobs to MongoDB Atlas.
 * Replaces /tmp temporary storage with permanent persistence.
 */

import type { CarouselJob } from '../capabilities/carouselDesigner/jobQueue.js';
import { log } from '../agent/logger.js';

const MONGODB_URI = process.env['MONGODB_URI'];
const DB_NAME = 'feedia';
const JOBS_COLLECTION = 'carousel_jobs';

let mongoClient: any = null;

/**
 * Initialize MongoDB connection (lazy-loaded on first use).
 */
const getDb = async (): Promise<any> => {
  if (!MONGODB_URI) {
    log.warn('[MongoDB] MONGODB_URI not set. Falling back to in-memory storage.');
    return null;
  }

  if (mongoClient) {
    return mongoClient.db(DB_NAME);
  }

  try {
    // Lazy load mongodb client
    const { MongoClient } = await import('mongodb');
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    log.info('[MongoDB] Connected to MongoDB Atlas');

    return mongoClient.db(DB_NAME);
  } catch (err) {
    log.error(`[MongoDB] Connection failed: ${(err as Error).message}`);
    return null;
  }
};

/**
 * Save job to MongoDB.
 */
export const saveJobToDb = async (job: CarouselJob): Promise<void> => {
  const db = await getDb();
  if (!db) return;

  try {
    const collection = db.collection(JOBS_COLLECTION);
    await collection.updateOne({ id: job.id }, { $set: job }, { upsert: true });
  } catch (err) {
    log.error(`[MongoDB] Save failed: ${(err as Error).message}`);
  }
};

/**
 * Load job from MongoDB.
 */
export const loadJobFromDb = async (jobId: string): Promise<CarouselJob | null> => {
  const db = await getDb();
  if (!db) return null;

  try {
    const collection = db.collection(JOBS_COLLECTION);
    const job = await collection.findOne({ id: jobId });
    return job ? (job as CarouselJob) : null;
  } catch (err) {
    log.error(`[MongoDB] Load failed: ${(err as Error).message}`);
    return null;
  }
};

/**
 * Delete old jobs (>7 days).
 */
export const deleteOldJobs = async (): Promise<number> => {
  const db = await getDb();
  if (!db) return 0;

  try {
    const collection = db.collection(JOBS_COLLECTION);
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await collection.deleteMany({
      createdAt: { $lt: cutoffDate.toISOString() },
    });

    log.info(`[MongoDB] Deleted ${result.deletedCount} old jobs`);
    return result.deletedCount;
  } catch (err) {
    log.error(`[MongoDB] Cleanup failed: ${(err as Error).message}`);
    return 0;
  }
};

/**
 * List all jobs (for monitoring).
 */
export const listJobsFromDb = async (limit: number = 100): Promise<CarouselJob[]> => {
  const db = await getDb();
  if (!db) return [];

  try {
    const collection = db.collection(JOBS_COLLECTION);
    const jobs = await collection
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return jobs as CarouselJob[];
  } catch (err) {
    log.error(`[MongoDB] List failed: ${(err as Error).message}`);
    return [];
  }
};

/**
 * Close MongoDB connection.
 */
export const closeMongoDbConnection = async (): Promise<void> => {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    log.info('[MongoDB] Connection closed');
  }
};

export const mongoDbAdapter = {
  saveJobToDb,
  loadJobFromDb,
  deleteOldJobs,
  listJobsFromDb,
  closeMongoDbConnection,
};
