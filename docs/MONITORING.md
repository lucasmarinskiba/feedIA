# FeedIA Monitoring & Observability

## Key Metrics to Watch

| Metric | Target | Alert Threshold |
|--------|--------|------------------|
| HTTP 200 Rate | > 95% | < 90% (5min) |
| Error Rate (5xx) | < 1% | > 5% (5min) |
| P95 Latency | < 300ms | > 1s (5min) |
| Cache Hit Rate | 60-80% | < 50% (15min) |
| Database Connections | < 40% used | > 80% (5min) |

## Monitoring Tools

### 1. Admin Dashboard

Access: https://web-production-fa7b5.up.railway.app/admin
Refresh: Auto-updates every 5 sec

Sections:
- Overview — Live health, request count, error rate
- Metrics — Real-time latency (p50/p95/p99), cache stats
- Agents — Per-agent performance, latencies
- Cache — Hit rate, memory usage
- Users — Count by tier, activity
- Logs — Last 50 errors with stack traces
- Alerts — Active/historical alerts

### 2. Health Check Endpoint

```bash
curl https://web-production-fa7b5.up.railway.app/health | jq
```

Returns: status, postgres connection, redis connection, uptime

### 3. Metrics Endpoint

```bash
curl https://web-production-fa7b5.up.railway.app/metrics | head -50
```

Format: Prometheus text format

### 4. Sentry Error Tracking

Captures: Unhandled 5xx errors, exceptions, promise rejections

### 5. Railway Dashboard

Monitor: CPU usage, memory usage, network I/O, logs

## Alert Rules & Thresholds

### Critical (Page immediately)

- Service Down: Health check fails 3x in 1min
- Error Rate Spike: > 10% in 5min
- Database Unreachable: postgres_connected == false

### Warning (Notify team)

- Cache Hit Rate Low: < 40% for 15min
- High Latency: P95 > 1s for 10min
- Memory Leak: Memory trending up for 1h
- Rate Limit Surge: > 100 rejections/min

## Daily Monitoring Checklist

### Morning (9 AM)
- Check /health → should return 200
- Review Sentry for new errors overnight
- Check error rate graph (target: < 1%)

### Hourly
- Spot-check /admin dashboard
- No critical alerts?
- Cache hit rate > 60%?

### Evening (5 PM)
- Capacity planning (traffic growth?)
- Performance regressions since last deploy?
- Database size growing as expected?

## Incident Response Times (SLA)

| Severity | Detect | Respond | Resolve |
|----------|--------|---------|---------|
| Critical (down) | 1 min | 5 min | 30 min |
| High (degraded) | 5 min | 15 min | 1 hour |
| Medium (warning) | 15 min | 1 hour | 4 hours |
| Low (info) | 1 hour | 4 hours | Next day |

---

**Version**: 1.0
