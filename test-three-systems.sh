#!/bin/bash
# Test suite: Quality Feedback Loop + Strategic Reasoning Agent + Multi-Agent Orchestration
# Endpoints: /api/feedback/*, /api/strategy/*, /api/orchestrate/*

BASE_URL="${1:-http://localhost:5000}"

echo "======================================================"
echo "🧪 Testing THREE INTEGRATED SYSTEMS"
echo "======================================================"
echo ""

# ============================================================
# 1️⃣ QUALITY FEEDBACK LOOP (/api/feedback/*)
# ============================================================

echo "📊 QUALITY FEEDBACK LOOP"
echo "---"

echo "1️⃣  Save feedback (POST /api/feedback/save)"
curl -s -X POST "$BASE_URL/api/feedback/save" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "batchId": 88,
    "rating": 5,
    "content": "Excellent carousel design - smooth transitions, great color palette"
  }' | jq -r '.success // .error' || echo "❌ Request failed"

echo ""
echo "2️⃣  Get quality score for batch (GET /api/feedback/quality-scores/:batchId)"
curl -s "$BASE_URL/api/feedback/quality-scores/88" | jq -r '.batchId // .error' || echo "⏳ Score not yet available (needs more ratings)"

echo ""
echo "3️⃣  Get all quality scores (GET /api/feedback/quality-scores)"
curl -s "$BASE_URL/api/feedback/quality-scores" | jq -r '.[] | "\(.batchId): \(.averageRating) ⭐"' || echo "⏳ No data yet"

echo ""
echo "4️⃣  Get user feedback history (GET /api/feedback/history/:userId)"
curl -s "$BASE_URL/api/feedback/history/user-123" | jq -r '.feedbackCount // "No history"' || echo "⏳ History building"

echo ""
echo "5️⃣  Get recommendations (GET /api/feedback/recommendations)"
curl -s "$BASE_URL/api/feedback/recommendations" | jq -r '.topPerformers[0].batchId // "No recommendations yet"' || echo "⏳ Analyzing..."

echo ""
echo "6️⃣  Retrain weights (POST /api/feedback/retrain)"
curl -s -X POST "$BASE_URL/api/feedback/retrain" | jq -r '.success // .message' || echo "⏳ Retrain pending"

echo ""
echo ""

# ============================================================
# 2️⃣ STRATEGIC REASONING AGENT (/api/strategy/*)
# ============================================================

echo "🎯 STRATEGIC REASONING AGENT"
echo "---"

echo "1️⃣  Analyze competitors (POST /api/strategy/analyze-competitors)"
curl -s -X POST "$BASE_URL/api/strategy/analyze-competitors" \
  -H "Content-Type: application/json" \
  -d '{
    "competitors": [
      {"name": "Competitor A", "pricing": 299},
      {"name": "Competitor B", "pricing": 499},
      {"name": "Competitor C", "pricing": 199}
    ]
  }' | jq -r '.averagePrice // .error' || echo "❌ Service not ready"

echo ""
echo "2️⃣  Recommend pricing (POST /api/strategy/recommend-pricing)"
curl -s -X POST "$BASE_URL/api/strategy/recommend-pricing" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Premium carousel design tool for creators",
    "competitors": [{"name": "Figma", "pricing": 12}, {"name": "Canva", "pricing": 13}]
  }' | jq -r '.positioning // .error' || echo "❌ Service not ready"

echo ""
echo "3️⃣  Allocate budget (POST /api/strategy/allocate-budget)"
curl -s -X POST "$BASE_URL/api/strategy/allocate-budget" \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyRevenue": 50000,
    "growthRate": 0.15
  }' | jq -r '.stage // .error' || echo "❌ Service not ready"

echo ""
echo "4️⃣  Position against competitor (POST /api/strategy/position)"
curl -s -X POST "$BASE_URL/api/strategy/position" \
  -H "Content-Type: application/json" \
  -d '{
    "ourFeatures": ["AI-powered", "Real-time collab", "Mobile-first"],
    "mainCompetitor": "Canva",
    "targetSegment": "Professional creators"
  }' | jq -r '.messaging // .error' || echo "❌ Service not ready"

