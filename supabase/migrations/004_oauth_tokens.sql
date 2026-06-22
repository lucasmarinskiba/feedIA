-- Tokens OAuth cifrados por cuenta y proveedor.
-- Requiere OAUTH_TOKEN_SECRET en el backend para cifrar/descifrar.

create table if not exists oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  provider text not null,
  encrypted_token text not null,
  scopes text[] default array[]::text[],
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (account_id, provider)
);

-- Índices útiles para resolución de credenciales por brand/account.
create index if not exists idx_oauth_tokens_account_provider on oauth_tokens(account_id, provider);
create index if not exists idx_oauth_tokens_expires on oauth_tokens(expires_at);

-- RLS: solo el service role o funciones postgres deben leer/escribir tokens.
alter table oauth_tokens enable row level security;

-- Política restrictiva por defecto; el backend usa service role.
-- Si un usuario necesita ver qué proveedores conectó (no el token), exponer una vista segura.
create policy if not exists oauth_tokens_service_only
  on oauth_tokens
  as restrictive
  for all
  to authenticated, anon
  using (false)
  with check (false);

-- Trigger para actualizar updated_at automáticamente.
create or replace function update_oauth_tokens_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_oauth_tokens_updated_at on oauth_tokens;
create trigger trg_oauth_tokens_updated_at
  before update on oauth_tokens
  for each row
  execute function update_oauth_tokens_updated_at();
