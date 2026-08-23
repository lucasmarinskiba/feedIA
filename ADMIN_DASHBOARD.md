# FeedIA Admin Dashboard

A comprehensive web-based administration interface for monitoring, managing, and operating the FeedIA system. Features real-time metrics, user management, database operations, and system configuration.

## 🚀 Quick Start

### Access the Dashboard

```
https://<your-domain>/admin
```

You'll be prompted for an admin key. This key is stored in `localStorage` and persists across sessions.

### Admin Key Setup

Set the admin key via environment variable:

```bash
export FEEDIA_ADMIN_KEY=your-secure-admin-key-here
```

For development, you can also hardcode it during login prompt. In production, use secure key management (secrets manager, environment variables, etc.).

## 📋 Dashboard Pages

### 1. **Overview** 📊
Main dashboard with system status at a glance.

**Metrics Displayed:**
- System Status (Healthy/Degraded/Down)
- Quality Score (%)
- Success Rate (%)
- Error Rate (%)
- Total Prompts Generated
- Content Generated Count
- Active Agents
- Queue Status (Pending/Processing/Completed)
- Cache Hit Rates (Prompts & Content)
- System Warnings & Alerts

**Features:**
- Auto-refresh every 5 seconds
- Real-time connection status
- Warning indicators for degraded performance

### 2. **Agents** 🤖
Detailed metrics for each AI agent specialization.

**Metrics per Agent:**
- Agent ID & Specialization
- Tasks Completed
- Success Rate
- Error Rate
- Average Latency (ms)

**Use Cases:**
- Monitor individual agent performance
- Identify bottlenecks
- Compare specialization effectiveness
- Spot failure patterns

### 3. **Cache** ⚡
Monitor and manage all cache layers.

**Cache Types:**
- Prompts Cache
- Content Cache
- Validation Cache
- Embeddings Cache

**Operations:**
- View hit rates per cache type
- Clear all caches (one-click)
- Total cache size monitoring
- Individual cache statistics (hits, misses, size)

**Benefits:**
- Optimize API call reduction
- Monitor cache efficiency
- Troubleshoot cache-related issues

### 4. **Users** 👥
User management and subscription tier control.

**Features:**
- Search users by email
- View subscription tier
- Manual tier upgrades
- Create test users
- User creation date tracking
- Account status management

**Tier Levels:**
- `free` — Basic access
- `pro` — Premium features
- `enterprise` — Full access + priority support

**Create Test User Modal:**
```
Email:     test@example.com
Tier:      pro
Name:      Test User (optional)
```

### 5. **Campaigns** 📱
Campaign management and analytics access.

**Features:**
- Search campaigns by ID/name
- View campaign status
- Campaign creation/update dates
- Trigger trend detection
- View campaign analytics
- Campaign metadata

**Status Values:**
- `active` — Running/generating content
- `paused` — Temporarily stopped
- `archived` — Completed/archived
- `failed` — Needs attention

### 6. **Database** 🗄️
Database administration and data management.

**Quick Actions:**
- **Run Migrations** — Execute pending schema migrations
- **Seed Test Data** — Create sample users/campaigns for testing
- **Get Status** — View database connection & stats
- **Reset DB** (⚠️ Destructive) — Clear all tables (requires confirmation)

**Database Information:**
- Connection status (PostgreSQL, MongoDB, Redis)
- Schema version
- Table row counts
- Migration history
- Environment configuration

### 7. **Alerts** 🔔
System alerts and incident management.

**Tabs:**
- **Active Alerts** — Current issues/warnings
- **Alert History** — Past alerts with resolution status

**Alert Types:**
- 🔴 Critical — System down/severe errors
- 🟠 High — Performance degradation
- 🟡 Medium — Minor issues
- 🟢 Low — Informational

**Actions:**
- Silence individual alerts
- Silence all alerts
- View alert details
- Track alert resolution time

### 8. **Logs** 📜
Error logs and request tracking.

**Displays:**
- Last 50 errors with full context
- Timestamp of each error
- HTTP method & path
- Status code
- Error message/stack trace
- User ID (if applicable)

**Log Fields:**
- Error ID
- Timestamp
- Method (GET/POST/PUT/DELETE)
- Path
- HTTP Status
- Error Message

## 🔌 API Endpoints

All admin endpoints require `X-Admin-Key` header:

```bash
curl -H "X-Admin-Key: your-admin-key" https://your-domain/api/admin/health
```

### Monitoring Endpoints

#### GET `/api/admin/health`
System health report with agent metrics and queue status.

**Response:**
```json
{
  "status": "ok",
  "systemHealth": {
    "status": "healthy",
    "summary": {
      "Success Rate": 94.2,
      "Error Rate": 2.1,
      "Avg Quality Score": 87.5
    }
  },
  "agents": {
    "total": 6,
    "avgSuccessRate": 93.4,
    "avgLatency": 2450
  },
  "queue": {
    "queued": 12,
    "active": 3,
    "completed": 1250
  }
}
```

