# Deploy Checklist — Carousel Designer Pro

Sistema completo. Vercel ready.

## Step 1: MongoDB Atlas

```bash
# 1. Go: https://www.mongodb.com/cloud/atlas
# 2. Create free cluster (M0, region us-east-1)
# 3. Wait ~3 min
# 4. Click "Connect" → "Drivers" → Node.js
# 5. Copy connection string
#    mongodb+srv://username:password@cluster.mongodb.net/feedia
```

**Add to Vercel:**
```bash
vercel env add MONGODB_URI
# Paste connection string (from step 5)
# Press Enter
```

## Step 2: Cloudinary

```bash
# 1. Go: https://cloudinary.com
# 2. Sign up (free, 10GB)
# 3. Dashboard → Settings → API Keys
# 4. Copy:
#    - Cloud Name
#    - API Key
```

**Add to Vercel:**
```bash
vercel env add CLOUDINARY_CLOUD_NAME
# Paste cloud name, press Enter

vercel env add CLOUDINARY_API_KEY
# Paste API key, press Enter
```

## Step 3: Unsplash (Optional)

Real image search. Skip if mock images OK.

```bash
# 1. Go: https://unsplash.com/developers
# 2. Create application
# 3. Copy API key
```

**Add to Vercel (optional):**
```bash
vercel env add UNSPLASH_API_KEY
# Paste API key, press Enter
```

## Step 4: Redeploy

```bash
vercel redeploy
# Wait ~2 min for build + deploy
```

## Step 5: Verify

```bash
# Check logs
vercel logs

# Look for: "[MongoDB] Connected to MongoDB Atlas"
# If error: check connection string, IP whitelist (allow 0.0.0.0/0)
```

## Done

System live. Carousel Designer Pro ready:
- POST /api/skills/carousel-designer-pro/generate
- GET /api/skills/carousel-designer-pro/status/:jobId
- GET /api/skills/carousel-designer-pro/download/:jobId

Jobs persist 7 days (MongoDB + Cloudinary).

## Troubleshooting

**MongoDB 403 error:**
- Go to MongoDB Atlas Dashboard → Network Access
- Click "Add IP Address"
- Select "Allow access from anywhere"
- Wait 1 min, redeploy

**Cloudinary 401 error:**
- Verify API key (Dashboard → Settings → API Keys)
- Check CLOUDINARY_CLOUD_NAME is correct (from Account)

**Vercel env variables not loaded:**
```bash
vercel env list  # Verify vars are set
vercel redeploy  # Force rebuild
```

---

## System Summary

| Layer | Status | Ready |
|-------|--------|-------|
| Core | Carousel generation | ✓ |
| Async | Job queue | ✓ |
| Storage | MongoDB | ⏳ (setup needed) |
| Files | Cloudinary | ⏳ (setup needed) |
| Images | Unsplash | ✓ (optional) |
| Animations | CSS + MP4 | ✓ |
| Exports | ZIP package | ✓ |
| API | 3 endpoints | ✓ |

Deploy time: ~15 min (MongoDB + Cloudinary setup).

System live when all env vars set + Vercel redeploy done.
