-- FeedIA Supabase Schema + RLS
-- Ejecutar en SQL Editor de Supabase como "New query" → Run.
-- Asegurate de tener habilitada la extensión pgcrypto (por defecto en Supabase).

-- =============================================================================
-- Tablas de autenticación/tenancy
-- =============================================================================

-- Perfiles de usuario (1:1 con auth.users de Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  plan text not null default 'free' check (plan in ('free','starter','pro','gold','premium','business','enterprise','owner')),
  role text not null default 'user' check (role in ('user','collaborator','admin','owner')),
  status text not null default 'active' check (status in ('active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Equipos / marcas. Un usuario puede pertenecer a varias accounts.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  niche text,
  type text,
  meta_ig_business_id text,
  meta_page_id text,
  brand_json jsonb default '{}',
  strategy_json jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Memberships: quién puede ver/editar cada account
create table if not exists public.account_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','editor','admin')),
  created_at timestamptz not null default now(),
  unique (account_id, user_id)
);

-- API keys (hasheadas). El servidor usa service role para leer/validar.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  hash text not null unique,
  prefix text not null,
  label text,
  scopes text[] not null default '{read}',
  requests_count bigint not null default 0,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Tablas de negocio
-- =============================================================================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  format text not null,
  caption text,
  media_urls text[],
  first_comment text,
  status text not null default 'draft' check (status in ('draft','scheduled','published','failed','archived')),
  meta_post_id text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_pieces (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  stage text not null,
  format text,
  title text,
  script text,
  hooks text[],
  captions text[],
  hashtags text[],
  media_urls text[],
  scheduled_date date,
  publish_time text,
  score integer,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null,
  sender text not null,
  text text,
  meta_comment_id text,
  meta_post_id text,
  replied boolean not null default false,
  reply_text text,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  snapshot_date date not null,
  followers integer,
  reach integer,
  impressions integer,
  profile_views integer,
  website_clicks integer,
  posts_count integer,
  data_json jsonb default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  snapshot_date date not null,
  impressions integer,
  reach integer,
  likes integer,
  comments integer,
  saves integer,
  shares integer,
  watch_time real,
  completion_rate real,
  profile_visits integer,
  created_at timestamptz not null default now()
);

create table if not exists public.competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  competitor_handle text not null,
  snapshot_date date not null,
  followers integer,
  posts_count integer,
  avg_likes real,
  avg_comments real,
  top_hashtags text[],
  data_json jsonb default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.trend_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source text not null,
  keyword text,
  volume integer,
  growth real,
  data_json jsonb default '{}',
  snapshot_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.ab_tests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  hypothesis text,
  status text not null default 'draft' check (status in ('draft','running','paused','completed')),
  variants jsonb default '[]',
  winner text,
  confidence real,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,
  target text,
  result text,
  reason text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  to_address text not null,
  subject text not null,
  body text not null,
  sent boolean not null default false,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.event_queue (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null default '{}',
  brand_id uuid references public.accounts(id) on delete set null,
  processed boolean not null default false,
  processed_at timestamptz,
  handler_result jsonb default '{}',
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.playbook_runs (
  id uuid primary key default gen_random_uuid(),
  playbook_id text not null,
  playbook_type text not null default 'custom',
  brand_id uuid references public.accounts(id) on delete set null,
  status text not null default 'running' check (status in ('running','completed','failed','cancelled')),
  results jsonb default '{}',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Tabla para feature flags / control de versiones (solo owner/admin)
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  allowed_plans text[] default '{}',
  rollout_percent integer not null default 0 check (rollout_percent between 0 and 100),
  description text,
  updated_at timestamptz not null default now()
);

-- Tokens OAuth cifrados. El valor real se cifra con pgcrypto usando una clave del servidor.
create table if not exists public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  provider text not null check (provider in ('instagram','tiktok','canva','youtube')),
  encrypted_token text not null,
  scopes text[],
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, provider)
);

-- =============================================================================
-- Funciones auxiliares
-- =============================================================================

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Función para verificar si el usuario actual es owner/admin global
create or replace function public.is_platform_admin()
returns boolean as $$
begin
  return coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    'user'
  ) in ('owner','admin');
end;
$$ language plpgsql security definer;

