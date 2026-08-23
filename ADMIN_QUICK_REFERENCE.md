# Admin Dashboard — Quick Reference

Fast reference for common admin operations.

## 🚀 Access

```
https://your-domain/admin
```

Enter admin key when prompted (stored in localStorage).

## 📊 Dashboard Pages

| Page | Purpose | Key Action |
|------|---------|-----------|
| **Overview** | System status at glance | Check quality score, error rate, warnings |
| **Agents** | Individual agent performance | Identify slow/error-prone agents |
| **Cache** | Cache hit rates, memory usage | Clear cache if hit rate < 70% |
| **Users** | Manage user accounts & tiers | Create test users, upgrade subscriptions |
| **Campaigns** | Campaign search & management | Trigger trends, view analytics |
| **Database** | DB schema, migrations, seeding | Run migrations, seed test data |
| **Alerts** | System alerts & incidents | Monitor critical alerts |
| **Logs** | Recent errors | Track error patterns |

## 🔧 Quick Operations

### Clear Cache
```
Cache tab → Clear Cache button
```
**When:** Hit rate drops below 70%
**Effect:** Immediate cache purge, slow API calls for 5 min, then recovery

### Create Test User
```
Users tab → Create User → Fill form → Submit
```
**Template:**
- Email: `test_YYYYMMDD@example.com`
- Tier: `pro` (for testing)
- Name: `QA Test User`

### Upgrade User Tier
```
Users tab → Upgrade Tier → Enter user ID & new tier
```
**Tiers:** `free` → `pro` → `enterprise`

### Run Database Migrations
```
Database tab → Run Migrations
```
**Purpose:** Update schema, create missing tables
**Risk:** Safe if no pending migrations

### Seed Test Data
```
Database tab → Seed Test Data
```
**Creates:** 3 test users with different tiers
**Use:** Before testing campaigns/features

### Check System Health
```
Overview tab → System Status card
```
**Status values:**
- 🟢 Healthy (< 5% errors)
- 🟡 Degraded (5-15% errors)
- 🔴 Down (> 15% errors)

### Restart Service
```
No UI button — requires API call
```
```bash
curl -X POST -H "X-Admin-Key: your-key" \
  https://your-domain/api/admin/restart-service
```

## 📈 Key Metrics

**Check Every Day:**

| Metric | Good | Alert | Action |
|--------|------|-------|--------|
| System Status | Healthy | Degraded | Check Logs tab |
| Error Rate | < 5% | > 10% | Review recent errors |
| Quality Score | > 80% | < 70% | Check agents, cache |
| Success Rate | > 90% | < 85% | Investigate failing agents |
| Cache Hit Rate | > 75% | < 60% | Clear cache, review prompts |
| Queue Pending | < 50 | > 100 | Check for stuck jobs |

## 🔍 Investigating Issues

### High Error Rate

1. **Go to Logs tab** → See recent errors
2. **Identify pattern:**
   - Same endpoint? → Check code
   - Same user? → Check permissions
   - Random? → Infrastructure issue
3. **Check Agents tab** → One agent failing?
4. **Decision:**
   - Code issue → Fix & deploy
   - Data issue → Fix & retry
   - Infra issue → Restart service

### Slow API Responses

1. **Check Agents tab** → Which agent slow?
2. **Check Cache tab** → Hit rate low?
   - Yes: Clear cache
   - No: Agent needs optimization
3. **Check Database status** → Connection OK?
   - No: Database issue
   - Yes: API call volume too high

### Database Connection Failed

1. **Go to Database tab** → Click "Get Status"
2. **Check PostgreSQL status:**
   - `disconnected` → Connection issue
   - `connected` → Schema issue
3. **Verify `DATABASE_URL` set:** `https://railway.app/project/xyz/variables`
4. **Run migrations:** Database tab → Run Migrations
5. **Restart service** if still failing

### Users Can't Upload Images

1. **Check Cache** → Embeddings cache hit rate
2. **Check Agents** → Check facial-identity-preservation agent
3. **Run:** Cache tab → Clear Cache
4. **Test:** Create test user, attempt upload

## 📋 Common Commands

