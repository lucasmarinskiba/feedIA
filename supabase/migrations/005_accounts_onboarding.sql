-- Agrega soporte para persistir el estado intermedio del wizard de onboarding.

alter table accounts
  add column if not exists onboarding_json jsonb;
