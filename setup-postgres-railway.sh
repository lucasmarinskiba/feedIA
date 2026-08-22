#!/bin/bash

# Automated PostgreSQL setup en Railway
# Requiere: Railway CLI + estar logged in

set -e

PROJECT_ID="56f3ba0b-e6e0-4675-9645-e219b3629dab"
SERVICE_NAME="postgres_production"

echo "🚀 FeedIA PostgreSQL Setup en Railway"
echo "======================================"
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
  echo "❌ Railway CLI no instalado"
  echo ""
  echo "Install via:"
  echo "  npm install -g @railway/cli"
  exit 1
fi

# Check logged in
if ! railway whoami &> /dev/null; then
  echo "❌ No estás logged in a Railway"
  echo ""
  echo "Login:"
  echo "  railway login"
  exit 1
fi

echo "✅ Railway CLI ready"
echo ""

# Link project
echo "Linking project..."
railway link $PROJECT_ID

echo ""
echo "Estado actual de servicios:"
railway status

echo ""
echo "=========================================="
echo "✅ Setup Complete — Manual Steps Needed:"
echo "=========================================="
echo ""
echo "1️⃣  Dashboard: https://railway.app/project/$PROJECT_ID"
echo ""
echo "2️⃣  Crear PostgreSQL:"
echo "   - Click: New → Database → PostgreSQL"
echo "   - Wait: status ✅ Online"
echo ""
echo "3️⃣  Get DATABASE_URL:"
echo "   - Click: postgres_production service"
echo "   - Click: Connect tab"
echo "   - Copy: Full PostgreSQL URL"
echo ""
echo "4️⃣  Set env var in web service:"
echo "   export DB_URL='<paste_url_here>'"
echo ""
echo "   Then run:"
echo "   railway service web"
echo "   railway variable DATABASE_URL \$DB_URL"
echo ""
echo "5️⃣  Redeploy:"
echo "   railway deploy"
echo ""
echo "6️⃣  Verify:"
echo "   ./verify-db.sh"
echo ""
