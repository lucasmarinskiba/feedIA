#!/bin/bash
set -e
node scripts/check-frontend.mjs
mkdir -p .vercel/output/static
cp -rp public/. .vercel/output/static/
# Explicit route to the [...path] catch-all function by its literal function
# identifier (not a reconstructed path) — with a custom buildCommand, Vercel
# does not appear to auto-expand bracket rest-parameter routing the way it
# would in a zero-config/Next.js build, so nested /api/* paths (2+ segments)
# 404'd at the platform level without invoking the function while single-
# segment /api/* paths worked. Pointing dest directly at the function name
# removes the ambiguity. api/index.ts (a separate Express app, Phase 3
# orchestration routes: /api/orchestrate, /api/generators, /api/info) is
# routed there explicitly first so it isn't shadowed by the catch-all.
printf '{"version":3,"routes":[{"src":"^/api/(orchestrate|generators|info)(/.*)?$","dest":"/api/index"},{"src":"^/api/.*$","dest":"/api/[...path]"},{"handle":"filesystem"},{"src":"/(.*)","dest":"/index.html","status":200}]}' > .vercel/output/config.json
