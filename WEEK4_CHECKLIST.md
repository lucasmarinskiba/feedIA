# Week 4 Checklist: Backblaze B2 Migration & Pricing Update

## Monday: Backblaze Setup (3h)

- [ ] Create Backblaze account (https://www.backblaze.com/b2/cloud-storage.html)
- [ ] Add payment method (credit card)
- [ ] Create bucket: `feedia-carousels`
  - [ ] Bucket type: Private
  - [ ] Encryption: Enabled (default)
  - [ ] CORS: Enable (for direct uploads)
- [ ] Generate API key
  - [ ] Note: Key ID
  - [ ] Note: Application key
- [ ] Set local env vars
  ```bash
  export BACKBLAZE_KEY_ID=xxxxx
  export BACKBLAZE_APP_KEY=xxxxx
  export BACKBLAZE_BUCKET_NAME=feedia-carousels
  ```
- [ ] Run setup script: `bash WEEK4_B2_SETUP.sh`
- [ ] Test connection (should return auth token)
- [ ] Update Railway environment variables via dashboard or CLI
- [ ] Verify Backblaze dashboard shows bucket

**Deliverable**: `✅ Backblaze ready, connection tested`

---

## Tuesday: File Migration (4-6h)

- [ ] Backup Wasabi bucket (optional, for safety)
- [ ] Create migration script: `src/services/backblaze-migration.ts`
- [ ] Install dependencies: `npm install node-fetch`
- [ ] Run migration script
  ```bash
  npm run migrate:wasabi-to-b2
  ```
- [ ] Monitor migration log
  - [ ] Track: total files, success/fail ratio
  - [ ] Estimate: ETA based on throughput
  - [ ] Alert: if failure rate > 5%
- [ ] Verify all files migrated
  ```bash
  # Check file counts
  # Wasabi: S3 ListObjects (should be ~0 after migration)
  # B2: API list_buckets (should match total)
  ```
- [ ] Test random files downloaded from Backblaze
  - [ ] Verify: file integrity (checksums match)
  - [ ] Verify: file sizes correct
  - [ ] Verify: metadata preserved (content-type, etc)
- [ ] Check Backblaze dashboard for:
  - [ ] Storage used (should match Wasabi)
  - [ ] Costs (should be ~$60/month)

**Deliverable**: `✅ 100% files migrated, all verified`

---

## Wednesday: Code Update & Deploy (2h)

- [ ] Update code
  - [ ] Create: `src/services/backblaze-storage.ts`
  - [ ] Update: `src/server.ts` (import backblaze instead of wasabi)
  - [ ] Update: `src/db/carousel-storage-schema.sql`
    - [ ] Free: 5GB (was 2GB)
    - [ ] Pro: 250GB (was 50GB)
    - [ ] Premium: 2TB (was 500GB)
  - [ ] Run: `npm run lint --fix`
  - [ ] Run: `npm run build`
- [ ] Test locally
  - [ ] Start dev server: `npm run dev`
  - [ ] Test upload: POST /api/carousels/:id/upload
  - [ ] Verify file in Backblaze dashboard
  - [ ] Test storage quota: POST /api/carousels/check-quota
- [ ] Update Stripe pricing (via dashboard or CLI)
  - [ ] Product: FeedIA Free Storage
    - [ ] Description: "5GB storage" (was "2GB")
    - [ ] Price: $0/mo (unchanged)
  - [ ] Product: FeedIA Pro Storage
    - [ ] Description: "250GB storage" (was "50GB")
    - [ ] Price: $9.99/mo (unchanged)
  - [ ] Product: FeedIA Premium Storage
    - [ ] Description: "2TB storage" (was "500GB")
    - [ ] Price: $29.99/mo (unchanged)
  - [ ] Test: Create test subscription to verify UI shows new limits
- [ ] Commit & push
  ```bash
  git add src/ src/db/ WEEK4_*.md
  git commit -m "feat: Week 4 - Backblaze B2 migration, 3-10x storage increase"
  git push origin main
  ```
- [ ] Monitor Railway deployment
  - [ ] Check logs: `railway logs -f`
  - [ ] Wait for build success
  - [ ] Test live: `curl https://feedia-api.railway.app/health`

**Deliverable**: `✅ Code deployed, Stripe updated, live in production`

---

## Thursday: Verification & Monitoring (2h)

- [ ] Smoke tests (live)
  - [ ] Create carousel
  - [ ] Upload image
  - [ ] Check storage quota
  - [ ] Verify image served from Backblaze CDN
- [ ] Monitor costs
  - [ ] Backblaze: Check API call counts (should be <100/min)
  - [ ] Railway: Check CPU/memory usage (should be normal)
  - [ ] Cost projection: $60/mo (log for records)
- [ ] Database sanity checks
  - [ ] Verify: All users still have correct quotas
  - [ ] Verify: Storage_used_gb accurate
  - [ ] Verify: No orphaned records
  ```sql
  SELECT COUNT(*) FROM carousels WHERE user_id NOT IN (SELECT id FROM users);
  ```
- [ ] Alert setup
  - [ ] Backblaze: Set budget alert at $100/mo
  - [ ] Railway: Set error rate alert
  - [ ] Slack: Configure notifications

**Deliverable**: `✅ All systems verified, monitoring active`

---

## Friday: User Communication (1h)

- [ ] Draft announcement email
  ```
  Subject: "We 5x'd your storage — same price! 🚀"
  
  Hi [Name],
  
  Great news! We've optimized our storage infrastructure.
  
  New storage limits (same price):
  - Free: 2GB → 5GB (+150%)
  - Pro: 50GB → 250GB (+400%)
  - Premium: 500GB → 2TB (+300%)
  
  All existing users get upgraded automatically.
  
  Benefits:
  ✅ Up to 2TB of carousel storage
  ✅ Faster uploads (new CDN)
  ✅ 99.95% uptime SLA
  ✅ Zero downtime migration
  
  [Upgrade now if on Free tier]
  ```
- [ ] Send announcement
  - [ ] Segment: All users
  - [ ] Channel: Email + in-app notification
- [ ] Update help docs
  - [ ] Storage limits page
  - [ ] Pricing page
  - [ ] FAQ: "Where are files stored?" (Backblaze B2)
- [ ] Social media
  - [ ] LinkedIn: Announcement
  - [ ] Twitter: Feature highlight
  - [ ] Instagram: Behind-the-scenes infra post (optional)

**Deliverable**: `✅ Users informed, documentation updated`

---

## Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Files migrated | 100% | ⏳ |
| Migration errors | 0% | ⏳ |
| Backblaze cost/mo | $60 | ⏳ |
| API response time | <500ms | ⏳ |
| Uptime during migration | 100% | ⏳ |
| Users happy (no complaints) | 95%+ | ⏳ |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migration takes >4h | Medium | High | Parallel upload threads, monitor ETA |
| File corruption during migration | Low | Critical | Verify checksums, keep Wasabi 30d |
| Backblaze API rate limit | Low | Medium | Batch uploads, throttle to 100 req/s |
| Users can't upload during migration | Low | High | Use Wasabi as fallback during maintenance window |
| Stripe update fails | Very Low | Medium | Test in sandbox first, have manual process ready |

---

## Rollback Plan (If Needed)

If critical issues arise:

1. **Quick rollback** (5 min)
   ```bash
   railway vars set STORAGE_PROVIDER=wasabi
   # API falls back to Wasabi for missing files
   ```

2. **Full rollback** (15 min)
   - Revert git to Week 3 commit
   - Redeploy from Railway dashboard
   - Update Stripe back to old limits
   - Send email: "Brief storage incident, now resolved"

3. **Keep both** (30 days)
   - Maintain Wasabi account alongside Backblaze
   - All new uploads → Backblaze
   - Old files readable from both
   - Decision point: Day 30 (keep or archive Wasabi)

---

## Post-Migration Cleanup (Week 5)

- [ ] Archive Wasabi bucket (keep 30 days for safety)
- [ ] Confirm: All Backblaze metrics normal
- [ ] Announce: Cost savings achieved ($155/mo → customers)
- [ ] Plan: What to do with savings? (reinvest in features, profit, lower prices)

---

## Timeline Summary

| Day | Hours | Status |
|-----|-------|--------|
| Monday | 3h | Backblaze setup |
| Tuesday | 5h | File migration |
| Wednesday | 2h | Code + deploy |
| Thursday | 2h | Verify + monitor |
| Friday | 1h | Announce |
| **Total** | **~13h** | **Ready** |

**Effective date**: EOD Wednesday (live)
**Marketing date**: Friday (announce)
**Cleanup**: Week 5
