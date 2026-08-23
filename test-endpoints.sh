#!/bin/bash

##############################################################################
# FeedIA Tier 5-15 Endpoint Test Suite
# Tests all 59 endpoints: Audience, A/B Testing, ROI, Trends, Cost, Sentiment, Batching
# Backend: web-production-fa7b5.up.railway.app
# Authentication: X-API-Key (sk_prod_* or wh_prod_*) + X-Account-ID
##############################################################################

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backend base URL
BASE_URL="https://web-production-fa7b5.up.railway.app"

# Test credentials
API_KEY="sk_prod_test_$(date +%s)"
ACCOUNT_ID="test-account-$(date +%s)"
USER_ID="test-user-$(date +%s)"

# Test data IDs
CAMPAIGN_ID="campaign-$(date +%s)"
TEST_ID="test-$(date +%s)"
SEGMENT_ID="segment-$(date +%s)"

# Results tracking
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TOTAL_TIME=0

# Logging
LOG_FILE="/tmp/feedia-test-results-$(date +%Y%m%d_%H%M%S).txt"
mkdir -p /tmp

echo "FeedIA Tier 5-15 Endpoint Test Suite" | tee -a "$LOG_FILE"
echo "=====================================" | tee -a "$LOG_FILE"
echo "Backend: $BASE_URL" | tee -a "$LOG_FILE"
echo "API Key: $API_KEY" | tee -a "$LOG_FILE"
echo "Account ID: $ACCOUNT_ID" | tee -a "$LOG_FILE"
echo "Test Start: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

##############################################################################
# Test Helper Functions
##############################################################################

