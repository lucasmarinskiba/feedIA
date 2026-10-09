-- Forge IA: persistencia real (Postgres).
-- Tablas de histórico de intentos, publicaciones programadas e ingresos de Stripe.
-- Las conexiones de Instagram NO se duplican aquí: viven en oauth tokens (src/database/oauthTokens.ts).

CREATE TABLE IF NOT EXISTS forge_attempts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  tema TEXT NOT NULL,
  formato TEXT NOT NULL,
  plataforma TEXT NOT NULL,
  objetivo TEXT NOT NULL,
  nicho TEXT NOT NULL,
  voz TEXT NOT NULL,

  hooks_json JSONB NOT NULL,
  plan_json JSONB NOT NULL,

  hook TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags_json JSONB NOT NULL,
  portada TEXT,

  prediccion_json JSONB NOT NULL,
  contenido_score INTEGER,
  hook_score INTEGER,
  cuenta_score INTEGER,
  score_total INTEGER,

  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'draft', 'error')),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_forge_attempts_account_created ON forge_attempts (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forge_scheduled_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, content_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_forge_scheduled_posts_brand ON forge_scheduled_posts (brand_id, scheduled_for);

-- Un evento por evento de Stripe: stripe_event_id como PK hace idempotente al webhook (reintentos de Stripe).
-- amount_cents en la unidad mínima de la moneda, tal como la reporta Stripe.
CREATE TABLE IF NOT EXISTS forge_revenue_events (
  stripe_event_id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attributed_brand_id TEXT,
  attributed_content_id TEXT,
  attributed_platform TEXT,
  attributed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_forge_revenue_session ON forge_revenue_events (stripe_session_id);
