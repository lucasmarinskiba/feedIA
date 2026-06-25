# Platform API Setup Guide

FeedIA integrates with Instagram (Meta) and TikTok to fetch real platform metrics for the achievement system.

## Environment Variables

### Instagram/Meta (Graph API v18.0)

```bash
META_ACCESS_TOKEN=your_meta_access_token_here
META_IG_BUSINESS_ID=your_ig_business_account_id
META_PAGE_ID=your_facebook_page_id  # Optional
```

**How to get these:**

1. Go to [Meta Business Suite](https://business.facebook.com)
2. Create/select Business Account
3. Go to Settings → Users and Permissions → Admins
4. Add yourself if not already
5. Go to Settings → Accounts → Instagram Accounts
6. Select your Instagram Business Account
7. Get the `IG_BUSINESS_ID` from Account Settings
8. Generate long-lived access token via [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - App: Select your app
   - GET access_token
   - Permissions: `instagram_business_content_read`

**API Endpoint:**
```
GET https://graph.facebook.com/v18.0/{IG_BUSINESS_ID}?fields=followers_count,follows_count,media_count,username
```

---

### TikTok (Display API v2)

```bash
TIKTOK_ACCESS_TOKEN=your_tiktok_access_token
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_OPEN_ID=your_tiktok_open_id
```

**How to get these:**

1. Go to [TikTok Developer Portal](https://developer.tiktok.com)
2. Create new Application
3. Choose "Display API" in product selection
4. Configure OAuth redirect URI: `http://localhost:3000/auth/callback/tiktok` (for local dev)
5. Get Client Key & Client Secret from App Settings
6. After user authorizes, get Access Token and Open ID from OAuth flow

**API Endpoint:**
```
GET https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,video_count,likes_count,username
Authorization: Bearer {ACCESS_TOKEN}
```

---

## Data Flow

```
1. Daily Job (11pm): growth-daily-snapshot
2. Fetch Instagram Profile → fetchInstagramProfile()
3. Fetch TikTok Profile → fetchTikTokProfile()
4. Record to DailyMetricSnapshot with platform-specific fields:
   - tiktokFollowers
   - tiktokEngagement24h
   - instagramFollowers
   - instagramTotalLikes
5. Achievement system reads from getRecentDailyMetrics()
6. Evaluators: (last?.tiktokFollowers ?? 0) >= 100
```

## Fallback Behavior

If tokens are missing or API calls fail:
- ✅ System returns mock data (followers: 0)
- ✅ App continues to work
- ✅ Achievements won't unlock (safe state)
- ⚠️ Logs warning: `[platformProfiles] fetch failed`

## Testing

### Local Dev (without real credentials)

```bash
# Set dummy values
export META_ACCESS_TOKEN=test-token
export TIKTOK_ACCESS_TOKEN=test-token

# App will return mock data, no real API calls made
npm run dev
```

### With Real Credentials

```bash
# Set real values in .env
echo "META_ACCESS_TOKEN=..." >> .env
echo "TIKTOK_ACCESS_TOKEN=..." >> .env

# Restart app
npm run dev

# Check logs
tail -f logs/feedIA.log | grep "platformProfiles"
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `[platformProfiles] TikTok fetch failed 401` | Bad token | Regenerate access token |
| `[platformProfiles] IG fetch failed 400` | Invalid IG_BUSINESS_ID | Verify ID from Account Settings |
| `Cannot read properties of undefined (reading 'followers')` | API response missing field | Check API response format in logs |
| No metrics recorded (all zeros) | Tokens not set | Add tokens to .env |

## Next Steps

1. ✅ API calls configured in platformProfiles.ts
2. ✅ Data wired to daily snapshot job
3. ⚠️ **TODO:** Test with real credentials
4. ⚠️ **TODO:** Add achievement unlock notifications
5. ⚠️ **TODO:** Create UI for platform connection status

