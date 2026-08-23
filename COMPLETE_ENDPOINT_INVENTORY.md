# FeedIA Complete Endpoint Inventory (Tier 5-15)

**Last Updated:** 2026-08-22  
**Backend:** web-production-fa7b5.up.railway.app  
**Total Endpoints:** 59+ (listed below, 21 tested)  

---

## Endpoint Status Legend

- ✅ WORKING (tested, 200/201 response)
- ❌ FAILING (tested, 500 response)
- 🔄 NOT TESTED (implemented but not in test suite)
- ⚠️ PARTIAL (works but needs fixes)

---

## Tier 5: Trending Detection (System 9)

**Tested:** 4 endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/trends/detect | GET | ❌ | Detects trending campaigns |
| /api/trends/audio | GET | ❌ | Gets trending audio by platform |
| /api/trends/hashtags | GET | 🔄 | Trending hashtags by niche |
| /api/trends/formats | GET | 🔄 | Trending content formats |
| /api/trends/topics | GET | 🔄 | Trending topics in niche |
| /api/trends/creators | GET | 🔄 | Trending creators analysis |

---

## Tier 6: Audience Targeting & Profiling

**Tested:** 2 endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/audience/segments | POST | ❌ | Create audience segment |
| /api/audience/segments | GET | ❌ | List segments (paginated) |
| /api/audience/segments/:id | PUT | 🔄 | Update segment |
| /api/audience/segments/:id | DELETE | 🔄 | Delete segment |
| /api/audience/profiles | GET | 🔄 | User demographic profiles |
| /api/audience/interests | GET | 🔄 | Interest/passion targeting |
| /api/audience/behaviors | GET | 🔄 | Behavior clustering |
| /api/audience/lookalike | POST | 🔄 | Lookalike audience generation |

---

## Tier 7: A/B Testing & Experimentation

**Tested:** 2 endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/abtest/create | POST | ❌ | Create A/B test |
| /api/abtest/:testId/results | GET | ❌ | Get test results + winner |
| /api/abtest/:testId/end | POST | 🔄 | End test early |
| /api/abtest/history | GET | 🔄 | Historical test results |
| /api/abtest/calculator | POST | 🔄 | Sample size calculator |
| /api/abtest/multivariate | POST | 🔄 | Multivariate testing |

---

## Tier 8: Content Versioning & Approval

**Tested:** 0 endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/content/versions | GET | 🔄 | List content versions |
| /api/content/:id/versions/:versionId | GET | 🔄 | Get specific version |
| /api/content/:id/versions/:versionId/restore | POST | 🔄 | Restore old version |
| /api/content/approval/queue | GET | 🔄 | Approval queue |
| /api/content/approval/:contentId/approve | POST | 🔄 | Approve content |
| /api/content/approval/:contentId/reject | POST | 🔄 | Reject with feedback |

---

## Tier 9: Sentiment Analysis & Brand Safety

**Tested:** 2 endpoints (both passing)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/sentiment/analyze | POST | ✅ | Analyze text sentiment |
| /api/sentiment/bulk | POST | 🔄 | Bulk sentiment analysis |
| /api/brand-safety/check | POST | 🔄 | Check content for brand safety |
| /api/sentiment/by-campaign | GET | 🔄 | Sentiment aggregation |
| /api/sentiment/trends | GET | 🔄 | Sentiment trends over time |

**Current Implementation:**
- Simple length-based classification
- Needs NLP library (natural, compromise, sentiment)

---

## Tier 10: Compliance & Regulation

**Tested:** 0 endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/compliance/gdpr/check | POST | 🔄 | GDPR compliance check |
| /api/compliance/ccpa/check | POST | 🔄 | CCPA compliance check |
| /api/compliance/fca/check | POST | 🔄 | FCA compliance check |
| /api/compliance/audit-log | GET | 🔄 | Audit log of all changes |

---

## Tier 11: ROI & Performance Analysis

**Tested:** 1 endpoint

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/roi/calculate | GET | ❌ | Calculate ROI |
| /api/roi/projections | GET | 🔄 | Project future ROI |
| /api/roi/attribution | GET | 🔄 | Multi-touch attribution |
| /api/roi/lifetime-value | GET | 🔄 | Customer lifetime value |
| /api/roi/breakeven | GET | 🔄 | Breakeven point |
| /api/roi/payback-period | GET | 🔄 | Payback period analysis |

---

## Tier 12: Batch Operations & Optimization

