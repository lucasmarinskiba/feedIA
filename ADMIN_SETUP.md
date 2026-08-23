# Admin Dashboard Setup Guide

Complete setup instructions for deploying and configuring the FeedIA Admin Dashboard.

## Prerequisites

- Node.js 18+ running
- Express server configured and running on Railway or Vercel
- PostgreSQL database connection (optional but recommended)
- Redis connection (optional for caching)

## Installation Steps

### 1. Generate Admin Key

Generate a strong admin key using OpenSSL or similar:

```bash
# Generate 32-byte (256-bit) admin key
openssl rand -hex 32

# Output example:
# a3f7d8c2e9b4f1a6c8d3e7f2a5b9c1d4e8f1a2b3c4d5e6f7a8b9c0d1e2f3a4
```

Save this key securely. You'll need it to access the admin dashboard.

### 2. Set Environment Variables

Add to your `.env` or deployment platform's environment variables:

```bash
# Admin Dashboard
FEEDIA_ADMIN_KEY=your-generated-key-here

# Database (Required for operations)
DATABASE_URL=postgresql://user:password@host:5432/feedia

# Redis (Optional but recommended)
REDIS_URL=redis://user:password@host:6379

# Other required vars
NODE_ENV=production
PORT=3000
API_URL=https://your-domain.com
ANTHROPIC_API_KEY=sk-...
```

### 3. Verify Imports in Server

The admin routes should be imported and mounted in `src/server.ts`:

```typescript
import adminDashboardRoutes from './api/admin-dashboard-routes.js';
import adminOpsRoutes from './api/admin-ops-routes.js';

// Mount admin dashboard routes
app.use('/api/admin', adminKeyAuth, adminDashboardRoutes);
app.use('/api/admin', adminKeyAuth, adminOpsRoutes);

// Serve admin dashboard UI
app.get('/admin', adminKeyAuth, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'server', 'static', 'admin-dashboard.html'));
});
```

### 4. Verify Files Are in Place

Check that these files exist:

```bash
# Admin dashboard HTML UI
ls -la src/server/static/admin-dashboard.html

# Admin routes
ls -la src/api/admin-dashboard-routes.ts
ls -la src/api/admin-ops-routes.ts

# Auth middleware
ls -la src/middleware/auth.ts
```

### 5. Build and Deploy

```bash
# Build TypeScript
npm run build

# Test locally
npm start
# Dashboard should be accessible at http://localhost:3000/admin

# For Railway deployment
git add .
git commit -m "chore: add admin dashboard"
git push origin main
# Railway auto-deploys on push
```

### 6. Verify Deployment

Test the deployed admin dashboard:

```bash
# Verify API endpoint is working
curl -H "X-Admin-Key: your-admin-key" \
  https://your-railway-domain/api/admin/health

# You should get a JSON response with health data
{
  "status": "ok",
  "systemHealth": { ... },
  "agents": { ... }
}
```

## Usage

### First Login

1. Navigate to `https://your-domain/admin`
2. You'll be prompted for the admin key
3. Enter the key you generated in step 1
4. Click "Authenticate" (or just press Enter)
5. The key will be stored in `localStorage` for future sessions

### Dashboard Tours

#### Quick Overview Check (2 min)
1. Go to **Overview** tab
2. Check system status light (should be green)
3. Verify error rate < 5%
4. Spot any warnings at the bottom

#### Cache Optimization (5 min)
1. Go to **Cache** tab
2. Review hit rates for each cache type
3. If hit rate < 70%, consider clearing old entries
4. Click "Clear Cache" to optimize
5. Wait 5 minutes, check if hit rate improves

#### Add Test User (2 min)
1. Go to **Users** tab
2. Click "Create User" button
3. Fill in email, tier, name
4. Click "Create User"
5. Confirm in success toast notification

#### Monitor Agents (3 min)
1. Go to **Agents** tab
2. Look for agents with error rate > 5%
3. Note average latencies
4. Check if any agent is consistently slow

## Configuration

### Adjusting Auto-Refresh Rate

In `admin-dashboard.html`, find this line:

```javascript
// Auto-refresh
setInterval(() => {
  if (state.autoRefresh && state.connected) {
    // ... refresh logic
  }
}, 5000); // 5000ms = 5 seconds
```

Change `5000` to desired milliseconds:
- `3000` = 3 seconds (more aggressive)
- `10000` = 10 seconds (less frequent)
- `30000` = 30 seconds (minimal overhead)

### Customizing Dashboard Colors

Edit the CSS variables at the top of the `<style>` block:

```css
:root {
  --primary: #6366f1;        /* Main color */
  --success: #10b981;        /* Green */
  --warning: #f59e0b;        /* Orange */
  --danger: #ef4444;         /* Red */
  --bg-primary: #0f172a;     /* Dark background */
  --text-primary: #f1f5f9;   /* Light text */
}
```

