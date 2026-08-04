#!/bin/bash

# Carousel Infrastructure Test Runner
# Usage: ./test-carousel-endpoints.sh https://your-railway-backend.railway.app

BASE_URL="${1:-https://feedia.vercel.app}"

if [ -z "$1" ]; then
  echo "USAGE: $0 <base_url>"
  echo "Example: $0 https://your-railway-backend.railway.app"
  echo ""
  echo "Note: feedia.vercel.app is frontend-only. Use the Railway backend URL."
  exit 1
fi

echo "======================================"
echo "Carousel Infrastructure Test Suite"
echo "======================================"
echo "Base URL: $BASE_URL"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
  local method=$1
  local path=$2
  local data=$3
  local expected_status=$4
  local description=$5

  echo -n "Testing $description... "

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$path" -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ $expected_status ]]; then
    echo -e "${GREEN}✓ $http_code${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    if [ ! -z "$body" ]; then
      echo "  Response: $(echo $body | head -c 100)..."
    fi
  else
    echo -e "${RED}✗ Expected $expected_status, got $http_code${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""
}

# Test 1: Create carousel with validation
echo "=== SECTION 1: CREATION ==="
test_endpoint "POST" "/api/carousels/create" \
  '{"userId":"test-user-001","title":"Test Carousel","format":"carousel","slides":[{"slideNumber":1,"headline":"Welcome","body":"Test content","cta":"Learn more"}],"platform":"instagram"}' \
  "201|200" \
  "Create carousel with validation"

# Test 2: Get carousel list (no carousels yet expected)
test_endpoint "GET" "/api/carousels/user/test-user-001" \
  "" \
  "200" \
  "List user carousels"

# Test 3: Validate carousel
test_endpoint "POST" "/api/carousels/quality/validate" \
  '{"id":"test-1","userId":"test-user","title":"Valid Carousel","format":"carousel","slides":[{"slideNumber":1,"headline":"Title","body":"Body","cta":"CTA"}],"metadata":{"createdAt":"2026-08-04","updatedAt":"2026-08-04","status":"draft","platform":"instagram"}}' \
  "200" \
  "Validate carousel content"

# Test 4: Track event
test_endpoint "POST" "/api/carousels/carousel-1/events" \
  '{"eventType":"view","source":"instagram","userAgent":"Mobile"}' \
  "200" \
  "Track carousel event"

# Test 5: Get metrics
test_endpoint "GET" "/api/carousels/carousel-1/metrics" \
  "" \
  "200|404" \
  "Get carousel metrics"

# Test 6: Get analytics
test_endpoint "GET" "/api/analytics/carousel/carousel-1" \
  "" \
  "200|404" \
  "Get carousel analytics"

# Test 7: User analytics
test_endpoint "GET" "/api/analytics/user/test-user-001" \
  "" \
  "200" \
  "Get user analytics"

# Test 8: Batch create
test_endpoint "POST" "/api/carousels/batch-create" \
  '[{"userId":"u1","title":"C1","format":"carousel","slides":[{"slideNumber":1,"headline":"H","body":"B","cta":"C"}],"platform":"instagram"}]' \
  "201|207|200" \
  "Batch create carousels"

# Test 9: Compare carousels
test_endpoint "POST" "/api/analytics/compare" \
  '{"carousel_ids":["id1","id2"]}' \
  "200" \
  "Compare carousels"

# Test 10: Health check (if exists)
test_endpoint "GET" "/api/admin/health" \
  "" \
  "200|404" \
  "Health endpoint"

echo ""
echo "======================================"
echo "Test Results"
echo "======================================"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "======================================"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}Some tests failed. Check Railway deployment.${NC}"
  exit 1
fi