-- Función para obtener user_id del JWT de Supabase Auth
create or replace function public.current_user_id()
returns uuid as $$
begin
  return (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
exception
  when others then return null;
end;
$$ language plpgsql stable;

-- Helper: cuentas accesibles por el usuario actual
create or replace function public.user_account_ids()
returns setof uuid as $$
begin
  return query
    select id from public.accounts where owner_id = public.current_user_id()
    union
    select account_id from public.account_members where user_id = public.current_user_id();
end;
$$ language plpgsql stable security definer;

-- =============================================================================
-- RLS: habilitar
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.api_keys enable row level security;
alter table public.posts enable row level security;
alter table public.content_pieces enable row level security;
alter table public.inbound_messages enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.post_metrics enable row level security;
alter table public.competitor_snapshots enable row level security;
alter table public.trend_snapshots enable row level security;
alter table public.ab_tests enable row level security;
alter table public.audit_log enable row level security;
alter table public.email_queue enable row level security;
alter table public.event_queue enable row level security;
alter table public.playbook_runs enable row level security;
alter table public.feature_flags enable row level security;
alter table public.oauth_tokens enable row level security;

-- =============================================================================
-- RLS: políticas (drop primero para ser idempotente)
-- =============================================================================

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
drop policy if exists "accounts_select_member" on public.accounts;
drop policy if exists "accounts_update_owner_or_admin" on public.accounts;
drop policy if exists "accounts_delete_owner_or_admin" on public.accounts;
drop policy if exists "account_members_select" on public.account_members;
drop policy if exists "api_keys_select_own_or_admin" on public.api_keys;
drop policy if exists "posts_select_member" on public.posts;
drop policy if exists "posts_insert_member" on public.posts;
drop policy if exists "posts_update_member" on public.posts;
drop policy if exists "posts_delete_member" on public.posts;
drop policy if exists "content_pieces_member" on public.content_pieces;
drop policy if exists "inbound_messages_member" on public.inbound_messages;
drop policy if exists "analytics_snapshots_member" on public.analytics_snapshots;
drop policy if exists "post_metrics_member" on public.post_metrics;
drop policy if exists "competitor_snapshots_member" on public.competitor_snapshots;
drop policy if exists "trend_snapshots_member" on public.trend_snapshots;
drop policy if exists "ab_tests_member" on public.ab_tests;
drop policy if exists "oauth_tokens_member" on public.oauth_tokens;
drop policy if exists "playbook_runs_member" on public.playbook_runs;
drop policy if exists "audit_log_select_admin" on public.audit_log;
drop policy if exists "audit_log_insert_service" on public.audit_log;
drop policy if exists "email_queue_select_admin" on public.email_queue;
drop policy if exists "email_queue_insert_service" on public.email_queue;
drop policy if exists "email_queue_update_service" on public.email_queue;
drop policy if exists "event_queue_select_admin_or_owner" on public.event_queue;
drop policy if exists "event_queue_insert_service" on public.event_queue;
drop policy if exists "event_queue_update_service" on public.event_queue;
drop policy if exists "feature_flags_select_all" on public.feature_flags;
drop policy if exists "feature_flags_write_admin" on public.feature_flags;

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = public.current_user_id() or public.is_platform_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = public.current_user_id() or public.is_platform_admin());

-- accounts
create policy "accounts_select_member" on public.accounts
  for select using (
    owner_id = public.current_user_id()
    or id in (select account_id from public.account_members where user_id = public.current_user_id())
    or public.is_platform_admin()
  );
create policy "accounts_update_owner_or_admin" on public.accounts
  for update using (owner_id = public.current_user_id() or public.is_platform_admin());
create policy "accounts_delete_owner_or_admin" on public.accounts
  for delete using (owner_id = public.current_user_id() or public.is_platform_admin());

-- account_members
create policy "account_members_select" on public.account_members
  for select using (
    user_id = public.current_user_id()
    or account_id in (select id from public.accounts where owner_id = public.current_user_id())
    or public.is_platform_admin()
  );

-- api_keys
create policy "api_keys_select_own_or_admin" on public.api_keys
  for select using (user_id = public.current_user_id() or public.is_platform_admin());

-- posts
create policy "posts_select_member" on public.posts
  for select using (
    account_id in (select public.user_account_ids())
    or public.is_platform_admin()
  );
create policy "posts_insert_member" on public.posts
  for insert with check (
    account_id in (select public.user_account_ids())
    or public.is_platform_admin()
  );
create policy "posts_update_member" on public.posts
  for update using (
    account_id in (select public.user_account_ids())
    or public.is_platform_admin()
  );
create policy "posts_delete_member" on public.posts
  for delete using (
    account_id in (select public.user_account_ids())
    or public.is_platform_admin()
  );

-- resto de tablas tenant con helper user_account_ids
create policy "content_pieces_member" on public.content_pieces
  for all using (account_id in (select public.user_account_ids()) or public.is_platform_admin());
