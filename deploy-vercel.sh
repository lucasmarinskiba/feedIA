#!/bin/bash

# Vercel Deployment Script — Both Options

set -e

echo "🚀 FeedIA Vercel Deployment Script"
echo "===================================="
echo ""
echo "Choose deployment method:"
echo "1) GitHub Auto-Deploy (go to https://vercel.com, manual setup)"
echo "2) Local CLI Deploy (authenticate here, deploy now)"
echo "3) Using VERCEL_TOKEN (fastest, if you have token)"
echo ""

read -p "Select option (1/2/3): " choice

case $choice in
  1)
    echo ""
    echo "✅ GitHub Auto-Deploy Instructions:"
    echo "1. Go to https://vercel.com"
    echo "2. Login with GitHub"
    echo "3. Click 'Add New' → 'Project'"
    echo "4. Search & select: lucasmarinskiba/feedIA"
    echo "5. Configure:"
    echo "   - Framework: Next.js"
    echo "   - Build: npm run build"
    echo "   - Output: dist"
    echo "6. Add Environment Variables (see VERCEL_DEPLOYMENT.md)"
    echo "7. Click Deploy"
    echo ""
    echo "✅ Vercel will auto-deploy on every git push to main"
    ;;

  2)
    echo ""
    echo "🔐 Authenticating with Vercel..."
    vercel login
    echo ""
    echo "🔗 Linking project..."
    vercel link
    echo ""
    echo "📝 Setting environment variables..."
    echo "For each variable, paste the value when prompted:"
    echo "(See VERCEL_DEPLOYMENT.md for full list)"
    echo ""
    vercel env add ANTHROPIC_API_KEY
    vercel env add STRIPE_SECRET_KEY
    echo ""
    echo "🚀 Deploying to production..."
    vercel deploy --prod
    ;;

  3)
    if [ -z "$VERCEL_TOKEN" ]; then
      echo ""
      echo "❌ VERCEL_TOKEN not set"
      echo "Run: export VERCEL_TOKEN=your-token-here"
      echo "Then: bash deploy-vercel.sh"
      exit 1
    fi
    echo ""
    echo "🚀 Deploying with token..."
    vercel deploy --prod
    ;;

  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Deployment complete!"
echo "Test: curl https://your-domain.vercel.app/api/systems/health"
