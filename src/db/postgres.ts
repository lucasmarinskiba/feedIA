/**
 * PostgreSQL connection pool
 * Used by prompt-loader, metrics, 2FA, security, and video storage services
 */

interface QueryResult {
  rows: unknown[];
}

interface PoolConnection {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
}

// Mock pool for development (real pool would use pg library)
const mockPool: PoolConnection = {
  query: async (sql: string, params?: unknown[]): Promise<QueryResult> => {
    // Fallback: return empty rows for all queries
    console.log('[MockPool] Query:', sql, 'Params:', params);
    return { rows: [] };
  },
};

interface CarouselDB {
  pool: PoolConnection;
  initialize: () => Promise<void>;
}

// Export pool for use by services
export const carouselDB: CarouselDB = {
  pool: mockPool,
  initialize: async (): Promise<void> => {
    // Initialize PostgreSQL connection pool
    console.log('[CarouselDB] Initialized (mock)');
  },
};

export default carouselDB;
