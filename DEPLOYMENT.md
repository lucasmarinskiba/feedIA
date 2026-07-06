# FeedIA Deployment Guide — Vercel

## Prerequisites
- GitHub account (✅ configured: lucasmarinskiba/feedIA)
- Vercel account (create at vercel.com)
- Git remotes configured (✅ https://github.com/lucasmarinskiba/feedIA.git)

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
# Follow browser prompt to authenticate
```

### 3. Deploy Project
```bash
vercel
# Select: feedIA project (or create new)
# Confirm production deployment
```

### 4. Environment Variables (Vercel Dashboard)
```
BRAND_NAME=@feedia
BRAND_NICHE=instagram-growth
BRAND_AUDIENCE=creators
NODE_ENV=production
```

## Deployment Config
- **Framework**: Node.js + TypeScript
- **Build command**: (auto-detected)
- **Output directory**: `dist/`
- **Entry point**: `src/server.ts`
- **Port**: 3000 (auto-mapped to Vercel)

## API Endpoints After Deploy

### Parameterized Image Endpoints (NEW)
```
POST  https://<your-vercel-domain>/api/parameterized/upload-images
POST  https://<your-vercel-domain>/api/parameterized/match-prompts
POST  https://<your-vercel-domain>/api/parameterized/generate-content
GET   https://<your-vercel-domain>/api/parameterized/library-status
```

### Status Check
```bash
curl https://<your-vercel-domain>/health
```

## After Deployment

1. Test endpoints with curl (PARAMETERIZED_ENDPOINTS_TEST.md)
2. Monitor Vercel dashboard for errors
3. Set up analytics/logging
4. Configure custom domain (optional)

## Rollback
```bash
vercel rollback
# Select previous deployment
```

## Monitoring
- Vercel Dashboard: https://vercel.com/dashboard
- Real-time logs: vercel logs <project-name>
- Performance: Vercel Analytics built-in

## Current Commits Ready for Deployment
- 1dea4d3: Parameterized endpoints wired
- 6b46fca: Vercel config added
- 97c0581: Expansion phase complete (24,970 prompts)