## Security Hardening

### Enable HTTPS Only

Update your deployment platform settings:
- Railway: Enable "Automatic HTTPS"
- Vercel: Automatically enforces HTTPS

### Restrict Access by IP

For Railway, create a custom middleware:

```typescript
const adminIpWhitelist = ['203.0.113.0', '198.51.100.0'];

app.get('/admin', (req, res, next) => {
  const clientIp = req.ip;
  if (!adminIpWhitelist.includes(clientIp)) {
    return res.status(403).json({ error: 'IP not whitelisted' });
  }
  next();
});
```

### Implement Admin Activity Logging

Add this to `admin-ops-routes.ts`:

```typescript
import { auditLog } from '../services/audit-logger.js';

// After each operation
auditLog.record({
  action: 'cache_clear',
  adminKey: req.apiKeyHash,
  timestamp: new Date(),
  details: { cacheType: req.body?.type }
});
```

### Rotate Admin Keys Monthly

```bash
# 1. Generate new key
openssl rand -hex 32

# 2. Update environment variable
# (In your deployment platform)

# 3. Update FEEDIA_ADMIN_KEY

# 4. Deploy
git push origin main

# 5. Old key stops working (great for security)
```

## Monitoring

### Key Metrics to Track Daily

1. **System Status** — Should be "healthy"
2. **Error Rate** — Should be < 5%
3. **Success Rate** — Should be > 90%
4. **Cache Hit Rate** — Should be > 75%
5. **Queue Status** — Pending jobs should be < 50

### Set Up Alerts

Create alerts for:
- Error rate > 10%
- All agents having error rate > 5%
- Cache hit rate < 60%
- Any "Critical" recommendations
- Database connection failures

### Daily Checklist

- [ ] Check Overview page for warnings
- [ ] Monitor Agents for performance
- [ ] Review error logs for patterns
- [ ] Verify cache is being utilized
- [ ] Check database status

## Troubleshooting

### Admin Key Not Working

```bash
# Verify env var is set
echo $FEEDIA_ADMIN_KEY

# Test API directly
curl -H "X-Admin-Key: $FEEDIA_ADMIN_KEY" \
  https://your-domain/api/admin/health
```

If you get `401 Unauthorized`:
1. Check the key value matches exactly
2. Verify no extra spaces in the key
3. Ensure header is `X-Admin-Key` (case-sensitive)

### Dashboard HTML Not Loading

```bash
# Verify file exists
ls -la src/server/static/admin-dashboard.html

# Check file size (should be > 50KB)
wc -c src/server/static/admin-dashboard.html

# Rebuild and redeploy
npm run build
```

### API Endpoints Returning 500

1. Check server logs: `railway logs` or Vercel dashboard
2. Verify database connection with:
   ```bash
   curl -H "X-Admin-Key: $FEEDIA_ADMIN_KEY" \
     https://your-domain/api/admin/database-status
   ```
3. If database shows "disconnected":
   - Verify `DATABASE_URL` is correct
   - Check database server is running
   - Verify network connectivity

### Slow Dashboard Performance

1. **Increase refresh interval** (see Configuration above)
2. **Check browser console** for JavaScript errors:
   - Open DevTools (F12)
   - Go to Console tab
   - Look for red error messages
3. **Verify network speed**:
   - Open Network tab
   - Check if requests are timing out
   - Check response sizes

## Deployment Checklist

Before going to production:

- [ ] Generate strong admin key (`openssl rand -hex 32`)
- [ ] Set `FEEDIA_ADMIN_KEY` environment variable
- [ ] Set `FEEDIA_ADMIN_KEY` in `X-Admin-Key` header in tests
- [ ] Verify `/admin` endpoint responds with HTML
- [ ] Test `/api/admin/health` returns data
- [ ] Test user creation via admin API
- [ ] Test cache clearing
- [ ] Verify database migrations pass
- [ ] Set up monitoring/alerts
- [ ] Document admin key in secure location
- [ ] Set up daily admin log reviews
- [ ] Configure IP whitelisting if needed
- [ ] Enable HTTPS enforcement
- [ ] Test graceful shutdown signal

## Next Steps

1. **Read Full Documentation**: [ADMIN_DASHBOARD.md](./ADMIN_DASHBOARD.md)
2. **API Reference**: Review all available endpoints
3. **Security Guide**: Implement additional security measures
4. **Monitoring**: Set up alerts and tracking

## Support

For issues during setup:

1. Check `server.log` for errors
2. Verify all environment variables are set
3. Confirm database connection works
4. Check Redis connection (if using)
5. Review Recent Errors in admin dashboard

Contact your system administrator if issues persist.