create policy "inbound_messages_member" on public.inbound_messages
  for all using (account_id in (select public.user_account_ids()) or public.is_platform_admin());
create policy "analytics_snapshots_member" on public.analytics_snapshots
  for all using (account_id in (select public.user_account_ids()) or public.is_platform_admin());
create policy "post_metrics_member" on public.post_metrics
  for all using (post_id in (select id from public.posts where account_id in (select public.user_account_ids())) or public.is_platform_admin());
create policy "competitor_snapshots_member" on public.competitor_snapshots
  for all using (account_id in (select public.user_account_ids()) or public.is_platform_admin());
create policy "trend_snapshots_member" on public.trend_snapshots
  for all using (account_id in (select public.user_account_ids()) or public.is_platform_admin());
create policy "ab_tests_member" on public.ab_tests
  for all using (account_id in (select public.user_account_ids()) or public.is_platform_admin());
create policy "oauth_tokens_member" on public.oauth_tokens
  for all using (account_id in (select public.user_account_ids()) or public.is_platform_admin());
create policy "playbook_runs_member" on public.playbook_runs
  for all using (brand_id in (select public.user_account_ids()) or public.is_platform_admin());

-- audit_log
create policy "audit_log_select_admin" on public.audit_log
  for select using (public.is_platform_admin());
create policy "audit_log_insert_service" on public.audit_log
  for insert with check (true);

-- email_queue
create policy "email_queue_select_admin" on public.email_queue
  for select using (public.is_platform_admin());
create policy "email_queue_insert_service" on public.email_queue
  for insert with check (true);
create policy "email_queue_update_service" on public.email_queue
  for update using (true);

-- event_queue
create policy "event_queue_select_admin_or_owner" on public.event_queue
  for select using (
    brand_id in (select id from public.accounts where owner_id = public.current_user_id())
    or public.is_platform_admin()
  );
create policy "event_queue_insert_service" on public.event_queue
  for insert with check (true);
create policy "event_queue_update_service" on public.event_queue
  for update using (true);

-- feature_flags
create policy "feature_flags_select_all" on public.feature_flags
  for select using (true);
create policy "feature_flags_write_admin" on public.feature_flags
  for all using (public.is_platform_admin());

-- =============================================================================
-- Índices
-- =============================================================================

create index if not exists idx_posts_account on public.posts(account_id);
create index if not exists idx_posts_status on public.posts(status);
create index if not exists idx_content_account on public.content_pieces(account_id);
create index if not exists idx_inbound_account on public.inbound_messages(account_id);
create index if not exists idx_analytics_account_date on public.analytics_snapshots(account_id, snapshot_date);
create index if not exists idx_post_metrics_post on public.post_metrics(post_id);
create index if not exists idx_competitor_account on public.competitor_snapshots(account_id, competitor_handle);
create index if not exists idx_trend_account on public.trend_snapshots(account_id, source);
create index if not exists idx_audit_action on public.audit_log(action, created_at);
create index if not exists idx_event_queue_unprocessed on public.event_queue(processed, created_at);
create index if not exists idx_event_queue_type on public.event_queue(event_type, created_at);
create index if not exists idx_playbook_runs_playbook on public.playbook_runs(playbook_id, started_at);
create index if not exists idx_playbook_runs_brand on public.playbook_runs(brand_id, status);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_account_members_user on public.account_members(user_id);

-- =============================================================================
-- Triggers updated_at
-- =============================================================================

drop trigger if exists trg_profiles_updated_at on public.profiles;
drop trigger if exists trg_accounts_updated_at on public.accounts;
drop trigger if exists trg_posts_updated_at on public.posts;
drop trigger if exists trg_content_pieces_updated_at on public.content_pieces;
drop trigger if exists trg_ab_tests_updated_at on public.ab_tests;
drop trigger if exists trg_oauth_tokens_updated_at on public.oauth_tokens;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
create trigger trg_posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();
create trigger trg_content_pieces_updated_at before update on public.content_pieces
  for each row execute function public.set_updated_at();
create trigger trg_ab_tests_updated_at before update on public.ab_tests
  for each row execute function public.set_updated_at();
create trigger trg_oauth_tokens_updated_at before update on public.oauth_tokens
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Seed
-- =============================================================================

insert into public.feature_flags (key, enabled, allowed_plans, rollout_percent, description)
values ('canary_v2_dashboard', false, '{owner,admin}', 0, 'Nuevo dashboard v2, visible solo para owner/admin hasta release general.')
on conflict (key) do nothing;
