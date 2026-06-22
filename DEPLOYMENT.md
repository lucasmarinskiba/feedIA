# Deployment Guide

## Production Deployment Steps

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.production

# Edit with production values
nano .env.production

# Required:
- INSTAGRAM_CLIENT_ID, CLIENT_SECRET
- TIKTOK_CLIENT_ID, CLIENT_SECRET
- ANTHROPIC_API_KEY
- JWT_SECRET (strong random string)
- ENCRYPTION_KEY (for credential storage)
```

### 2. OAuth Setup

#### Instagram

1. Go to `developers.facebook.com`
2. Create app (Instagram Business)
3. Add Instagram Basic Display product
4. Get App ID + App Secret
5. Set Valid OAuth Redirect URIs: `https://yourdomain.com/auth/instagram/callback`

#### TikTok

1. Go to `developers.tiktok.com`
2. Create developer account
3. Create app (In-app Browser)
4. Get Client Key + Client Secret
5. Set Redirect URL: `https://yourdomain.com/auth/tiktok/callback`

### 3. Database (Optional)

```bash
# Create PostgreSQL database
createdb agente-ia-production

# Run migrations
npm run migrate

# Seed (optional)
npm run seed
```

### 4. Build + Test

```bash
# Install dependencies
npm install --production

# Build
npm run build

# Test
npm run test:e2e

# Lint check
npm run lint
```

### 5. Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

Deploy:

```bash
docker build -t agente-ia:latest .
docker run -p 3000:3000 --env-file .env.production agente-ia:latest
```

### 6. Connect Accounts

#### Via OAuth Flow

```bash
# Start auth server
npm run start

# User visits: http://localhost:3000/auth/instagram
# User visits: http://localhost:3000/auth/tiktok

# Credentials stored securely in database
```

#### Verify Connection

```bash
curl http://localhost:3000/api/accounts
# Response:
{
  "accounts": [
    {
      "id": "instagram-123456",
      "handle": "@yourhandle",
      "platform": "instagram",
      "status": "active",
      "connected_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 7. Start Agent

```bash
# Initialize agent with connected accounts
npm run agent:init

# Query agent
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "account": "instagram-123456",
    "action": "create_post",
    "params": {
      "headline": "New Product Launch 🚀",
      "type": "reel",
      "cta": true
    }
  }'
```

### 8. Monitoring

```bash
# Logs
tail -f logs/production.log

# Metrics
curl http://localhost:3000/metrics

# Health check
curl http://localhost:3000/health
```

## Production Checklist

- [ ] Environment variables set (prod values)
- [ ] OAuth credentials configured
- [ ] Database running + migrated
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Monitoring + logging active
- [ ] Backup strategy in place
- [ ] Credentials encrypted at rest
- [ ] API keys rotated (monthly)
- [ ] Tests passing
- [ ] Load balancer configured (if needed)

## Scaling

### High Volume (10K+ posts/month)

1. **Database**: Use read replicas for analytics
2. **Queue**: Redis for async job processing
3. **Cache**: Redis for credentials + metrics
4. **Load Balancer**: Distribute across multiple instances
5. **CDN**: Cache design assets

### Configuration

```javascript
// config/production.js
{
  agent: {
    maxConcurrentPosts: 10,
    retryAttempts: 3,
    timeout: 300000,
  },
  queue: {
    workers: 5,
    visibilityTimeout: 600,
  },
  cache: {
    ttl: 3600,
    maxSize: 1000,
  },
}
```

## Troubleshooting

### OAuth Token Expired

```bash
# Auto-refresh (happens automatically)
# Or manual:
curl -X POST http://localhost:3000/api/accounts/{id}/refresh
```

### Post Failed

```bash
# Check logs
grep "POST_FAILED" logs/production.log

# Retry
curl -X POST http://localhost:3000/api/posts/{id}/retry
```

### High Memory Usage

```bash
# Check predictions cache
curl http://localhost:3000/api/cache/stats

# Clear cache
curl -X DELETE http://localhost:3000/api/cache
```

## Support

Email: support@agente-ia.com
Docs: https://docs.agente-ia.com
Status: https://status.agente-ia.com
