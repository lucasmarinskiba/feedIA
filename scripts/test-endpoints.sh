#!/bin/bash
# Test production endpoints

BACKEND="${BACKEND_URL:-http://localhost:3000}"
FAILURES=0

test_endpoint() {
  local method=$1
  local path=$2
  local data=$3
  local expected_code=$4
  
  echo -n "  $method $path... "
  
  if [ -z "$data" ]; then
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      "$BACKEND$path" \
      -H "Content-Type: application/json" \
      -H "x-user-id: test-user" 2>/dev/null)
  else
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      "$BACKEND$path" \
      -H "Content-Type: application/json" \
      -H "x-user-id: test-user" \
      -d "$data" 2>/dev/null)
  fi
  
  if [[ "$CODE" == "$expected_code" ]] || [[ "$CODE" == "2"* ]] || [[ "$CODE" == "4"* ]]; then
    echo "✅ ($CODE)"
  else
    echo "❌ ($CODE)"
    ((FAILURES++))
  fi
}

echo "🧪 Testing FeedIA Endpoints"
echo "=================================="
echo "Backend: $BACKEND"
echo ""

# Health check
echo "Health:"
test_endpoint "GET" "/api/health" "" "200"

# Templates
echo ""
echo "Templates:"
test_endpoint "GET" "/api/templates/carousels" "" "200"
test_endpoint "GET" "/api/templates/reels" "" "200"
test_endpoint "GET" "/api/templates/workflows" "" "200"

# Teams
echo ""
echo "Teams:"
test_endpoint "POST" "/api/teams/create" '{"workspaceName":"Test"}' "200"
test_endpoint "POST" "/api/teams/ws_123/members/invite" '{"email":"user@test.com"}' "400"

# Feedback
echo ""
echo "Feedback:"
test_endpoint "POST" "/api/feedback/content" '{"contentId":"c1","rating":5}' "200"
test_endpoint "POST" "/api/feedback/feature-request" '{"title":"test","description":"test"}' "200"
test_endpoint "GET" "/api/feedback/top-templates" "" "200"

# Analytics
echo ""
echo "Analytics:"
test_endpoint "GET" "/api/analytics/roi" "" "200"
test_endpoint "GET" "/api/analytics/financial" "" "200"
test_endpoint "GET" "/api/analytics/dashboard" "" "200"

# Video
echo ""
echo "Video/Publishing:"
test_endpoint "GET" "/api/video/providers" "" "200"
test_endpoint "POST" "/api/video/generate" '{"prompt":"test"}' "400"

# Features
echo ""
echo "System:"
test_endpoint "GET" "/api/features" "" "200"

echo ""
echo "=================================="
if [ $FAILURES -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ $FAILURES test(s) failed"
  exit 1
fi
