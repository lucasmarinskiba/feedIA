# Week 5: Monitoring & Optimization

**Goal**: Verify B2 live. Gather metrics. Optimize based on data.

**Timeline**: 7 days (post-deployment)

---

## Daily Checks (Mon-Fri)

### Database Health

```sql
-- Storage usage breakdown
SELECT
  COUNT(*) as total_users,
  ROUND(AVG(storage_used_gb), 2) as avg_storage_gb,
  MAX(storage_used_gb) as max_user_gb,
  ROUND(SUM(storage_used_gb), 0) as total_storage_gb
FROM users;

-- Expected: 1,000 users, 10GB avg = 10TB total
```

### API Performance

```bash
# Check response times
curl -w "Time: %{time_total}s\n" https://feedia-api.railway.app/health

# Upload performance (from logs)
railway logs | grep "Image uploaded" | tail -100

# Target: <500ms p95, <100ms p50
```

### Backblaze Costs

```bash
# Daily forecast (B2 dashboard)
# Formula: total_gb * 0.006
# Today: X files = Y GB
# Monthly projection: Y * 30 = Z

# Expected: $60/month for 10TB
# Alert if: >$100/month
```

### Error Rates

```bash
# Check logs for errors
railway logs -f | grep ERROR

# Expected: <0.1% error rate
# Alert if: >1% in any hour
```

---

## Weekly Metrics (Friday Afternoon)

### Cost Verification

```
Backblaze dashboard → Billing
├── Usage: X files, Y GB
├── Estimate: Y * $0.006 = $Z
└── vs Wasabi was: $215

Expected savings: $155/month so far? ✓
```

### Revenue Impact

```sql
-- Count active subscriptions
SELECT
  plan,
  COUNT(*) as count,
  ROUND(COUNT() * price, 2) as revenue
FROM users u
JOIN pricing_plans p ON u.plan = p.plan_name
GROUP BY plan, price;

-- Expected growth: +$20-50/week (new signups)
```

### User Adoption

```
Free tier storage increase:
├── Started at: 2GB per user
├── Now at: 5GB per user
└── Adoption: How many users notice? (support tickets = 0?)

Pro/Premium conversions:
├── Free→Pro converts: X per week
├── Expected: +10% vs baseline
```

### File Migration Stats

```
B2 bucket contents:
├── Total files: X
├── Total size: Y GB
├── Oldest file: Z days ago
└── vs Wasabi: Should be 100% migrated by end of week
```

---

## Optimization Opportunities

### 1. Compression Ratio

```
Current: 88% (JPEG→WebP)
Target: 92% (optimize WebP quality)

Action: Lower default quality for Pro tier
├── Current: quality=80
├── Test: quality=75 (save ~3%)
└── Monitor: User complaints

Impact: Save $1.80/month per 10TB
```

### 2. Deduplication

```
Current: 50% savings from duplicate detection
Target: 65% (more aggressive)

Action: Implement perceptual hash (pHash)
├── Detect similar images (not just identical)
├── Reuse URLs for 95%+ similarity
└── Test on 1,000 samples first

Impact: Save $3-5/month per 10TB
```

### 3. Regional Caching

```
B2 → Backblaze Edge CDN ($0.005/GB, not $0.006)
├── Auto-cache on first access
├── Serve from 200+ edge locations
└── No code changes needed

Impact: Same cost, 10x faster downloads
```

### 4. Carousel Expiration

```
Auto-delete drafts >30 days:
├── Current: Manual deletion only
├── New: Scheduled cleanup job
└── Expected cleanup: 10-20% of storage

SQL:
DELETE FROM carousels
WHERE status='draft' AND created_at < NOW() - INTERVAL '30 days'

Impact: Save $1-2/month per 1,000 users
```

---

## User Feedback Loop

### Support Tickets

```
Track by category:

Storage full:
├── Count: X tickets/week
├── Action: Upgrade offer
└── Cost: Free tier cleanup might reduce 20%

Upload slow:
├── Count: Y tickets/week
├── Action: Check B2 API rate limits
└── Limit: 100 req/s per API key (plenty)

Other:
├── Count: Z tickets/week
└── Action: Triage + close
```

### NPS Survey

