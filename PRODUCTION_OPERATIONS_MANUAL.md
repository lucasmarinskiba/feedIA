# 📖 FeedIA Production Operations Manual
# Complete guide for running, monitoring, and scaling FeedIA in production

## Table of Contents

1. [Deployment & Verification](#deployment--verification)
2. [Monitoring & Alerting](#monitoring--alerting)
3. [Troubleshooting](#troubleshooting)
4. [Incident Response](#incident-response)
5. [Performance & Scaling](#performance--scaling)
6. [Security & Compliance](#security--compliance)
7. [Maintenance & Updates](#maintenance--updates)

---

## Deployment & Verification

### Pre-Deployment Checklist

- [ ] All code committed to main branch
- [ ] CI pipeline passed (lint, type-check, build, test)
- [ ] Code reviewed by peer engineer
- [ ] Database migrations tested locally
- [ ] Environment variables set on Railway
- [ ] Backup of production database triggered
- [ ] Team notified in #ops-deployments Slack channel
- [ ] Rollback plan documented

### Deployment Flow (5 min)

```bash
# 1. Tag release
git tag -a v1.0.5 -m "Feature: Add userId extraction for Tier 5-15"
git push origin v1.0.5

# 2. GitHub Actions triggers automatically
# - Runs: lint → type-check → build → test → security scan
# - Deploys to production on Railway
# - Runs health checks (10 retries)
# - Auto-rollback if health checks fail

# 3. Monitor deployment
# Railway dashboard: Deployments tab
# GitHub Actions: Actions tab
```

### Post-Deployment Validation (10 min)

```bash
# Health check
curl https://web-production-fa7b5.up.railway.app/health
# Expected: {"status":"ok","postgres":"connected","redis":"connected"}

# Bootstrap endpoint (validates all systems)
curl -X POST -H "X-API-Key: $ADMIN_KEY" \
  https://web-production-fa7b5.up.railway.app/api/admin/bootstrap
# Expected: 200 with detailed status JSON

# Admin dashboard
# Open: https://web-production-fa7b5.up.railway.app/admin
# Verify: Request count > 0, error rate = 0%, no red alerts

# Monitoring summary
curl https://web-production-fa7b5.up.railway.app/api/monitoring/summary
# Expected: CPU < 50%, Memory < 500MB, P95 latency < 200ms
```

---

## Monitoring & Alerting

### Key Metrics (Check Every 5 min During Deployment)

| Metric | Target | Yellow | Red |
|--------|--------|--------|-----|
| HTTP 200 Rate | > 95% | < 90% | < 80% |
| Error Rate (5xx) | < 1% | 1-5% | > 5% |
| P95 Latency | < 300ms | 300-1000ms | > 1000ms |
| Cache Hit Rate | 60-80% | 40-60% | < 40% |
| CPU Usage | < 50% | 50-80% | > 80% |
| Memory Usage | < 400MB | 400-800MB | > 800MB |

### Live Dashboards

1. **Admin Dashboard** (real-time, 5s refresh)
   - URL: https://web-production-fa7b5.up.railway.app/admin
   - Auth: X-API-Key header (FEEDIA_ADMIN_KEY)
   - Shows: metrics, users, logs, alerts, cache status

2. **Monitoring Summary**
   - URL: /api/monitoring/summary
   - Content: CPU, memory, error rate, request count, latency percentiles

3. **Railway Dashboard**
   - URL: https://railway.app (web service metrics)
   - Shows: CPU/memory trends, network I/O, deployment history

4. **Sentry** (error tracking)
   - URL: https://sentry.io (if configured)
   - Shows: 5xx errors, exceptions, error trends

### Alert Rules

**🔴 CRITICAL** (Page on-call immediately)
- Health check fails 3+ times in 1 min → Likely database/Redis down
- Error rate > 10% for 5 min → Major production issue
- CPU > 90% for 5 min → Resource exhaustion or runaway process

**🟠 HIGH** (Notify team, monitor)
- Error rate 5-10% for 5 min → Degradation
- P95 latency > 1s for 10 min → Performance issue
- Cache hit rate < 40% for 15 min → Cache problem

---

## Troubleshooting

### Service Returns 500 Errors

**Step 1: Check database connection**
```bash
curl https://web-production-fa7b5.up.railway.app/health
# If postgres:disconnected → restart database or check connection string
```

**Step 2: Check logs**
```bash
railway logs
# Look for: "Cannot connect to PostgreSQL", "pool connection limit", "syntax error"
```

**Step 3: Check recently deployed code**
```bash
git log --oneline -5
# If recent change looks suspicious, rollback:
git tag -a v1.0.4-rollback -m "Rollback from 1.0.5"
git push origin v1.0.4-rollback
```

**Step 4: Restart service**
```bash
# Railway dashboard → web service → Restart
```

### High Response Times (P95 > 1s)

**Diagnosis**
```bash
# Check database query performance
railway database shell
SELECT query, calls, mean_time FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

# Check cache hit rate
curl https://web-production-fa7b5.up.railway.app/api/monitoring/summary | grep cache_hit_rate
```

**Common Causes & Fixes**
- Missing index: `CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);`
- Low cache hit rate: Check Redis connection, clear corrupted cache
- N+1 query: Review recent code changes, profile with APM

### Rate Limiting Spike (429 Errors)

**Check source**
```bash
curl https://web-production-fa7b5.up.railway.app/metrics | grep rate_limit_rejected
# If > 100/min: check for DDoS or client bug
```

**Temporary fix**
```bash
curl -X POST -H "X-API-Key: $ADMIN_KEY" \
  https://web-production-fa7b5.up.railway.app/api/admin/cache/clear
# Clears rate-limit buckets
```

**Permanent fix**
- If DDoS: Update CORS whitelist or IP allowlist
- If client bug: Contact customer, provide rate-limit docs

---

## Incident Response

### Incident Severity Levels

| Level | Example | Response | Resolve By |
|-------|---------|----------|-----------|
| SEV1 | Down (0% availability) | Page on-call | 15 min |
| SEV2 | Degraded (error rate > 5%) | Notify team | 1 hour |
| SEV3 | Warning (metric threshold) | Log ticket | 4 hours |

### SEV1: Service Down (0% availability)

**Timeline: 5 min total**
1. **0-1 min**: Alert fires → Page on-call engineer
2. **1-2 min**: Check `/health` endpoint
   - If down: Database or Redis unreachable
   - Fix: Restart service or restart database
3. **2-3 min**: Verify fix (health check returns 200)
4. **3-5 min**: Run post-incident checks, document root cause

### SEV2: Degradation (Error Rate > 5%)

**Timeline: 15 min total**
1. **0-2 min**: Alert fires → Check Sentry for error patterns
2. **2-5 min**: Identify error type
   - All endpoints failing: Check auth middleware
   - One endpoint failing: Check that endpoint's code
   - Database errors: Check connection pool
3. **5-10 min**: Apply fix or rollback
4. **10-15 min**: Verify recovery, document root cause

### Post-Incident Checklist

After every SEV1/SEV2 incident:
- [ ] Root cause identified
- [ ] Fix deployed and verified
- [ ] Incident documented in ticket system
- [ ] Team debriefing scheduled
- [ ] Preventive measure identified (monitoring, test, etc.)
- [ ] Monitoring alert refined to catch earlier

---

## Performance & Scaling

### Current Capacity

- **Throughput**: 20-50 req/sec (current), 500+ req/sec (max)
- **Latency**: P95 = 75-200ms (after optimization), P99 = 300ms
- **Concurrency**: 200 concurrent users
- **Data**: 10GB PostgreSQL, 6.5GB Redis

### When to Scale

**Vertical Scaling (bigger instance)**
- CPU consistently > 70%
- Memory consistently > 80%
- Can handle with single larger instance (cost-effective up to 2x)

**Horizontal Scaling (multiple instances)**
- CPU needs > 3x more power
- Need zero-downtime deployments
- Add load balancer + multiple Railway services
- Ensure: Database connection pool sized for multiple instances

### Optimization Checklist

- [ ] All indexes present (18 strategic indexes from performance-tuning)
- [ ] Cache hit rate > 60% (check /api/monitoring/summary)
- [ ] No N+1 queries (check pg_stat_statements)
- [ ] Connection pool sized correctly (10-20 per instance)
- [ ] Slow queries identified and indexed (query_ms > 200)

---

## Security & Compliance

### Authentication

- **API Key Format**: Random 32-byte hex (generated via `openssl rand -hex 16`)
- **Header**: `X-API-Key` or `Authorization: Bearer <key>`
- **Timing-safe comparison**: Used in auth middleware (prevents timing oracle)
- **Logging**: Only first 12 chars of hash logged (never full key)

### Authorization

- **Tier Enforcement**: Tier-1 ≤ 1 campaign, Tier-8 ≤ 6, Tier-14+ unlimited
- **Campaign limits**: Enforced via middleware before database operations
- **Budget limits**: Tracked via billing-manager service, blocks operations if exceeded

### Data Security

- **Encryption in transit**: TLS 1.2+ (HSTS header enabled)
- **Encryption at rest**: PostgreSQL SSL required
- **Secrets management**: All keys in environment variables only
- **Audit logging**: All admin operations logged (user_id, action, timestamp)

### Compliance Checklist

- [ ] API keys rotated monthly
- [ ] Audit logs backed up weekly
- [ ] GDPR: Data export endpoint implemented (/api/admin/user/:id/export)
- [ ] GDPR: Data deletion endpoint implemented (/api/admin/user/:id/delete)
- [ ] SOC 2: Monitoring + alerting enabled
- [ ] HIPAA (if applicable): Encryption + audit logs

---

## Maintenance & Updates

### Weekly Maintenance

- **Monday 2 AM UTC**: Automated VACUUM ANALYZE (compacts PostgreSQL)
- **Every night 2 AM UTC**: Automated database backup
- **Manual**: Review slow query logs, identify missing indexes

### Monthly Maintenance

- **First Monday**: Rotate API keys for service accounts
- **Mid-month**: Review Sentry error trends, fix top 3 errors
- **End of month**: Capacity planning review (storage, bandwidth, compute)

### Dependency Updates

- **Security patches**: Applied within 24 hours
- **Minor updates**: Tested in staging, deployed within 1 week
- **Major updates**: Comprehensive testing, deployed with feature flag

### Backup & Recovery

- **Database backups**: Daily, 7-day retention
- **Redis persistence**: Enabled, AOF format
- **Recovery test**: Monthly restore drill to staging

---

## Contact & Escalation

**On-Call Engineer**: [Slack: #ops-incidents]
**Database SRE**: [Slack: @database-team]
**Security Lead**: [Slack: @security-team]

---

## Appendix

### Useful Commands

```bash
# SSH to Railway
railway shell

# View logs real-time
railway logs -f

# Check environment variables
railway env

# Restart service
railway services:restart

# Trigger database backup
railway database backup

# Connect to PostgreSQL
railway database shell

# View metrics
curl https://app/metrics | head -50
```

### Performance Benchmarks (Post-Optimization)

| Endpoint | Baseline | Optimized | Improvement |
|----------|----------|-----------|-------------|
| /api/trends/detect | 350ms | 50ms | 7x faster |
| /api/roi/calculate | 400ms | 350ms | 1.1x faster |
| /api/abtest/:id/results | 500ms | 75ms | 6.7x faster |
| /api/audience/segments | 200ms | 30ms | 6.7x faster |

---

**Last Updated**: 2026-08-23
**Version**: 1.0-production
**Status**: ✅ PRODUCTION READY
