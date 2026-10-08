import { log } from '../../agent/logger.js';
import { randomUUID } from 'crypto';

// Database client types (discriminated by isPostgres flag)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
let isPostgres = false;

const initDb = async (): Promise<void> => {
  try {
    if (process.env.DATABASE_URL?.includes('postgres')) {
      // PostgreSQL
      const { Pool } = await import('pg');
      db = new Pool({ connectionString: process.env.DATABASE_URL });
      isPostgres = true;
      log.info('[db] PostgreSQL pool initialized');
    } else if (process.env.MONGODB_URL) {
      // MongoDB
      const { MongoClient } = await import('mongodb');
      const client = new MongoClient(process.env.MONGODB_URL);
      db = client.db('forge_ia');
      log.info('[db] MongoDB client initialized');
    } else {
      log.warn('[db] No database configured (DATABASE_URL or MONGODB_URL missing)');
    }
  } catch (err) {
    log.error('[db] Database initialization failed', { error: err instanceof Error ? err.message : String(err) });
  }
};

// Initialize on import
initDb().catch((err) => log.error('[db] Init error', { error: String(err) }));

interface User {
  id: string;
  email: string;
  password_hash: string;
  tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

const generateId = (): string => randomUUID();

const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export class UserQueries {
  // CREATE user on signup
  async createUser(email: string, passwordHash: string): Promise<User | null> {
    try {
      if (!db) {
        log.warn('[db] No database configured, using mock');
        const mockUser: User = {
          id: `user_${Date.now()}`,
          email,
          password_hash: passwordHash,
          tier: 'free',
          created_at: new Date().toISOString(),
        };
        return mockUser;
      }

      const userId = generateId();
      const createdAt = new Date().toISOString();

      if (isPostgres) {
        const result = await db.query(
          'INSERT INTO users (id, email, password_hash, tier, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, email, passwordHash, 'free', createdAt],
        );
        log.info('[db] user created (postgres)', { email, userId });
        return result.rows[0];
      } else {
        // MongoDB
        const user: User = {
          id: userId,
          email,
          password_hash: passwordHash,
          tier: 'free',
          created_at: createdAt,
        };
        await db.collection('users').insertOne({ _id: userId, ...user });
        log.info('[db] user created (mongodb)', { email, userId });
        return user;
      }
    } catch (err) {
      log.error('[db] createUser failed', { error: err instanceof Error ? err.message : String(err), email });
      return null;
    }
  }

  // READ user by email (for login)
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      if (!db) {
        log.warn('[db] No database configured');
        return null;
      }

      if (isPostgres) {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (user) {
          log.info('[db] user fetched by email (postgres)', { email, userId: user.id });
        }
        return user || null;
      } else {
        // MongoDB
        const user = await db.collection('users').findOne({ email });
        if (user) {
          log.info('[db] user fetched by email (mongodb)', { email, userId: user._id });
          return { ...user, id: user._id };
        }
        return null;
      }
    } catch (err) {
      log.error('[db] getUserByEmail failed', { error: err instanceof Error ? err.message : String(err), email });
      return null;
    }
  }

  // UPDATE user tier (on successful payment)
  async upgradeTier(userId: string, tier: 'pro' | 'enterprise', stripeCustomerId: string): Promise<boolean> {
    try {
      if (!db) {
        log.warn('[db] No database configured');
        return true; // mock success
      }

      const updatedAt = new Date().toISOString();

      if (isPostgres) {
        await db.query('UPDATE users SET tier = $1, stripe_customer_id = $2, updated_at = $3 WHERE id = $4', [
          tier,
          stripeCustomerId,
          updatedAt,
          userId,
        ]);
      } else {
        // MongoDB
        await db
          .collection('users')
          .updateOne({ _id: userId }, { $set: { tier, stripe_customer_id: stripeCustomerId, updated_at: updatedAt } });
      }

      log.info('[db] user tier upgraded', { userId, tier, stripeCustomerId });
      return true;
    } catch (err) {
      log.error('[db] upgradeTier failed', { error: err instanceof Error ? err.message : String(err), userId });
      return false;
    }
  }

  // CREATE session
  async createSession(userId: string, token: string, expiresAt: string): Promise<boolean> {
    try {
      if (!db) {
        log.warn('[db] No database configured');
        return true;
      }

      const sessionId = generateId();

      if (isPostgres) {
        await db.query('INSERT INTO user_sessions (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)', [
          sessionId,
          userId,
          token,
          expiresAt,
        ]);
      } else {
        // MongoDB
        await db.collection('user_sessions').insertOne({
          _id: sessionId,
          user_id: userId,
          token,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        });
      }

      log.info('[db] session created', { userId });
      return true;
    } catch (err) {
      log.error('[db] createSession failed', { error: err instanceof Error ? err.message : String(err), userId });
      return false;
    }
  }

  // CHECK tier usage
  async checkTierUsage(userId: string, feature: string, limit: number): Promise<boolean> {
    try {
      if (!db) {
        return true; // mock: allow
      }

      const month = getCurrentMonth();

      if (isPostgres) {
        const result = await db.query('SELECT analysis_count FROM user_tier_usage WHERE user_id = $1 AND month = $2', [
          userId,
          month,
        ]);
        const count = result.rows[0]?.analysis_count || 0;
        return count < limit;
      } else {
        // MongoDB
        const usage = await db.collection('user_tier_usage').findOne({ user_id: userId, month });
        const count = (usage as Record<string, unknown>)?.analysis_count || 0;
        return (count as number) < limit;
      }
    } catch (err) {
      log.error('[db] checkTierUsage failed', { error: err instanceof Error ? err.message : String(err), userId });
      return true; // fail open
    }
  }

  // INCREMENT usage counter
  async incrementUsage(userId: string, feature: string): Promise<void> {
    try {
      if (!db) return;

      const month = getCurrentMonth();

      if (isPostgres) {
        await db.query(
          `INSERT INTO user_tier_usage (user_id, month, analysis_count)
           VALUES ($1, $2, 1)
           ON CONFLICT (user_id, month) DO UPDATE SET analysis_count = analysis_count + 1`,
          [userId, month],
        );
      } else {
        // MongoDB
        await db
          .collection('user_tier_usage')
          .updateOne({ user_id: userId, month }, { $inc: { analysis_count: 1 } }, { upsert: true });
      }

      log.info('[db] usage incremented', { userId, feature });
    } catch (err) {
      log.error('[db] incrementUsage failed', { error: err instanceof Error ? err.message : String(err), userId });
    }
  }
}

export const userQueries = new UserQueries();
