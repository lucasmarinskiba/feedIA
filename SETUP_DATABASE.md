# Database + Storage Setup Guide

## Overview

Carousel Designer Pro now supports **persistent storage** for long-term job management and file archiving.

- **Database:** MongoDB Atlas (job persistence, 7-day retention)
- **Storage:** Cloudinary (file hosting, 10GB free tier)

Both are **optional** — system falls back to in-memory + /tmp if not configured.

---

## MongoDB Atlas Setup (Persistence)

### 1. Create Free Cluster

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free)
3. Click **"Create Deployment"** → **"M0 Free Tier"**
4. Region: pick closest (e.g., `us-east-1`)
5. Wait for cluster to initialize (~3 min)

### 2. Get Connection String

1. Cluster → **Connect**
2. **Drivers** → **Node.js**
3. Copy connection string (looks like):
   ```
   mongodb+srv://username:password@cluster0.mongodb.net/feedia
   ```

### 3. Create Database User

1. **Database Access** → **Add Database User**
2. Username: `feedia-app`
3. Password: Generate secure password (copy it)
4. Permissions: **Read and write to any database**

### 4. Allow Network Access

1. **Network Access** → **Add IP Address**
2. Click **"Allow access from anywhere"** (0.0.0.0/0)
   - For production: restrict to Vercel IPs only

### 5. Update Connection String

Replace placeholders in connection string:
```
mongodb+srv://feedia-app:PASSWORD@cluster.mongodb.net/feedia?retryWrites=true&w=majority
```

### 6. Set Vercel Environment Variable

```bash
vercel env add MONGODB_URI
# Paste connection string
```

### 7. Redeploy

```bash
vercel redeploy
```

---

## Cloudinary Setup (File Storage)

### 1. Create Free Account

1. Go to https://cloudinary.com
2. Sign up (free, 10GB storage)
3. Confirm email

### 2. Get Credentials

Dashboard → **Settings** → **API Keys**

Copy:
- **Cloud Name** (e.g., `dqxyz123`)
- **API Key** (e.g., `123456789`)
- **API Secret** (keep secure, don't commit)

### 3. Set Vercel Environment Variables

```bash
vercel env add CLOUDINARY_CLOUD_NAME
# Paste: dqxyz123

vercel env add CLOUDINARY_API_KEY
# Paste: 123456789
```

### 4. Configure Cloudinary Settings

Dashboard → **Settings** → **Upload**:
- **Auto-cleanup**: 7 days (auto-delete old uploads)
- **Folder**: `carousel-exports`
- **Unique filename**: enabled

### 5. Redeploy

```bash
vercel redeploy
```

---

## Verification

### Check MongoDB Connection

```bash
curl -X GET https://feedia.vercel.app/api/skills/carousel-designer-pro/status/test-id
# Should get 404 (job not found), not 500 (connection error)
```

If you see database logs, MongoDB is connected:
```
[MongoDB] Connected to MongoDB Atlas
```

### Check Cloudinary Integration

After creating a carousel:
```bash
curl -X POST https://feedia.vercel.app/api/skills/carousel-designer-pro/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

Download should return permanent Cloudinary URLs (not /tmp paths):
```json
{
  "htmlPreview": "...",
  "zipUrl": "https://res.cloudinary.com/dqxyz123/..."
}
```

---

## Troubleshooting

### MongoDB Connection Fails

**Error:** `MONGODB_URI not set`

**Fix:**
```bash
vercel env list  # Check if MONGODB_URI exists
vercel env add MONGODB_URI  # Add if missing
vercel redeploy
```

**Check logs:**
```bash
vercel logs
# Look for: "[MongoDB] Connected" or "[MongoDB] Connection failed"
```

### Cloudinary Upload Fails

**Error:** `Cloudinary upload failed`

**Fix:**
1. Verify API key is correct:
   ```bash
   vercel env list | grep CLOUDINARY
   ```

2. Check Cloudinary dashboard for API activity:
   Dashboard → **Activity** → **API Calls**

3. Ensure unsigned uploads are enabled:
   Settings → **Upload** → **Unsigned Uploads**

### Storage Quota Exceeded

**Error:** `Upload failed: exceeded quota`

**Fix:**
1. Check usage:
   ```
   GET https://api.cloudinary.com/v1_1/{cloud_name}/usage
   ```

2. Delete old carousels (>7 days):
   - MongoDB: auto-cleanup runs daily
   - Cloudinary: auto-cleanup after 7 days

3. Increase tier (upgrade Cloudinary to paid)

---

## Retention Policy

| Storage | Retention | Auto-Cleanup | Manual Delete |
|---------|-----------|--------------|---------------|
| MongoDB | 7 days | ✓ Daily | `cleanupOldJobs()` |
| Cloudinary | 7 days | ✓ Auto | Dashboard delete |
| /tmp (fallback) | 7 days | ✓ Vercel | N/A |

Jobs expire 7 days after `createdAt`.

---

## Cost Breakdown

| Service | Free Tier | Limit | Cost |
|---------|-----------|-------|------|
| MongoDB Atlas | ✓ | 512MB | $0 (unlimited after) |
| Cloudinary | ✓ | 10GB | $0 (then $10/100GB) |
| **Total** | | | **$0** |

For 10 carousels/day × 10MB each = 100MB/day = 3GB/month (free tier sufficient).

---

## Next Steps

1. ✓ Create MongoDB Atlas cluster
2. ✓ Create Cloudinary account
3. ✓ Set environment variables in Vercel
4. ✓ Redeploy
5. ✓ Test with sample carousel

Once configured, jobs persist indefinitely (7-day cleanup is configurable).

---

## Optional: Local Development

### MongoDB Local (Docker)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
export MONGODB_URI=mongodb://localhost:27017/feedia
npm start
```

### Cloudinary Offline (Mock)

Leave `CLOUDINARY_*` unset → uses mock URLs (fine for dev)

---

## Support

- MongoDB: https://docs.mongodb.com/atlas
- Cloudinary: https://cloudinary.com/documentation
- Issues: GitHub issues or support@feedia.app
