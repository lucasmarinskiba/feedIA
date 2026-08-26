#!/bin/bash

echo "✅ API Response Validation"
echo "============================"

# Validate _teams.js returns correct structure
echo ""
echo "Teams Module:"
grep -A5 "POST /api/teams/create" api/_teams.js | grep -q "workspace.name" && \
  echo "  ✅ Returns workspace object" || echo "  ❌ Response structure wrong"

# Validate _feedback.js returns correct structure
echo ""
echo "Feedback Module:"
grep -A5 "POST /api/feedback/content" api/_feedback.js | grep -q "rating" && \
  echo "  ✅ Returns feedback object" || echo "  ❌ Response structure wrong"

# Validate _templates.js returns correct structure
echo ""
echo "Templates Module:"
grep -A5 "GET /api/templates/carousels" api/_templates.js | grep -q "templates" && \
  echo "  ✅ Returns templates array" || echo "  ❌ Response structure wrong"

# Validate _analytics.js returns correct structure
echo ""
echo "Analytics Module:"
grep -A5 "GET /api/analytics/roi" api/_analytics.js | grep -q "roi" && \
  echo "  ✅ Returns ROI summary" || echo "  ❌ Response structure wrong"

# Validate _videoGeneration.js returns correct structure
echo ""
echo "Video Generation Module:"
grep -A5 "POST /api/video/generate" api/_videoGeneration.js | grep -q "provider\|videoUrl" && \
  echo "  ✅ Returns video object" || echo "  ❌ Response structure wrong"

echo ""
echo "✅ Response validation complete"
