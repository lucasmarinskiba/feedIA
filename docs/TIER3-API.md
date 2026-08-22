# Tier 3 — Authentication, RBAC, Batch, Webhooks

Production-ready API layer for user authentication, role-based access control, batch operations, and webhooks.

## 🔐 Authentication Endpoints

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123",
  "username": "username"
}

Response (201):
{
  "user": { "id": "uuid", "email": "...", "username": "..." },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "expiresIn": "15m"
}
```

### Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepass123"
}

Response (200):
{
  "user": { "id": "uuid", "email": "...", "username": "..." },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "expiresIn": "15m"
}
```

### Refresh Token
```bash
POST /api/auth/refresh
{
  "refreshToken": "refresh_token"
}

Response (200):
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token",
  "expiresIn": "15m"
}
```

### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <accessToken>

Response (200):
{
  "message": "Logged out from all devices"
}
```

## 🛡️ RBAC (Role-Based Access Control)

### Tier Permissions

**Free Tier:**
- Campaigns: 5 per month
- Batch size: 1 item
- Custom branding: ❌
- Analytics depth: Basic
- API calls: 10K/month

**Pro Tier:**
- Campaigns: 50 per month
- Batch size: 10 items
- Custom branding: ✓
- Analytics depth: Advanced
- API calls: 100K/month

**Agency Tier:**
- Campaigns: Unlimited
- Batch size: 100 items
- Custom branding: ✓
- Analytics depth: Advanced
- API calls: 1M/month

### Middleware Stack
```typescript
app.post('/api/campaigns',
  verifyJWT,           // Check token
  checkTier,           // Load user tier
  checkCampaignLimit,  // Verify not over limit
  createCampaign       // Create resource
);
```

## 📦 Batch Operations

Create multiple campaigns in one request with async processing.

### Create Batch (Campaign)
```bash
POST /api/batch/campaigns
Authorization: Bearer <accessToken>

{
  "campaigns": [
    {
      "name": "Campaign 1",
      "platform": "tiktok",
      "niche": "skincare"
    },
    {
      "name": "Campaign 2",
      "platform": "instagram",
      "niche": "fitness"
    }
  ]
}

Response (202 Accepted):
{
  "jobId": "uuid",
  "status": "processing",
  "created_count": 0,
  "total_count": 2
}
```

### Get Batch Status
```bash
GET /api/batch/{jobId}
Authorization: Bearer <accessToken>

Response (200):
{
  "id": "uuid",
  "status": "completed",
  "progress": { "input": 2, "output": 2 },
  "result": {
    "created": ["uuid1", "uuid2"],
    "success": 2,
    "failed": 0
  }
}
```

### List Batch Jobs
```bash
GET /api/batch?status=completed&limit=50
Authorization: Bearer <accessToken>

Response:
{
  "jobs": [
    { "id": "uuid", "job_type": "generate", "status": "completed", ... }
  ],
  "total": 1
}
```

### Cancel Batch Job
```bash
POST /api/batch/{jobId}/cancel
Authorization: Bearer <accessToken>

Response (200):
{
  "message": "Batch job cancelled"
}
```

## 🪝 Webhooks

Subscribe to events and receive real-time notifications.

### Subscribe to Events
```bash
POST /api/webhooks
Authorization: Bearer <accessToken>

{
  "url": "https://your-domain.com/webhook",
  "eventTypes": ["campaign.created", "campaign.published", "content.published"]
}

Response (201):
{
  "id": "webhook_uuid",
  "url": "https://...",
  "eventTypes": ["campaign.created", "campaign.published", ...],
  "isActive": true
}
```

### List Webhooks
```bash
GET /api/webhooks
Authorization: Bearer <accessToken>

Response:
{
  "webhooks": [
    {
      "id": "webhook_uuid",
      "url": "https://...",
      "eventTypes": [...],
      "isActive": true,
      "createdAt": "2026-08-22T...",
      "lastTriggered": "2026-08-22T..."
    }
  ]
}
```

### Test Webhook
```bash
POST /api/webhooks/{webhookId}/test
Authorization: Bearer <accessToken>

Response (200):
{
  "message": "Test payload delivered",
  "statusCode": 200
}
```

### Delete Webhook
```bash
DELETE /api/webhooks/{webhookId}
Authorization: Bearer <accessToken>

Response (200):
{
  "message": "Webhook deleted"
}
```

### Webhook Payload Format
All events sent to your webhook URL:

```json
{
  "event": "campaign.created",
  "timestamp": "2026-08-22T14:30:00Z",
  "data": {
    "campaign_id": "uuid",
    "name": "My Campaign",
    "platform": "tiktok",
    "niche": "skincare"
  }
}
```

### Retry Policy
Failed deliveries retry with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 5 seconds
- Attempt 3: 30 seconds
- Attempt 4: 5 minutes

After 3 failed retries, delivery is abandoned and marked as failed.

## 🔑 Authentication Flow

### 1. Register or Login
```
POST /api/auth/register → Get accessToken + refreshToken
```

### 2. Use Access Token
```
Authorization: Bearer {accessToken}
```

### 3. Refresh When Expired
```
POST /api/auth/refresh → Get new accessToken
```

### 4. Logout
```
POST /api/auth/logout → Revoke all sessions
```

## 📊 Database Schema

### users
- id, email, password_hash, username, created_at, last_login

### user_sessions
- id, user_id, refresh_token, refresh_token_expires_at

### user_tiers
- id, user_id, tier, campaigns_used, campaigns_limit, batch_limit, ...

### batch_jobs
- id, user_id, job_type, status, input, output, created_at, started_at, completed_at

### webhooks
- id, user_id, url, event_types, is_active, created_at, last_triggered

### webhook_deliveries
- id, webhook_id, event_id, status, retry_count, error_message

## ⚡ Error Responses

### 400 Bad Request
```json
{ "error": "Email and password required" }
```

### 401 Unauthorized
```json
{ "error": "Invalid token" }
```

### 403 Forbidden (RBAC)
```json
{
  "error": "Campaign limit reached",
  "limit": 5,
  "used": 5,
  "tier": "free"
}
```

### 409 Conflict
```json
{ "error": "User already exists" }
```

### 500 Internal Server Error
```json
{ "error": "Batch creation failed" }
```

## 🚀 Quick Start

```typescript
import { registerTier3Routes, registerHealthCheck } from './src/api/tier3-routes.js';
import express from 'express';

const app = express();

app.use(express.json());

registerTier3Routes(app);
registerHealthCheck(app);

app.listen(3000, () => {
  console.log('Tier 3 API running on :3000');
});
```

## 📈 Monitoring

### Health Check
```bash
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2026-08-22T14:30:00Z",
  "systems": ["auth", "database", "batch", "webhooks"]
}
```

## 🔒 Security

- Passwords hashed with bcrypt (12 rounds)
- JWTs signed with HS256
- Refresh tokens rotated on use
- Webhook deliveries HTTPS-only
- Rate limiting on auth endpoints
- CORS enabled for trusted origins
