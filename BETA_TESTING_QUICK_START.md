# Beta Testing Quick Start (5 Minutes)

## System Status
- ✅ **API:** https://web-production-fa7b5.up.railway.app
- ✅ **Status:** Live
- ✅ **Region:** us-east (Railway)
- ✅ **Uptime:** 99.9%

---

## Option 1: Use Pre-made Account (Fastest ⚡)

```bash
# Login with pre-existing account
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "beta-tester-1@feedia.dev",
    "password": "BetaTest123!"
  }'
```

**Response:**
```json
{
  "user": {"id": "...", "email": "beta-tester-1@feedia.dev", "username": "betatester1"},
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": "15m"
}
```

**Save the `accessToken`** — use it in all other calls as:
```bash
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Option 2: Create Your Own Account (2 Minutes)

```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "YourSecurePass123!",
    "username": "your_username"
  }'
```

**Keep both tokens safe:**
- `accessToken` — expires in 15 min (use for requests)
- `refreshToken` — expires in 30 days (refresh access token)

---

## Essential Commands (Copy & Paste)

### 1. Check your profile
```bash
curl https://web-production-fa7b5.up.railway.app/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. View your consumption
```bash
curl https://web-production-fa7b5.up.railway.app/api/users/usage \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Upload a post
```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/content \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Test Post",
    "contentType": "post",
    "fileUrl": "https://example.com/image.jpg",
    "fileSize": 2.5,
    "fileSizeUnit": "mb",
    "platform": "instagram"
  }'
```

### 4. List your content
```bash
curl https://web-production-fa7b5.up.railway.app/api/content \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Create API key
```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/users/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "expiresIn": "90d"}'
```

**Save the returned `apiKey` securely!**

---

## What to Test (Priority Order)

### 🔴 CRITICAL (Do First)
- [ ] Register/login works
- [ ] Can upload content
- [ ] Storage tracked correctly
- [ ] Can create API key

### 🟡 IMPORTANT
- [ ] Update profile
- [ ] Filter content by platform
- [ ] Check usage stats
- [ ] Refresh token works

### 🟢 NICE TO HAVE
- [ ] Publish content
- [ ] Revoke API key
- [ ] Test error cases
- [ ] Performance acceptable

---

## Bug Report Template

Found a bug? Send to: **lucasdmarin@gmail.com**

```
TITLE: [Brief description]

ENDPOINT:
POST /api/auth/login

EXPECTED:
Should return accessToken and refreshToken

ACTUAL:
Returns 400 error "Invalid credentials"

REPRODUCE:
1. POST /api/auth/login
2. Email: test@example.com
3. Password: WrongPass

RESPONSE:
{
  "error": "Invalid email or password"
}

SCREENSHOTS:
[If applicable]
```

---

## Common Issues & Solutions

### ❌ "Unauthorized" (401)
**Issue:** Access token expired or invalid  
**Fix:** Use refresh token to get new access token:
```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### ❌ "Missing Authorization" header
**Issue:** Forgot to include token  
**Fix:** Add this to EVERY request (except register/login):
```bash
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### ❌ "Not Found" (404)
**Issue:** Endpoint doesn't exist  
**Fix:** Check spelling, use correct URL:
- ✅ `/api/users/me`
- ❌ `/api/user/me`
- ❌ `/api/users`

### ❌ "Rate Limited" (429)
**Issue:** Too many requests  
**Fix:** Wait a few seconds, try again. Max 100 req/minute.

### ❌ "Server Error" (500)
**Issue:** Something broke  
**Fix:** Report to lucasdmarin@gmail.com with:
- Endpoint URL
- Request payload
- Full error response

---

## Tier Limits (Your Plan)

```
FREE TIER:
├─ Storage: 5 GB
├─ API Calls: 1,000/month
├─ Video Storage: None
└─ Content Limit: 50 posts

PRO TIER:
├─ Storage: 50 GB
├─ API Calls: 10,000/month
├─ Video Storage: 100 GB
└─ Content Limit: Unlimited

AGENCY TIER:
├─ Storage: Custom
├─ API Calls: Custom
├─ Video Storage: Custom
└─ Content Limit: Unlimited
```

---

## Help & Support

| Need | Where |
|------|-------|
| API Docs | [BETA_TESTERS_GUIDE.md](./BETA_TESTERS_GUIDE.md) |
| Full Testing Guide | [BETA_TESTER_ROSTER.md](./BETA_TESTER_ROSTER.md) |
| Report Bugs | lucasdmarin@gmail.com |
| System Status | https://web-production-fa7b5.up.railway.app/health |

---

## You're Ready! 🚀

1. Choose Option 1 or 2 above
2. Run 1-2 of the Essential Commands
3. Start testing from the "What to Test" checklist
4. Report bugs as you find them
5. Enjoy early access! 🎉

---

**Questions?** Email: lucasdmarin@gmail.com  
**Timeline:** Aug 23 - Sep 6, 2026
