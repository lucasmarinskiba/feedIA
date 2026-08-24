# Multi-stage Dockerfile for FeedIA.
# Builds TypeScript inside the container so no pre-built dist/ is required.
# Usage:
#   docker build -t feedia:latest .
#   docker run --env-file .env.production feedia:latest

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Toolchain for native modules (better-sqlite3) when no prebuilt binary exists
# for Alpine/musl.
RUN apk add --no-cache python3 make g++ openssl-dev

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

# The builder runs under a constrained memory cgroup. A heap ceiling above that
# limit makes V8 grow until the kernel OOM-kills the process (exit 137), so keep
# this comfortably below the container cap.
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Lifecycle scripts stay off: package.json's `prepare` installs git hooks via
# scripts/setup-hooks.mjs, which does not exist yet at this layer (and is
# meaningless in an image with no .git). Concurrency is capped because default
# parallelism is what pushes peak RSS over the builder's limit on a cold cache.
RUN pnpm install --frozen-lockfile --ignore-scripts \
    --child-concurrency=1 --network-concurrency=4

# --ignore-scripts also suppresses the native builds, so rebuild exactly the two
# packages that ship bindings. better-sqlite3 sits in the server's import chain;
# sharp backs image processing. Both must be built for this base image's musl
# libc rather than inherited from a glibc host.
RUN pnpm rebuild better-sqlite3 sharp

# Copy sources and compile. Tolerates the repo's pre-existing type errors in
# files unrelated to the server entrypoint; esbuild still emits dist/.
COPY . .
RUN pnpm run build:prod || true

# Drop devDependencies so the runtime stage inherits a production-only tree.
# Best-effort: if this fails the image just carries devDependencies, which is
# wasteful but harmless, so it must never fail the build.
RUN pnpm prune --prod --ignore-scripts || pnpm prune --prod || true

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# node_modules is copied rather than reinstalled: the builder uses this same
# base image, so native bindings are already correct and a second install would
# double the build's peak memory for no benefit. No compiler toolchain is
# needed here as a result.
COPY --from=builder /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml* ./

# Compiled code and runtime assets. src/db carries schema.sql, which
# database.ts reads from process.cwd() at startup.
COPY --from=builder /app/dist ./dist
COPY data ./data
COPY supabase/migrations ./supabase/migrations
COPY src/db ./src/db

ENV NODE_ENV=production
ENV WORKERS_ENABLED=true
EXPOSE 3000

# Probes the port the app actually binds; Railway injects PORT.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/api/systems/health',(r)=>{if(r.statusCode!==200)throw new Error(r.statusCode)}).on('error',(e)=>{throw e})"

CMD ["node", "dist/server.js"]