### Health Check
```bash
curl -H "X-Admin-Key: key" https://domain/api/admin/health
```

### Get All Metrics
```bash
curl -H "X-Admin-Key: key" https://domain/api/admin/summary
```

### List Users (Search)
```bash
curl -H "X-Admin-Key: key" \
  'https://domain/api/admin/users?search=test@example.com&limit=20'
```

### Clear Specific Cache
```bash
curl -X POST -H "X-Admin-Key: key" \
  -d '{"type":"prompts"}' \
  https://domain/api/admin/cache/clear
```

### Get Database Status
```bash
curl -H "X-Admin-Key: key" \
  https://domain/api/admin/database-status
```

### Trigger Service Restart
```bash
curl -X POST -H "X-Admin-Key: key" \
  https://domain/api/admin/restart-service
```

## 🆘 Emergency Procedures

### System Down (All Endpoints Failing)

1. **Check server:** `curl https://domain/health`
2. **Check logs:** Railway dashboard → Logs tab
3. **Restart:** `POST /api/admin/restart-service`
4. **Still down?** Redeploy from git:
   ```bash
   git push origin main  # Railway auto-deploys
   ```

### Database Corruption

1. **Stop accepting requests** (take service down)
2. **Backup database** (if not auto-backed-up)
3. **Reset database** (⚠️ DESTRUCTIVE):
   ```bash
   curl -X POST -H "X-Admin-Key: key" \
     -d '{"confirm":"RESET_DB"}' \
     https://domain/api/admin/database-reset
   ```
4. **Run migrations:** Database tab → Run Migrations
5. **Seed test data:** Database tab → Seed Test Data
6. **Restart service** and bring back online

### Compromised Admin Key

1. **Generate new key:** `openssl rand -hex 32`
2. **Update env var:** Deployment platform settings
3. **Restart:** Service will use new key
4. **Old key no longer works** (good!)

### Cache Explosion (Out of Memory)

1. **Clear all caches:** Cache tab → Clear Cache
2. **Check sizes:** Logs will show pre/post sizes
3. **Implement cleanup:**
   - Reduce cache TTL (time-to-live)
   - Implement size caps
   - Clean up old entries

## 📊 Performance Tips

### Speed Up Dashboard
- Increase auto-refresh interval (config)
- Use Firefox/Chrome (fastest)
- Close other tabs (saves bandwidth)
- Clear browser cache if slow

### Speed Up API Calls
- Cache hit rate < 70%? Clear cache
- Check agent latencies on Agents tab
- Database queries slow? Verify indexes
- Rate limit hit? Wait before retrying

### Reduce API Costs
- Monitor prompt cache hit rate
- Keep cache hit rate > 80%
- Use test users instead of creating real users
- Batch operations together

## ⚙️ Configuration Quick Links

**Environment Variables:**
- `FEEDIA_ADMIN_KEY` — Admin access key
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis cache connection
- `ANTHROPIC_API_KEY` — Claude API key

**Set on:**
- Railway: Project Settings → Variables
- Vercel: Project Settings → Environment Variables
- Docker: `.env` file

## 🔒 Security Reminders

- ✅ Never share admin key
- ✅ Use HTTPS only (enforced on production)
- ✅ Rotate keys monthly
- ✅ Log out when done
- ✅ Monitor access logs
- ✅ Set up IP whitelisting if possible
- ✅ Use strong, random keys (`openssl rand -hex 32`)

## 📞 When to Escalate

Contact your system administrator if:
- Database won't reconnect after restart
- More than 50% of agents failing
- Error rate stays above 20% for 1+ hour
- Multiple critical alerts active
- Can't clear cache successfully
- Admin key access denied for known-good key

## 📚 Full Documentation

- [Admin Dashboard Full Guide](./ADMIN_DASHBOARD.md)
- [Setup Instructions](./ADMIN_SETUP.md)
- [API Reference](./ADMIN_DASHBOARD.md#-api-endpoints)
- [Troubleshooting Guide](./ADMIN_DASHBOARD.md#-troubleshooting)

---

**Last Updated:** 2026-01-15
**Version:** 1.0
