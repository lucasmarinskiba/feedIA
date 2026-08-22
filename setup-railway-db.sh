#!/bin/bash
# Automated Railway PostgreSQL + Redis setup (requires Railway API token)

set -e

echo "🚀 Railway Database Setup — Postgres + Redis"
echo "=================================================="
echo ""

# Check for Railway CLI
if ! command -v railway &> /dev/null; then
  echo "❌ Railway CLI not found. Install via:"
  echo "   npm install -g @railway/cli"
  exit 1
fi

# Check for API token
if [ -z "$RAILWAY_API_TOKEN" ] && [ -z "$RAILWAY_TOKEN" ]; then
  echo "ℹ️  Manual setup required:"
  echo ""
  echo "Step 1: Get Railway API Token"
  echo "  - Go: https://railway.app/account/tokens"
  echo "  - Create new token"
  echo "  - Set env: export RAILWAY_API_TOKEN=<token>"
  echo ""
  echo "Step 2: Run this script again"
  echo "  ./setup-railway-db.sh"
  exit 0
fi

PROJECT_ID="56f3ba0b-e6e0-4675-9645-e219b3629dab"

echo "✅ API Token found"
echo "📍 Project: $PROJECT_ID"
echo ""

# Check existing services
echo "Checking existing services..."
railway status 2>/dev/null || echo "⚠️  Could not check status"

echo ""
echo "Manual Setup Required (Dashboard):"
echo "===================================="
echo ""
echo "1️⃣  Add PostgreSQL:"
echo "   - Go: https://railway.app/project/$PROJECT_ID"
echo "   - Click: New → Database → PostgreSQL"
echo "   - Wait for startup"
echo ""
echo "2️⃣  Add Redis:"
echo "   - Click: New → Database → Redis"
echo "   - Wait for startup"
echo ""
echo "3️⃣  Connect to Web Service:"
echo "   - Click: postgres_production → Connect"
echo "   - Copy PostgreSQL URL"
echo "   - Go: web service → Variables"
echo "   - Add: DATABASE_URL = <postgres_url>"
echo ""
echo "   - Click: redis_production → Connect"
echo "   - Copy Redis URL"
echo "   - Go: web service → Variables"
echo "   - Add: REDIS_URL = <redis_url>"
echo ""
echo "4️⃣  Redeploy Web:"
echo "   - Click: web → Deploy button"
echo "   - Wait for ✅ Online"
echo ""
echo "Then run:"
echo "  ./verify-db.sh"
echo ""