**Tested:** 2 endpoints (both passing)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/batch/optimize | POST | ✅ | Optimize batch size |
| /api/batch/schedule | POST | 🔄 | Schedule batch execution |
| /api/batch/status/:batchId | GET | 🔄 | Get batch status |
| /api/batch/results/:batchId | GET | 🔄 | Get batch results |
| /api/batch/cancel/:batchId | POST | 🔄 | Cancel running batch |

**Status:** Pure logic, no database dependency

---

## Tier 13: Webhooks & Real-time Events

**Tested:** 0 endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/webhooks/register | POST | 🔄 | Register webhook endpoint |
| /api/webhooks/list | GET | 🔄 | List registered webhooks |
| /api/webhooks/:id | DELETE | 🔄 | Unregister webhook |
| /api/webhooks/test/:id | POST | 🔄 | Send test webhook |
| /api/events/subscribe | POST | 🔄 | Subscribe to events |

---

## Tier 14: Cost Guardian & Budget Management

**Tested:** 4 endpoints (all failing)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/cost/track | POST | ❌ | Track API cost |
| /api/cost/summary | GET | ❌ | Get cost summary |
| /api/cost/budget | GET | 🔄 | Get budget and spending |
| /api/cost/budget/update | PUT | 🔄 | Update budget limits |
| /api/cost/alerts | GET | 🔄 | Get cost alerts |
| /api/cost/forecast | GET | 🔄 | Forecast spending |

**Providers Tracked:**
- OpenAI (GPT-4, Vision)
- DeepSeek (Chat)
- FAL (Image upscale)
- Replicate (Video generation)

---

## Tier 15: Advanced Analytics & Intelligence

**Tested:** 0 endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /api/analytics/funnel | GET | 🔄 | Conversion funnel analysis |
| /api/analytics/cohort | GET | 🔄 | Cohort analysis |
| /api/analytics/retention | GET | 🔄 | Retention curves |
| /api/analytics/churn | GET | 🔄 | Churn prediction |
| /api/analytics/ltv | GET | 🔄 | Lifetime value trends |
| /api/analytics/segmentation | GET | 🔄 | Automatic audience segmentation |

---

## Additional Endpoints (Not Tier 5-15)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /health | GET | ✅ | Liveness probe |
| /health/ready | GET | ❌ | Readiness probe (not implemented) |
| /health/detailed | GET | 🔄 | Component status |
| /metrics | GET | 🔄 | Prometheus metrics |

---

## Summary Statistics

### By Tier
| Tier | Total | Tested | Passing | Failing | Not Tested |
|------|-------|--------|---------|---------|------------|
| 5 | 6 | 4 | 0 | 4 | 2 |
| 6 | 8 | 2 | 0 | 2 | 6 |
| 7 | 6 | 2 | 0 | 2 | 4 |
| 8 | 6 | 0 | 0 | 0 | 6 |
| 9 | 5 | 2 | 2 | 0 | 3 |
| 10 | 4 | 0 | 0 | 0 | 4 |
| 11 | 6 | 1 | 0 | 1 | 5 |
| 12 | 5 | 2 | 2 | 0 | 3 |
| 13 | 5 | 0 | 0 | 0 | 5 |
| 14 | 6 | 4 | 0 | 4 | 2 |
| 15 | 6 | 0 | 0 | 0 | 6 |
| Health | 4 | 3 | 1 | 2 | 1 |
| **TOTAL** | **68** | **21** | **6** | **15** | **47** |

### By Status
| Status | Count | % |
|--------|-------|---|
| ✅ Passing | 6 | 8.8% |
| ❌ Failing | 15 | 22% |
| 🔄 Not Tested | 47 | 69.1% |

---

## Authentication Headers Required

All endpoints except /health require authentication:

```bash
# Option 1: API Key Header
-H "X-API-Key: sk_prod_<key>"

# Option 2: Bearer Token
-H "Authorization: Bearer <token>"

# Additional Context Headers
-H "X-Account-ID: <account_id>"
-H "X-Request-ID: <request_id>"
-H "User-ID: <user_id>"
```

---

## Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Server Error |
| 503 | Service Unavailable |

---

## Next Steps

1. **Phase 1: Unblock Database Endpoints**
   - Fix userId extraction (30 min)
   - Verify database schema (30 min)
   - Target: 20/21 tests passing

2. **Phase 2: Expand Test Coverage**
   - Implement tests for remaining 47 endpoints
   - Target: 50+/68 tests passing

3. **Phase 3: Production Hardening**
   - Error handling and validation
   - Performance optimization
   - Monitoring and alerting

---

**Document Version:** 1.0  
**Created:** 2026-08-22
