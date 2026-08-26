# FeedIA Production Deployment

**Status:** ✅ Ready for production deployment

## Quick Start

```bash
# 1. Push to main (auto-triggers Vercel)
git push origin main

# 2. Deploy backend to Railway
railway up

# 3. Configure MongoDB Atlas
./scripts/mongodb-setup.sh
# Export: MONGODB_URI=mongodb+srv://...

# 4. Monitor production
./scripts/monitor-production.sh
```

## Environment Variables

**Vercel (.env.production.local):**
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/feedia
CSRF_SECRET=<32+ random chars>
CSRF_REQUIRED=true
OWNER_EMAIL=production-admin@example.com
```

**Railway (web service):**
```
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/feedia
NODE_ENV=production
PORT=3000
```

## Deployment Pipeline

| Stage | Service | Status | Time |
|-------|---------|--------|------|
| 1. Push | GitHub | ✅ | 1s |
| 2. Build | Vercel | ✅ | 2m |
| 3. Deploy Frontend | Vercel | ✅ | 30s |
| 4. Deploy Backend | Railway | ✅ | 1m |
| 5. DB Migration | MongoDB | Manual | 30s |
| **Total** | | | **~4m** |

## Live URLs

- **Frontend:** https://feedia.vercel.app
- **Backend:** https://web-production-fa7b5.up.railway.app
- **API Health:** https://web-production-fa7b5.up.railway.app/api/health
- **Monitoring:** https://web-production-fa7b5.up.railway.app/api/monitoring/health

## Database Setup

1. Create MongoDB Atlas cluster (M0 free or higher)
2. Create database user + password
3. Whitelist IP: 0.0.0.0/0 (development) or specific IPs (production)
4. Copy connection string
5. Run: `./scripts/mongodb-setup.sh`

Collections auto-created:
- `users` — User accounts + tier
- `workspaces` — Team organizations
- `content` — Carousels, reels, videos
- `analytics` — Metrics + ROI data
- `invitations` — 7-day TTL auto-expire
- `templates` — Preset + custom
- `feedback` — User ratings + feature requests

## Monitoring

**Real-time health:**
```bash
./scripts/monitor-production.sh
```

**Check slow endpoints:**
```bash
curl https://web-production-fa7b5.up.railway.app/api/monitoring/health | jq '.slowEndpoints'
```

**Cache hit rate:**
```bash
curl https://web-production-fa7b5.up.railway.app/api/monitoring/health | jq '.cache'
```

## Rate Limits

| Tier | Limit | Owner Multiplier |
|------|-------|------------------|
| Free | 100/hr | 10x (1000/hr) |
| Starter | 500/hr | 10x (5000/hr) |
| Premium | 2000/hr | 10x (20000/hr) |

## Security Checklist

- [ ] CSRF_SECRET set (32+ random chars)
- [ ] OWNER_EMAIL set (no fallback in prod)
- [ ] MONGODB_URI uses SSL (mongodb+srv://)
- [ ] IP whitelist configured (not 0.0.0.0/0 in prod)
- [ ] Webhook secrets rotated
- [ ] API keys rotated monthly
- [ ] Logs reviewed (no credentials exposed)
- [ ] CORS configured for production domain
- [ ] Rate limiting enforced
- [ ] Backups automated (MongoDB Atlas)

## Troubleshooting

**Backend not responding:**
```bash
railway logs  # Check error messages
railway env   # Verify DATABASE_URL set
```

**Database connection failed:**
```bash
# Test MongoDB connection
npx mongodb-cli ping "$MONGODB_URI"

# Check whitelist IP
# Dashboard: Security > Network Access
```

**High error rate:**
```bash
# Check slowest endpoints
curl https://web-production-fa7b5.up.railway.app/api/monitoring/health | jq '.slowEndpoints'

# Scale up Railway (more CPU/RAM)
# Check for memory leaks in logs
```

**Cache not working:**
```bash
# Check hit rate
curl https://web-production-fa7b5.up.railway.app/api/monitoring/health | jq '.cache.hitRate'

# If low: LRU eviction too aggressive, increase cache size
# See: src/middleware/cache-layer.ts line 15
```

## Rollback

```bash
# Revert last commit
git revert HEAD
git push origin main

# Vercel auto-deploys previous version
# Railway auto-detects via git (no manual redeploy needed)
```

## Performance Targets

- P95 response time: < 1000ms
- Error rate: < 1%
- Cache hit rate: > 60%
- Uptime: > 99%

## Feature Flags

Toggle features per-environment:

```bash
# Check enabled features
curl https://feedia.vercel.app/api/features

# Check specific feature
curl https://feedia.vercel.app/api/features/video-generation
```

## Support

- **Dashboard:** https://web-production-fa7b5.up.railway.app
- **Logs:** `railway logs` (tail real-time)
- **Metrics:** `/api/monitoring/health` (JSON)
- **Docs:** See DEPLOY.md for detailed setup

**Deployment Status:** ✅ Ready for production
