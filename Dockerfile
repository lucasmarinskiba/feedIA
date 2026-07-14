# Multi-stage Dockerfile for FeedIA long-running workers.
# Builds TypeScript inside the container so no pre-built dist/ is required.
# Usage:
#   docker build -t feedia-workers:latest .
#   docker run --env-file .env.production feedia-workers:latest

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests and install all deps (including dev)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

# better-sqlite3 must compile native bindings for this image too
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled code and runtime assets
COPY --from=builder /app/dist ./dist
COPY data ./data
COPY supabase/migrations ./supabase/migrations

ENV NODE_ENV=production
ENV WORKERS_ENABLED=true

# Default command starts the worker orchestrator
CMD ["node", "dist/workers/index.js"]
