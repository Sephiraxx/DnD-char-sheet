-- Misiones, calendario del mundo y tiempo entre aventuras se guardan en los ajustes de la mesa:
-- hace falta más lugar que los 8 KB originales.
-- También agrega la altura de las fichas del mapa.
-- Ejecutar en Supabase → SQL Editor. No modifica mesas existentes.
begin;
alter table public.campaigns drop constraint if exists campaigns_settings_check;
alter table public.campaigns add constraint campaigns_settings_check
  check (octet_length(settings::text) <= 120000);

-- Altura de las fichas del mapa (vuelo, cornisas). Cada jugador puede cambiar la de su ficha.
alter table public.map_tokens add column if not exists elev int not null default 0
  check (elev between -1000 and 10000);
commit;
