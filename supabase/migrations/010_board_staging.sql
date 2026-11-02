-- Encuentros preparados sobre el mapa: el DM coloca las criaturas antes de lanzarlos.
-- Pegar en Supabase → SQL Editor → Run (después de 008). Se puede ejecutar más de una vez.

-- «enc:<encuentro>:<criatura>»: ficha preparada. Al lanzar el encuentro se vincula con su criatura del combate.
alter table public.map_tokens add column if not exists stage text check (stage is null or char_length(stage) <= 120);
create index if not exists map_tokens_stage on public.map_tokens (campaign_id, stage) where stage is not null;

-- Si la criatura sale del combate, la ficha preparada vuelve a esperar (no se borra).
alter table public.map_tokens drop constraint if exists map_tokens_combatant_id_fkey;
alter table public.map_tokens add constraint map_tokens_combatant_id_fkey
  foreign key (combatant_id) references public.combatants on delete set null;

-- Un jugador sigue moviendo solo x/y de su ficha.
create or replace function public.map_tokens_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dm(old.campaign_id) then
    new.id := old.id;
    new.campaign_id := old.campaign_id;
    new.map_id := old.map_id;
    new.kind := old.kind;
    new.character_id := old.character_id;
    new.combatant_id := old.combatant_id;
    new.name := old.name;
    new.label := old.label;
    new.color := old.color;
    new.size := old.size;
    new.hidden := old.hidden;
    new.stage := old.stage;
  end if;
  new.updated_at := now();
  return new;
end $$;
