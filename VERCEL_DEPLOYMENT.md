# Vercel Deployment Guide — 14 Autonomous Systems

**Status:** Code committed, ready for deployment  
**Commit:** 1a1daab (16 serverless endpoints)  
**Endpoints:** 16 active routes in `/api/systems/*`

---

## Option A: GitHub Auto-Deploy (Recommended)

**Step 1: Go to Vercel Dashboard**
```
1. Open https://vercel.com
2. Login with GitHub account
3. Click "Add New..." → "Project"
```

**Step 2: Import Repository**
```
1. Search for: lucasmarinskiba/feedIA
2. Select it
3. Click "Import"
```

**Step 3: Configure Project**
```
Framework: Next.js (auto-detect)
Build Command: npm run build
Output Directory: dist
Root Directory: ./
```

**Step 4: Add Environment Variables**
In Vercel Dashboard → Settings → Environment Variables, add:

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
STRIPE_SECRET_KEY=sk_live_...your-key-here...
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=...your-key-here...
REDIS_URL=rediss://default:...@...upstash.io:6379
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=generate-random-secret-here
JWT_SECRET=generate-another-random-secret
INSTAGRAM_BUSINESS_ACCOUNT_ID=...
INSTAGRAM_ACCESS_TOKEN=...
TIKTOK_API_KEY=...
PINTEREST_API_KEY=...
FACEBOOK_PAGE_ID=...
YOUTUBE_API_KEY=...
ENABLE_CONTENT_CURATION=true
ENABLE_AUDIENCE_PROFILING=true
ENABLE_ENGAGEMENT_FORECASTING=true
ENABLE_AB_TESTING=true
ENABLE_CHANNEL_ORCHESTRATION=true
ENABLE_COMPETITIVE_INTELLIGENCE=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_COMPLIANCE_VALIDATOR=true
ENABLE_TREND_DETECTOR=true
ENABLE_GROWTH_HACKER=true
ENABLE_ROI_CALCULATOR=true
ENABLE_SMART_BATCHING=true
ENABLE_AUTO_FEEDBACK_LOOP=true
ENABLE_PLATFORM_NATIVE_OUTPUT=true
MONTHLY_BUDGET_CAP=1000
```

**Step 5: Deploy**
- Click "Deploy"
- Vercel builds & deploys automatically
- Auto-deploys on every `git push` to main

**Result:** https://your-project-name.vercel.app

---

## Option B: Local CLI Auth + Deploy

**Step 1: Authenticate**
```bash
vercel login
# Opens browser, follow auth flow
# Returns VERCEL_TOKEN (save this!)
```

**Step 2: Link Project** (first time only)
```bash
cd path/to/feedIA
vercel link
# Select organization
# Link to existing project or create new
```

**Step 3: Set Environment Variables**
```bash
vercel env add ANTHROPIC_API_KEY
# Paste: sk-ant-...
vercel env add STRIPE_SECRET_KEY
# Paste: sk_live_...
# (repeat for all 20+ env vars above)
```

**Step 4: Deploy to Production**
```bash
vercel deploy --prod
```

**Step 5: Get URL**
```
Deployed to: https://feedIA-[random].vercel.app
```

---

## Option C: Using VERCEL_TOKEN (Fastest)

If you have `VERCEL_TOKEN` from prior Vercel setup:

```bash
export VERCEL_TOKEN=your-token-here
cd path/to/feedIA
vercel deploy --prod
```

---

## Verify Deployment

Once deployed (either option):

```bash
# Health check
curl https://your-domain.vercel.app/api/systems/health

# Test forecasting endpoint
curl -X POST https://your-domain.vercel.app/api/systems/forecasting/predict \
  -H "Content-Type: application/json" \
  -d '{
    "format": "carousel",
    "topic": "skincare",
    "platform": "instagram",
    "audience": "women 25-45",
    "postingTime": "2026-08-16T12:00:00Z"
  }'

# Expected response: 200 OK with forecast data
```

---

## 16 Live Endpoints

Once deployed:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/systems/health` | GET | System status |
| `/api/systems/curation/record` | POST | Record prompt performance |
| `/api/systems/curation/analyze` | GET | Analyze curation scores |
| `/api/systems/audience/create` | POST | Create audience segment |
| `/api/systems/forecasting/predict` | POST | Predict engagement |
| `/api/systems/testing/create` | POST | Create A/B test |
| `/api/systems/orchestration/distribute` | POST | Distribute multi-channel |
| `/api/systems/competitive/add` | POST | Add competitor |
| `/api/systems/competitive/analyze` | POST | Analyze competition |
| `/api/systems/sentiment/analyze` | POST | Analyze comment sentiment |
| `/api/systems/sentiment/report` | POST | Generate sentiment report |
| `/api/systems/compliance/validate` | POST | Validate compliance |
| `/api/systems/trends/detect` | POST | Detect trend |
| `/api/systems/growth/strategy` | POST | Build growth strategy |
| `/api/systems/roi/calculate` | POST | Calculate ROI |
| `/api/systems/batching/optimize` | POST | Optimize asset roadmap |
| `/api/systems/feedback/record` | POST | Record feedback loop |
| `/api/systems/platform/format` | POST | Format for platform |

---

## Troubleshooting

**Build fails:** Check `npm run build` locally
```bash
npm run build
npm run lint
```

**Environment variables missing:** Vercel Dashboard → Settings → Environment Variables

**401 Unauthorized:** Check VERCEL_TOKEN is set correctly
```bash
vercel whoami
```

**Cold start slow:** Normal on Vercel hobby tier. Pro tier ($20/mo) adds edge caching.

---

## Cost

- **Hobby (Free):** 150 GB/month bandwidth, no paid add-ons
- **Pro ($20/mo):** Unlimited bandwidth, priority support
- **Enterprise:** Custom pricing

API usage (Anthropic, Stripe, social media) billed separately per platform.

---

## Next: Implement Missing Systems for Railway

Once Vercel stable (1-2 weeks):
- Plan Railway migration
- Implement remaining systems
- Add background job workers
- Setup cron tasks
- Deploy to Railway ($5/mo)

Status: **Ready for deployment** ✅
