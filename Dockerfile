# Multi-stage Dockerfile for FeedIA long-running workers.
# Builds TypeScript inside the container so no pre-built dist/ is required.
# Uses pnpm for memory efficiency.
# Usage:
#   docker build -t feedia-workers:latest .
#   docker run --env-file .env.production feedia-workers:latest

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl-dev

WORKDIR /app

# Copy dependency manifests and install all deps (including dev)
COPY package.json pnpm-lock.yaml* ./
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN pnpm install --ignore-scripts

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# better-sqlite3 must compile native bindings for this image too
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl-dev

WORKDIR /app

# Copy dependency manifests and install production deps only
COPY package.json pnpm-lock.yaml* ./
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN pnpm install --ignore-scripts --prod

# Copy compiled code and runtime assets
COPY --from=builder /app/dist ./dist
COPY data ./data
COPY supabase/migrations ./supabase/migrations

ENV NODE_ENV=production
ENV WORKERS_ENABLED=true

# Default command starts the worker orchestrator
CMD ["node", "dist/workers/index.js"]
