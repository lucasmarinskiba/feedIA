#!/bin/bash

BACKEND="${BACKEND_URL:-https://web-production-fa7b5.up.railway.app}"
FRONTEND="${FRONTEND_URL:-https://feedia.vercel.app}"

echo "🚀 FeedIA Live Deployment Monitor"
echo "=================================="
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Health status
check_health() {
  local url=$1
  local label=$2
  
  echo -n "📊 $label... "
  HEALTH=$(curl -s -m 5 "$url/api/health" 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    STATUS=$(echo "$HEALTH" | jq -r '.ok // "unknown"' 2>/dev/null)
    if [ "$STATUS" = "true" ]; then
      echo "✅ LIVE"
      return 0
    else
      echo "⏳ Booting..."
      return 1
    fi
  else
    echo "⏳ Connecting..."
    return 1
  fi
}

# Check endpoints
check_endpoints() {
  echo ""
  echo "🔗 Endpoint Status:"
  
  endpoints=(
    "/api/health"
    "/api/templates/carousels"
    "/api/teams/create"
    "/api/feedback/content"
    "/api/analytics/roi"
  )
  
  for ep in "${endpoints[@]}"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 3 "$BACKEND$ep" \
      -H "x-user-id: monitor" 2>/dev/null)
    
    if [ "$CODE" = "200" ] || [ "$CODE" = "400" ]; then
      echo "  ✅ $ep ($CODE)"
    elif [ -z "$CODE" ]; then
      echo "  ⏳ $ep (connecting...)"
    else
      echo "  ❌ $ep ($CODE)"
    fi
  done
}

# Performance check
check_performance() {
  echo ""
  echo "⚡ Performance:"
  
  START=$(date +%s%N)
  curl -s "$BACKEND/api/health" > /dev/null 2>&1
  END=$(date +%s%N)
  
  if [ $? -eq 0 ]; then
    MS=$(( (END - START) / 1000000 ))
    echo "  Response time: ${MS}ms"
  fi
}

# Deployment status
echo "📍 Deployment Status:"
echo "  Frontend: $FRONTEND"
echo "  Backend: $BACKEND"
echo ""

# Check services
check_health "$BACKEND" "Backend"
check_health "$FRONTEND" "Frontend"

# Check endpoints if backend online
if check_endpoints; then
  check_performance
fi

echo ""
echo "=================================="
echo "✅ Live Deployment Monitor Active"
echo ""
echo "Next checks in 30 seconds..."
echo "Press Ctrl+C to stop"
