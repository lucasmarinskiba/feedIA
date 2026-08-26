#!/bin/bash
# Production Monitoring Dashboard

BACKEND_URL="${BACKEND_URL:-https://web-production-fa7b5.up.railway.app}"
FRONTEND_URL="${FRONTEND_URL:-https://feedia.vercel.app}"

check_health() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Health Check — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Backend health
  HEALTH=$(curl -s "$BACKEND_URL/api/health" | jq '.' 2>/dev/null || echo "{}")
  STATUS=$(echo "$HEALTH" | jq -r '.ok // "unknown"')
  VERSION=$(echo "$HEALTH" | jq -r '.version // "unknown"')
  
  if [ "$STATUS" = "true" ]; then
    echo "✅ Backend: HEALTHY (v$VERSION)"
  else
    echo "❌ Backend: FAILED"
    return 1
  fi
  
  # Performance metrics
  PERF=$(curl -s "$BACKEND_URL/api/monitoring/health" 2>/dev/null | jq '.' 2>/dev/null || echo "{}")
  UPTIME=$(echo "$PERF" | jq -r '.uptime // 0')
  AVG_RT=$(echo "$PERF" | jq -r '.avgResponseTime // 0')
  ERROR_RATE=$(echo "$PERF" | jq -r '.errorRate // 0')
  HEALTH_STATUS=$(echo "$PERF" | jq -r '.healthStatus // "unknown"')
  
  echo "⏱️  Uptime: ${UPTIME}ms"
  echo "📈 Avg Response: ${AVG_RT}ms"
  echo "❌ Error Rate: $(echo "scale=2; $ERROR_RATE * 100" | bc)%"
  echo "🏥 Status: $HEALTH_STATUS"
  
  # Cache stats
  CACHE=$(echo "$PERF" | jq '.cache // {}')
  HIT_RATE=$(echo "$CACHE" | jq -r '.hitRate // 0')
  echo "💾 Cache Hit Rate: $(echo "scale=1; $HIT_RATE * 100" | bc)%"
  
  # Slow endpoints
  SLOW=$(echo "$PERF" | jq '.slowEndpoints // []' | jq '.[0:3]')
  echo ""
  echo "🐢 Slowest Endpoints:"
  echo "$SLOW" | jq -r '.[] | "  \(.endpoint) (\(.avgDuration)ms)"'
}

check_endpoints() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔗 Endpoint Checks"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  endpoints=(
    "GET /api/health"
    "GET /api/templates/carousels"
    "GET /api/feedback/top-templates"
    "POST /api/teams/create"
    "POST /api/feedback/content"
  )
  
  for endpoint in "${endpoints[@]}"; do
    METHOD=$(echo "$endpoint" | cut -d' ' -f1)
    PATH=$(echo "$endpoint" | cut -d' ' -f2)
    
    RESP=$(curl -s -w "\n%{http_code}" -X "$METHOD" "$BACKEND_URL$PATH" \
      -H "Content-Type: application/json" \
      -H "x-user-id: test-user" \
      -d '{}' 2>/dev/null)
    
    CODE=$(echo "$RESP" | tail -1)
    
    if [ "$CODE" = "200" ] || [ "$CODE" = "400" ] || [ "$CODE" = "401" ]; then
      echo "✅ $endpoint ($CODE)"
    else
      echo "❌ $endpoint ($CODE)"
    fi
  done
}

check_database() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🗄️  Database Status"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if [ -z "$MONGODB_URI" ]; then
    echo "⚠️  MONGODB_URI not set (local dev only)"
    return
  fi
  
  # Try connection
  if npx mongodb-cli ping "$MONGODB_URI" 2>/dev/null; then
    echo "✅ MongoDB: Connected"
  else
    echo "❌ MongoDB: Connection failed"
  fi
}

# Run checks
check_health
check_endpoints
check_database

echo ""
echo "✅ Monitoring complete"
