# TIER 6 Operations Guide

**Date**: 2026-08-11  
**Scope**: Oncall automation, disaster recovery, security audit

---

## 1. Oncall Automation (PagerDuty + Slack)

### Setup

```bash
# Set environment variables
export PAGERDUTY_API_TOKEN=<token>
export PAGERDUTY_SERVICE_ID=<service-id>
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/<id>
```

### Integration Points

**Triggered automatically on:**

- Circuit breaker opens (> 5 failures in 60s)
- Database health check fails
- High error rate (> 5% for 5m)
- High latency spike (p95 > 1s)

**Example: Wire into anomaly detection**

```ts
// In anomaly-detector.ts or circuit breaker handler
import { alertOncall } from '../services/oncall-automation.js';

if (circuitBreakerOpened) {
  await alertOncall({
    title: 'Circuit Breaker OPEN: Webhooks',
    severity: 'critical',
    description: `> 5 failures in 60s window. Auto-recovery in progress.`,
    service: 'webhooks',
    details: { failures: 8, failureWindow: '60s' },
  });
}
```

### Auto-Recovery Flow

1. **Alert triggered** → PagerDuty incident created + Slack notified
2. **Oncall engineer** paged (escalates after 5 min if not acknowledged)
3. **Meanwhile**: Circuit breaker auto-recovers after 30s
4. **On success**: `resolvePagerDutyIncident(incidentId)` closes ticket

### Dashboard

- **PagerDuty**: https://feedia.pagerduty.com/incidents
- **Slack**: #feedia-alerts channel (all incidents + resolved)
- **Grafana**: Incident timeline overlaid on metrics

---

## 2. Disaster Recovery (Backup + Point-in-Time Restore)

### Backup Strategy

**Frequency**: Daily at 02:00 UTC  
**Retention**: 7 days local, 30 days S3  
**Recovery**: Point-in-time via WAL files

### Setup Cron

```bash
# Add to /etc/crontab
0 2 * * * /app/scripts/backup-strategy.sh >> /var/log/feedia-backup.log 2>&1
```

### Backup Files Created

- `agent_20260811_020000.db` — Main database snapshot
- `agent_20260811_020000.db-wal` — Write-Ahead Log (uncommitted txns)
- `agent_20260811_020000.db-shm` — Shared memory
- Compressed + uploaded to S3: `s3://feedia-backups/backups/20260811_020000/`

### Manual Point-in-Time Restore

```bash
# 1. Stop application
systemctl stop feedia-agent

# 2. Download backup from S3
aws s3 cp s3://feedia-backups/backups/20260811_020000/ ./restore/ --recursive

# 3. Decompress
cd restore && gunzip *.gz

# 4. Restore
cp agent_20260811_020000.db /app/data/runtime/agent.db
cp agent_20260811_020000.db-wal /app/data/runtime/agent.db-wal

# 5. Verify integrity
sqlite3 /app/data/runtime/agent.db "PRAGMA integrity_check;"

# 6. Start application
systemctl start feedia-agent

# 7. Monitor startup
tail -f /var/log/feedia-agent.log
```

### Automated Recovery via Lambda

```bash
# Trigger Lambda function on DB alert
aws lambda invoke \
  --function-name feedia-restore-backup \
  --payload '{"timestamp":"20260811_020000"}' \
  /tmp/response.json
```

### Retention Policy

- **Local**: 7 days (automated cleanup)
- **S3**: 30 days (lifecycle rules)
- **Archive**: 1 year (Glacier)

**Check backup status:**

```bash
cat /app/backups/.latest_backup
# {
#   "timestamp": "20260811_020000",
#   "database": "/app/backups/agent_20260811_020000.db.gz",
#   "size_bytes": 45287654,
#   "s3_location": "s3://feedia-backups/backups/20260811_020000/",
#   "recovery_instructions": "See RUNBOOK_PHASE6-10.md#recovery"
# }
```

---

## 3. Security Audit

### Rate Limiting

**Per-account limit**: 100 requests/minute  
**Response header**: `X-RateLimit-Remaining`  
**Breach response**: HTTP 429, retry-after 60s

**Test:**