```
Send to 100 random users (Friday):

Q1: "How satisfied are you with storage?" (1-10)
Q2: "What would make FeedIA better?" (open)

Target: NPS >50
Benchmark: Dropbox ~45
```

### Feature Requests

```
Common asks:
├── Video storage (80% want)
├── Offline mode (30% want)
├── Collaboration (50% want)

Ranking by: volume × value × effort
```

---

## Reinvestment Decision

**$155/month saved.** What to do?

### Option A: Profit (Keep $100+)

- Pocket margin increase
- Budget: R&D only
- Suitable if: Low burn rate

### Option B: Reinvest ($100-150)

Pick 2-3 features:

**Video Storage** ($50/mo)

- Store Veo 3.1 video outputs (huge files)
- Differentiator vs competitors
- Premium tier only

**Analytics Dashboard** ($30/mo)

- Real-time usage analytics
- Pro+ feature
- Drive retention

**Geographic Redundancy** ($40/mo)

- Replicate across 2 B2 regions
- Premium tier
- 99.99% uptime SLA

**24/7 Support** ($35/mo)

- Add dedicated Slack channel
- Premium tier
- Enterprise positioning

---

## Week 5 Checklist

- [ ] Monday: Deploy B2 live, monitor errors
- [ ] Tuesday: Verify 100% file migration
- [ ] Wednesday: Database health check, cost verification
- [ ] Thursday: User feedback survey + analysis
- [ ] Friday: Weekly metrics report + decision

**By EOD Friday:**

- [ ] Cost confirmed $60/mo (vs $215 before)
- [ ] Revenue impact measured
- [ ] Reinvestment decision made
- [ ] Next week priorities set

---

## Success Criteria

| Metric                  | Target       | Status |
| ----------------------- | ------------ | ------ |
| B2 cost                 | <$100/mo     | ⏳     |
| Upload success rate     | >99.9%       | ⏳     |
| Response time p95       | <500ms       | ⏳     |
| User support complaints | 0            | ⏳     |
| Free tier adoption      | 80%+ noticed | ⏳     |
| NPS score               | >50          | ⏳     |

---

## Post-Week-5 Actions

### If All Green ✅

- Announce publicly: "We cut storage costs 72% while 5x'ing your storage"
- Feature on blog + social media
- Proceed to Week 6 (new features)

### If Issues Found ⚠️

- Investigate root cause
- Rollback only if critical (otherwise fix forward)
- Document lessons learned
- Retarget metrics next week

### If Revenue Drops 📉

- Increase Free tier price to $2.99 (still undercut competitors)
- Or add premium features to upsell
- Analyze churn reasons

---

## Week 6+ Planning

After Week 5 metrics are stable:

**Option A: Video Storage** (if chosen)

- Integrate Veo 3.1 outputs → B2
- Add storage path to videos table
- Premium tier only ($29.99 + storage)

**Option B: Collaboration** (if chosen)

- Shared carousels (read-only)
- Team workspaces
- Pro tier feature

**Option C: Analytics** (if chosen)

- Carousel performance dashboard
- Engagement metrics
- A/B testing platform

---

## Monitoring Dashboard Setup

Create internal dashboard (Google Sheets):

```
Sheet 1: Daily Metrics
├── Date | B2 Cost | Revenue | Users | Errors | NPS

Sheet 2: Performance
├── Date | p50 upload | p95 upload | CDN hits | Cache ratio

Sheet 3: Feedback
├── Tickets | Category | Sentiment | Action

Sheet 4: Forecast
├── Month | Projected cost | Projected revenue | Margin
```

Update daily (automated via API or manual)

---

## Communication Plan

### Internal (Slack #eng)

- Daily standup: "B2 live, X GB migrated, Y errors"
- Weekly summary: Cost savings verified, feedback analyzed

### External (Email)

- Friday: Announce "5x storage, same price" to all users
- Track open rate + click-through rate

### Social Media

- LinkedIn: Infrastructure optimization post
- Twitter: Storage announcement + cost savings angle
- Instagram: Behind-the-scenes infra photo

---

## Done ✅

Week 5 = Verification phase.

By EOD Friday:

- All systems stable
- Costs confirmed
- Metrics established
- Next week priorities clear

Ready for Week 6 feature work or scale-up.
