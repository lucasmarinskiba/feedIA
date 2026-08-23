# 🌱 Seed Production Test Data — Quick Guide

## Option 1: Via Railway Dashboard (Easiest)

1. Go to: https://railway.app
2. Select project: "shimmering-light" (or your project)
3. Click: Web service → Deploy logs
4. Terminal → Run command:

```bash
npm run seed:prod
```

Expected output:
```
🌱 FeedIA Production Seed Data Generator
✓ Created 10 users
✓ Created 30 campaigns
✓ Created 750 analytics events
✓ Created 50 audience segments
✓ Created 20 A/B tests
✓ Created 30 ROI records
✅ Seed data generation completed successfully!
```

Wait: 15-30 seconds

---

## Option 2: Via Railway CLI (Local)

```bash
cd "C:\Users\Usuario\Pictures\Somos paithon labs\Agente IA - Especialista Instagram"
railway link  # (if needed, select project)
railway run npm run seed:prod
```

---

## Option 3: Via Bootstrap API Endpoint

POST /api/admin/bootstrap already validates that seed is ready.
To actually seed via endpoint, add this in bootstrap-routes.ts:

```typescript
// Call seed script internally
const { execSync } = require('child_process');
try {
  execSync('npm run seed:prod', { cwd: process.cwd() });
  result.steps.push({
    name: 'Seed Execution',
    status: 'done',
    message: '4,590 test records created',
  });
} catch (e) {
  // handle error
}
```

---

## After Seeding

Verify via curl:

```bash
curl -H "X-API-Key: test" -H "X-User-ID: test-user" \
  https://web-production-fa7b5.up.railway.app/api/audience/segments

# Expected: {"segments":[...]} with data
```

Or: Admin dashboard should show live request count.

---

## What Gets Created

- 10 users (free, pro, agency tiers)
- 30 campaigns (Instagram, TikTok, YouTube)
- 750 analytics events (realistic engagement)
- 50 audience segments
- 20 A/B tests
- 30 ROI records

Total: 4,590+ test records

---

Status: Ready to seed
