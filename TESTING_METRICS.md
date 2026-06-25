# End-to-End Metrics Flow Testing

Complete guide to test metrics flow from platform APIs → daily snapshot → achievements → medal shelf.

## Quick Start (5 minutes)

### 1. Set Credentials

```bash
# Add to .env or export
export META_ACCESS_TOKEN="your_meta_token"
export META_IG_BUSINESS_ID="your_ig_business_id"
export TIKTOK_ACCESS_TOKEN="your_tiktok_token"
```

### 2. Check Platform Health

```bash
bash scripts/verify-metrics-flow.sh http://localhost:3000
```

Or manually:
```bash
curl http://localhost:3000/api/platform/health | jq .
```

Expected response:
```json
{
  "timestamp": "2026-06-25T10:30:00Z",
  "platforms": [
    {
      "platform": "instagram",
      "status": "ok",
      "message": "✅ Connected. 5000 followers, 150 posts",
      "followerCount": 5000
    },
    {
      "platform": "tiktok",
      "status": "ok",
      "message": "✅ Connected. 3000 followers, 50 videos, 100000 total likes",
      "followerCount": 3000
    }
  ],
  "allHealthy": true
}
```

### 3. Trigger Daily Snapshot

Option A: Wait for 11pm job to run automatically
```bash
# App logs will show:
# [Jobs] growth-daily-snapshot: 5000 followers | IG: 5000 | TT: 3000
```

Option B: Manually trigger (if admin endpoint available)
```bash
# Via admin console or direct API call
curl -X POST http://localhost:3000/admin/jobs/growth-daily-snapshot
```

### 4. Verify Metrics Recorded

```bash
curl http://localhost:3000/api/growth/metrics?days=1 | jq '.[-1]'
```

Expected output:
```json
{
  "date": "2026-06-25",
  "followers": 5000,
  "followersDelta": 50,
  "tiktokFollowers": 3000,
  "tiktokFollowersDelta": 25,
  "tiktokEngagement24h": 500,
  "instagramFollowers": 5000,
  "instagramFollowersDelta": 25,
  "instagramTotalLikes": 1000,
  "reach24h": 50000,
  "engagement24h": 2500,
  "postsPublished": 2,
  "storiesPublished": 1
}
```

### 5. Check Achievement Status

```bash
curl http://localhost:3000/api/achievements/snapshot | jq .
```

Expected (if milestones unlocked):
```json
{
  "totalUnlocked": 3,
  "totalAvailable": 80,
  "completionPct": 3.75,
  "totalPoints": 85,
  "byCategory": {
    "tiktok-crecimiento": 1,
    "instagram-crecimiento": 1,
    "tiktok-engagement": 1,
    ...
  }
}
```

### 6. View Medal Shelf

Visit: `http://localhost:3000/#achievements`

Should display:
- Stats card with 4 columns (Desbloqueados, Puntos, Épicos+, Último desbloqueo)
- Medal shelf with 12 most recent unlocked badges
- Each badge shows emoji, name, unlock date
- Hover effects (lift + glow)

---

## Full Testing Workflow

### Scenario 1: Fresh Account (No Metrics Yet)

```
1. Set credentials in .env
2. Start app: npm run dev
3. curl /api/platform/health
   → Should show: "ok" with follower counts
4. Check /api/achievements/snapshot
   → Should show: totalUnlocked=0 (no milestones hit)
5. Wait for 11pm or trigger snapshot job
6. Check /api/growth/metrics
   → Should show platform metrics populated
7. No achievements yet (milestones not reached)
```

### Scenario 2: Account with 1000+ Followers

```
1. Set credentials
2. Verify health: /api/platform/health → "ok"
3. Trigger snapshot manually
4. Check metrics: /api/growth/metrics
   → Shows tiktokFollowers: 1000+
5. Check achievements: /api/achievements/snapshot
   → Should show: totalUnlocked >= 1
   → byCategory should include tiktok-crecimiento
6. Visit #achievements
   → Medal shelf displays "tt-100-seg", "tt-500-seg", "tt-1k-seg", etc.
```

### Scenario 3: Testing Fallback (No Credentials)