#### GET `/api/admin/infra`
External infrastructure health (Redis, Supabase, etc).

**Response:**
```json
{
  "ok": true,
  "checks": {
    "redis": { "status": "ok", "latencyMs": 2 },
    "supabase": { "status": "ok", "latencyMs": 45 }
  },
  "notes": {}
}
```

#### GET `/api/admin/agents`
Detailed metrics per agent.

**Response:**
```json
{
  "status": "ok",
  "agentCount": 6,
  "agents": [
    {
      "id": "art-director-1",
      "specialization": "art_direction",
      "tasksCompleted": 450,
      "successRate": "94.2%",
      "errorRate": "1.3%",
      "avgLatency": "2340ms"
    }
  ]
}
```

#### GET `/api/admin/cache`
Cache performance metrics for all cache types.

**Response:**
```json
{
  "status": "ok",
  "overallHitRate": "82.3",
  "caches": {
    "prompts": {
      "hits": 4250,
      "misses": 920,
      "hitRate": 82.2,
      "size": 15728640
    },
    "content": {
      "hits": 3120,
      "misses": 580,
      "hitRate": 84.3,
      "size": 8388608
    }
  },
  "totalSize": 24117248
}
```

#### GET `/api/admin/errors?limit=50`
Recent errors and exceptions.

**Query Params:**
- `limit` — Max errors to return (default: 20, max: 100)

**Response:**
```json
{
  "status": "ok",
  "errorCount": 50,
  "errors": [
    {
      "id": "err_123abc",
      "timestamp": "2026-01-15T14:30:25.123Z",
      "method": "POST",
      "path": "/api/content/generate",
      "status": 500,
      "message": "Claude API timeout",
      "userId": "user_456"
    }
  ]
}
```

#### GET `/api/admin/trends?window=60`
Metrics trends over time.

**Query Params:**
- `window` — Time window in minutes (default: 60)

**Response:**
```json
{
  "status": "ok",
  "trends": {
    "timestamp": ["14:00", "14:05", "14:10"],
    "errorRate": [1.2, 1.5, 1.3],
    "successRate": [94.5, 94.2, 94.4],
    "avgLatency": [2340, 2450, 2380]
  }
}
```

#### GET `/api/admin/summary`
Executive summary combining all metrics.

**Response:**
```json
{
  "status": "ok",
  "executive_summary": {
    "systemStatus": "healthy",
    "qualityScore": 87.5,
    "successRate": 94.2,
    "errorRate": 2.1,
    "totalPrompts": 352840,
    "contentGenerated": 28320
  },
  "agents": {
    "active": 6,
    "avgSuccessRate": "93.4%"
  },
  "queue": {
    "pending": 12,
    "processing": 3,
    "completed": 1250
  }
}
```

#### GET `/api/admin/recommendations`
AI-generated optimization recommendations.

**Response:**
```json
{
  "status": "ok",
  "recommendationCount": 5,
  "critical": 0,
  "high": 1,
  "recommendations": [
    {
      "id": "rec_001",
      "severity": "high",
      "title": "Cache Hit Rate Low",
      "description": "Prompt cache hit rate dropped to 78%",
      "action": "Consider increasing cache size or TTL",
      "impact": "Could reduce API costs by 15%"
    }
  ]
}
```

### Management Endpoints

#### POST `/api/admin/create-user`
Create a test user.

**Body:**
```json
{
  "email": "test@example.com",
  "name": "Test User",
  "tier": "pro"
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "User created successfully",
  "user": {
    "id": "user_1234567890",
    "email": "test@example.com",
    "name": "Test User",
    "tier": "pro",
    "createdAt": "2026-01-15T14:30:00Z"
  }
}
```

#### POST `/api/admin/upgrade-tier`
Upgrade a user's subscription tier.

**Body:**
```json
{
  "userId": "user_123",
  "newTier": "enterprise"
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "User tier upgraded successfully",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "tier": "enterprise"
  }
}
```

#### GET `/api/admin/users?search=email&limit=20&offset=0`
List users with search and pagination.

**Query Params:**
- `search` — Search by email or name
- `limit` — Results per page (default: 20, max: 100)
- `offset` — Pagination offset (default: 0)

**Response:**
```json
{
  "status": "ok",
  "users": [
    {
      "id": "user_1",
      "email": "user1@example.com",
      "name": "User One",
      "tier": "pro",
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ],
  "limit": 20,
  "offset": 0,
  "total": 150
}
```

### Operations Endpoints

#### POST `/api/admin/cache/clear`
Clear all caches or specific cache type.

**Body (Optional):**
```json
{
  "type": "all"
}
```

**Supported Types:**
- `all` — Clear all caches (default)
- `prompts` — Clear prompt cache only
- `content` — Clear content cache only
- `validation` — Clear validation cache only
- `embeddings` — Clear embeddings cache only

**Response:**
```json
{
  "status": "ok",
  "message": "Cleared all cache(s)",
  "stats": {
    "prompts": { "before": 15728640, "after": 0 },
    "content": { "before": 8388608, "after": 0 }
  }
}
```