echo ""
echo "5️⃣  Full strategic analysis (POST /api/strategy/full-analysis)"
curl -s -X POST "$BASE_URL/api/strategy/full-analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "product": "FeedIA Carousel Pro",
    "revenue": 50000,
    "competitors": [{"name": "Figma", "pricing": 12}],
    "features": ["AI designs", "Real-time collab"]
  }' | jq -r '.executive_summary // .error' || echo "❌ Service not ready"

echo ""
echo ""

# ============================================================
# 3️⃣ MULTI-AGENT ORCHESTRATION (/api/orchestrate/*)
# ============================================================

echo "🤖 MULTI-AGENT ORCHESTRATION (Art Director ↔ Carousel Designer)"
echo "---"

echo "1️⃣  Start collaboration session (POST /api/orchestrate/start)"
SESSION_ID=$(curl -s -X POST "$BASE_URL/api/orchestrate/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "brief": {
      "topic": "Luxury skincare carousel",
      "format": "carousel",
      "style": "minimalist luxury",
      "constraints": ["max 10 slides", "mobile-first"],
      "targetAudience": "beauty enthusiasts 25-45"
    }
  }' | jq -r '.sessionId // empty')

if [ -n "$SESSION_ID" ]; then
  echo "✅ Session started: $SESSION_ID"
else
  echo "❌ Session creation failed"
  exit 1
fi

echo ""
echo "2️⃣  Art Director sends proposal (POST /api/orchestrate/:sessionId/art-director-proposal)"
curl -s -X POST "$BASE_URL/api/orchestrate/$SESSION_ID/art-director-proposal" \
  -H "Content-Type: application/json" \
  -d '{
    "concept": "Luxury skincare ritual with natural ingredients",
    "visualStyle": "minimalist luxury",
    "mood": "aspirational, calming"
  }' | jq -r '.message' || echo "❌ Proposal failed"

echo ""
echo "3️⃣  Carousel Designer responds (POST /api/orchestrate/:sessionId/carousel-designer-response)"
curl -s -X POST "$BASE_URL/api/orchestrate/$SESSION_ID/carousel-designer-response" \
  -H "Content-Type: application/json" \
  -d '{
    "feasibility": "Highly feasible with standard carousel tools",
    "suggestions": ["Use 8-10 frames", "Consistent color palette", "Add subtle animations"],
    "concerns": ["Mobile text readability", "Animation performance on older devices"]
  }' | jq -r '.message' || echo "❌ Response failed"

echo ""
echo "4️⃣  Art Director refines (POST /api/orchestrate/:sessionId/art-director-refine)"
curl -s -X POST "$BASE_URL/api/orchestrate/$SESSION_ID/art-director-refine" \
  -H "Content-Type: application/json" \
  -d '{
    "adjustments": ["Reduced to 8 frames", "Applied WCAG AA standards", "GPU-friendly transitions"],
    "revisedConcept": "8-frame luxury skincare carousel with premium animations"
  }' | jq -r '.message' || echo "❌ Refinement failed"

echo ""
echo "5️⃣  Carousel Designer validates (POST /api/orchestrate/:sessionId/carousel-designer-validate)"
curl -s -X POST "$BASE_URL/api/orchestrate/$SESSION_ID/carousel-designer-validate" \
  -H "Content-Type: application/json" \
  -d '{
    "isValid": true,
    "readiness": "production",
    "notes": "All accessibility checks passed. Ready for generation pipeline."
  }' | jq -r '.message' || echo "❌ Validation failed"

echo ""
echo "6️⃣  Get conversation history (GET /api/orchestrate/:sessionId/history)"
curl -s "$BASE_URL/api/orchestrate/$SESSION_ID/history" | jq -r '.messageCount // .error' | sed 's/^/  Messages: /' || echo "❌ History fetch failed"

echo ""
echo "7️⃣  Get session details (GET /api/orchestrate/:sessionId/session)"
curl -s "$BASE_URL/api/orchestrate/$SESSION_ID/session" | jq -r '.session.status // .error' | sed 's/^/  Status: /' || echo "❌ Session fetch failed"

echo ""
echo ""
echo "======================================================"
echo "✅ Test suite complete"
echo "======================================================"
echo ""
echo "SUMMARY:"
echo "  Quality Feedback: ratings → scoring → boost"
echo "  Strategic Reasoning: analysis → pricing → positioning"
echo "  Multi-Agent Orchestration: proposal → feedback → refine → validate"
echo ""
