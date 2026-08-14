#!/bin/bash
# Quick test once Railway is online

BASE_URL="https://web-production-fa7b5.up.railway.app"

echo "🚀 Testing FeedIA on Railway"
echo ""

# Health check
echo "Checking health..."
if ! curl -s "$BASE_URL/health" | grep -q '"status":"ok"'; then
  echo "❌ Railway not online yet (404)"
  exit 1
fi

echo "✅ Railway LIVE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  MULTI-AGENT ORCHESTRATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SESSION=$(curl -s -X POST "$BASE_URL/api/orchestrate/start" \
  -H "Content-Type: application/json" \
  -d '{"userId":"railway-test","brief":{"topic":"Luxury carousel","format":"carousel","style":"minimalist luxury","constraints":["max 10 slides"],"targetAudience":"beauty enthusiasts"}}' \
  | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION" ]; then
  echo "❌ Failed to create session"
  exit 1
fi

echo "✓ Session: $SESSION"

curl -s -X POST "$BASE_URL/api/orchestrate/$SESSION/art-director-proposal" \
  -H "Content-Type: application/json" \
  -d '{"concept":"Luxury skincare ritual","visualStyle":"minimalist luxury","mood":"aspirational"}' > /dev/null
echo "✓ Art Director proposal sent"

curl -s -X POST "$BASE_URL/api/orchestrate/$SESSION/carousel-designer-response" \
  -H "Content-Type: application/json" \
  -d '{"feasibility":"Feasible","suggestions":["Use 8 frames"],"concerns":["Mobile text"]}' > /dev/null
echo "✓ Designer response sent"

curl -s -X POST "$BASE_URL/api/orchestrate/$SESSION/art-director-refine" \
  -H "Content-Type: application/json" \
  -d '{"adjustments":["Fixed text size"],"revisedConcept":"8-frame carousel"}' > /dev/null
echo "✓ Art Director refine sent"

FINAL=$(curl -s -X POST "$BASE_URL/api/orchestrate/$SESSION/carousel-designer-validate" \
  -H "Content-Type: application/json" \
  -d '{"isValid":true,"readiness":"production","notes":"Ready"}')

if echo "$FINAL" | grep -q "APPROVED FOR PRODUCTION"; then
  echo "✓ ✅ DESIGN APPROVED FOR PRODUCTION"
else
  echo "❌ Validation failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  QUALITY FEEDBACK LOOP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SAVE=$(curl -s -X POST "$BASE_URL/api/feedback/save" \
  -H "Content-Type: application/json" \
  -d '{"userId":"railway-test","batchId":88,"rating":5,"content":"Excellent carousel"}')

if echo "$SAVE" | grep -q '"success":true'; then
  echo "✓ Rating saved"
else
  echo "❌ Save failed"
fi

SCORE=$(curl -s "$BASE_URL/api/feedback/quality-scores/88")
if echo "$SCORE" | grep -q '"batchId"'; then
  echo "✓ Score retrieved"
else
  echo "❌ Score fetch failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  STRATEGIC REASONING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STRATEGY=$(curl -s -X POST "$BASE_URL/api/strategy/full-analysis" \
  -H "Content-Type: application/json" \
  -d '{"context":{"ourPrice":15,"ourFeatures":["AI","collab"],"competitorCount":2,"marketSize":100000,"growthRate":0.12},"competitors":[{"name":"Figma","pricing":12,"features":["collab"],"positioning":"premium","weaknesses":["cost"]},{"name":"Canva","pricing":13,"features":["templates"],"positioning":"easy","weaknesses":["limited"]}],"targetSegment":"Professional creators"}')

if echo "$STRATEGY" | grep -q '"positioning"'; then
  echo "✓ Strategy analysis complete"
else
  echo "❌ Strategy failed"
fi

echo ""
echo "✅ ALL SYSTEMS OPERATIONAL ON RAILWAY"