#### GET `/api/admin/database-status`
Database connection status and statistics.

**Response:**
```json
{
  "status": "ok",
  "database": {
    "mongodb": {
      "status": "connected",
      "stats": {
        "prompts": 28320,
        "variations": 324520,
        "content": 42150
      }
    },
    "postgresql": {
      "status": "connected",
      "url": "configured"
    },
    "redis": {
      "status": "configured"
    }
  }
}
```

#### POST `/api/admin/migrate`
Run pending database migrations.

**Response:**
```json
{
  "status": "ok",
  "message": "Migrations completed",
  "migrationsRun": 3,
  "tablesCreated": ["users", "campaigns", "analytics"],
  "timestamp": "2026-01-15T14:30:00Z"
}
```

#### POST `/api/admin/seed`
Seed database with test data.

**Response:**
```json
{
  "status": "ok",
  "message": "Test data seeded successfully",
  "itemsCreated": 3,
  "timestamp": "2026-01-15T14:30:00Z"
}
```

#### POST `/api/admin/database-reset`
⚠️ **DESTRUCTIVE** — Reset entire database.

**Body:**
```json
{
  "confirm": "RESET_DB"
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "Database reset completed",
  "warning": "All data has been deleted",
  "timestamp": "2026-01-15T14:30:00Z"
}
```

### Configuration Endpoints

#### GET `/api/admin/config`
Current system configuration.

**Response:**
```json
{
  "status": "ok",
  "config": {
    "environment": "production",
    "port": 3000,
    "features": {
      "redis": true,
      "postgresql": true,
      "anthropic": true
    }
  }
}
```

#### POST `/api/admin/restart-service`
Graceful service restart.

**Response:**
```json
{
  "status": "ok",
  "message": "Restart signal sent",
  "gracefulShutdown": true,
  "estimatedRestartTime": "10-30 seconds"
}
```

## 🔐 Security

### Authentication

1. **Admin Key Required** — All admin endpoints require `X-Admin-Key` header
2. **Timing-Safe Comparison** — Keys compared using timing-safe functions (prevents timing oracle attacks)
3. **No Key Logging** — Full keys never logged; only SHA-256 hash prefix
4. **Environment Variables** — Keep `FEEDIA_ADMIN_KEY` in secure secret manager

### Best Practices

1. **Use Strong Keys** — Generate with:
   ```bash
   openssl rand -hex 32
   ```

2. **Rotate Keys Regularly** — Change admin key every 90 days

3. **Restrict Access** — Use firewalls/VPN to limit access to `/admin` routes

4. **Audit Logging** — All admin operations are logged with timestamps and details

5. **Monitor Access** — Set up alerts for repeated failed authentication attempts

## 🔧 Configuration

### Environment Variables

```bash
# Admin key for /admin/* endpoints
FEEDIA_ADMIN_KEY=your-secure-key-here

# Database connections
DATABASE_URL=postgresql://user:pass@host/db
REDIS_URL=redis://user:pass@host:6379

# API configuration
NODE_ENV=production
PORT=3000
API_URL=https://your-domain.com
```

### Session Persistence

Admin key is stored in browser `localStorage`:
- Persists across page refreshes
- Cleared on manual logout
- Use incognito mode to avoid storage

## 📊 Performance Considerations

### Auto-Refresh Rate
- Default: 5 seconds
- Configurable in dashboard code
- Can be disabled via toggle

### API Rate Limits
- Enforced per admin key
- Default: 100 req/min
- Contact support for higher limits

### Cache Clearing
- Avoid clearing during peak traffic
- Each clear reduces cache hit rate temporarily
- Cache regenerates automatically

## 🚨 Troubleshooting

### Access Denied (403)

```
Error: Admin access required
```

**Solution:** Verify admin key in header:
```bash
curl -H "X-Admin-Key: $(cat ~/.admin-key)" https://your-domain/api/admin/health
```

### Connection Timeout

```
Error: API call timed out
```

**Solution:**
1. Check network connectivity
2. Verify API is running (`/health` endpoint)
3. Check database connection status
4. Review recent error logs

### Database Connection Failed

```
PostgreSQL: Error connecting
```

**Solution:**
1. Verify `DATABASE_URL` environment variable
2. Check network access to database host
3. Verify database credentials
4. Run migrations: `/api/admin/migrate`

### Cache Not Clearing

**Solution:**
1. Check cache size in Cache page
2. Verify admin key has proper permissions
3. Manually trigger: `POST /api/admin/cache/clear`
4. Restart service if needed

## 📞 Support

For issues or questions:

1. Check error logs in Logs tab
2. Review system health on Overview tab
3. Check recent errors for patterns
4. Contact system administrator

## 📚 Further Reading

- [FeedIA Documentation](./README.md)
- [API Reference](./API.md)
- [Database Schema](./DATABASE.md)
- [Security Guide](./SECURITY.md)
