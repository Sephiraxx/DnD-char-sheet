-- Luz que lleva cada personaje: el jugador prende o apaga la antorcha de su propia ficha.
-- Pegar en Supabase → SQL Editor → Run (después de 010). Se puede ejecutar más de una vez.

-- Un jugador sigue moviendo solo x/y de su ficha; además puede cambiar su luz («light:<pies>» o nada).
-- No puede tocar una ficha preparada de un encuentro («enc:…») ni poner otra cosa en ese campo.
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
    if not (
      old.kind = 'pc'
      and (old.stage is null or old.stage ~ '^light:[0-9]{1,3}$')
      and (new.stage is null or new.stage ~ '^light:[0-9]{1,3}$')
    ) then
      new.stage := old.stage;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
