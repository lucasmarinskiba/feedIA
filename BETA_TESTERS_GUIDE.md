# FeedIA Beta Testing Guide

## Welcome Beta Testers 🚀

You're invited to test FeedIA's complete user system. Everything is live and ready.

---

## Getting Started

### 1. Register Account

**URL:** https://web-production-fa7b5.up.railway.app

**Register endpoint (no UI yet):**

```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "YourPassword123!",
    "username": "your_username"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "your-email@example.com",
    "username": "your_username"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": "15m"
}
```

**Save both tokens!**

### 2. Login

```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "YourPassword123!"
  }'
```

---

## Test Scenarios

### Scenario 1: Manage Profile

**Get your profile:**
```bash
curl https://web-production-fa7b5.up.railway.app/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Update profile:**
```bash
curl -X PUT https://web-production-fa7b5.up.railway.app/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Your Name",
    "lastName": "Last Name",
    "language": "es",
    "timezone": "America/Argentina/Buenos_Aires",
    "darkMode": true
  }'
```

### Scenario 2: Track Consumption

**View current month usage:**
```bash
curl https://web-production-fa7b5.up.railway.app/api/users/usage \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response shows:
- API calls used vs limit
- Storage used vs limit
- Video storage tracking
- Current tier

**View storage breakdown:**
```bash
curl https://web-production-fa7b5.up.railway.app/api/users/storage \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Scenario 3: Upload Content

**Create post/video record:**
```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/content \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Instagram Post",
    "description": "Testing content upload",
    "contentType": "post",
    "fileUrl": "https://example.com/image.jpg",
    "fileSize": 2.5,
    "fileSizeUnit": "mb",
    "platform": "instagram",
    "metadata": {
      "dimensions": "1080x1080",
      "format": "carousel"
    }
  }'
```

**Create video record:**
```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/content \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TikTok Video Test",
    "contentType": "video",
    "fileUrl": "https://example.com/video.mp4",
    "fileSize": 50,
    "fileSizeUnit": "mb",
    "platform": "tiktok"
  }'
```

### Scenario 4: Manage Content

**List all content:**
```bash
curl "https://web-production-fa7b5.up.railway.app/api/content?page=1&limit=20&status=draft" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Query params:
- `page=1` - Page number
- `limit=20` - Items per page (max 100)
- `status=draft|published|archived` - Filter by status
- `platform=instagram|tiktok|youtube` - Filter by platform

**Get single content:**
```bash
curl https://web-production-fa7b5.up.railway.app/api/content/CONTENT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Update content:**
```bash
curl -X PUT https://web-production-fa7b5.up.railway.app/api/content/CONTENT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "description": "New description",
    "tags": "test,beta,new"
  }'
```

**Publish content:**
```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/content/CONTENT_ID/publish \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "publishedUrl": "https://instagram.com/p/ABC123XYZ"
  }'
```

**Delete content:**
```bash
curl -X DELETE https://web-production-fa7b5.up.railway.app/api/content/CONTENT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Scenario 5: API Key Management

**Create new API key:**
```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/users/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Integration Key",
    "expiresIn": "90d"
  }'
```

Response includes the actual API key (show once only!):
```json
{
  "apiKey": "sk_1691234567_abcdefghijk...",
  "keyPrefix": "sk_169123...",
  "name": "My Integration Key",
  "expiresAt": "2026-11-23T...",
  "message": "Save this API key — you will not be able to see it again"
}
```

**List all keys:**
```bash
curl https://web-production-fa7b5.up.railway.app/api/users/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Revoke key:**
```bash
curl -X DELETE https://web-production-fa7b5.up.railway.app/api/users/api-keys/KEY_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Test Data

### Pre-seeded test accounts (if needed):

- **Email:** beta-tester-1@feedia.dev / **Pass:** BetaTest123!
- **Email:** beta-tester-2@feedia.dev / **Pass:** BetaTest123!
- **Email:** qa-engineer@feedia.dev / **Pass:** BetaTest123!

---

## Tier Limits (Current Plan)

| Feature | Free | Pro | Agency |
|---------|------|-----|--------|
| Storage | 5 GB | 50 GB | Custom |
| API Calls/month | 1,000 | 10,000 | Custom |
| Video Storage | None | 100 GB | Custom |
| Content Limit | 50 | Unlimited | Unlimited |

---

## Feedback Form

### What to test:

1. **Registration** - Can you create an account?
2. **Authentication** - Login works? Tokens valid?
3. **Profile Management** - Update preferences, timezone, language?
4. **Content Upload** - Create posts/videos? Storage tracked?
5. **Content Listing** - Filter by platform/status? Pagination?
6. **Usage Tracking** - Does it show correct consumption?
7. **API Keys** - Can you create/revoke keys?
8. **Error Handling** - What happens with invalid data?
9. **Performance** - Response times acceptable?
10. **Security** - Does auth prevent unauthorized access?

### Report bugs:

**Format:**
```
Title: [Brief description]
Endpoint: [POST/GET/etc] /api/...
Expected: [What should happen]
Actual: [What happened]
Reproduce: [Steps to reproduce]
Response: [JSON response if applicable]
```

### Send feedback to: lucasdmarin@gmail.com

---

## API Authentication

All endpoints (except `/api/auth/register` and `/api/auth/login`) require:

```bash
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Token expires in 15 minutes. Refresh with:

```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

---

## Health Check

Verify system is up:

```bash
curl https://web-production-fa7b5.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "feedIA-server",
  "timestamp": "2026-08-23T..."
}
```

---

## Support

- **Docs:** Full API reference in `/docs/API.md` (in repo)
- **Issues:** Report to lucasdmarin@gmail.com
- **Slack:** [invite link - TBD]

---

## Timeline

- **Aug 23-30:** Beta testing phase 1 (core features)
- **Aug 30-Sep 6:** Beta testing phase 2 (integrations)
- **Sep 6+:** Public launch

---

**Thanks for testing! Your feedback shapes FeedIA.** 🙌
