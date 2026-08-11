# Runbook: Phase 6-10 Troubleshooting

**Date**: 2026-08-11  
**Scope**: Real Data Sync, Anomaly Detection, Autonomous Execution, Predictive Models  
**Oncall**: See pagerduty.feedia.ai

---

## Quick Status Check

```bash
# Liveness
curl https://api.feedia.app/health
# Expected: {"status": "alive", "uptime": 12345}

# Readiness
curl https://api.feedia.app/health/ready
# Expected: 200 (ready) or 503 (degraded)

# Detailed status
curl https://api.feedia.app/health/detailed
# Shows per-component health (database, cache, externalAPIs)

# Metrics
curl https://api.feedia.app/metrics | grep -E "anomalies_detected|actions_executed|api_errors"
# Check: high error rates, circuit breaker open status
```

---

## Scenario 1: Webhooks Failing (Conversions Not Recording)

### Symptoms
- POST /api/realdata/webhook/conversion returns 400+ errors
- Dashboard shows no new conversions for 30+ minutes
- Error logs: "conversion validation failed" or "idempotency cache full"

### Diagnosis

```bash
# Check webhook latency
curl -s https://api.feedia.app/metrics | grep webhook_latency_ms
# Red flag: p99 > 5000ms (slow processing)

# Check error rate
curl -s https://api.feedia.app/metrics | grep "conversions_recorded_total{status=\"error\"}"
# High count = validation or DB issues

# Check logs for Zod errors
tail -f logs/feedia.log | grep "conversion validation failed"
# Look for: validation error messages (required fields, type mismatches)
```

### Fix

**Option A: Invalid webhook payload**
- Verify payload matches schema (postId, value > 0, timestamp ISO-8601, source in enum)
- Example valid: `{"postId":"p1","value":50,"timestamp":"2026-01-01T10:00:00Z","source":"instagram"}`
- Re-send test webhook after fixing

**Option B: Idempotency cache full**
- If cache reached 24h limit and keys not clearing:
  ```bash
  # Restart idempotency cleanup
  # (automatic hourly, but can force restart via)
  kill -HUP <pid>  # or redeploy
  ```

**Option C: Database connection lost**
- Check health: `curl https://api.feedia.app/health/detailed`
- If database=unhealthy, escalate to DB team
- Webhook retries will queue up; no data loss (all retries eventually succeed)

---

## Scenario 2: Anomaly Detection Not Firing (No Alerts on Viral Drop/Churn)

### Symptoms
- Viral score drops 60% but no "viralDrop" anomaly in logs
- Dashboard shows no anomalies for 2+ hours
- Error logs: "scan complete" but anomalies array empty

### Diagnosis

```bash
# Check anomaly counts
curl -s https://api.feedia.app/metrics | grep "anomalies_detected_total"
# If all zeros → anomalies not being detected

# Check thresholds
# Default: viralDrop >50%, churn >2x, lead stall >7 days, ROI collapse >50%
# Are your metrics exceeding these?

# Manual anomaly scan
curl -X POST https://api.feedia.app/api/anomaly/scan \
  -H "Content-Type: application/json" \
  -d '{
    "viralScoreBaseline": 100,
    "viralScoreCurrent": 30,
    "churnBaselinePercent": 2,
    "churnCurrentPercent": 2,
    "lastLeadSignalTimestamp": "2026-01-01T10:00:00Z",
    "roiBaseline": 300,
    "roiCurrent": 300
  }'
# Expected: returns anomaly type "viralDrop" with severity "critical"
```

### Fix

**Option A: Baseline not set**
- Anomalies need historical baseline to compare against
- If first account/first day, baselines = 0 → no anomalies fire
- **Workaround**: Manually set baseline via admin API, or wait 7 days for automatic baseline learning

**Option B: Thresholds too strict**
- Default 50% drop for viral drop = 50% threshold
- If volatility high, adjust via account settings:
  ```bash
  # TODO: Admin API to set per-account thresholds
  # curl -X PATCH /api/account/{accountId}/anomaly-settings \
  #   -d '{"viralScoreDropPercent": 30}'
  ```

