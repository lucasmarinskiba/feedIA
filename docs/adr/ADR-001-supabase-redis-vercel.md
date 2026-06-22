# ADR-001: Arquitectura cloud — Supabase + Redis + Vercel

## Status

Accepted

## Context

FeedIA necesita una arquitectura que soporte:

- Multi-tenancy con aislamiento de datos.
- Frontend estático con funciones serverless.
- Workers de proceso largo para tareas asíncronas.
- Caché y colas compartidas.

## Decision

Usar:

- **Supabase Postgres** como base de datos principal con RLS.
- **Upstash Redis** para sesiones, caché y colas BullMQ.
- **Vercel** para frontend estático + serverless functions.
- **Render/Railway/Fly** para workers Docker de proceso largo.

## Consequences

- RLS garantiza aislamiento entre tenants.
- Redis unifica caché y mensajería.
- Vercel maneja CDN y edge functions sin ops.
- Workers Docker permiten procesos long-running fuera de Vercel.
