#!/bin/bash
set -e
# Was: cp -rp public/. — a separate, independently-stale frontend (own copy of
# the SPA, own serverless backend in api/_*.js) that hadn't tracked src/server/
# static/ since 2026-08-25. Vercel now serves the REAL frontend (built fresh
# from src/server/static/, same source the Railway "web" service builds into
# dist-static/) and proxies /api/* to the real backend running there — one
# frontend, one backend, instead of two independently-drifting copies of the
# whole app.
npm run build:static
node scripts/check-frontend.mjs
mkdir -p .vercel/output/static
cp -rp dist-static/. .vercel/output/static/
# RAILWAY_API_ORIGIN: the "web" service's public URL (dist/server.js — the
# real Express app + all real /api/* routes). Set as a Vercel project env var;
# this default is only a fallback so the build doesn't hard-fail if it's ever
# unset, not something to rely on long-term.
API_ORIGIN="${RAILWAY_API_ORIGIN:-https://web-production-fa7b5.up.railway.app}"
printf '{"version":3,"routes":[{"src":"^/api/(.*)$","dest":"%s/api/$1"},{"handle":"filesystem"},{"src":"^/pricing/?$","dest":"/pricing.html"},{"src":"/(.*)","dest":"/index.html","status":200}]}' "$API_ORIGIN" > .vercel/output/config.json
