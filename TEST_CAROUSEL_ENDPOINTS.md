# Carousel Infrastructure Test Suite

## Test Setup

Base URL: `https://feedia.vercel.app` (Railway backend)

### Test Carousel Data

```json
{
  "userId": "test-user-2026-08",
  "title": "Instagram Growth Tips",
  "format": "carousel",
  "slides": [
    {
      "slideNumber": 1,
      "headline": "Grow Your Instagram",
      "body": "5 proven strategies to increase followers organically",
      "cta": "Swipe →"
    },
    {
      "slideNumber": 2,
      "headline": "Post Consistency",
      "body": "Post 3-5 times per week at peak hours (10am, 6pm, 9pm)",
      "cta": "Learn more"
    },
    {
      "slideNumber": 3,
      "headline": "Hashtag Strategy",
      "body": "Use 20-30 relevant hashtags per post. Mix popular + niche",
      "cta": "Next"
    },
    {
      "slideNumber": 4,
      "headline": "Engagement Matters",
      "body": "Reply to 30+ comments within first hour. This boosts reach",
      "cta": "Continue"
    },
    {
      "slideNumber": 5,
      "headline": "Collaborate & Network",
      "body": "Partner with micro-influencers. Do guest posts. Tag partners.",
      "cta": "Save this tip"
    }
  ],
  "platform": "instagram"
}
```

---

## 1. CAROUSEL CREATION

### 1.1 Create with Validation Gate (Success)
```bash
curl -X POST https://feedia.vercel.app/api/carousels/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","title":"Test Carousel","format":"carousel","slides":[{"slideNumber":1,"headline":"Title","body":"Body text","cta":"Learn more"}],"platform":"instagram"}'
```
**Expected:** 201 + carousel object + validation report (score > 75)

### 1.2 Create with Critical Errors (Rejection)
```bash
curl -X POST https://feedia.vercel.app/api/carousels/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","title":"","format":"carousel","slides":[],"platform":"instagram"}'
```
**Expected:** 400 + error message + validation errors

### 1.3 Batch Create
```bash
curl -X POST "https://feedia.vercel.app/api/carousels/batch-create?continueOnError=true" \
  -H "Content-Type: application/json" \
  -d '[{"userId":"u1","title":"C1","format":"carousel","slides":[...],"platform":"instagram"},{"userId":"u2","title":"C2","format":"carousel","slides":[...],"platform":"tiktok"}]'
```
**Expected:** 207 + stats (total/succeeded/failed) + array of results

---

## 2. CAROUSEL STORAGE

### 2.1 Direct Creation (without validation gate)
```bash
curl -X POST https://feedia.vercel.app/api/carousels \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","title":"Direct Create","format":"carousel","slides":[...],"platform":"instagram"}'
```
**Expected:** 201 + carousel object

### 2.2 Get Carousel by ID
```bash
curl -X GET https://feedia.vercel.app/api/carousels/:carouselId
```
**Expected:** 200 + full carousel object

### 2.3 List User Carousels
```bash
curl -X GET "https://feedia.vercel.app/api/carousels/user/test-user?limit=10"
```
**Expected:** 200 + array of carousels

### 2.4 Update Carousel
```bash
curl -X PUT https://feedia.vercel.app/api/carousels/:carouselId \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","status":"published"}'
```
**Expected:** 200 + updated carousel

### 2.5 Delete Carousel
```bash
curl -X DELETE https://feedia.vercel.app/api/carousels/:carouselId
```
**Expected:** 200 + {success: true}

---

## 3. QUALITY VALIDATION

### 3.1 Validate Carousel Content
```bash
curl -X POST https://feedia.veriel.app/api/carousels/quality/validate \
  -H "Content-Type: application/json" \
  -d '{carousel object}'
```
**Expected:** 200 + validation report (isValid, score, errors, warnings, suggestions)

### 3.2 Get Quality Report
```bash
curl -X GET https://feedia.vercel.app/api/carousels/quality/:carouselId
```
**Expected:** 200 + quality report + recommendation (approve/review/reject)