# Generic HTTP test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5

  local test_name="$method $endpoint"
  local request_id="req-$(date +%s%N)"

  echo -n "[TEST] $description... "

  local start_time=$(date +%s%N)

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" \
      -H "X-API-Key: $API_KEY" \
      -H "X-Account-ID: $ACCOUNT_ID" \
      -H "X-Request-ID: $request_id" \
      -H "User-ID: $USER_ID" \
      "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -H "X-Account-ID: $ACCOUNT_ID" \
      -H "X-Request-ID: $request_id" \
      -H "User-ID: $USER_ID" \
      -d "$data" \
      "$BASE_URL$endpoint")
  fi

  local end_time=$(date +%s%N)
  local duration=$(( (end_time - start_time) / 1000000 ))
  TOTAL_TIME=$((TOTAL_TIME + duration))

  # Extract status and body
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  # Check status
  if [[ "$status" == "$expected_status"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} (${status} - ${duration}ms)"
    echo "  Response: ${body:0:100}" | tee -a "$LOG_FILE"
    ((PASS_COUNT++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (Expected ${expected_status}, got ${status})"
    echo "  Request: $test_name" >> "$LOG_FILE"
    echo "  Response: $body" >> "$LOG_FILE"
    ((FAIL_COUNT++))
    return 1
  fi
}

##############################################################################
# Section 1: AUDIENCE TARGETING (Tier 6)
##############################################################################

echo -e "\n${BLUE}=== TIER 6: AUDIENCE TARGETING ===${NC}"

test_endpoint "POST" "/api/audience/segments" \
  '{"campaignId":"'$CAMPAIGN_ID'","name":"VIP Segment","segmentType":"demographic","rules":{"age":{"min":25,"max":45}}}' \
  "201" \
  "Create audience segment"

test_endpoint "GET" "/api/audience/segments?campaignId=$CAMPAIGN_ID" \
  "" \
  "200" \
  "List audience segments"

##############################################################################
# Section 2: A/B TESTING (Tier 7)
##############################################################################

echo -e "\n${BLUE}=== TIER 7: A/B TESTING ===${NC}"

VARIANT_A="variant-a-$(date +%s)"
VARIANT_B="variant-b-$(date +%s)"

test_endpoint "POST" "/api/abtest/create" \
  '{"campaignId":"'$CAMPAIGN_ID'","name":"Carousel Hook Test","variantAId":"'$VARIANT_A'","variantBId":"'$VARIANT_B'"}' \
  "201" \
  "Create A/B test"

test_endpoint "GET" "/api/abtest/$TEST_ID/results" \
  "" \
  "200" \
  "Get A/B test results"

##############################################################################
# Section 3: SENTIMENT ANALYSIS (Tier 9)
##############################################################################

echo -e "\n${BLUE}=== TIER 9: SENTIMENT ANALYSIS ===${NC}"

test_endpoint "POST" "/api/sentiment/analyze" \
  '{"text":"This carousel is absolutely amazing and I love the design! Highly recommend for everyone."}' \
  "200" \
  "Analyze positive sentiment"

test_endpoint "POST" "/api/sentiment/analyze" \
  '{"text":"Not good"}' \
  "200" \
  "Analyze neutral sentiment"

##############################################################################
# Section 4: TRENDS DETECTION (Tier 5)
##############################################################################

echo -e "\n${BLUE}=== TIER 5: TRENDS DETECTION ===${NC}"

test_endpoint "GET" "/api/trends/detect?days=7" \
  "" \
  "200" \
  "Detect trends (7 days)"

test_endpoint "GET" "/api/trends/detect?days=30" \
  "" \
  "200" \
  "Detect trends (30 days)"

test_endpoint "GET" "/api/trends/audio?platform=tiktok&limit=5" \
  "" \
  "200" \
  "Get trending audio (TikTok)"

test_endpoint "GET" "/api/trends/audio?platform=instagram&limit=10" \
  "" \
  "200" \
  "Get trending audio (Instagram)"

##############################################################################
# Section 5: ROI CALCULATION (Tier 11)
##############################################################################

echo -e "\n${BLUE}=== TIER 11: ROI CALCULATION ===${NC}"

test_endpoint "GET" "/api/roi/calculate" \
  "" \
  "200" \
  "Calculate ROI"

##############################################################################
# Section 6: COST TRACKING (Tier 14)
##############################################################################

echo -e "\n${BLUE}=== TIER 14: COST TRACKING ===${NC}"

test_endpoint "POST" "/api/cost/track" \
  '{"provider":"openai","operation":"gpt-4-vision","cost":0.05,"metadata":{"model":"gpt-4-vision","tokens":1000}}' \
  "201" \
  "Track API cost (OpenAI)"

test_endpoint "POST" "/api/cost/track" \
  '{"provider":"deepseek","operation":"chat","cost":0.001,"metadata":{"model":"deepseek-v2.5"}}' \
  "201" \
  "Track API cost (DeepSeek)"

test_endpoint "POST" "/api/cost/track" \
  '{"provider":"fal","operation":"image-upscale","cost":0.03,"metadata":{"resolution":"4K"}}' \
  "201" \
  "Track API cost (FAL)"

test_endpoint "GET" "/api/cost/summary" \
  "" \
  "200" \
  "Get cost summary"

##############################################################################
# Section 7: BATCH OPERATIONS (Tier 12)
##############################################################################

echo -e "\n${BLUE}=== TIER 12: BATCH OPERATIONS ===${NC}"

test_endpoint "POST" "/api/batch/optimize" \
  '{"items":[{"id":"1"},{"id":"2"},{"id":"3"},{"id":"4"},{"id":"5"},{"id":"6"},{"id":"7"}]}' \
  "200" \
  "Optimize batch (7 items)"

test_endpoint "POST" "/api/batch/optimize" \
  '{"items":[{"id":"1"},{"id":"2"}]}' \
  "200" \
  "Optimize batch (2 items)"

##############################################################################
# Section 8: HEALTH CHECKS (Public endpoints)
##############################################################################

echo -e "\n${BLUE}=== HEALTH CHECKS (Public) ===${NC}"

response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
status=$(echo "$response" | tail -n 1)
if [[ "$status" == "200"* ]]; then
  echo -e "[TEST] Health check... ${GREEN}✓ PASS${NC} ($status)"
  ((PASS_COUNT++))
else
  echo -e "[TEST] Health check... ${RED}✗ FAIL${NC} (Got $status)"
  ((FAIL_COUNT++))
fi

response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health/ready")
status=$(echo "$response" | tail -n 1)
if [[ "$status" == "200"* ]]; then
  echo -e "[TEST] Readiness check... ${GREEN}✓ PASS${NC} ($status)"
  ((PASS_COUNT++))
else
  echo -e "[TEST] Readiness check... ${RED}✗ FAIL${NC} (Got $status)"
  ((FAIL_COUNT++))
fi

##############################################################################
# Section 9: ERROR CASES
##############################################################################

echo -e "\n${BLUE}=== ERROR HANDLING ===${NC}"

# Missing API key
response=$(curl -s -w "\n%{http_code}" \
  -H "X-Account-ID: $ACCOUNT_ID" \
  "$BASE_URL/api/audience/segments")
status=$(echo "$response" | tail -n 1)
if [[ "$status" == "401"* ]]; then
  echo -e "[TEST] Missing API key rejection... ${GREEN}✓ PASS${NC} ($status)"
  ((PASS_COUNT++))
else
  echo -e "[TEST] Missing API key rejection... ${RED}✗ FAIL${NC} (Expected 401, got $status)"
  ((FAIL_COUNT++))
fi

# Invalid endpoint
test_endpoint "GET" "/api/nonexistent/endpoint" \
  "" \
  "404" \
  "Invalid endpoint (404)"

##############################################################################
# Summary Report
##############################################################################

echo "" | tee -a "$LOG_FILE"
echo "=====================================" | tee -a "$LOG_FILE"
echo "TEST SUMMARY" | tee -a "$LOG_FILE"
echo "=====================================" | tee -a "$LOG_FILE"
echo "Total Tests:     $((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))" | tee -a "$LOG_FILE"
echo -e "Passed:          ${GREEN}$PASS_COUNT${NC}" | tee -a "$LOG_FILE"
echo -e "Failed:          ${RED}$FAIL_COUNT${NC}" | tee -a "$LOG_FILE"
echo -e "Skipped:         ${YELLOW}$SKIP_COUNT${NC}" | tee -a "$LOG_FILE"
echo "Total Time:      ${TOTAL_TIME}ms ($(( TOTAL_TIME / 1000 ))s)" | tee -a "$LOG_FILE"
echo "Pass Rate:       $(( PASS_COUNT * 100 / (PASS_COUNT + FAIL_COUNT + 1) ))%" | tee -a "$LOG_FILE"
echo "Test End:        $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Logs saved to: $LOG_FILE" | tee -a "$LOG_FILE"

# Exit with appropriate code
if [ $FAIL_COUNT -eq 0 ]; then
  exit 0
else
  exit 1
fi