**Option C: Baseline stale**
- If no signals > 7 days, baseline not updating
- Manual refresh: redeploy or restart anomaly detector service

---

## Scenario 3: Autonomous Actions Not Executing (Decisions Made But No API Calls)

### Symptoms
- Agent decisions logged but actions don't run
- "action completed" in logs but no actual pause/scale/email in Instagram/Budget/Email
- Status always "completed" but result empty

### Diagnosis

```bash
# Check action execution
curl https://api.feedia.app/api/execute/log | jq '.actions[] | {type, status, result}'
# Red flag: status="completed" but result={} (empty)

# Check if API contexts wired
# Grep source: autonomous-executor.ts line 69
# Should call: context.instagram.toggleAutoPublish(), context.budgetAPI.adjust(), etc.
# If mock context still in use → no real API calls

# Check circuit breaker state
curl -s https://api.feedia.app/metrics | grep "circuit_breaker_state"
# If value=2 (open) → circuit breaker blocking all actions
```

### Fix

**Option A: Mock context still in use**
- TIER 1 intentionally uses `createMockContext()` for testing
- For production: wire real context in server.ts
  ```ts
  // Replace mock with real:
  // import { createRealContext } from './services/api-integrations'
  // executor.init(createRealContext());
  ```

**Option B: Circuit breaker open**
- If > 5 failures in last 60s → breaker opens
- Check logs for action failures:
  ```bash
  tail -f logs/feedia.log | grep "action failed"
  # Fix underlying issue (API auth, network, etc.)
  # Breaker auto-recovers after 30s (half-open), then resets if success
  ```

**Option C: Action validation failing**
- Required fields missing (type, target, reason, severity)
- Check: POST /api/execute/plan payload matches schema

---

## Scenario 4: Circuit Breaker Stuck Open (Service Down)

### Symptoms
- `/health/ready` returns 503
- All subsequent requests fail with "Circuit breaker is OPEN"
- No recovery after 30+ seconds

### Diagnosis

```bash
# Check breaker state
curl https://api.feedia.app/metrics | grep circuit_breaker_state

# Expected progression:
# - closed (0) → normal
# - open (2) → > 5 failures in 60s window
# - half-open (1) → after 30s, testing if recovered
# - closed (0) → if recovery succeeds

# If stuck on "open" after 30s: half-open test also failing
tail -f logs/feedia.log | grep "circuit-breaker"
# Look for: "half-open attempt failed" (half-open test also failed)
```

### Fix

**Option A: Dependency temporarily unavailable**
- Database restarting, API rate-limited, network flaky
- Wait 2-3 min for dependency to recover
- Circuit breaker will auto-test every 30s
- Once recovery detected → returns to closed

**Option B: Cascading failures**
- One service down → retries trigger exponential backoff → depletes timeout → more timeouts → circuit opens
- Check all dependencies:
  ```bash
  curl https://api.feedia.app/health/detailed
  # Shows which components unhealthy
  ```
- Fix root dependency (DB, cache, external API)
- **Fast recovery**: kill service & restart (clears breaker state)
  ```bash
  kubectl rollout restart deployment/feedia-agent
  ```

---

## Scenario 5: High Latency (API Slow)

