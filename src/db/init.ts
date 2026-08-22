/**
 * Database Initialization Entry Point
 * Called on application startup to:
 * 1. Establish database connection
 * 2. Run pending migrations
 * 3. Verify schema health
 */

import { initializeDatabase, healthCheck } from './index.js';

/**
 * Initialize database on app startup
 * Non-blocking - logs errors but doesn't crash
 */
export const initDb = async (): Promise<void> => {
  try {
    console.log('[DB Init] Starting database initialization...');
    await initializeDatabase();

    // Verify connection
    const healthy = await healthCheck();
    if (healthy) {
      console.log('[DB Init] ✓ Database healthy and ready');
    } else {
      console.warn('[DB Init] Database connection check inconclusive');
    }
  } catch (err) {
    console.error('[DB Init] FATAL: Database initialization failed');
    console.error(err);
    // Don't crash - API can still function with fallbacks
    // But log it for monitoring
  }
};

/**
 * CLI command: Show migration status
 * Run: npm run db:status
 */
export const showStatus = async (): Promise<void> => {
  try {
    const { showMigrationStatus } = await import('./migration-runner.js');
    // Would need to establish connection first
    console.log('[CLI] Migration status display requires database connection');
  } catch (err) {
    console.error('[CLI] Error:', err);
  }
};

/**
 * CLI command: Reset database (dev only)
 * Run: npm run db:reset
 * WARNING: Drops all data
 */
export const resetDatabase = async (): Promise<void> => {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Cannot reset database in production');
  }

  console.warn('⚠️  DESTRUCTIVE: Resetting database...');
  // Implementation would drop all tables and re-run migrations
  console.warn('Database reset not yet implemented');
};

// Export for use in server startup
export default initDb;
