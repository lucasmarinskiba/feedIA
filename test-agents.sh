#!/bin/bash

API="http://localhost:3000"
echo "🧪 Testing Quality Feedback Loop + Strategic Reasoning Agents"
echo "=================================================="
echo ""

# ==================== QUALITY FEEDBACK LOOP ====================
echo "📊 QUALITY FEEDBACK LOOP"
echo "---"

echo "1️⃣ Save feedback (POST /api/feedback/save)"
FEEDBACK=$(curl -s -X POST "$API/api/feedback/save" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-1",
    "batchId": 88,
    "rating": 5,
    "content": "Excellent carousel prompts for skincare!"
  }')
echo "$FEEDBACK" | jq '.' 2>/dev/null || echo "$FEEDBACK"
echo ""

echo "2️⃣ Get quality score (GET /api/feedback/quality-scores/88)"
curl -s "$API/api/feedback/quality-scores/88" | jq '.' 2>/dev/null || echo "Not yet available"
echo ""

echo "3️⃣ Get all quality scores (GET /api/feedback/quality-scores)"
curl -s "$API/api/feedback/quality-scores" | jq '.batches[0:2]' 2>/dev/null || echo "No data yet"
echo ""

echo "4️⃣ Get recommendations (GET /api/feedback/recommendations)"
curl -s "$API/api/feedback/recommendations" | jq '.recommendations[0:2]' 2>/dev/null || echo "No data yet"
echo ""

echo "5️⃣ Retrain weights (POST /api/feedback/retrain)"
curl -s -X POST "$API/api/feedback/retrain" \
  -H "Content-Type: application/json" | jq '.improvementPercent' 2>/dev/null || echo "Retrain pending"
echo ""

# ==================== STRATEGIC REASONING ====================
echo ""
echo "🎯 STRATEGIC REASONING AGENT"
echo "---"

# Sample data
COMPETITORS='{
  "competitors": [
    {
      "name": "Competitor A",
      "pricing": 79,
      "features": ["api", "webhooks", "rate-limiting"],
      "positioning": "Developer-first",
      "weaknesses": ["high latency", "poor docs"]
    },
    {
      "name": "Competitor B",
      "pricing": 199,
      "features": ["api", "webhooks", "rate-limiting", "ai-analytics", "compliance"],
      "positioning": "Enterprise-grade",
      "weaknesses": ["slow support", "expensive"]
    }
  ]
}'

echo "1️⃣ Analyze competitors (POST /api/strategy/analyze-competitors)"
curl -s -X POST "$API/api/strategy/analyze-competitors" \
  -H "Content-Type: application/json" \
  -d "$COMPETITORS" | jq '.analysis | {averagePrice, priceRange, gapOpportunities}' 2>/dev/null || echo "Service not ready"
echo ""

echo "2️⃣ Recommend pricing (POST /api/strategy/recommend-pricing)"
PRICING_REQ="{
  $COMPETITORS,
  \"context\": {
    \"ourPrice\": 99,
    \"ourFeatures\": [\"api\", \"webhooks\", \"rate-limiting\", \"ai-analytics\"],
    \"competitorCount\": 2,
    \"marketSize\": 10000,
    \"growthRate\": 25
  }
}"
curl -s -X POST "$API/api/strategy/recommend-pricing" \
  -H "Content-Type: application/json" \
  -d "$PRICING_REQ" | jq '.recommendation | {recommendedPrice, competitivePosition, rationale}' 2>/dev/null || echo "Service not ready"
echo ""

echo "3️⃣ Allocate budget (POST /api/strategy/allocate-budget)"
curl -s -X POST "$API/api/strategy/allocate-budget" \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyRevenue": 50000,
    "growthRate": 25
  }' | jq '.allocation | {marketing, product, ops, reserve}' 2>/dev/null || echo "Service not ready"
echo ""

echo "4️⃣ Generate positioning (POST /api/strategy/position)"
POSITION_REQ='{
  "ourFeatures": ["api", "webhooks", "ai-analytics", "fast-support"],
  "mainCompetitor": {
    "name": "Competitor B",
    "pricing": 199,
    "features": ["api", "webhooks", "compliance"],
    "positioning": "Enterprise"
  },
  "targetSegment": "creator"
}'
curl -s -X POST "$API/api/strategy/position" \
  -H "Content-Type: application/json" \
  -d "$POSITION_REQ" | jq '.positioning | {coreMessage, defensibleAdvantage, vs}' 2>/dev/null || echo "Service not ready"
echo ""

echo "5️⃣ Full strategic analysis (POST /api/strategy/full-analysis)"
FULL_REQ="{
  $COMPETITORS,
  \"context\": {
    \"ourPrice\": 99,
    \"ourFeatures\": [\"api\", \"webhooks\", \"rate-limiting\", \"ai-analytics\"],
    \"competitorCount\": 2,
    \"marketSize\": 10000,
    \"growthRate\": 25
  },
  \"targetSegment\": \"creator\"
}"
curl -s -X POST "$API/api/strategy/full-analysis" \
  -H "Content-Type: application/json" \
  -d "$FULL_REQ" | jq '.analysis | keys' 2>/dev/null || echo "Service not ready"
echo ""

echo "=================================================="
echo "✅ Test suite complete"
echo "Status:"
echo "  - If JSON responses → APIs live ✓"
echo "  - If 'Service not ready' → Railway still deploying (~2-3 min)"
echo ""
