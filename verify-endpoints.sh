#!/bin/bash

echo "🔗 Endpoint Route Verification"
echo "=============================="
echo ""

# Extract endpoint routes from handlers
echo "Teams Endpoints:"
grep -o "if (path.*teams.*)" api/_teams.js | head -6
echo ""

echo "Feedback Endpoints:"
grep -o "if (path.*feedback.*)" api/_feedback.js | head -6
echo ""

echo "Templates Endpoints:"
grep -o "if (path.*templates.*)" api/_templates.js | head -6
echo ""

echo "Analytics Endpoints:"
grep -o "if (path.*analytics.*)" api/_analytics.js | head -5
echo ""

echo "Video/Publishing Endpoints:"
grep -o "if (path.*video\|if (path.*publish.*)" api/_videoGeneration.js | head -5
echo ""

# Count total routes
TOTAL_ROUTES=$(grep -h "if (path" api/_*.js 2>/dev/null | wc -l)
echo "📊 Total Route Checks: $TOTAL_ROUTES"
echo ""

# Verify they're wired in main handler
echo "✅ Integration in api/[...path].js:"
grep -c "path.startsWith('/api/teams" api/[...path].js && echo "  ✅ Teams routes wired"
grep -c "path.startsWith('/api/feedback" api/[...path].js && echo "  ✅ Feedback routes wired"
grep -c "path.startsWith('/api/templates" api/[...path].js && echo "  ✅ Templates routes wired"
grep -c "path.startsWith('/api/analytics" api/[...path].js && echo "  ✅ Analytics routes wired"
grep -c "path.startsWith('/api/video" api/[...path].js && echo "  ✅ Video routes wired"
grep -c "path.startsWith('/api/publish" api/[...path].js && echo "  ✅ Publishing routes wired"
