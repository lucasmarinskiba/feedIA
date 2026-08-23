# FeedIA Operational Runbook

## Incident Response

### High Error Rate (5xx > 5%)

**Diagnosis**: Check /health endpoint, check railway logs

**Fix**:
1. Restart web service (Railway UI → Deploy → Restart)
2. Restart Redis cluster if disconnected
3. Check recent code changes, rollback if needed
4. Monitor /metrics for error rate drop

### Rate Limit Spike (429)

**Causes**: DDoS, client bug, legitimate surge

**Fix**:
1. Check /metrics for top IP addresses
2. Update CORS whitelist or rate limit if needed
3. Clear Redis rate-limit buckets

### Slow Queries (P95 > 1s)

**Diagnosis**: Check /metrics for latency_ms

**Fix**:
1. Check PostgreSQL slow query log
2. Add missing indexes if needed
3. Check cache hit rate (target > 60%)

### Database Connection Pool Exhaustion

**Symptoms**: "connect ECONNREFUSED"

**Fix**:
1. Kill long-running queries
2. Increase pool size in src/db/client.ts
3. Restart service

### Out Of Memory Crash

**Symptoms**: Service restarts repeatedly

**Fix**:
1. Check memory usage on Railway dashboard
2. Run load test to trigger leak
3. Add LIMIT clauses to queries
4. Restart service + monitor

## Deployment Procedures

### Deploy to Staging
```bash
git push origin feature-branch
# CI runs automatically: lint, type-check, tests
# Auto-deploys to staging
```

### Deploy to Production
```bash
git tag -a v1.0.5 -m "Bump to 1.0.5"
git push origin v1.0.5
# GitHub Actions auto-deploys + health checks
```

### Rollback
```bash
git tag -a v1.0.4-hotfix -m "Rollback to 1.0.4"
git push origin v1.0.4-hotfix
# Auto-deploys previous version
```

## Scheduled Maintenance

- Daily: Monitor error rate, check cache hit rate
- Weekly: Run load tests, review slow query logs
- Monthly: VACUUM ANALYZE, rotate API keys

---

**Version**: 1.0