### Symptoms
- POST /api/realdata/webhook/* takes > 2s
- Webhooks timing out, clients retry
- Oncall complains about page slowness

### Diagnosis

```bash
# Check latency percentiles
curl -s https://api.feedia.app/metrics | grep "webhook_latency_ms_bucket"
# Look at buckets: if p95 > 1000ms → investigate

# Check concurrent load
curl -s https://api.feedia.app/metrics | grep "active_connections"

# Check retry attempts (high retries = slow processing causing retries)
curl -s https://api.feedia.app/metrics | grep "retry_attempts_total{success=\"false\"}"

# Profile slow operation
# TODO: Add tracing spans (OpenTelemetry)
# For now: check logs for module timings
tail -f logs/feedia.log | grep "durationMs"
```

### Fix

**Option A: Database slow**
- Check slowlog: `SELECT * FROM logs WHERE operation='database' AND durationMs > 1000`
- Add index if needed
- Scale read replicas if high query volume

**Option B: Idempotency cache lookup slow**
- If 100K+ keys in 24h window, lookup degrades
- Reduce cache TTL: `src/services/real-data-sync.ts line 56 (24h → 12h)`
- Restart service

**Option C: Validating large payload**
- Zod schema validation scans entire payload
- If payload > 100KB, consider streaming validation
- For now: ask clients to batch smaller

---

## Scenario 6: Data Loss / Missing Conversions

### Symptoms
- Posted 100 conversions but only 95 in dashboard
- Duplicate detection working (idempotency confirmed)
- Where are the 5 missing?

### Diagnosis

```bash
# Check webhook error rate
curl -s https://api.feedia.app/metrics | grep "conversions_recorded_total"
# Compare: received_total vs recorded_total{status="success"}
# Difference = validation or retry exhaustion

# Check idempotency cache hits
curl -s https://api.feedia.app/metrics | grep "duplicate"
# These are NOT missing—they're intentionally deduplicated

# Check if some failed validation
tail -f logs/feedia.log | grep "conversion validation failed" | wc -l
```

### Fix

**Option A: Validation errors in client payload**
- Ask client to log before sending
- Verify: postId not empty, value > 0, timestamp valid ISO-8601
- Replay failed payloads after fixing

**Option B: Retry exhaustion**
- If client doesn't retry: maxRetries=3 means 4 attempts total
- If all 4 fail, webhook dropped
- Check: are retries enabled in webhook caller?
- Escalate: slow network or API overloaded → increase timeout

**Option C: Database write failure mid-transaction**
- If DB disconnects mid-write, transaction rolls back
- No data loss (transaction atomic) but conversion not recorded
- Circuit breaker will open → client gets 503 → can retry
- Verify DB has recovery enabled (WAL, replication)

---

## Escalation Path

| Severity | Symptom | Action | Escalate To |
|----------|---------|--------|------------|
| **P1** | All webhooks failing (100% error rate) | Page oncall now | Infrastructure + Backend |
| **P1** | Database unhealthy for > 2 min | Kill & restart service | DB team |
| **P2** | Anomalies not firing (> 30 min no alerts) | Check thresholds, reset baseline | ML team |
| **P2** | Circuit breaker stuck open (> 5 min) | Restart service, fix dependency | Dependency owner |
| **P3** | Latency spike (p95 > 2s) | Scale horizontally, profile | DevOps |
| **P3** | Minor data loss (< 0.1% missing) | Investigate root cause | Backend |

---

## Preventive Monitoring

### Set up alerts

```yaml
# Example: Prometheus alert rules (alerting.rules.yaml)
groups:
  - name: phase6-10
    rules:
      - alert: HighWebhookErrorRate
        expr: rate(api_errors_total{endpoint="/realdata/webhook/*"}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Webhook error rate > 5%"
      
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 2
        for: 30s
        annotations:
          summary: "Circuit breaker OPEN"

      - alert: AnomalyDetectionStalled
        expr: increase(anomalies_detected_total[30m]) == 0
        for: 30m
        annotations:
          summary: "No anomalies detected in 30min"
```

### Daily health checks

- [ ] `/health/detailed` — all components green
- [ ] Webhook error rate < 1%
- [ ] Anomaly detection firing on synthetic test
- [ ] Action execution completing successfully
- [ ] Circuit breaker closed (state=0)
- [ ] Database query latency p95 < 1s

---

## Contact

- **On-call**: pagerduty.feedia.ai
- **Slack**: #incidents-feedia-agent
- **Docs**: docs.feedia.ai/phase6-10
- **Dashboard**: grafana.feedia.ai/d/phase6-10
