# FeedIA Deployment Guide

## Production URLs

- **Frontend:** https://feedia.vercel.app
- **Backend:** https://web-production-fa7b5.up.railway.app

## Database Setup

MongoDB schema initialized via migration:

```bash
npx ts-node db/migrations/001-init-schema.ts
```

Collections: users, workspaces, content, analytics, invitations, templates, feedback.

## Deploy Steps

### 1. Pre-deploy checks
```bash
npm run lint
npm run test
npm run build
```

### 2. Frontend (Vercel)
Auto-deploys on git push to main.

### 3. Backend (Railway)
```bash
railway up
```

### 4. Environment Variables

**Vercel (.env.production.local):**
- MONGODB_URI
- CSRF_SECRET (32+ chars)
- CSRF_REQUIRED=true
- OWNER_EMAIL

**Railway:**
- DATABASE_URL
- NODE_ENV=production
- PORT=3000

## Performance Monitoring

```bash
curl https://web-production-fa7b5.up.railway.app/api/monitoring/health
```

## Rate Limits

- Free: 100 req/hour
- Starter: 500 req/hour
- Premium: 2000 req/hour
- Owner: 10x multiplier

## Security Checklist

- [ ] CSRF_SECRET set (32+ chars)
- [ ] OWNER_EMAIL set (no fallback)
- [ ] Rate limiting enforced
- [ ] Webhook signatures validated (timing-safe)
- [ ] Logs masked (no credentials)
- [ ] Backups automated