```bash
for i in {1..105}; do
  curl -X POST http://localhost:3000/api/realdata/webhook/conversion \
    -H "X-Account-ID: test" \
    -H "Content-Type: application/json" \
    -d '{"postId":"p1","value":50,"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","source":"instagram"}'
done
# 105th request returns 429 Too Many Requests
```

### API Key Authentication

**Public endpoints** (no auth):

- `GET /health`
- `GET /metrics`
- `POST /api/predict/*`

**Protected endpoints** (require `X-API-Key`):

- `POST /api/realdata/webhook/*`
- `POST /api/orchestrate`
- `POST /api/execute/*`

**Key format**: `sk_prod_*` (service), `wh_prod_*` (webhooks)

**Test:**

```bash
# Missing key → 401
curl -X POST http://localhost:3000/api/realdata/webhook/conversion
# {"error":"Unauthorized","message":"Missing or invalid X-API-Key header"}

# Valid key → 200
curl -X POST http://localhost:3000/api/realdata/webhook/conversion \
  -H "X-API-Key: sk_prod_test123" \
  -H "X-Account-ID: test" \
  -H "Content-Type: application/json" \
  -d '{"postId":"p1","value":50,"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","source":"instagram"}'
```

### Audit Logging

**All requests logged** with:

- Request ID (correlation)
- Account ID
- API key (truncated)
- Method, path, status
- Duration
- IP address

**Access logs**:

```bash
tail -f /var/log/feedia-audit.log
# [2026-08-11T10:30:45Z] requestId=abc-123 accountId=prod-1 method=POST path=/api/realdata/webhook/conversion status=200 durationMs=45
```

### CORS + Security Headers

**Applied to all responses**:

- `X-Content-Type-Options: nosniff` — Prevent MIME sniffing
- `X-Frame-Options: DENY` — Disable clickjacking
- `Strict-Transport-Security: max-age=31536000` — Enforce HTTPS

### Quarterly Security Audit Checklist

- [ ] API keys rotated (Q1, Q3)
- [ ] Rate limits tuned to traffic patterns
- [ ] Backup integrity verified (weekly)
- [ ] Disaster recovery drill (quarterly)
- [ ] Access logs reviewed for anomalies
- [ ] OWASP Top 10 scan (quarterly)

---

## 4. Integration: Wire into Server

### server.ts

```ts
import {
  rateLimitMiddleware,
  apiKeyMiddleware,
  auditLoggingMiddleware,
  securityHeadersMiddleware,
} from './middleware/security.js';
import { requestContextMiddleware } from './middleware/request-context.js';

// Order matters: context → headers → auth → rate limit → audit
app.use(requestContextMiddleware);
app.use(securityHeadersMiddleware);
app.use(apiKeyMiddleware);
app.use(rateLimitMiddleware);
app.use(auditLoggingMiddleware);

// Routes
app.use('/api/realdata', realdataRoutes);
app.use('/api/anomaly', anomalyRoutes);
app.use('/api/execute', executeRoutes);
app.use('/health', healthCheckRoutes);
app.use('/metrics', metricsRoutes);
```

---

## 5. Deployment Checklist

- [ ] Environment variables set (PagerDuty, Slack, S3)
- [ ] Backup cron scheduled
- [ ] Security middleware wired
- [ ] Rate limits tuned to expected traffic
- [ ] API keys provisioned
- [ ] Audit logging configured
- [ ] Disaster recovery tested
- [ ] Oncall paging verified (test incident creation)
- [ ] Grafana dashboards updated

---

## 6. Metrics to Monitor

**Oncall automation**:

- PagerDuty incidents/week (target: < 5)
- MTTR (mean time to recovery) in minutes
- Auto-recovery success rate

**Backup**:

- Daily backup completion time
- S3 storage usage (cost)
- Last successful restore test date

**Security**:

- Rate-limited requests/day
- Failed auth attempts/day
- Audit log ingestion (cloudwatch/splunk)

---

## References

- RUNBOOK_PHASE6-10.md — Troubleshooting guide
- prometheus-rules.yaml — Alert thresholds
- oncall-automation.ts — Integration code
- backup-strategy.sh — Backup script
- security.ts — Rate limiting + auth code
