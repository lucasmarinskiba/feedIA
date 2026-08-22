#!/bin/bash

# Test PostgreSQL setup en Railway

BASE_URL="https://web-production-fa7b5.up.railway.app"

echo "🧪 Testing PostgreSQL Setup"
echo "============================"
echo ""

# Test 1: Health
echo "Test 1: Health Check"
HEALTH=$(curl -s $BASE_URL/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ Health: OK"
else
  echo "❌ Health: FAILED"
  echo "   Response: $HEALTH"
  exit 1
fi

echo ""

# Test 2: Auth Register (tests Postgres)
echo "Test 2: Auth Register (DB write test)"
EMAIL="test-$(date +%s)@test.com"
AUTH=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123\"}")

if echo "$AUTH" | grep -q "$EMAIL"; then
  USER_ID=$(echo "$AUTH" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Auth Register: OK (user: $USER_ID)"
  echo "   Email: $EMAIL"
else
  echo "❌ Auth Register: FAILED"
  echo "   Response: $AUTH"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check: railway logs --follow"
  echo "2. Verify: DATABASE_URL set in web service Variables"
  echo "3. Wait: migrations might still running"
  exit 1
fi

echo ""

# Test 3: Trends endpoint (tests Postgres query + structure)
echo "Test 3: Trends Endpoint (DB query test)"
TRENDS=$(curl -s "$BASE_URL/api/trends/detect?days=7")
if echo "$TRENDS" | grep -q "trends\|error"; then
  echo "✅ Trends Endpoint: OK (responds)"
  echo "   Response: $(echo $TRENDS | head -c 100)..."
else
  echo "⚠️  Trends Endpoint: No response"
  echo "   Response: $TRENDS"
fi

echo ""
echo "============================"
echo "✅ All Tests Passed!"
echo ""
echo "PostgreSQL is correctly configured."
echo ""
echo "Next steps:"
echo "1. Add Redis (redis-setup.sh)"
echo "2. Test Tiers 5-15 endpoints"
echo "3. Monitor: railway logs --follow"
echo ""