```
1. Do NOT set credentials
2. curl /api/platform/health
   → Should show: "no-credentials" status
   → followerCount undefined
3. Check /api/achievements/snapshot
   → Shows totalUnlocked=0
4. Trigger snapshot job
5. Check metrics: /api/growth/metrics
   → Shows: followers, reach, engagement from generic source
   → Does NOT show: tiktokFollowers, instagramFollowers
6. No platform achievements unlocked
```

---

## Troubleshooting

### Health check returns "api-error"

```bash
# Check:
1. Token is valid (didn't expire)
2. IG_BUSINESS_ID is correct (from Account Settings, not profile ID)
3. TikTok app has correct redirect URI configured
4. Rate limits haven't been exceeded

# View logs:
tail -f logs/feedIA.log | grep platformProfiles
```

### Metrics show 0 for platform data

```bash
# Reasons:
1. Daily snapshot job hasn't run yet (runs at 11pm)
2. Credentials set AFTER app started (restart needed)
3. API returned error (check health endpoint)
4. Branch timing issue (try manually triggering)

# Solution:
1. Restart app: npm run dev
2. Manually trigger: npm run dev → admin console
3. Check logs: tail -f logs/feedIA.log
```

### Achievements not unlocking

```bash
# Check:
1. Milestone threshold not reached
   - TikTok 100: need tiktokFollowers >= 100
   - Instagram 1K: need instagramFollowers >= 1000

2. Verify data recorded correctly:
   curl http://localhost:3000/api/growth/metrics?days=1 | jq '.[-1].tiktokFollowers'

3. Force achievement evaluation:
   curl -X POST http://localhost:3000/api/achievements/evaluate

4. Check logs for evaluator errors:
   tail -f logs/feedIA.log | grep Achievements
```

### Medal shelf not showing

```bash
# Check:
1. Page loads at http://localhost:3000/#achievements
2. No JavaScript errors in browser console
3. Some achievements are actually unlocked
   curl http://localhost:3000/api/achievements/snapshot | jq '.totalUnlocked'

# If unlocked=0:
- Metrics haven't been recorded yet
- Platform data missing (see Metrics show 0 section)

# If UI broken:
- Check browser console for errors
- Verify assets loaded: Network tab
```

---

## Automated Testing

### Run Tests

```bash
npm test -- metrics-flow.test.ts
```

Tests verify:
- ✅ Daily snapshot records platform metrics
- ✅ Follower deltas calculated correctly
- ✅ Missing data handled gracefully (fallback to 0)
- ✅ Platform milestones trackable
- ✅ Achievement snapshot reflects platform data

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Test metrics flow
  run: npm test -- metrics-flow.test.ts
```

---

## Performance Notes

### Daily Job Duration

```
fetchInstagramProfile()  ~200ms (1 API call)
fetchTikTokProfile()     ~200ms (1 API call)
recordDailySnapshot()    ~10ms  (file write)
Total:                   ~410ms per day
```

### Rate Limits

- Instagram Graph API: 800 calls/hour per token
- TikTok Display API: 1000 calls/hour per token
- FeedIA: 1 call per platform per day = 2 calls/day
- **Headroom:** 99%+ unused quota

---

## Success Criteria

✅ **Health Check Passed**
- Both platforms return "ok" status
- Follower counts displayed
- No "api-error" or "invalid-data"

✅ **Metrics Recorded**
- Daily snapshot includes platform data
- tiktokFollowers, instagramFollowers populated
- Deltas calculated correctly

✅ **Achievements Unlocked**
- At least 1 tiktok-* or instagram-* achievement
- byCategory shows platform milestones
- totalUnlocked > 0

✅ **Medal Shelf Works**
- UI accessible at /#achievements
- Medals display with emoji, name, date
- Hover effects work
- Medal count badge visible

---

## Next Steps After Testing

1. ✅ Verify all 6 sections pass
2. ⚠️ **DONE:** Data flows correctly
3. ⚠️ **TODO:** Add achievement unlock notifications
4. ⚠️ **TODO:** Create platform connection UI
5. ⚠️ **TODO:** Add real-time metric updates (WebSocket)

See METRIC_ROADMAP.md for future enhancements.
