#!/bin/bash
set -e
node scripts/check-frontend.mjs
mkdir -p .vercel/output/static
cp -rp public/. .vercel/output/static/
# NOTE: no explicit "/api/(.*)" rewrite here — it was a no-op that also
# appeared to disrupt Vercel's native catch-all resolution for api/[...path].js,
# causing every nested /api/* route (2+ path segments) to 404 at the platform
# level without ever invoking the function (single-segment /api/* routes were
# unaffected). "handle":"filesystem" alone lets Vercel's own auto-registered
# Serverless Function routes (including the [...path] catch-all) resolve
# first; only genuinely unmatched paths fall through to the SPA rewrite.
printf '{"version":3,"routes":[{"handle":"filesystem"},{"src":"/(.*)","dest":"/index.html","status":200}]}' > .vercel/output/config.json
