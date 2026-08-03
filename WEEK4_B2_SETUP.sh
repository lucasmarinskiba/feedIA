#!/bin/bash

# Backblaze B2 Setup Script for FeedIA
# Week 4: Migration from Wasabi to B2
# Usage: bash WEEK4_B2_SETUP.sh

set -e

echo "🚀 FeedIA Backblaze B2 Setup"
echo "=============================="

# Check env vars
echo "✓ Checking environment variables..."

if [ -z "$BACKBLAZE_KEY_ID" ]; then
  echo "❌ BACKBLAZE_KEY_ID not set"
  echo "   Get from: https://secure.backblaze.com/app_keys.htm"
  exit 1
fi

if [ -z "$BACKBLAZE_APP_KEY" ]; then
  echo "❌ BACKBLAZE_APP_KEY not set"
  exit 1
fi

if [ -z "$BACKBLAZE_BUCKET_NAME" ]; then
  BACKBLAZE_BUCKET_NAME="feedia-carousels"
  echo "⚠️  BACKBLAZE_BUCKET_NAME not set, using default: $BACKBLAZE_BUCKET_NAME"
fi

# Test connection
echo "✓ Testing Backblaze connection..."

B2_ENDPOINT="https://api001.backblazeb2.com"
AUTH_HEADER="Authorization: Basic $(echo -n "$BACKBLAZE_KEY_ID:$BACKBLAZE_APP_KEY" | base64)"

RESPONSE=$(curl -s -H "$AUTH_HEADER" "$B2_ENDPOINT/b2api/v3/b2_authorize_account")

if echo "$RESPONSE" | grep -q "authorizationToken"; then
  echo "✅ Backblaze authentication successful"
else
  echo "❌ Backblaze authentication failed"
  echo "   Response: $RESPONSE"
  exit 1
fi

# Test bucket access
echo "✓ Testing bucket access ($BACKBLAZE_BUCKET_NAME)..."

BUCKET_RESPONSE=$(curl -s -H "$AUTH_HEADER" \
  "$B2_ENDPOINT/b2api/v3/b2_list_buckets?bucketName=$BACKBLAZE_BUCKET_NAME")

if echo "$BUCKET_RESPONSE" | grep -q "$BACKBLAZE_BUCKET_NAME"; then
  echo "✅ Bucket found and accessible"
else
  echo "❌ Bucket not found or not accessible"
  echo "   Create at: https://secure.backblaze.com/b2_buckets.htm"
  exit 1
fi

# Check existing Wasabi config
echo "✓ Checking Wasabi migration prerequisites..."

if [ -z "$WASABI_ACCESS_KEY" ]; then
  echo "⚠️  WASABI_ACCESS_KEY not set"
  echo "   Migration script will skip Wasabi sync"
else
  echo "✅ Wasabi credentials found (ready for migration)"
fi

# Update Railway env vars
echo "✓ Updating Railway environment variables..."

if command -v railway &> /dev/null; then
  railway vars set \
    BACKBLAZE_KEY_ID="$BACKBLAZE_KEY_ID" \
    BACKBLAZE_APP_KEY="$BACKBLAZE_APP_KEY" \
    BACKBLAZE_BUCKET_NAME="$BACKBLAZE_BUCKET_NAME"

  echo "✅ Railway environment updated"
else
  echo "⚠️  Railway CLI not installed"
  echo "   Manually set vars in Railway dashboard:"
  echo "   - BACKBLAZE_KEY_ID=$BACKBLAZE_KEY_ID"
  echo "   - BACKBLAZE_APP_KEY=***"
  echo "   - BACKBLAZE_BUCKET_NAME=$BACKBLAZE_BUCKET_NAME"
fi

# Display next steps
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review WEEK4_BACKBLAZE_MIGRATION.md"
echo "2. Run migration script: npm run migrate:wasabi-to-b2"
echo "3. Monitor progress: railway logs -f"
echo "4. Update Stripe pricing tiers"
echo "5. Announce to users: 5x storage, same price"
echo ""
echo "Estimated migration time: 2-4 hours (1TB)"
echo "Zero downtime - files available from Backblaze during migration"
