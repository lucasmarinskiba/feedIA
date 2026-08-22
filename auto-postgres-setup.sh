#!/bin/bash

# Auto-setup Postgres en Railway
# Intenta crear BD si no existe

set -e

PROJECT_ID="56f3ba0b-e6e0-4675-9645-e219b3629dab"
BASE_URL="https://railway.app/project/$PROJECT_ID"

echo "🔍 Checking PostgreSQL status..."
echo ""

# Check if postgres service exists
if railway service list 2>&1 | grep -q "postgres"; then
  echo "✅ PostgreSQL service found"

  # Get the connection string
  echo ""
  echo "Getting connection details..."
  POSTGRES_URL=$(railway service postgres 2>&1 | grep -i "connection\|postgresql\|url" || echo "")

  if [ -z "$POSTGRES_URL" ]; then
    echo "⚠️  Could not auto-extract URL"
    echo ""
    echo "Manual setup needed:"
    echo "1. Go: $BASE_URL"
    echo "2. Click: postgres service → Connect"
    echo "3. Copy: PostgreSQL URL"
    echo "4. Run: railway variable DATABASE_URL '<paste_url>'"
    echo "5. Then: railway deploy"
    exit 1
  fi

  echo "Setting DATABASE_URL..."
  railway variable DATABASE_URL "$POSTGRES_URL" 2>&1 || true

  echo ""
  echo "Deploying..."
  railway deploy 2>&1 || true

else
  echo "❌ PostgreSQL NOT found in Railway"
  echo ""
  echo "Manual Creation Required:"
  echo "================================"
  echo ""
  echo "1. Open: $BASE_URL"
  echo ""
  echo "2. Click: 'New' button (top right)"
  echo ""
  echo "3. Click: 'Database'"
  echo ""
  echo "4. Click: 'PostgreSQL'"
  echo ""
  echo "5. Wait: ~60 seconds (status shows Building → Online)"
  echo ""
  echo "6. When Online, return here and run:"
  echo "   $0"
  echo ""
  exit 1
fi

echo ""
echo "✅ Postgres configured!"
echo ""
echo "Next: Wait for deploy to finish, then verify:"
echo "  ./test-postgres-setup.sh"
echo ""
