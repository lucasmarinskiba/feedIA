# Architecture — FeedIA

## High-level diagram

```mermaid
graph TD
    User["Usuario / Admin"] -->|HTTPS| Vercel["Vercel\nFrontend estático + API serverless"]
    Vercel -->|REST| Supabase[("Supabase Postgres\nRLS")]
    Vercel -->|Cache / Sessions| Redis[("Upstash Redis")]
    Vercel -->|Enqueue jobs| Redis
    Workers["Docker Workers\nRender / Railway / Fly"] -->|Consume jobs| Redis
    Workers -->|Read/Write| Supabase
    Workers -->|Media / LLM| External["Anthropic / Meta / TikTok"]
```

## Auth flow

```mermaid
sequenceDiagram
    actor U as User
    participant V as Vercel
    participant S as Supabase Auth
    participant DB as Supabase DB

    U->>V: Login request
    V->>S: Authenticate
    S-->>V: JWT + session
    V->>DB: Query with RLS (user_id = auth.uid())
    DB-->>V: Tenant-scoped data
```

## Publish flow

```mermaid
sequenceDiagram
    actor U as User
    participant V as Vercel API
    participant R as Redis / BullMQ
    participant W as Worker
    participant IG as Instagram Graph API

    U->>V: POST /api/queue/publish
    V->>V: Rate limit + credit check
    V->>R: Enqueue job
    V-->>U: Job ID
    W->>R: Consume job
    W->>IG: Publish content
    W->>R: Update status
```

## Components

| Component      | Technology                  | Purpose                 |
| -------------- | --------------------------- | ----------------------- |
| Frontend       | Vanilla JS SPA              | Dashboard owner/admin   |
| API            | Vercel serverless functions | Rutas públicas y admin  |
| Auth           | Supabase Auth               | JWT + sessions          |
| Database       | Supabase Postgres           | Datos tenant            |
| Cache / Queues | Upstash Redis               | Sesiones, caché, BullMQ |
| Workers        | Docker + Node               | Procesos asíncronos     |
| Observability  | Sentry + Logtail            | Errores y logs          |
| CI/CD          | GitHub Actions              | Build, test, deploy     |