### 3.3 Batch Validate
```bash
curl -X POST https://feedia.vercel.app/api/carousels/quality/batch/validate \
  -H "Content-Type: application/json" \
  -d '[carousel1, carousel2, carousel3]'
```
**Expected:** 200 + stats (total/approved/review_needed/rejected) + array of reports

### 3.4 Approve Carousel
```bash
curl -X POST https://feedia.vercel.app/api/carousels/quality/:carouselId/approve
```
**Expected:** 200 + {approved: true, score, timestamp} OR 400 if has errors

---

## 4. METRICS & ENGAGEMENT

### 4.1 Track Event
```bash
curl -X POST https://feedia.vercel.app/api/carousels/:carouselId/events \
  -H "Content-Type: application/json" \
  -d '{"eventType":"view","source":"instagram","userAgent":"Mobile Safari"}'
```
**Expected:** 200 + {success: true}

### 4.2 Get Current Metrics
```bash
curl -X GET https://feedia.vercel.app/api/carousels/:carouselId/metrics
```
**Expected:** 200 + {views, shares, saves, likes, engagement_rate, trend}

### 4.3 Get Metrics History (30 days)
```bash
curl -X GET "https://feedia.vercel.app/api/carousels/:carouselId/metrics/history?days=30"
```
**Expected:** 200 + array of daily metrics

### 4.4 Event Breakdown
```bash
curl -X GET "https://feedia.vercel.app/api/carousels/:carouselId/metrics/breakdown?days=7"
```
**Expected:** 200 + {views, shares, saves, likes, clicks breakdown}

### 4.5 Update Metrics
```bash
curl -X POST https://feedia.vercel.app/api/carousels/:carouselId/metrics \
  -H "Content-Type: application/json" \
  -d '{"views":100,"likes":15,"shares":5}'
```
**Expected:** 200 + {success: true}

---

## 5. ANALYTICS DASHBOARD

### 5.1 Carousel Analytics
```bash
curl -X GET https://feedia.vercel.app/api/analytics/carousel/:carouselId
```
**Expected:** 200 + {carouselId, title, platform, totalViews, engagement, trend, topEvent, estimatedReach}

### 5.2 User Analytics
```bash
curl -X GET https://feedia.vercel.app/api/analytics/user/:userId
```
**Expected:** 200 + {totalCarousels, totalViews, avgEngagementRate, platformDistribution, trend}

### 5.3 Timeseries (Trending)
```bash
curl -X GET "https://feedia.vercel.app/api/analytics/carousel/:carouselId/timeseries?days=30"
```
**Expected:** 200 + array of {date, views, engagement, shares, saves, likes}

### 5.4 Engagement Breakdown
```bash
curl -X GET "https://feedia.vercel.app/api/analytics/carousel/:carouselId/breakdown?days=7"
```
**Expected:** 200 + {views, shares, saves, likes, clicks, share_of_voice}

### 5.5 Compare Carousels
```bash
curl -X POST https://feedia.vercel.app/api/analytics/compare \
  -H "Content-Type: application/json" \
  -d '{"carousel_ids":["id1","id2","id3"]}'
```
**Expected:** 200 + array of {carouselId, title, views, engagement, rank}

### 5.6 User Top Performers
```bash
curl -X GET https://feedia.vercel.app/api/analytics/user/:userId/top
```
**Expected:** 200 + {topCarousel, platformDistribution, totalCarousels}

---

## Test Checklist

- [ ] Creation with validation gate succeeds (score > 75)
- [ ] Creation with errors rejected (critical errors)
- [ ] Batch creation handles mixed success/failure
- [ ] Quality validation detects placeholder text
- [ ] Quality validation detects missing required fields
- [ ] Metrics tracking logs events correctly
- [ ] Timeseries returns 30 days of data
- [ ] Analytics dashboard calculates engagement rate
- [ ] Carousel comparison ranks correctly
- [ ] User analytics aggregates by platform
- [ ] Trend detection works (up/down/flat)
- [ ] Event breakdown shows share of voice %

## Success Criteria

- All endpoints respond with correct status codes
- Carousel data persists correctly (get-by-id returns same data)
- Validation quality scores calculated correctly
- Metrics aggregated properly
- Analytics trends calculated accurately
- No data loss on updates
