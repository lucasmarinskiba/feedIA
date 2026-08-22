#!/bin/bash

# Verify Railway PostgreSQL setup

echo "═══════════════════════════════════════════════"
echo "  Railway PostgreSQL Verification"
echo "═══════════════════════════════════════════════"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set in environment"
  echo ""
  echo "Quick fix:"
  echo "1. Go to: https://railway.app/project/56f3ba0b-e6e0-4675-9645-e219b3629dab"
  echo "2. Click 'web' service → 'Variables' tab"
  echo "3. Add: DATABASE_URL = (copy from postgres_production Connect tab)"
  echo "4. Redeploy"
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Parse URL
PGHOST=$(echo $DATABASE_URL | sed -E 's|.*@([^:]+):.*|\1|')
PGPORT=$(echo $DATABASE_URL | sed -E 's|.*:([0-9]+)/.*|\1|')
PGDATABASE=$(echo $DATABASE_URL | sed -E 's|.*/([^?]*).*|\1|')
PGUSER=$(echo $DATABASE_URL | sed -E 's|.*://([^:]+):.*|\1|')

echo "Connection Details:"
echo "  Host: $PGHOST"
echo "  Port: $PGPORT"
echo "  Database: $PGDATABASE"
echo "  User: $PGUSER"
echo ""

# Test connection
echo "Testing connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ PostgreSQL connection successful"
else
  echo "❌ Cannot connect to PostgreSQL"
  echo "  Ensure postgres_production is running and DATABASE_URL is valid"
  exit 1
fi

echo ""

# Check tables
echo "Checking tables..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "✅ Database has $TABLE_COUNT tables (migrations ran)"

  # List tables
  echo ""
  echo "Tables:"
  psql "$DATABASE_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null | sed 's/^/  - /'
else
  echo "⚠️  No tables found. Run migrations:"
  echo "  npm run build && npm start"
  echo "  (migrations auto-run on startup)"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ PostgreSQL setup complete!"
echo ""
echo "Next steps:"
echo "1. Test endpoints:"
echo "   curl https://web-production-fa7b5.up.railway.app/api/trends/detect"
echo ""
echo "2. Check logs:"
echo "   railway logs --follow"
echo ""
echo "═══════════════════════════════════════════════"
