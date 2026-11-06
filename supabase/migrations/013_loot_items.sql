-- Botín con objetos del catálogo: la referencia al objeto (con su arma o armadura base) y, si el DM
-- quiere, la ficha para la que lo reservó. Solo el DM la cambia; un jugador no puede reclamar un
-- objeto reservado para otra ficha.
alter table public.loot add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.loot drop constraint if exists loot_data_size;
alter table public.loot add constraint loot_data_size check (octet_length(data::text) <= 2000);

create or replace function public.loot_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dm(old.campaign_id) then
    new.campaign_id := old.campaign_id;
    new.name := old.name;
    new.qty := old.qty;
    new.notes := old.notes;
    new.data := old.data;
    new.created_at := old.created_at;
    if new.claimed_character is not null and coalesce(old.data->>'for', '') <> ''
       and old.data->>'for' <> new.claimed_character::text then
      raise exception 'Ese objeto está reservado para otra ficha.';
    end if;
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';
