-- Misiones, calendario del mundo y tiempo entre aventuras se guardan en los ajustes de la mesa:
-- hace falta más lugar que los 8 KB originales.
-- Ejecutar en Supabase → SQL Editor. No modifica mesas existentes.
begin;
alter table public.campaigns drop constraint if exists campaigns_settings_check;
alter table public.campaigns add constraint campaigns_settings_check
  check (octet_length(settings::text) <= 120000);
commit;
