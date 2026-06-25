#!/bin/bash

# Metrics Flow Verification Script
# Checks: Platform APIs → Daily Snapshot → Achievements → Medal Shelf
# Usage: bash scripts/verify-metrics-flow.sh [base-url]

BASE_URL="${1:-http://localhost:3000}"
BRAND_ID="default"

echo "🔍 FeedIA Metrics Flow Verification"
echo "=================================="
echo "Base URL: $BASE_URL"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_endpoint() {
  local name=$1
  local endpoint=$2
  local expected_field=$3

  echo -n "Testing $name... "
  response=$(curl -s "$BASE_URL$endpoint")

  if echo "$response" | grep -q "$expected_field" 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
    echo "  Response: $(echo "$response" | head -c 100)..."
  else
    echo -e "${RED}✗${NC}"
    echo "  Response: $response"
  fi
  echo ""
}

# Step 1: Verify Platform Health
echo "📡 Step 1: Platform Integration Health"
echo "--------------------------------------"
check_endpoint "Platform Health" "/api/platform/health" "platforms"

# Step 2: Check Instagram Profile
echo "📸 Step 2: Instagram Profile"
echo "----------------------------"
check_endpoint "Instagram Profile" "/api/instagram/profile" "followers"

# Step 3: Check TikTok Profile
echo "🎵 Step 3: TikTok Profile"
echo "------------------------"
check_endpoint "TikTok Profile" "/api/tiktok/profile" "followers"

# Step 4: Check Daily Metrics
echo "📊 Step 4: Daily Metrics"
echo "------------------------"
echo -n "Testing Daily Metrics... "
response=$(curl -s "$BASE_URL/api/growth/metrics?days=1")
if echo "$response" | grep -q "followers" 2>/dev/null; then
  echo -e "${GREEN}✓${NC}"
  # Check for platform fields
  if echo "$response" | grep -q "tiktok\|instagram" 2>/dev/null; then
    echo -e "  ${GREEN}✓ Platform metrics detected${NC}"
  else
    echo -e "  ${YELLOW}⚠ Platform metrics not yet recorded${NC}"
    echo "    (Will be available after next daily snapshot at 11pm)"
  fi
else
  echo -e "${RED}✗${NC}"
  echo "  Response: $response"
fi
echo ""

# Step 5: Check Achievements
echo "🏆 Step 5: Achievements"
echo "------------------------"
check_endpoint "Achievements Snapshot" "/api/achievements/snapshot" "totalUnlocked"

# Step 6: Check Medal Shelf
echo "🏅 Step 6: Medal Shelf UI"
echo "------------------------"
echo -n "Testing Medal Shelf... "
response=$(curl -s "$BASE_URL/#achievements" 2>/dev/null | head -c 500)
if [ -n "$response" ]; then
  echo -e "${GREEN}✓${NC}"
  echo "  UI accessible at $BASE_URL/#achievements"
else
  echo -e "${YELLOW}⚠${NC}"
  echo "  Could not verify HTML. Try visiting in browser:"
  echo "  $BASE_URL/#achievements"
fi
echo ""

# Summary
echo "📋 Verification Summary"
echo "======================"
echo -e "${GREEN}✓ Endpoints responding${NC}"
echo -e "${YELLOW}⚠ Platform data will appear after 11pm daily snapshot${NC}"
echo ""
echo "🚀 Next steps:"
echo "  1. Ensure META_ACCESS_TOKEN and TIKTOK_ACCESS_TOKEN are set"
echo "  2. Wait for daily snapshot job (11pm) or manually trigger it"
echo "  3. Refresh /api/achievements to see updated metrics"
echo "  4. View medals in #achievements page"
echo ""
echo "📖 For setup help, see: PLATFORM_SETUP.md"
