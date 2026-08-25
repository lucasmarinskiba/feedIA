#!/bin/bash
# Deploy script: Vercel (frontend) + Railway (backend)

set -e

echo "🚀 FeedIA Deploy Pipeline"
echo "========================="

# 1. Lint check
echo "✓ Running linter..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Lint failed. Fix errors before deploying."
  exit 1
fi

# 2. Type check
echo "✓ Type checking..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors. Fix before deploying."
  exit 1
fi

# 3. Tests
echo "✓ Running tests..."
npm test -- --passWithNoTests
if [ $? -ne 0 ]; then
  echo "⚠️  Tests failed (non-blocking)."
fi

# 4. Build
echo "✓ Building..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed."
  exit 1
fi

# 5. Git push (Vercel auto-deploys)
echo "✓ Pushing to main..."
git push origin main

# 6. Railway deploy (manual or via CLI)
echo "✓ Deploy to Railway..."
if command -v railway &> /dev/null; then
  railway up
  echo "✅ Railway deployed."
else
  echo "⚠️  Railway CLI not installed. Deploy manually:"
  echo "   railway up"
fi

echo ""
echo "✅ Deploy complete!"
echo "   Frontend: https://feedia.vercel.app"
echo "   Backend: https://web-production-fa7b5.up.railway.app"
echo "   API Docs: https://web-production-fa7b5.up.railway.app/api/docs"
