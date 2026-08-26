#!/bin/bash
# MongoDB Atlas Setup for FeedIA Production

set -e

echo "🗄️  MongoDB Atlas Setup"
echo "======================="

# Check required env vars
if [ -z "$MONGODB_URI" ]; then
  echo "❌ MONGODB_URI not set. Get from MongoDB Atlas:"
  echo "   1. Go to https://cloud.mongodb.com"
  echo "   2. Create cluster (M0 free or M2 paid)"
  echo "   3. Create user + password"
  echo "   4. Copy connection string"
  echo ""
  echo "   export MONGODB_URI='mongodb+srv://user:pass@cluster.mongodb.net/feedia?retryWrites=true&w=majority'"
  exit 1
fi

echo "✓ MONGODB_URI configured"

# Test connection
echo "Testing connection..."
npx mongodb-cli ping "$MONGODB_URI" 2>/dev/null || {
  echo "⚠️  Connection test failed. Verify:"
  echo "   - Connection string correct"
  echo "   - Firewall allows your IP (0.0.0.0/0 for dev)"
  echo "   - Database name matches 'feedia'"
  exit 1
}

echo "✓ Connection successful"

# Run migration
echo "Initializing schema..."
npx ts-node db/migrations/001-init-schema.ts

echo ""
echo "✅ MongoDB Atlas ready!"
echo "   Collections created: users, workspaces, content, analytics, invitations, templates, feedback"
echo "   Indexes created: email unique, userId, workspaceId, contentId, platform, TTL"
echo ""
echo "Next: Set MONGODB_URI in Railway environment variables"
