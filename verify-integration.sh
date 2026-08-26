#!/bin/bash

echo "🔍 Verifying Integration"
echo "========================"

# Check imports
echo ""
echo "1. Handler Imports:"
grep -c "handleTeams\|handleFeedback" api/[...path].js > /dev/null && echo "  ✅ Imports found" || echo "  ❌ Missing imports"

# Check route handlers
echo ""
echo "2. Route Handlers:"
grep -c "if (path.startsWith('/api/teams/" api/[...path].js > /dev/null && echo "  ✅ Teams handler" || echo "  ❌ Teams missing"
grep -c "if (path.startsWith('/api/feedback/" api/[...path].js > /dev/null && echo "  ✅ Feedback handler" || echo "  ❌ Feedback missing"

# Check new modules exist
echo ""
echo "3. Module Files:"
[ -f api/_teams.js ] && echo "  ✅ api/_teams.js" || echo "  ❌ api/_teams.js missing"
[ -f api/_feedback.js ] && echo "  ✅ api/_feedback.js" || echo "  ❌ api/_feedback.js missing"
[ -f src/db/store.ts ] && echo "  ✅ src/db/store.ts" || echo "  ❌ src/db/store.ts missing"
[ -f src/monitoring/performance.ts ] && echo "  ✅ src/monitoring/performance.ts" || echo "  ❌ src/monitoring/performance.ts missing"

# Check tests
echo ""
echo "4. Test Suite:"
[ -f __tests__/features.test.ts ] && echo "  ✅ __tests__/features.test.ts" || echo "  ❌ Test file missing"
grep -c "describe.*Video Generation\|describe.*Analytics\|describe.*Teams" __tests__/features.test.ts > /dev/null && \
  echo "  ✅ Test cases defined" || echo "  ❌ Test cases missing"

# Check documentation
echo ""
echo "5. Documentation:"
[ -f DEPLOY.md ] && echo "  ✅ DEPLOY.md" || echo "  ❌ DEPLOY.md missing"
[ -f PRODUCTION.md ] && echo "  ✅ PRODUCTION.md" || echo "  ❌ PRODUCTION.md missing"

# Check deployment scripts
echo ""
echo "6. Scripts:"
[ -f scripts/deploy.sh ] && echo "  ✅ scripts/deploy.sh" || echo "  ❌ deploy.sh missing"
[ -f scripts/mongodb-setup.sh ] && echo "  ✅ scripts/mongodb-setup.sh" || echo "  ❌ mongodb-setup.sh missing"
[ -f scripts/monitor-production.sh ] && echo "  ✅ scripts/monitor-production.sh" || echo "  ❌ monitor-production.sh missing"
[ -f scripts/test-endpoints.sh ] && echo "  ✅ scripts/test-endpoints.sh" || echo "  ❌ test-endpoints.sh missing"

echo ""
echo "✅ Integration verification complete"
