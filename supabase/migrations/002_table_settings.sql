-- Ajustes de la mesa elegidos por el DM: libros habilitados, nivel inicial y reglas de la casa.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
alter table public.campaigns
  add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.campaigns drop constraint if exists campaigns_settings_size;
alter table public.campaigns
  add constraint campaigns_settings_size check (octet_length(settings::text) <= 8000);
